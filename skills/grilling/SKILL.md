---
name: grilling
description: Interviews the owner about a plan, decision or idea until they share one understanding, asking one product question at a time, open with no recommended answer when it is a core question and with a recommended answer when it is a detail question. Used by the stage skills, and when the user says "grill me" or asks to stress-test an idea.
model: inherit
---

# Grilling

Adapted from Matt Pocock's `grilling` skill ([mattpocock/skills](https://github.com/mattpocock/skills/blob/49dd158d1076134a641b33efb035946536778336/skills/productivity/grilling/SKILL.md)), MIT License, Copyright (c) 2026 Matt Pocock. The license is in [LICENSE](LICENSE). Changes from upstream: two kinds of question, one product question per turn, a weight for every product question (a core question is asked open, with no recommended answer; a detail question keeps one), recorded rulings, a cap on the interview, and a language setting.

Talk to the owner in ${user_config.language}. Anything written to a file is in English.

Interview the owner until you reach a shared understanding. Map the topic as a **design tree**: every decision branches into the decisions that hang off it. The **frontier** is every decision whose prerequisites are already settled: the questions you can ask _now_ without guessing at answers you have not heard yet.

## Two kinds of question

- **Technical and factual** (what the code or the docs say, what the market offers, what a tool can do): settle these yourself from evidence. Read, search, or dispatch a subagent with the Agent tool, `model: sonnet`. Never put them to the owner. A running lookup is an unsettled prerequisite, so only the questions downstream of it wait.
- **Product and taste** (who it is for, what is in or out, positioning, naming, priorities): these are the owner's. Put each to them and wait.

## One question per turn

Ask one product question, then wait for the answer. Pick it from the frontier: the one whose answer unblocks the most others.

Each answer reshapes the tree: settled decisions push the frontier outward. Recompute it and ask the next question.

Weigh the question before you ask it. It is a **core** question when its answer decides any of these five topics, the same in every stage:

1. who the product is for
2. the problem it solves
3. the core mechanic
4. what is in the first version
5. any change to, or removal of, material the owner brought themselves (the idea text, a prototype, notes)

Every other product question is a **detail** question. When it is unclear whether a question is core, it is core. A stage skill may name the questions of its own that are details; it never makes a detail of a question on one of the five topics.

### A core question is asked open

The owner answers in their own words. A core question carries no recommended answer and is never worded so that "yes" accepts one.

- Ask it in plain text, also when the `AskUserQuestion` tool is available: that tool needs a list of options, and options you write are answers you propose.
- Offer no answers of your own. The question may quote the owner's own material and state facts you found; nothing in it says which answer you would give. When the calling skill fixes the form of the answer (keep or reject, for example), name the form and favour neither side.
- If the owner asks what you would answer, say it then, as your view with its reason; the ruling is the answer the owner gives after that.
- Use this format, with nothing after the question:

```
❓ **<question title>**: <question body>
```

### A detail question carries a recommended answer

- A detail question keeps a recommended answer, worded so that "yes" accepts it.
- With the `AskUserQuestion` tool, use it for a detail question: the recommended option first, its label ending "(Recommended)".
- Otherwise use this format:

```
❓ **<question title>**: <question body, with the choices if there are any>

➡️ <your recommended answer to this detail question>
```

## Record each ruling

When the owner answers, note the question, the answer and the reason. The calling skill writes these down. Do not assume an answer the owner has not given; anything deliberately left undecided is an open thread.

## Stop when nothing is open

When no product question is left open, stop asking. Do not invent questions to fill time. Summarise the rulings and the open threads, and ask the owner to confirm the summary. Do not act on it until they confirm.
