/**
 * OpenPlay Cryptographic Signing & Verification (Ed25519 over sha256(JCS(payload_without_signature)))
 */

import { canonicalizeJcs, stripSignatureField } from './jcs.js';
import {
  base64ToBytes,
  bytesToBase64,
  bytesToHex,
  ed25519GetPublicKey,
  ed25519Sign,
  ed25519Verify,
  hexToBytes,
  sha256Bytes
} from './ed25519.js';
import {
  type FederatedIndex,
  type GameManifest,
  type UnsignedFederatedIndex,
  type UnsignedGameManifest,
  validateFederatedIndex,
  validateGameManifest
} from './schema.js';

export interface Ed25519KeyPair {
  seedHex: string;
  publicKeyBase64: string;
  formattedPubkey: string; // "ed25519:<base64>"
}

const textEncoder = new TextEncoder();

export function deriveKeyPairFromSeedHex(seedHex: string): Ed25519KeyPair {
  const seed = hexToBytes(seedHex);
  const pubBytes = ed25519GetPublicKey(seed);
  const publicKeyBase64 = bytesToBase64(pubBytes);
  return {
    seedHex: bytesToHex(seed),
    publicKeyBase64,
    formattedPubkey: `ed25519:${publicKeyBase64}`
  };
}

export function computeJcsSha256(payloadWithoutSignature: Record<string, unknown>): {
  canonicalJson: string;
  digestBytes: Uint8Array;
  digestHex: string;
} {
  const clean = stripSignatureField(payloadWithoutSignature);
  const canonicalJson = canonicalizeJcs(clean);
  const utf8Bytes = textEncoder.encode(canonicalJson);
  const digestBytes = sha256Bytes(utf8Bytes);
  return {
    canonicalJson,
    digestBytes,
    digestHex: bytesToHex(digestBytes)
  };
}

export function signPayloadObject<T extends Record<string, unknown>>(
  unsignedObj: T,
  seedHex: string
): T & { signature: string } {
  const seed = hexToBytes(seedHex);
  const { digestBytes } = computeJcsSha256(unsignedObj);
  const sigBytes = ed25519Sign(digestBytes, seed);
  return {
    ...unsignedObj,
    signature: bytesToBase64(sigBytes)
  };
}

export function verifySignedPayloadObject(
  signedObj: Record<string, unknown>,
  formattedPubkey: string
): { valid: boolean; reason?: string; canonicalJson?: string; digestHex?: string } {
  const signatureB64 = signedObj.signature;
  if (typeof signatureB64 !== 'string' || signatureB64.length === 0) {
    return { valid: false, reason: 'Missing signature field' };
  }
  if (!formattedPubkey.startsWith('ed25519:')) {
    return { valid: false, reason: 'Public key must start with "ed25519:"' };
  }

  try {
    const pubKeyBytes = base64ToBytes(formattedPubkey.slice('ed25519:'.length));
    const sigBytes = base64ToBytes(signatureB64);
    const { canonicalJson, digestBytes, digestHex } = computeJcsSha256(signedObj);
    const ok = ed25519Verify(sigBytes, digestBytes, pubKeyBytes);
    if (!ok) {
      return {
        valid: false,
        reason: 'Ed25519 signature verification failed (payload or signature tampered)',
        canonicalJson,
        digestHex
      };
    }
    return { valid: true, canonicalJson, digestHex };
  } catch (err) {
    return {
      valid: false,
      reason: err instanceof Error ? err.message : 'Cryptographic verification error'
    };
  }
}

export function signGameManifest(manifest: UnsignedGameManifest, seedHex: string): GameManifest {
  return signPayloadObject(manifest as unknown as Record<string, unknown>, seedHex) as unknown as GameManifest;
}

export function verifyGameManifest(manifest: unknown): {
  valid: boolean;
  errors: string[];
  canonicalJson?: string;
  digestHex?: string;
} {
  const schemaCheck = validateGameManifest(manifest, true);
  if (!schemaCheck.valid || !schemaCheck.value) {
    return { valid: false, errors: schemaCheck.errors };
  }
  const cryptoCheck = verifySignedPayloadObject(
    manifest as Record<string, unknown>,
    schemaCheck.value.author.pubkey
  );
  if (!cryptoCheck.valid) {
    return {
      valid: false,
      errors: [cryptoCheck.reason ?? 'Invalid Ed25519 signature'],
      canonicalJson: cryptoCheck.canonicalJson,
      digestHex: cryptoCheck.digestHex
    };
  }
  return {
    valid: true,
    errors: [],
    canonicalJson: cryptoCheck.canonicalJson,
    digestHex: cryptoCheck.digestHex
  };
}

export function signFederatedIndex(index: UnsignedFederatedIndex, seedHex: string): FederatedIndex {
  return signPayloadObject(index as unknown as Record<string, unknown>, seedHex) as unknown as FederatedIndex;
}

export function verifyFederatedIndex(index: unknown): {
  valid: boolean;
  errors: string[];
  canonicalJson?: string;
  digestHex?: string;
} {
  const schemaCheck = validateFederatedIndex(index, true);
  if (!schemaCheck.valid || !schemaCheck.value) {
    return { valid: false, errors: schemaCheck.errors };
  }
  const cryptoCheck = verifySignedPayloadObject(
    index as Record<string, unknown>,
    schemaCheck.value.node.pubkey
  );
  if (!cryptoCheck.valid) {
    return {
      valid: false,
      errors: [cryptoCheck.reason ?? 'Invalid node Ed25519 signature'],
      canonicalJson: cryptoCheck.canonicalJson,
      digestHex: cryptoCheck.digestHex
    };
  }
  return {
    valid: true,
    errors: [],
    canonicalJson: cryptoCheck.canonicalJson,
    digestHex: cryptoCheck.digestHex
  };
}

export function sha256Hex(data: Uint8Array | string): string {
  const bytes = typeof data === 'string' ? textEncoder.encode(data) : data;
  return bytesToHex(sha256Bytes(bytes));
}
