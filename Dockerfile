FROM node:18-alpine

WORKDIR /app

# 先复制依赖文件，利用 Docker 层缓存
COPY package*.json ./
RUN npm install --production && npm cache clean --force

# 再复制业务代码（改代码不会重装依赖）
COPY . .

# 创建非 root 用户运行
RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
    && mkdir -p /app/database && chown -R appuser:appgroup /app/database

USER appuser

EXPOSE 3000

ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:3000/api/products || exit 1

CMD ["sh", "-c", "npm run init-db && npm run migrate-db && npm start"]
