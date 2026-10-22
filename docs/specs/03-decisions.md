# Idea District — decisions

Decided by Pravat on 2026-10-22, answering the four open questions in the 18-screens artifact. These override anything earlier in the other sources.

| # | Question | Decision |
|---|---|---|
| 1 | Open text or chips on the opening questions? | **Open text.** Let founders give as much as they want; the AI takes context from it. (Abdul's chip version and the build plan's 3-question `context_answers` are superseded.) |
| 2 | Is the whiteboard in? | **Not in this build.** It ships in the next build, once the mechanism is worked out. The prototype has three tabs: Recommendations, Messaging, Profile. Drop `whiteboard_*` tables and week-8 whiteboard work from this build. |
| 3 | How many situations? | **Five.** Still kept as configuration, with drop-off measured. |
| 4 | What fills the empty weeks? | **A "Tell me more" button on the no-match screen.** It lets the founder add more about themselves to enrich their ID, especially other sides of their life. |

## Decision 4 in Pravat's words (summarised)

The no-match screen has a button ("Tell me more" or similar). It is an opportunity for users to add information and improve their ID. Example: "I'm building a community, but I'm also a designer," and the ID can find new connections from that part of their life. Later, with more people, the founder can choose between getting help for their primary business or offering their secondary talent to someone else, and so grow their network.

## What decision 4 implies for the build (proposed, not yet confirmed)

- **Input:** free text, the same as the opening questions. Every entry is stored as **DECLARED** evidence.
- **Extraction:** Haiku pulls structured signals out of the text. A new skill ("designer") becomes a Person capability with low confidence until an outcome validates it. A new project or goal becomes State.
- **Facets:** tag each capability and need with which side of the founder's life it belongs to (primary venture vs other skills). Matching then knows whether this person is *seeking* help or *offering* it.
- **Later, the mode choice:** "grow my business" vs "help someone with my other skills". Store it as a recommendation intent now so matching can use it once there are enough people.
- **New gaps:** a "Tell me more" entry can open new information gaps, which can lead to an optional follow-up situation.
