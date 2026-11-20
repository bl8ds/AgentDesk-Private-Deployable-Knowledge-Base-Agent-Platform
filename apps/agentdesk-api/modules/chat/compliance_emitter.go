package chat

import (
	"agentdesk.example/api/modules/compliance"
)

// redactingEmitter buffers a few trailing runes so that sensitive terms split
// across SSE token chunks are still detected and masked before reaching users.
type redactingEmitter struct {
	inner   Emitter
	snap    compliance.Snapshot
	raw     []rune
	emitted int
	keep    int
}

func newRedactingEmitter(inner Emitter, snap compliance.Snapshot) *redactingEmitter {
	return &redactingEmitter{inner: inner, snap: snap, keep: snap.MaxLen}
}

func (e *redactingEmitter) Emit(event string, data interface{}) error {
	if event != "token" {
		if event == "done" {
			if err := e.flush(); err != nil {
				return err
			}
		}
		return e.inner.Emit(event, data)
	}

	text := ""
	switch v := data.(type) {
	case map[string]interface{}:
		text, _ = v["content"].(string)
	case map[string]string:
		text = v["content"]
	default:
		return e.inner.Emit(event, data)
	}
	if text == "" {
		return nil
	}
	e.raw = append(e.raw, []rune(text)...)
	return e.emitSafe()
}

func (e *redactingEmitter) emitSafe() error {
	red := []rune(compliance.Redact(string(e.raw), e.snap))
	safe := len(red) - e.keep
	if safe <= e.emitted {
		return nil
	}
	chunk := string(red[e.emitted:safe])
	e.emitted = safe
	if chunk == "" {
		return nil
	}
	return e.inner.Emit("token", map[string]string{"content": chunk})
}

func (e *redactingEmitter) flush() error {
	full := string(e.raw)
	if e.snap.Settings.OutputAction == "warn" {
		res := compliance.Check(full, e.snap)
		if len(res.Matches) > 0 {
			_ = e.inner.Emit("compliance_warning", map[string]interface{}{
				"scope":   "output",
				"matches": res.Matches,
			})
		}
	}
	red := []rune(compliance.Redact(full, e.snap))
	if len(red) > e.emitted {
		chunk := string(red[e.emitted:])
		e.emitted = len(red)
		if chunk != "" {
			return e.inner.Emit("token", map[string]string{"content": chunk})
		}
	}
	return nil
}
