# GenInsure — Decentralized Insurance Oracle on GenLayer

AI-powered insurance platform where GenLayer validators verify real-world events to approve or deny claims. Three insurance categories with distinct AI verification patterns.

## 👀 About

GenInsure is a decentralized insurance oracle built on GenLayer. Instead of relying on a single centralized claims adjuster, GenLayer's AI validators independently verify claims against real-world data (flight APIs, weather services, news sources) and reach consensus through the equivalence principle. This makes the claims process fair, transparent, and trustless.

What makes this uniquely suited for GenLayer: insurance claims involve real money and real-world events. No single person or company should decide alone whether someone gets paid.

## 📦 What's included

- **GenInsure Contract** (`contracts/insurance.py`) — 3 insurance categories with distinct AI verification
- **Vue.js Frontend** (`app/`) — Full wallet integration, policy creation, claim submission
- **Deploy Script** (`deploy/`) — TypeScript deployment via genlayer-js
- **Python Tools** (`tools/`) — Utilities for testing and contract interaction

## 🛠️ Requirements

- Node.js v18+
- Python 3.10+
- GenLayer CLI (`npm i -g genlayer`)

## 🚀 Steps to run

### 1. Configure environment
Rename `.env.example` to `.env` both in root and `app/` folder with appropriate values.

### 2. Start GenLayer simulator
```bash
genlayer up
```

### 3. Deploy the contract
```bash
npx genlayer deploy
```
Note the deployed contract address from the output.

### 4. Run the frontend
```bash
cd app
npm install
npm run dev
```
The app will be available at http://localhost:5173/

### 5. Test contracts
```bash
pip install -r requirements.txt
gltest
```

## 🛡️ Insurance Categories

| Category | AI Verification | Data Source |
|----------|----------------|-------------|
| **Flight Delay** | `eq_principle_strict_eq` | AviationStack API |
| **Weather Parametric** | `eq_principle_strict_eq` | Open-Meteo (free, no key) |
| **Event Cancellation** | `eq_principle_prompt_comparative` | Bing/Web Search |

## 💬 Community

- **[Discord](https://discord.gg/8Jm4v89VAu)**
- **[Telegram](https://t.me/genlayer)**

## 📜 License

MIT