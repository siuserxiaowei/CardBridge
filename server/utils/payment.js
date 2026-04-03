/**
 * 支付工具函数
 * 包含支付宝和微信支付的接口封装
 */

function getAppUrl() {
    return process.env.APP_URL || 'http://localhost:3000';
}

function normalizePem(value) {
    return value ? String(value).replace(/\\n/g, '\n') : value;
}

function createAlipaySdk() {
    const AlipaySdk = require('alipay-sdk').default;

    return new AlipaySdk({
        appId: process.env.ALIPAY_APP_ID,
        privateKey: normalizePem(process.env.ALIPAY_PRIVATE_KEY),
        alipayPublicKey: normalizePem(process.env.ALIPAY_PUBLIC_KEY),
        gateway: process.env.ALIPAY_GATEWAY || 'https://openapi.alipay.com/gateway.do'
    });
}

function createWechatClient() {
    const { Wechatpay } = require('wechatpay-node-v3');

    return new Wechatpay({
        appid: process.env.WECHAT_APPID,
        mchid: process.env.WECHAT_MCHID,
        publicKey: Buffer.from(normalizePem(process.env.WECHAT_PUBLIC_KEY || ''), 'utf8'),
        privateKey: Buffer.from(normalizePem(process.env.WECHAT_PRIVATE_KEY || ''), 'utf8'),
        serial_no: process.env.WECHAT_SERIAL_NO,
        key: process.env.WECHAT_APIV3_KEY
    });
}

// ============================================
// 支付宝支付
// ============================================

/**
 * 创建支付宝支付订单
 * @param {Object} orderInfo - 订单信息
 * @returns {Promise<Object>} 支付链接或二维码
 */
async function createAlipayOrder(orderInfo) {
    try {
        // 检查是否配置了支付宝 SDK
        if (
            !process.env.ALIPAY_APP_ID ||
            process.env.ALIPAY_APP_ID === 'your_alipay_app_id' ||
            !process.env.ALIPAY_PRIVATE_KEY ||
            !process.env.ALIPAY_PUBLIC_KEY
        ) {
            console.log('⚠️  支付宝未配置 SDK，使用手动收款模式');
            return {
                manualMode: true,
                qrImage: process.env.ALIPAY_PAY_QR || '/images/alipay-pay.jpg',
                contactInfo: process.env.CONTACT_INFO || '',
                message: '请使用支付宝扫码转账'
            };
        }

        const alipaySdk = createAlipaySdk();
        const result = await alipaySdk.pageExec('alipay.trade.page.pay', {
            method: 'GET',
            notify_url: `${getAppUrl()}/api/orders/alipay-callback`,
            bizContent: {
                out_trade_no: orderInfo.orderId,
                product_code: 'FAST_INSTANT_TRADE_PAY',
                total_amount: String(orderInfo.amount),
                subject: orderInfo.subject,
                body: orderInfo.description
            },
            returnUrl: `${getAppUrl()}/payment/${encodeURIComponent(orderInfo.orderId)}${orderInfo.accessToken ? `?t=${encodeURIComponent(orderInfo.accessToken)}` : ''}`
        });

        return {
            isTestMode: false,
            payUrl: result,
            message: '请在新窗口完成支付'
        };
    } catch (error) {
        console.error('创建支付宝订单失败:', error);
        throw new Error('创建支付失败');
    }
}

/**
 * 验证支付宝支付回调
 * @param {Object} params - 回调参数
 * @returns {Promise<boolean>} 验证结果
 */
async function verifyAlipayCallback(params, raw = false) {
    try {
        // 手动收款模式：SDK 未配置时拒绝所有回调（不能返回 true）
        if (!process.env.ALIPAY_APP_ID || process.env.ALIPAY_APP_ID === 'your_alipay_app_id') {
            console.log('⚠️  支付宝 SDK 未配置，拒绝回调请求');
            return false;
        }

        const alipaySdk = createAlipaySdk();
        return alipaySdk.checkNotifySign(params, raw);
    } catch (error) {
        console.error('验证支付宝回调失败:', error);
        return false;
    }
}

// ============================================
// 微信支付
// ============================================

/**
 * 创建微信支付订单
 * @param {Object} orderInfo - 订单信息
 * @returns {Promise<Object>} 支付二维码链接
 */
async function createWechatOrder(orderInfo) {
    try {
        // 检查是否配置了微信支付 SDK
        if (
            !process.env.WECHAT_APPID ||
            !process.env.WECHAT_MCHID ||
            process.env.WECHAT_MCHID === 'your_merchant_id' ||
            !process.env.WECHAT_PUBLIC_KEY ||
            !process.env.WECHAT_PRIVATE_KEY ||
            !process.env.WECHAT_APIV3_KEY
        ) {
            console.log('⚠️  微信支付未配置 SDK，使用手动收款模式');
            return {
                manualMode: true,
                qrImage: process.env.WECHAT_PAY_QR || '/images/wechat-pay.jpg',
                contactInfo: process.env.CONTACT_INFO || '',
                message: '请使用微信扫码转账'
            };
        }

        const pay = createWechatClient();

        const result = await pay.v3.pay.transactions.native({
            appid: process.env.WECHAT_APPID,
            mchid: process.env.WECHAT_MCHID,
            description: orderInfo.subject,
            out_trade_no: orderInfo.orderId,
            notify_url: `${getAppUrl()}/api/orders/wechat-callback`,
            amount: {
                total: Math.round(orderInfo.amount * 100), // 转为分
                currency: 'CNY'
            }
        });

        return {
            isTestMode: false,
            codeUrl: result.code_url,
            message: '请使用微信扫码支付'
        };
    } catch (error) {
        console.error('创建微信支付订单失败:', error);
        throw new Error('创建支付失败');
    }
}

/**
 * 验证微信支付回调
 * @param {Object} data - 回调数据
 * @returns {Promise<boolean>} 验证结果
 */
async function verifyWechatCallback(data) {
    try {
        // 手动收款模式：SDK 未配置时拒绝所有回调（不能返回 true）
        if (
            !process.env.WECHAT_APPID ||
            !process.env.WECHAT_MCHID ||
            process.env.WECHAT_MCHID === 'your_merchant_id' ||
            !process.env.WECHAT_PUBLIC_KEY ||
            !process.env.WECHAT_PRIVATE_KEY ||
            !process.env.WECHAT_APIV3_KEY
        ) {
            console.log('⚠️  微信支付 SDK 未配置，拒绝回调请求');
            return false;
        }

        const pay = createWechatClient();
        return pay.verifySign(data);
    } catch (error) {
        console.error('验证微信支付回调失败:', error);
        return false;
    }
}

function decryptWechatCallback(resource) {
    if (!resource) {
        throw new Error('缺少微信支付回调资源');
    }

    const pay = createWechatClient();
    return pay.decipher_gcm(
        resource.ciphertext,
        resource.associated_data,
        resource.nonce,
        process.env.WECHAT_APIV3_KEY
    );
}

module.exports = {
    createAlipayOrder,
    verifyAlipayCallback,
    createWechatOrder,
    verifyWechatCallback,
    decryptWechatCallback
};
