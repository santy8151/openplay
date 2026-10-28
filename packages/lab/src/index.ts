/**
 * @openplay/lab — Network Condition Simulator, Telemetry Metrics, 60-Tick Snapshot Desync Detector,
 * and Deterministic Replay Recorder / Verifier.
 */

import { sha256Hex } from '@openplay/manifest';
import {
  type BuiltinGameId,
  DeterministicRng,
  buildCartridgeWasmBytes,
  instantiateGameModule,
  NetChannel
} from '@openplay/abi';
import { deriveKeyPairFromSeedHex, signGameManifest } from '@openplay/manifest';

export interface NetworkSimulationConfig {
  latencyMs: number;    // e.g. 0..500 ms
  jitterMs: number;     // e.g. 0..100 ms
  packetLossPct: number;// e.g. 0..50 %
  seed?: number;
}

export interface SimulatedPacket {
  id: number;
  channel: NetChannel;
  payload: Uint8Array;
  sentAtMs: number;
  deliverAtMs: number;
  dropped: boolean;
}

export interface LabTelemetrySample {
  tick: number;
  rttMs: number;
  packetLossPct: number;
  effectiveTickRate: number;
  snapshotHash: string;
  desyncCount: number;
}

/**
 * Wraps reliable and unreliable DataChannels with deterministic latency, jitter, and packet loss injection.
 */
export class SimulatedDataChannelPipe {
  private config: NetworkSimulationConfig;
  private rng: DeterministicRng;
  private seq = 0;
  private queue: SimulatedPacket[] = [];
  private sentCount = 0;
  private droppedCount = 0;
  private rttSamples: number[] = [];

  constructor(config: NetworkSimulationConfig) {
    this.config = { ...config };
    this.rng = new DeterministicRng(config.seed ?? 0x99887766);
  }

  updateConfig(partial: Partial<NetworkSimulationConfig>): void {
    this.config = { ...this.config, ...partial };
  }

  getConfig(): NetworkSimulationConfig {
    return { ...this.config };
  }

  send(channel: NetChannel, payload: Uint8Array, nowMs: number): SimulatedPacket {
    this.sentCount++;
    const roll = this.rng.nextFloat() * 100;
    // Unreliable channels experience raw packet loss; reliable channels experience retransmit delay instead of permanent drop
    const isLost = roll < this.config.packetLossPct;
    const jitterOffset =
      this.config.jitterMs > 0
        ? (this.rng.nextFloat() * 2 - 1) * this.config.jitterMs
        : 0;

    let oneWayDelay = Math.max(0, this.config.latencyMs / 2 + jitterOffset);
    let dropped = false;

    if (isLost) {
      if (channel === NetChannel.UnreliableUnordered) {
        dropped = true;
        this.droppedCount++;
      } else {
        // Reliable channel simulates retransmission backoff (+1.5x RTT)
        oneWayDelay += Math.max(25, this.config.latencyMs * 1.5);
      }
    }

    const rttSample = Math.round(oneWayDelay * 2);
    this.rttSamples.push(rttSample);
    if (this.rttSamples.length > 60) {
      this.rttSamples.shift();
    }

    const pkt: SimulatedPacket = {
      id: ++this.seq,
      channel,
      payload: payload.slice(),
      sentAtMs: nowMs,
      deliverAtMs: nowMs + oneWayDelay,
      dropped
    };

    if (!dropped) {
      this.queue.push(pkt);
      if (channel === NetChannel.ReliableOrdered) {
        // Keep reliable ordered packets sorted by sequence order
        this.queue.sort((a, b) => a.deliverAtMs - b.deliverAtMs || a.id - b.id);
      }
    }
    return pkt;
  }

  drainReady(nowMs: number): SimulatedPacket[] {
    const ready: SimulatedPacket[] = [];
    const remaining: SimulatedPacket[] = [];
    for (const pkt of this.queue) {
      if (pkt.deliverAtMs <= nowMs) {
        ready.push(pkt);
      } else {
        remaining.push(pkt);
      }
    }
    this.queue = remaining;
    return ready;
  }

  getMetrics(): { avgRttMs: number; measuredLossPct: number; sentCount: number; droppedCount: number } {
    const avgRttMs =
      this.rttSamples.length > 0
        ? Math.round(this.rttSamples.reduce((a, b) => a + b, 0) / this.rttSamples.length)
        : this.config.latencyMs;
    const measuredLossPct =
      this.sentCount > 0 ? Number(((this.droppedCount / this.sentCount) * 100).toFixed(2)) : 0;
    return {
      avgRttMs,
      measuredLossPct,
      sentCount: this.sentCount,
      droppedCount: this.droppedCount
    };
  }
}

export interface RecordedInputEvent {
  tick: number;
  kind: number;
  a: number;
  b: number;
  c: number;
}

export interface DeterministicReplayRecording {
  gameId: BuiltinGameId;
  seed: number;
  width: number;
  height: number;
  tickrate: number;
  totalTicks: number;
  inputs: RecordedInputEvent[];
  checkpointHashes: Array<{ tick: number; hash: string }>;
  finalStateHash: string;
}

const LAB_SIGNING_SEED = '9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60';

/**
 * Executes a deterministic game session from a `seed` and `inputs` list, computing snapshot hashes
 * every 60 ticks and returning the final SHA-256 state hash.
 */
export async function executeDeterministicSession(
  gameId: BuiltinGameId,
  seed: number,
  totalTicks: number,
  inputs: RecordedInputEvent[],
  width = 480,
  height = 320,
  tickrate = 60
): Promise<DeterministicReplayRecording> {
  const wasmBytes = buildCartridgeWasmBytes(gameId);
  const wasmSha256 = sha256Hex(wasmBytes);
  const kp = deriveKeyPairFromSeedHex(LAB_SIGNING_SEED);

  const manifest = signGameManifest(
    {
      schema: 1,
      id: gameId,
      name: `OpenPlay Lab (${gameId})`,
      version: '1.0.0',
      license: 'MIT',
      author: { name: 'OpenPlay Core', pubkey: kp.formattedPubkey },
      abi: 'host-abi/0',
      entry: 'game.wasm',
      display: { width, height, scale: 'fit' },
      permissions: ['audio', 'storage', 'net.p2p'],
      multiplayer: { mode: 'p2p-lockstep', min: 1, max: 4, tickrate },
      mods: { enabled: true, lang: 'lua', hooks: ['on_init', 'on_tick', 'on_event'] },
      files: [{ path: 'game.wasm', sha256: wasmSha256, size: wasmBytes.length }]
    },
    LAB_SIGNING_SEED
  );

  const runtime = await instantiateGameModule(wasmBytes, manifest);
  runtime.exports.game_init(seed >>> 0, width, height);

  const dtUs = Math.floor(1_000_000 / tickrate);
  const inputsByTick = new Map<number, RecordedInputEvent[]>();
  for (const ev of inputs) {
    const list = inputsByTick.get(ev.tick) ?? [];
    list.push(ev);
    inputsByTick.set(ev.tick, list);
  }

  const checkpointHashes: Array<{ tick: number; hash: string }> = [];

  for (let tick = 1; tick <= totalTicks; tick++) {
    const tickInputs = inputsByTick.get(tick);
    if (tickInputs) {
      for (const ev of tickInputs) {
        runtime.exports.game_input(ev.kind, ev.a, ev.b, ev.c);
      }
    }
    runtime.exports.game_tick(dtUs);

    if (tick % 60 === 0) {
      const snapHash = sha256Hex(runtime.takeSnapshot());
      checkpointHashes.push({ tick, hash: snapHash });
    }
  }

  const finalStateHash = sha256Hex(runtime.takeSnapshot());

  return {
    gameId,
    seed,
    width,
    height,
    tickrate,
    totalTicks,
    inputs,
    checkpointHashes,
    finalStateHash
  };
}

/**
 * Compares 60-tick snapshot hashes between two peers and counts any desyncs.
 */
export function detectSnapshotDesyncs(
  peerACheckpoints: Array<{ tick: number; hash: string }>,
  peerBCheckpoints: Array<{ tick: number; hash: string }>
): { desyncCount: number; mismatchedTicks: number[] } {
  const mapB = new Map<number, string>();
  for (const cp of peerBCheckpoints) {
    mapB.set(cp.tick, cp.hash);
  }
  const mismatchedTicks: number[] = [];
  for (const cpA of peerACheckpoints) {
    const hashB = mapB.get(cpA.tick);
    if (hashB !== undefined && hashB !== cpA.hash) {
      mismatchedTicks.push(cpA.tick);
    }
  }
  return {
    desyncCount: mismatchedTicks.length,
    mismatchedTicks
  };
}
