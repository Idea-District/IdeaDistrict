"""Seed data (idempotent):
- default prompts → prompt_versions (a changed prompt file becomes a new active version)
- sample members with built IDs: 30 founders (matching candidates) and 10 investors
  (stored with user_type="investor"; investors are read-only in the MVP and not matched)

    python -m app.seed
"""

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models import IdAttribute, IdState, PromptVersion, User, UserPrivacySettings
from app.prompts import available_prompts, load_default_prompt
from app.seed_data import DEMO_INVESTORS, MORE_FOUNDERS
from app.services.id_builder import HEADLINE

DEMO_EMAIL_DOMAIN = "ideadistrict.demo"

# Each founder: profile, State (field, value, facet), Person (dimension, insight, confidence, strength, evidence).
DEMO_FOUNDERS = [
    {
        "slug": "ananya", "name": "Ananya Rao", "organisation": "Kirana Route",
        "headline": "You scale through people on the ground before you scale the software.",
        "state": [
            ("project", "B2B ordering and delivery software for kirana distributors", "primary"),
            ("stage", "Seed", "primary"),
            ("offer", "Built and ran a 40-person field sales team across three cities", "primary"),
            ("offer", "Expanded from Bengaluru to Pune and Hyderabad in one year", "primary"),
            ("need", "A first senior engineering hire she can trust", "primary"),
        ],
        "person": [
            ("Execution vs learning", "You go to the market first and let the product catch up.", "medium", 0.6, "4 of 5 decisions"),
            ("Delegation", "You hand over operations early but keep pricing decisions close.", "low", 0.3, "2 decisions"),
        ],
    },
    {
        "slug": "karthik", "name": "Karthik Menon", "organisation": "Settle",
        "headline": "You take regulatory risk seriously and move once the path is clear.",
        "state": [
            ("project", "UPI-based payment collection infrastructure for small businesses", "primary"),
            ("stage", "Series A", "primary"),
            ("offer", "Took a payment aggregator licence through RBI approval", "primary"),
            ("offer", "Bank partnership negotiations with two private banks", "primary"),
            ("need", "An enterprise sales leader for large merchants", "primary"),
        ],
        "person": [
            ("Risk orientation", "You avoid bets the regulator could undo.", "medium", 0.65, "4 of 5 decisions"),
            ("Collaboration", "You partner readily when the partner carries the compliance burden.", "low", 0.35, "2 decisions"),
        ],
    },
    {
        "slug": "farah", "name": "Farah Siddiqui", "organisation": "HomeLab",
        "headline": "You protect quality of service even when growth pressure says otherwise.",
        "state": [
            ("project", "At-home diagnostic sample collection for families", "primary"),
            ("stage", "Pre-seed", "primary"),
            ("offer", "Hired and trained her first ten field staff", "primary"),
            ("need", "Introductions to angel investors in healthtech", "primary"),
        ],
        "person": [
            ("Decision making", "You slow down when patient trust is at stake.", "medium", 0.55, "3 of 5 decisions"),
            ("Conflict handling", "Not enough evidence yet to say.", "low", 0.1, "Never tested"),
        ],
    },
    {
        "slug": "rohan", "name": "Rohan Iyer", "organisation": "SwapGrid",
        "headline": "You solve supply problems before you chase demand.",
        "state": [
            ("project", "Battery-swapping stations for electric two-wheelers", "primary"),
            ("stage", "Seed", "primary"),
            ("offer", "Manufacturing and supplier relationships in Hosur and Chennai", "primary"),
            ("offer", "Hardware prototyping on a tight budget", "primary"),
            ("need", "Delivery fleets as first large customers", "primary"),
        ],
        "person": [
            ("Execution vs learning", "You build a working unit before you ask anyone to buy it.", "medium", 0.6, "4 of 5 decisions"),
        ],
    },
    {
        "slug": "meera", "name": "Meera Krishnan", "organisation": "Studio Kolam",
        "headline": "You lead with craft and build community around it.",
        "state": [
            ("project", "Brand and storefront tooling for D2C craft brands", "primary"),
            ("stage", "Bootstrapped", "primary"),
            ("offer", "Brand identity and product design for early-stage startups", "primary"),
            ("offer", "Built a 3,000-member maker community", "secondary"),
            ("need", "A technical co-founder", "primary"),
        ],
        "person": [
            ("Collaboration", "You prefer partners who bring a different craft to yours.", "medium", 0.5, "3 of 5 decisions"),
        ],
    },
    {
        "slug": "vikram", "name": "Vikram Shetty", "organisation": "LedgerPilot",
        "headline": "You prototype fast and let real users decide what survives.",
        "state": [
            ("project", "AI assistants that automate filing work for CA firms", "primary"),
            ("stage", "Pre-seed", "primary"),
            ("offer", "Full-stack engineering and AI prototyping; former startup CTO", "primary"),
            ("offer", "Helping non-technical founders scope a first product", "secondary"),
            ("need", "Distribution into CA firms and small businesses", "primary"),
        ],
        "person": [
            ("Execution vs learning", "You ship a rough version in days rather than plan for weeks.", "medium", 0.6, "4 of 5 decisions"),
            ("Delegation", "Not enough evidence yet to say.", "low", 0.1, "Never tested"),
        ],
    },
]


def seed_prompts() -> int:
    """Adds v1, v2… per key whenever the file differs from the active version.
    Older versions are kept (inactive) so every past signal still traces to its prompt."""
    added = 0
    with SessionLocal() as db:
        for key in available_prompts():
            body = load_default_prompt(key)
            versions = list(db.scalars(select(PromptVersion).where(PromptVersion.key == key)))
            active = next((v for v in versions if v.active), None)
            if active is not None and active.body == body:
                continue
            for v in versions:
                v.active = False
            db.add(PromptVersion(key=key, version=f"v{len(versions) + 1}", body=body, active=True))
            added += 1
        db.commit()
    return added


def seed_demo_founders() -> int:
    return _seed_members(DEMO_FOUNDERS + MORE_FOUNDERS, "founder")


def seed_demo_investors() -> int:
    return _seed_members(DEMO_INVESTORS, "investor")


def _seed_members(members: list[dict], user_type: str) -> int:
    """Idempotent by email: people already present are skipped, never duplicated."""
    added = 0
    with SessionLocal() as db:
        for f in members:
            email = f"{f['slug']}@{DEMO_EMAIL_DOMAIN}"
            if db.scalar(select(User).where(User.email == email)):
                continue
            user = User(
                name=f["name"], email=email, organisation=f["organisation"], city="Bengaluru",
                country="India", onboarding_stage="id_built", user_type=user_type,
            )
            db.add(user)
            db.flush()
            db.add(UserPrivacySettings(user_id=user.id))
            db.add(
                IdAttribute(
                    user_id=user.id, dimension=HEADLINE, insight=f["headline"], confidence="medium",
                    strength=0.5, evidence_summary="From 5 decisions", signal_count=5, version=1,
                )
            )
            for dimension, insight, confidence, strength, evidence in f["person"]:
                db.add(
                    IdAttribute(
                        user_id=user.id, dimension=dimension, insight=insight, confidence=confidence,
                        strength=strength, evidence_summary=evidence, signal_count=5, version=1,
                    )
                )
            for field, value, facet in f["state"]:
                db.add(
                    IdState(
                        user_id=user.id, field=field, value=value, facet=facet, confidence="high", source="declared"
                    )
                )
            added += 1
        db.commit()
    return added


if __name__ == "__main__":
    print(
        f"Seeded {seed_prompts()} prompt(s), {seed_demo_founders()} founder(s) "
        f"and {seed_demo_investors()} investor(s)."
    )
