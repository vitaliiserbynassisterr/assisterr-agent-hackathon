use anchor_lang::prelude::*;

/// Merkle audit root - stores a batch of audit entries as a single root hash
/// This is more gas-efficient than storing each entry individually
///
/// Pattern: Collect N entries off-chain → compute Merkle root → store root on-chain
/// Verification: Anyone can verify an entry was included using Merkle proof
#[account]
#[derive(InitSpace)]
pub struct MerkleAuditRoot {
    /// The agent this audit batch belongs to
    pub agent: Pubkey,

    /// Merkle root of the batch (32 bytes = SHA256)
    pub merkle_root: [u8; 32],

    /// Number of entries in this batch
    pub entries_count: u32,

    /// Unix timestamp when batch was committed
    pub timestamp: i64,

    /// Sequential batch index for this agent
    pub batch_index: u64,

    /// PDA bump seed
    pub bump: u8,
}

impl MerkleAuditRoot {
    pub const SEED_PREFIX: &'static [u8] = b"merkle_audit";
}

/// Lightweight summary tracking total batches per agent
/// Updated each time a new Merkle root is stored
#[account]
#[derive(InitSpace)]
pub struct MerkleAuditSummary {
    /// The agent this summary belongs to
    pub agent: Pubkey,

    /// Total number of batches stored
    pub total_batches: u64,

    /// Total number of individual entries across all batches
    pub total_entries: u64,

    /// Timestamp of last batch
    pub last_batch_at: i64,

    /// PDA bump seed
    pub bump: u8,
}

impl MerkleAuditSummary {
    pub const SEED_PREFIX: &'static [u8] = b"merkle_summary";
}
