# 给 Claude 或 Cursor 的会话交接稿

最后更新：2026-04-03

## 项目路径

`/Users/siuserxiaowei/Desktop/发卡网`

## 你接手的是什么项目

数字商品自动发卡 + ChatGPT Plus 代充值平台。支持两种交付模式：

1. **邮件发卡**：用户付款 → 系统自动分配卡密 → 发送到邮箱
2. **自动充值**：用户付款 + 提交 ChatGPT Token → 系统调 ifaka API 自动充值

技术栈：Node.js + Express + SQLite + 原生 HTML/CSS/JS

## 优先阅读

1. `下次开始先读这里-最高优先级.md` — 完整的功能清单、待办事项、项目结构
2. `.env.example` — 所有配置项说明
3. `README.md` — 基础使用说明

## 当前状态

- 所有核心功能已完成，本地全链路验证通过
- 代码已推送到 GitHub：`git@github.com:siuserxy-cmd/CardBridge.git`
- 线上 Vultr 服务器代码是旧版，需要同步更新

## 关键 API 端点

| 端点 | 方法 | 用途 |
|------|------|------|
| `/api/products` | GET | 商品列表 |
| `/api/products/:id` | GET | 商品详情（含阶梯定价） |
| `/api/orders/guest-create` | POST | 游客下单 |
| `/api/orders/create` | POST | 登录用户下单 |
| `/api/orders/status/:orderNo` | GET | 订单状态轮询 |
| `/api/orders/mark-paid/:orderNo` | POST | 买家标记已支付 |
| `/api/orders/detail/:orderNo` | GET | 订单详情（含卡密） |
| `/api/orders/lookup` | GET | 订单查询（邮箱+订单号） |
| `/api/admin/stats` | GET | 后台统计 |
| `/api/admin/orders` | GET | 订单列表 |
| `/api/admin/orders/:id/confirm` | POST | 确认收款（触发自动发卡） |
| `/api/admin/orders/:id/reject` | POST | 拒绝订单 |
| `/api/admin/cards` | POST | 导入 CDK |
| `/api/admin/cdk-list` | GET | CDK 列表（支持筛选） |

## 页面路由

| 路径 | 页面 |
|------|------|
| `/` | 首页（商品列表） |
| `/product/:id` 或 `/product.html?id=X` | 商品详情 |
| `/payment/:orderNo` | 支付页 |
| `/order/:orderNo` | 订单成功页（显示卡密） |
| `/lookup` | 订单查询 |
| `/admin` | 管理后台 |

## 数据库表

- `users` — 用户（含管理员）
- `products` — 商品（含 delivery_type 区分发卡/充值）
- `cards` — 卡密/CDK（含 card_type 月卡/年卡、status、error_info）
- `orders` — 订单（含 buyer_email、chatgpt_token、recharge_status）
- `price_tiers` — 阶梯定价

## 如果要继续开发

1. 先 `npm run migrate-db` 确保数据库字段最新
2. `npm start` 启动本地服务
3. 管理员登录：admin@example.com / admin123456
4. 改完代码后 `git push origin main` 推送

## 待完成事项

详见 `下次开始先读这里-最高优先级.md` 中的"待完成事项"表格。
