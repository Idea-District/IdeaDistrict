# Architecture

## Shape

```
idea-district-app/
├── apps/
│   ├── web/                    Next.js 16 (App Router, Tailwind 4) — demo + later admin review
│   │   └── src/
│   │       ├── app/            routes only: pages, layouts
│   │       ├── features/       one folder per product area (discovery, id, recommendations)
│   │       ├── components/     shared UI primitives
│   │       └── lib/            api client instance, helpers
│   └── mobile/                 Expo SDK 58 (expo-router) — the shipped product
│       └── src/
│           ├── app/            routes (file-based)
│           ├── features/       mirrors web/src/features
│           └── lib/
├── services/
│   └── api/                    FastAPI — the only thing that talks to the database and to AI
│       ├── app/
│       │   ├── api/v1/routes/  HTTP layer: validation in, schemas out, no business logic
│       │   ├── services/       business logic (discovery, id_builder, matching, interactions)
│       │   │   └── ai/         client.py (the single AI entry point) + providers/
│       │   ├── models/         SQLAlchemy tables, grouped as in the spec
│       │   ├── schemas/        Pydantic request/response models
│       │   ├── prompts/        default prompt bodies (*.md), seeded into prompt_versions
│       │   ├── db/             engine, session, Base
│       │   └── core/           settings
│       ├── migrations/         Alembic
│       └── tests/
├── packages/
│   ├── design-tokens/          colours + fonts, TS (mobile) and CSS variables (web)
│   └── api-client/             typed fetch client + API types, shared by web and mobile
└── docs/                       architecture, demo plan, specs
```

Monorepo tooling: pnpm workspaces + Turborepo. `node-linker=hoisted` because React Native needs a
flat `node_modules`. The Python service sits in the workspace with a thin `package.json` so
`turbo`/`pnpm` scripts can drive it.

## Request flow

```
web / mobile ──► @idea-district/api-client ──► FastAPI route ──► service ──► models (Postgres)
                                                                   │
                                                                   ├──► interactions.record()   (every user action)
                                                                   └──► AIClient.run()
                                                                          ├─ prompt from prompt_versions
                                                                          ├─ provider.complete()   (mock | your AI tool | Claude)
                                                                          ├─ extract + validate JSON, retry once
                                                                          └─ ai_calls row (tokens, cost, latency, real error)
```

Clients never hold AI keys or database keys. Everything sensitive stays in `services/api`.

## The intelligence loop → code

| Loop step | Where |
|---|---|
| Interaction | `interactions` table, `services/interactions.py` |
| Signals | `signals` (declared / observed / inferred / validated, with facet) |
| Understanding engine | `services/id_builder.py` — two AI calls: Person, then State + Gaps |
| Evolving ID | `id_attributes` (Person), `id_state` (State, superseded rows kept) |
| Next best discovery | `information_gaps` → picks the dimension the next situation targets |
| Recommendation engine | `services/matching.py` → `recommendations` (status starts `proposed`) |
| Match / no match | `recommendations` or `no_match_log` |
| Outcome → learning | `recommendation_outcomes` → validated signals |

## Data

SQLite locally (zero setup, `DATABASE_URL=sqlite:///./idea_district.db`); Supabase Postgres 16 in
production. The same Alembic migrations run on both (verified against local Postgres 16).
Deliberately not yet created: `embeddings` (needs pgvector — added with matching at scale) and
`whiteboard_*` (next build).

## AI providers

`AI_PROVIDER` picks the provider at startup. `mock` returns scripted JSON so everything runs offline
and in tests. To add a provider (your AI tool, or Claude), implement `AIProvider.complete()` in
`app/services/ai/providers/<name>.py` and register it in `providers/__init__.py`. No other code changes.

## Auth (plan)

Supabase Auth, phone OTP first. The API verifies the Supabase JWT on each request. For today's demo
there is no login: a founder is created by name and the web app keeps their id in the session.
