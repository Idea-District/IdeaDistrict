# Idea District — project context

> Source: pasted by Pravat in chat on 2026-10-22, intended as the repo's CLAUDE.md. Kept verbatim.

Drop this in the repo root as CLAUDE.md. It carries every decision made so far, the reasoning behind the ones that look arbitrary, and the traps already found.

## What the product is

A digital community manager for founders.

In a good founder space there is one person who knows everyone — not their job titles, but what each person is actually wrestling with — and who introduces the two people who should meet. She caps out at about 150 people and one room. This is her as software, with no ceiling.

There is no feed and nothing to browse. Nobody logs in to search for people. The system understands you through a short discovery flow, then speaks up when it has a reason to. An earlier feed/posting concept was dropped deliberately; do not reintroduce it by accident.

First market: founders in Bengaluru, then one city at a time. Investors join later, read-only first.

## The ID — the core model

The atomic unit. Not a profile. The user does not fill it in; the system discovers it.

### Two halves, kept in separate tables

Person — changes slowly. Capabilities, thinking patterns, risk orientation, collaboration tendencies, recurring behaviour.

State — changes fast. Current project, goal, problem, constraint, need, trajectory.

This separation is load-bearing. When a founder's co-founder walks out, that is a State change. A system that lets it rewrite Person concludes she has become difficult, and every recommendation after that is wrong. Never collapse these into one table with a flag.

### Evidence ladder

Every signal carries a type:

DECLARED → OBSERVED → INFERRED → VALIDATED

Only real-world outcomes reach validated. A scenario choice is observed at best — it tells you who someone would like to be, not who they are. Treat the simulation as cold start, not as the permanent source of truth.

### Confidence is mandatory

Every attribute carries a confidence level and the evidence behind it. The system must know what it does not know — that is what drives next-best-discovery, and the honesty is what makes the confident parts believable. Showing "conflict handling: LOW — never tested" is a feature.

## The intelligence loop

```
INTERACTION → SIGNALS → UNDERSTANDING ENGINE → EVOLVING ID (Person + State)
    → NEXT BEST DISCOVERY → MORE INTERACTION → ID EVOLVES
    → RECOMMENDATION ENGINE → MATCH / NO MATCH → INTERACTION
    → OUTCOME → LEARNING → BETTER UNDERSTANDING
```

Build the architecture around this loop, not around the current screens. Questions live in the database as data, not hardcoded in UI. The interface will change; the loop should not.

### Recommendation is a hypothesis, not a verdict

Do not ask "who is similar to this person?" Ask "what could happen if these two interact?" Similarity is easy to compute and rarely useful; complementarity is the point.

Every recommendation answers four questions: why now, why them, what could happen, how confident.

No match is a valid output. When there is nothing worth suggesting, say so and explain why. Manufacturing connections to keep engagement up is how every product in this category loses trust. There is a dedicated screen for this and it will be the most common state early on.

## Tech stack

| Layer | Choice |
|---|---|
| Mobile | React Native + Expo (EAS Build) |
| Backend | Python + FastAPI |
| Database | PostgreSQL 16 + pgvector |
| DB hosting | Supabase (Pro tier before onboarding — free tier pauses after a week and caps at 500MB) |
| Auth | Supabase Auth, phone OTP primary |
| Queue | Redis + Celery (Upstash free tier is fine at this size) |
| AI reasoning | Claude API — Sonnet for generation and ID building, Haiku for routine extraction |
| Embeddings | Separate vendor — Voyage or OpenAI. Anthropic has no embedding model. |
| Push | Expo Notifications |
| Analytics | PostHog |
| Errors | Sentry |
| API hosting | Railway or Render |

Deliberately boring. The risk belongs in the product, not the plumbing.

Every model call goes through one interface class (services/ai/client.py). Never call the API from a route handler. Prices change, models change, and you will switch at least once.

## Database schema

Every table: id uuid primary key default gen_random_uuid(), created_at timestamptz default now().

### Identity
- users — name, email, phone, avatar_url, organisation, role_title, linkedin_url, city, country, user_type, onboarding_stage, last_active_at
- user_privacy_settings — user_id, id_visible_to_investors, state_visible_to_investors, allow_introductions, updated_at

Ship privacy settings in week one. A system that infers things about people and shows them to investors needs consent as a column, not a settings screen added in month six.

### Context and discovery
- context_answers — user_id, question_key, answer_choice, answer_text, answered_at
- discovery_sessions — user_id, status, situation_count, started_at, completed_at
- situations — session_id, sequence_no, situation_text, question_text, options (jsonb), dimension_targeted, model_used, prompt_version
- choices — situation_id, user_id, chosen_option_id, chosen_text, not_chosen (jsonb), response_time_ms

not_chosen and response_time_ms look optional. They are not. What someone consistently refuses is often clearer than what they pick, and a fast answer means something different from a slow one.

### The ID
- signals — user_id, source_type, source_id, signal_type (declared/observed/inferred/validated), dimension, value_text, evidence_text, confidence, model_version, superseded_by
- id_attributes (Person) — user_id, dimension, insight, confidence, strength, evidence_summary, signal_count, version
- id_state (State) — user_id, field, value, confidence, valid_from, valid_until, superseded_at
- information_gaps — user_id, dimension, question, why_it_matters, priority, status

information_gaps drives next-best-discovery. Without it you have a fixed questionnaire in a costume.

### Recommendations and outcomes
- recommendations — user_a_id, user_b_id, match_type, why_now, why_them, what_could_happen, confidence, evidence (jsonb), status, shown_at, responded_at
- recommendation_outcomes — recommendation_id, reported_by_user_id, did_meet, was_useful, will_talk_again, notes
- no_match_log — user_id, run_at, reasons (jsonb), candidates_considered

Log the silences too. "Nothing for this person for three weeks" is a finding.

### Messaging and whiteboard
- conversations — origin_recommendation_id, last_message_at
- conversation_participants — conversation_id, user_id, joined_at, last_read_at
- messages — conversation_id, sender_id, body, sent_at, read_at
- whiteboard_posts — user_id, body, visibility, problem_domain, status (only if whiteboard survives — see open decisions)
- whiteboard_responses — post_id, user_id, body

### Infrastructure
- interactions — user_id, event_type, entity_type, entity_id, metadata (jsonb), occurred_at
- embeddings — subject_type, subject_id, vector, model
- ai_calls — user_id, purpose, model, prompt_version, input_tokens, output_tokens, cost_usd, latency_ms, status
- prompt_versions — key, version, body, model, active

interactions is the one thing that cannot be rebuilt later. Write to it from day one, before anything reads from it. Storage is nearly free. Added in year two, two years of learning is gone permanently.

ai_calls decides whether the unit economics work and nobody adds it retroactively.

prompt_versions — prompts live in the database, not in code. You will tune them daily and need to know which version produced which signal.

## The AI layer

Four jobs. None involve training a model.

| Job | Model | Notes |
|---|---|---|
| Generate a situation | Sonnet | Context + history + highest-priority open gap |
| Consequence + next situation | Sonnet | Plus what the last choice suggested |
| Build the ID | Sonnet ×2 | Two calls — see below |
| Score a candidate pair | Sonnet (Haiku prefilter) | Only over a pgvector shortlist of ~20 |

### Traps already hit

Split the ID build across two calls. One call asking for Person + State + Gaps together gets truncated at the token ceiling, and the JSON then fails to parse. One call for Person attributes, one for State and Gaps.

Parse defensively. Extract the JSON substring rather than trusting the whole response. Handle stop_reason: max_tokens explicitly. Retry once. Surface the real error — a generic "something went wrong" wasted an afternoon.

Cap output lengths in the prompt. Insights at 20 words, evidence at 12. Shorter output is also better output — a twelve-word insight has to be specific, where a rambling one hides behind qualifiers.

Instruct the model to be stingy with confidence. Three to five decisions is thin evidence. Most attributes should come back low or medium, and at least one should be an honest admission that it cannot tell yet. If it returns confident claims from five answers, constrain it harder.

Look at what was refused. Pass not_chosen into the ID build. What someone consistently avoids is often clearer than what they choose.

### Cost control, build in from the start
- Cache the system prompt — repeated input drops to ~10% of base rate
- Haiku to shortlist 20 candidates, Sonnet to reason over the best 5
- Only re-score users whose State changed or when new people join their space
- Batch the overnight matching runs — not user-facing, nobody is waiting, 50% off

Together these cut the matching bill by roughly half.

## Design system

Taken from the v0.1/v0.2 prototypes. Do not drift from this.

```
--cream:    #F5F1EA   app background
--card:     #FFFFFF
--sand:     #EBE6DA   secondary surfaces
--sand2:    #F7F3EA
--ink:      #21150B   espresso, primary text
--ink2:     #565B57
--ink3:     #8E8579
--rule:     #D5CDBA
--ember:        #FE4202   the accent — system speaking
--ember-deep:   #9C3305   observed text on light backgrounds
--ember-tint:   #FDEDE5
--espresso:     #21150B   dark panels ("why we're asking")
--good:     #3F6B4A   high confidence
--mid:      #9A6212   medium confidence
```

Type: Archivo (700/800 for headings, tight letter-spacing around −0.03em) for UI, Newsreader italic for anything the system inferred.

The one rule that carries the product: regular sans text is what the founder declared. Serif italic in ember is what the system worked out. These never mix. Orange marks the system speaking — signals, confidence, inferences — never used decoratively.

## MVP scope

### Build

Registration → four open questions → five branching situations → ID generation → ID screen (Person / State / Gaps).

The four questions, in the prototype's wording:

1. What should we call you?
2. What are you working on right now?
3. What are you hoping to make happen?
4. What's getting in your way?

Keep these as open text, not chips. Chips are faster to fill but give the AI almost nothing to build a situation from, and the situation is the whole point.

### Two ideas from v0.2 worth keeping
- Known / unknown list shown after the four questions — everything declared tagged as declared, the unknowns listed in ember. Honest before the system has earned trust, and the list visibly shrinks as discovery proceeds.
- "Why we're asking this" — a dark espresso panel before each situation, stating which gap it is trying to close. This is what stops the whole flow reading as a personality test.

### Not in the MVP

Investor-side product · prediction of any kind · web app · fully automated matching · multi-city · payments · public launch.

On prediction: knowing which founders will succeed requires seeing how things turned out, which takes two to three years of resolved outcomes. Keep it off the roadmap and do not claim it to investors.

### Run matching semi-manually under ~200 users

The system produces candidates and reasoning; a human approves before anything is sent. Never automate a judgement that has not been validated. Build the review as an internal admin page — it doubles as training data.

## Costs (engineering time excluded)
- One-time: Apple ₹8,300/yr, Play ₹2,100 once, domain ₹1,000
- Discovery: ~₹6 per founder. 500 founders ≈ ₹4,500
- Matching: ~₹9 per founder per run, naive. ~₹4,000/mo at 500 users with the levers applied
- Hosting at 500 users: Supabase Pro ₹2,100/mo + Railway ₹600/mo
- Total to build and onboard 500: ≈ ₹52,000, then ₹8,000–11,000/mo

Free tiers that break past 500 users: Supabase (500MB, pauses weekly), PostHog (1M events/mo).

Check Google Play's closed-testing requirements early — it is a scheduling problem that has delayed plenty of launches.

## Open decisions

**Is the whiteboard in?** It is a posting surface, which is the thing the product model said it would not have. It does answer the hardest question — what someone does on day one, before the system understands them well enough to introduce anyone. It should be a decision, not something that arrives through a menu bar. Scoped as the last thing built and the first thing cut.

**How many situations?** Five currently, three in the prototype. Each is an AI call, a loading state, and a chance to quit. Build the count as configuration, not a hardcoded array, and instrument the drop-off before settling.

**Does the user see their own ID?** Current screens assume yes. Showing it invites corrections, which is excellent evidence — but reading "conflict handling: LOW" about yourself is a strange experience.

**What fills the empty weeks?** The no-match screen is honest and also a reason to stop opening the app. At 50–500 users it will be the most common screen in the product.

## Known weakness in the prototype

related() in v0.2 does word-overlap matching with a stopword list. It works for a demo with five people and breaks quietly at fifty — "market validation" and "market access" match on "market" and mean nothing alike. That function is what embeddings replace, and it is the reason there is a second AI vendor in the stack.

## Three numbers to instrument before launch
1. Discovery completion rate — of those who start the first situation, how many reach their ID. Below 60% the session is too long and nothing downstream matters.
2. "Does this ring true?" — asked directly on the ID screen. The core assumption of the whole product, and cheap to measure.
3. Acceptance rate, then meeting rate — acceptance says the explanation worked; meeting rate says the match was real. The gap between them is the most informative number you will have.
