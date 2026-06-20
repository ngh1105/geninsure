#!/usr/bin/env bash
# Submit claims for all active (not-yet-claimed) policies on the deployed contract.
# Does NOT deploy. Uses addr from .studionet_addr (or $1 override).
# Slow: each claim runs eq_principle consensus (validator + web + LLM).
set -uo pipefail
export PATH="/e/node-global:$PATH"
cd /e/geninsure

genlayer network set studionet >/dev/null 2>&1

ADDR="${1:-$(cat .studionet_addr 2>/dev/null)}"
if [ -z "$ADDR" ]; then
  echo "No addr: pass as arg or set .studionet_addr"; exit 1
fi
echo "═══ submit_claims → $ADDR ═══"
echo ""

# Pull all policy ids, then for each check has_claimed via get_policy.
ALL=$(genlayer call "$ADDR" get_all_policies 2>&1)
PIDS=$(printf '%s\n' "$ALL" | grep -oE "[a-z_]+_[0-9]+_[a-z0-9]+" | sort -u)

if [ -z "$PIDS" ]; then
  echo "No policies found"; exit 1
fi
echo "Found policies:"; printf '%s\n' "$PIDS" | sed 's/^/  /'
echo ""

ok=0; skip=0; fail=0
while IFS= read -r pid; do
  [ -z "$pid" ] && continue
  # Already claimed? check get_policy has_claimed field
  already=$(genlayer call "$ADDR" get_policy --args "$pid" 2>&1 | grep -oE "has_claimed: (true|false)" | head -1)
  if printf '%s' "$already" | grep -q "has_claimed: true"; then
    printf '%-40s SKIP (already claimed)\n' "$pid"; skip=$((skip+1)); continue
  fi

  printf '%-40s submitting...' "$pid"
  res=$(genlayer write "$ADDR" submit_claim --args "$pid" 2>&1)
  verdict=$(printf '%s\n' "$res" | grep -oE "execution_result: 'SUCCESS'|execution_result: 'ERROR'" | head -1)
  # read back claim_approved
  approved=$(genlayer call "$ADDR" get_policy --args "$pid" 2>&1 | grep -oE "claim_approved: (true|false)" | head -1)
  if printf '%s' "$verdict" | grep -q SUCCESS; then
    ok=$((ok+1))
    printf ' %s  %s\n' "${verdict:-?}" "${approved:-?}"
  else
    fail=$((fail+1))
    printf ' %s  %s\n' "${verdict:-NO-RESULT}" "${approved:-?}"
  fi
done <<< "$PIDS"

echo ""
echo "═══ summary: success=$ok  skipped=$skip  failed=$fail ═══"
echo ""
echo "═══ get_stats ═══"
genlayer call "$ADDR" get_stats 2>&1 | grep -iE "total_policies|total_premiums|total_payouts" | head
echo "=== DONE ==="
