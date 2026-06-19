import { createClient, createAccount as createGenLayerAccount } from "genlayer-js";
import { simulator } from "genlayer-js/chains";
import { createWalletClient, custom } from "viem";

// ── Chain config ──────────────────────────────────
export const client = createClient({ chain: simulator });

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

  // Request accounts — triggers the wallet popup
  const [address] = await window.ethereum.request({
    method: "eth_requestAccounts",
  });

  if (!address) throw new Error("No account selected");

  // Create a viem wallet client from the browser provider
  const walletClient = createWalletClient({
    chain: {
      id: simulator.id,
      name: simulator.name,
      nativeCurrency: simulator.nativeCurrency,
      rpcUrls: simulator.rpcUrls,
    },
    transport: custom(window.ethereum),
  });

  // Build the account object genlayer-js needs (matches what createAccount returns)
  _account = {
    address: address,
    type: "evm-wallet",
    // genlayer-js write() needs a signMessage method
    signMessage: async ({ message }) => {
      return walletClient.signMessage({
        account: address,
        message: typeof message === "string" ? message : message.raw,
      });
    },
    // Some versions of genlayer-js expect signTransaction
    signTransaction: async (tx) => {
      return walletClient.signTransaction({
        account: address,
        ...tx,
      });
    },
  };

  // Listen for account changes from the wallet
  window.ethereum.on("accountsChanged", (accounts) => {
    if (accounts.length === 0) {
      disconnectWallet();
    } else if (accounts[0] !== _account?.address) {
      _account = { ..._account, address: accounts[0] };
      notifyListeners();
    }
  });

  window.ethereum.on("chainChanged", () => {
    // Reload on chain change — genlayer-js needs to reinitialize
    window.location.reload();
  });

  notifyListeners();
  return _account;
}

export function disconnectWallet() {
  _account = null;
  // Remove ethereum listeners
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
let contractAddress = localStorage.getItem("contractAddress") || null;

export function setContractAddress(address) {
  contractAddress = address;
  localStorage.setItem("contractAddress", address);
}

export function getContractAddress() {
  return contractAddress;
}

export async function callView(method, args = []) {
  if (!contractAddress) throw new Error("No contract address set. Deploy first.");
  return client.call({ contractAddress, method, args });
}

export async function callWrite(method, args = [], value = "0") {
  if (!contractAddress) throw new Error("No contract address set. Deploy first.");
  if (!_account) throw new Error("No wallet connected.");

  const tx = await client.write({
    contractAddress,
    method,
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
