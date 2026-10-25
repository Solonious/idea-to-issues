---
name: stack
description: The stack stage of idea-to-issues, between the concept and the blueprint. Reads an approved docs/CONCEPT.md, argues every needed stack category as the owner's default against the best alternative with its own pair of subagents and a rebuttal round, writes docs/stack.md with an exclusion ledger and a rulings mapping plus an ADR per deviation, and ends at the stack gate on a rendered review page. Use for "stack", "which services", "the tech stack" of an approved concept, or /idea-to-issues:stack.
model: opus
---

# Stack

Talk to the owner in ${user_config.language}. `docs/stack.md` and the ADRs are always written in English.

## Step 1: Check the concept gate

Run this before anything else:

```bash
i2i.mjs gate require stack
```

If it exits non-zero, show the owner its output verbatim and stop without writing anything. The output says what is wrong, such as an unapproved concept or one changed after its approval, and what to run. Never work around the check. After a refusal, wait until the owner invokes `/idea-to-issues:stack` again. A later message, or the output of a command the owner runs with `!`, is not an invocation: never re-run the check and carry on by yourself.

## Step 2: Read the concept and check it covers every category

Read `docs/CONCEPT.md` in full. Its Rulings are settled: reopen none, and never ask a stack category question yourself; the concept owns them.

For every entry of `CATEGORIES` with a question (run `i2i.mjs stack defaults` to list them), find the ruling whose line ends with a `[stack: …]` tag naming the category (the concept writes the tag as `[stack: <names>]`, the category names comma-separated). If any category has no such ruling, name the categories, say the concept predates the stack questions or lost them, tell the owner to run `/idea-to-issues:concept`, choose revise, and approve the concept again, and stop without writing anything. After a refusal, wait until the owner invokes `/idea-to-issues:stack` again. A later message, or the output of a command the owner runs with `!`, is not an invocation: never re-run the check and carry on by yourself.

If the Agent tool is not in your tool list, say that the stack rows cannot be argued here and stop without writing anything; never argue both sides yourself. After a refusal, wait until the owner invokes `/idea-to-issues:stack` again. A later message, or the output of a command the owner runs with `!`, is not an invocation: never re-run the check and carry on by yourself.

Also list every ruling that needs a service outside `CATEGORIES` (realtime, background jobs, maps, search, …): each becomes a "no default" row in Step 4. A need the concept has no ruling for is not a row: say which ruling is missing, tell the owner to run `/idea-to-issues:concept`, choose revise, and approve the concept again, and stop without writing anything. After a refusal, wait until the owner invokes `/idea-to-issues:stack` again. A later message, or the output of a command the owner runs with `!`, is not an invocation: never re-run the check and carry on by yourself.

If `docs/stack.md` already exists, say so and ask one question: revise it or stop. When revising, the owner names in the same answer any layer the blueprint found missing. When revising, keep its front matter block exactly as it is and change only the body. Decide which rows to re-argue: if the front matter has a `based-on: docs/CONCEPT.md@<sha>` line, run `git diff <sha> -- docs/CONCEPT.md` and re-argue every row whose `Driver:` ruling changed, every category whose capability answer changed, and every new row; with no `based-on` line (never approved), re-argue every row. Other rows are copied verbatim. The exclusion ledger and its challenge always re-run. Name the re-argued rows in the terminal and on the gate page. A revised stack needs the owner's approval again.

## Step 3: Capability profile

Write one line per group of categories that share a question, in `CATEGORIES` order (`i2i.mjs stack defaults` gives each question and its `always` flag): `<categories>: yes|no — Ruling N`, where Ruling N is the ruling whose `[stack: …]` tag names them. The always-needed categories are one line ending `: always`. "Needed" means yes or always; "excluded" means no.

## Step 4: Argue the rows

For every needed category, in `CATEGORIES` order (rows may run in parallel; within a row the rebuttal waits for both first arguments):

1. Run `i2i.mjs stack defaults <category>` and give its output verbatim to both advocates. It is the base research; copy nothing from memory.
2. Dispatch two subagents with the Agent tool, `model: opus`, each given the concept's Problem, Who it is for and Rulings, the `stack defaults` output, and one assigned position. The default advocate argues the default for this product. The alternative advocate picks the best alternative for this product from the research's options (or one outside it only with a source it opened) and names it on its first line as `Alternative: <name>`. Both must cite `Ruling N` for every product fact they use, and any claim about a price, a version, a limit or lock-in that is not in the research, or that may have changed, cites a linked source they actually opened. Neither sees the other's first argument. Both write in English.
3. Then always run a rebuttal round, still on `model: opus`: each subagent gets the other's argument and replies in three parts: where I was wrong, where I still disagree, what I now propose.
4. Decide the row yourself: it is a technical question (the grilling skill, `/idea-to-issues:grilling`), settled from the evidence in the four texts. The default stands unless the alternative's case, after rebuttal, shows a concept fact (`Ruling N`) the default cannot meet or meets at a clearly higher cost or lock-in. Write `Why:` with that fact. The owner overrides any row at the gate.
5. In the terminal print one short line per category and nothing of the debate: `` `<category>`: <chosen> (default) `` or `` `<category>`: <chosen> (deviates from <default>) ``. The verbatim debate goes only into `docs/stack.md`.
6. A row with no default (Step 2's list): name the two best candidates from evidence; the pair argues candidate A against candidate B with the same rebuttal round; then ask the owner one question with a recommended answer (grilling format). Write the row with `Default: none — the owner decides`, `Chosen:` the owner's answer, `Alternative:` the other candidate, and the "default" slots holding the case for the chosen candidate. Terminal line: `<service>: <chosen> (no default; the owner chose)`.
7. The `ui-library` row is final for every later stage: the design stage takes it as it is and never reopens it.

## Step 5: Exclusion ledger and its challenge

Write one ledger row per excluded category, never an always-needed one: Ruling is the tagged ruling, Reason is one line from its why. Then dispatch one subagent with the Agent tool, `model: opus`, given the whole ledger, every ruling and the concept; it looks for a ruling that needs an excluded category. Paste its report verbatim as a blockquote under `## Ledger challenge`, then one `Finding:` line per finding (`Finding: none` when nothing). Resolve nothing: say on the gate page that the owner decides there, to approve the stack anyway or to revise `docs/CONCEPT.md`.

## Step 6: Rulings mapping

Write one row per ruling in the concept's order; `Maps to` is the row heading(s), `ledger` or `no runtime need`. Hand off only when every ruling has a row.

## Step 7: Write docs/stack.md and the ADRs

Write `docs/stack.md` in English from [references/stack-template.md](references/stack-template.md), without the template's guidance comments; a new document gets no front matter. Then write one ADR per row whose `Chosen:` is not the default (a deviation, or a row with no default), from [references/adr-template.md](references/adr-template.md), as `docs/adr/NNNN-<slug>.md`, numbered after the highest `NNNN` already in `docs/adr/` (`0001` when the directory is empty or missing). The row's `ADR:` line carries the number.

Never delete an ADR and never rewrite one to match what was decided later: the gap between what was decided and what was built is part of the record. When a revised stack changes a row's `Chosen:`, write a new ADR with the next number and change only the old ADR's `Status:` line, plus the note an amendment needs, leaving the rest of it as it is:

- `Status: Superseded by ADR-NNNN` when the decision is reversed;
- `Status: Accepted — amended by ADR-NNNN` when the decision holds but part of the record was wrong, with a one-line note under it on which part to distrust.

The gate digest covers `docs/stack.md` only, not `docs/adr/`, so the row's `Chosen:`, `Why:` and `ADR:` lines are what the stack gate approves.

## Step 8: Present the stack gate

Build the gate page after the documents are written, from `docs/stack.md` and the ADRs and nothing else. The page is a view of the markdown: every row, ledger line, finding and mapping on it appears in the markdown under the same category, `Ruling N`, ADR number or technology name, and the page says that the approval is of the English document `docs/stack.md`. When the owner asks for a change while reviewing it, change the markdown first, then rebuild the page from it. Nothing is decided only on the page.

The page is written entirely in ${user_config.language}: headings, intro, the overview table's column names, the capability profile, every argument and rebuttal, the ledger, the challenge and the mapping. Keys (`SKEL-1`), category names, `Ruling N` references, ADR numbers, technology names and paths stay as they are, so every item traces back to the markdown. The documents stay in English.

The page opens with an overview table built from the rows, `| Category | Default | Chosen | Deviates? |` (`yes` or `no`, or `no default` for an extra row), then the full debates row by row, the ledger, the challenge with its `Finding:` lines, the mapping, and the re-argued rows when this is a revision.

- If the Artifact tool is in your tool list, publish the page as a private Artifact as described above. Give the owner the link.
- If the Artifact tool is not in your tool list, print a markdown summary in the terminal instead: the document path, the overview table, each row's `Chosen:`, `Why:` and `ADR:` lines, the Exclusion ledger table, the `Finding:` lines and the Rulings mapping table. Its headings and explanations are in ${user_config.language}; the tables and the quoted lines are copied from the document as they are.

## Step 9: Hand off to the stack gate

Show the owner the document path, the ADR paths and a short summary, then ask them to run `/idea-to-issues:approve stack`. If `git status --porcelain -- docs/CONCEPT.md` prints anything, say that the approval will be refused until `docs/CONCEPT.md` is committed. Stop there.

## Never

Never write, change or remove the `approved`, `digest` or `based-on` keys, never add front matter to a new document, and never run `i2i.mjs gate stamp`. Only the owner approves, through `/idea-to-issues:approve stack`. The stamp records the owner's approval; a stamp written by the agent is a forged one.

Never ask the owner a stack category question: the concept owns them. Never ask the owner which model a subagent runs on: each dispatch above names it. Never let one agent argue both sides of a row, and never skip the rebuttal round. Never change `docs/CONCEPT.md`, `docs/blueprint.md` or an existing ADR's body.
