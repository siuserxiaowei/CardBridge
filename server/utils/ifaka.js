/**
 * ifaka.vip API 客户端
 * 用于 ChatGPT Plus CDK 自动充值
 *
 * 流程：提交充值 → 轮询结果 → 返回成功/失败
 * CDK 本身就是鉴权凭证，不需要额外 API Key
 */

const IFAKA_API = 'https://ifaka.vip/api';

/**
 * 提交充值请求
 * @param {string} cardCode - CDK 卡密（16位）
 * @param {string} tokenContent - 用户的 ChatGPT Session JSON
 * @param {boolean} allowOverwrite - 已有 Plus 时是否覆盖续费
 * @returns {Promise<string>} taskId
 */
async function submitRecharge(cardCode, tokenContent, allowOverwrite = false) {
    const res = await fetch(`${IFAKA_API}/redeem/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardCode, tokenContent, allowOverwrite }),
    });

    const data = await res.json();
    if (data.code !== 200) {
        throw new Error(data.msg || '提交充值失败');
    }

    return data.data; // taskId
}

/**
 * 查询充值结果
 * @param {string} taskId
 * @returns {Promise<{taskStatus: string, statusMessage: string}>}
 */
async function queryRechargeStatus(taskId) {
    const res = await fetch(`${IFAKA_API}/redeem/query/${taskId}`);
    const data = await res.json();

    if (data.code !== 200) {
        throw new Error(data.msg || '查询充值状态失败');
    }

    return data.data;
}

/**
 * 轮询等待充值结果
 * @param {string} taskId
 * @param {number} maxSeconds - 最大等待秒数
 * @param {number} intervalMs - 轮询间隔毫秒
 * @returns {Promise<{success: boolean, error?: string, status?: string}>}
 */
async function waitForRechargeResult(taskId, maxSeconds = 120, intervalMs = 3000) {
    const start = Date.now();

    while (Date.now() - start < maxSeconds * 1000) {
        try {
            const result = await queryRechargeStatus(taskId);
            const status = result.taskStatus;

            if (status === 'SUCCESS') {
                return { success: true, status: 'SUCCESS' };
            }

            // 非等待状态 → 充值失败
            if (status !== 'PENDING' && status !== 'PROCESSING') {
                return {
                    success: false,
                    status,
                    error: result.statusMessage || result.errorMessage || '充值失败',
                };
            }
        } catch (err) {
            console.error('轮询充值状态出错:', err.message);
            // 网络错误不算失败，继续重试
        }

        await new Promise(r => setTimeout(r, intervalMs));
    }

    return { success: false, status: 'TIMEOUT', error: '充值超时，将在后台继续处理' };
}

/**
 * 验证 CDK 是否有效（可选步骤）
 * @param {string} cardCode
 * @returns {Promise<{exists: boolean, valid: boolean, cardStatus: string}>}
 */
async function verifyCDK(cardCode) {
    const res = await fetch(`${IFAKA_API}/redeem/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardCode }),
    });

    const data = await res.json();
    if (data.code !== 200) {
        throw new Error(data.msg || '验证 CDK 失败');
    }

    return data.data;
}

/**
 * 完整充值流程：提交 + 轮询
 * @param {string} cardCode - CDK
 * @param {string} tokenContent - ChatGPT Session
 * @param {Object} options
 * @returns {Promise<{success: boolean, taskId: string, error?: string}>}
 */
async function recharge(cardCode, tokenContent, options = {}) {
    const { allowOverwrite = false, maxSeconds = 120 } = options;

    const taskId = await submitRecharge(cardCode, tokenContent, allowOverwrite);
    console.log(`  ifaka 充值任务已提交: ${taskId}`);

    const result = await waitForRechargeResult(taskId, maxSeconds);

    return { ...result, taskId };
}

module.exports = {
    submitRecharge,
    queryRechargeStatus,
    waitForRechargeResult,
    verifyCDK,
    recharge,
};
