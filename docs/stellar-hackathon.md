# 🚀 OpenPlay // Stellar Soroban Hackathon Submission

> **Federated WebAssembly Arcade, Cloud GPU Streaming & Decentralized Infrastructure Pool on Stellar Blockchain**

[![Stellar](https://img.shields.io/badge/Stellar-Soroban_Testnet-7D00FF.svg?logo=stellar)](https://stellar.org)
[![Wasm Smart Contract](https://img.shields.io/badge/Smart_Contract-Rust_%2F_Wasm-black.svg?logo=webassembly)](./contracts/soroban-openplay)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-00f0ff.svg)](./LICENSE)

---

## 🎯 The Problem
1. **Centralized Cloud Gaming Monopoly:** Platforms like GeForce NOW and Xbox Cloud Gaming charge hefty monthly subscriptions, have regional lockouts, lack transparent billing, and offer zero ownership to players.
2. **Expensive GPU Infrastructure:** Running NVIDIA RTX cloud instances for gaming costs between $0.50 and $2.00/hour. Independent developers and gamers in emerging regions (Latin America, Africa, SE Asia) are priced out.
3. **Slow & Costly Blockchains for Gaming:** Traditional smart contract networks (Ethereum L1, EVM rollups) suffer from unpredictable gas spikes, multi-second/minute latencies, and high friction for sub-cent micro-billing per minute of play.

---

## 💡 The OpenPlay Solution on Stellar
OpenPlay is the **first Federated WebAssembly & Cloud Streaming Platform powered by Stellar Soroban**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       OPENPLAY CLIENT (Preact + WebRTC)                     │
│  - WebAssembly Native Runner (host-abi/0)                                   │
│  - 212 Web Game Ports (Celeste, Undertale, Doom 3, Balatro, Half-Life...)   │
│  - Cloud Gaming WebRTC Streamer (NVIDIA RTX 4080 / 1080p 60FPS)             │
└───────────────┬─────────────────────────────────────────────┬───────────────┘
                │ Pay-as-you-go micro-billing                 │ Work proofs
                ▼                                             ▼
┌────────────────────────────────────────┐  ┌─────────────────────────────────┐
│     STELLAR SOROBAN SMART CONTRACT     │  │  COMMUNITY GPU COMPUTE POOL     │
│       (Rust / WebAssembly Crate)       │  │                                 │
│ - buy_stream_credits(amount_xlm)       │  │ - Foreground voluntary compute  │
│ - submit_compute_proof(hashes)         │  │ - 100% transparent opt-in       │
│ - deduct_stream_time(user, minutes)    │  │ - Auto-terminates on exit       │
│ - record_gpu_purchase(cluster_id)      │  │ - Funds dedicated NVIDIA nodes  │
│ - submit_tournament_score(game, score) │  │                                 │
└───────────────────┬────────────────────┘  └─────────────────────────────────┘
                    │ Funds allocation & verified ledger
                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                 TRANSPARENT CLOUD GPU INFRASTRUCTURE                        │
│   [Bogotá Edge 14ms] ─── [US East Lambda A10G] ─── [Hetzner EU Dedicated]  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## ⚡ Why Stellar Blockchain & Soroban?

1. **Native WebAssembly (Wasm) Architecture:**
   * Soroban contracts are compiled to Wasm; OpenPlay cartridges and runner run on Wasm. The runtime philosophies are 100% aligned.
2. **Sub-Cent Micro-Transactions:**
   * Soroban transactions cost `<0.00001 XLM` ($0.000001 USD), enabling **per-minute or per-second streaming billing** that is impossible on EVM.
3. **Ultra-Fast 3-5 Second Finality:**
   * Instant gamer onboarding with **Stellar Freighter Wallet**. Connect, approve 2 XLM, and start streaming an AAA game in under 5 seconds.
4. **Stellar Asset Contract (SAC):**
   * Native compatibility with Stellar USDC and XLM for seamless crypto/fiat on-ramps.

---

## 📦 Soroban Smart Contract Architecture

The contract is located in [`contracts/soroban-openplay`](../contracts/soroban-openplay):

```rust
pub struct OpenPlayContract;

#[contractimpl]
impl OpenPlayContract {
    // 1. Explicit user opt-in for community compute contribution (Zero hidden background work)
    pub fn accept_support_terms(env: Env, supporter: Address);
    pub fn revoke_support(env: Env, supporter: Address);

    // 2. Submit verified compute work proofs -> earn free streaming minutes
    pub fn submit_compute_proof(env: Env, supporter: Address, hashes: u64) -> u32;

    // 3. Pay-As-You-Go streaming credits in native XLM or SAC USDC
    pub fn buy_stream_credits(env: Env, user: Address, amount: i128) -> u32;
    pub fn deduct_stream_time(env: Env, user: Address, minutes: u32) -> u32;

    // 4. On-chain transparency ledger for purchases of NVIDIA GPU servers
    pub fn record_gpu_purchase(env: Env, cluster_id: Symbol, provider: Symbol, cost_usd: i128, hours: u32, invoice_ref: BytesN<32>);

    // 5. Decentralized tournament high-score and prize distribution
    pub fn submit_tournament_score(env: Env, player: Address, game_id: Symbol, score: u64, replay_hash: BytesN<32>) -> u64;
    pub fn payout_tournament(env: Env, winner: Address, amount: i128);
}
```

---

## 🛠️ How to Build and Deploy on Stellar Testnet

### 1. Build the Soroban Contract to Wasm
```bash
cd contracts/soroban-openplay
stellar contract build
```

### 2. Deploy to Stellar Testnet
```bash
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/soroban_openplay.wasm \
  --source <STELLAR_IDENTITY_NAME> \
  --network testnet
```

### 3. Run the Frontend & Web3 Arcade
```bash
npm install
npm run dev
```
Open `http://localhost:5173` and click on **STELLAR SOROBAN** to connect Freighter and start testing.

---

## 🏆 Hackathon Tracks & Impact
* **Track:** Soroban Smart Contracts / DeFi & Infrastructure / Web3 Gaming.
* **Real-World Utility:** Millions of gamers with low-end PCs or smartphones can play high-end games and classic ports with zero barrier to entry, powered by Stellar micro-billing.
* **Community Model:** 100% auditable on-chain treasury proving where every XLM goes (paying GPU hosting and hardware nodes).
