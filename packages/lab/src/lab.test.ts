import { describe, expect, it } from 'vitest';
import { InputKind, KeyCode, NetChannel } from '@openplay/abi';
import {
  SimulatedDataChannelPipe,
  detectSnapshotDesyncs,
  executeDeterministicSession,
  type RecordedInputEvent
} from './index.js';

describe('@openplay/lab — Deterministic Replay & Network Impairment Simulator', () => {
  it('reproduces the exact same final state hash and 60-tick checkpoints across 3 replay executions', async () => {
    const sampleInputs: RecordedInputEvent[] = [
      { tick: 5, kind: InputKind.KeyDown, a: KeyCode.Up, b: 0, c: 0 },
      { tick: 35, kind: InputKind.KeyUp, a: KeyCode.Up, b: 0, c: 0 },
      { tick: 42, kind: InputKind.KeyDown, a: KeyCode.ActionA, b: 0, c: 0 },
      { tick: 50, kind: InputKind.KeyUp, a: KeyCode.ActionA, b: 0, c: 0 },
      { tick: 90, kind: InputKind.KeyDown, a: KeyCode.Right, b: 0, c: 0 },
      { tick: 140, kind: InputKind.KeyDown, a: KeyCode.ActionB, b: 0, c: 0 },
      { tick: 180, kind: InputKind.KeyUp, a: KeyCode.Right, b: 0, c: 0 }
    ];

    const run1 = await executeDeterministicSession('dev.openplay.arena', 209901, 240, sampleInputs);
    const run2 = await executeDeterministicSession('dev.openplay.arena', 209901, 240, sampleInputs);
    const run3 = await executeDeterministicSession('dev.openplay.arena', 209901, 240, sampleInputs);

    expect(run1.finalStateHash).toBe(run2.finalStateHash);
    expect(run2.finalStateHash).toBe(run3.finalStateHash);
    expect(run1.checkpointHashes).toEqual(run2.checkpointHashes);
    expect(run2.checkpointHashes).toEqual(run3.checkpointHashes);

    const desyncCheck = detectSnapshotDesyncs(run1.checkpointHashes, run3.checkpointHashes);
    expect(desyncCheck.desyncCount).toBe(0);
  });

  it('maintains Arena simulation stability under 150 ms latency and 5% packet loss', async () => {
    const pipe = new SimulatedDataChannelPipe({
      latencyMs: 150,
      jitterMs: 20,
      packetLossPct: 5,
      seed: 777
    });

    const peerAInputs: RecordedInputEvent[] = [];
    const peerBReceivedInputs: RecordedInputEvent[] = [];

    let virtualNowMs = 0;
    for (let tick = 1; tick <= 300; tick++) {
      virtualNowMs += 16.666;
      if (tick % 15 === 0) {
        const ev: RecordedInputEvent = {
          tick: tick + 12, // Lockstep input delay window compensating for 150ms RTT
          kind: InputKind.KeyDown,
          a: (tick % 30 === 0) ? KeyCode.Up : KeyCode.ActionA,
          b: 0,
          c: 0
        };
        peerAInputs.push(ev);
        const encoded = new TextEncoder().encode(JSON.stringify(ev));
        // Send lockstep inputs over ReliableOrdered channel so 5% loss triggers retransmit without permanent drop
        pipe.send(NetChannel.ReliableOrdered, encoded, virtualNowMs);
      }
      // Also send unreliable state telemetry beacons
      pipe.send(NetChannel.UnreliableUnordered, new Uint8Array([tick & 0xff]), virtualNowMs);

      const delivered = pipe.drainReady(virtualNowMs + 400);
      for (const pkt of delivered) {
        if (pkt.channel === NetChannel.ReliableOrdered) {
          const decoded = JSON.parse(new TextDecoder().decode(pkt.payload)) as RecordedInputEvent;
          peerBReceivedInputs.push(decoded);
        }
      }
    }

    const metrics = pipe.getMetrics();
    expect(metrics.sentCount).toBeGreaterThan(300);
    expect(metrics.avgRttMs).toBeGreaterThanOrEqual(120);

    // Both peers execute Arena with the lockstep input stream and achieve zero desyncs
    const peerASession = await executeDeterministicSession('dev.openplay.arena', 9001, 300, peerAInputs);
    const peerBSession = await executeDeterministicSession('dev.openplay.arena', 9001, 300, peerBReceivedInputs);

    expect(peerASession.finalStateHash).toBe(peerBSession.finalStateHash);
    const desync = detectSnapshotDesyncs(peerASession.checkpointHashes, peerBSession.checkpointHashes);
    expect(desync.desyncCount).toBe(0);
  });
});
