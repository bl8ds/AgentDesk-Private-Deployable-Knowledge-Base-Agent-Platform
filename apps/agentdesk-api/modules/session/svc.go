package session

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"gorm.io/gorm"

	"agentdesk.example/api/modules/authz"
	"agentdesk.example/api/pkg/apperr"
)

type Service struct {
	store    *Store
	ttlHours int
}

func NewService(store *Store, ttlHours int) *Service {
	return &Service{store: store, ttlHours: ttlHours}
}

type IssueCodeInput struct {
	Sub   string `json:"sub"`
	Level string `json:"level"`
}

type IssueCodeResult struct {
	Code      string    `json:"code"`
	ExpiresAt time.Time `json:"expires_at"`
}

func (s *Service) IssueAppCode(ctx context.Context, in IssueCodeInput) (*IssueCodeResult, error) {
	if in.Sub == "" {
		return nil, apperr.Validation("invalid_sub", "sub is required")
	}
	level := in.Level
	if level == "" {
		level = "free"
	}
	raw, err := RandomToken(16)
	if err != nil {
		return nil, apperr.Internal("generate code", err)
	}
	expires := time.Now().UTC().Add(5 * time.Minute)
	ac := &AppCode{
		ID:        uuid.New(),
		Code:      raw,
		UserID:    in.Sub,
		Level:     level,
		ExpiresAt: expires,
		CreatedAt: time.Now().UTC(),
	}
	if err := s.store.CreateAppCode(ctx, ac); err != nil {
		return nil, apperr.Internal("create app code", err)
	}
	return &IssueCodeResult{Code: raw, ExpiresAt: expires}, nil
}

type ExchangeResult struct {
	RawToken  string
	Principal *authz.Principal
	ExpiresAt time.Time
}

func (s *Service) Exchange(ctx context.Context, code string) (*ExchangeResult, error) {
	if code == "" {
		return nil, apperr.Validation("invalid_code", "code is required")
	}
	ac, err := s.store.ConsumeAppCode(ctx, code)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperr.Unauthorized("invalid or expired code")
		}
		return nil, apperr.Internal("consume code", err)
	}
	return s.createSession(ctx, ac.UserID, ac.Level, nil)
}

func (s *Service) createSession(ctx context.Context, userID, level string, roles []string) (*ExchangeResult, error) {
	raw, err := RandomToken(32)
	if err != nil {
		return nil, apperr.Internal("generate session token", err)
	}
	ttl := time.Duration(s.ttlHours) * time.Hour
	expires := time.Now().UTC().Add(ttl)
	if roles == nil {
		roles = []string{}
	}
	sess := &Session{
		ID:        uuid.New(),
		UserID:    userID,
		Level:     level,
		Roles:     pq.StringArray(roles),
		Channel:   "session",
		TokenHash: HashToken(raw),
		ExpiresAt: expires,
		CreatedAt: time.Now().UTC(),
		UpdatedAt: time.Now().UTC(),
	}
	if err := s.store.CreateSession(ctx, sess, raw, ttl); err != nil {
		return nil, apperr.Internal("create session", err)
	}
	return &ExchangeResult{
		RawToken: raw,
		Principal: &authz.Principal{
			UserID:  userID,
			Level:   level,
			Roles:   roles,
			Channel: "session",
		},
		ExpiresAt: expires,
	}, nil
}

func (s *Service) ResolveToken(ctx context.Context, raw string) (*authz.Principal, error) {
	payload, err := s.store.FindByRawToken(ctx, raw)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperr.Unauthorized("invalid session")
		}
		return nil, apperr.Internal("lookup session", err)
	}
	// Admin revocation marker: a revoked token still lives in Redis until its
	// natural TTL, so reject it here without disturbing normal sessions.
	if s.store.IsRevoked(ctx, HashToken(raw)) {
		return nil, apperr.Unauthorized("session revoked")
	}
	return &authz.Principal{
		UserID:  payload.UserID,
		Level:   payload.Level,
		Roles:   payload.Roles,
		Channel: "session",
	}, nil
}

// ListSessions returns session audit rows for the admin session manager.
func (s *Service) ListSessions(ctx context.Context, limit int, userID string) ([]Session, error) {
	return s.store.ListSessions(ctx, limit, userID)
}

// RevokeSession invalidates a session: expires its audit row and blocks the
// live token via a TTL-bound revocation marker keyed by the stored token hash.
func (s *Service) RevokeSession(ctx context.Context, id uuid.UUID) error {
	sess, err := s.store.GetSession(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return apperr.NotFound("session_not_found", "session not found")
		}
		return apperr.Internal("lookup session", err)
	}
	ttl := time.Duration(s.ttlHours) * time.Hour
	if ttl <= 0 {
		ttl = 24 * time.Hour
	}
	return s.store.RevokeSession(ctx, id, sess.TokenHash, ttl)
}

func (s *Service) Me(p *authz.Principal) map[string]interface{} {
	level := p.Level
	if level == "" {
		level = "free"
	}
	out := map[string]interface{}{
		"user_id": p.UserID,
		"level":   level,
		"roles":   p.Roles,
		"channel": p.Channel,
	}
	if p.OrgID != "" {
		out["org_id"] = p.OrgID
	}
	if p.OrgCode != "" {
		out["org_code"] = p.OrgCode
	}
	return out
}