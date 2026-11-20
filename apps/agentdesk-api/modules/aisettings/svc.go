package aisettings

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"gorm.io/gorm"

	"agentdesk.example/api/pkg/apperr"
	"agentdesk.example/api/pkg/cryptox"
)

type Secrets struct {
	ChatAPIKey      string `json:"chat_api_key,omitempty"`
	EmbeddingAPIKey string `json:"embedding_api_key,omitempty"`
	VisionAPIKey    string `json:"vision_api_key,omitempty"`
}

type PublicView struct {
	ChatBaseURL      string    `json:"chat_base_url"`
	ChatModel        string    `json:"chat_model"`
	EmbeddingBaseURL string    `json:"embedding_base_url"`
	EmbeddingModel   string    `json:"embedding_model"`
	VisionBaseURL    string    `json:"vision_base_url"`
	VisionModel      string    `json:"vision_model"`
	RetrievalTopK    int       `json:"retrieval_top_k"`
	SnippetMaxChars  int       `json:"snippet_max_chars"`
	ChatKeySet       bool      `json:"chat_key_set"`
	EmbeddingKeySet  bool      `json:"embedding_key_set"`
	VisionKeySet     bool      `json:"vision_key_set"`
	UpdatedBy        string    `json:"updated_by"`
	UpdatedAt        time.Time `json:"updated_at"`
	Configured       bool      `json:"configured"`
}

type UpdateInput struct {
	ChatBaseURL      *string `json:"chat_base_url"`
	ChatModel        *string `json:"chat_model"`
	EmbeddingBaseURL *string `json:"embedding_base_url"`
	EmbeddingModel   *string `json:"embedding_model"`
	VisionBaseURL    *string `json:"vision_base_url"`
	VisionModel      *string `json:"vision_model"`
	RetrievalTopK    *int    `json:"retrieval_top_k"`
	SnippetMaxChars  *int    `json:"snippet_max_chars"`
	// Empty string = leave unchanged; non-empty = replace.
	ChatAPIKey      *string `json:"chat_api_key"`
	EmbeddingAPIKey *string `json:"embedding_api_key"`
	VisionAPIKey    *string `json:"vision_api_key"`
}

// RuntimeView is consumed by agentdesk-agent (includes decrypted keys). Never expose to browser.
type RuntimeView struct {
	PublicView
	ChatAPIKey      string `json:"chat_api_key"`
	EmbeddingAPIKey string `json:"embedding_api_key"`
	VisionAPIKey    string `json:"vision_api_key"`
}

type Service struct {
	store  *Store
	encKey string
}

func NewService(store *Store, encKey string) *Service {
	return &Service{store: store, encKey: encKey}
}

func (s *Service) publicFrom(row *Row) PublicView {
	if row == nil {
		return PublicView{}
	}
	return PublicView{
		ChatBaseURL:      row.ChatBaseURL,
		ChatModel:        row.ChatModel,
		EmbeddingBaseURL: row.EmbeddingBaseURL,
		EmbeddingModel:   row.EmbeddingModel,
		VisionBaseURL:    row.VisionBaseURL,
		VisionModel:      row.VisionModel,
		RetrievalTopK:    row.RetrievalTopK,
		SnippetMaxChars:  row.SnippetMaxChars,
		ChatKeySet:       row.ChatKeySet,
		EmbeddingKeySet:  row.EmbeddingKeySet,
		VisionKeySet:     row.VisionKeySet,
		UpdatedBy:        row.UpdatedBy,
		UpdatedAt:        row.UpdatedAt,
		Configured:       true,
	}
}

func (s *Service) GetPublic(ctx context.Context) (PublicView, error) {
	row, err := s.store.Get(ctx)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return PublicView{Configured: false}, nil
	}
	if err != nil {
		return PublicView{}, apperr.Internal("load ai settings", err)
	}
	return s.publicFrom(row), nil
}

func (s *Service) loadSecrets(row *Row) (Secrets, error) {
	if row == nil || row.SecretsCiphertext == "" {
		return Secrets{}, nil
	}
	plain, err := cryptox.Open(s.encKey, row.SecretsCiphertext)
	if err != nil {
		return Secrets{}, apperr.Internal("decrypt ai secrets", err)
	}
	var sec Secrets
	if err := json.Unmarshal([]byte(plain), &sec); err != nil {
		return Secrets{}, apperr.Internal("parse ai secrets", err)
	}
	return sec, nil
}

func (s *Service) sealSecrets(sec Secrets) (string, error) {
	b, err := json.Marshal(sec)
	if err != nil {
		return "", err
	}
	return cryptox.Seal(s.encKey, string(b))
}

func (s *Service) Update(ctx context.Context, actor string, in UpdateInput) (PublicView, error) {
	if strings.TrimSpace(s.encKey) == "" {
		return PublicView{}, apperr.Validation("missing_encryption_key", "CONFIG_ENCRYPTION_KEY is not configured on server")
	}
	row, err := s.store.Get(ctx)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		row = &Row{
			ID:              1,
			RetrievalTopK:   4,
			SnippetMaxChars: 240,
			CreatedAt:       time.Now().UTC(),
		}
	} else if err != nil {
		return PublicView{}, apperr.Internal("load ai settings", err)
	}

	sec, err := s.loadSecrets(row)
	if err != nil {
		return PublicView{}, err
	}

	applyStr := func(dst *string, src *string) {
		if src != nil {
			*dst = strings.TrimSpace(*src)
		}
	}
	applyStr(&row.ChatBaseURL, in.ChatBaseURL)
	applyStr(&row.ChatModel, in.ChatModel)
	applyStr(&row.EmbeddingBaseURL, in.EmbeddingBaseURL)
	applyStr(&row.EmbeddingModel, in.EmbeddingModel)
	applyStr(&row.VisionBaseURL, in.VisionBaseURL)
	applyStr(&row.VisionModel, in.VisionModel)
	if in.RetrievalTopK != nil && *in.RetrievalTopK > 0 {
		row.RetrievalTopK = *in.RetrievalTopK
	}
	if in.SnippetMaxChars != nil && *in.SnippetMaxChars > 0 {
		row.SnippetMaxChars = *in.SnippetMaxChars
	}

	if in.ChatAPIKey != nil && strings.TrimSpace(*in.ChatAPIKey) != "" {
		sec.ChatAPIKey = strings.TrimSpace(*in.ChatAPIKey)
	}
	if in.EmbeddingAPIKey != nil && strings.TrimSpace(*in.EmbeddingAPIKey) != "" {
		sec.EmbeddingAPIKey = strings.TrimSpace(*in.EmbeddingAPIKey)
	}
	if in.VisionAPIKey != nil && strings.TrimSpace(*in.VisionAPIKey) != "" {
		sec.VisionAPIKey = strings.TrimSpace(*in.VisionAPIKey)
	}

	sealed, err := s.sealSecrets(sec)
	if err != nil {
		return PublicView{}, apperr.Internal("encrypt ai secrets", err)
	}
	row.SecretsCiphertext = sealed
	row.ChatKeySet = sec.ChatAPIKey != ""
	row.EmbeddingKeySet = sec.EmbeddingAPIKey != ""
	row.VisionKeySet = sec.VisionAPIKey != ""
	row.UpdatedBy = actor
	if row.CreatedAt.IsZero() {
		row.CreatedAt = time.Now().UTC()
	}

	if err := s.store.Upsert(ctx, row); err != nil {
		return PublicView{}, apperr.Internal("save ai settings", err)
	}
	return s.publicFrom(row), nil
}

func (s *Service) Runtime(ctx context.Context) (RuntimeView, error) {
	row, err := s.store.Get(ctx)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return RuntimeView{PublicView: PublicView{Configured: false}}, nil
	}
	if err != nil {
		return RuntimeView{}, apperr.Internal("load ai settings", err)
	}
	sec, err := s.loadSecrets(row)
	if err != nil {
		return RuntimeView{}, err
	}
	return RuntimeView{
		PublicView:      s.publicFrom(row),
		ChatAPIKey:      sec.ChatAPIKey,
		EmbeddingAPIKey: sec.EmbeddingAPIKey,
		VisionAPIKey:    sec.VisionAPIKey,
	}, nil
}