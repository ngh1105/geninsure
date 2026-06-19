/**
 * GenInsure Quick Test — Localnet (via genlayer-js)
 * Usage: node test_localnet.mjs
 */
import { createClient, createAccount, generatePrivateKey } from "genlayer-js";
import { simulator } from "genlayer-js/chains";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const account = createAccount(generatePrivateKey());
const client = createClient({ chain: simulator, account });

await client.initializeConsensusSmartContract();

console.log("👛", account.address);
console.log("");

// ── Deploy ──
console.log("📦 Deploying...");
const code = new Uint8Array(
  readFileSync(path.resolve(__dirname, "contracts", "insurance.py"))
);
const tx = await client.deployContract({ code, args: [] });
console.log("   tx:", tx);

const receipt = await client.waitForTransactionReceipt({
  hash: tx, status: "ACCEPTED", retries: 300, interval: 2000,
});
const addr = receipt.data?.contract_address || receipt.contract_snapshot?.contract_address;
const execResult = receipt.consensus_data?.leader_receipt?.[0];
console.log(`   result: ${execResult?.execution_result}`);
console.log("   📍", addr);
console.log("");

if (!addr || execResult?.execution_result !== "SUCCESS") {
  console.log("❌ Deploy failed. Detail:", JSON.stringify(execResult?.result).slice(0, 300));
  process.exit(1);
}

// ── Read ──
console.log("📖 get_stats:");
const stats = await client.call({ contractAddress: addr, method: "get_stats", args: [] });
console.log("  ", JSON.stringify(stats));
console.log("");

// ── Write ──
console.log("✍️  create_policy (flight_delay)...");
const p = JSON.stringify({ flight_number: "VN123", date: "2026-06-20", threshold_minutes: 60 });
const wtx = await client.write({
  contractAddress: addr, method: "create_policy",
  args: ["flight_delay", "100", p], account, value: "10",
});
const wr = await client.waitForTransactionReceipt({
  hash: wtx, status: "ACCEPTED", retries: 300, interval: 2000,
});
const wex = wr.consensus_data?.leader_receipt?.[0];
console.log(`   result: ${wex?.execution_result}`);

// ── Read again ──
console.log("");
console.log("📖 get_stats (after write):");
const stats2 = await client.call({ contractAddress: addr, method: "get_stats", args: [] });
console.log("  ", JSON.stringify(stats2));

console.log("");
console.log("✅ Done! Contract:", addr);
