import { describe, expect, it } from 'vitest';
import { verifyFederatedIndex, verifyGameManifest } from '@openplay/manifest';
import { validateWasmAbi } from '@openplay/abi';
import { buildInitialCatalogAndFederation } from './data/seedCatalog.js';

describe('@openplay/client — Seed Catalog & Federated Nodes Integrity', () => {
  it('verifies all 3 seeded open-source Wasm games and all 3 federated node indices', () => {
    const { games, nodes } = buildInitialCatalogAndFederation();
    expect(games.length).toBe(3);
    expect(nodes.length).toBe(3);

    for (const game of games) {
      const mRes = verifyGameManifest(game.manifest);
      expect(mRes.valid).toBe(true);
      const abiRes = validateWasmAbi(game.wasmBytes);
      expect(abiRes.valid).toBe(true);
    }

    for (const node of nodes) {
      const nRes = verifyFederatedIndex(node.index);
      expect(nRes.valid).toBe(true);
    }
  });
});
