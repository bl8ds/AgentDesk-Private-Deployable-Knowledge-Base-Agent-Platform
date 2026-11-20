package cryptox

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"strings"
)

// Seal encrypts plaintext with AES-256-GCM.
// Output: base64(nonce || ciphertext||tag). Requires a 32-byte key
// provided as 64-char hex or raw 32-byte / base64-decoded 32-byte string.
func Seal(keyMaterial, plaintext string) (string, error) {
	key, err := ParseKey(keyMaterial)
	if err != nil {
		return "", err
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}
	out := gcm.Seal(nonce, nonce, []byte(plaintext), nil)
	return base64.StdEncoding.EncodeToString(out), nil
}

func Open(keyMaterial, sealed string) (string, error) {
	if sealed == "" {
		return "", errors.New("empty ciphertext")
	}
	key, err := ParseKey(keyMaterial)
	if err != nil {
		return "", err
	}
	raw, err := base64.StdEncoding.DecodeString(sealed)
	if err != nil {
		return "", fmt.Errorf("decode ciphertext: %w", err)
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	ns := gcm.NonceSize()
	if len(raw) < ns {
		return "", errors.New("ciphertext too short")
	}
	plain, err := gcm.Open(nil, raw[:ns], raw[ns:], nil)
	if err != nil {
		return "", err
	}
	return string(plain), nil
}

func ParseKey(material string) ([]byte, error) {
	s := strings.TrimSpace(material)
	if s == "" {
		return nil, errors.New("CONFIG_ENCRYPTION_KEY is required")
	}
	if len(s) == 64 {
		b, err := hex.DecodeString(s)
		if err == nil && len(b) == 32 {
			return b, nil
		}
	}
	if b, err := base64.StdEncoding.DecodeString(s); err == nil && len(b) == 32 {
		return b, nil
	}
	if len(s) == 32 {
		return []byte(s), nil
	}
	return nil, errors.New("CONFIG_ENCRYPTION_KEY must be 32 bytes (hex64 / base64 / raw)")
}