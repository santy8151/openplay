#!/usr/bin/env node
/**
 * OpenPlay CLI (`openplay sign | verify | pack`)
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  deriveKeyPairFromSeedHex,
  sha256Hex,
  signGameManifest,
  verifyGameManifest
} from './crypto.js';
import type { UnsignedGameManifest } from './schema.js';

const DEFAULT_DEV_SEED = '9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60';

export function runCli(argv: string[]): number {
  const [cmd, targetPath, seedArg] = argv;
  if (!cmd || cmd === '--help' || cmd === '-h') {
    console.log('Usage: openplay <sign|verify|pack> <manifest.json> [seedHex]');
    return 0;
  }

  if (!targetPath) {
    console.error('Error: path to manifest.json is required');
    return 1;
  }

  const resolvedPath = path.resolve(targetPath);
  const raw = JSON.parse(fs.readFileSync(resolvedPath, 'utf8')) as Record<string, unknown>;

  if (cmd === 'sign' || cmd === 'pack') {
    const seedHex = seedArg ?? process.env.OPENPLAY_SIGNING_SEED_HEX ?? DEFAULT_DEV_SEED;
    const kp = deriveKeyPairFromSeedHex(seedHex);
    const author = (raw.author as Record<string, unknown>) ?? { name: 'OpenPlay Author' };
    author.pubkey = kp.formattedPubkey;
    raw.author = author;

    const signed = signGameManifest(raw as unknown as UnsignedGameManifest, seedHex);
    fs.writeFileSync(resolvedPath, JSON.stringify(signed, null, 2) + '\n', 'utf8');
    console.log(`[openplay] Signed manifest ${signed.id}@${signed.version} with ${kp.formattedPubkey}`);
    if (cmd === 'pack') {
      const bundlePath = resolvedPath.replace(/manifest\.json$/, `${signed.id}-${signed.version}.bundle.json`);
      const bundlePayload = JSON.stringify({ manifest: signed, packedAt: new Date().toISOString() });
      fs.writeFileSync(bundlePath, bundlePayload, 'utf8');
      console.log(`[openplay] Packed bundle (${sha256Hex(bundlePayload).slice(0, 16)}...) -> ${bundlePath}`);
    }
    return 0;
  }

  if (cmd === 'verify') {
    const result = verifyGameManifest(raw);
    if (!result.valid) {
      console.error('[openplay] Verification FAILED:', result.errors.join('; '));
      return 1;
    }
    console.log(`[openplay] Verified OK! Digest SHA-256: ${result.digestHex}`);
    return 0;
  }

  console.error(`Unknown command: ${cmd}`);
  return 1;
}
