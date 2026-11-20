package httpx

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"agentdesk.example/api/pkg/apperr"
)

type SuccessResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data"`
}

type ProblemDetail struct {
	Type     string `json:"type"`
	Title    string `json:"title"`
	Status   int    `json:"status"`
	Detail   string `json:"detail,omitempty"`
	Instance string `json:"instance,omitempty"`
	Code     string `json:"code,omitempty"`
}

type Pagination struct {
	Page     int   `json:"page"`
	PageSize int   `json:"page_size"`
	Total    int64 `json:"total"`
}

type ListData struct {
	Items      interface{} `json:"items"`
	Pagination Pagination  `json:"pagination"`
}

func OK(c *gin.Context, status int, data interface{}) {
	c.JSON(status, SuccessResponse{Success: true, Data: data})
}

func Created(c *gin.Context, data interface{}) {
	OK(c, http.StatusCreated, data)
}

func Fail(c *gin.Context, err error) {
	status := apperr.HTTPStatus(err)
	detail := err.Error()
	code := "internal"
	title := http.StatusText(status)

	var ae *apperr.Error
	if errors.As(err, &ae) {
		if ae.Code != "" {
			code = ae.Code
		}
		detail = ae.Message
	}

	c.Header("Content-Type", "application/problem+json")
	c.JSON(status, ProblemDetail{
		Type:     "https://agentdesk.com/errors/" + code,
		Title:    title,
		Status:   status,
		Detail:   detail,
		Code:     code,
		Instance: c.Request.URL.Path,
	})
}

func BindJSON(c *gin.Context, dst interface{}) error {
	if err := c.ShouldBindJSON(dst); err != nil {
		return apperr.Validation("invalid_json", err.Error())
	}
	return nil
}

func ParsePage(c *gin.Context, defaultSize int) (page, pageSize int) {
	page = queryInt(c, "page", 1)
	pageSize = queryInt(c, "page_size", defaultSize)
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = defaultSize
	}
	if pageSize > 100 {
		pageSize = 100
	}
	return page, pageSize
}

func queryInt(c *gin.Context, key string, fallback int) int {
	v := c.Query(key)
	if v == "" {
		return fallback
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return fallback
	}
	return n
}