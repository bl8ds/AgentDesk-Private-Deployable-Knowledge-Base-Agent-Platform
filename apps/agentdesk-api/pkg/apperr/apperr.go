package apperr

import (
	"errors"
	"fmt"
	"net/http"
)

type Kind string

const (
	KindValidation       Kind = "validation"
	KindNotFound         Kind = "not_found"
	KindConflict         Kind = "conflict"
	KindForbidden        Kind = "forbidden"
	KindUnauthorized     Kind = "unauthorized"
	KindTooManyRequests  Kind = "too_many_requests"
	KindInternal         Kind = "internal"
)

type Error struct {
	Kind    Kind
	Code    string
	Message string
	Cause   error
}

func (e *Error) Error() string {
	if e.Cause != nil {
		return fmt.Sprintf("%s: %v", e.Message, e.Cause)
	}
	return e.Message
}

func (e *Error) Unwrap() error { return e.Cause }

func Validation(code, msg string) *Error {
	return &Error{Kind: KindValidation, Code: code, Message: msg}
}

func NotFound(code, msg string) *Error {
	return &Error{Kind: KindNotFound, Code: code, Message: msg}
}

func Conflict(code, msg string) *Error {
	return &Error{Kind: KindConflict, Code: code, Message: msg}
}

func Forbidden(code, msg string) *Error {
	return &Error{Kind: KindForbidden, Code: code, Message: msg}
}

func Unauthorized(msg string) *Error {
	return &Error{Kind: KindUnauthorized, Code: "unauthorized", Message: msg}
}

func TooManyRequests(code, msg string) *Error {
	return &Error{Kind: KindTooManyRequests, Code: code, Message: msg}
}

func Internal(msg string, cause error) *Error {
	return &Error{Kind: KindInternal, Code: "internal", Message: msg, Cause: cause}
}

func HTTPStatus(err error) int {
	var ae *Error
	if !errors.As(err, &ae) {
		return http.StatusInternalServerError
	}
	switch ae.Kind {
	case KindValidation:
		return http.StatusBadRequest
	case KindNotFound:
		return http.StatusNotFound
	case KindConflict:
		return http.StatusConflict
	case KindForbidden:
		return http.StatusForbidden
	case KindUnauthorized:
		return http.StatusUnauthorized
	case KindTooManyRequests:
		return http.StatusTooManyRequests
	default:
		return http.StatusInternalServerError
	}
}

func As(err error) (*Error, bool) {
	var ae *Error
	ok := errors.As(err, &ae)
	return ae, ok
}