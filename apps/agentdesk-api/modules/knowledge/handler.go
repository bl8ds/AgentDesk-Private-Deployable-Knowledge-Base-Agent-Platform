package knowledge

import (
	"io"
	"net/http"
	"net/url"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"agentdesk.example/api/modules/audit"
	"agentdesk.example/api/modules/authz"
	"agentdesk.example/api/pkg/apperr"
	"agentdesk.example/api/pkg/httpx"
)

type Handler struct {
	svc   *Service
	audit *audit.Service
}

func NewHandler(svc *Service, auditSvc *audit.Service) *Handler {
	return &Handler{svc: svc, audit: auditSvc}
}

func (h *Handler) Register(r gin.IRoutes) {
	r.POST("/docs", h.upload)
	r.GET("/docs", h.list)
	r.GET("/docs/status-counts", h.statusCounts)
	r.GET("/docs/:id", h.get)
	r.DELETE("/docs/:id", h.delete)
	r.POST("/docs/:id/reprocess", h.reprocess)
	r.GET("/docs/:id/content", h.content)
	r.GET("/docs/:id/chunks", h.chunks)
}

func (h *Handler) upload(c *gin.Context) {
	p, ok := authz.PrincipalFromGin(c)
	if !ok {
		httpx.Fail(c, apperr.Unauthorized("unauthenticated"))
		return
	}
	file, err := c.FormFile("file")
	if err != nil {
		httpx.Fail(c, apperr.Validation("missing_file", "multipart field file is required"))
		return
	}
	src, err := file.Open()
	if err != nil {
		httpx.Fail(c, apperr.Internal("open upload", err))
		return
	}
	defer src.Close()

	contentType := file.Header.Get("Content-Type")
	doc, err := h.svc.Upload(c.Request.Context(), file.Filename, contentType, p.UserID, src)
	if err != nil {
		httpx.Fail(c, err)
		return
	}
	if h.audit != nil {
		h.audit.Write(c.Request.Context(), p.UserID, "docs.upload", "document", doc.ID.String(), map[string]string{
			"filename": file.Filename,
		})
	}
	httpx.Created(c, gin.H{"document": doc})
}

func (h *Handler) list(c *gin.Context) {
	page, pageSize := httpx.ParsePage(c, 20)
	items, pagination, err := h.svc.ListFiltered(c.Request.Context(), page, pageSize, c.Query("status"))
	if err != nil {
		httpx.Fail(c, err)
		return
	}
	httpx.OK(c, http.StatusOK, httpx.ListData{Items: items, Pagination: pagination})
}

// statusCounts feeds the processing monitor cards on the document page.
func (h *Handler) statusCounts(c *gin.Context) {
	counts, err := h.svc.StatusCounts(c.Request.Context())
	if err != nil {
		httpx.Fail(c, err)
		return
	}
	httpx.OK(c, http.StatusOK, gin.H{"counts": counts})
}

// chunks exposes the stored chunks of a document for corpus inspection.
func (h *Handler) chunks(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		httpx.Fail(c, apperr.Validation("invalid_id", "invalid document id"))
		return
	}
	chunks, err := h.svc.Chunks(c.Request.Context(), id)
	if err != nil {
		httpx.Fail(c, err)
		return
	}
	httpx.OK(c, http.StatusOK, gin.H{"chunks": chunks})
}

func (h *Handler) get(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		httpx.Fail(c, apperr.Validation("invalid_id", "invalid document id"))
		return
	}
	doc, err := h.svc.Get(c.Request.Context(), id)
	if err != nil {
		httpx.Fail(c, err)
		return
	}
	httpx.OK(c, http.StatusOK, gin.H{"document": doc})
}

func (h *Handler) delete(c *gin.Context) {
	p, ok := authz.PrincipalFromGin(c)
	if !ok {
		httpx.Fail(c, apperr.Unauthorized("unauthenticated"))
		return
	}
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		httpx.Fail(c, apperr.Validation("invalid_id", "invalid document id"))
		return
	}
	if err := h.svc.Delete(c.Request.Context(), id); err != nil {
		httpx.Fail(c, err)
		return
	}
	if h.audit != nil {
		h.audit.Write(c.Request.Context(), p.UserID, "docs.delete", "document", id.String(), nil)
	}
	httpx.OK(c, http.StatusOK, gin.H{"deleted": true, "id": id.String()})
}

func (h *Handler) reprocess(c *gin.Context) {
	p, ok := authz.PrincipalFromGin(c)
	if !ok {
		httpx.Fail(c, apperr.Unauthorized("unauthenticated"))
		return
	}
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		httpx.Fail(c, apperr.Validation("invalid_id", "invalid document id"))
		return
	}
	doc, err := h.svc.Reprocess(c.Request.Context(), id)
	if err != nil {
		httpx.Fail(c, err)
		return
	}
	if h.audit != nil {
		h.audit.Write(c.Request.Context(), p.UserID, "docs.reprocess", "document", id.String(), nil)
	}
	httpx.OK(c, http.StatusOK, gin.H{"document": doc})
}

func (h *Handler) content(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		httpx.Fail(c, apperr.Validation("invalid_id", "invalid document id"))
		return
	}
	doc, body, err := h.svc.OpenContent(c.Request.Context(), id)
	if err != nil {
		httpx.Fail(c, err)
		return
	}
	defer body.Close()

	ct := doc.ContentType
	if ct == "" {
		ct = "application/octet-stream"
	}
	c.Header("Content-Type", ct)
	c.Header("Content-Disposition", "inline; filename*=UTF-8''"+url.PathEscape(doc.Filename))
	c.Status(http.StatusOK)
	_, _ = io.Copy(c.Writer, body)
}