/**
 * 数据库迁移脚本
 * 为现有数据库安全添加新字段/表（不破坏已有数据）
 * 运行：npm run migrate-db
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'database', 'shop.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) { console.error('❌ 数据库连接失败:', err.message); process.exit(1); }
    console.log('✅ 连接到数据库');
});

// 安全执行 SQL，失败（如字段已存在）则忽略
function safeRun(sql, desc) {
    return new Promise((resolve) => {
        db.run(sql, (err) => {
            if (err && !err.message.includes('duplicate column') && !err.message.includes('already exists')) {
                console.error(`❌ ${desc} 失败:`, err.message);
            } else {
                console.log(`✅ ${desc}`);
            }
            resolve();
        });
    });
}

async function migrate() {
    // 1. orders 表：添加 buyer_email（游客购买用）
    await safeRun(
        `ALTER TABLE orders ADD COLUMN buyer_email TEXT`,
        'orders 表添加 buyer_email 字段'
    );

    // 2. orders 表：添加 quantity（购买数量）
    await safeRun(
        `ALTER TABLE orders ADD COLUMN quantity INTEGER DEFAULT 1`,
        'orders 表添加 quantity 字段'
    );

    // 3. products 表：添加 sold_count（已售数量，用于前台展示）
    await safeRun(
        `ALTER TABLE products ADD COLUMN sold_count INTEGER DEFAULT 0`,
        'products 表添加 sold_count 字段'
    );

    // 4. 新建阶梯定价表
    await safeRun(`
        CREATE TABLE IF NOT EXISTS price_tiers (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id  INTEGER NOT NULL,
            min_qty     INTEGER NOT NULL,
            max_qty     INTEGER,
            price       REAL NOT NULL,
            created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
        )
    `, '创建 price_tiers 阶梯定价表');

    // 5. 同步已有订单的 sold_count（从历史订单反算）
    await safeRun(`
        UPDATE products
        SET sold_count = (
            SELECT COUNT(*) FROM orders
            WHERE orders.product_id = products.id
            AND orders.payment_status = 'paid'
        )
    `, '同步历史已售数量');

    console.log('\n🎉 数据库迁移完成！');
    db.close();
    process.exit(0);
}

migrate().catch(err => {
    console.error('迁移失败:', err);
    db.close();
    process.exit(1);
});
