package authz

import (
	"github.com/golang-jwt/jwt/v5"

	"agentdesk.example/api/pkg/apperr"
)

func principalFromClaims(claims jwt.MapClaims) (*Principal, error) {
	sub := claimString(claims, "sub")
	if sub == "" {
		return nil, apperr.Unauthorized("missing sub claim")
	}
	level := claimString(claims, "level")
	if level == "" {
		level = "free"
	}

	roles := claimStringSlice(claims, "roles")
	if role := claimString(claims, "role"); role != "" {
		roles = appendUnique(roles, role)
	}

	p := &Principal{
		UserID:   sub,
		Level:    level,
		Roles:    roles,
		Channel:  "bearer",
		ClientID: firstNonEmpty(
			claimString(claims, "azp"),
			claimString(claims, "client_id"),
			claimAudienceClient(claims),
		),
	}

	// OpenAuth / OIDC org claims are optional for agentdesk — accept when present.
	if org := firstNonEmpty(
		claimString(claims, "org_id"),
		claimString(claims, "organization_id"),
		claimString(claims, "org"),
	); org != "" {
		p.OrgID = org
	}
	if orgCode := firstNonEmpty(
		claimString(claims, "org_code"),
		claimString(claims, "organization_code"),
	); orgCode != "" {
		p.OrgCode = orgCode
	}

	return p, nil
}

func firstNonEmpty(vals ...string) string {
	for _, v := range vals {
		if v != "" {
			return v
		}
	}
	return ""
}

func appendUnique(xs []string, v string) []string {
	for _, x := range xs {
		if x == v {
			return xs
		}
	}
	return append(xs, v)
}

func claimAudienceClient(claims jwt.MapClaims) string {
	raw, ok := claims["aud"]
	if !ok {
		return ""
	}
	switch vv := raw.(type) {
	case string:
		return vv
	case []interface{}:
		for _, item := range vv {
			if s, ok := item.(string); ok && s != "" {
				return s
			}
		}
	case []string:
		if len(vv) > 0 {
			return vv[0]
		}
	}
	return ""
}

func claimString(claims jwt.MapClaims, key string) string {
	v, _ := claims[key].(string)
	return v
}

func claimStringSlice(claims jwt.MapClaims, key string) []string {
	raw, ok := claims[key]
	if !ok {
		return nil
	}
	switch vv := raw.(type) {
	case []interface{}:
		out := make([]string, 0, len(vv))
		for _, item := range vv {
			if s, ok := item.(string); ok {
				out = append(out, s)
			}
		}
		return out
	case []string:
		return vv
	default:
		return nil
	}
}