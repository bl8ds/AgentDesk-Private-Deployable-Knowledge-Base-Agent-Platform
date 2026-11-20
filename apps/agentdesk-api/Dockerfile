FROM golang:1.24-alpine AS builder
WORKDIR /src
ARG GOPROXY=https://goproxy.cn,direct
ENV GOPROXY=$GOPROXY
RUN apk add --no-cache git ca-certificates
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/agentdesk-api ./cmd/app
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/agentdesk-migrate ./cmd/migrate

FROM alpine:3.21
RUN apk add --no-cache ca-certificates tzdata curl
ENV TZ=Asia/Shanghai
WORKDIR /app
COPY --from=builder /out/agentdesk-api /app/agentdesk-api
COPY --from=builder /out/agentdesk-migrate /app/agentdesk-migrate
COPY migrations /app/migrations
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -sf http://localhost:8080/health || exit 1
CMD ["/app/agentdesk-api"]