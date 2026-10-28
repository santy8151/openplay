package federation

import (
	"crypto/ed25519"
	"encoding/base64"
	"encoding/json"
	"errors"
	"testing"

	"github.com/santy8151/openplay/apps/node/internal/manifest"
)

func TestVerifyIndexPayloadAcceptsValidAndRejectsTampered(t *testing.T) {
	seed := make([]byte, ed25519.SeedSize)
	for i := range seed {
		seed[i] = byte(10 + i)
	}
	priv := ed25519.NewKeyFromSeed(seed)
	pub := priv.Public().(ed25519.PublicKey)
	pubStr := "ed25519:" + base64.StdEncoding.EncodeToString(pub)

	idx := FederatedIndex{
		Schema: 1,
		Node: NodeDescriptor{
			Name:   "Tokyo Grid Peer 02",
			URL:    "https://tokyo-grid.openplay.example",
			PubKey: pubStr,
		},
		Updated: "2026-10-27T23:00:00Z",
		Games: []IndexedGame{
			{
				ID:            "dev.openplay.pong",
				Version:       "1.0.0",
				ManifestURL:   "https://tokyo-grid.openplay.example/v1/games/dev.openplay.pong/manifest.json",
				PackageURL:    "https://tokyo-grid.openplay.example/v1/games/dev.openplay.pong/package.zip",
				PackageSHA256: "3a7bd3e2360a3d29eea436fcfb7e44c735d117c42d1c1835420b6b9942dd4f1b",
				License:       "MIT",
				Tags:          []string{"arcade", "p2p"},
			},
		},
		Peers: []string{"https://node.openplay.example"},
	}

	unsigned, err := json.Marshal(idx)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	sig, err := manifest.SignDocument(unsigned, priv)
	if err != nil {
		t.Fatalf("sign: %v", err)
	}
	idx.Signature = sig

	signedBytes, _ := json.Marshal(idx)
	verified, err := VerifyIndexPayload(signedBytes, pubStr)
	if err != nil {
		t.Fatalf("expected valid index to pass verification, got: %v", err)
	}
	if len(verified.Games) != 1 {
		t.Fatalf("expected 1 game, got %d", len(verified.Games))
	}

	// Tamper with peer index
	idx.Node.Name = "Malicious Impersonator"
	tamperedBytes, _ := json.Marshal(idx)
	_, err = VerifyIndexPayload(tamperedBytes, pubStr)
	if !errors.Is(err, ErrUntrustedPeerKey) {
		t.Fatalf("expected ErrUntrustedPeerKey on tampered peer index, got: %v", err)
	}
}
