# 🖥️ GenInsure — Frontend

The Vue 3 dApp for **GenInsure** — a decentralized insurance oracle on GenLayer. Connect an EVM wallet, create policies across three insurance categories, submit AI-verified claims, and track results in real time.

[![Live Demo](https://img.shields.io/badge/Live_Demo-app--jade--psi--70.vercel.app-000?style=for-the-badge&logo=vercel&logoColor=white)](https://app-jade-psi-70.vercel.app)

> See the root [`README`](../README.md) for architecture, contract API, and the full quick start.

## ✨ Features

- 🔌 **EVM wallet connection** — MetaMask / Rabby / any wallet exposing `window.ethereum`
- 🛡️ **Create policies** — Flight Delay, Weather Parametric, Event Cancellation
- 📋 **My Policies** — track your own policies and their claim status
- 🌐 **All Policies** — browse every policy on the platform
- 📊 **Stats bar** — total policies, premiums, and payouts
- ⚡ **Live AI verification** — claims settle through GenLayer validator consensus

## 🧱 Tech Stack

- **Vue 3** (`<script setup>` SFCs)
- **Vite** 5
- **Tailwind CSS** 3
- **[genlayer-js](https://github.com/yeagerai/genlayer-js)** `1.1.8` — contract reads/writes on **studionet** (id `61999`)
- **viem** — EVM wallet transport

## 🚀 Run

```bash
# 1. configure
cp .env.example .env       # set VITE_CONTRACT_ADDRESS after deploying the contract

# 2. install & start
npm install
npm run dev
```

App runs at **http://localhost:5173**.

### Environment

| Variable | Description |
|----------|-------------|
| `VITE_CONTRACT_ADDRESS` | Address of the deployed `insurance.py` contract |
| `VITE_JSONRPC_URL` | GenLayer JSON-RPC endpoint (default `http://localhost:4000`) |

> `.env` takes precedence over `localStorage`: a stale address from an older deployment won't redirect traffic to a mismatched contract.

## 📁 Structure

```
app/
├── src/
│   ├── App.vue
│   ├── main.js
│   ├── components/
│   │   └── InsuranceScreen.vue   # Main UI (header, stats, tabs, forms, policy cards)
│   └── services/
│       └── genlayer.js           # genlayer-js client, EVM wallet, contract read/write
├── index.html
├── vite.config.js
└── tailwind.config.js
```

## 🔌 How wallet + contract calls work

`src/services/genlayer.js` wires everything together:

- `connectWallet()` / `disconnectWallet()` — connect an EVM wallet via `window.ethereum` and `viem`.
- `callView(method, args)` → `client.readContract(...)` — view methods.
- `callWrite(method, args, value)` → `client.writeContract(...)` — state-changing methods, waits for `ACCEPTED` consensus.

## 📦 Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview the production build |
