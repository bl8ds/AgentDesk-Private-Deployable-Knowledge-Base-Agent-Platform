# Multi-stage: build Vite SPA, serve with nginx

FROM node:22-alpine AS build
WORKDIR /app

ARG VITE_OIDC_ISSUER=https://auth.example.com
ARG VITE_OIDC_CLIENT_ID=agentdesk_chat_spa
ARG VITE_API_BASE_URL=https://agentdesk-api.example.com

ENV VITE_OIDC_ISSUER=$VITE_OIDC_ISSUER \
    VITE_OIDC_CLIENT_ID=$VITE_OIDC_CLIENT_ID \
    VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY package.json package-lock.json* ./
RUN npm install --ignore-scripts

COPY index.html vite.config.ts tsconfig.json ./
COPY src ./src
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]