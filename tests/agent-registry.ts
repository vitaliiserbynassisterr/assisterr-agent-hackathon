import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import BN from "bn.js";
import { expect } from "chai";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// ESM compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe("agent-registry", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Load the program from IDL
  const idlPath = join(__dirname, "../target/idl/agent_registry.json");
  const idl = JSON.parse(readFileSync(idlPath, "utf-8"));
  const programId = new PublicKey(idl.address);
  const program = new anchor.Program(idl, provider);

  // PDAs
  const [registryPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("registry")],
    programId
  );

  const testModelHash = "sha256:1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
  const testAgentName = "TestAgent";
  const testCapabilities = "analysis,coding";

  it("Initialize registry", async () => {
    try {
      const tx = await program.methods
        .initialize()
        .accounts({
          admin: provider.wallet.publicKey,
          registry: registryPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log("Initialize tx:", tx);

      // Fetch registry state
      const registryState = await program.account.registryState.fetch(registryPda);
      expect(registryState.admin.toString()).to.equal(provider.wallet.publicKey.toString());
      expect(registryState.totalAgents.toNumber()).to.equal(0);

      console.log("Registry initialized with admin:", registryState.admin.toString());
    } catch (err: any) {
      // If already initialized, that's okay
      if (err.message && err.message.includes("already in use")) {
        console.log("Registry already initialized");
      } else {
        throw err;
      }
    }
  });

  it("Register a new agent", async () => {
    // Fetch registry to get total_agents for PDA derivation
    const registryState = await program.account.registryState.fetch(registryPda);
    const agentId = registryState.totalAgents;

    const [agentPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("agent"),
        provider.wallet.publicKey.toBuffer(),
        agentId.toArrayLike(Buffer, "le", 8),
      ],
      programId
    );

    const tx = await program.methods
      .registerAgent(testAgentName, testModelHash, testCapabilities)
      .accounts({
        owner: provider.wallet.publicKey,
        registry: registryPda,
        agent: agentPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("Register agent tx:", tx);

    // Fetch agent account
    const agentAccount = await program.account.agentAccount.fetch(agentPda);
    expect(agentAccount.name).to.equal(testAgentName);
    expect(agentAccount.modelHash).to.equal(testModelHash);
    expect(agentAccount.capabilities).to.equal(testCapabilities);
    expect(agentAccount.reputationScore).to.equal(5000); // Initial 50%
    expect(agentAccount.verified).to.be.false;

    console.log("Agent registered:", {
      id: agentAccount.agentId.toNumber(),
      name: agentAccount.name,
      modelHash: agentAccount.modelHash.substring(0, 20) + "...",
      reputation: agentAccount.reputationScore / 100 + "%",
    });
  });

  it("Update agent metadata", async () => {
    // Get agent ID 0
    const agentId = new BN(0);

    const [agentPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("agent"),
        provider.wallet.publicKey.toBuffer(),
        agentId.toArrayLike(Buffer, "le", 8),
      ],
      programId
    );

    const newName = "UpdatedAgent";
    const newCapabilities = "analysis,coding,trading";

    const tx = await program.methods
      .updateAgent(newName, newCapabilities)
      .accounts({
        owner: provider.wallet.publicKey,
        agent: agentPda,
      })
      .rpc();

    console.log("Update agent tx:", tx);

    // Verify update
    const agentAccount = await program.account.agentAccount.fetch(agentPda);
    expect(agentAccount.name).to.equal(newName);
    expect(agentAccount.capabilities).to.equal(newCapabilities);

    console.log("Agent updated:", {
      name: agentAccount.name,
      capabilities: agentAccount.capabilities,
    });
  });

  it("Verify agent (admin only)", async () => {
    const agentId = new BN(0);

    const [agentPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("agent"),
        provider.wallet.publicKey.toBuffer(),
        agentId.toArrayLike(Buffer, "le", 8),
      ],
      programId
    );

    const tx = await program.methods
      .verifyAgent()
      .accounts({
        admin: provider.wallet.publicKey,
        registry: registryPda,
        agent: agentPda,
      })
      .rpc();

    console.log("Verify agent tx:", tx);

    // Verify the agent is now verified
    const agentAccount = await program.account.agentAccount.fetch(agentPda);
    expect(agentAccount.verified).to.be.true;

    console.log("Agent verified:", agentAccount.verified);
  });

  it("Update reputation", async () => {
    const agentId = new BN(0);

    const [agentPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("agent"),
        provider.wallet.publicKey.toBuffer(),
        agentId.toArrayLike(Buffer, "le", 8),
      ],
      programId
    );

    // Get initial reputation
    const agentBefore = await program.account.agentAccount.fetch(agentPda);
    const initialReputation = agentBefore.reputationScore;

    // Increase reputation by 100
    const tx = await program.methods
      .updateReputation(100)
      .accounts({
        authority: provider.wallet.publicKey,
        registry: registryPda,
        agent: agentPda,
      })
      .rpc();

    console.log("Update reputation tx:", tx);

    // Verify reputation increased
    const agentAfter = await program.account.agentAccount.fetch(agentPda);
    expect(agentAfter.reputationScore).to.equal(initialReputation + 100);
    expect(agentAfter.challengesPassed).to.equal(1);

    console.log("Reputation updated:", {
      before: initialReputation / 100 + "%",
      after: agentAfter.reputationScore / 100 + "%",
      challengesPassed: agentAfter.challengesPassed,
    });
  });
});
