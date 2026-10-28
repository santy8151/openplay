import { describe, expect, it } from 'vitest';
import {
  canonicalizeJcs,
  computeJcsSha256,
  deriveKeyPairFromSeedHex,
  ed25519GetPublicKey,
  ed25519Sign,
  ed25519Verify,
  hexToBytes,
  bytesToHex,
  signFederatedIndex,
  signGameManifest,
  validateGameManifest,
  verifyFederatedIndex,
  verifyGameManifest,
  type UnsignedGameManifest,
  type UnsignedFederatedIndex
} from './index.js';
import sharedVectors from '../vectors/shared-vectors.json' with { type: 'json' };

describe('@openplay/manifest — JCS (RFC 8785) & Ed25519 Signatures', () => {
  it('matches RFC 8032 Test Vector 1 public key and signature', () => {
    const seed = hexToBytes('9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60');
    const pub = ed25519GetPublicKey(seed);
    expect(bytesToHex(pub)).toBe('d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a');

    // RFC 8032 empty message signature
    const sig = ed25519Sign(new Uint8Array(0), seed);
    expect(bytesToHex(sig)).toBe(
      'e5564300c360ac729086e2cc806e828a84877f1eb8e5d974d873e06522490155' +
      '5fb8821590a33bacc61e39701cf9b46bd25bf5f0595bbe24655141438e7a100b'
    );
    expect(ed25519Verify(sig, new Uint8Array(0), pub)).toBe(true);
  });

  it('produces identical JCS canonical output regardless of property insertion order (property-based)', () => {
    for (let trial = 0; trial < 25; trial++) {
      const objA = {
        z_last: [3, 2, 1, { b: true, a: null, c: -0 }],
        a_first: 'cyberpunk',
        m_mid: { x: 100, b: 0.5, a: 'neon' }
      };
      const objB = {
        m_mid: { a: 'neon', x: 100, b: 0.5 },
        a_first: 'cyberpunk',
        z_last: [3, 2, 1, { c: 0, a: null, b: true }]
      };
      const jcsA = canonicalizeJcs(objA);
      const jcsB = canonicalizeJcs(objB);
      expect(jcsA).toBe(jcsB);
      expect(jcsA).toBe('{"a_first":"cyberpunk","m_mid":{"a":"neon","b":0.5,"x":100},"z_last":[3,2,1,{"a":null,"b":true,"c":0}]}');
      // Idempotence: parsing and re-canonicalizing produces exact same string
      expect(canonicalizeJcs(JSON.parse(jcsA))).toBe(jcsA);
    }
  });

  it('signs and verifies shared manifest vector and rejects any 1-byte tamper', () => {
    const kp = deriveKeyPairFromSeedHex(sharedVectors.seedHex);
    expect(kp.formattedPubkey).toBe(sharedVectors.formattedPubkey);

    const unsigned = sharedVectors.manifestWithoutSignature as unknown as UnsignedGameManifest;
    const signed = signGameManifest(unsigned, sharedVectors.seedHex);

    const check = verifyGameManifest(signed);
    expect(check.valid).toBe(true);
    expect(check.errors).toEqual([]);

    // Tamper 1 byte in game version
    const tamperedVersion = { ...signed, version: '1.0.1' };
    expect(verifyGameManifest(tamperedVersion).valid).toBe(false);

    // Tamper 1 character in file sha256
    const tamperedHash = {
      ...signed,
      files: [{ ...signed.files[0]!, sha256: 'f' + signed.files[0]!.sha256.slice(1) }]
    };
    expect(verifyGameManifest(tamperedHash).valid).toBe(false);

    // Tamper 1 byte in signature
    const sigChars = signed.signature.split('');
    sigChars[10] = sigChars[10] === 'A' ? 'B' : 'A';
    const tamperedSig = { ...signed, signature: sigChars.join('') };
    expect(verifyGameManifest(tamperedSig).valid).toBe(false);
  });

  it('rejects non-SPDX or proprietary licenses and oversized packages (>20MB)', () => {
    const unsigned = sharedVectors.manifestWithoutSignature as unknown as UnsignedGameManifest;
    const badLicense = { ...unsigned, license: 'PROPRIETARY-CLOSED' as unknown as 'MIT', signature: 'abc' };
    const res1 = validateGameManifest(badLicense);
    expect(res1.valid).toBe(false);
    expect(res1.errors.some((e) => e.includes('SPDX'))).toBe(true);

    const oversized = {
      ...unsigned,
      files: [{ path: 'game.wasm', sha256: unsigned.files[0]!.sha256, size: 25 * 1024 * 1024 }],
      signature: 'abc'
    };
    const res2 = validateGameManifest(oversized);
    expect(res2.valid).toBe(false);
    expect(res2.errors.some((e) => e.includes('20 MB'))).toBe(true);
  });

  it('signs and verifies federated node index.json and rejects tampered peer index', () => {
    const kp = deriveKeyPairFromSeedHex(sharedVectors.seedHex);
    const unsignedIndex: UnsignedFederatedIndex = {
      schema: 1,
      node: {
        name: 'Neo-Bogota Core 01',
        url: 'https://node-a.openplay.example',
        pubkey: kp.formattedPubkey
      },
      updated: '2026-10-27T23:00:00Z',
      games: [
        {
          id: 'dev.openplay.pong',
          version: '1.0.0',
          manifest_url: 'https://node-a.openplay.example/v1/games/dev.openplay.pong/manifest.json',
          package_url: 'https://node-a.openplay.example/v1/games/dev.openplay.pong/package.zip',
          package_sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          license: 'MIT',
          tags: ['arcade', 'p2p']
        }
      ],
      peers: ['https://node-b.openplay.example']
    };

    const signedIndex = signFederatedIndex(unsignedIndex, sharedVectors.seedHex);
    expect(verifyFederatedIndex(signedIndex).valid).toBe(true);

    const tamperedIndex = { ...signedIndex, peers: ['https://malicious.example'] };
    expect(verifyFederatedIndex(tamperedIndex).valid).toBe(false);
  });
});
