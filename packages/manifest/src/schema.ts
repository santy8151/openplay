/**
 * OpenPlay Manifest & Federated Index Schemas (JSON Schema 2020-12) and runtime validators.
 */

export const ALLOWED_SPDX_LICENSES = [
  'MIT',
  'Apache-2.0',
  'GPL-3.0-only',
  'GPL-3.0-or-later',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'MPL-2.0',
  'ISC',
  'Zlib',
  'CC0-1.0'
] as const;

export type AllowedSpdxLicense = (typeof ALLOWED_SPDX_LICENSES)[number];

export type GamePermission = 'audio' | 'storage' | 'net.p2p';
export type MultiplayerMode = 'single' | 'p2p-lockstep' | 'p2p-state' | 'relay';
export type ModHook = 'on_init' | 'on_tick' | 'on_event';
export type DisplayScale = 'fit' | 'pixel' | 'stretch';

export interface GameAuthor {
  name: string;
  pubkey: string; // "ed25519:<base64>"
}

export interface GameDisplay {
  width: number;
  height: number;
  scale: DisplayScale;
}

export interface GameMultiplayer {
  mode: MultiplayerMode;
  min: number;
  max: number;
  tickrate: number;
}

export interface GameModsConfig {
  enabled: boolean;
  lang: 'lua';
  hooks: ModHook[];
}

export interface GameFileEntry {
  path: string;
  sha256: string;
  size: number;
}

export interface GameManifest {
  schema: 1;
  id: string;
  name: string;
  version: string;
  license: AllowedSpdxLicense;
  author: GameAuthor;
  abi: 'host-abi/0';
  entry: string;
  display: GameDisplay;
  permissions: GamePermission[];
  multiplayer: GameMultiplayer;
  mods: GameModsConfig;
  files: GameFileEntry[];
  signature: string;
}

export type UnsignedGameManifest = Omit<GameManifest, 'signature'>;

export interface FederatedGameEntry {
  id: string;
  version: string;
  manifest_url: string;
  package_url: string;
  package_sha256: string;
  license: AllowedSpdxLicense;
  tags: string[];
}

export interface FederatedNodeInfo {
  name: string;
  url: string;
  pubkey: string; // "ed25519:<base64>"
}

export interface FederatedIndex {
  schema: 1;
  node: FederatedNodeInfo;
  updated: string; // RFC 3339
  games: FederatedGameEntry[];
  peers: string[];
  signature: string;
}

export type UnsignedFederatedIndex = Omit<FederatedIndex, 'signature'>;

export const GAME_MANIFEST_JSON_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://openplay.dev/schemas/manifest.v1.json',
  title: 'OpenPlay Game Manifest v1',
  type: 'object',
  required: [
    'schema',
    'id',
    'name',
    'version',
    'license',
    'author',
    'abi',
    'entry',
    'display',
    'permissions',
    'multiplayer',
    'mods',
    'files',
    'signature'
  ],
  additionalProperties: false
} as const;

export const FEDERATED_INDEX_JSON_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://openplay.dev/schemas/index.v1.json',
  title: 'OpenPlay Federated Node Index v1',
  type: 'object',
  required: ['schema', 'node', 'updated', 'games', 'peers', 'signature'],
  additionalProperties: false
} as const;

export interface ValidationResult<T> {
  valid: boolean;
  errors: string[];
  value?: T;
}

const SEMVER_REGEX = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;
const GAME_ID_REGEX = /^[a-z0-9]+(\.[a-z0-9-]+){2,}$/;
const SHA256_REGEX = /^[a-f0-9]{64}$/;
const PUBKEY_REGEX = /^ed25519:[A-Za-z0-9+/=]{43,44}$/;
const MAX_PACKAGE_BYTES = 20 * 1024 * 1024; // 20 MB

export function validateGameManifest(input: unknown, requireSignature = true): ValidationResult<GameManifest> {
  const errors: string[] = [];
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { valid: false, errors: ['Manifest must be a non-null JSON object'] };
  }

  const obj = input as Record<string, unknown>;

  if (obj.schema !== 1) {
    errors.push('schema must be 1');
  }
  if (typeof obj.id !== 'string' || !GAME_ID_REGEX.test(obj.id)) {
    errors.push('id must be a reverse-domain identifier (e.g., "dev.example.pong")');
  }
  if (typeof obj.name !== 'string' || obj.name.trim().length === 0 || obj.name.length > 80) {
    errors.push('name must be a non-empty string up to 80 characters');
  }
  if (typeof obj.version !== 'string' || !SEMVER_REGEX.test(obj.version)) {
    errors.push('version must be valid semver (e.g., "1.0.0")');
  }
  if (
    typeof obj.license !== 'string' ||
    !(ALLOWED_SPDX_LICENSES as readonly string[]).includes(obj.license)
  ) {
    errors.push(`license must be an approved open-source SPDX identifier (${ALLOWED_SPDX_LICENSES.join(', ')})`);
  }

  // Author
  if (typeof obj.author !== 'object' || obj.author === null) {
    errors.push('author must be an object');
  } else {
    const author = obj.author as Record<string, unknown>;
    if (typeof author.name !== 'string' || author.name.trim().length === 0) {
      errors.push('author.name must be a non-empty string');
    }
    if (typeof author.pubkey !== 'string' || !PUBKEY_REGEX.test(author.pubkey)) {
      errors.push('author.pubkey must match "ed25519:<base64>"');
    }
  }

  if (obj.abi !== 'host-abi/0') {
    errors.push('abi must be "host-abi/0"');
  }
  if (typeof obj.entry !== 'string' || !obj.entry.endsWith('.wasm')) {
    errors.push('entry must be a .wasm filename');
  }

  // Display
  if (typeof obj.display !== 'object' || obj.display === null) {
    errors.push('display must be an object');
  } else {
    const display = obj.display as Record<string, unknown>;
    if (typeof display.width !== 'number' || display.width < 64 || display.width > 1920) {
      errors.push('display.width must be between 64 and 1920');
    }
    if (typeof display.height !== 'number' || display.height < 64 || display.height > 1080) {
      errors.push('display.height must be between 64 and 1080');
    }
    if (display.scale !== 'fit' && display.scale !== 'pixel' && display.scale !== 'stretch') {
      errors.push('display.scale must be "fit", "pixel", or "stretch"');
    }
  }

  // Permissions
  const allowedPerms = new Set(['audio', 'storage', 'net.p2p']);
  if (!Array.isArray(obj.permissions) || obj.permissions.some((p) => typeof p !== 'string' || !allowedPerms.has(p))) {
    errors.push('permissions must be an array of ["audio" | "storage" | "net.p2p"]');
  }

  // Multiplayer
  if (typeof obj.multiplayer !== 'object' || obj.multiplayer === null) {
    errors.push('multiplayer must be an object');
  } else {
    const mp = obj.multiplayer as Record<string, unknown>;
    const validModes = new Set(['single', 'p2p-lockstep', 'p2p-state', 'relay']);
    if (typeof mp.mode !== 'string' || !validModes.has(mp.mode)) {
      errors.push('multiplayer.mode must be single | p2p-lockstep | p2p-state | relay');
    }
    if (typeof mp.min !== 'number' || mp.min < 1 || mp.min > 8) {
      errors.push('multiplayer.min must be between 1 and 8');
    }
    if (typeof mp.max !== 'number' || typeof mp.min !== 'number' || mp.max < mp.min || mp.max > 8) {
      errors.push('multiplayer.max must be >= min and <= 8');
    }
    if (typeof mp.tickrate !== 'number' || ![30, 60, 120].includes(mp.tickrate)) {
      errors.push('multiplayer.tickrate must be 30, 60, or 120');
    }
  }

  // Mods
  if (typeof obj.mods !== 'object' || obj.mods === null) {
    errors.push('mods must be an object');
  } else {
    const mods = obj.mods as Record<string, unknown>;
    if (typeof mods.enabled !== 'boolean') {
      errors.push('mods.enabled must be boolean');
    }
    if (mods.lang !== 'lua') {
      errors.push('mods.lang must be "lua"');
    }
    const validHooks = new Set(['on_init', 'on_tick', 'on_event']);
    if (!Array.isArray(mods.hooks) || mods.hooks.some((h) => typeof h !== 'string' || !validHooks.has(h))) {
      errors.push('mods.hooks must contain valid hook names (on_init, on_tick, on_event)');
    }
  }

  // Files
  if (!Array.isArray(obj.files) || obj.files.length === 0) {
    errors.push('files must be a non-empty array');
  } else {
    let totalSize = 0;
    for (const f of obj.files) {
      if (typeof f !== 'object' || f === null) {
        errors.push('each file entry must be an object');
        continue;
      }
      const file = f as Record<string, unknown>;
      if (typeof file.path !== 'string' || file.path.includes('..') || file.path.startsWith('/')) {
        errors.push('file.path must be a safe relative path');
      }
      if (typeof file.sha256 !== 'string' || !SHA256_REGEX.test(file.sha256)) {
        errors.push('file.sha256 must be a 64-character lowercase hex string');
      }
      if (typeof file.size !== 'number' || file.size <= 0) {
        errors.push('file.size must be a positive integer');
      } else {
        totalSize += file.size;
      }
    }
    if (totalSize > MAX_PACKAGE_BYTES) {
      errors.push(`total package size (${totalSize} bytes) exceeds 20 MB limit`);
    }
  }

  if (requireSignature) {
    if (typeof obj.signature !== 'string' || obj.signature.trim().length === 0) {
      errors.push('signature must be a non-empty base64 string');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    value: errors.length === 0 ? (obj as unknown as GameManifest) : undefined
  };
}

export function validateFederatedIndex(input: unknown, requireSignature = true): ValidationResult<FederatedIndex> {
  const errors: string[] = [];
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { valid: false, errors: ['Index must be a non-null JSON object'] };
  }

  const obj = input as Record<string, unknown>;
  if (obj.schema !== 1) {
    errors.push('schema must be 1');
  }
  if (typeof obj.node !== 'object' || obj.node === null) {
    errors.push('node must be an object');
  } else {
    const node = obj.node as Record<string, unknown>;
    if (typeof node.name !== 'string' || node.name.trim().length === 0) {
      errors.push('node.name must be non-empty');
    }
    if (typeof node.url !== 'string' || !node.url.startsWith('http')) {
      errors.push('node.url must be a valid HTTP(S) URL');
    }
    if (typeof node.pubkey !== 'string' || !PUBKEY_REGEX.test(node.pubkey)) {
      errors.push('node.pubkey must match "ed25519:<base64>"');
    }
  }

  if (typeof obj.updated !== 'string' || Number.isNaN(Date.parse(obj.updated))) {
    errors.push('updated must be a valid RFC 3339 timestamp');
  }

  if (!Array.isArray(obj.games)) {
    errors.push('games must be an array');
  }
  if (!Array.isArray(obj.peers)) {
    errors.push('peers must be an array');
  }
  if (requireSignature && (typeof obj.signature !== 'string' || obj.signature.trim().length === 0)) {
    errors.push('signature must be a non-empty base64 string');
  }

  return {
    valid: errors.length === 0,
    errors,
    value: errors.length === 0 ? (obj as unknown as FederatedIndex) : undefined
  };
}
