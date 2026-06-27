<div align="center">

# 🛡️ GenInsure

### Decentralized Insurance Oracle on GenLayer

*Where AI validators verify real-world events to approve or deny claims — trustlessly.*

![GenLayer](https://img.shields.io/badge/GenLayer-studionet-6366f1?style=flat-square)
![Vue](https://img.shields.io/badge/Vue-3-42b883?style=flat-square&logo=vuedotjs&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646cff?style=flat-square&logo=vite&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.10+-3776ab?style=flat-square&logo=python&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-22c55e?style=flat-square)

[![Live Demo](https://img.shields.io/badge/Live_Demo-app--jade--psi--70.vercel.app-000?style=for-the-badge&logo=vercel&logoColor=white)](https://app-jade-psi-70.vercel.app)

[Overview](#-overview) ·
[Categories](#-insurance-categories) ·
[How it works](#-how-it-works) ·
[Quick Start](#-quick-start) ·
[Contract API](#-contract-api)

</div>

---

## 📖 Overview

**GenInsure** is a decentralized insurance protocol built on **[GenLayer](https://genlayer.com)**, the AI-optimized blockchain. Instead of trusting a single centralized claims adjuster, GenLayer's network of **AI validators** independently fetch real-world data — flight statuses, weather feeds, news — and reach consensus through the **Equivalence Principle** to decide whether a claim is valid.

The result: a fair, transparent, and censorship-resistant claims process. No single party decides whether you get paid.

### Why insurance on GenLayer?

Insurance claims sit at the intersection of **real money** and **real-world events** — exactly the gap GenLayer fills:

- 🔗 **On-chain settlement** — policies and payouts live on-chain
- 🤖 **AI-powered verification** — validators reason over live web & API data
- ⚖️ **Equivalence Principle consensus** — independent validators must agree on the outcome

---

## ✨ Features

- **Three insurance categories**, each with a tailored AI verification strategy
- **Wallet-native** — connect MetaMask, Rabby, or any EVM wallet via `window.ethereum`
- **Full policy lifecycle** — create, track, claim, and inspect results in one UI
- **Live AI verification** — every claim runs through GenLayer validator consensus
- **Stats dashboard** — platform-wide premiums, payouts, and policy counts at a glance

---

## 🛡️ Insurance Categories

| Category | Trigger | Data Source | Consensus Method |
|----------|---------|-------------|------------------|
| ✈️ **Flight Delay** | Flight delayed past threshold | Bing Web Search | `eq_principle.prompt_comparative` |
| 🌦️ **Weather Parametric** | Weather reading crosses threshold | Open-Meteo API *(keyless)* | `eq_principle.strict_eq` |
| 🎫 **Event Cancellation** | Event cancelled / postponed | Bing Web Search | `eq_principle.prompt_comparative` |

Each category uses a **different consensus strategy**, because the *shape of truth* differs:

- **`strict_eq`** (weather) — validators read the same deterministic API, so outputs must match **exactly**.
- **`prompt_comparative`** (flight & events) — validators reason over **noisy** web results and agree on the *boolean* outcome even when exact figures vary.

---

## 🧠 How It Works

```
                 ┌─────────────────┐
                 │   GenInsure     │
                 │    Web dApp     │   Vue 3 · EVM wallet · genlayer-js
                 └────────┬────────┘
                          │  create_policy()  /  submit_claim()
                          ▼
                 ┌─────────────────┐
                 │  insurance.py   │
                 │    contract     │
                 └────────┬────────┘
                          │  gl.eq_principle.*  (consensus)
                          ▼
            ┌──────────────────────────────┐
            │   GenLayer AI Validators     │──▶  Bing Web Search
            │      (LLM reasoning)         │──▶  Open-Meteo API
            └──────────────┬───────────────┘
                           │  Equivalence Principle → agree on result
                           ▼
                 approved ✅   /   denied ❌   →  policy settles on-chain
```

---

## 🧱 Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contract | Python + [py-genlayer](https://py.genlayer.com) — `contracts/insurance.py` |
| Frontend | Vue 3 + Vite + Tailwind CSS — `app/` |
| SDK | [genlayer-js](https://github.com/yeagerai/genlayer-js) `1.1.8` + viem |
| Network | GenLayer **studionet** (chain id `61999`) |
| Deploy | TypeScript deploy script — `deploy/deployScript.ts` |

---

## 📁 Project Structure

```
geninsure/
├── contracts/
│   └── insurance.py            # GenLayer smart contract (3 insurance categories)
├── app/                        # Vue 3 frontend
│   └── src/
│       ├── components/InsuranceScreen.vue   # Main UI (tabs: Create / My / All)
│       └── services/genlayer.js             # genlayer-js client + EVM wallet
├── deploy/
│   └── deployScript.ts         # TypeScript deploy via genlayer-js
├── tools/                      # Python calldata / RPC helpers
├── config/                     # genlayer_config.py (RPC endpoint)
├── seed_policies.sh            # Seed demo policies (all 3 categories)
├── submit_claims.sh            # Submit claims for all active policies
├── test_contract.sh            # End-to-end CLI test (deploy → read → write)
└── requirements.txt            # Python deps (genlayer-test, eth-account, …)
```

---

## ✅ Prerequisites

- **Node.js** v18+
- **Python** 3.10+
- **GenLayer CLI**
  ```bash
  npm i -g genlayer
  ```
- An **EVM wallet** in your browser (MetaMask / Rabby / etc.)

---

## ⚡ Quick Start

### 1 · Configure environment
```bash
cp app/.env.example app/.env
```
```env
# app/.env
VITE_CONTRACT_ADDRESS="0x…"           # paste after step 3
VITE_JSONRPC_URL="http://localhost:4000"
```

### 2 · Start the GenLayer simulator
```bash
genlayer up
```

### 3 · Deploy the contract
```bash
npx genlayer deploy
```
Copy the **contract address** from the output into `app/.env` → `VITE_CONTRACT_ADDRESS`.

### 4 · Run the frontend
```bash
cd app
npm install
npm run dev
```
Open **http://localhost:5173**, connect your wallet, and create your first policy.

### 5 · Run the contract tests
```bash
pip install -r requirements.txt
gltest
```

---

## 🧪 Demo & Test Scripts

All scripts read the deployed address from `.studionet_addr` (or accept one as the first argument). They operate on an **already-deployed** contract.

| Script | What it does |
|--------|--------------|
| `./seed_policies.sh` | Seeds demo policies across all 3 categories |
| `./submit_claims.sh` | Submits AI-verified claims for every active policy |
| `./test_contract.sh` | Full lifecycle: deploy → read → create → read |
| `./test_claim_flow.sh` | End-to-end claim submission + verification |
| `./test_deployed_contract.sh` | Sanity check against an existing deployment |
| `node test_contract.mjs` | genlayer-js integration test |
| `node test_localnet.mjs` | localnet integration test |

> ⏳ Claims are slow: each runs validator consensus (web fetch + LLM reasoning). That's by design.

---

## 📜 Contract API

`GenInsure` (`contracts/insurance.py`) exposes:

| Method | Type | Description |
|--------|------|-------------|
| `create_policy(category, payout, params)` | `write` *(sends `value` as premium)* | Create a policy; returns `policy_id` |
| `submit_claim(policy_id)` | `write` | Trigger AI verification for a policy |
| `get_policy(policy_id)` | `view` | Full policy record incl. claim result |
| `get_my_policies(owner)` | `view` | All policies owned by an address |
| `get_all_policies()` | `view` | Every policy on the contract |
| `get_stats()` | `view` | Totals: `total_policies`, `total_premiums`, `total_payouts` |

**`params` JSON** per category:

```jsonc
// flight_delay
{ "flight_number": "VN123", "date": "2026-06-20", "threshold_minutes": "60" }

// weather_parametric
{
  "lat": "10.8231", "lon": "106.6297",
  "param": "rain_sum",            // rain_sum | temperature_2m_max | wind_speed_10m_max | snowfall_sum
  "threshold": "50",
  "comparison": "above"           // above | below
}

// event_cancellation
{ "event_name": "Tech Summit", "event_date": "2026-07-15", "venue": "SECC HCMC" }
```

---

## 🤝 Community

- 💬 [GenLayer Discord](https://discord.gg/8Jm4v89VAu)
- ✈️ [GenLayer Telegram](https://t.me/genlayer)
- 📚 [GenLayer Docs](https://docs.genlayer.com)

---

## 📜 License

[MIT](./LICENSE) © YeagerAI

<div align="center">

<sub>Built on <a href="https://genlayer.com">GenLayer</a> 🛡️</sub>

</div>
