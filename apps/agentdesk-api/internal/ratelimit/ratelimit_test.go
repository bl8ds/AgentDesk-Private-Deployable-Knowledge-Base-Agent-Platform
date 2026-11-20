package ratelimit_test

import (
	"context"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"

	"agentdesk.example/api/internal/ratelimit"
	"agentdesk.example/api/pkg/apperr"
)

func TestAllow_underLimit(t *testing.T) {
	mr := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	lim := ratelimit.New(rdb, "t:", 3, time.Minute)

	for i := 0; i < 3; i++ {
		if err := lim.Allow(context.Background(), "u1"); err != nil {
			t.Fatalf("allow %d: %v", i, err)
		}
	}
}

func TestAllow_overLimit(t *testing.T) {
	mr := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	lim := ratelimit.New(rdb, "t:", 2, time.Minute)

	_ = lim.Allow(context.Background(), "u1")
	_ = lim.Allow(context.Background(), "u1")
	err := lim.Allow(context.Background(), "u1")
	ae, ok := apperr.As(err)
	if !ok || ae.Kind != apperr.KindTooManyRequests {
		t.Fatalf("want too_many_requests, got %v", err)
	}
}