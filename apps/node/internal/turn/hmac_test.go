package turn

import (
	"strings"
	"testing"
	"time"
)

func TestGenerateEphemeralTurnCredentials(t *testing.T) {
	gen, err := NewGenerator("super-secret-coturn-key", []string{"turn:node.openplay.example:3478?transport=udp"}, 12*time.Hour)
	if err != nil {
		t.Fatalf("new generator: %v", err)
	}

	now := time.Unix(1730000000, 0).UTC()
	creds, err := gen.Generate("pilot-01", now)
	if err != nil {
		t.Fatalf("generate credentials: %v", err)
	}
	if !strings.HasSuffix(creds.Username, ":pilot-01") {
		t.Fatalf("unexpected username format: %s", creds.Username)
	}
	if creds.Credential == "" {
		t.Fatal("expected non-empty HMAC-SHA1 credential")
	}
	if creds.TTL != 43200 {
		t.Fatalf("expected TTL 43200, got %d", creds.TTL)
	}
}
