package cryptox

import "testing"

func TestSealOpenRoundTrip(t *testing.T) {
	key := "0123456789abcdef0123456789abcdef" // 32 raw bytes
	sealed, err := Seal(key, `{"chat_api_key":"sk-test"}`)
	if err != nil {
		t.Fatal(err)
	}
	plain, err := Open(key, sealed)
	if err != nil {
		t.Fatal(err)
	}
	if plain != `{"chat_api_key":"sk-test"}` {
		t.Fatalf("got %q", plain)
	}
}