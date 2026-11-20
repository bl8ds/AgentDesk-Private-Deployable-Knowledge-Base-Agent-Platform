package aisettings

import (
	"context"
	"time"

	"gorm.io/gorm"
)

type Row struct {
	ID                int16     `gorm:"primaryKey" json:"-"`
	ChatBaseURL       string    `gorm:"column:chat_base_url" json:"chat_base_url"`
	ChatModel         string    `gorm:"column:chat_model" json:"chat_model"`
	EmbeddingBaseURL  string    `gorm:"column:embedding_base_url" json:"embedding_base_url"`
	EmbeddingModel    string    `gorm:"column:embedding_model" json:"embedding_model"`
	VisionBaseURL     string    `gorm:"column:vision_base_url" json:"vision_base_url"`
	VisionModel       string    `gorm:"column:vision_model" json:"vision_model"`
	RetrievalTopK     int       `gorm:"column:retrieval_top_k" json:"retrieval_top_k"`
	SnippetMaxChars   int       `gorm:"column:snippet_max_chars" json:"snippet_max_chars"`
	SecretsCiphertext string    `gorm:"column:secrets_ciphertext" json:"-"`
	ChatKeySet        bool      `gorm:"column:chat_key_set" json:"chat_key_set"`
	EmbeddingKeySet   bool      `gorm:"column:embedding_key_set" json:"embedding_key_set"`
	VisionKeySet      bool      `gorm:"column:vision_key_set" json:"vision_key_set"`
	UpdatedBy         string    `gorm:"column:updated_by" json:"updated_by"`
	CreatedAt         time.Time `gorm:"column:created_at" json:"created_at"`
	UpdatedAt         time.Time `gorm:"column:updated_at" json:"updated_at"`
}

func (Row) TableName() string { return "runtime_ai_settings" }

type Store struct {
	db *gorm.DB
}

func NewStore(db *gorm.DB) *Store { return &Store{db: db} }

func (s *Store) Get(ctx context.Context) (*Row, error) {
	var row Row
	err := s.db.WithContext(ctx).First(&row, 1).Error
	if err != nil {
		return nil, err
	}
	return &row, nil
}

func (s *Store) Upsert(ctx context.Context, row *Row) error {
	row.ID = 1
	row.UpdatedAt = time.Now().UTC()
	return s.db.WithContext(ctx).Save(row).Error
}