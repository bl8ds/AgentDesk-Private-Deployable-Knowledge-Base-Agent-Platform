package knowledge

import (
	"archive/zip"
	"bytes"
	"testing"
)

func TestExtractDocx(t *testing.T) {
	var buf bytes.Buffer
	zw := zip.NewWriter(&buf)
	w, err := zw.Create("word/document.xml")
	if err != nil {
		t.Fatal(err)
	}
	_, err = w.Write([]byte(
		`<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>AgentDesk</w:t></w:r><w:r><w:t>产品</w:t></w:r></w:p></w:body></w:document>`,
	))
	if err != nil {
		t.Fatal(err)
	}
	if err := zw.Close(); err != nil {
		t.Fatal(err)
	}
	text, err := extractDocx(buf.Bytes())
	if err != nil {
		t.Fatal(err)
	}
	if text != "AgentDesk 产品" {
		t.Fatalf("got %q", text)
	}
}