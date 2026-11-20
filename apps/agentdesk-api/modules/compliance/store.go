package compliance

import (
	"context"
	"time"

	"gorm.io/gorm"
)

// SettingsRow is a singleton row (id = 1) shared by the API and agent runtime.
type SettingsRow struct {
	ID                   int16     `gorm:"primaryKey" json:"-"`
	InputAction          string    `gorm:"column:input_action" json:"input_action"`
	OutputAction         string    `gorm:"column:output_action" json:"output_action"`
	Mask                 string    `gorm:"column:mask" json:"mask"`
	RefuseWithoutEvidence bool     `gorm:"column:refuse_without_evidence" json:"refuse_without_evidence"`
	RefusalTemplate      string    `gorm:"column:refusal_template" json:"refusal_template"`
	LowConfidenceHint    string    `gorm:"column:low_confidence_hint" json:"low_confidence_hint"`
	UpdatedBy            string    `gorm:"column:updated_by" json:"updated_by"`
	CreatedAt            time.Time `gorm:"column:created_at" json:"created_at"`
	UpdatedAt            time.Time `gorm:"column:updated_at" json:"updated_at"`
}

func (SettingsRow) TableName() string { return "compliance_settings" }

// TermRow is one sensitive word / phrase.
type TermRow struct {
	ID         string    `gorm:"primaryKey;column:id" json:"id"`
	Term       string    `gorm:"column:term" json:"term"`
	Level      string    `gorm:"column:level" json:"level"`
	Category   string    `gorm:"column:category" json:"category"`
	Suggestion string    `gorm:"column:suggestion" json:"suggestion"`
	Enabled    bool      `gorm:"column:enabled" json:"enabled"`
	CreatedAt  time.Time `gorm:"column:created_at" json:"created_at"`
	UpdatedAt  time.Time `gorm:"column:updated_at" json:"updated_at"`
}

func (TermRow) TableName() string { return "sensitive_terms" }

type Store struct {
	db *gorm.DB
}

func NewStore(db *gorm.DB) *Store { return &Store{db: db} }

func (s *Store) GetSettings(ctx context.Context) (*SettingsRow, error) {
	var row SettingsRow
	if err := s.db.WithContext(ctx).First(&row, 1).Error; err != nil {
		return nil, err
	}
	return &row, nil
}

func (s *Store) UpsertSettings(ctx context.Context, row *SettingsRow) error {
	row.ID = 1
	row.UpdatedAt = time.Now().UTC()
	return s.db.WithContext(ctx).Save(row).Error
}

func (s *Store) ListTerms(ctx context.Context, enabledOnly bool) ([]TermRow, error) {
	var items []TermRow
	q := s.db.WithContext(ctx).Order("created_at ASC")
	if enabledOnly {
		q = q.Where("enabled = ?", true)
	}
	if err := q.Find(&items).Error; err != nil {
		return nil, err
	}
	return items, nil
}

func (s *Store) CreateTerm(ctx context.Context, row *TermRow) error {
	return s.db.WithContext(ctx).Create(row).Error
}

func (s *Store) UpdateTerm(ctx context.Context, row *TermRow) error {
	row.UpdatedAt = time.Now().UTC()
	return s.db.WithContext(ctx).Save(row).Error
}

func (s *Store) DeleteTerm(ctx context.Context, id string) error {
	return s.db.WithContext(ctx).Where("id = ?", id).Delete(&TermRow{}).Error
}
