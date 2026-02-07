import { Connection, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  // Load second test wallet
  const walletPath = process.argv[2] || "/tmp/second-test-wallet.json";
  const walletKeypair = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(readFileSync(walletPath, "utf-8")))
  );
  console.log("Using wallet:", walletKeypair.publicKey.toBase58());

  // Connect to devnet
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  const wallet = new Wallet(walletKeypair);
  const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });

  // Load IDL
  const idlPath = join(__dirname, "../target/idl/agent_registry.json");
  const idl = JSON.parse(readFileSync(idlPath, "utf-8"));
  const programId = new PublicKey(idl.address);
  const program = new Program(idl, provider);

  // Registry PDA
  const [registryPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("registry")],
    programId
  );

  // Get current agent count for PDA
  const registryState = await program.account.registryState.fetch(registryPda);
  const agentId = registryState.totalAgents;
  console.log("Current total agents:", agentId.toString());

  // Agent PDA
  const [agentPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("agent"),
      walletKeypair.publicKey.toBuffer(),
      agentId.toArrayLike(Buffer, "le", 8),
    ],
    programId
  );
  console.log("Agent PDA:", agentPda.toBase58());

  // Mock NFT (for demo)
  const mockNft = Keypair.generate();

  // Register agent
  const agentName = `ChallengeableAgent-${Date.now()}`;
  const modelHash = "sha256:" + "b".repeat(64);
  const capabilities = "challengeable, testing";

  console.log("Registering agent:", agentName);

  try {
    const tx = await program.methods
      .registerAgent(agentName, modelHash, capabilities)
      .accounts({
        owner: walletKeypair.publicKey,
        registry: registryPda,
        agent: agentPda,
        nftMint: mockNft.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("SUCCESS! Transaction:", tx);
    console.log("Agent registered:", agentName);
    console.log("Agent owner:", walletKeypair.publicKey.toBase58());
    console.log("This agent can be challenged by:", "3TFaasJpBcbXyZPbdmwvAanWEJUpSJq6scmgeVxit85o");
  } catch (err) {
    console.error("Error:", err);
  }
}

main();
