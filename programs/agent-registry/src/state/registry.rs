use anchor_lang::prelude::*;

/// Global registry state - tracks total agents and admin
#[account]
#[derive(InitSpace)]
pub struct RegistryState {
    /// Admin pubkey who can verify agents
    pub admin: Pubkey,
    /// Total number of registered agents
    pub total_agents: u64,
    /// Bump seed for PDA
    pub bump: u8,
}

impl RegistryState {
    pub const SEED_PREFIX: &'static [u8] = b"registry";
}
