package turn

import (
	"crypto/hmac"
	"crypto/sha1"
	"encoding/base64"
	"errors"
	"fmt"
	"strings"
	"time"
)

var (
	ErrEmptySecret = errors.New("turn shared secret must not be empty")
	ErrInvalidTTL  = errors.New("turn credential TTL must be positive")
)

// Credentials represents ephemeral WebRTC TURN REST API credentials compatible with coturn (--use-auth-secret).
type Credentials struct {
	Username   string   `json:"username"`
	Credential string   `json:"credential"`
	TTL        int64    `json:"ttl"`
	URIs       []string `json:"uris"`
}

// Generator creates short-lived HMAC-SHA1 TURN credentials per draft-uberti-behave-turn-rest-00.
type Generator struct {
	secret []byte
	uris   []string
	ttl    time.Duration
}

// NewGenerator constructs a TURN REST credential generator.
func NewGenerator(secret string, uris []string, ttl time.Duration) (*Generator, error) {
	if strings.TrimSpace(secret) == "" {
		return nil, ErrEmptySecret
	}
	if ttl <= 0 {
		return nil, ErrInvalidTTL
	}
	cleanURIs := make([]string, 0, len(uris))
	for _, u := range uris {
		if trimmed := strings.TrimSpace(u); trimmed != "" {
			cleanURIs = append(cleanURIs, trimmed)
		}
	}
	if len(cleanURIs) == 0 {
		cleanURIs = []string{"turn:localhost:3478?transport=udp", "turn:localhost:3478?transport=tcp"}
	}
	return &Generator{
		secret: []byte(secret),
		uris:   cleanURIs,
		ttl:    ttl,
	}, nil
}

// Generate issues an ephemeral username "<unix_expiry>:<peerID>" and base64(HMAC-SHA1(secret, username)).
func (g *Generator) Generate(peerID string, now time.Time) (Credentials, error) {
	sanitizedPeer := strings.ReplaceAll(strings.TrimSpace(peerID), ":", "_")
	if sanitizedPeer == "" {
		sanitizedPeer = "guest"
	}
	expiresAt := now.UTC().Add(g.ttl).Unix()
	username := fmt.Sprintf("%d:%s", expiresAt, sanitizedPeer)

	mac := hmac.New(sha1.New, g.secret)
	if _, err := mac.Write([]byte(username)); err != nil {
		return Credentials{}, fmt.Errorf("compute turn hmac-sha1: %w", err)
	}
	credential := base64.StdEncoding.EncodeToString(mac.Sum(nil))

	return Credentials{
		Username:   username,
		Credential: credential,
		TTL:        int64(g.ttl.Seconds()),
		URIs:       g.uris,
	}, nil
}
