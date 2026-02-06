use anchor_lang::prelude::*;
use crate::state::{AgentAccount, RegistryState};
use crate::errors::RegistryError;

#[derive(Accounts)]
pub struct VerifyAgent<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        seeds = [RegistryState::SEED_PREFIX],
        bump = registry.bump,
        constraint = registry.admin == admin.key() @ RegistryError::Unauthorized
    )]
    pub registry: Account<'info, RegistryState>,

    #[account(
        mut,
        seeds = [
            AgentAccount::SEED_PREFIX,
            agent.owner.as_ref(),
            agent.agent_id.to_le_bytes().as_ref()
        ],
        bump = agent.bump
    )]
    pub agent: Account<'info, AgentAccount>,
}

pub fn handler(ctx: Context<VerifyAgent>) -> Result<()> {
    let agent = &mut ctx.accounts.agent;

    require!(!agent.verified, RegistryError::AlreadyVerified);

    agent.verified = true;

    let clock = Clock::get()?;
    agent.updated_at = clock.unix_timestamp;

    msg!("Agent verified: id={}, name={}", agent.agent_id, agent.name);

    Ok(())
}
