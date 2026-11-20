package audit

import (
	"context"
	"time"

	"github.com/google/uuid"

	"agentdesk.example/api/pkg/apperr"
	"agentdesk.example/api/pkg/httpx"
)

type Service struct {
	store *Store
}

func NewService(store *Store) *Service {
	return &Service{store: store}
}

func (s *Service) Write(ctx context.Context, actorID, action, resourceType, resourceID string, meta interface{}) {
	_ = s.store.Create(ctx, &Log{
		ID:           uuid.New(),
		ActorID:      actorID,
		Action:       action,
		ResourceType: resourceType,
		ResourceID:   resourceID,
		Meta:         MetaJSON(meta),
		CreatedAt:    time.Now().UTC(),
	})
}

func (s *Service) List(ctx context.Context, page, pageSize int, f ListFilter) ([]Log, httpx.Pagination, error) {
	items, total, err := s.store.List(ctx, page, pageSize, f)
	if err != nil {
		return nil, httpx.Pagination{}, apperr.Internal("list audit logs", err)
	}
	return items, httpx.Pagination{Page: page, PageSize: pageSize, Total: total}, nil
}

// Actions exposes the distinct action names for admin filter controls.
func (s *Service) Actions(ctx context.Context) ([]string, error) {
	actions, err := s.store.DistinctActions(ctx)
	if err != nil {
		return nil, apperr.Internal("list audit actions", err)
	}
	return actions, nil
}