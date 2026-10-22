# IdeaDistrict

**Understanding before recommendation.**

Idea District is a digital community manager for founders. Instead of a profile people fill in and a
feed they scroll, the system gets to know each founder through a short discovery flow, builds their
**ID** (how they think and operate, and what is happening to them right now), and speaks up only when
it has a real reason to introduce two people. "Nobody this week" is an honest, valid answer.

First market: founders in Bengaluru.

## How it works

```
Four open questions ─► five adaptive situations ─► the ID ─► an introduction (or an honest no-match)
        ▲                                                                    │
        └──────────── "Tell me more" · outcomes after a meeting ◄────────────┘
```

- **The ID has two halves.** *Person* changes slowly (decision making, collaboration, capabilities).
  *State* changes fast (current project, goal, constraint, need). They are stored separately so a
  setback never rewrites who someone is.
- **Every claim carries evidence and confidence**, on a ladder: declared → observed → inferred →
  validated. Only real-world outcomes reach validated, and the ID openly lists what it doesn't know.
- **Recommendations are hypotheses:** why now, why them, what could happen, how confident.

## Repository

| Path | What |
|---|---|
| `apps/web` | Next.js 16 web app (Tailwind 4) |
| `apps/mobile` | Expo (React Native) app for iOS and Android |
| `services/api` | FastAPI service: database, discovery, the ID, matching, every AI call |
| `packages/design-tokens` | Colours and type shared by web and mobile |
| `packages/api-client` | Typed API client shared by web and mobile |
| `docs/` | Architecture, demo plan and product specs |

Stack: pnpm workspaces + Turborepo · Next.js · Expo · FastAPI · SQLAlchemy + Alembic ·
PostgreSQL (Supabase) in production, SQLite locally · a pluggable AI provider layer.

## Getting started

Requirements: Node ≥ 20.9, pnpm 9, Python ≥ 3.12.

```bash
pnpm install                                        # JS dependencies for every app
pnpm api:bootstrap                                  # Python virtualenv for the API
cp services/api/.env.example services/api/.env
cp apps/web/.env.example apps/web/.env.local
pnpm db:migrate && pnpm db:seed                     # create tables, load prompts
pnpm dev                                            # web + API together
```

- Web: http://localhost:3100
- API: http://localhost:8000 (interactive docs at `/docs`)
- Mobile: `pnpm dev:mobile`, then open in Expo Go or a simulator

The API runs with `AI_PROVIDER=mock` by default, so the whole flow works offline with no keys.

## Common commands

| Command | Does |
|---|---|
| `pnpm dev` | Run web and API |
| `pnpm dev:web` / `pnpm dev:api` / `pnpm dev:mobile` | Run one app |
| `pnpm db:migrate` | Apply database migrations |
| `pnpm db:reset` | Fresh local database with seed data |
| `pnpm typecheck` · `pnpm lint` · `pnpm test` | Checks across the repo |

## Documentation

- [`CLAUDE.md`](CLAUDE.md) — the rules that keep the product honest, for humans and AI assistants
- [`docs/architecture.md`](docs/architecture.md) — structure, request flow, data, AI providers
- [`docs/demo-plan.md`](docs/demo-plan.md) — the web demo plan
- [`docs/specs/`](docs/specs/) — product context, screen flow and decisions
