import { Connection, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { AnchorProvider, Program, Wallet, BN } from "@coral-xyz/anchor";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createHash } from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Hash function matching the frontend
function hashAnswer(answer: string): string {
  return createHash("sha256").update(answer).digest("hex");
}

async function main() {
  const mode = process.argv[2] || "pass"; // "pass" or "fail"
  console.log(`\n=== Testing Challenge Response: ${mode.toUpperCase()} ===\n`);

  // Load agent owner wallet (second test wallet)
  const walletPath = "/tmp/second-test-wallet.json";
  const agentOwner = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(readFileSync(walletPath, "utf-8")))
  );
  console.log("Agent Owner:", agentOwner.publicKey.toBase58());

  // Challenger wallet (test wallet that created the challenge)
  const challengerPubkey = new PublicKey("3TFaasJpBcbXyZPbdmwvAanWEJUpSJq6scmgeVxit85o");
  console.log("Challenger:", challengerPubkey.toBase58());

  // Connect to devnet
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  const wallet = new Wallet(agentOwner);
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

  // Find the agent owned by the second wallet
  // Agent ID 7 is ChallengeableAgent (registered after the initial 7)
  const agentId = new BN(7); // ChallengeableAgent is agent #7

  const [agentPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("agent"),
      agentOwner.publicKey.toBuffer(),
      agentId.toArrayLike(Buffer, "le", 8),
    ],
    programId
  );
  console.log("Agent PDA:", agentPda.toBase58());

  // Challenge PDA (derived from agent + challenger)
  const [challengePda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("challenge"),
      agentPda.toBuffer(),
      challengerPubkey.toBuffer(),
    ],
    programId
  );
  console.log("Challenge PDA:", challengePda.toBase58());

  // Fetch agent state before
  try {
    const agentBefore = await program.account.agentAccount.fetch(agentPda);
    console.log("\n--- Agent State BEFORE ---");
    console.log("Name:", agentBefore.name);
    console.log("Reputation:", agentBefore.reputationScore);
    console.log("Challenges Passed:", agentBefore.challengesPassed);
    console.log("Challenges Failed:", agentBefore.challengesFailed);
  } catch (err) {
    console.log("Could not fetch agent - may need different agent ID");
  }

  // Fetch challenge
  try {
    const challenge = await program.account.challenge.fetch(challengePda);
    console.log("\n--- Challenge Info ---");
    console.log("Question:", challenge.question);
    console.log("Expected Hash:", challenge.expectedHash);
    console.log("Status:", JSON.stringify(challenge.status));
  } catch (err) {
    console.error("Could not fetch challenge:", err);
    return;
  }

  // Determine response based on mode
  let responseHash: string;
  if (mode === "pass") {
    // Correct answer: "Paris" (what we set when creating the challenge)
    responseHash = hashAnswer("Paris");
    console.log("\nSubmitting CORRECT answer hash:", responseHash);
  } else {
    // Wrong answer
    responseHash = hashAnswer("Wrong Answer");
    console.log("\nSubmitting WRONG answer hash:", responseHash);
  }

  // Submit response
  try {
    const tx = await program.methods
      .submitResponse(responseHash)
      .accounts({
        owner: agentOwner.publicKey,
        registry: registryPda,
        agent: agentPda,
        challenge: challengePda,
      })
      .rpc();

    console.log("\n✅ Transaction:", tx);

    // Fetch updated states
    const agentAfter = await program.account.agentAccount.fetch(agentPda);
    const challengeAfter = await program.account.challenge.fetch(challengePda);

    console.log("\n--- Agent State AFTER ---");
    console.log("Reputation:", agentAfter.reputationScore);
    console.log("Challenges Passed:", agentAfter.challengesPassed);
    console.log("Challenges Failed:", agentAfter.challengesFailed);

    console.log("\n--- Challenge Status AFTER ---");
    console.log("Status:", JSON.stringify(challengeAfter.status));

    if (mode === "pass") {
      console.log("\n🎉 Challenge PASSED! Agent gained reputation.");
    } else {
      console.log("\n❌ Challenge FAILED! Agent lost reputation.");
    }
  } catch (err: any) {
    console.error("\n❌ Error submitting response:", err.message);
    if (err.logs) {
      console.log("Logs:", err.logs);
    }
  }
}

main();
