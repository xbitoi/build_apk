FROM node:20-slim

RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    nginx \
    && rm -rf /var/lib/apt/lists/* \
    && npm install -g pnpm

WORKDIR /app

COPY . .

RUN pnpm install --frozen-lockfile

RUN PORT=3000 pnpm --filter @workspace/apk-builder run build

RUN pnpm --filter @workspace/api-server run build

RUN mkdir -p /app/artifacts/api-server/data

COPY nginx.conf /etc/nginx/nginx.conf

RUN chmod +x /app/start-hf.sh

EXPOSE 7860

CMD ["/app/start-hf.sh"]
