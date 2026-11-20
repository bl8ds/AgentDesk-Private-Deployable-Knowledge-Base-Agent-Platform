package ratelimit

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"

	"agentdesk.example/api/pkg/apperr"
)

// Limiter is a fixed-window counter backed by Redis.
type Limiter struct {
	rdb    *redis.Client
	prefix string
	limit  int64
	window time.Duration
}

func New(rdb *redis.Client, prefix string, limit int64, window time.Duration) *Limiter {
	if limit <= 0 {
		limit = 10
	}
	if window <= 0 {
		window = time.Minute
	}
	if prefix == "" {
		prefix = "agentdesk:rl:"
	}
	return &Limiter{rdb: rdb, prefix: prefix, limit: limit, window: window}
}

// Allow increments the counter for key. Returns TooManyRequests when over limit.
func (l *Limiter) Allow(ctx context.Context, key string) error {
	if l == nil || l.rdb == nil {
		return nil
	}
	rk := l.prefix + key
	n, err := l.rdb.Incr(ctx, rk).Result()
	if err != nil {
		return apperr.Internal("rate limit", err)
	}
	if n == 1 {
		if err := l.rdb.Expire(ctx, rk, l.window).Err(); err != nil {
			return apperr.Internal("rate limit expire", err)
		}
	}
	if n > l.limit {
		return apperr.TooManyRequests("RATE_LIMITED", fmt.Sprintf("too many requests (limit %d per %s)", l.limit, l.window))
	}
	return nil
}