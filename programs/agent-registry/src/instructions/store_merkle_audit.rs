use anchor_lang::prelude::*;
use crate::state::{AgentAccount, MerkleAuditRoot, MerkleAuditSummary};

/// Accounts for storing a Merkle audit root
#[derive(Accounts)]
#[instruction(merkle_root: [u8; 32], entries_count: u32)]
pub struct StoreMerkleAudit<'info> {
    /// The agent owner (must own the agent being audited)
    #[account(mut)]
    pub owner: Signer<'info>,

    /// The agent being audited
    #[account(
        seeds = [
            AgentAccount::SEED_PREFIX,
            agent.owner.as_ref(),
            agent.agent_id.to_le_bytes().as_ref()
        ],
        bump = agent.bump,
        constraint = agent.owner == owner.key() @ StoreMerkleAuditError::NotAgentOwner
    )]
    pub agent: Account<'info, AgentAccount>,

    /// The Merkle audit summary for this agent (created if first batch)
    #[account(
        init_if_needed,
        payer = owner,
        space = 8 + MerkleAuditSummary::INIT_SPACE,
        seeds = [MerkleAuditSummary::SEED_PREFIX, agent.key().as_ref()],
        bump
    )]
    pub audit_summary: Account<'info, MerkleAuditSummary>,

    /// The new Merkle audit root entry
    #[account(
        init,
        payer = owner,
        space = 8 + MerkleAuditRoot::INIT_SPACE,
        seeds = [
            MerkleAuditRoot::SEED_PREFIX,
            agent.key().as_ref(),
            audit_summary.total_batches.to_le_bytes().as_ref()
        ],
        bump
    )]
    pub audit_root: Account<'info, MerkleAuditRoot>,

    pub system_program: Program<'info, System>,
}

#[error_code]
pub enum StoreMerkleAuditError {
    #[msg("Only agent owner can store audit roots")]
    NotAgentOwner,
    #[msg("Entries count must be greater than 0")]
    EmptyBatch,
}

pub fn handler(
    ctx: Context<StoreMerkleAudit>,
    merkle_root: [u8; 32],
    entries_count: u32,
) -> Result<()> {
    require!(entries_count > 0, StoreMerkleAuditError::EmptyBatch);

    let clock = Clock::get()?;
    let agent_key = ctx.accounts.agent.key();

    // Initialize summary if first batch
    let summary = &mut ctx.accounts.audit_summary;
    if summary.total_batches == 0 {
        summary.agent = agent_key;
        summary.bump = ctx.bumps.audit_summary;
    }

    // Create the Merkle root entry
    let root = &mut ctx.accounts.audit_root;
    root.agent = agent_key;
    root.merkle_root = merkle_root;
    root.entries_count = entries_count;
    root.timestamp = clock.unix_timestamp;
    root.batch_index = summary.total_batches;
    root.bump = ctx.bumps.audit_root;

    // Update summary
    summary.total_batches = summary.total_batches.saturating_add(1);
    summary.total_entries = summary.total_entries.saturating_add(entries_count as u64);
    summary.last_batch_at = clock.unix_timestamp;

    msg!(
        "Merkle audit root stored: agent={}, batch={}, entries={}, root={:?}",
        agent_key,
        root.batch_index,
        entries_count,
        &merkle_root[..8] // Log first 8 bytes for brevity
    );

    Ok(())
}
