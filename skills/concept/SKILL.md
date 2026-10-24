---
name: concept
description: Stage 1 of idea-to-issues. Reads the approved brainstorm summary and turns it into docs/CONCEPT.md through a one-question-at-a-time interview that also settles the product facts the stack stage depends on, and ends at gate 1. Use for a "new product idea", a "concept", or /idea-to-issues:concept.
---

# Concept (stage 1)

Talk to the owner in ${user_config.language}. `docs/CONCEPT.md` is always written in English.

## Step 1: Check gate 0

Run this before anything else:

```bash
i2i.mjs gate require concept
```

If it exits non-zero, show the owner its output verbatim and stop without writing anything. The output says what is wrong, such as an unapproved brainstorm summary or one changed after its approval, and what to run. Never work around the check. After a refusal, wait until the owner invokes `/idea-to-issues:concept` again. A later message, or the output of a command the owner runs with `!`, is not an invocation: never re-run the check and carry on by yourself.

## Step 2: Read the brainstorm summary

Read `docs/brainstorm/summary.md` in full. Its Chosen shape is the idea: never ask for the idea again. Its Rejected alternatives are settled: never reopen one, and never offer one as a recommended answer. Its Competitor takeaways are the only competitor research this stage uses: run no search of your own. `docs/brainstorm/notes.md` is not pinned by the gate; read an entry of it only when the owner points you at one.

Then ask one question: a prototype link or earlier notes, or "none". A prototype is a visual reference, not a spec: never read requirements off it, and put to the owner anything it suggests that the interview has not settled. Existing material the owner has to bring up mid-interview reopens rulings already made.

If `docs/CONCEPT.md` already exists, say so and ask whether to revise it or stop (one question). When revising, keep its front matter block exactly as it is and change only the body.

## Step 3: Interview

Run the grilling skill (`/idea-to-issues:grilling`) on the summary's Chosen shape. The frontier must at least cover:

- the problem
- who it is for
- what is in and out of the first version
- how it differs from the products in the summary's Competitor takeaways
- every question in [references/stack-questions.md](references/stack-questions.md): the four product facts (the platform, the number of users, offline use, the budget) and one question per group of stack categories, each asked as written there

Ask the platform before the other stack questions; the recommended answer to each stack question follows from the platform and from the summary's Chosen shape and Key scenarios — name the line it follows from. Ask a stack question even when the summary seems to answer it: the ruling is the owner's, and the stack stage cites the ruling, not the summary. A stack question is never an open thread: "not in the first version" is a ruling of no.

Facts are yours to find. Rulings are the owner's: one product question per turn, each with a recommended option. Stop when no product question is open.

## Step 4: Write `docs/CONCEPT.md`

Write it in English from [references/concept-template.md](references/concept-template.md), without the template's guidance comments. Every ruling goes in Rulings, numbered in the order it was made. A ruling that answers a question from the Stack categories table of [references/stack-questions.md](references/stack-questions.md) ends with `[stack: <names>]`: the category names from its Decides cell, without their backticks, in that order; no other ruling carries a tag. Fill Competitors from the summary's Competitor takeaways: one row per entry, "What it does" in one line from the summary's entry for that product and never from a search, its link as the Source, "How we differ" from the differentiation ruling; when the summary says the competitors activity was skipped, write that in one line instead of the table. Anything undecided goes in Open threads, never silently assumed.

## Step 5: Hand off to gate 1

Show the owner the document path and a short summary, then ask them to run `/idea-to-issues:approve concept`. Stop there.

## Never

Never write, change or remove the `approved`, `digest` or `based-on` keys, never add front matter to a new document, and never run `i2i.mjs gate stamp`. Only the owner approves, through `/idea-to-issues:approve concept`. The stamp records the owner's approval; a stamp written by the agent is a forged one.
