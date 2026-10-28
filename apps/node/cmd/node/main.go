package main

import (
	"context"
	"crypto/ed25519"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/santy8151/openplay/apps/node/internal/api"
)

func main() {
	addr := envOrDefault("OPENPLAY_ADDR", ":8080")
	nodeName := envOrDefault("OPENPLAY_NODE_NAME", "Neo-Bogota Node 01")
	nodeURL := envOrDefault("OPENPLAY_NODE_URL", "http://localhost:8080")
	turnSecret := envOrDefault("OPENPLAY_TURN_SECRET", "openplay-coturn-dev-hmac-secret")
	turnURIs := splitCSV(envOrDefault("OPENPLAY_TURN_URIS", "turn:localhost:3478?transport=udp,turn:localhost:3478?transport=tcp"))
	seedPeers := splitCSV(os.Getenv("OPENPLAY_PEERS"))

	privKey := loadOrDeriveNodeKey(os.Getenv("OPENPLAY_NODE_PRIVKEY"), nodeURL)

	srv, err := api.NewServer(api.Config{
		NodeName:       nodeName,
		NodeURL:        nodeURL,
		NodePrivateKey: privKey,
		TurnSecret:     turnSecret,
		TurnURIs:       turnURIs,
		SeedPeers:      seedPeers,
	})
	if err != nil {
		log.Fatalf("initialize openplay node server: %v", err)
	}

	httpServer := &http.Server{
		Addr:              addr,
		Handler:           srv.Router(),
		ReadHeaderTimeout: 10 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       120 * time.Second,
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	go func() {
		log.Printf("[openplay-node] %s listening on %s (%s)", nodeName, addr, nodeURL)
		if err := httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("http server error: %v", err)
		}
	}()

	<-ctx.Done()
	log.Printf("[openplay-node] shutting down gracefully...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := httpServer.Shutdown(shutdownCtx); err != nil {
		log.Printf("[openplay-node] shutdown error: %v", err)
	}
}

func envOrDefault(key, fallback string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return fallback
}

func splitCSV(raw string) []string {
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if trimmed := strings.TrimSpace(p); trimmed != "" {
			out = append(out, trimmed)
		}
	}
	return out
}

func loadOrDeriveNodeKey(rawSeedB64 string, nodeURL string) ed25519.PrivateKey {
	if trimmed := strings.TrimSpace(rawSeedB64); trimmed != "" {
		if decoded, err := base64.StdEncoding.DecodeString(trimmed); err == nil {
			if len(decoded) == ed25519.SeedSize {
				return ed25519.NewKeyFromSeed(decoded)
			}
			if len(decoded) == ed25519.PrivateKeySize {
				return ed25519.PrivateKey(decoded)
			}
		}
	}
	sum := sha256.Sum256([]byte("openplay-node-seed:" + nodeURL))
	return ed25519.NewKeyFromSeed(sum[:])
}
