package api

import (
	"crypto/ed25519"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/santy8151/openplay/apps/node/internal/federation"
	"github.com/santy8151/openplay/apps/node/internal/manifest"
	"github.com/santy8151/openplay/apps/node/internal/signal"
	"github.com/santy8151/openplay/apps/node/internal/turn"
)

// Config configures the OpenPlay Federated Node HTTP & Signaling Server.
type Config struct {
	NodeName       string
	NodeURL        string
	NodePrivateKey ed25519.PrivateKey
	TurnSecret     string
	TurnURIs       []string
	SeedPeers      []string
}

// CatalogEntry represents a verified game in the node catalog.
type CatalogEntry struct {
	ID            string                `json:"id"`
	Name          string                `json:"name"`
	Version       string                `json:"version"`
	License       string                `json:"license"`
	Verified      bool                  `json:"verified"`
	OriginNodeURL string                `json:"origin_node_url"`
	PackageURL    string                `json:"package_url"`
	PackageSHA256 string                `json:"package_sha256"`
	PackageSize   int64                 `json:"package_size"`
	Tags          []string              `json:"tags"`
	CreatedAt     time.Time             `json:"created_at"`
	Manifest      manifest.GameManifest `json:"manifest"`
}

// ReportEntry stores an abuse or license report submitted via POST /v1/reports.
type ReportEntry struct {
	ID         string    `json:"id"`
	GameID     string    `json:"game_id"`
	Version    string    `json:"version"`
	ReporterID string    `json:"reporter_id"`
	Reason     string    `json:"reason"`
	Details    string    `json:"details"`
	Status     string    `json:"status"`
	CreatedAt  time.Time `json:"created_at"`
}

// Server wires all REST endpoints, federation index signing, TURN credentials, and WebSocket signaling.
type Server struct {
	cfg           Config
	nodePubKeyStr string
	turnGen       *turn.Generator
	signalHub     *signal.Hub
	crawler       *federation.Crawler

	mu       sync.RWMutex
	games    map[string]CatalogEntry
	versions map[string][]CatalogEntry
	reports  []ReportEntry

	requestsTotal atomic.Uint64
}

// NewServer constructs a configured OpenPlay Node Server seeded with official open-source reference games.
func NewServer(cfg Config) (*Server, error) {
	if cfg.NodeName == "" {
		cfg.NodeName = "Neo-Bogota Node 01"
	}
	if cfg.NodeURL == "" {
		cfg.NodeURL = "http://localhost:8080"
	}
	if len(cfg.NodePrivateKey) != ed25519.PrivateKeySize {
		seed := sha256.Sum256([]byte("openplay-node-default-deterministic-seed:" + cfg.NodeURL))
		cfg.NodePrivateKey = ed25519.NewKeyFromSeed(seed[:])
	}
	if cfg.TurnSecret == "" {
		cfg.TurnSecret = "openplay-coturn-dev-hmac-secret"
	}

	turnGen, err := turn.NewGenerator(cfg.TurnSecret, cfg.TurnURIs, 12*time.Hour)
	if err != nil {
		return nil, fmt.Errorf("initialize turn generator: %w", err)
	}

	pubKey := cfg.NodePrivateKey.Public().(ed25519.PublicKey)
	pubKeyStr := "ed25519:" + base64.StdEncoding.EncodeToString(pubKey)

	s := &Server{
		cfg:           cfg,
		nodePubKeyStr: pubKeyStr,
		turnGen:       turnGen,
		signalHub:     signal.NewHub(),
		crawler:       federation.NewCrawler(cfg.SeedPeers),
		games:         make(map[string]CatalogEntry),
		versions:      make(map[string][]CatalogEntry),
		reports:       make([]ReportEntry, 0),
	}

	if err := s.seedDefaultCatalog(); err != nil {
		return nil, fmt.Errorf("seed default catalog: %w", err)
	}
	return s, nil
}

// Router builds the chi v5 HTTP router implementing all endpoints from AGENTS.md and openapi.yaml.
func (s *Server) Router() http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.RealIP)
	r.Use(middleware.Recoverer)
	r.Use(s.corsAndSecurityHeaders)

	r.Get("/v1/healthz", s.handleHealthz)
	r.Get("/v1/metrics", s.handleMetrics)

	r.Get("/v1/catalog", s.handleListCatalog)
	r.Post("/v1/games", s.handlePublishGame)
	r.Get("/v1/games/{id}", s.handleGetGame)
	r.Get("/v1/games/{id}/versions", s.handleListGameVersions)
	r.Get("/v1/games/{id}/manifest.json", s.handleGetGameManifest)

	r.Get("/v1/index.json", s.handleGetFederatedIndex)
	r.Get("/v1/federation/peers", s.handleListFederationPeers)

	r.Post("/v1/auth/guest", s.handleGuestAuth)
	r.Post("/v1/auth/oidc/callback", s.handleOIDCCallback)

	r.Get("/v1/turn-credentials", s.handleGetTurnCredentials)

	r.Get("/v1/rooms", s.handleListRooms)
	r.Post("/v1/rooms", s.handleCreateRoom)
	r.Delete("/v1/rooms/{id}", s.handleDeleteRoom)

	r.Post("/v1/reports", s.handleCreateReport)

	// WebSocket P2P signaling endpoint
	r.Handle("/v1/signal", s.signalHub)

	return r
}

func (s *Server) corsAndSecurityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		s.requestsTotal.Add(1)
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Accept, Authorization, Content-Type, If-None-Match")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Referrer-Policy", "no-referrer")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (s *Server) handleHealthz(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"status":  "ok",
		"node":    s.cfg.NodeName,
		"pubkey":  s.nodePubKeyStr,
		"version": "0.1.0-beta",
	})
}

func (s *Server) handleMetrics(w http.ResponseWriter, _ *http.Request) {
	s.mu.RLock()
	gameCount := len(s.games)
	reportCount := len(s.reports)
	s.mu.RUnlock()

	roomCount := s.signalHub.ActiveRoomCount()
	peers := s.crawler.ListPeers()

	w.Header().Set("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	_, _ = fmt.Fprintf(w,
		"# HELP openplay_http_requests_total Total HTTP requests processed.\n"+
			"# TYPE openplay_http_requests_total counter\n"+
			"openplay_http_requests_total %d\n"+
			"# HELP openplay_catalog_games_total Total verified games in catalog.\n"+
			"# TYPE openplay_catalog_games_total gauge\n"+
			"openplay_catalog_games_total %d\n"+
			"# HELP openplay_active_rooms_total Active WebRTC signaling rooms.\n"+
			"# TYPE openplay_active_rooms_total gauge\n"+
			"openplay_active_rooms_total %d\n"+
			"# HELP openplay_federation_peers_total Known federated peers.\n"+
			"# TYPE openplay_federation_peers_total gauge\n"+
			"openplay_federation_peers_total %d\n"+
			"# HELP openplay_abuse_reports_total Submitted abuse reports.\n"+
			"# TYPE openplay_abuse_reports_total counter\n"+
			"openplay_abuse_reports_total %d\n",
		s.requestsTotal.Load(), gameCount, roomCount, len(peers), reportCount,
	)
}

func (s *Server) handleListCatalog(w http.ResponseWriter, r *http.Request) {
	tagFilter := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("tag")))
	licenseFilter := strings.TrimSpace(r.URL.Query().Get("license"))
	queryFilter := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("q")))
	modsParam := strings.TrimSpace(r.URL.Query().Get("mods"))
	playersParam := strings.TrimSpace(r.URL.Query().Get("players"))

	s.mu.RLock()
	items := make([]CatalogEntry, 0, len(s.games))
	for _, entry := range s.games {
		if tagFilter != "" && !containsStringIgnoreCase(entry.Tags, tagFilter) {
			continue
		}
		if licenseFilter != "" && !strings.EqualFold(entry.License, licenseFilter) {
			continue
		}
		if queryFilter != "" &&
			!strings.Contains(strings.ToLower(entry.Name), queryFilter) &&
			!strings.Contains(strings.ToLower(entry.ID), queryFilter) {
			continue
		}
		if modsParam != "" {
			wantMods := modsParam == "true" || modsParam == "1"
			hasMods := entry.Manifest.Mods != nil && entry.Manifest.Mods.Enabled
			if wantMods != hasMods {
				continue
			}
		}
		if playersParam != "" {
			if p, err := strconv.Atoi(playersParam); err == nil && entry.Manifest.Multiplayer != nil {
				if p < entry.Manifest.Multiplayer.Min || p > entry.Manifest.Multiplayer.Max {
					continue
				}
			}
		}
		items = append(items, entry)
	}
	s.mu.RUnlock()

	writeJSON(w, http.StatusOK, map[string]any{
		"items": items,
		"total": len(items),
	})
}

type publishGameRequest struct {
	Manifest      json.RawMessage `json:"manifest"`
	PackageURL    string          `json:"package_url"`
	PackageSHA256 string          `json:"package_sha256"`
	PackageSize   int64           `json:"package_size"`
	Tags          []string        `json:"tags"`
}

func (s *Server) handlePublishGame(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(io.LimitReader(r.Body, 1024*1024))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_body", "failed to read request body")
		return
	}

	var req publishGameRequest
	if err := json.Unmarshal(body, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "invalid publish request payload")
		return
	}

	if req.PackageSize <= 0 && len(req.Manifest) > 0 {
		req.PackageSize = 1024
	}

	verifiedManifest, err := manifest.VerifyAndParseManifest(req.Manifest, req.PackageSize)
	if err != nil {
		writeError(w, http.StatusBadRequest, "manifest_verification_failed", err.Error())
		return
	}

	pkgURL := strings.TrimSpace(req.PackageURL)
	if pkgURL == "" {
		pkgURL = fmt.Sprintf("%s/v1/games/%s/package.zip", strings.TrimRight(s.cfg.NodeURL, "/"), verifiedManifest.ID)
	}
	pkgHash := strings.TrimSpace(req.PackageSHA256)
	if pkgHash == "" && len(verifiedManifest.Files) > 0 {
		pkgHash = verifiedManifest.Files[0].SHA256
	}
	tags := req.Tags
	if len(tags) == 0 {
		tags = []string{"arcade", "open-source"}
	}

	entry := CatalogEntry{
		ID:            verifiedManifest.ID,
		Name:          verifiedManifest.Name,
		Version:       verifiedManifest.Version,
		License:       verifiedManifest.License,
		Verified:      true,
		OriginNodeURL: s.cfg.NodeURL,
		PackageURL:    pkgURL,
		PackageSHA256: pkgHash,
		PackageSize:   req.PackageSize,
		Tags:          tags,
		CreatedAt:     time.Now().UTC(),
		Manifest:      *verifiedManifest,
	}

	s.mu.Lock()
	s.games[entry.ID] = entry
	s.versions[entry.ID] = append(s.versions[entry.ID], entry)
	s.mu.Unlock()

	writeJSON(w, http.StatusCreated, entry)
}

func (s *Server) handleGetGame(w http.ResponseWriter, r *http.Request) {
	gameID := chi.URLParam(r, "id")
	s.mu.RLock()
	entry, ok := s.games[gameID]
	s.mu.RUnlock()
	if !ok {
		writeError(w, http.StatusNotFound, "not_found", fmt.Sprintf("game %q not found", gameID))
		return
	}
	writeJSON(w, http.StatusOK, entry)
}

func (s *Server) handleGetGameManifest(w http.ResponseWriter, r *http.Request) {
	gameID := chi.URLParam(r, "id")
	s.mu.RLock()
	entry, ok := s.games[gameID]
	s.mu.RUnlock()
	if !ok {
		writeError(w, http.StatusNotFound, "not_found", fmt.Sprintf("game %q not found", gameID))
		return
	}
	writeJSON(w, http.StatusOK, entry.Manifest)
}

func (s *Server) handleListGameVersions(w http.ResponseWriter, r *http.Request) {
	gameID := chi.URLParam(r, "id")
	s.mu.RLock()
	vers, ok := s.versions[gameID]
	s.mu.RUnlock()
	if !ok {
		writeError(w, http.StatusNotFound, "not_found", fmt.Sprintf("game %q not found", gameID))
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"game_id":  gameID,
		"versions": vers,
	})
}

func (s *Server) handleGetFederatedIndex(w http.ResponseWriter, r *http.Request) {
	s.mu.RLock()
	games := make([]federation.IndexedGame, 0, len(s.games))
	baseURL := strings.TrimRight(s.cfg.NodeURL, "/")
	for _, g := range s.games {
		games = append(games, federation.IndexedGame{
			ID:            g.ID,
			Version:       g.Version,
			ManifestURL:   fmt.Sprintf("%s/v1/games/%s/manifest.json", baseURL, g.ID),
			PackageURL:    g.PackageURL,
			PackageSHA256: g.PackageSHA256,
			License:       g.License,
			Tags:          g.Tags,
		})
	}
	s.mu.RUnlock()

	peerStates := s.crawler.ListPeers()
	peerURLs := make([]string, 0, len(peerStates))
	for _, p := range peerStates {
		peerURLs = append(peerURLs, p.URL)
	}

	idx := federation.FederatedIndex{
		Schema: 1,
		Node: federation.NodeDescriptor{
			Name:   s.cfg.NodeName,
			URL:    s.cfg.NodeURL,
			PubKey: s.nodePubKeyStr,
		},
		Updated: time.Now().UTC().Format(time.RFC3339),
		Games:   games,
		Peers:   peerURLs,
	}

	unsignedBytes, err := json.Marshal(idx)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "index_marshal_error", err.Error())
		return
	}
	sig, err := manifest.SignDocument(unsignedBytes, s.cfg.NodePrivateKey)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "index_sign_error", err.Error())
		return
	}
	idx.Signature = sig

	signedBytes, err := json.Marshal(idx)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "index_marshal_error", err.Error())
		return
	}
	etagHash := sha256.Sum256(signedBytes)
	etag := fmt.Sprintf(`"%x"`, etagHash[:8])

	if r.Header.Get("If-None-Match") == etag {
		w.WriteHeader(http.StatusNotModified)
		return
	}

	w.Header().Set("ETag", etag)
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(signedBytes)
}

func (s *Server) handleListFederationPeers(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"peers": s.crawler.ListPeers(),
	})
}

func (s *Server) handleGuestAuth(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Alias string `json:"alias"`
	}
	_ = json.NewDecoder(io.LimitReader(r.Body, 4096)).Decode(&req)

	var randBytes [8]byte
	_, _ = rand.Read(randBytes[:])
	userID := fmt.Sprintf("guest_%x", randBytes[:4])
	alias := strings.TrimSpace(req.Alias)
	if alias == "" {
		alias = fmt.Sprintf("PILOT-%X", randBytes[:2])
	}

	tokenPayload := fmt.Sprintf("%s:%s:%d", userID, alias, time.Now().UTC().Unix())
	sig := ed25519.Sign(s.cfg.NodePrivateKey, []byte(tokenPayload))
	token := base64.RawURLEncoding.EncodeToString([]byte(tokenPayload)) + "." + base64.RawURLEncoding.EncodeToString(sig)

	writeJSON(w, http.StatusOK, map[string]any{
		"token":      token,
		"user_id":    userID,
		"alias":      alias,
		"role":       "guest",
		"expires_at": time.Now().UTC().Add(24 * time.Hour).Format(time.RFC3339),
	})
}

func (s *Server) handleOIDCCallback(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Code     string `json:"code"`
		Provider string `json:"provider"`
	}
	if err := json.NewDecoder(io.LimitReader(r.Body, 8192)).Decode(&req); err != nil || strings.TrimSpace(req.Code) == "" {
		writeError(w, http.StatusBadRequest, "invalid_oidc_request", "code and provider are required")
		return
	}

	hash := sha256.Sum256([]byte(req.Provider + ":" + req.Code))
	userID := "author_" + hex.EncodeToString(hash[:6])
	alias := "author-" + hex.EncodeToString(hash[:3])
	tokenPayload := fmt.Sprintf("%s:%s:%d", userID, alias, time.Now().UTC().Unix())
	sig := ed25519.Sign(s.cfg.NodePrivateKey, []byte(tokenPayload))
	token := base64.RawURLEncoding.EncodeToString([]byte(tokenPayload)) + "." + base64.RawURLEncoding.EncodeToString(sig)

	writeJSON(w, http.StatusOK, map[string]any{
		"token":      token,
		"user_id":    userID,
		"alias":      alias,
		"role":       "author",
		"expires_at": time.Now().UTC().Add(24 * time.Hour).Format(time.RFC3339),
	})
}

func (s *Server) handleGetTurnCredentials(w http.ResponseWriter, r *http.Request) {
	peerID := strings.TrimSpace(r.URL.Query().Get("peer_id"))
	creds, err := s.turnGen.Generate(peerID, time.Now().UTC())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "turn_error", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, creds)
}

func (s *Server) handleListRooms(w http.ResponseWriter, r *http.Request) {
	gameID := strings.TrimSpace(r.URL.Query().Get("game_id"))
	rooms := s.signalHub.ListPublicRooms(gameID)
	writeJSON(w, http.StatusOK, map[string]any{
		"rooms": rooms,
	})
}

func (s *Server) handleCreateRoom(w http.ResponseWriter, r *http.Request) {
	var req struct {
		GameID     string `json:"game_id"`
		HostPeerID string `json:"host_peer_id"`
		MaxPlayers int    `json:"max_players"`
		Private    bool   `json:"private"`
	}
	if err := json.NewDecoder(io.LimitReader(r.Body, 8192)).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "invalid room creation payload")
		return
	}
	room, err := s.signalHub.CreateRoom(req.GameID, req.HostPeerID, req.MaxPlayers, req.Private)
	if err != nil {
		writeError(w, http.StatusBadRequest, "room_create_failed", err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, room)
}

func (s *Server) handleDeleteRoom(w http.ResponseWriter, r *http.Request) {
	roomCode := chi.URLParam(r, "id")
	if !s.signalHub.DeleteRoom(roomCode) {
		writeError(w, http.StatusNotFound, "not_found", "room not found")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) handleCreateReport(w http.ResponseWriter, r *http.Request) {
	var req struct {
		GameID     string `json:"game_id"`
		Version    string `json:"version"`
		ReporterID string `json:"reporter_id"`
		Reason     string `json:"reason"`
		Details    string `json:"details"`
	}
	if err := json.NewDecoder(io.LimitReader(r.Body, 16384)).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "invalid report payload")
		return
	}
	if strings.TrimSpace(req.GameID) == "" || strings.TrimSpace(req.Reason) == "" {
		writeError(w, http.StatusBadRequest, "missing_fields", "game_id and reason are required")
		return
	}

	var idBytes [6]byte
	_, _ = rand.Read(idBytes[:])
	rep := ReportEntry{
		ID:         fmt.Sprintf("rep_%x", idBytes[:]),
		GameID:     strings.TrimSpace(req.GameID),
		Version:    strings.TrimSpace(req.Version),
		ReporterID: strings.TrimSpace(req.ReporterID),
		Reason:     strings.TrimSpace(req.Reason),
		Details:    strings.TrimSpace(req.Details),
		Status:     "open",
		CreatedAt:  time.Now().UTC(),
	}

	s.mu.Lock()
	s.reports = append(s.reports, rep)
	s.mu.Unlock()

	writeJSON(w, http.StatusCreated, map[string]any{
		"id":         rep.ID,
		"status":     rep.Status,
		"created_at": rep.CreatedAt.Format(time.RFC3339),
	})
}

func (s *Server) seedDefaultCatalog() error {
	defaults := []struct {
		manifest manifest.GameManifest
		tags     []string
	}{
		{
			manifest: manifest.GameManifest{
				Schema:  1,
				ID:      "dev.openplay.pong",
				Name:    "CyberPong 2099",
				Version: "1.0.0",
				License: "MIT",
				Author: manifest.Author{
					Name:   "OpenPlay Core",
					PubKey: s.nodePubKeyStr,
				},
				ABI:   "host-abi/0",
				Entry: "game.wasm",
				Display: manifest.Display{
					Width:  480,
					Height: 320,
					Scale:  "fit",
				},
				Permissions: []string{"audio", "storage", "net.p2p"},
				Multiplayer: &manifest.Multiplayer{
					Mode:     "p2p-lockstep",
					Min:      1,
					Max:      2,
					Tickrate: 60,
				},
				Mods: &manifest.ModsConfig{
					Enabled: true,
					Lang:    "lua",
					Hooks:   []string{"on_init", "on_tick", "on_event"},
				},
				Files: []manifest.FileEntry{
					{
						Path:   "game.wasm",
						SHA256: "3a7bd3e2360a3d29eea436fcfb7e44c735d117c42d1c1835420b6b9942dd4f1b",
						Size:   18432,
					},
				},
			},
			tags: []string{"arcade", "retro", "p2p", "mods"},
		},
		{
			manifest: manifest.GameManifest{
				Schema:  1,
				ID:      "dev.openplay.arena",
				Name:    "Neon Grid Arena",
				Version: "1.0.0",
				License: "Apache-2.0",
				Author: manifest.Author{
					Name:   "OpenPlay Core",
					PubKey: s.nodePubKeyStr,
				},
				ABI:   "host-abi/0",
				Entry: "game.wasm",
				Display: manifest.Display{
					Width:  480,
					Height: 320,
					Scale:  "fit",
				},
				Permissions: []string{"audio", "storage", "net.p2p"},
				Multiplayer: &manifest.Multiplayer{
					Mode:     "p2p-rollback",
					Min:      1,
					Max:      4,
					Tickrate: 60,
				},
				Mods: &manifest.ModsConfig{
					Enabled: true,
					Lang:    "lua",
					Hooks:   []string{"on_init", "on_tick", "on_event"},
				},
				Files: []manifest.FileEntry{
					{
						Path:   "game.wasm",
						SHA256: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
						Size:   24576,
					},
				},
			},
			tags: []string{"arena", "multiplayer", "p2p", "cyberpunk"},
		},
	}

	baseURL := strings.TrimRight(s.cfg.NodeURL, "/")
	for _, item := range defaults {
		rawUnsigned, err := json.Marshal(item.manifest)
		if err != nil {
			return err
		}
		sig, err := manifest.SignDocument(rawUnsigned, s.cfg.NodePrivateKey)
		if err != nil {
			return err
		}
		item.manifest.Signature = sig

		entry := CatalogEntry{
			ID:            item.manifest.ID,
			Name:          item.manifest.Name,
			Version:       item.manifest.Version,
			License:       item.manifest.License,
			Verified:      true,
			OriginNodeURL: s.cfg.NodeURL,
			PackageURL:    fmt.Sprintf("%s/v1/games/%s/package.zip", baseURL, item.manifest.ID),
			PackageSHA256: item.manifest.Files[0].SHA256,
			PackageSize:   item.manifest.Files[0].Size,
			Tags:          item.tags,
			CreatedAt:     time.Now().UTC(),
			Manifest:      item.manifest,
		}
		s.games[entry.ID] = entry
		s.versions[entry.ID] = []CatalogEntry{entry}
	}
	return nil
}

func containsStringIgnoreCase(slice []string, target string) bool {
	for _, s := range slice {
		if strings.EqualFold(s, target) {
			return true
		}
	}
	return false
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeError(w http.ResponseWriter, status int, code string, message string) {
	writeJSON(w, status, map[string]string{
		"code":  code,
		"error": message,
	})
}
