package session

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

const (
	redisSessionPrefix  = "agentdesk:session:"
	redisRevokedPrefix  = "agentdesk:revoked:"
)

type Session struct {
	ID        uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	UserID    string         `gorm:"column:user_id" json:"user_id"`
	Level     string         `json:"level"`
	Roles     pq.StringArray `gorm:"type:text[]" json:"roles"`
	Channel   string         `json:"channel"`
	TokenHash string         `gorm:"column:token_hash" json:"-"`
	ExpiresAt time.Time      `gorm:"column:expires_at" json:"expires_at"`
	CreatedAt time.Time      `gorm:"column:created_at" json:"created_at"`
	UpdatedAt time.Time      `gorm:"column:updated_at" json:"updated_at"`
}

func (Session) TableName() string { return "sessions" }

type AppCode struct {
	ID        uuid.UUID  `gorm:"type:uuid;primaryKey" json:"id"`
	Code      string     `json:"code"`
	UserID    string     `gorm:"column:user_id" json:"user_id"`
	Level     string     `json:"level"`
	ExpiresAt time.Time  `gorm:"column:expires_at" json:"expires_at"`
	UsedAt    *time.Time `gorm:"column:used_at" json:"used_at,omitempty"`
	CreatedAt time.Time  `gorm:"column:created_at" json:"created_at"`
}

func (AppCode) TableName() string { return "app_codes" }

// SessionPayload is stored in Redis for ResolveToken.
type SessionPayload struct {
	UserID string   `json:"user_id"`
	Level  string   `json:"level"`
	Roles  []string `json:"roles"`
}

type Store struct {
	db  *gorm.DB
	rdb *redis.Client
}

func NewStore(db *gorm.DB, rdb *redis.Client) *Store {
	return &Store{db: db, rdb: rdb}
}

func (s *Store) CreateAppCode(ctx context.Context, code *AppCode) error {
	return s.db.WithContext(ctx).Create(code).Error
}

func (s *Store) ConsumeAppCode(ctx context.Context, raw string) (*AppCode, error) {
	var ac AppCode
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("code = ?", raw).First(&ac).Error; err != nil {
			return err
		}
		if ac.UsedAt != nil {
			return gorm.ErrRecordNotFound
		}
		if time.Now().UTC().After(ac.ExpiresAt) {
			return gorm.ErrRecordNotFound
		}
		now := time.Now().UTC()
		ac.UsedAt = &now
		return tx.Model(&AppCode{}).Where("id = ? AND used_at IS NULL", ac.ID).Update("used_at", now).Error
	})
	if err != nil {
		return nil, err
	}
	return &ac, nil
}

// CreateSession writes an optional PG audit row and stores the live session in Redis.
func (s *Store) CreateSession(ctx context.Context, sess *Session, rawToken string, ttl time.Duration) error {
	if err := s.db.WithContext(ctx).Create(sess).Error; err != nil {
		return err
	}
	payload := SessionPayload{
		UserID: sess.UserID,
		Level:  sess.Level,
		Roles:  []string(sess.Roles),
	}
	b, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	key := redisSessionPrefix + rawToken
	if err := s.rdb.Set(ctx, key, b, ttl).Err(); err != nil {
		return fmt.Errorf("redis set session: %w", err)
	}
	return nil
}

// FindByRawToken resolves a session from Redis (primary).
func (s *Store) FindByRawToken(ctx context.Context, raw string) (*SessionPayload, error) {
	key := redisSessionPrefix + raw
	val, err := s.rdb.Get(ctx, key).Result()
	if err == redis.Nil {
		return nil, gorm.ErrRecordNotFound
	}
	if err != nil {
		return nil, err
	}
	var payload SessionPayload
	if err := json.Unmarshal([]byte(val), &payload); err != nil {
		return nil, err
	}
	return &payload, nil
}

// GetSession returns a session audit row by id, including its token hash.
func (s *Store) GetSession(ctx context.Context, id uuid.UUID) (*Session, error) {
	var sess Session
	if err := s.db.WithContext(ctx).Where("id = ?", id).First(&sess).Error; err != nil {
		return nil, err
	}
	return &sess, nil
}

// ListSessions returns PG audit rows for admin listing, newest first, with optional user filter.
func (s *Store) ListSessions(ctx context.Context, limit int, userID string) ([]Session, error) {
	if limit <= 0 {
		limit = 100
	}
	q := s.db.WithContext(ctx).Model(&Session{})
	if userID != "" {
		q = q.Where("user_id = ?", userID)
	}
	var items []Session
	err := q.Order("created_at DESC").Limit(limit).Find(&items).Error
	return items, err
}

// RevokeSession marks the PG audit row expired and writes a TTL-bound revocation
// marker keyed by the token hash. The live Redis session key uses the raw token
// (which the server never stores), so ResolveToken checks this marker instead.
func (s *Store) RevokeSession(ctx context.Context, id uuid.UUID, tokenHash string, ttl time.Duration) error {
	if err := s.db.WithContext(ctx).Model(&Session{}).
		Where("id = ?", id).
		Update("expires_at", time.Now().UTC().Add(-time.Second)).Error; err != nil {
		return err
	}
	if tokenHash == "" {
		return nil
	}
	return s.rdb.Set(ctx, redisRevokedPrefix+tokenHash, "1", ttl).Err()
}

// IsRevoked reports whether a token hash carries an active revocation marker.
func (s *Store) IsRevoked(ctx context.Context, tokenHash string) bool {
	n, err := s.rdb.Exists(ctx, redisRevokedPrefix+tokenHash).Result()
	return err == nil && n > 0
}

func HashToken(raw string) string {
	sum := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(sum[:])
}

func RandomToken(nBytes int) (string, error) {
	b := make([]byte, nBytes)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}