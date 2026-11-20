package knowledge

import (
	"archive/zip"
	"bytes"
	"fmt"
	"io"
	"regexp"
	"strings"
)

var (
	docxTextTag = regexp.MustCompile(`(?s)<w:t(?:\s[^>]*)?>(.*?)</w:t>`)
	xmlEntity   = strings.NewReplacer(
		"&lt;", "<",
		"&gt;", ">",
		"&amp;", "&",
		"&quot;", `"`,
		"&apos;", "'",
	)
)

// extractDocx pulls plain text from a .docx (OOXML) archive.
func extractDocx(data []byte) (string, error) {
	zr, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return "", fmt.Errorf("docx zip: %w", err)
	}
	var docXML []byte
	for _, f := range zr.File {
		if f.Name == "word/document.xml" {
			rc, err := f.Open()
			if err != nil {
				return "", err
			}
			docXML, err = io.ReadAll(rc)
			_ = rc.Close()
			if err != nil {
				return "", err
			}
			break
		}
	}
	if len(docXML) == 0 {
		return "", fmt.Errorf("docx missing word/document.xml")
	}

	matches := docxTextTag.FindAllSubmatch(docXML, -1)
	if len(matches) == 0 {
		return "", nil
	}
	parts := make([]string, 0, len(matches))
	for _, m := range matches {
		if len(m) < 2 {
			continue
		}
		t := xmlEntity.Replace(string(m[1]))
		t = strings.TrimSpace(t)
		if t != "" {
			parts = append(parts, t)
		}
	}
	return strings.Join(parts, " "), nil
}