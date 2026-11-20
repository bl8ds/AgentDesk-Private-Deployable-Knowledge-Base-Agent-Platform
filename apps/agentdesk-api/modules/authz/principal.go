package authz

import (
	"context"

	"agentdesk.example/api/pkg/apperr"
)

var ErrForbidden = apperr.Forbidden("forbidden", "insufficient permissions")

// Principal is the authenticated subject for agentdesk-api.
type Principal struct {
	UserID   string
	Level    string
	Roles    []string
	Channel  string // session | bearer
	ClientID string // OIDC azp / client_id when Bearer
	OrgID    string // optional openauth org claim
	OrgCode  string // optional openauth org code
}

type ctxKey struct{}

func WithPrincipal(ctx context.Context, p *Principal) context.Context {
	return context.WithValue(ctx, ctxKey{}, p)
}

func FromContext(ctx context.Context) (*Principal, bool) {
	p, ok := ctx.Value(ctxKey{}).(*Principal)
	return p, ok
}

func (p *Principal) HasRole(role string) bool {
	if p == nil {
		return false
	}
	for _, r := range p.Roles {
		if r == role {
			return true
		}
	}
	return false
}

// IsAdmin is true only when IAM role is admin or platform_admin.
// Never treat OIDC client_id alone as admin — a mis-issued token for
// agentdesk_admin_spa with role=user must not unlock the admin API.
func (p *Principal) IsAdmin() bool {
	if p == nil {
		return false
	}
	for _, r := range p.Roles {
		if r == "admin" || r == "platform_admin" {
			return true
		}
	}
	return false
}

type TokenValidator interface {
	Validate(ctx context.Context, token string) (*Principal, error)
}