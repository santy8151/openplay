package manifest

import (
	"crypto/ed25519"
	"encoding/base64"
	"encoding/json"
	"errors"
	"testing"
)

func deterministicTestKeyPair() (ed25519.PublicKey, ed25519.PrivateKey, string) {
	seed := make([]byte, ed25519.SeedSize)
	for i := range seed {
		seed[i] = byte(i + 1)
	}
	priv := ed25519.NewKeyFromSeed(seed)
	pub := priv.Public().(ed25519.PublicKey)
	pubStr := "ed25519:" + base64.StdEncoding.EncodeToString(pub)
	return pub, priv, pubStr
}

func buildTestManifestJSON(t *testing.T, priv ed25519.PrivateKey, pubStr string, license string, fileSize int64) []byte {
	t.Helper()
	m := GameManifest{
		Schema:  1,
		ID:      "dev.openplay.pong",
		Name:    "CyberPong 2099",
		Version: "1.0.0",
		License: license,
		Author: Author{
			Name:   "OpenPlay Core",
			PubKey: pubStr,
		},
		ABI:   "host-abi/0",
		Entry: "game.wasm",
		Display: Display{
			Width:  480,
			Height: 320,
			Scale:  "fit",
		},
		Permissions: []string{"audio", "storage", "net.p2p"},
		Multiplayer: &Multiplayer{
			Mode:     "p2p-lockstep",
			Min:      1,
			Max:      2,
			Tickrate: 60,
		},
		Mods: &ModsConfig{
			Enabled: true,
			Lang:    "lua",
			Hooks:   []string{"on_init", "on_tick", "on_event"},
		},
		Files: []FileEntry{
			{
				Path:   "game.wasm",
				SHA256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
				Size:   fileSize,
			},
		},
	}

	unsignedBytes, err := json.Marshal(m)
	if err != nil {
		t.Fatalf("marshal unsigned manifest: %v", err)
	}

	sig, err := SignDocument(unsignedBytes, priv)
	if err != nil {
		t.Fatalf("sign document: %v", err)
	}
	m.Signature = sig

	signedBytes, err := json.MarshalIndent(m, "", "  ")
	if err != nil {
		t.Fatalf("marshal signed manifest: %v", err)
	}
	return signedBytes
}

func TestJCSCanonicalizationPropertyOrderIndependence(t *testing.T) {
	docA := []byte(`{"b": 2, "a": "hello", "nested": {"z": true, "a": 1}, "signature": "ignore-me"}`)
	docB := []byte(`{
		"signature": "different-sig",
		"nested": { "a": 1, "z": true },
		"a": "hello",
		"b": 2
	}`)

	canonA, err := CanonicalizeJCS(docA, "signature")
	if err != nil {
		t.Fatalf("canonicalize docA: %v", err)
	}
	canonB, err := CanonicalizeJCS(docB, "signature")
	if err != nil {
		t.Fatalf("canonicalize docB: %v", err)
	}

	expected := `{"a":"hello","b":2,"nested":{"a":1,"z":true}}`
	if string(canonA) != expected {
		t.Fatalf("got %s, want %s", string(canonA), expected)
	}
	if string(canonA) != string(canonB) {
		t.Fatalf("canonical forms differ: %s vs %s", string(canonA), string(canonB))
	}
}

func TestVerifyAndParseManifestSuccessAndTamperRejection(t *testing.T) {
	_, priv, pubStr := deterministicTestKeyPair()
	signedJSON := buildTestManifestJSON(t, priv, pubStr, "MIT", 32768)

	parsed, err := VerifyAndParseManifest(signedJSON, 32768)
	if err != nil {
		t.Fatalf("expected valid manifest to pass verification, got: %v", err)
	}
	if parsed.ID != "dev.openplay.pong" {
		t.Fatalf("unexpected game id: %s", parsed.ID)
	}

	// Tamper with a single byte in the manifest name without re-signing
	var tampered map[string]any
	if err := json.Unmarshal(signedJSON, &tampered); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	tampered["name"] = "Tampered CyberPong"
	tamperedBytes, _ := json.Marshal(tampered)

	_, err = VerifyAndParseManifest(tamperedBytes, 32768)
	if !errors.Is(err, ErrSignatureMismatch) {
		t.Fatalf("expected ErrSignatureMismatch on tampered manifest, got: %v", err)
	}
}

func TestVerifyRejectsDisallowedLicenseAndOversizedPackage(t *testing.T) {
	_, priv, pubStr := deterministicTestKeyPair()

	proprietaryJSON := buildTestManifestJSON(t, priv, pubStr, "Proprietary-Commercial", 4096)
	_, err := VerifyAndParseManifest(proprietaryJSON, 4096)
	if !errors.Is(err, ErrDisallowedLicense) {
		t.Fatalf("expected ErrDisallowedLicense, got: %v", err)
	}

	oversizedJSON := buildTestManifestJSON(t, priv, pubStr, "Apache-2.0", MaxPackageSizeBytes+1024)
	_, err = VerifyAndParseManifest(oversizedJSON, MaxPackageSizeBytes+1024)
	if !errors.Is(err, ErrPackageTooLarge) {
		t.Fatalf("expected ErrPackageTooLarge, got: %v", err)
	}
}
