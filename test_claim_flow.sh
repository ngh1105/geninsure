#!/usr/bin/env bash
# Full claim flow on studionet: deploy (eq_principle-fixed) → create weather policy
# (easy to trigger: temp > 0C) → submit_claim → read back claim_approved.
set -uo pipefail
export PATH="/e/node-global:$PATH"
cd /e/geninsure

genlayer network set studionet >/dev/null 2>&1

echo "═══ 1. DEPLOY (eq_principle-fixed) ═══"
DEPLOY=$(genlayer deploy --contract contracts/insurance.py 2>&1)
ADDR=$(printf '%s\n' "$DEPLOY" | grep -oE "'Contract Address': '0x[a-fA-F0-9]{40}'" | tail -1 | grep -oE "0x[a-fA-F0-9]{40}")
EXEC=$(printf '%s\n' "$DEPLOY" | grep -oE "execution_result: 'SUCCESS'" | head -1)
echo "ADDR=$ADDR"
echo "deploy_exec=$EXEC"
if [ -z "$ADDR" ] || [ -z "$EXEC" ]; then
  echo "DEPLOY FAILED — tail:"; printf '%s\n' "$DEPLOY" | tail -25; exit 1
fi
echo "$ADDR" > .studionet_addr

WPARAMS='{"lat":"10.8231","lon":"106.6297","param":"temperature_2m_max","threshold":"0","comparison":"above"}'

echo ""
echo "═══ 2. WRITE create_policy weather_parametric ═══"
WO=$(genlayer write "$ADDR" create_policy --args "weather_parametric" "100" "$WPARAMS" 2>&1)
WPID=$(printf '%s\n' "$WO" | grep -oE 'readable: ."[a-z_]+_[0-9]+_[a-z0-9_]+".' | head -1 | sed -E 's/.*"([a-z0-9_]+)".*/\1/')
if [ -z "$WPID" ]; then
  echo "WARN: WPID parse failed, using fallback (claim may target wrong policy)"
  WPID="weather_parametric_0_0x3e4616"
fi
WEX=$(printf '%s\n' "$WO" | grep -oE "execution_result: 'SUCCESS'" | head -1)
echo "WPID=$WPID"
echo "create_exec=$WEX"

echo ""
echo "═══ 3. get_policy BEFORE claim ═══"
genlayer call "$ADDR" get_policy --args "$WPID" 2>&1 | grep -iE "claim_approved|claim_resolved|has_claimed|is_active|claim_result" | head

echo ""
echo "═══ 4. WRITE submit_claim (validators + web + LLM, slow) ═══"
genlayer write "$ADDR" submit_claim --args "$WPID" 2>&1 | grep -oE "execution_result: 'SUCCESS'|execution_result: 'ERROR'" | head -3

echo ""
echo "═══ 5. get_policy AFTER claim ═══"
genlayer call "$ADDR" get_policy --args "$WPID" 2>&1 | grep -iE "claim_approved|claim_resolved|has_claimed|is_active|claim_result|triggered|delayed|cancelled" | head

echo ""
echo "═══ 6. repoint .env ═══"
sed -i "s|VITE_CONTRACT_ADDRESS=.*|VITE_CONTRACT_ADDRESS=\"$ADDR\"|" app/.env
grep VITE_CONTRACT_ADDRESS app/.env
echo "=== DONE addr=$ADDR ==="
