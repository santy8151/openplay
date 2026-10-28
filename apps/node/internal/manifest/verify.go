package manifest

import (
	"bytes"
	"crypto/ed25519"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"sort"
	"strconv"
	"strings"
)

// MaxPackageSizeBytes enforces the hard 20 MiB package ceiling for OpenPlay node packages.
const MaxPackageSizeBytes int64 = 20 * 1024 * 1024

var (
	ErrUnsupportedSchema   = errors.New("unsupported manifest schema version")
	ErrUnsupportedABI      = errors.New("unsupported host ABI version")
	ErrDisallowedLicense   = errors.New("SPDX license is not in the OpenPlay open-source allowlist")
	ErrPackageTooLarge     = errors.New("package size exceeds 20 MiB limit")
	ErrInvalidAuthorKey    = errors.New("invalid author ed25519 public key")
	ErrMissingSignature    = errors.New("missing manifest signature")
	ErrSignatureMismatch   = errors.New("ed25519 signature verification failed")
	ErrInvalidFileChecksum = errors.New("invalid file entry or sha256 digest")
)

// AllowedSPDXLicenses lists open-source and permissive/copyleft SPDX identifiers accepted by OpenPlay nodes.
var AllowedSPDXLicenses = map[string]bool{
	"MIT":          true,
	"Apache-2.0":   true,
	"BSD-2-Clause": true,
	"BSD-3-Clause": true,
	"ISC":          true,
	"MPL-2.0":      true,
	"GPL-3.0-only": true,
	"GPL-3.0-or-later": true,
	"LGPL-3.0-only": true,
	"Zlib":         true,
	"CC0-1.0":      true,
	"Unlicense":    true,
}

// Author describes the publisher identity embedded in a game manifest.
type Author struct {
	Name   string `json:"name"`
	PubKey string `json:"pubkey"`
}

// Display describes the virtual framebuffer resolution and scaling mode.
type Display struct {
	Width  int    `json:"width"`
	Height int    `json:"height"`
	Scale  string `json:"scale"`
}

// Multiplayer describes the deterministic P2P configuration for the game.
type Multiplayer struct {
	Mode     string `json:"mode"`
	Min      int    `json:"min"`
	Max      int    `json:"max"`
	Tickrate int    `json:"tickrate"`
}

// ModsConfig describes opt-in sandboxed modding hooks.
type ModsConfig struct {
	Enabled bool     `json:"enabled"`
	Lang    string   `json:"lang"`
	Hooks   []string `json:"hooks"`
}

// FileEntry describes a file inside the game bundle.
type FileEntry struct {
	Path   string `json:"path"`
	SHA256 string `json:"sha256"`
	Size   int64  `json:"size"`
}

// GameManifest represents the canonical OpenPlay v1 game manifest.
type GameManifest struct {
	Schema      int          `json:"schema"`
	ID          string       `json:"id"`
	Name        string       `json:"name"`
	Version     string       `json:"version"`
	License     string       `json:"license"`
	Author      Author       `json:"author"`
	ABI         string       `json:"abi"`
	Entry       string       `json:"entry"`
	Display     Display      `json:"display"`
	Permissions []string     `json:"permissions"`
	Multiplayer *Multiplayer `json:"multiplayer,omitempty"`
	Mods        *ModsConfig  `json:"mods,omitempty"`
	Files       []FileEntry  `json:"files"`
	Signature   string       `json:"signature"`
}

// CanonicalizeJCS serializes an arbitrary JSON document according to RFC 8785
// (JSON Canonicalization Scheme), optionally stripping a top-level field such as "signature".
func CanonicalizeJCS(rawJSON []byte, omitTopLevelField string) ([]byte, error) {
	dec := json.NewDecoder(bytes.NewReader(rawJSON))
	dec.UseNumber()

	var root any
	if err := dec.Decode(&root); err != nil {
		return nil, fmt.Errorf("decode json for JCS canonicalization: %w", err)
	}

	if omitTopLevelField != "" {
		if obj, ok := root.(map[string]any); ok {
			delete(obj, omitTopLevelField)
		}
	}

	var buf bytes.Buffer
	if err := writeCanonicalValue(&buf, root); err != nil {
		return nil, fmt.Errorf("encode JCS canonical value: %w", err)
	}
	return buf.Bytes(), nil
}

func writeCanonicalValue(buf *bytes.Buffer, v any) error {
	switch val := v.(type) {
	case nil:
		buf.WriteString("null")
	case bool:
		if val {
			buf.WriteString("true")
		} else {
			buf.WriteString("false")
		}
	case json.Number:
		numStr, err := canonicalizeNumber(val.String())
		if err != nil {
			return fmt.Errorf("canonicalize json number %q: %w", val.String(), err)
		}
		buf.WriteString(numStr)
	case float64:
		numStr, err := canonicalizeFloat(val)
		if err != nil {
			return fmt.Errorf("canonicalize float: %w", err)
		}
		buf.WriteString(numStr)
	case string:
		encoded, err := marshalCanonicalString(val)
		if err != nil {
			return fmt.Errorf("canonicalize string: %w", err)
		}
		buf.Write(encoded)
	case []any:
		buf.WriteByte('[')
		for i, elem := range val {
			if i > 0 {
				buf.WriteByte(',')
			}
			if err := writeCanonicalValue(buf, elem); err != nil {
				return err
			}
		}
		buf.WriteByte(']')
	case map[string]any:
		keys := make([]string, 0, len(val))
		for k := range val {
			keys = append(keys, k)
		}
		// RFC 8785 Section 3.2.3 sorts object properties by UTF-16 code units.
		sort.Slice(keys, func(i, j int) bool {
			return compareUTF16(keys[i], keys[j]) < 0
		})
		buf.WriteByte('{')
		for i, k := range keys {
			if i > 0 {
				buf.WriteByte(',')
			}
			keyBytes, err := marshalCanonicalString(k)
			if err != nil {
				return fmt.Errorf("canonicalize key %q: %w", k, err)
			}
			buf.Write(keyBytes)
			buf.WriteByte(':')
			if err := writeCanonicalValue(buf, val[k]); err != nil {
				return err
			}
		}
		buf.WriteByte('}')
	default:
		return fmt.Errorf("unsupported JCS type %T", v)
	}
	return nil
}

func canonicalizeNumber(raw string) (string, error) {
	if i, err := strconv.ParseInt(raw, 10, 64); err == nil {
		return strconv.FormatInt(i, 10), nil
	}
	f, err := strconv.ParseFloat(raw, 64)
	if err != nil {
		return "", fmt.Errorf("parse float %q: %w", raw, err)
	}
	return canonicalizeFloat(f)
}

func canonicalizeFloat(f float64) (string, error) {
	if math.IsNaN(f) || math.IsInf(f, 0) {
		return "", errors.New("NaN or Infinity is not permitted in JCS")
	}
	if f == 0 {
		return "0", nil
	}
	return strconv.FormatFloat(f, 'g', -1, 64), nil
}

func marshalCanonicalString(s string) ([]byte, error) {
	var buf bytes.Buffer
	enc := json.NewEncoder(&buf)
	enc.SetEscapeHTML(false)
	if err := enc.Encode(s); err != nil {
		return nil, err
	}
	// Strip trailing newline added by json.Encoder.Encode
	out := bytes.TrimSuffix(buf.Bytes(), []byte("\n"))
	return out, nil
}

// compareUTF16 compares two UTF-8 strings by their UTF-16 code unit sequence per RFC 8785.
func compareUTF16(a, b string) int {
	ra := []rune(a)
	rb := []rune(b)
	ua := runesToUTF16Units(ra)
	ub := runesToUTF16Units(rb)
	minLen := len(ua)
	if len(ub) < minLen {
		minLen = len(ub)
	}
	for i := 0; i < minLen; i++ {
		if ua[i] < ub[i] {
			return -1
		}
		if ua[i] > ub[i] {
			return 1
		}
	}
	if len(ua) < len(ub) {
		return -1
	}
	if len(ua) > len(ub) {
		return 1
	}
	return 0
}

func runesToUTF16Units(runes []rune) []uint16 {
	units := make([]uint16, 0, len(runes))
	for _, r := range runes {
		if r <= 0xFFFF {
			units = append(units, uint16(r))
		} else {
			r -= 0x10000
			high := uint16(0xD800 + ((r >> 10) & 0x3FF))
			low := uint16(0xDC00 + (r & 0x3FF))
			units = append(units, high, low)
		}
	}
	return units
}

// ParseEd25519PubKey extracts a 32-byte Ed25519 public key from "ed25519:<base64>" or raw base64.
func ParseEd25519PubKey(encoded string) (ed25519.PublicKey, error) {
	trimmed := strings.TrimSpace(encoded)
	trimmed = strings.TrimPrefix(trimmed, "ed25519:")
	raw, err := base64.StdEncoding.DecodeString(trimmed)
	if err != nil {
		return nil, fmt.Errorf("%w: base64 decode: %v", ErrInvalidAuthorKey, err)
	}
	if len(raw) != ed25519.PublicKeySize {
		return nil, fmt.Errorf("%w: expected %d bytes, got %d", ErrInvalidAuthorKey, ed25519.PublicKeySize, len(raw))
	}
	return ed25519.PublicKey(raw), nil
}

// DigestJCSWithoutSignature computes sha256(JCS(rawJSON without "signature")).
func DigestJCSWithoutSignature(rawJSON []byte) ([32]byte, []byte, error) {
	canonical, err := CanonicalizeJCS(rawJSON, "signature")
	if err != nil {
		return [32]byte{}, nil, fmt.Errorf("canonicalize manifest: %w", err)
	}
	sum := sha256.Sum256(canonical)
	return sum, canonical, nil
}

// SignDocument computes base64(Ed25519.Sign(privKey, sha256(JCS(doc_without_signature)))).
func SignDocument(rawJSON []byte, privKey ed25519.PrivateKey) (string, error) {
	digest, _, err := DigestJCSWithoutSignature(rawJSON)
	if err != nil {
		return "", fmt.Errorf("digest document for signing: %w", err)
	}
	sig := ed25519.Sign(privKey, digest[:])
	return base64.StdEncoding.EncodeToString(sig), nil
}

// VerifySignedDocument verifies an Ed25519 signature over sha256(JCS(doc_without_signature)).
func VerifySignedDocument(rawJSON []byte, pubKeyStr string, signatureB64 string) error {
	if strings.TrimSpace(signatureB64) == "" {
		return ErrMissingSignature
	}
	pubKey, err := ParseEd25519PubKey(pubKeyStr)
	if err != nil {
		return fmt.Errorf("parse public key: %w", err)
	}
	sigBytes, err := base64.StdEncoding.DecodeString(strings.TrimSpace(signatureB64))
	if err != nil {
		return fmt.Errorf("%w: invalid base64 signature: %v", ErrSignatureMismatch, err)
	}
	if len(sigBytes) != ed25519.SignatureSize {
		return fmt.Errorf("%w: invalid signature length %d", ErrSignatureMismatch, len(sigBytes))
	}
	digest, _, err := DigestJCSWithoutSignature(rawJSON)
	if err != nil {
		return fmt.Errorf("compute JCS digest: %w", err)
	}
	if !ed25519.Verify(pubKey, digest[:], sigBytes) {
		return ErrSignatureMismatch
	}
	return nil
}

// VerifyAndParseManifest validates schema, SPDX license allowlist, file sizes (<=20MB total),
// SHA-256 hex format, and cryptographic Ed25519 signature over sha256(JCS(manifest_without_signature)).
func VerifyAndParseManifest(rawJSON []byte, declaredPackageSize int64) (*GameManifest, error) {
	if declaredPackageSize < 0 || declaredPackageSize > MaxPackageSizeBytes {
		return nil, fmt.Errorf("%w: package is %d bytes (max %d)", ErrPackageTooLarge, declaredPackageSize, MaxPackageSizeBytes)
	}

	var m GameManifest
	if err := json.Unmarshal(rawJSON, &m); err != nil {
		return nil, fmt.Errorf("unmarshal manifest json: %w", err)
	}

	if m.Schema != 1 {
		return nil, fmt.Errorf("%w: got %d, want 1", ErrUnsupportedSchema, m.Schema)
	}
	if m.ABI != "host-abi/0" {
		return nil, fmt.Errorf("%w: got %q, want \"host-abi/0\"", ErrUnsupportedABI, m.ABI)
	}
	if !AllowedSPDXLicenses[m.License] {
		return nil, fmt.Errorf("%w: %q", ErrDisallowedLicense, m.License)
	}
	if strings.TrimSpace(m.ID) == "" || strings.TrimSpace(m.Name) == "" || strings.TrimSpace(m.Version) == "" {
		return nil, errors.New("manifest id, name, and version are required")
	}
	if len(m.Files) == 0 {
		return nil, fmt.Errorf("%w: manifest must declare at least one file", ErrInvalidFileChecksum)
	}

	var totalSize int64
	for _, f := range m.Files {
		if f.Size <= 0 {
			return nil, fmt.Errorf("%w: file %q has non-positive size %d", ErrInvalidFileChecksum, f.Path, f.Size)
		}
		totalSize += f.Size
		if totalSize > MaxPackageSizeBytes {
			return nil, fmt.Errorf("%w: cumulative file size %d exceeds %d", ErrPackageTooLarge, totalSize, MaxPackageSizeBytes)
		}
		decodedHash, err := hex.DecodeString(f.SHA256)
		if err != nil || len(decodedHash) != sha256.Size {
			return nil, fmt.Errorf("%w: file %q has invalid sha256 hex %q", ErrInvalidFileChecksum, f.Path, f.SHA256)
		}
	}

	if err := VerifySignedDocument(rawJSON, m.Author.PubKey, m.Signature); err != nil {
		return nil, fmt.Errorf("verify manifest signature: %w", err)
	}

	return &m, nil
}
