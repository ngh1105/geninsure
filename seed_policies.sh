#!/usr/bin/env bash
# Seed demo data: create policies across all 3 categories via create_policy.
# Does NOT deploy. Uses addr from .studionet_addr (or $1 override).
set -uo pipefail
export PATH="/e/node-global:$PATH"
cd /e/geninsure

genlayer network set studionet >/dev/null 2>&1

ADDR="${1:-$(cat .studionet_addr 2>/dev/null)}"
if [ -z "$ADDR" ]; then
  echo "No addr: pass as arg or set .studionet_addr"; exit 1
fi
echo "═══ seed → $ADDR ═══"
echo ""

create() {  # create <category> <payout> <params-json> <label>
  local category="$1" payout="$2" params="$3" label="$4"
  local out pid exec
  out=$(genlayer write "$ADDR" create_policy --args "$category" "$payout" "$params" 2>&1)
  pid=$(printf '%s\n' "$out" | grep -oE '"[a-z_]+_[0-9]+_[a-z0-9_]+"' | head -1 | tr -d '"')
  exec=$(printf '%s\n' "$out" | grep -oE "execution_result: 'SUCCESS'" | head -1)
  printf '%-22s payout=%-5s %s  pid=%s\n' "$label" "$payout" "${exec:-FAILED}" "${pid:-(none)}"
}

echo "── weather_parametric ──"
create weather_parametric 100 '{"lat":"10.8231","lon":"106.6297","param":"temperature_2m_max","threshold":"0","comparison":"above"}'    "HCMC hot"
create weather_parametric 150 '{"lat":"21.0285","lon":"105.8542","param":"rain_sum","threshold":"50","comparison":"above"}'             "Hanoi rain"
create weather_parametric 200 '{"lat":"35.6762","lon":"139.6503","param":"wind_speed_10m_max","threshold":"72","comparison":"above"}'   "Tokyo wind"
create weather_parametric 120 '{"lat":"40.7128","lon":"-74.0060","param":"snowfall_sum","threshold":"25","comparison":"above"}'         "NYC snow"

echo ""
echo "── flight_delay ──"
create flight_delay 100 '{"flight_number":"VN123","date":"2026-06-20","threshold_minutes":"60"}'   "VN123"
create flight_delay 100 '{"flight_number":"VJ456","date":"2026-06-21","threshold_minutes":"120"}'  "VJ456"
create flight_delay 100 '{"flight_number":"QH789","date":"2026-06-22","threshold_minutes":"30"}'   "QH789"

echo ""
echo "── event_cancellation ──"
create event_cancellation 300 '{"event_name":"Tech Summit","event_date":"2026-07-15","venue":"SECC HCMC"}'      "Tech Summit"
create event_cancellation 250 '{"event_name":"Music Festival","event_date":"2026-08-01","venue":"My Dinh Hanoi"}' "Music Fest"

echo ""
echo "═══ get_stats ═══"
genlayer call "$ADDR" get_stats 2>&1 | grep -iE "total_policies|total_premiums|total_payouts" | head
echo "=== DONE ==="
