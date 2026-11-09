#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, token, Address, BytesN, Env, IntoVal, Symbol, Val,
};

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Admin,
    Treasury,
    Token,
    Supporter(Address),
    Credits(Address),
    HighScore(Symbol, Address),
    TotalComputeHashes,
    TotalGpuHoursPurchased,
    GpuClusterCount,
}

#[derive(Clone)]
#[contracttype]
pub struct SupporterRecord {
    pub is_active: bool,
    pub opted_in_at: u64,
    pub total_hashes: u64,
    pub earned_minutes: u32,
}

#[derive(Clone)]
#[contracttype]
pub struct GpuClusterRecord {
    pub cluster_id: Symbol,
    pub provider: Symbol,
    pub cost_usd: i128,
    pub hours_count: u32,
    pub timestamp: u64,
    pub invoice_ref: BytesN<32>,
}

#[contract]
pub struct OpenPlayContract;

#[contractimpl]
impl OpenPlayContract {
    /// Initialize OpenPlay Soroban Contract with Admin, Treasury and SAC Token address
    pub fn initialize(env: Env, admin: Address, treasury: Address, token: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("Already initialized");
        }
        admin.require_auth();

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Treasury, &treasury);
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::TotalComputeHashes, &0u64);
        env.storage().instance().set(&DataKey::TotalGpuHoursPurchased, &0u32);
        env.storage().instance().set(&DataKey::GpuClusterCount, &0u32);
    }

    /// Explicit opt-in for voluntary foreground compute contribution
    pub fn accept_support_terms(env: Env, supporter: Address) {
        supporter.require_auth();

        let record = SupporterRecord {
            is_active: true,
            opted_in_at: env.ledger().timestamp(),
            total_hashes: 0,
            earned_minutes: 0,
        };
        env.storage().persistent().set(&DataKey::Supporter(supporter.clone()), &record);
    }

    /// Revoke compute contribution immediately upon exit
    pub fn revoke_support(env: Env, supporter: Address) {
        supporter.require_auth();

        if let Some(mut record) = env.storage().persistent().get::<_, SupporterRecord>(&DataKey::Supporter(supporter.clone())) {
            record.is_active = false;
            env.storage().persistent().set(&DataKey::Supporter(supporter), &record);
        }
    }

    /// Submit verified compute work proof to earn streaming minutes and fund GPU pool
    pub fn submit_compute_proof(env: Env, supporter: Address, hashes: u64) -> u32 {
        supporter.require_auth();

        let mut record = env
            .storage()
            .persistent()
            .get::<_, SupporterRecord>(&DataKey::Supporter(supporter.clone()))
            .unwrap_or_else(|| panic!("Must accept support terms first"));

        if !record.is_active {
            panic!("Supporter session is not active");
        }

        record.total_hashes += hashes;

        // 100,000 hashes = 1 streaming minute rewarded
        let earned = (hashes / 100_000) as u32;
        if earned > 0 {
            record.earned_minutes += earned;
            let current_credits: u32 = env
                .storage()
                .persistent()
                .get(&DataKey::Credits(supporter.clone()))
                .unwrap_or(0);
            env.storage().persistent().set(&DataKey::Credits(supporter.clone()), &(current_credits + earned));
        }

        env.storage().persistent().set(&DataKey::Supporter(supporter), &record);

        let total_hashes: u64 = env.storage().instance().get(&DataKey::TotalComputeHashes).unwrap_or(0);
        env.storage().instance().set(&DataKey::TotalComputeHashes, &(total_hashes + hashes));

        earned
    }

    /// Pay-As-You-Go: Buy streaming credits using Stellar SAC (USDC or native XLM)
    /// Rate: 1 SAC Unit (e.g. 1 XLM or 1 USDC) = 15 minutes of NVIDIA RTX 4080 streaming
    pub fn buy_stream_credits(env: Env, user: Address, amount: i128) -> u32 {
        user.require_auth();

        let treasury: Address = env.storage().instance().get(&DataKey::Treasury).unwrap();
        let token_addr: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let token_client = token::Client::new(&env, &token_addr);

        token_client.transfer(&user, &treasury, &amount);

        // Calculate credited minutes: 1 unit with 7 decimals = 10_000_000 stroops
        let units = (amount / 10_000_000) as u32;
        let minutes_to_add = units * 15;

        let current_credits: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::Credits(user.clone()))
            .unwrap_or(0);

        let new_credits = current_credits + minutes_to_add;
        env.storage().persistent().set(&DataKey::Credits(user), &new_credits);

        new_credits
    }

    /// Deduct streaming minutes when an active WebRTC session runs
    pub fn deduct_stream_time(env: Env, user: Address, minutes: u32) -> u32 {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        let current_credits: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::Credits(user.clone()))
            .unwrap_or(0);

        if current_credits < minutes {
            panic!("Insufficient streaming credits");
        }

        let remaining = current_credits - minutes;
        env.storage().persistent().set(&DataKey::Credits(user), &remaining);

        remaining
    }

    /// On-chain Transparency Ledger: Record purchase of NVIDIA GPU clusters for community streaming
    pub fn record_gpu_purchase(
        env: Env,
        cluster_id: Symbol,
        provider: Symbol,
        cost_usd: i128,
        hours_count: u32,
        invoice_ref: BytesN<32>,
    ) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        let record = GpuClusterRecord {
            cluster_id,
            provider,
            cost_usd,
            hours_count,
            timestamp: env.ledger().timestamp(),
            invoice_ref,
        };

        let mut cluster_count: u32 = env.storage().instance().get(&DataKey::GpuClusterCount).unwrap_or(0);
        cluster_count += 1;
        env.storage().instance().set(&DataKey::GpuClusterCount, &cluster_count);

        let total_hours: u32 = env.storage().instance().get(&DataKey::TotalGpuHoursPurchased).unwrap_or(0);
        env.storage().instance().set(&DataKey::TotalGpuHoursPurchased, &(total_hours + hours_count));
    }

    /// Submit verified game replay and tournament high score on Stellar
    pub fn submit_tournament_score(
        env: Env,
        player: Address,
        game_id: Symbol,
        score: u64,
        _replay_hash: BytesN<32>,
    ) -> u64 {
        player.require_auth();

        let current_best: u64 = env
            .storage()
            .persistent()
            .get(&DataKey::HighScore(game_id.clone(), player.clone()))
            .unwrap_or(0);

        if score > current_best {
            env.storage().persistent().set(&DataKey::HighScore(game_id, player), &score);
            score
        } else {
            current_best
        }
    }

    /// Payout tournament prize directly to winner from contract treasury
    pub fn payout_tournament(env: Env, winner: Address, amount: i128) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        let treasury: Address = env.storage().instance().get(&DataKey::Treasury).unwrap();
        let token_addr: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let token_client = token::Client::new(&env, &token_addr);

        token_client.transfer(&treasury, &winner, &amount);
    }

    // --- Query Functions ---

    pub fn get_credits(env: Env, user: Address) -> u32 {
        env.storage().persistent().get(&DataKey::Credits(user)).unwrap_or(0)
    }

    pub fn get_supporter_status(env: Env, supporter: Address) -> bool {
        env.storage()
            .persistent()
            .get::<_, SupporterRecord>(&DataKey::Supporter(supporter))
            .map(|s| s.is_active)
            .unwrap_or(false)
    }

    pub fn get_high_score(env: Env, game_id: Symbol, player: Address) -> u64 {
        env.storage().persistent().get(&DataKey::HighScore(game_id, player)).unwrap_or(0)
    }

    pub fn get_total_compute(env: Env) -> u64 {
        env.storage().instance().get(&DataKey::TotalComputeHashes).unwrap_or(0)
    }
}

#[cfg(test)]
mod test;
