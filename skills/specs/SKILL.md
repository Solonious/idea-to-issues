---
name: specs
description: Stage 3 of idea-to-issues. Turns an approved docs/blueprint.md into one docs/specs/<epic>.md per epic, with measurable acceptance criteria, a slice table, a coverage table and [KEY-N] ticket blocks, and ends when i2i check passes with zero findings. Use for "specs", "acceptance criteria", the "ticket breakdown" of an approved blueprint, or /idea-to-issues:specs.
---

# Specs (stage 3)

Talk to the owner in ${user_config.language}. The epic files in `docs/specs/` are always written in English.

## Step 1: Check gates 1 and 2

Run this before anything else:

```bash
i2i.mjs gate require specs
```

If it exits non-zero, show the owner its output verbatim and stop without writing anything. The output says what is wrong and what to run. Never work around the check. After a refusal, wait until the owner invokes `/idea-to-issues:specs` again. A later message, or the output of a command the owner runs with `!`, is not an invocation: never re-run the check and carry on by yourself.

## Step 2: Read the blueprint

Read `docs/blueprint.md` in full: the Epics table (keys, with row 1 the walking skeleton), the domain model, modules, API surface, screens, decisions, and the open threads handed to this stage. Its decisions are settled; reopen nothing.

Settle every open thread handed to this stage with the two kinds of question from the grilling skill (`/idea-to-issues:grilling`):

- Technical: decide it yourself from evidence.
- Product: put it to the owner, one question per turn, with a recommended answer.

If `docs/specs/` already holds epic files, say so and ask whether to revise them or stop (one question). Revising after gate 3 was approved means the owner approves gate 3 again, because it pins `docs/specs`.

## Step 3: Write one file per epic

For every row of the blueprint's Epics table, write `docs/specs/<key in lowercase>.md` (AUTH becomes `auth.md`) from [references/epic-template.md](references/epic-template.md), without the template's guidance comments. The heading is `# [KEY] <title>` with the blueprint's key exactly. The file name becomes the issue label `epic:<name>`. Every `*.md` directly in `docs/specs/` is read as an epic, so write nothing else there.

## Step 4: Write measurable acceptance criteria

In each epic's preamble, write one line per criterion in the contract format `- **AC-<n>** <text> — verify: <how it is measured>`. The dash is an em dash (U+2014) with a space on each side. Number the criteria from AC-1 within the epic.

A criterion says what is true for a user when the epic is done. Its verify names a test, a command or an observation with a pass or fail outcome that someone else could run. "Fast", "easy" or "works well" is not measurable: replace it with a number or an observable outcome.

`check` enforces the format only: an AC whose verify says "it works" passes it. Whether every AC is measurable stays your review.

## Step 5: Slice each epic

Each slice is one ticket.

- Each slice ships on its own: merged alone, it leaves the product working and gives a user something to do or see.
- Slice 1, `KEY-1`, is the epic's walking skeleton: the thinnest slice that runs end to end through every part the epic touches, with no feature depth. No ticket of its own epic blocks it. It may be blocked by a ticket of another epic only when it truly needs that ticket. In the blueprint's walking-skeleton epic (row 1 of its Epics table) `KEY-1` has `blocked-by: none`, because it is the root of the whole graph.
- Never split by layer: no ticket for all the backend followed by one for all the frontend. The first merges dead code, the second waits for it, and together they are one ticket in two parts.
- Never split by acceptance criterion mechanically: an AC is not a shippable unit. Group the work by what one pull request touches.
- Seams that usually work: read before write; one screen at a time; the default path before options, bulk actions and polish.
- Size each ticket S or M. A slice that reads as L has its seam in the wrong place, so look for another; keep L only when no seam exists, and say why in its Notes for implementer. Never XL.
- `blocked-by` names real blockers only. A preference is not a blocker; it makes the graph serial for no reason.

Once the ticket blocks of step 6 are written, build the two preamble tables from their meta lines: `## Slices` (one row per ticket in build order, row 1 the walking skeleton) and `## Coverage` (one row per AC, naming every ticket whose `covers` lists it). The meta lines are what `check` reads and `file` files; the tables are views of them, so when they disagree, fix the table. Neither table reaches GitHub.

## Step 6: Write the ticket blocks

After `## Tickets`, write one `### [KEY-N] <title>` block per slice, with N from 1 in slice order. Its first non-blank line is the meta line:

```
effort: S|M|L|XL · blocked-by: KEY-N, … · covers: AC-n, …
```

The separator is a middle dot (U+00B7) with a space on each side, lists are separated by `, `, and an empty list is `none`. Then write the eight `####` sections in this order, each once: Problem, Proposed solution, Affected areas, Acceptance criteria, Validation, Dependencies, Risks, Notes for implementer. `file` files these sections as the issue body, so write each for an implementer who has read nothing else.

- Problem: what the user cannot do yet, for this slice only.
- Proposed solution: named from the blueprint's modules, API surface and screens.
- Affected areas: the projects, modules and paths that change.
- Acceptance criteria: one checkbox per covered AC, `- [ ] AC-n: <text>`, plus any check particular to this slice.
- Validation: a fenced bash block with the real commands.
- Dependencies: why it waits for its blockers, in prose. Do not write a `⛓ Depends on:` line, because `file` adds it with the issue numbers.
- Risks: what could go wrong.
- Notes for implementer: the blueprint decisions it must not reopen.

The contract has no priority field and `file` applies only `effort:` and `epic:` labels, so a ticket carries no priority. Never write P0 or P1 into a ticket: those are for urgent work, and the owner sets them after filing.

## Step 7: Run check

Run:

```bash
i2i.mjs check docs/specs
```

Fix every finding and run it again until it exits 0 with `0 findings`. Never hand over with a finding left, and never change the contract or the tool to make a finding go away.

Then review what `check` cannot see, epic by epic:

- every AC is measurable (step 4);
- the Coverage table matches the `covers` lines, and every AC has a ticket;
- `KEY-1` is the walking skeleton and no ticket of its own epic blocks it;
- no ticket is split by layer.

Fix what you find, then run `check` again.

## Step 8: Hand off to the tickets stage

Show the owner the epic file paths and the ticket table from `i2i.mjs check --render docs/specs`. Say that `docs/specs` must be committed before gate 3 can be approved, because gate 3 pins `docs/specs` at a commit. Then say the next stage is `/idea-to-issues:tickets`, which orders the epics and presents gate 3. Stop there.

## Never

Never write `docs/specs/index.md`: the tickets stage writes it and gate 3 approves it. Never add front matter to an epic file, never change `docs/CONCEPT.md`, `docs/blueprint.md` or `docs/adr/`, and never run `i2i.mjs gate stamp`. This stage has no approval of its own; `check` is its gate.
