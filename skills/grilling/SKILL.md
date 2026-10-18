---
name: grilling
description: Interviews the owner about a plan, decision or idea until they share one understanding, asking one product question at a time with a recommended answer. Used by the stage skills, and when the user says "grill me" or asks to stress-test an idea.
---

# Grilling

Adapted from Matt Pocock's `grilling` skill ([mattpocock/skills](https://github.com/mattpocock/skills/blob/49dd158d1076134a641b33efb035946536778336/skills/productivity/grilling/SKILL.md)), MIT License, Copyright (c) 2026 Matt Pocock. The license is in [LICENSE](LICENSE). Changes from upstream: two kinds of question, one product question per turn, recorded rulings, a cap on the interview, and a language setting.

Talk to the owner in ${user_config.language}. Anything written to a file is in English.

Interview the owner until you reach a shared understanding. Map the topic as a **design tree**: every decision branches into the decisions that hang off it. The **frontier** is every decision whose prerequisites are already settled: the questions you can ask _now_ without guessing at answers you have not heard yet.

## Two kinds of question

- **Technical and factual** (what the code or the docs say, what the market offers, what a tool can do): settle these yourself from evidence. Read, search, or dispatch a subagent. Never put them to the owner. A running lookup is an unsettled prerequisite, so only the questions downstream of it wait.
- **Product and taste** (who it is for, what is in or out, positioning, naming, priorities): these are the owner's. Put each to them and wait.

## One question per turn

Ask one product question, then wait for the answer. Pick it from the frontier: the one whose answer unblocks the most others.

- Give a recommended answer, and word the question so "yes" accepts it.
- With the `AskUserQuestion` tool, use it: the recommended option first, its label ending "(Recommended)".
- Otherwise use this format:

```
❓ **<question title>**: <question body, with the choices if there are any>

➡️ <your recommended answer>
```

Each answer reshapes the tree: settled decisions push the frontier outward. Recompute it and ask the next question.

## Record each ruling

When the owner answers, note the question, the answer and the reason. The calling skill writes these down. Do not assume an answer the owner has not given; anything deliberately left undecided is an open thread.

## Stop when nothing is open

When no product question is left open, stop asking. Do not invent questions to fill time. Summarise the rulings and the open threads, and ask the owner to confirm the summary. Do not act on it until they confirm.
