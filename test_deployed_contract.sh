#!/usr/bin/env bash
# Test deployed GenInsure contract on studionet.
# Does NOT deploy. It reads current state, writes one policy, then reads again.

set -euo pipefail

export PATH="/e/node-global:$PATH"

CONTRACT_ADDR="${1:-0xdC6b8791455b893Aa207d3610F0AcD08c98A4Bac}"
ACCOUNT_ADDR="0x3e4616e7e1cc34f3080d49c769052017b0fd3e35"
PARAMS='{"flight_number":"VN123","date":"2026-06-20","threshold_minutes":60}'

cd /e/geninsure

echo "=== GenLayer CLI ==="
genlayer --version

echo "=== Network ==="
genlayer network set studionet

echo "=== Contract ==="
echo "$CONTRACT_ADDR"
echo ""

echo "=== READ: get_stats before ==="
genlayer call "$CONTRACT_ADDR" get_stats || true
echo ""

echo "=== READ: get_all_policies before ==="
genlayer call "$CONTRACT_ADDR" get_all_policies || true
echo ""

echo "=== WRITE: create_policy flight_delay ==="
WRITE_OUTPUT=$(genlayer write "$CONTRACT_ADDR" create_policy --args "flight_delay" "100" "$PARAMS" 2>&1 || true)
echo "$WRITE_OUTPUT"
WRITE_TX=$(printf '%s\n' "$WRITE_OUTPUT" | grep -oE '0x[a-fA-F0-9]{64}' | head -1 || true)
echo "WRITE_TX=$WRITE_TX"
echo ""

if [ -n "$WRITE_TX" ]; then
  echo "=== RECEIPT: create_policy tx ==="
  genlayer receipt "$WRITE_TX" || true
  echo ""
fi

echo "=== READ: get_stats after ==="
genlayer call "$CONTRACT_ADDR" get_stats || true
echo ""

echo "=== READ: get_my_policies ==="
genlayer call "$CONTRACT_ADDR" get_my_policies --args "$ACCOUNT_ADDR" || true
echo ""

echo "=== READ: get_all_policies after ==="
genlayer call "$CONTRACT_ADDR" get_all_policies || true
echo ""

echo "=== Done ==="
