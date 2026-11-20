package tools

import (
	"context"
	"encoding/json"
	"errors"
	"net/url"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"agentdesk.example/api/pkg/apperr"
)

const maxParamName = 48

var toolNameRe = regexp.MustCompile(`^[a-z][a-z0-9_]{1,47}$`)

// ToolInput is the admin-facing mutable shape. Config / InputSchema are raw
// JSON objects; we validate them here and store them as compact JSON strings.
type ToolInput struct {
	Name        *string         `json:"name"`
	Label       *string         `json:"label"`
	Description *string         `json:"description"`
	Kind        *string         `json:"kind"`
	Config      json.RawMessage `json:"config"`
	InputSchema json.RawMessage `json:"input_schema"`
	Enabled     *bool           `json:"enabled"`
}

// HTTPConfig describes how a kind=http tool issues its request. Placeholders
// like {{param}} in url / headers / body are substituted with validated input.
type HTTPConfig struct {
	Method        string            `json:"method"`
	URL           string            `json:"url"`
	Headers       map[string]string `json:"headers"`
	Body          string            `json:"body"`
	ResponsePath  string            `json:"response_path"`
	TimeoutMs     int               `json:"timeout_ms"`
	MaxOutputChars int              `json:"max_output_chars"`
}

type Service struct {
	store *Store
}

func NewService(store *Store) *Service { return &Service{store: store} }

func (s *Service) List(ctx context.Context) ([]Row, error) {
	items, err := s.store.List(ctx, false)
	if err != nil {
		return nil, apperr.Internal("list tools", err)
	}
	return items, nil
}

func (s *Service) Create(ctx context.Context, in ToolInput) (Row, error) {
	name, kind, config, schema, err := s.normalize(in, nil)
	if err != nil {
		return Row{}, err
	}
	existing, err := s.store.GetByName(ctx, name)
	if err == nil && existing != nil {
		return Row{}, apperr.Conflict("duplicate_tool_name", "工具标识已存在")
	}
	now := time.Now().UTC()
	row := Row{
		ID:          uuid.NewString(),
		Name:        name,
		Label:       valueOr(in.Label, name),
		Description: valueOr(in.Description, ""),
		Kind:        kind,
		Config:      config,
		InputSchema: schema,
		Enabled:     in.Enabled == nil || *in.Enabled,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	if err := s.store.Create(ctx, &row); err != nil {
		return Row{}, apperr.Internal("create tool", err)
	}
	return row, nil
}

func (s *Service) Update(ctx context.Context, id string, in ToolInput) (Row, error) {
	row, err := s.store.Get(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return Row{}, apperr.NotFound("TOOL_NOT_FOUND", "工具不存在")
		}
		return Row{}, apperr.Internal("load tool", err)
	}
	name, kind, config, schema, err := s.normalize(in, row)
	if err != nil {
		return Row{}, err
	}
	if name != row.Name {
		if existing, e := s.store.GetByName(ctx, name); e == nil && existing != nil {
			return Row{}, apperr.Conflict("duplicate_tool_name", "工具标识已存在")
		}
	}
	row.Name = name
	row.Kind = kind
	row.Config = config
	row.InputSchema = schema
	if in.Label != nil {
		row.Label = strings.TrimSpace(*in.Label)
	}
	if in.Description != nil {
		row.Description = strings.TrimSpace(*in.Description)
	}
	if in.Enabled != nil {
		row.Enabled = *in.Enabled
	}
	if err := s.store.Update(ctx, row); err != nil {
		return Row{}, apperr.Internal("update tool", err)
	}
	return *row, nil
}

func (s *Service) Delete(ctx context.Context, id string) error {
	row, err := s.store.Get(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return apperr.NotFound("TOOL_NOT_FOUND", "工具不存在")
		}
		return apperr.Internal("load tool", err)
	}
	if row.Kind == "builtin" {
		return apperr.Forbidden("BUILTIN_IMMUTABLE", "内置工具不可删除，可将其停用")
	}
	if err := s.store.Delete(ctx, id); err != nil {
		return apperr.Internal("delete tool", err)
	}
	return nil
}

func (s *Service) Get(ctx context.Context, id string) (Row, error) {
	row, err := s.store.Get(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return Row{}, apperr.NotFound("TOOL_NOT_FOUND", "工具不存在")
		}
		return Row{}, apperr.Internal("load tool", err)
	}
	return *row, nil
}

// normalize validates and returns (name, kind, configJSON, schemaJSON).
// When base is non-nil, omitted fields keep their previous values.
func (s *Service) normalize(in ToolInput, base *Row) (string, string, string, string, error) {
	name := ""
	kind := "http"
	if base != nil {
		name = base.Name
		kind = base.Kind
	}
	if in.Name != nil {
		name = strings.ToLower(strings.TrimSpace(*in.Name))
	}
	if !toolNameRe.MatchString(name) {
		return "", "", "", "", apperr.Validation("invalid_tool_name", "工具标识须为小写字母开头，仅含字母/数字/下划线，长度 2-48")
	}
	if in.Kind != nil {
		kind = strings.ToLower(strings.TrimSpace(*in.Kind))
	}
	if kind != "builtin" && kind != "http" {
		return "", "", "", "", apperr.Validation("invalid_kind", "kind 仅支持 builtin 或 http")
	}

	configRaw := []byte(`{}`)
	schemaRaw := []byte(`{"type":"object","properties":{}}`)
	if base != nil {
		configRaw = []byte(base.Config)
		schemaRaw = []byte(base.InputSchema)
	}
	if len(in.Config) > 0 {
		configRaw = in.Config
	}
	if len(in.InputSchema) > 0 {
		schemaRaw = in.InputSchema
	}

	var configObj map[string]interface{}
	if err := json.Unmarshal(configRaw, &configObj); err != nil || configObj == nil {
		return "", "", "", "", apperr.Validation("invalid_config", "config 必须是 JSON 对象")
	}
	var schemaObj map[string]interface{}
	if err := json.Unmarshal(schemaRaw, &schemaObj); err != nil || schemaObj == nil {
		return "", "", "", "", apperr.Validation("invalid_schema", "input_schema 必须是 JSON 对象")
	}
	if _, ok := schemaObj["properties"]; !ok {
		return "", "", "", "", apperr.Validation("invalid_schema", "input_schema 缺少 properties")
	}
	// Validate parameter definitions: object of {type, description}.
	props, _ := schemaObj["properties"].(map[string]interface{})
	for key, raw := range props {
		if len(key) > maxParamName {
			return "", "", "", "", apperr.Validation("invalid_schema", "参数名过长: "+key)
		}
		def, ok := raw.(map[string]interface{})
		if !ok {
			return "", "", "", "", apperr.Validation("invalid_schema", "参数定义必须是对象: "+key)
		}
		if def["type"] == nil {
			return "", "", "", "", apperr.Validation("invalid_schema", "参数缺少 type: "+key)
		}
	}

	if kind == "http" {
		rawURL, _ := configObj["url"].(string)
		if rawURL == "" {
			return "", "", "", "", apperr.Validation("invalid_config", "http 工具必须配置 url")
		}
		if !strings.Contains(rawURL, "{{") {
			parsed, err := url.Parse(rawURL)
			if err != nil || (parsed.Scheme != "http" && parsed.Scheme != "https") {
				return "", "", "", "", apperr.Validation("invalid_config", "url 必须是 http/https 地址")
			}
		}
		method, _ := configObj["method"].(string)
		if method == "" {
			configObj["method"] = "GET"
		}
	}

	configBytes, _ := json.Marshal(configObj)
	schemaBytes, _ := json.Marshal(schemaObj)
	return name, kind, string(configBytes), string(schemaBytes), nil
}

func valueOr(ptr *string, fallback string) string {
	if ptr == nil {
		return fallback
	}
	v := strings.TrimSpace(*ptr)
	if v == "" {
		return fallback
	}
	return v
}
