#!/usr/bin/env bash
# ═══════════════════════════════════════════════════
#  GenInsure Contract Test — studionet
#  Dùng: genlayer CLI + genlayer-js (read-only)
# ═══════════════════════════════════════════════════
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONTRACT="$SCRIPT_DIR/contracts/insurance.py"

echo "🌐 Network: GenLayer Studio Network (studionet)"
echo "📦 Contract: $CONTRACT"
echo ""

# ── 1. DEPLOY ────────────────────────────────────
echo "══════════════════════════════════════════════"
echo "  1. DEPLOY CONTRACT"
echo "══════════════════════════════════════════════"
echo ""

DEPLOY_OUTPUT=$(genlayer deploy --contract "$CONTRACT" 2>&1)
echo "$DEPLOY_OUTPUT"

# Extract contract address from deploy output
CONTRACT_ADDR=$(echo "$DEPLOY_OUTPUT" | grep -oP "0x[a-fA-F0-9]{40}" | tail -1)
echo ""
echo "📍 Contract Address: $CONTRACT_ADDR"

if [ -z "$CONTRACT_ADDR" ]; then
  echo "❌ Deploy failed — cannot extract contract address"
  exit 1
fi

# ── 2. READ (view methods) ───────────────────────
echo ""
echo "══════════════════════════════════════════════"
echo "  2. READ CONTRACT STATE"
echo "══════════════════════════════════════════════"
echo ""

echo "📖 get_stats:"
genlayer call "$CONTRACT_ADDR" get_stats 2>&1
echo ""

echo "📖 get_all_policies:"
genlayer call "$CONTRACT_ADDR" get_all_policies 2>&1
echo ""

# ── 3. WRITE (create policy) ─────────────────────
echo ""
echo "══════════════════════════════════════════════"
echo "  3. WRITE: CREATE POLICIES"
echo "══════════════════════════════════════════════"
echo ""

echo "✍️  Creating Flight Delay policy..."
FLIGHT_PARAMS='{"flight_number":"VN123","date":"2026-06-20","threshold_minutes":60}'
genlayer write "$CONTRACT_ADDR" create_policy \
  --args "flight_delay" "100" "$FLIGHT_PARAMS" 2>&1
echo ""

echo "✍️  Creating Weather Parametric policy..."
WEATHER_PARAMS='{"lat":"10.8231","lon":"106.6297","param":"rain_sum","threshold":50.0,"comparison":"above"}'
genlayer write "$CONTRACT_ADDR" create_policy \
  --args "weather_parametric" "200" "$WEATHER_PARAMS" 2>&1
echo ""

echo "✍️  Creating Event Cancellation policy..."
EVENT_PARAMS='{"event_name":"Music Fest 2026","event_date":"2026-06-20","venue":"National Stadium"}'
genlayer write "$CONTRACT_ADDR" create_policy \
  --args "event_cancellation" "300" "$EVENT_PARAMS" 2>&1
echo ""

# ── 4. READ AGAIN ─────────────────────────────────
echo ""
echo "══════════════════════════════════════════════"
echo "  4. READ AFTER WRITES"
echo "══════════════════════════════════════════════"
echo ""

echo "📖 get_stats:"
genlayer call "$CONTRACT_ADDR" get_stats 2>&1
echo ""

echo "📖 get_all_policies:"
genlayer call "$CONTRACT_ADDR" get_all_policies 2>&1
echo ""

echo ""
echo "══════════════════════════════════════════════"
echo "  ✅ Test complete!"
echo "  Contract: $CONTRACT_ADDR"
echo "══════════════════════════════════════════════"
