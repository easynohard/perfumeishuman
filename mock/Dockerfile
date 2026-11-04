# 빌드 컨텍스트는 리포 루트다: docker build -f mock/Dockerfile -t perfume-mock .
FROM node:22-alpine
WORKDIR /app/mock
COPY mock/package.json mock/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY mock/server.js ./
COPY docs/07-api-spec.yaml ../docs/07-api-spec.yaml
ENV PORT=4020
EXPOSE 4020
CMD ["node", "server.js"]
