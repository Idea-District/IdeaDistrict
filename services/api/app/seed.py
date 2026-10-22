"""Load the default prompts into prompt_versions (idempotent).

    python -m app.seed
"""

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models import PromptVersion
from app.prompts import available_prompts, load_default_prompt

SEED_VERSION = "v1"


def seed_prompts() -> int:
    added = 0
    with SessionLocal() as db:
        for key in available_prompts():
            exists = db.scalar(
                select(PromptVersion).where(PromptVersion.key == key, PromptVersion.version == SEED_VERSION)
            )
            if exists:
                continue
            db.add(PromptVersion(key=key, version=SEED_VERSION, body=load_default_prompt(key), active=True))
            added += 1
        db.commit()
    return added


if __name__ == "__main__":
    print(f"Seeded {seed_prompts()} prompt(s).")
