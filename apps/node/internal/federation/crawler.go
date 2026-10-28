package federation

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/santy8151/openplay/apps/node/internal/manifest"
)

var (
	ErrInvalidIndexSchema = errors.New("unsupported federated index schema")
	ErrUntrustedPeerKey   = errors.New("peer index signature verification failed")
)

// NodeDescriptor identifies a federated node inside index.json.
type NodeDescriptor struct {
	Name   string `json:"name"`
	URL    string `json:"url"`
	PubKey string `json:"pubkey"`
}

// IndexedGame summarizes a game advertised by a federated node.
type IndexedGame struct {
	ID            string   `json:"id"`
	Version       string   `json:"version"`
	ManifestURL   string   `json:"manifest_url"`
	PackageURL    string   `json:"package_url"`
	PackageSHA256 string   `json:"package_sha256"`
	License       string   `json:"license"`
	Tags          []string `json:"tags"`
}

// FederatedIndex matches the signed /v1/index.json document contract in AGENTS.md.
type FederatedIndex struct {
	Schema    int            `json:"schema"`
	Node      NodeDescriptor `json:"node"`
	Updated   string         `json:"updated"`
	Games     []IndexedGame  `json:"games"`
	Peers     []string       `json:"peers"`
	Signature string         `json:"signature"`
}

// PeerState tracks crawl status and ETag cache for a remote federated node.
type PeerState struct {
	URL                 string        `json:"url"`
	Name                string        `json:"name"`
	PubKey              string        `json:"pubkey"`
	ETag                string        `json:"etag"`
	Status              string        `json:"status"`
	LastSeenAt          time.Time     `json:"last_seen_at"`
	ConsecutiveFailures int           `json:"consecutive_failures"`
	Games               []IndexedGame `json:"games"`
}

// Crawler polls remote /v1/index.json endpoints with ETag caching and Ed25519 verification.
type Crawler struct {
	mu     sync.RWMutex
	peers  map[string]*PeerState
	client *http.Client
}

// NewCrawler creates a federated index crawler with a 10-second HTTP timeout.
func NewCrawler(seedPeers []string) *Crawler {
	peers := make(map[string]*PeerState, len(seedPeers))
	for _, rawURL := range seedPeers {
		clean := strings.TrimRight(strings.TrimSpace(rawURL), "/")
		if clean == "" {
			continue
		}
		peers[clean] = &PeerState{
			URL:    clean,
			Name:   clean,
			Status: "pending",
			Games:  []IndexedGame{},
		}
	}
	return &Crawler{
		peers: peers,
		client: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// VerifyIndexPayload validates the schema, SPDX allowlist of advertised games, and Ed25519 signature over sha256(JCS(index_without_signature)).
func VerifyIndexPayload(rawJSON []byte, pinnedPubKey string) (*FederatedIndex, error) {
	var idx FederatedIndex
	if err := json.Unmarshal(rawJSON, &idx); err != nil {
		return nil, fmt.Errorf("decode federated index: %w", err)
	}
	if idx.Schema != 1 {
		return nil, fmt.Errorf("%w: got %d, want 1", ErrInvalidIndexSchema, idx.Schema)
	}

	expectedKey := strings.TrimSpace(pinnedPubKey)
	if expectedKey == "" {
		expectedKey = idx.Node.PubKey
	}
	if expectedKey != idx.Node.PubKey {
		return nil, fmt.Errorf("%w: key mismatch (expected %q, got %q)", ErrUntrustedPeerKey, expectedKey, idx.Node.PubKey)
	}

	if err := manifest.VerifySignedDocument(rawJSON, expectedKey, idx.Signature); err != nil {
		return nil, fmt.Errorf("%w: %v", ErrUntrustedPeerKey, err)
	}

	filtered := make([]IndexedGame, 0, len(idx.Games))
	for _, g := range idx.Games {
		if !manifest.AllowedSPDXLicenses[g.License] {
			continue
		}
		filtered = append(filtered, g)
	}
	idx.Games = filtered
	return &idx, nil
}

// SyncPeer fetches and verifies a single peer's /v1/index.json using If-None-Match ETag caching.
func (c *Crawler) SyncPeer(ctx context.Context, peerURL string) (*FederatedIndex, error) {
	cleanURL := strings.TrimRight(strings.TrimSpace(peerURL), "/")
	if cleanURL == "" {
		return nil, errors.New("empty peer url")
	}

	c.mu.Lock()
	state, exists := c.peers[cleanURL]
	if !exists {
		state = &PeerState{
			URL:    cleanURL,
			Name:   cleanURL,
			Status: "pending",
		}
		c.peers[cleanURL] = state
	}
	etag := state.ETag
	pinnedKey := state.PubKey
	c.mu.Unlock()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, cleanURL+"/v1/index.json", nil)
	if err != nil {
		return nil, fmt.Errorf("create peer sync request: %w", err)
	}
	req.Header.Set("Accept", "application/json")
	if etag != "" {
		req.Header.Set("If-None-Match", etag)
	}

	resp, err := c.client.Do(req)
	if err != nil {
		c.recordFailure(cleanURL)
		return nil, fmt.Errorf("fetch peer index %s: %w", cleanURL, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotModified {
		c.mu.Lock()
		state.LastSeenAt = time.Now().UTC()
		state.Status = "Verified"
		state.ConsecutiveFailures = 0
		c.mu.Unlock()
		return nil, nil
	}

	if resp.StatusCode != http.StatusOK {
		c.recordFailure(cleanURL)
		return nil, fmt.Errorf("peer %s returned HTTP %d", cleanURL, resp.StatusCode)
	}

	rawBody, err := io.ReadAll(io.LimitReader(resp.Body, 2*1024*1024))
	if err != nil {
		c.recordFailure(cleanURL)
		return nil, fmt.Errorf("read peer index body: %w", err)
	}

	idx, err := VerifyIndexPayload(rawBody, pinnedKey)
	if err != nil {
		c.recordRejection(cleanURL)
		return nil, fmt.Errorf("verify peer %s index: %w", cleanURL, err)
	}

	c.mu.Lock()
	state.Name = idx.Node.Name
	state.PubKey = idx.Node.PubKey
	state.ETag = resp.Header.Get("ETag")
	state.Status = "Verified"
	state.LastSeenAt = time.Now().UTC()
	state.ConsecutiveFailures = 0
	state.Games = idx.Games
	c.mu.Unlock()

	return idx, nil
}

// SyncAll polls all known peers once.
func (c *Crawler) SyncAll(ctx context.Context) {
	c.mu.RLock()
	urls := make([]string, 0, len(c.peers))
	for u := range c.peers {
		urls = append(urls, u)
	}
	c.mu.RUnlock()

	for _, u := range urls {
		_, _ = c.SyncPeer(ctx, u)
	}
}

// ListPeers returns a snapshot of all federated peers and their verification status.
func (c *Crawler) ListPeers() []PeerState {
	c.mu.RLock()
	defer c.mu.RUnlock()

	out := make([]PeerState, 0, len(c.peers))
	for _, p := range c.peers {
		out = append(out, *p)
	}
	return out
}

func (c *Crawler) recordFailure(peerURL string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if st, ok := c.peers[peerURL]; ok {
		st.ConsecutiveFailures++
		st.Status = "unreachable"
	}
}

func (c *Crawler) recordRejection(peerURL string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if st, ok := c.peers[peerURL]; ok {
		st.ConsecutiveFailures++
		st.Status = "signature_rejected"
	}
}
