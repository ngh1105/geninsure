<template>
  <div class="min-h-screen bg-gray-950 text-white">
    <!-- Header -->
    <header class="border-b border-gray-800 px-6 py-4">
      <div class="max-w-6xl mx-auto flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-xl">🛡️</div>
          <div>
            <h1 class="text-xl font-bold">GenInsure</h1>
            <p class="text-xs text-gray-400">Decentralized Insurance Oracle on GenLayer</p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <div v-if="account" class="flex items-center gap-2">
            <span class="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
            <span class="text-sm text-gray-300 font-mono">{{ shortAddress }}</span>
            <button @click="disconnect" class="text-xs text-gray-500 hover:text-red-400 ml-2">Disconnect</button>
          </div>
          <button
            v-else
            @click="connectWallet"
            class="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-6xl mx-auto px-6 py-8">
      <!-- Stats Bar -->
      <div v-if="stats" class="grid grid-cols-3 gap-4 mb-8">
        <div class="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <div class="text-2xl font-bold text-emerald-400">{{ stats.total_policies }}</div>
          <div class="text-xs text-gray-400 mt-1">Total Policies</div>
        </div>
        <div class="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <div class="text-2xl font-bold text-blue-400">{{ stats.total_premiums }}</div>
          <div class="text-xs text-gray-400 mt-1">Total Premiums</div>
        </div>
        <div class="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <div class="text-2xl font-bold text-purple-400">{{ stats.total_payouts }}</div>
          <div class="text-xs text-gray-400 mt-1">Total Payouts</div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="flex gap-2 mb-6 border-b border-gray-800">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          :class="[
            'px-4 py-2 text-sm font-medium rounded-t-lg transition',
            activeTab === tab.id
              ? 'bg-gray-900 text-white border border-gray-800 border-b-gray-900 -mb-px'
              : 'text-gray-500 hover:text-gray-300'
          ]"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Tab Content -->
      <!-- CREATE POLICY -->
      <div v-if="activeTab === 'create'" class="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 class="text-lg font-semibold mb-4">Create Insurance Policy</h2>
        <p v-if="!account" class="text-amber-400 text-sm mb-4">⚠️ Connect your wallet first to create a policy.</p>

        <!-- Category Selector -->
        <div class="grid grid-cols-3 gap-3 mb-6">
          <button
            v-for="cat in categories"
            :key="cat.id"
            @click="selectedCategory = cat.id; resetForm()"
            :class="[
              'p-4 rounded-xl border-2 text-left transition',
              selectedCategory === cat.id
                ? 'border-emerald-500 bg-emerald-500/10'
                : 'border-gray-700 hover:border-gray-500 bg-gray-800/50'
            ]"
          >
            <div class="text-2xl mb-1">{{ cat.icon }}</div>
            <div class="font-medium text-sm">{{ cat.label }}</div>
            <div class="text-xs text-gray-400 mt-1">{{ cat.desc }}</div>
          </button>
        </div>

        <!-- Category-specific form -->
        <div v-if="selectedCategory" class="space-y-4">
          <!-- Flight Delay Form -->
          <div v-if="selectedCategory === 'flight_delay'" class="space-y-3">
            <div>
              <label class="block text-sm text-gray-400 mb-1">Flight Number (IATA)</label>
              <input v-model="form.flight_number" placeholder="e.g. VN123" class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none" />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm text-gray-400 mb-1">Flight Date</label>
                <input v-model="form.date" type="date" class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none" />
              </div>
              <div>
                <label class="block text-sm text-gray-400 mb-1">Delay Threshold (minutes)</label>
                <input v-model="form.threshold_minutes" type="number" placeholder="60" class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none" />
              </div>
            </div>
          </div>

          <!-- Weather Parametric Form -->
          <div v-if="selectedCategory === 'weather_parametric'" class="space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm text-gray-400 mb-1">Latitude</label>
                <input v-model="form.lat" placeholder="10.8231" class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none" />
              </div>
              <div>
                <label class="block text-sm text-gray-400 mb-1">Longitude</label>
                <input v-model="form.lon" placeholder="106.6297" class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none" />
              </div>
            </div>
            <div>
              <label class="block text-sm text-gray-400 mb-1">Weather Parameter</label>
              <select v-model="form.param" class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none">
                <option value="">Select parameter...</option>
                <option value="rain_sum">Rainfall (mm)</option>
                <option value="temperature_2m_max">Max Temperature (°C)</option>
                <option value="wind_speed_10m_max">Wind Speed (km/h)</option>
                <option value="snowfall_sum">Snowfall (cm)</option>
              </select>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm text-gray-400 mb-1">Comparison</label>
                <select v-model="form.comparison" class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none">
                  <option value="above">Above</option>
                  <option value="below">Below</option>
                </select>
              </div>
              <div>
                <label class="block text-sm text-gray-400 mb-1">Threshold Value</label>
                <input v-model="form.threshold" type="number" step="0.1" placeholder="50.0" class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none" />
              </div>
            </div>
          </div>

          <!-- Event Cancellation Form -->
          <div v-if="selectedCategory === 'event_cancellation'" class="space-y-3">
            <div>
              <label class="block text-sm text-gray-400 mb-1">Event Name</label>
              <input v-model="form.event_name" placeholder="e.g. Tomorrowland 2026" class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none" />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm text-gray-400 mb-1">Event Date</label>
                <input v-model="form.event_date" type="date" class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none" />
              </div>
              <div>
                <label class="block text-sm text-gray-400 mb-1">Venue</label>
                <input v-model="form.venue" placeholder="e.g. Madison Square Garden" class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none" />
              </div>
            </div>
          </div>

          <!-- Payout & Premium -->
          <div class="grid grid-cols-2 gap-3 pt-2 border-t border-gray-800">
            <div>
              <label class="block text-sm text-gray-400 mb-1">Payout Amount (wei)</label>
              <input v-model="form.payout" type="number" placeholder="100" class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none" />
            </div>
            <div>
              <label class="block text-sm text-gray-400 mb-1">Premium (wei, sent with tx)</label>
              <input v-model="form.premium" type="number" placeholder="10" class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none" />
            </div>
          </div>

          <button
            @click="createPolicy"
            :disabled="loading || !account"
            class="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 py-3 rounded-lg font-medium transition mt-4"
          >
            <span v-if="loading">⏳ Creating policy...</span>
            <span v-else>🛡️ Create Policy (Pay {{ form.premium || 0 }} wei premium)</span>
          </button>
        </div>

        <!-- No category selected -->
        <div v-else class="text-center py-8 text-gray-500">
          👆 Select an insurance category above to get started
        </div>
      </div>

      <!-- MY POLICIES -->
      <div v-if="activeTab === 'policies'" class="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold">My Policies</h2>
          <button @click="refreshPolicies" class="text-sm text-gray-400 hover:text-white transition">🔄 Refresh</button>
        </div>

        <div v-if="!account" class="text-center py-8 text-gray-500">
          Connect your wallet to view your policies
        </div>

        <div v-else-if="loadingPolicies" class="text-center py-8 text-gray-400">
          Loading policies...
        </div>

        <div v-else-if="myPolicies.length === 0" class="text-center py-8 text-gray-500">
          <div class="text-3xl mb-2">📋</div>
          <p>No policies yet</p>
          <p class="text-sm mt-1">Create your first insurance policy to get started</p>
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="policy in myPolicies"
            :key="policy.id"
            :class="[
              'border rounded-xl p-4',
              policy.claim_approved ? 'border-emerald-500/50 bg-emerald-500/5' :
              policy.claim_resolved && !policy.claim_approved ? 'border-red-500/50 bg-red-500/5' :
              policy.has_claimed ? 'border-amber-500/50 bg-amber-500/5' :
              'border-gray-700 bg-gray-800/30'
            ]"
          >
            <div class="flex items-start justify-between">
              <div>
                <div class="flex items-center gap-2">
                  <span class="text-lg">{{ getCategoryIcon(policy.category) }}</span>
                  <span class="font-medium">{{ getCategoryLabel(policy.category) }}</span>
                  <span
                    :class="[
                      'text-xs px-2 py-0.5 rounded-full',
                      policy.claim_approved ? 'bg-emerald-500/20 text-emerald-400' :
                      policy.claim_resolved && !policy.claim_approved ? 'bg-red-500/20 text-red-400' :
                      policy.has_claimed ? 'bg-amber-500/20 text-amber-400' :
                      'bg-blue-500/20 text-blue-400'
                    ]"
                  >
                    {{ policy.claim_approved ? '✅ Approved' : policy.claim_resolved && !policy.claim_approved ? '❌ Denied' : policy.has_claimed ? '⏳ Pending' : 'Active' }}
                  </span>
                </div>
                <div class="text-xs text-gray-500 mt-1 font-mono">{{ policy.id }}</div>
                <div class="text-xs text-gray-400 mt-2">{{ formatParams(policy) }}</div>
              </div>
              <div class="text-right">
                <div class="text-sm font-medium">{{ policy.payout }} wei</div>
                <div class="text-xs text-gray-500">Payout</div>
                <div class="text-xs text-gray-600 mt-1">Premium: {{ policy.premium }} wei</div>
              </div>
            </div>

            <!-- Claim result details -->
            <div v-if="policy.claim_resolved && policy.claim_result" class="mt-3 pt-3 border-t border-gray-700">
              <div class="text-xs text-gray-400">Claim Result:</div>
              <pre class="text-xs text-gray-300 mt-1 bg-gray-950 p-2 rounded overflow-x-auto">{{ formatJson(policy.claim_result) }}</pre>
            </div>

            <!-- Submit claim button -->
            <button
              v-if="policy.is_active && !policy.has_claimed"
              @click="submitClaim(policy.id)"
              :disabled="loading"
              class="mt-3 w-full bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-600/30 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
            >
              {{ loading ? '⏳ Processing...' : '📝 Submit Claim (AI Verification)' }}
            </button>
          </div>
        </div>
      </div>

      <!-- ALL POLICIES -->
      <div v-if="activeTab === 'all'" class="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold">All Policies (Platform)</h2>
          <button @click="loadAllPolicies" class="text-sm text-gray-400 hover:text-white transition">🔄 Refresh</button>
        </div>

        <div v-if="loadingPolicies" class="text-center py-8 text-gray-400">Loading...</div>

        <div v-else-if="allPolicies.length === 0" class="text-center py-8 text-gray-500">
          <div class="text-3xl mb-2">🌐</div>
          <p>No policies on the platform yet</p>
        </div>

        <div v-else class="space-y-2">
          <div
            v-for="policy in allPolicies"
            :key="policy.id"
            class="border border-gray-700 rounded-lg p-3 flex items-center justify-between bg-gray-800/30"
          >
            <div>
              <div class="flex items-center gap-2">
                <span>{{ getCategoryIcon(policy.category) }}</span>
                <span class="text-sm font-medium">{{ getCategoryLabel(policy.category) }}</span>
                <span
                  :class="[
                    'text-xs px-2 py-0.5 rounded-full',
                    policy.claim_approved ? 'bg-emerald-500/20 text-emerald-400' :
                    policy.claim_resolved && !policy.claim_approved ? 'bg-red-500/20 text-red-400' :
                    'bg-blue-500/20 text-blue-400'
                  ]"
                >
                  {{ statusLabel(policy) }}
                </span>
              </div>
              <div class="text-xs text-gray-500 mt-1 font-mono">{{ shortHash(policy.owner) }}</div>
            </div>
            <div class="text-right text-xs">
              <div>Payout: <span class="text-white font-medium">{{ policy.payout }}</span></div>
              <div class="text-gray-500">Premium: {{ policy.premium }}</div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Tx Status Toast -->
    <div
      v-if="toast"
      :class="[
        'fixed bottom-6 right-6 px-4 py-3 rounded-lg text-sm font-medium shadow-lg border transition-all',
        toast.type === 'success' ? 'bg-emerald-900/90 border-emerald-600 text-emerald-200' :
        toast.type === 'error' ? 'bg-red-900/90 border-red-600 text-red-200' :
        'bg-gray-800/90 border-gray-600 text-gray-200'
      ]"
    >
      {{ toast.message }}
      <button @click="toast = null" class="ml-3 text-gray-400 hover:text-white">&times;</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import {
  client, account, createAccount, removeAccount,
  setContractAddress, getContractAddress,
  callView, callWrite, CONTRACT_ABI
} from "../services/genlayer.js";

// State
const activeTab = ref("create");
const selectedCategory = ref("");
const loading = ref(false);
const loadingPolicies = ref(false);
const myPolicies = ref([]);
const allPolicies = ref([]);
const stats = ref(null);
const toast = ref(null);

// Form state
const form = ref({});

const resetForm = () => {
  form.value = {
    flight_number: "VN123",
    date: "2026-06-20",
    threshold_minutes: 60,
    lat: "10.8231",
    lon: "106.6297",
    param: "rain_sum",
    comparison: "above",
    threshold: 50.0,
    event_name: "",
    event_date: "",
    venue: "",
    payout: 100,
    premium: 10,
  };
};

const categories = [
  { id: "flight_delay", icon: "✈️", label: "Flight Delay", desc: "Insure against flight delays. AI checks real flight status." },
  { id: "weather_parametric", icon: "🌧️", label: "Weather Parametric", desc: "Auto-payout when weather thresholds are met." },
  { id: "event_cancellation", icon: "🎪", label: "Event Cancellation", desc: "Protect ticket purchases. AI verifies cancellations." },
];

const tabs = [
  { id: "create", label: "📝 Create Policy" },
  { id: "policies", label: "📋 My Policies" },
  { id: "all", label: "🌐 All Policies" },
];

// Computed
const shortAddress = computed(() => {
  if (!account) return "";
  const addr = account.address;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
});

// Methods
const showToast = (message, type = "info") => {
  toast.value = { message, type };
  setTimeout(() => { toast.value = null; }, 5000);
};

const connectWallet = () => {
  const acct = createAccount();
  showToast(`Wallet connected: ${acct.address.slice(0, 10)}...`, "success");
  refreshAll();
};

const disconnect = () => {
  removeAccount();
  showToast("Wallet disconnected", "info");
  myPolicies.value = [];
  window.location.reload();
};

const getCategoryIcon = (cat) => {
  const found = categories.find(c => c.id === cat);
  return found ? found.icon : "📋";
};

const getCategoryLabel = (cat) => {
  const found = categories.find(c => c.id === cat);
  return found ? found.label : cat;
};

const statusLabel = (p) => {
  if (p.claim_approved) return "✅ Approved";
  if (p.claim_resolved && !p.claim_approved) return "❌ Denied";
  if (p.has_claimed) return "⏳ Pending";
  return "Active";
};

const shortHash = (hash) => {
  if (!hash) return "";
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
};

const formatParams = (policy) => {
  try {
    const p = JSON.parse(policy.params);
    if (policy.category === "flight_delay") {
      return `Flight ${p.flight_number} on ${p.date} | Threshold: ${p.threshold_minutes}min delay`;
    } else if (policy.category === "weather_parametric") {
      return `Location (${p.lat}, ${p.lon}) | ${p.param} ${p.comparison} ${p.threshold}`;
    } else if (policy.category === "event_cancellation") {
      return `${p.event_name} at ${p.venue} | ${p.event_date}`;
    }
  } catch { return policy.params; }
  return policy.params;
};

const formatJson = (str) => {
  try {
    return JSON.stringify(JSON.parse(str), null, 2);
  } catch {
    return str;
  }
};

// Actions
const createPolicy = async () => {
  if (!account) {
    showToast("Connect wallet first", "error");
    return;
  }
  if (!getContractAddress()) {
    showToast("No contract deployed. Deploy first.", "error");
    return;
  }

  loading.value = true;
  try {
    let params = {};
    if (selectedCategory.value === "flight_delay") {
      params = {
        flight_number: form.value.flight_number,
        date: form.value.date,
        threshold_minutes: parseInt(form.value.threshold_minutes) || 60,
      };
    } else if (selectedCategory.value === "weather_parametric") {
      params = {
        lat: form.value.lat,
        lon: form.value.lon,
        param: form.value.param,
        threshold: parseFloat(form.value.threshold) || 50.0,
        comparison: form.value.comparison,
      };
    } else if (selectedCategory.value === "event_cancellation") {
      params = {
        event_name: form.value.event_name,
        event_date: form.value.event_date,
        venue: form.value.venue,
      };
    }

    const payout = form.value.payout?.toString() || "100";
    const premium = form.value.premium?.toString() || "10";

    await callWrite(
      "create_policy",
      [selectedCategory.value, payout, JSON.stringify(params)],
      premium
    );

    showToast("✅ Policy created successfully!", "success");
    resetForm();
    await refreshAll();
  } catch (err) {
    console.error("Create policy error:", err);
    showToast(`❌ Failed: ${err.message || err}`, "error");
  } finally {
    loading.value = false;
  }
};

const submitClaim = async (policyId) => {
  if (!account) {
    showToast("Connect wallet first", "error");
    return;
  }

  loading.value = true;
  try {
    await callWrite("submit_claim", [policyId]);
    showToast("✅ Claim submitted! AI validators are verifying...", "success");
    await refreshAll();
  } catch (err) {
    console.error("Submit claim error:", err);
    showToast(`❌ Failed: ${err.message || err}`, "error");
  } finally {
    loading.value = false;
  }
};

const loadMyPolicies = async () => {
  if (!account || !getContractAddress()) return;
  loadingPolicies.value = true;
  try {
    const result = await callView("get_my_policies", [account.address]);
    myPolicies.value = Object.values(result || {}).sort((a, b) =>
      b.created_at?.localeCompare(a.created_at || "") || 0
    );
  } catch (err) {
    console.error("Load policies error:", err);
  } finally {
    loadingPolicies.value = false;
  }
};

const loadAllPolicies = async () => {
  if (!getContractAddress()) return;
  loadingPolicies.value = true;
  try {
    const result = await callView("get_all_policies", []);
    allPolicies.value = Object.values(result || {}).sort((a, b) =>
      b.created_at?.localeCompare(a.created_at || "") || 0
    );
  } catch (err) {
    console.error("Load all policies error:", err);
  } finally {
    loadingPolicies.value = false;
  }
};

const loadStats = async () => {
  if (!getContractAddress()) return;
  try {
    stats.value = await callView("get_stats", []);
  } catch (err) {
    console.error("Load stats error:", err);
  }
};

const refreshPolicies = async () => {
  await loadMyPolicies();
  showToast("Policies refreshed", "success");
};

const refreshAll = async () => {
  await Promise.all([loadMyPolicies(), loadAllPolicies(), loadStats()]);
};

// Init
onMounted(async () => {
  resetForm();
  // Check if there's a saved contract address
  const savedAddress = getContractAddress();
  if (savedAddress) {
    await refreshAll();
  }
});
</script>
