# Single-stage: build & runtime cùng base image → tránh ABI mismatch better-sqlite3.
FROM node:20-bookworm-slim

ENV TZ=Asia/Ho_Chi_Minh
ENV NODE_ENV=production

# Build tools cho native module (better-sqlite3) + tini cho signal handling.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ tini ca-certificates wget \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

COPY . .

# Smoke-test native module + build client SPA.
RUN node -e "require('better-sqlite3'); console.log('better-sqlite3 OK')" \
  && npm run build

RUN mkdir -p /data
VOLUME ["/data"]
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

ENTRYPOINT ["tini", "--"]
CMD ["npm", "start"]
