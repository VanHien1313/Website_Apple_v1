# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim@sha256:01d566e8d94d8c619591d78652babfccd3c6992a3dffa9ed5ab39e11cf6c70e9 AS frontend-build
WORKDIR /work/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build:api

FROM node:24-bookworm-slim@sha256:01d566e8d94d8c619591d78652babfccd3c6992a3dffa9ed5ab39e11cf6c70e9 AS backend-build
WORKDIR /work/backend
COPY backend/package.json backend/package-lock.json ./
# Windows-only driver is not loaded with DB_AUTH=sql. Keep sharp's platform packages.
RUN npm ci --ignore-scripts
COPY backend/ ./
RUN npm run build && npm prune --omit=dev --ignore-scripts
RUN node --input-type=module -e "import sharp from 'sharp'; import sql from 'mssql'; await sharp({create:{width:1,height:1,channels:3,background:'#fff'}}).webp().toBuffer(); if (!sql.ConnectionPool) process.exit(1)"

FROM node:24-bookworm-slim@sha256:01d566e8d94d8c619591d78652babfccd3c6992a3dffa9ed5ab39e11cf6c70e9 AS runtime
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4000 SERVE_FRONTEND=true DB_AUTH=sql
WORKDIR /app
COPY --from=backend-build --chown=node:node /work/backend/dist ./backend/dist
COPY --from=backend-build --chown=node:node /work/backend/node_modules ./backend/node_modules
COPY --from=backend-build --chown=node:node /work/backend/package.json ./backend/package.json
COPY --from=backend-build --chown=node:node /work/backend/migrations ./backend/migrations
COPY --from=frontend-build --chown=node:node /work/frontend/dist-api ./frontend/dist-api
COPY --chown=node:node deploy/init-local.mjs ./deploy/init-local.mjs
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=6s --start-period=30s --retries=3 CMD node -e "fetch('http://127.0.0.1:4000/health/ready',{signal:AbortSignal.timeout(5000)}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "backend/dist/server.js"]
