/**
 * 简易内存限流中间件
 * 适合小规模站点（并发几十），不需要 Redis
 */

const store = new Map();

// 每分钟清理过期记录
setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store) {
        if (now - record.startTime > record.windowMs * 2) {
            store.delete(key);
        }
    }
}, 60000);

function rateLimit({ windowMs = 60000, max = 30, message = '请求过于频繁，请稍后再试' } = {}) {
    return (req, res, next) => {
        const key = req.ip + ':' + req.path;
        const now = Date.now();

        let record = store.get(key);
        if (!record || now - record.startTime > windowMs) {
            record = { count: 0, startTime: now, windowMs };
            store.set(key, record);
        }

        record.count++;

        if (record.count > max) {
            return res.status(429).json({ error: message });
        }

        next();
    };
}

// 预设的限流配置
const orderLimit = rateLimit({ windowMs: 60000, max: 5, message: '下单过于频繁，请 1 分钟后再试' });
const authLimit = rateLimit({ windowMs: 300000, max: 10, message: '登录尝试过多，请 5 分钟后再试' });
const apiLimit = rateLimit({ windowMs: 60000, max: 60, message: '请求过于频繁' });

module.exports = { rateLimit, orderLimit, authLimit, apiLimit };
