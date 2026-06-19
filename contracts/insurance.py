# { "Depends": "py-genlayer:test" }

import json
from dataclasses import dataclass
from genlayer import *


@allow_storage
@dataclass
class Policy:
    id: str
    owner: str
    category: str
    premium: str
    payout: str
    is_active: bool
    has_claimed: bool
    claim_resolved: bool
    claim_approved: bool
    params: str
    claim_result: str
    created_at: str


class GenInsure(gl.Contract):
    policies: TreeMap[str, Policy]
    counter: u256

    def __init__(self):
        self.counter = u256(0)

    def _check_flight_delay(self, flight_number: str, date: str, threshold_minutes: str) -> str:
        def get_flight_result() -> str:
            url = f"https://api.aviationstack.com/v1/flights?flight_iata={flight_number}&flight_date={date}"
            web_data = gl.get_webpage(url, mode="text")

            task = f"""
Flight insurance claim verification. Check if flight {flight_number} on {date} was delayed more than {threshold_minutes} minutes.

API data: {web_data[:3000]}

Return JSON with keys: delayed (bool), actual_delay_minutes (int), flight_status (str), error (str or null).
Return ONLY valid JSON, no markdown, no extra text.
"""
            result = gl.exec_prompt(task)
            result = result.replace("```json", "").replace("```", "").strip()
            return json.dumps(json.loads(result), sort_keys=True)

        result_json = json.loads(gl.eq_principle_strict_eq(get_flight_result))
        return json.dumps(result_json)

    def _check_weather_parametric(self, lat: str, lon: str, param: str, threshold: str, comparison: str) -> str:
        def get_weather_result() -> str:
            url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&daily={param}&timezone=auto&forecast_days=2"
            web_data = gl.get_webpage(url, mode="text")

            task = f"""
Parametric weather insurance verification. Location ({lat},{lon}), check if {param} is {comparison} {threshold}.

API data: {web_data[:3000]}

Parameters: rain_sum=rainfall_mm, temperature_2m_max=max_temp_C, wind_speed_10m_max=wind_kmh, snowfall_sum=snow_cm

Return JSON with keys: triggered (bool), actual_value (float), unit (str), date (str), error (str or null).
Return ONLY valid JSON, no markdown, no extra text.
"""
            result = gl.exec_prompt(task)
            result = result.replace("```json", "").replace("```", "").strip()
            return json.dumps(json.loads(result), sort_keys=True)

        result_json = json.loads(gl.eq_principle_strict_eq(get_weather_result))
        return json.dumps(result_json)

    def _check_event_cancellation(self, event_name: str, event_date: str, venue: str) -> str:
        def get_event_result() -> str:
            search_query = f"{event_name} {venue} cancelled postponed {event_date}"
            url = f"https://www.bing.com/search?q={search_query.replace(' ', '+')}"
            web_data = gl.get_webpage(url, mode="text")

            task = f"""
Event insurance claim verification. Check if event "{event_name}" at "{venue}" on {event_date} was cancelled.

Search results: {web_data[:3000]}

Return JSON with keys: cancelled (bool), confidence (str: high/medium/low), evidence (str), error (str or null).
Return ONLY valid JSON, no markdown, no extra text.
"""
            result = gl.exec_prompt(task)
            result = result.replace("```json", "").replace("```", "").strip()
            return json.dumps(json.loads(result), sort_keys=True)

        result_json = json.loads(
            gl.eq_principle_prompt_comparative(
                get_event_result,
                principle="Verify if event was cancelled. Must agree on cancelled=true/false. Confidence may vary by one level.",
            )
        )
        return json.dumps(result_json)

    @gl.public.write
    def create_policy(self, category: str, payout: str, params: str) -> str:
        valid = ["flight_delay", "weather_parametric", "event_cancellation"]
        if category not in valid:
            raise Exception(f"Invalid category: {category}")

        parsed = json.loads(params)

        if category == "flight_delay":
            for r in ["flight_number", "date", "threshold_minutes"]:
                if r not in parsed:
                    raise Exception(f"Missing param: {r}")
        elif category == "weather_parametric":
            for r in ["lat", "lon", "param", "threshold", "comparison"]:
                if r not in parsed:
                    raise Exception(f"Missing param: {r}")
        elif category == "event_cancellation":
            for r in ["event_name", "event_date", "venue"]:
                if r not in parsed:
                    raise Exception(f"Missing param: {r}")

        sender = gl.message.sender_address
        pid = f"{category}_{self.counter}_{sender.as_hex[:8]}"

        p = Policy(
            id=pid,
            owner=sender.as_hex,
            category=category,
            premium=str(gl.message.value),
            payout=payout,
            is_active=True,
            has_claimed=False,
            claim_resolved=False,
            claim_approved=False,
            params=params,
            claim_result="",
            created_at=str(self.counter),
        )
        self.policies[pid] = p
        self.counter += u256(1)
        return pid

    @gl.public.write
    def submit_claim(self, policy_id: str) -> None:
        if policy_id not in self.policies:
            raise Exception("Policy not found")

        p = self.policies[policy_id]
        sender = gl.message.sender_address

        if p.owner != sender.as_hex:
            raise Exception("Not policy owner")
        if not p.is_active:
            raise Exception("Policy not active")
        if p.has_claimed:
            raise Exception("Already claimed")

        p.has_claimed = True
        parsed = json.loads(p.params)

        try:
            if p.category == "flight_delay":
                result = json.loads(self._check_flight_delay(
                    flight_number=parsed["flight_number"],
                    date=parsed["date"],
                    threshold_minutes=str(parsed["threshold_minutes"]),
                ))
                approved = result.get("delayed", False)
            elif p.category == "weather_parametric":
                result = json.loads(self._check_weather_parametric(
                    lat=parsed["lat"],
                    lon=parsed["lon"],
                    param=parsed["param"],
                    threshold=str(parsed["threshold"]),
                    comparison=parsed["comparison"],
                ))
                approved = result.get("triggered", False)
            elif p.category == "event_cancellation":
                result = json.loads(self._check_event_cancellation(
                    event_name=parsed["event_name"],
                    event_date=parsed["event_date"],
                    venue=parsed["venue"],
                ))
                approved = result.get("cancelled", False)
            else:
                raise Exception(f"Unknown: {p.category}")
        except Exception as e:
            p.claim_result = json.dumps({"error": str(e)})
            return

        p.claim_resolved = True
        p.claim_approved = approved
        p.claim_result = json.dumps(result)
        p.is_active = False

    @gl.public.view
    def get_policy(self, policy_id: str) -> dict:
        if policy_id not in self.policies:
            raise Exception("Policy not found")
        p = self.policies[policy_id]
        return {"id": p.id, "owner": p.owner, "category": p.category,
                "premium": p.premium, "payout": p.payout,
                "is_active": p.is_active, "has_claimed": p.has_claimed,
                "claim_resolved": p.claim_resolved, "claim_approved": p.claim_approved,
                "params": p.params, "claim_result": p.claim_result, "created_at": p.created_at}

    @gl.public.view
    def get_all_policies(self) -> dict:
        result = {}
        for k, p in self.policies.items():
            result[k] = {"id": p.id, "owner": p.owner, "category": p.category,
                         "premium": p.premium, "payout": p.payout,
                         "is_active": p.is_active, "has_claimed": p.has_claimed,
                         "claim_resolved": p.claim_resolved, "claim_approved": p.claim_approved}
        return result

    @gl.public.view
    def get_my_policies(self, owner_address: str) -> dict:
        result = {}
        for k, p in self.policies.items():
            if p.owner == owner_address:
                result[k] = {"id": p.id, "owner": p.owner, "category": p.category,
                             "premium": p.premium, "payout": p.payout,
                             "is_active": p.is_active, "has_claimed": p.has_claimed,
                             "claim_resolved": p.claim_resolved, "claim_approved": p.claim_approved}
        return result

    @gl.public.view
    def get_stats(self) -> dict:
        return {"total_policies": self.counter}
