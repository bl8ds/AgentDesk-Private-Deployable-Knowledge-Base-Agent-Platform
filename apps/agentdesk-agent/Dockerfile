# agentdesk-agent image (framework build output under .mastra/ — dependency artifact only).
# Port 4111: compose internal only; do not publish publicly. Studio not delivered.

FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src

RUN npx mastra build -d src

FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4111
ENV HOST=0.0.0.0

# Production bundle already vendors its own node_modules under .mastra/output
COPY --from=builder /app/.mastra/output ./.mastra/output

EXPOSE 4111

CMD ["node", ".mastra/output/index.mjs"]