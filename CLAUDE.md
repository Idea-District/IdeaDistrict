# Idea District

A digital community manager for founders. The system understands each founder through a short
discovery flow, builds their **ID**, and speaks up only when it has a reason to introduce two people.
No feed, nothing to browse. First market: Bengaluru.

Full context: `docs/specs/01-project-context.md`. Settled decisions: `docs/specs/03-decisions.md`
(these win over anything older). Architecture: `docs/architecture.md`. Today's demo: `docs/demo-plan.md`.

## Repo map

| Path | What | Run |
|---|---|---|
| `apps/web` | Next.js 16 web app (demo surface today) | `pnpm dev:web` → :3100 |
| `apps/mobile` | Expo app (the real product, built after the demo) | `pnpm dev:mobile` |
| `services/api` | FastAPI + SQLAlchemy + Alembic, all AI calls | `pnpm dev:api` → :8000 |
| `packages/design-tokens` | Colours, fonts, the declared/inferred rule | — |
| `packages/api-client` | Typed fetch client used by web and mobile | — |

`apps/web` uses a Next.js version newer than most training data — read
`node_modules/next/dist/docs/` before writing Next code (see `apps/web/AGENTS.md`).

## Rules that are load-bearing

- **Person and State are separate tables.** A co-founder leaving is State. Never let it rewrite Person.
- **Evidence ladder:** declared → observed → inferred → validated. Scenario choices are *observed* at
  best; only real-world outcomes reach *validated*.
- **Confidence on every attribute**, and the ID must show what it does not know (`information_gaps`).
- **Recommendations are hypotheses:** why now, why them, what could happen, how confident.
  "No match" is a valid, respected output. Never reveal another member's needs, answers or state.
- **Every AI call goes through `services/api/app/services/ai/client.py`.** Never call a provider from a
  route. Prompts live in `prompt_versions` (defaults in `app/prompts/*.md`). Every call is logged to
  `ai_calls`. New AI tools are added as providers in `app/services/ai/providers/`.
- **Write to `interactions` for every user action**, from day one.
- **Design:** regular sans (Archivo) = what the founder declared. Serif italic in ember (Newsreader,
  class `inferred` on web) = what the system worked out. Ember is the system speaking, never decoration.
- Counts and shapes are configuration (`SITUATIONS_PER_SESSION=5`), not hardcoded arrays.
- Investor visibility defaults to **off** (opt-in consent).

## Decided for this build

Open-text opening questions · 5 situations · no whiteboard (next build) · the no-match screen has a
"Tell me more" button that adds to the ID, tagged by facet (primary venture vs secondary skills).

## Commands

```bash
pnpm install                 # JS workspaces
pnpm api:bootstrap           # Python venv + API deps (first time)
pnpm db:migrate && pnpm db:seed
pnpm dev                     # web + api together
pnpm --filter api run test   # API tests
pnpm typecheck && pnpm lint
```

New migration after changing models: `cd services/api && .venv/bin/alembic revision --autogenerate -m "…"`
(check the generated file — JSONB columns need `sa.Text()` qualified).
