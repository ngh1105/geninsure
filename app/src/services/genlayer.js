import { createClient, createAccount as createGenLayerAccount, generatePrivateKey } from "genlayer-js";
import { simulator } from "genlayer-js/chains";

// Contract ABI — matches the GenInsure contract methods
export const CONTRACT_ABI = {
  create_policy: {
    type: "write",
    params: ["category", "payout", "params"],
  },
  submit_claim: {
    type: "write",
    params: ["policy_id"],
  },
  get_policy: {
    type: "view",
    params: ["policy_id"],
  },
  get_all_policies: {
    type: "view",
    params: [],
  },
  get_my_policies: {
    type: "view",
    params: ["owner_address"],
  },
  get_stats: {
    type: "view",
    params: [],
  },
};

// Account management
const accountPrivateKey = localStorage.getItem("accountPrivateKey")
  ? localStorage.getItem("accountPrivateKey")
  : null;
export const account = accountPrivateKey ? createGenLayerAccount(accountPrivateKey) : null;

export const createAccount = () => {
  const newAccountPrivateKey = generatePrivateKey();
  localStorage.setItem("accountPrivateKey", newAccountPrivateKey);
  return createGenLayerAccount(newAccountPrivateKey);
};

export const removeAccount = () => {
  localStorage.removeItem("accountPrivateKey");
};

export const client = createClient({ chain: simulator, account: null });

// Contract interaction helpers
let contractAddress = localStorage.getItem("contractAddress") || null;

export const setContractAddress = (address) => {
  contractAddress = address;
  localStorage.setItem("contractAddress", address);
};

export const getContractAddress = () => contractAddress;

/**
 * Read from contract (view method)
 */
export async function callView(method, args = []) {
  if (!contractAddress) throw new Error("No contract address set. Deploy first.");
  const result = await client.call({
    contractAddress,
    method,
    args,
  });
  return result;
}

/**
 * Write to contract (state-changing method)
 */
export async function callWrite(method, args = [], value = "0") {
  if (!contractAddress) throw new Error("No contract address set. Deploy first.");
  if (!account) throw new Error("No account. Create one first.");

  const tx = await client.write({
    contractAddress,
    method,
    args,
    account,
    value,
  });

  const receipt = await client.waitForTransactionReceipt({
    hash: tx,
    status: "ACCEPTED",
    retries: 200,
  });

  if (receipt.consensus_data?.leader_receipt[0]?.execution_result !== "SUCCESS") {
    throw new Error(`Transaction failed: ${JSON.stringify(receipt)}`);
  }

  return receipt;
}
