# { "Depends": "py-genlayer:test" }

import json
from dataclasses import dataclass
from genlayer import *


@allow_storage
@dataclass
class Policy:
    id: str
    owner: str
    category: str  # "flight_delay", "weather_parametric", "event_cancellation"
    premium: u256
    payout: u256
    is_active: bool
    has_claimed: bool
    claim_resolved: bool
    claim_approved: bool
    params: str
    claim_result: str
    created_at: str


class GenInsure(gl.Contract):
    policies: TreeMap[str, Policy]
    policy_count: u256
    total_premiums: u256
    total_payouts: u256

    def __init__(self):
        self.policy_count = u256(0)
        self.total_premiums = u256(0)
        self.total_payouts = u256(0)

    def _check_flight_delay(self, flight_number: str, date: str, threshold_minutes: int) -> dict:
        def get_flight_result() -> str:
            url = f"https://api.aviationstack.com/v1/flights?flight_iata={flight_number}&flight_date={date}"
            web_data = gl.get_webpage(url, mode="text")

            task = f"""
You are a flight insurance claims adjuster. Determine if this flight was delayed beyond the threshold.

Flight number: {flight_number}
Flight date: {date}
Delay threshold (minutes): {threshold_minutes}

API response data:
{web_data[:3000]}

Extract the actual departure delay in minutes from the data.
- If the flight was delayed more than {threshold_minutes} minutes: set "delayed" to true
- If delayed less or on time: set "delayed" to false
- If data is unavailable or flight not found: set "delayed" to false, "error" to a description

Respond in JSON:
{{
    "delayed": bool,
    "actual_delay_minutes": int,
    "flight_status": str,
    "error": str or null
}}
It is mandatory that you respond only using the JSON format above,
nothing else. Don't include any other words or characters,
your output must be only JSON without any formatting prefix or suffix.
This result should be perfectly parsable by a JSON parser without errors.
            """
            result = gl.exec_prompt(task).replace("```json", "").replace("```", "")
            return json.dumps(json.loads(result), sort_keys=True)

        result_json = json.loads(gl.eq_principle_strict_eq(get_flight_result))
        return result_json

    def _check_weather_parametric(self, lat: str, lon: str, param: str, threshold: float, comparison: str) -> dict:
        def get_weather_result() -> str:
            url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&daily={param}&timezone=auto&forecast_days=2"
            web_data = gl.get_webpage(url, mode="text")

            task = f"""
You are a parametric weather insurance adjuster. Check if the weather condition was met.

Location: lat={lat}, lon={lon}
Weather parameter: {param}
Threshold: {comparison} {threshold}

Weather API data:
{web_data[:3000]}

Check if the weather parameter {param} was {comparison} {threshold} based on the data.
- "rain_sum" means total daily rainfall in mm
- "temperature_2m_max" means max daily temperature in C
- "wind_speed_10m_max" means max wind speed in km/h
- "snowfall_sum" means total daily snowfall in cm

Respond in JSON:
{{
    "triggered": bool,
    "actual_value": float,
    "unit": str,
    "date": str,
    "error": str or null
}}
It is mandatory that you respond only using the JSON format above,
nothing else. Don't include any other words or characters,
your output must be only JSON without any formatting prefix or suffix.
This result should be perfectly parsable by a JSON parser without errors.
            """
            result = gl.exec_prompt(task).replace("```json", "").replace("```", "")
            return json.dumps(json.loads(result), sort_keys=True)

        result_json = json.loads(gl.eq_principle_strict_eq(get_weather_result))
        return result_json

    def _check_event_cancellation(self, event_name: str, event_date: str, venue: str) -> dict:
        def get_event_result() -> str:
            search_query = f"{event_name} {venue} cancelled postponed {event_date}"
            url = f"https://www.bing.com/search?q={search_query.replace(' ', '+')}"
            web_data = gl.get_webpage(url, mode="text")

            task = f"""
You are an event insurance claims adjuster. Determine if this event was cancelled or postponed.

Event: {event_name}
Date: {event_date}
Venue: {venue}

Search results content:
{web_data[:3000]}

Analyze the search results for evidence that the event was cancelled or postponed.
Key signals: "cancelled", "postponed", "rescheduled", "called off", "no longer taking place"

Respond in JSON:
{{
    "cancelled": bool,
    "confidence": str,
    "evidence": str,
    "error": str or null
}}
It is mandatory that you respond only using the JSON format above,
nothing else. Don't include any other words or characters,
your output must be only JSON without any formatting prefix or suffix.
This result should be perfectly parsable by a JSON parser without errors.
            """
            result = gl.exec_prompt(task).replace("```json", "").replace("```", "")
            return json.dumps(json.loads(result), sort_keys=True)

        result_json = json.loads(
            gl.eq_principle_prompt_comparative(
                get_event_result,
                principle="Verify if the event was cancelled or postponed based on search results. Must agree on whether the event was cancelled (true/false). Confidence should be within one level.",
            )
        )
        return result_json

    @gl.public.write
    def create_policy(
        self,
        category: str,
        payout: u256,
        params: str,
    ) -> str:
        valid_categories = ["flight_delay", "weather_parametric", "event_cancellation"]
        if category not in valid_categories:
            raise Exception(f"Invalid category. Must be one of: {', '.join(valid_categories)}")

        try:
            parsed_params = json.loads(params)
        except Exception:
            raise Exception("Invalid params JSON")

        if category == "flight_delay":
            for r in ["flight_number", "date", "threshold_minutes"]:
                if r not in parsed_params:
                    raise Exception(f"Missing required param: {r}")
        elif category == "weather_parametric":
            for r in ["lat", "lon", "param", "threshold", "comparison"]:
                if r not in parsed_params:
                    raise Exception(f"Missing required param: {r}")
            if parsed_params["comparison"] not in ["above", "below"]:
                raise Exception("comparison must be 'above' or 'below'")
        elif category == "event_cancellation":
            for r in ["event_name", "event_date", "venue"]:
                if r not in parsed_params:
                    raise Exception(f"Missing required param: {r}")

        sender_address = gl.message.sender_address
        policy_id = f"{category}_{self.policy_count}_{sender_address.as_hex[:8]}"

        policy = Policy(
            id=policy_id,
            owner=sender_address.as_hex,
            category=category,
            premium=gl.message.value,
            payout=payout,
            is_active=True,
            has_claimed=False,
            claim_resolved=False,
            claim_approved=False,
            params=params,
            claim_result="",
            created_at=str(self.policy_count),
        )

        self.policies[policy_id] = policy
        self.policy_count += u256(1)
        self.total_premiums += gl.message.value

        return policy_id

    @gl.public.write
    def submit_claim(self, policy_id: str) -> None:
        if policy_id not in self.policies:
            raise Exception("Policy not found")

        policy = self.policies[policy_id]
        sender = gl.message.sender_address

        if policy.owner != sender.as_hex:
            raise Exception("Only the policy owner can submit a claim")

        if not policy.is_active:
            raise Exception("Policy is not active")

        if policy.has_claimed:
            raise Exception("Claim already submitted")

        if policy.claim_resolved:
            raise Exception("Claim already resolved")

        policy.has_claimed = True

        parsed_params = json.loads(policy.params)

        try:
            if policy.category == "flight_delay":
                result = self._check_flight_delay(
                    flight_number=parsed_params["flight_number"],
                    date=parsed_params["date"],
                    threshold_minutes=int(parsed_params["threshold_minutes"]),
                )
                approved = result.get("delayed", False)

            elif policy.category == "weather_parametric":
                result = self._check_weather_parametric(
                    lat=parsed_params["lat"],
                    lon=parsed_params["lon"],
                    param=parsed_params["param"],
                    threshold=float(parsed_params["threshold"]),
                    comparison=parsed_params["comparison"],
                )
                approved = result.get("triggered", False)

            elif policy.category == "event_cancellation":
                result = self._check_event_cancellation(
                    event_name=parsed_params["event_name"],
                    event_date=parsed_params["event_date"],
                    venue=parsed_params["venue"],
                )
                approved = result.get("cancelled", False)

            else:
                raise Exception(f"Unknown category: {policy.category}")

        except Exception as e:
            policy.claim_result = json.dumps({"error": str(e)})
            return

        policy.claim_resolved = True
        policy.claim_approved = approved
        policy.claim_result = json.dumps(result)
        policy.is_active = False

        if approved:
            self.total_payouts += policy.payout

    @gl.public.view
    def get_policy(self, policy_id: str) -> dict:
        if policy_id not in self.policies:
            raise Exception("Policy not found")
        p = self.policies[policy_id]
        return {
            "id": p.id,
            "owner": p.owner,
            "category": p.category,
            "premium": p.premium,
            "payout": p.payout,
            "is_active": p.is_active,
            "has_claimed": p.has_claimed,
            "claim_resolved": p.claim_resolved,
            "claim_approved": p.claim_approved,
            "params": p.params,
            "claim_result": p.claim_result,
            "created_at": p.created_at,
        }

    @gl.public.view
    def get_all_policies(self) -> dict:
        result = {}
        for k, p in self.policies.items():
            result[k] = {
                "id": p.id,
                "owner": p.owner,
                "category": p.category,
                "premium": p.premium,
                "payout": p.payout,
                "is_active": p.is_active,
                "has_claimed": p.has_claimed,
                "claim_resolved": p.claim_resolved,
                "claim_approved": p.claim_approved,
                "params": p.params,
                "claim_result": p.claim_result,
                "created_at": p.created_at,
            }
        return result

    @gl.public.view
    def get_my_policies(self, owner_address: str) -> dict:
        result = {}
        for k, p in self.policies.items():
            if p.owner == owner_address:
                result[k] = {
                    "id": p.id,
                    "owner": p.owner,
                    "category": p.category,
                    "premium": p.premium,
                    "payout": p.payout,
                    "is_active": p.is_active,
                    "has_claimed": p.has_claimed,
                    "claim_resolved": p.claim_resolved,
                    "claim_approved": p.claim_approved,
                    "params": p.params,
                    "claim_result": p.claim_result,
                    "created_at": p.created_at,
                }
        return result

    @gl.public.view
    def get_stats(self) -> dict:
        return {
            "total_policies": self.policy_count,
            "total_premiums": self.total_premiums,
            "total_payouts": self.total_payouts,
        }
