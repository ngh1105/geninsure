/**
 * GenInsure Contract Test Script
 * Usage: node test_contract.mjs
 *
 * Tests: deploy → read → write → read again
 */
import { createClient, createAccount, generatePrivateKey } from "genlayer-js";
import { studionet, localnet } from "genlayer-js/chains";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Chain config ─────────────────────────────────
const NETWORK = process.env.NETWORK || "studionet";

const chain = NETWORK === "localnet" ? localnet : studionet;
console.log(`🌐 Network: ${chain.name} (${NETWORK})`);

// Tạo hoặc dùng account có sẵn
const EXISTING_PK = process.env.GENLAYER_PK;
const STUDIONET_PK = process.env.STUDIONET_PK || "0xba5c0f1a10d1fe1cb16dfc03918a2f2d973c6dc35ad5dd0148c03a030ea404a0";

const account = STUDIONET_PK
  ? createAccount(STUDIONET_PK)
  : EXISTING_PK
    ? createAccount(EXISTING_PK)
    : createAccount(generatePrivateKey());

// ── Setup ────────────────────────────────────────
const client = createClient({ chain, account });

console.log("👛 Account:", account.address);
console.log("");

// ── 1. DEPLOY CONTRACT ───────────────────────────
async function deploy() {
  console.log("📦 Deploying GenInsure contract...");

  const contractPath = path.resolve(__dirname, "contracts", "insurance.py");
  const code = new Uint8Array(readFileSync(contractPath));

  const tx = await client.deployContract({ code, args: [] });
  console.log("   Tx hash:", tx);

  const receipt = await client.waitForTransactionReceipt({
    hash: tx,
    status: "FINALIZED",
    retries: 600,
    interval: 3000,
  });

  const execResult = receipt.consensus_data?.leader_receipt?.[0];
  const txResult = receipt.txExecutionResultName || execResult?.execution_result;
  if (txResult === "SUCCESS") {
    console.log("   ✅ Deploy SUCCESS");
  } else {
    console.log("   ⚠️  Deploy result:", execResult?.execution_result);
    console.log("   Result detail:", JSON.stringify(execResult?.result).slice(0, 200));
  }

  const contractAddress = receipt.data?.contract_address || receipt.contract_snapshot?.contract_address;
  console.log("   📍 Contract address:", contractAddress);
  console.log("");

  return contractAddress;
}

// ── 2. READ (view methods) ───────────────────────
async function read(contractAddress) {
  console.log("📖 READING contract state...\n");

  // get_stats
  try {
    const stats = await client.readContract({
      address: contractAddress,
      functionName: "get_stats",
      args: [],
    });
    console.log("   get_stats:", JSON.stringify(stats, null, 2));
  } catch (e) {
    console.log("   get_stats ❌", e.shortMessage || e.message?.slice(0, 100));
  }

  // get_all_policies
  try {
    const all = await client.readContract({
      address: contractAddress,
      functionName: "get_all_policies",
      args: [],
    });
    const count = Object.keys(all || {}).length;
    console.log(`   get_all_policies: ${count} policies`);
  } catch (e) {
    console.log("   get_all_policies ❌", e.shortMessage || e.message?.slice(0, 100));
  }

  // get_my_policies
  try {
    const mine = await client.readContract({
      address: contractAddress,
      functionName: "get_my_policies",
      args: [account.address],
    });
    const count = Object.keys(mine || {}).length;
    console.log(`   get_my_policies: ${count} policies`);
  } catch (e) {
    console.log("   get_my_policies ❌", e.shortMessage || e.message?.slice(0, 100));
  }

  console.log("");
}

// ── 3. WRITE (create_policy) ──────────────────────
async function createPolicy(contractAddress) {
  console.log("✍️  WRITING: create_policy...\n");

  const testCases = [
    {
      label: "Flight Delay",
      category: "flight_delay",
      payout: "100",
      params: JSON.stringify({
        flight_number: "VN123",
        date: "2026-06-20",
        threshold_minutes: 60,
      }),
      premium: "10",
    },
    {
      label: "Weather Parametric",
      category: "weather_parametric",
      payout: "200",
      params: JSON.stringify({
        lat: "10.8231",
        lon: "106.6297",
        param: "rain_sum",
        threshold: 50.0,
        comparison: "above",
      }),
      premium: "20",
    },
    {
      label: "Event Cancellation",
      category: "event_cancellation",
      payout: "300",
      params: JSON.stringify({
        event_name: "Music Fest 2026",
        event_date: "2026-06-20",
        venue: "National Stadium",
      }),
      premium: "30",
    },
  ];

  const createdIds = [];

  for (const tc of testCases) {
    try {
      console.log(`   Creating ${tc.label} policy...`);

      const tx = await client.writeContract({
        address: contractAddress,
        functionName: "create_policy",
        args: [tc.category, tc.payout, tc.params],
        value: 0n,
      });

      const receipt = await client.waitForTransactionReceipt({
        hash: tx,
        status: "FINALIZED",
        retries: 600,
        interval: 3000,
      });

      const execResult = receipt.consensus_data?.leader_receipt?.[0];
      const txResult = receipt.txExecutionResultName || execResult?.execution_result;
      if (txResult === "SUCCESS") {
        console.log(`   ✅ ${tc.label} created (tx: ${tx.slice(0, 10)}...)`);
        createdIds.push({ label: tc.label, tx });
      } else {
        console.log(`   ⚠️  ${tc.label}: ${execResult?.execution_result}`);
        console.log(`      ${JSON.stringify(execResult?.result)?.slice(0, 150)}`);
      }
    } catch (e) {
      console.log(`   ❌ ${tc.label}:`, e.shortMessage || e.message?.slice(0, 100));
    }
  }

  console.log("");
  return createdIds;
}

// ── 4. READ AGAIN ────────────────────────────────
async function readAgain(contractAddress) {
  console.log("📖 READING again after writes...\n");

  try {
    const stats = await client.readContract({
      address: contractAddress,
      functionName: "get_stats",
      args: [],
    });
    console.log("   get_stats:", JSON.stringify(stats, null, 2));
  } catch (e) {
    console.log("   get_stats ❌", e.shortMessage || e.message?.slice(0, 100));
  }

  try {
    const mine = await client.readContract({
      address: contractAddress,
      functionName: "get_my_policies",
      args: [account.address],
    });
    const entries = Object.entries(mine || {});
    console.log(`   My policies: ${entries.length}`);
    for (const [id, p] of entries.slice(0, 3)) {
      console.log(`   📋 ${id}: ${p.category} | active=${p.is_active} | claimed=${p.has_claimed}`);
    }
  } catch (e) {
    console.log("   get_my_policies ❌", e.shortMessage || e.message?.slice(0, 100));
  }

  console.log("");
}

// ── MAIN ─────────────────────────────────────────
async function main() {
  console.log("═".repeat(55));
  console.log("  GenInsure Contract Test — genlayer-js");
  console.log("═".repeat(55));
  console.log("");

  const contractAddress = await deploy();

  if (!contractAddress) {
    console.log("❌ Deploy failed — cannot continue.");
    console.log("💡 Try deploying via GenLayer Studio at http://localhost:8080");
    process.exit(1);
  }

  await read(contractAddress);
  await createPolicy(contractAddress);
  await readAgain(contractAddress);

  console.log("═".repeat(55));
  console.log("✅ Test complete!");
  console.log(`   Contract: ${contractAddress}`);
  console.log(`   Account:  ${account.address}`);
  console.log("═".repeat(55));
}

main().catch((err) => {
  console.error("❌ Fatal:", err);
  process.exit(1);
});
