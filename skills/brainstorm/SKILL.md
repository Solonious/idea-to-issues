---
name: brainstorm
description: Stage 0 of idea-to-issues. Takes a product idea, alone or with a prototype link, through as many sessions of brainstorming activities as the owner wants (user scenarios, an attack on the idea, alternative shapes, a deep competitor analysis), keeps working notes, and ends at gate 0 with docs/brainstorm/summary.md. Use for a "brainstorm", an "early idea", or /idea-to-issues:brainstorm.
model: opus
---

# Brainstorm (stage 0)

Talk to the owner in ${user_config.language}. `docs/brainstorm/notes.md` and `docs/brainstorm/summary.md` are always written in English.

Every question to the owner follows the grilling skill (`/idea-to-issues:grilling`): one product question per turn, each with a recommended answer. Facts are yours to find.

## The notes file

`docs/brainstorm/notes.md` is an append-only log that grows across sessions. Its first line is `# Brainstorm notes`, written once. Nothing above the entries is ever updated and no earlier entry is ever rewritten.

Every entry has the heading `## <YYYY-MM-DD> — scenarios | attack | alternatives | competitors | free`, with one activity name and today's date in place of the placeholder. The set of activities that have run is the set of entry headings.

Each session ends by appending, as the last line of its last entry, `Stopped at:` followed by `<what is still open> — next: <activity or step>`. Rulings inside entries use the format `<question> → <ruling> — <why>`.

## Step 1: Read where we are

1. If `docs/brainstorm/summary.md` exists, say so and ask whether to continue the brainstorm or stop (one question). A changed summary needs the owner's approval again. When revising it later, keep its front matter block exactly as it is and change only the body. If the owner continues, go on to item 2.
2. If `docs/brainstorm/notes.md` exists, read it in full. Tell the owner in a few lines where we stopped: which activities have run (the entry headings) and the last `Stopped at:` line.
3. Otherwise this is the first session. Ask one opening question for anything the owner already has: a prototype link, earlier notes, competitors they already know, or "none". If the idea itself has not been stated, ask for it in the same question. A prototype is a visual reference, not a spec: never read requirements off it, and put to the owner anything it suggests that the brainstorm has not settled. Create the notes file with `# Brainstorm notes` and append `## <YYYY-MM-DD> — free` holding the idea in the owner's words and what they brought, or `Brought: none`.

## Step 2: Propose the next activity

Propose the first activity that has not run yet, in the order scenarios → attack → alternatives → competitors, or the next step the last `Stopped at:` line names. One question, with a recommended answer. The owner may pick any other activity, repeat one that has run, or dump ideas freely, which becomes a `free` entry. Each activity may run as many times as the owner wants; after each one, return to this step.

Tell "stop for now" (go to Step 4) from "the brainstorm is done" (go to Step 5). If it is unclear which the owner means, ask (one question).

## Step 3: Run the activity

Every run appends one entry to the notes under its heading.

### Scenarios

Cover a day of the user and the concrete situations the product is used in, step by step. Propose 2–4, ask the owner to confirm, correct or add (one question), and append the confirmed ones.

### Attack

If the Agent tool is not in your tool list, say that the attack cannot run here and offer the other three activities; never argue both sides yourself.

Otherwise dispatch two subagents with the Agent tool, `model: opus`, each given the idea, the notes so far and one assigned position: one defends the idea, the other argues why it fails or why nobody needs it. Neither sees the other's first argument. Print both arguments verbatim, unabridged.

Then always run a rebuttal round, still on `model: opus`: each subagent gets the other's argument and replies in three parts: where I was wrong, where I still disagree, what I now propose. Print both replies verbatim. Then put the open question to the owner (one question, with a recommended answer).

Append the entry with `### Defence`, `### Attack`, `### Rebuttal — defence`, `### Rebuttal — attack` and `### Ruling` (`<question> → <ruling> — <why>`).

### Alternatives

Propose 2–3 other ways to solve the same problem: another platform, a smaller product, another mechanic. The owner rules on each (one question per shape, with a recommended answer): keep it, or reject it with a reason. Append each shape with its ruling.

### Competitors

A deep analysis with no fixed count. For each product: what it does, what users praise, what they criticise, taken from user reviews and not the vendor's own page, and what to take from it. Each product gets a linked source you actually opened.

### Free

The owner's ideas as said, lightly structured. Interpret nothing and decide nothing for them.

## Step 4: End the session

When the owner stops for now, append the `Stopped at:` line to the notes and stop.

## Step 5: Write the summary

When the owner says the brainstorm is done: if any of the four activities never ran, name them and ask once whether to run them or finish anyway (one question). If the product has no name yet, ask for a working name (one question).

Write `docs/brainstorm/summary.md` in English from [references/summary-template.md](references/summary-template.md), without the template's guidance comments. A new summary gets no front matter; when revising an existing one, keep its front matter block exactly as it is and change only the body. It holds the chosen shape, the key scenarios, every rejected alternative with its reason (from the alternatives rulings and the attack rulings), the competitor takeaways each with its linked source actually opened (or one line saying the activity was skipped), and `Skipped activities` naming the unrun ones or `none`.

Append `Stopped at: summary written — next: /idea-to-issues:approve brainstorm` to the notes.

## Step 6: Hand off to gate 0

Show the owner the whole summary translated into ${user_config.language} in the terminal. Say that the approval is of the English document `docs/brainstorm/summary.md`, then ask them to run `/idea-to-issues:approve brainstorm`. Stop there.

## Never

Never write, change or remove the `approved`, `digest` or `based-on` keys, never add front matter to a new document, and never run `i2i.mjs gate stamp`. Only the owner approves, through `/idea-to-issues:approve brainstorm`. The stamp records the owner's approval; a stamp written by the agent is a forged one.

Never rewrite an earlier entry of `docs/brainstorm/notes.md`, and never let one agent argue both sides of the attack. Never ask the owner which model a subagent runs on: the attack names it.
