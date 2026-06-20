import { createClient, createAccount as createGenLayerAccount } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { createWalletClient, custom } from "viem";

// ── Chain config: dùng studionet thật từ genlayer-js 1.1.8
// (id 61999, có sẵn consensusMainContract — không hand-roll nữa) ──
export const client = createClient({ chain: studionet });

// ── Reactive account state ─────────────────────────
let _account = null;
const listeners = [];

function notifyListeners() {
  listeners.forEach((fn) => fn(_account));
}

export function onAccountChange(fn) {
  listeners.push(fn);
  if (_account) fn(_account); // push current state immediately
  return () => {
    const idx = listeners.indexOf(fn);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

export function getAccount() {
  return _account;
}

// ── EVM Wallet Connection (MetaMask / Rabby / etc.) ─
export async function connectWallet() {
  if (!window.ethereum) {
    throw new Error(
      "No EVM wallet detected. Please install MetaMask, Rabby, or another Web3 wallet."
    );
  }

  const [address] = await window.ethereum.request({
    method: "eth_requestAccounts",
  });

  if (!address) throw new Error("No account selected");

  const walletClient = createWalletClient({
    chain: studionet,
    transport: custom(window.ethereum),
  });

  _account = {
    address: address,
    type: "evm-wallet",
    signMessage: async ({ message }) => {
      return walletClient.signMessage({
        account: address,
        message: typeof message === "string" ? message : message.raw,
      });
    },
    signTransaction: async (tx) => {
      return walletClient.signTransaction({
        account: address,
        ...tx,
      });
    },
  };

  window.ethereum.on("accountsChanged", (accounts) => {
    if (accounts.length === 0) {
      disconnectWallet();
    } else if (accounts[0] !== _account?.address) {
      _account = { ..._account, address: accounts[0] };
      notifyListeners();
    }
  });

  window.ethereum.on("chainChanged", () => {
    window.location.reload();
  });

  notifyListeners();
  return _account;
}

export function disconnectWallet() {
  _account = null;
  if (window.ethereum) {
    window.ethereum.removeAllListeners?.("accountsChanged");
    window.ethereum.removeAllListeners?.("chainChanged");
  }
  notifyListeners();
}

export function isEVMConnected() {
  return _account !== null && _account.type === "evm-wallet";
}

// ── Legacy: private-key account (fallback / dev mode) ─
export function createPrivateKeyAccount() {
  const pk = localStorage.getItem("accountPrivateKey");
  if (!pk) throw new Error("No stored private key");
  _account = createGenLayerAccount(pk);
  notifyListeners();
  return _account;
}

export async function generateAndSaveAccount() {
  const { generatePrivateKey } = await import("genlayer-js");
  const pk = generatePrivateKey();
  localStorage.setItem("accountPrivateKey", pk);
  _account = createGenLayerAccount(pk);
  notifyListeners();
  return _account;
}

export function removePrivateKey() {
  localStorage.removeItem("accountPrivateKey");
}

// ── Contract interaction ──────────────────────────
// .env address wins over localStorage: a stale localStorage entry from an
// older deployment (different ABI) must not redirect reads/writes at a
// contract that returns a mismatched shape (e.g. get_stats -> u256 vs dict).
const ENV_CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || null;
let contractAddress =
  ENV_CONTRACT_ADDRESS || localStorage.getItem("contractAddress") || null;
if (ENV_CONTRACT_ADDRESS) {
  // keep localStorage synced so reloads / dev tools agree with .env
  localStorage.setItem("contractAddress", ENV_CONTRACT_ADDRESS);
}

export function setContractAddress(address) {
  contractAddress = address;
  localStorage.setItem("contractAddress", address);
}

export function getContractAddress() {
  return contractAddress;
}

// genlayer-js 1.1.8 dùng readContract/writeContract (KHÔNG phải call/write)
export async function callView(method, args = []) {
  if (!contractAddress) throw new Error("No contract address set. Deploy first.");
  return client.readContract({ address: contractAddress, functionName: method, args });
}

export async function callWrite(method, args = [], value = "0") {
  if (!contractAddress) throw new Error("No contract address set. Deploy first.");
  if (!_account) throw new Error("No wallet connected.");

  const tx = await client.writeContract({
    address: contractAddress,
    functionName: method,
    args,
    account: _account,
    value,
  });

  const receipt = await client.waitForTransactionReceipt({
    hash: tx,
    status: "ACCEPTED",
    retries: 200,
  });

  if (receipt.consensus_data?.leader_receipt?.[0]?.execution_result !== "SUCCESS") {
    throw new Error(`Transaction failed: ${JSON.stringify(receipt)}`);
  }

  return receipt;
}
