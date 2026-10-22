# Web demo plan — 22 October 2026

**Goal:** one founder walks the whole loop live in the browser — four open questions → five adaptive
situations → their ID (Person, State, Gaps, with confidence) → a recommendation or an honest
no-match → "Tell me more" visibly changes the ID.

**Runs:** locally on the presenter's laptop (`pnpm dev`), web on :3100, API on :8000, SQLite.
Deploying is optional and only after everything below works.

## The demo storyline (screens from the 18-screens design)

| # | Screen | Route | Notes |
|---|---|---|---|
| 1 | Loading — "Understanding before recommendation." | `/` | 2 s, then intro |
| 2 | Intro — "Your ID isn't something you fill out" | `/` | Begin discovery |
| 3 | The four questions, open text | `/start` | name · working on · hoping to make happen · in the way |
| 4 | Known and unknown | `/start/known` | declared items tagged DECLARED, unknowns in ember |
| 5 | Why we're asking (espresso panel) | `/discover` | shown above each situation |
| 6 | Situation n of 5, options A–E | `/discover` | built from the founder's own answers |
| 7 | Signal captured, confidence 35 % | `/discover` | observed, in serif italic |
| 8 | Consequence, then the next situation | `/discover` | adaptive: next targets the top open gap |
| 9 | Building your ID | `/id/building` | covers the two ID-build AI calls |
| 10 | My ID — the map | `/id` | State + Person + Signals, "Developing" |
| 11 | Person in detail | `/id/person` | per-attribute confidence + evidence, one "never tested" |
| 12 | Still unknown | `/id/gaps` | the list from screen 4, now shorter |
| 13 | Someone you should meet | `/for-you` | NEED → CAPABILITY, four explanations |
| 14 | Nothing this week + **Tell me more** | `/for-you` | adds a secondary facet, ID updates |

Out of the demo: messaging, outcome survey, profile/consent screen, admin review, login, whiteboard.
Tabs shown in the shell: For you · Messages (empty state) · You.

## API for the demo

| Method | Path | Does |
|---|---|---|
| POST | `/v1/founders` | create founder by name → `founder_id` (no auth today) |
| POST | `/v1/discovery/context` | save the four answers → declared signals, known list, initial gaps |
| POST | `/v1/discovery/sessions` | start session → situation 1 |
| POST | `/v1/discovery/situations/{id}/choice` | save choice (+ not_chosen, response time, optional why) → signal + consequence + next situation, or `done` |
| POST | `/v1/id/build` | Person call + State/Gaps call |
| GET | `/v1/id` | Person, State, Gaps for the founder |
| GET | `/v1/recommendations` | one intersection or a no-match with reasons |
| POST | `/v1/id/tell-me-more` | free text → declared signals (facet-tagged) → ID refresh |

Every endpoint writes to `interactions`; every AI call goes through `AIClient` and lands in `ai_calls`.

## Build order (each step ends demo-able)

1. **API + scripted AI** — endpoints above with the `mock` provider returning realistic, context-aware
   JSON (it weaves the founder's own words into situations). Seed 6 Bengaluru founder profiles so
   matching has someone to find. Tests for the flow.
2. **Web discovery** — screens 1–9 against the API.
3. **Web ID** — screens 10–12.
4. **Web recommendations** — screens 13–14 incl. Tell me more.
5. **Plug in the real AI tool** — a new provider file; switch `AI_PROVIDER`. Keep `mock` as the
   on-stage fallback (one env var) if the network or the tool misbehaves.
6. **Rehearse** — run the full flow twice with different founders; time it (target ≤ 5 minutes).

Cut order if time runs short: screen 12 → screen 11 → Tell me more's ID refresh (keep the button) →
recommendation card (keep no-match). Never cut: four questions, adaptive situations, the ID map.

## Demo safety

- `AI_PROVIDER=mock` gives a fully working flow with no network.
- Loading states are designed screens (Building your ID), not spinners, so AI latency reads as work.
- A `pnpm db:reset` before the demo gives a clean database with the seeded founders.

## Needed from Pravat

- The AI tool: how it is called (HTTP endpoint? SDK?), auth, whether it can return JSON, typical latency.
- Demo time today, and whether it is shown on this laptop or needs a public URL.
