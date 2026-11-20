package authz

import (
	"testing"

	"github.com/golang-jwt/jwt/v5"
)

func TestPrincipalFromClaims_roleAndClientID(t *testing.T) {
	p, err := principalFromClaims(jwt.MapClaims{
		"sub":  "user-1",
		"role": "platform_admin",
		"azp":  "agentdesk_admin_spa",
	})
	if err != nil {
		t.Fatal(err)
	}
	if !p.IsAdmin() {
		t.Fatalf("expected admin, roles=%v client=%s", p.Roles, p.ClientID)
	}
	if p.ClientID != "agentdesk_admin_spa" {
		t.Fatalf("client_id=%q", p.ClientID)
	}
}

func TestPrincipalFromClaims_chatUserNotAdmin(t *testing.T) {
	p, err := principalFromClaims(jwt.MapClaims{
		"sub":  "demo",
		"role": "user",
		"azp":  "agentdesk_chat_spa",
	})
	if err != nil {
		t.Fatal(err)
	}
	if p.IsAdmin() {
		t.Fatal("chat user must not be admin")
	}
}

func TestPrincipalFromClaims_adminSPAWithoutAdminRoleNotAdmin(t *testing.T) {
	p, err := principalFromClaims(jwt.MapClaims{
		"sub":   "demo1",
		"role":  "user",
		"roles": []any{"user"},
		"azp":   "agentdesk_admin_spa",
		"aud":   []any{"agentdesk_admin_spa"},
	})
	if err != nil {
		t.Fatal(err)
	}
	if p.IsAdmin() {
		t.Fatal("C-end user token for agentdesk_admin_spa must not be treated as admin")
	}
}

func TestPrincipalFromClaims_adminSPAMissingRolesNotAdmin(t *testing.T) {
	// roles must come from IAM claims; client_id alone is not enough
	p, err := principalFromClaims(jwt.MapClaims{
		"sub": "admin-1",
		"azp": "agentdesk_admin_spa",
		"aud": []any{"agentdesk_admin_spa"},
	})
	if err != nil {
		t.Fatal(err)
	}
	if p.IsAdmin() {
		t.Fatal("missing roles must not be treated as admin")
	}
}

func TestIsAdmin_sessionWithoutAdminRole(t *testing.T) {
	p := &Principal{UserID: "u1", Roles: nil, Channel: "session"}
	if p.IsAdmin() {
		t.Fatal("session principal must not be admin by default")
	}
}