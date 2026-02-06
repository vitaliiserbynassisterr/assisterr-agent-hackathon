use anchor_lang::prelude::*;
use crate::state::AgentAccount;
use crate::errors::RegistryError;

#[derive(Accounts)]
pub struct UpdateAgent<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [
            AgentAccount::SEED_PREFIX,
            owner.key().as_ref(),
            agent.agent_id.to_le_bytes().as_ref()
        ],
        bump = agent.bump,
        constraint = agent.owner == owner.key() @ RegistryError::Unauthorized
    )]
    pub agent: Account<'info, AgentAccount>,
}

pub fn handler(
    ctx: Context<UpdateAgent>,
    name: Option<String>,
    capabilities: Option<String>,
) -> Result<()> {
    let agent = &mut ctx.accounts.agent;
    let clock = Clock::get()?;

    // Update name if provided
    if let Some(new_name) = name {
        require!(new_name.len() <= 64, RegistryError::NameTooLong);
        agent.name = new_name;
    }

    // Update capabilities if provided
    if let Some(new_capabilities) = capabilities {
        require!(new_capabilities.len() <= 256, RegistryError::CapabilitiesTooLong);
        agent.capabilities = new_capabilities;
    }

    agent.updated_at = clock.unix_timestamp;

    msg!("Agent updated: id={}", agent.agent_id);

    Ok(())
}
