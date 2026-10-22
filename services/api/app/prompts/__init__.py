"""Default prompt bodies, one Markdown file per prompt key.

These are only the starting versions: `python -m app.seed` copies them into the
prompt_versions table, and from then on the database copy is what runs.
"""

from functools import cache
from pathlib import Path

PROMPT_DIR = Path(__file__).parent


def available_prompts() -> list[str]:
    """Prompt keys; files starting with "_" are shared fragments, not prompts."""
    return sorted(p.stem for p in PROMPT_DIR.glob("*.md") if not p.stem.startswith("_"))


@cache
def load_default_prompt(key: str) -> str:
    path = PROMPT_DIR / f"{key}.md"
    if not path.exists():
        raise FileNotFoundError(f"no prompt file for key '{key}' in {PROMPT_DIR}")
    rules = (PROMPT_DIR / "_rules.md").read_text()
    return f"{path.read_text().strip()}\n\n{rules.strip()}\n"
