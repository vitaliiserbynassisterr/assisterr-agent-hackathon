use anchor_lang::prelude::*;

#[error_code]
pub enum RegistryError {
    #[msg("Name is too long (max 64 characters)")]
    NameTooLong,

    #[msg("Model hash is invalid (must be sha256:...)")]
    InvalidModelHash,

    #[msg("Capabilities string is too long (max 256 characters)")]
    CapabilitiesTooLong,

    #[msg("Agent is already verified")]
    AlreadyVerified,

    #[msg("Unauthorized: only owner can update agent")]
    Unauthorized,

    #[msg("Reputation delta too large")]
    ReputationDeltaTooLarge,

    #[msg("Agent not found")]
    AgentNotFound,

    #[msg("Registry is full")]
    RegistryFull,
}
