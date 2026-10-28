/**
 * Seed Catalog of Signed Open-Source Wasm Cartridges & Federated Nodes
 */

import {
  deriveKeyPairFromSeedHex,
  sha256Hex,
  signFederatedIndex,
  signGameManifest,
  type FederatedIndex,
  type GameManifest
} from '@openplay/manifest';
import { buildCartridgeWasmBytes, type BuiltinGameId } from '@openplay/abi';

const NODE_A_SEED = '9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60';
const NODE_B_SEED = '4ccd089b28ff96da9db6c346ec114e0f5b8a319f35aba624da8cf6ed4fb8a6fb';
const NODE_C_SEED = 'c5aa8df43f9f837bedb7442f31dcb7b166d38535076f094b85ce3a2e0b4458f7';

export interface CatalogGameItem {
  id: BuiltinGameId;
  manifest: GameManifest;
  wasmBytes: Uint8Array;
  tagline: string;
  description: string;
  tags: string[];
  nodeOrigin: string;
  nodeName: string;
  installed: boolean;
  changelog: Array<{ version: string; date: string; notes: string }>;
  controlsHint: string;
  accentColor: 'cyan' | 'magenta' | 'yellow';
}

export interface FederatedNodeRecord {
  id: string;
  name: string;
  url: string;
  region: string;
  pubkey: string;
  fingerprint: string;
  etag: string;
  status: 'SYNCHRONIZED' | 'REJECTED_INVALID_SIG' | 'OFFLINE';
  lastSync: string;
  trusted: boolean;
  index: FederatedIndex;
}

export function buildInitialCatalogAndFederation(): {
  games: CatalogGameItem[];
  nodes: FederatedNodeRecord[];
} {
  const kpA = deriveKeyPairFromSeedHex(NODE_A_SEED);
  const kpB = deriveKeyPairFromSeedHex(NODE_B_SEED);
  const kpC = deriveKeyPairFromSeedHex(NODE_C_SEED);

  const pongWasm = buildCartridgeWasmBytes('dev.openplay.pong');
  const arenaWasm = buildCartridgeWasmBytes('dev.openplay.arena');
  const runnerWasm = buildCartridgeWasmBytes('dev.openplay.cyberrunner');

  const pongManifest = signGameManifest(
    {
      schema: 1,
      id: 'dev.openplay.pong',
      name: 'CyberPong 2099: Neon Duel',
      version: '1.2.0',
      license: 'MIT',
      author: { name: 'Neo-Bogota Core Studio', pubkey: kpA.formattedPubkey },
      abi: 'host-abi/0',
      entry: 'game.wasm',
      display: { width: 480, height: 320, scale: 'fit' },
      permissions: ['audio', 'storage', 'net.p2p'],
      multiplayer: { mode: 'p2p-lockstep', min: 1, max: 2, tickrate: 60 },
      mods: { enabled: true, lang: 'lua', hooks: ['on_init', 'on_tick', 'on_event'] },
      files: [{ path: 'game.wasm', sha256: sha256Hex(pongWasm), size: pongWasm.length }]
    },
    NODE_A_SEED
  );

  const arenaManifest = signGameManifest(
    {
      schema: 1,
      id: 'dev.openplay.arena',
      name: 'Neon Arena P2P: Cyber Tanks',
      version: '1.0.4',
      license: 'Apache-2.0',
      author: { name: 'Tokyo Grid Collective', pubkey: kpB.formattedPubkey },
      abi: 'host-abi/0',
      entry: 'game.wasm',
      display: { width: 480, height: 320, scale: 'fit' },
      permissions: ['audio', 'storage', 'net.p2p'],
      multiplayer: { mode: 'p2p-state', min: 2, max: 4, tickrate: 60 },
      mods: { enabled: true, lang: 'lua', hooks: ['on_init', 'on_tick', 'on_event'] },
      files: [{ path: 'game.wasm', sha256: sha256Hex(arenaWasm), size: arenaWasm.length }]
    },
    NODE_B_SEED
  );

  const runnerManifest = signGameManifest(
    {
      schema: 1,
      id: 'dev.openplay.cyberrunner',
      name: 'NetRunner Grid: Synaptic Rush',
      version: '0.9.5',
      license: 'GPL-3.0-only',
      author: { name: 'Berlin Chaos Foundry', pubkey: kpC.formattedPubkey },
      abi: 'host-abi/0',
      entry: 'game.wasm',
      display: { width: 480, height: 320, scale: 'fit' },
      permissions: ['audio', 'storage'],
      multiplayer: { mode: 'single', min: 1, max: 1, tickrate: 60 },
      mods: { enabled: false, lang: 'lua', hooks: [] },
      files: [{ path: 'game.wasm', sha256: sha256Hex(runnerWasm), size: runnerWasm.length }]
    },
    NODE_C_SEED
  );

  const games: CatalogGameItem[] = [
    {
      id: 'dev.openplay.pong',
      manifest: pongManifest,
      wasmBytes: pongWasm,
      tagline: 'Duelo arcade determinista a 60Hz con lockstep P2P y sandbox de mods Lua en vivo.',
      description:
        'Clásico duelo ciberpunk sobre asfalto mojado compilado a WebAssembly puro (host-abi/0). Soporta 1P contra IA determinista, 2P local o multijugador P2P lockstep, además de hooks en vivo para mods en Lua.',
      tags: ['ARCADE', 'P2P', 'LOCKSTEP', 'MODS', 'RETRO'],
      nodeOrigin: 'https://node-a.openplay.network',
      nodeName: 'Neo-Bogotá Core 01',
      installed: true,
      accentColor: 'cyan',
      controlsHint: 'P1: W/S o Flechas ↑/↓ · P2 Local: I/K · Touch D-Pad en móvil',
      changelog: [
        { version: '1.2.0', date: '2026-10-27', notes: 'Soporte completo para eventos game_mod_event y snapshots de 64 bytes.' },
        { version: '1.1.0', date: '2026-10-12', notes: 'Sincronización P2P lockstep a 60 ticks/s con verificación SHA-256.' },
        { version: '1.0.0', date: '2026-09-28', notes: 'Lanzamiento inicial open source bajo licencia MIT.' }
      ]
    },
    {
      id: 'dev.openplay.arena',
      manifest: arenaManifest,
      wasmBytes: arenaWasm,
      tagline: 'Combate táctico de 2 a 4 tanques neón con dash cuántico, proyectiles y rollback.',
      description:
        'Arena multijugador P2P para hasta 4 jugadores con dos DataChannels WebRTC (fiable ordenado + no fiable maxRetransmits=0). Incluye simulación determinista resistente a 150ms de RTT y 5% de pérdida de paquetes.',
      tags: ['ARCADE', 'P2P', 'MODS', 'CYBER'],
      nodeOrigin: 'https://tokyo-grid.openplay.network',
      nodeName: 'Tokyo Grid Relay 09',
      installed: true,
      accentColor: 'magenta',
      controlsHint: 'Mover: WASD / Flechas · Disparar: Espacio (Botón A) · Dash Cuántico: Shift (Botón B)',
      changelog: [
        { version: '1.0.4', date: '2026-10-26', notes: 'Optimización de interpolación y predictor de colisiones en arena.' },
        { version: '1.0.0', date: '2026-10-02', notes: 'Publicación federada desde Tokyo Grid Relay 09 (Apache-2.0).' }
      ]
    },
    {
      id: 'dev.openplay.cyberrunner',
      manifest: runnerManifest,
      wasmBytes: runnerWasm,
      tagline: 'Infiltración de alta velocidad por cortafuegos orbitales. Prueba de política mods.enabled=false.',
      description:
        'Corredor sin fin de baja latencia donde esquivas barreras láser en la supercarretera de datos. Configurado con mods.enabled=false para demostrar el bloqueo estricto de mods no autorizados por el autor.',
      tags: ['ARCADE', 'RETRO', 'CYBER'],
      nodeOrigin: 'https://berlin-chaos.openplay.network',
      nodeName: 'Berlin Chaos Node 04',
      installed: false,
      accentColor: 'yellow',
      controlsHint: 'Propulsión vertical y lateral: WASD o Flechas ↑/↓/←/→',
      changelog: [
        { version: '0.9.5', date: '2026-10-25', notes: 'Generador procedural determinista con semilla fija.' }
      ]
    }
  ];

  const indexA = signFederatedIndex(
    {
      schema: 1,
      node: {
        name: 'Neo-Bogotá Core 01',
        url: 'https://node-a.openplay.network',
        pubkey: kpA.formattedPubkey
      },
      updated: '2026-10-27T23:00:00Z',
      games: [
        {
          id: pongManifest.id,
          version: pongManifest.version,
          manifest_url: 'https://node-a.openplay.network/v1/games/dev.openplay.pong/manifest.json',
          package_url: 'https://node-a.openplay.network/v1/games/dev.openplay.pong/package.zip',
          package_sha256: pongManifest.files[0]!.sha256,
          license: pongManifest.license,
          tags: ['arcade', 'p2p', 'lockstep', 'mods']
        }
      ],
      peers: ['https://tokyo-grid.openplay.network', 'https://berlin-chaos.openplay.network']
    },
    NODE_A_SEED
  );

  const indexB = signFederatedIndex(
    {
      schema: 1,
      node: {
        name: 'Tokyo Grid Relay 09',
        url: 'https://tokyo-grid.openplay.network',
        pubkey: kpB.formattedPubkey
      },
      updated: '2026-10-27T22:45:00Z',
      games: [
        {
          id: arenaManifest.id,
          version: arenaManifest.version,
          manifest_url: 'https://tokyo-grid.openplay.network/v1/games/dev.openplay.arena/manifest.json',
          package_url: 'https://tokyo-grid.openplay.network/v1/games/dev.openplay.arena/package.zip',
          package_sha256: arenaManifest.files[0]!.sha256,
          license: arenaManifest.license,
          tags: ['arcade', 'p2p', 'mods', 'cyber']
        }
      ],
      peers: ['https://node-a.openplay.network']
    },
    NODE_B_SEED
  );

  const indexC = signFederatedIndex(
    {
      schema: 1,
      node: {
        name: 'Berlin Chaos Node 04',
        url: 'https://berlin-chaos.openplay.network',
        pubkey: kpC.formattedPubkey
      },
      updated: '2026-10-27T22:15:00Z',
      games: [
        {
          id: runnerManifest.id,
          version: runnerManifest.version,
          manifest_url: 'https://berlin-chaos.openplay.network/v1/games/dev.openplay.cyberrunner/manifest.json',
          package_url: 'https://berlin-chaos.openplay.network/v1/games/dev.openplay.cyberrunner/package.zip',
          package_sha256: runnerManifest.files[0]!.sha256,
          license: runnerManifest.license,
          tags: ['arcade', 'retro', 'cyber']
        }
      ],
      peers: ['https://node-a.openplay.network']
    },
    NODE_C_SEED
  );

  const nodes: FederatedNodeRecord[] = [
    {
      id: 'node-a',
      name: 'Neo-Bogotá Core 01 (Nodo Primario)',
      url: 'https://node-a.openplay.network',
      region: 'LATAM // BOGOTÁ',
      pubkey: kpA.formattedPubkey,
      fingerprint: sha256Hex(kpA.formattedPubkey).slice(0, 24).toUpperCase(),
      etag: 'W/"a8f901c2-ed25519"',
      status: 'SYNCHRONIZED',
      lastSync: 'Hace 12 seg',
      trusted: true,
      index: indexA
    },
    {
      id: 'node-b',
      name: 'Tokyo Grid Relay 09 (Peer Federado B)',
      url: 'https://tokyo-grid.openplay.network',
      region: 'APAC // TOKYO',
      pubkey: kpB.formattedPubkey,
      fingerprint: sha256Hex(kpB.formattedPubkey).slice(0, 24).toUpperCase(),
      etag: 'W/"7b41e920-ed25519"',
      status: 'SYNCHRONIZED',
      lastSync: 'Hace 38 seg',
      trusted: true,
      index: indexB
    },
    {
      id: 'node-c',
      name: 'Berlin Chaos Node 04 (Peer Federado C)',
      url: 'https://berlin-chaos.openplay.network',
      region: 'EU // BERLIN',
      pubkey: kpC.formattedPubkey,
      fingerprint: sha256Hex(kpC.formattedPubkey).slice(0, 24).toUpperCase(),
      etag: 'W/"3c19d40a-ed25519"',
      status: 'SYNCHRONIZED',
      lastSync: 'Hace 1 min',
      trusted: true,
      index: indexC
    }
  ];

  return { games, nodes };
}
