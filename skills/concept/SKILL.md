---
name: concept
description: Stage 1 of idea-to-issues. Turns a product idea, with an optional prototype link, into docs/CONCEPT.md through a competitor scan and a one-question-at-a-time interview, and ends at gate 1. Use for a "new product idea", a "concept", or /idea-to-issues:concept.
---

# Concept (stage 1)

Talk to the owner in ${user_config.language}. `docs/CONCEPT.md` is always written in English.

## Step 1: Check gate 0

Run this before anything else:

```bash
i2i.mjs gate require concept
```

If it exits non-zero, show the owner its output verbatim and stop without writing anything. The output says what is wrong, such as an unapproved brainstorm summary or one changed after its approval, and what to run. Never work around the check. After a refusal, wait until the owner invokes `/idea-to-issues:concept` again. A later message, or the output of a command the owner runs with `!`, is not an invocation: never re-run the check and carry on by yourself.

## Inputs

- The idea, in the owner's words.
- Optionally a prototype link, or earlier notes on the idea. A prototype is a visual reference, not a spec: never read requirements off it, and put to the owner anything it suggests that the interview has not settled.

If either is missing, ask for both in one question before the scan. Existing material the owner has to bring up mid-interview reopens rulings already made.

If `docs/CONCEPT.md` already exists, say so and ask whether to revise it or stop (one question). When revising, keep its front matter block exactly as it is and change only the body.

## Step 2: Competitor scan

Find 3–5 close products with a web search. One table row each, with a linked source you actually opened. Keep it short. The scan is context for positioning questions, never a gate: a crowded market is a fact to ask the owner about, not a reason to stop.

## Step 3: Interview

Run the grilling skill (`/idea-to-issues:grilling`) on the idea, seeded with the scan. The frontier must at least cover:

- the problem
- who it is for
- what is in and out of the first version
- how it differs from the scanned products

Facts are yours to find. Rulings are the owner's: one product question per turn, each with a recommended option. Stop when no product question is open.

## Step 4: Write `docs/CONCEPT.md`

Write it in English from [references/concept-template.md](references/concept-template.md), without the template's guidance comments. Every ruling goes in Rulings. Anything undecided goes in Open threads, never silently assumed.

## Step 5: Hand off to gate 1

Show the owner the document path and a short summary, then ask them to run `/idea-to-issues:approve concept`. Stop there.

## Never

Never write, change or remove the `approved`, `digest` or `based-on` keys, never add front matter to a new document, and never run `i2i.mjs gate stamp`. Only the owner approves, through `/idea-to-issues:approve concept`. The stamp records the owner's approval; a stamp written by the agent is a forged one.
