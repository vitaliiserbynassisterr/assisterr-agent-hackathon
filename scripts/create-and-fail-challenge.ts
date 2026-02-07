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
  console.log("\n=== Creating Challenge and Testing FAIL Response ===\n");

  // Load challenger wallet (test wallet)
  const challengerPath = process.env.HOME + "/.config/solana/id.json";
  const challenger = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(readFileSync(challengerPath, "utf-8")))
  );
  console.log("Challenger (deploy wallet):", challenger.publicKey.toBase58());

  // Load agent owner wallet (second test wallet)
  const agentOwnerPath = "/tmp/second-test-wallet.json";
  const agentOwner = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(readFileSync(agentOwnerPath, "utf-8")))
  );
  console.log("Agent Owner:", agentOwner.publicKey.toBase58());

  // Connect to devnet
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");

  // Load IDL
  const idlPath = join(__dirname, "../target/idl/agent_registry.json");
  const idl = JSON.parse(readFileSync(idlPath, "utf-8"));
  const programId = new PublicKey(idl.address);

  // Registry PDA
  const [registryPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("registry")],
    programId
  );

  // Agent ID 7 is ChallengeableAgent
  const agentId = new BN(7);
  const [agentPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("agent"),
      agentOwner.publicKey.toBuffer(),
      agentId.toArrayLike(Buffer, "le", 8),
    ],
    programId
  );
  console.log("Agent PDA:", agentPda.toBase58());

  // Challenge PDA - use deploy wallet as new challenger
  const [challengePda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("challenge"),
      agentPda.toBuffer(),
      challenger.publicKey.toBuffer(),
    ],
    programId
  );
  console.log("Challenge PDA:", challengePda.toBase58());

  // === STEP 1: Create Challenge ===
  console.log("\n--- Step 1: Creating Challenge ---");

  const challengerWallet = new Wallet(challenger);
  const challengerProvider = new AnchorProvider(connection, challengerWallet, { commitment: "confirmed" });
  const challengerProgram = new Program(idl, challengerProvider);

  const question = "What is 2 + 2?";
  const correctAnswer = "4";
  const expectedHash = hashAnswer(correctAnswer);

  console.log("Question:", question);
  console.log("Correct Answer:", correctAnswer);
  console.log("Expected Hash:", expectedHash);

  try {
    const tx = await challengerProgram.methods
      .createChallenge(question, expectedHash)
      .accounts({
        challenger: challenger.publicKey,
        agent: agentPda,
        challenge: challengePda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log("✅ Challenge created! TX:", tx);
  } catch (err: any) {
    if (err.message && err.message.includes("already in use")) {
      console.log("Challenge already exists, continuing...");
    } else {
      console.error("Error creating challenge:", err.message);
      return;
    }
  }

  // Fetch agent state before response
  const ownerWallet = new Wallet(agentOwner);
  const ownerProvider = new AnchorProvider(connection, ownerWallet, { commitment: "confirmed" });
  const ownerProgram = new Program(idl, ownerProvider);

  const agentBefore = await ownerProgram.account.agentAccount.fetch(agentPda);
  console.log("\n--- Agent State BEFORE Response ---");
  console.log("Reputation:", agentBefore.reputationScore);
  console.log("Challenges Passed:", agentBefore.challengesPassed);
  console.log("Challenges Failed:", agentBefore.challengesFailed);

  // === STEP 2: Submit WRONG Response ===
  console.log("\n--- Step 2: Submitting WRONG Response ---");

  const wrongAnswer = "5"; // Wrong!
  const wrongHash = hashAnswer(wrongAnswer);
  console.log("Submitting wrong answer:", wrongAnswer);
  console.log("Wrong hash:", wrongHash);

  try {
    const tx = await ownerProgram.methods
      .submitResponse(wrongHash)
      .accounts({
        owner: agentOwner.publicKey,
        registry: registryPda,
        agent: agentPda,
        challenge: challengePda,
      })
      .rpc();

    console.log("\n✅ Response submitted! TX:", tx);

    // Fetch updated states
    const agentAfter = await ownerProgram.account.agentAccount.fetch(agentPda);
    const challengeAfter = await ownerProgram.account.challenge.fetch(challengePda);

    console.log("\n--- Agent State AFTER ---");
    console.log("Reputation:", agentAfter.reputationScore);
    console.log("Challenges Passed:", agentAfter.challengesPassed);
    console.log("Challenges Failed:", agentAfter.challengesFailed);

    console.log("\n--- Challenge Status ---");
    console.log("Status:", JSON.stringify(challengeAfter.status));

    const repChange = agentAfter.reputationScore - agentBefore.reputationScore;
    console.log("\n❌ Challenge FAILED! Reputation changed by:", repChange);
  } catch (err: any) {
    console.error("\n❌ Error:", err.message);
    if (err.logs) {
      console.log("Logs:", err.logs.slice(-5));
    }
  }
}

main();
