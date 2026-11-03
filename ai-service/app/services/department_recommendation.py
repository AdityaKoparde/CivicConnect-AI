"""DepartmentRecommendationService — advisory routing suggestion.

Python *recommends*; the Node.js backend validates against the configured
department registry and jurisdiction data before assigning anything.
"""
from __future__ import annotations

from app.schemas.ai import Entities, RecommendDepartmentResponse


class DepartmentRecommendationService:
    """Maps (category, extracted geography/road type) to a department hint."""

    def recommend(
        self,
        category: str,
        entities: Entities | None = None,
        district: str | None = None,
    ) -> RecommendDepartmentResponse:
        entities = entities or Entities()
        road_type = entities.road_type

        if category == "road_damage":
            if road_type == "highway":
                return RecommendDepartmentResponse(
                    recommended_department="Public Works Department (State Highways)",
                    reasoning="Road damage on a state/national highway falls under PWD.",
                    confidence=0.85,
                )
            if road_type == "rural":
                return RecommendDepartmentResponse(
                    recommended_department="Rural Development & Panchayat Raj (Rural Roads)",
                    reasoning="Rural road damage is handled by RDPR / configured rural road authority.",
                    confidence=0.85,
                )
            if road_type == "urban":
                return RecommendDepartmentResponse(
                    recommended_department="Urban Local Body (City/Municipal Roads)",
                    reasoning="City road potholes are maintained by the local urban body.",
                    confidence=0.85,
                )
            return RecommendDepartmentResponse(
                recommended_department="Urban Local Body (City/Municipal Roads)",
                reasoning="Default for road damage when road type is unknown; backend "
                          "re-validates against jurisdiction (city vs highway vs rural).",
                confidence=0.65,
            )

        table: dict[str, tuple[str, str, float]] = {
            "water_supply": (
                "Local Water Supply Authority",
                "Water supply disruption is served by the configured water supply authority / ULB.",
                0.85,
            ),
            "drainage_sewage": (
                "Urban Local Body (Sanitation)",
                "Drainage and sewage maintenance lies with the municipal authority.",
                0.80,
            ),
            "garbage_collection": (
                "Urban Local Body / Gram Panchayat (Sanitation)",
                "Garbage collection is a local body sanitation service.",
                0.80,
            ),
            "electricity": (
                "Electricity Distribution Company (ESCOM)",
                "Power supply issues are handled by the ESCOM serving the district.",
                0.85,
            ),
            "streetlights": (
                "Urban Local Body (Street Lighting)",
                "Streetlights are usually maintained by the local body (or ESCOM where "
                "configured); backend confirms the configured owner.",
                0.75,
            ),
            "public_health": (
                "Health & Family Welfare / Sanitation Authority",
                "Public health concerns route to health/sanitation authorities.",
                0.75,
            ),
            "government_hospitals": (
                "Health & Family Welfare Department",
                "Government hospital issues are handled by the health department.",
                0.85,
            ),
            "public_transport": (
                "Transport Department / KSRTC",
                "Public transport service issues route to the transport authority.",
                0.80,
            ),
            "road_safety": (
                "Transport / Road Safety Authority",
                "Road safety infrastructure (signals, signs, crossings) is handled by "
                "traffic/transport authorities with PWD support.",
                0.75,
            ),
            "environmental_pollution": (
                "Karnataka State Pollution Control Board",
                "Environmental pollution complaints are the pollution board's mandate.",
                0.90,
            ),
            "public_infrastructure": (
                "Public Works Department",
                "General public infrastructure repair is routed to PWD (backend re-checks "
                "urban vs rural ownership).",
                0.70,
            ),
            "animal_welfare": (
                "Animal Husbandry & Veterinary Services",
                "Animal welfare issues route to animal husbandry / local animal control.",
                0.80,
            ),
            "fire_emergency": (
                "Karnataka Fire and Emergency Services",
                "Fire incidents route to fire and emergency services (call 112 first).",
                0.90,
            ),
            "other": (
                "CivicConnect Triage Desk",
                "Category unclear — routed to manual triage for department selection.",
                0.30,
            ),
        }

        name, reasoning, conf = table.get(
            category,
            ("CivicConnect Triage Desk", "Unknown category — manual review required.", 0.30),
        )
        if district:
            reasoning += f" District context: {district}."
        return RecommendDepartmentResponse(
            recommended_department=name, reasoning=reasoning, confidence=conf
        )


department_recommendation_service = DepartmentRecommendationService()
