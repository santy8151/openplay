#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Env, IntoVal};

#[test]
fn test_openplay_soroban_initialization_and_opt_in() {
    let env = Env::default();
    let contract_id = env.register_contract(None, OpenPlayContract);
    let client = OpenPlayContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let treasury = Address::generate(&env);
    let token = Address::generate(&env);
    let player = Address::generate(&env);

    client.mock_all_auths().initialize(&admin, &treasury, &token);

    // Initial state
    assert_eq!(client.get_credits(&player), 0);
    assert_eq!(client.get_supporter_status(&player), false);

    // Explicit Opt-in
    client.mock_all_auths().accept_support_terms(&player);
    assert_eq!(client.get_supporter_status(&player), true);

    // Submit compute proof: 200,000 hashes = 2 minutes earned
    let earned = client.mock_all_auths().submit_compute_proof(&player, &200_000);
    assert_eq!(earned, 2);
    assert_eq!(client.get_credits(&player), 2);
    assert_eq!(client.get_total_compute(), 200_000);

    // Deduct 1 minute during a session
    let remaining = client.mock_all_auths().deduct_stream_time(&player, &1);
    assert_eq!(remaining, 1);
    assert_eq!(client.get_credits(&player), 1);

    // Revoke support
    client.mock_all_auths().revoke_support(&player);
    assert_eq!(client.get_supporter_status(&player), false);
}
