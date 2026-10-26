---
name: blueprint
description: Stage 2 of idea-to-issues. Turns an approved docs/CONCEPT.md, docs/stack.md and docs/design/index.md into docs/blueprint.md, the structure of the product (modules, domain model, API surface, screens, epics) on the approved stack, with ADRs in docs/adr/ for its structural choices, and ends at gate 2 on a rendered review page. Use for a "blueprint", the "architecture" of an approved concept, or /idea-to-issues:blueprint.
model: fable
---

# Blueprint (stage 2)

Talk to the owner in ${user_config.language}. `docs/blueprint.md` and the ADRs are always written in English.

## Step 1: Check the gates

Run this before anything else:

```bash
i2i.mjs gate require blueprint
```

If it exits non-zero, show the owner its output verbatim and stop without writing anything. The output says what is wrong, such as an unapproved stack or design, one changed after its approval, or a stack that fails its check, and what to run. Never work around the check. After a refusal, wait until the owner invokes `/idea-to-issues:blueprint` again. A later message, or the output of a command the owner runs with `!`, is not an invocation: never re-run the check and carry on by yourself.

## Step 2: Read the inputs

Read `docs/CONCEPT.md` in full. Its Rulings are settled. Each of its Open threads is handed either to this stage or to a later one.

Read `docs/stack.md` in full: each `### ` row under `## Rows` with its `Chosen:` line, and the `## Exclusion ledger`. The rows are settled at the stack gate; this stage builds on them and reopens none. Read `docs/design/index.md` in full: its `## Inventory` is the list of screens, with their ids, settled at the design gate; in the no-UI form (`No screens: ui-library excluded by Ruling N`) the product has no screens. List `docs/adr/`: the stack stage's ADRs are already there, and step 5 numbers after them.

If `docs/blueprint.md` already exists, say so and ask whether to revise it or stop (one question). When revising, keep its front matter block exactly as it is and change only the body. A revised blueprint needs the owner's approval again.

## Step 3: Settle the threads handed to this stage

Settle every open thread the concept hands to the blueprint, and reopen nothing the concept ruled on. Use the two kinds of question from the grilling skill (`/idea-to-issues:grilling`):

- Technical (how modules are cut, what owns which data, the shape of the API surface, where a flow runs): decide it yourself from evidence, within the stack. When it is hard to reverse, it becomes an ADR (step 5). A thread that needs a layer `docs/stack.md` has no row for is not settled here: step 4 writes it as an open thread for the stack stage.
- Product (what the user gets or gives up): put it to the owner, one question per turn, with a recommended answer.

A thread handed to a later stage stays an open thread.

## Step 4: Write `docs/blueprint.md`

Write it in English from [references/blueprint-template.md](references/blueprint-template.md), without the template's guidance comments. A new document gets no front matter.

The stack is `docs/stack.md`, decided at the stack gate: every technology this document names is the `Chosen:` line of one of its rows, and every running part of the architecture is one of those rows. Never add a layer, never swap one, and never name a technology that is not a `Chosen:` line. When the concept, the design or a module needs a layer the stack has no row for (realtime, background jobs, search, …), or one on its exclusion ledger, write it under `## Open threads` as `<need>: settled by the stack stage — run /idea-to-issues:stack, revise docs/stack.md, approve it again, then revise this blueprint`, tell the owner in one line, and go on without it. Never settle it here, not even as an ADR.

The document covers:

- the architecture: a mermaid diagram of the running parts and what calls what, one node per row of the stack that runs (the web app, the API, the database; a runtime service when a module calls it), each labelled with its row's `Chosen:` value;
- the domain model, in the concept's words;
- the modules and the API surface;
- the screens: one row per row of `## Inventory` of `docs/design/index.md`, in its order, with the same Screen and the same Id, none added and none dropped; this document adds only what each screen calls. In the no-UI form the section is the design's one line and no table;
- the decisions: one row per ADR written at this stage, with its decision in one line. The gate digest covers this document and not `docs/adr/`, so this line is what gate 2 approves;
- the epics. Row 1 is the walking skeleton: the thinnest slice that runs end to end through every running part of the stack and does one real thing a user needs, with no feature depth. List every epic. Each first-version item in the concept's Rulings belongs to an epic, or is an open thread that says why not. Each epic gets a key matching `[A-Z][A-Z0-9]*`, which the specs stage uses as its epic key (`docs/CONTRACT.md`).

Before step 5, check the document against its inputs, and fix the document, never the inputs: every Id of the design's `## Inventory` is a row of `## Screens` and no other row exists; every technology named anywhere in the document is a `Chosen:` line of `docs/stack.md`; every `Ruling N` is a ruling of the concept.

## Step 5: Record the decisions as ADRs

Write one ADR per hard-to-reverse structural choice, from [references/adr-template.md](references/adr-template.md), as `docs/adr/NNNN-<slug>.md`, numbered after the highest `NNNN` already in `docs/adr/` (`0001` when the directory is empty or missing), so a blueprint ADR never collides with one the stack stage wrote. A choice is structural when it is about how the product is cut: module boundaries, what owns which data, the keys and relations of the domain model, the shape of the API surface, where a flow runs. It is hard to reverse when undoing it later takes a data migration, a rewrite across modules, or a change the user notices. A technology is never an ADR here: every technology is a row of `docs/stack.md`, decided at the stack gate. Each ADR gives the context, the decision, and every rejected alternative with the reason it was rejected.

Never delete an ADR and never rewrite one to match what was decided later: the gap between what was decided and what was built is part of the record. When a revised blueprint changes a recorded decision, write a new ADR with the next number and change only the old ADR's `Status:` line, plus the note an amendment needs, leaving the rest of it as it is:

- `Status: Superseded by ADR-NNNN` when the decision is reversed;
- `Status: Accepted — amended by ADR-NNNN` when the decision holds but part of the record was wrong, with a one-line note under it on which part to distrust.

The Decisions table in `docs/blueprint.md` then names the new ADR.

## Step 6: Present gate 2

Build the gate page after the documents are written, from `docs/blueprint.md` and the ADRs and nothing else. The page is a view of the markdown: every diagram node, decision and epic on it appears in the markdown under the same key, ADR number or technology name, and the page says that the approval is of the English document `docs/blueprint.md`. When the owner asks for a change while reviewing it, change the markdown first, then rebuild the page from it. Nothing is decided only on the page.

The page is written entirely in ${user_config.language}: headings, intro, diagram labels, decisions, rejected alternatives and epics. Keys (`SKEL-1`), ADR numbers, technology names and paths stay as they are, so every item traces back to the markdown. The documents stay in English.

- If the Artifact tool is in your tool list, publish the page as a private Artifact: the architecture diagram drawn from the mermaid block, the key decisions with each ADR's rejected alternatives, and the epics with the walking skeleton first. Give the owner the link.
- If the Artifact tool is not in your tool list, print a markdown summary in the terminal instead: the document path, the Architecture mermaid block as it is, the Decisions table, the Epics table and the Open threads. Its headings and explanations are in ${user_config.language}; the mermaid block and the tables are copied from the document as they are.

## Step 7: Hand off to gate 2

Show the owner the document path, the ADR paths and a short summary, then ask them to run `/idea-to-issues:approve blueprint`. If `git status --porcelain -- docs/design/index.md` prints anything, say that the approval will be refused until `docs/design/index.md` is committed. Stop there.

## Never

Never write, change or remove the `approved`, `digest` or `based-on` keys, never add front matter to a new document, and never run `i2i.mjs gate stamp`. Only the owner approves, through `/idea-to-issues:approve blueprint`. The stamp records the owner's approval; a stamp written by the agent is a forged one.

Never change `docs/CONCEPT.md`, `docs/stack.md`, `docs/design/` or an existing ADR's body. Never add a row to the stack, swap one or name a technology that is not a `Chosen:` line of `docs/stack.md`: a missing layer is an open thread that names the stack stage.
