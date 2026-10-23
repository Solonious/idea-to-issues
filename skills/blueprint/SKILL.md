---
name: blueprint
description: Stage 2 of idea-to-issues. Turns an approved docs/CONCEPT.md into docs/blueprint.md and ADRs in docs/adr/ on a fixed stack (Nx, Angular, NestJS, Prisma, Vercel, Railway), and ends at gate 2 on a rendered review page. Use for a "blueprint", the "architecture" of an approved concept, or /idea-to-issues:blueprint.
model: best
---

# Blueprint (stage 2)

Talk to the owner in ${user_config.language}. `docs/blueprint.md` and the ADRs are always written in English.

## Step 1: Check gate 1

Run this before anything else:

```bash
i2i.mjs gate require blueprint
```

If it exits non-zero, show the owner its output verbatim and stop without writing anything. The output says what is wrong, such as an unapproved concept or one changed after its approval, and what to run. Never work around the check. After a refusal, wait until the owner invokes `/idea-to-issues:blueprint` again. A later message, or the output of a command the owner runs with `!`, is not an invocation: never re-run the check and carry on by yourself.

## Step 2: Read the concept

Read `docs/CONCEPT.md` in full. Its Rulings are settled. Each of its Open threads is handed either to this stage or to a later one.

If `docs/blueprint.md` already exists, say so and ask whether to revise it or stop (one question). When revising, keep its front matter block exactly as it is and change only the body. A revised blueprint needs the owner's approval again.

## Step 3: Settle the threads handed to this stage

Settle every open thread the concept hands to the blueprint, and reopen nothing the concept ruled on. Use the two kinds of question from the grilling skill (`/idea-to-issues:grilling`):

- Technical (an engine, a library, where a part runs): decide it yourself from evidence. When it is hard to reverse, it becomes an ADR (step 5).
- Product (what the user gets or gives up): put it to the owner, one question per turn, with a recommended answer.

A thread handed to a later stage stays an open thread.

## Step 4: Write `docs/blueprint.md`

Write it in English from [references/blueprint-template.md](references/blueprint-template.md), without the template's guidance comments.

The stack is fixed: an Nx monorepo, an Angular web app on Vercel, a NestJS API on Railway, and Prisma for data access. Do not reopen it. What the stack leaves open, such as the database engine behind Prisma, authentication or file storage, is a decision for step 5. When the concept asks for something the stack cannot deliver, such as a native mobile app, tell the owner and record it as an open thread or an ADR. Never swap the stack silently.

The document covers:

- the architecture: a mermaid diagram of the deployed parts and what calls what;
- the domain model, in the concept's words;
- the modules, the API surface and the screens;
- the decisions: one row per ADR, with its decision in one line. The gate digest covers this document and not `docs/adr/`, so this line is what gate 2 approves;
- the epics. Row 1 is the walking skeleton: the thinnest slice that runs end to end through every deployed part (the web app on Vercel, the API on Railway, the database through Prisma) and does one real thing a user needs, with no feature depth. List every epic. Each first-version item in the concept's Rulings belongs to an epic, or is an open thread that says why not. Each epic gets a key matching `[A-Z][A-Z0-9]*`, which the specs stage uses as its epic key (`docs/CONTRACT.md`).

## Step 5: Record the decisions as ADRs

Write one ADR per hard-to-reverse choice, from [references/adr-template.md](references/adr-template.md), as `docs/adr/NNNN-<slug>.md` numbered from `0001`. A choice is hard to reverse when undoing it later takes a data migration, a rewrite across modules, or a change the user notices. Each ADR gives the context, the decision, and every rejected alternative with the reason it was rejected. The fixed stack is not an ADR: it was not chosen here.

Never delete an ADR and never rewrite one to match what was decided later: the gap between what was decided and what was built is part of the record. When a revised blueprint changes a recorded decision, write a new ADR with the next number and change only the old ADR's `Status:` line, plus the note an amendment needs, leaving the rest of it as it is:

- `Status: Superseded by ADR-NNNN` when the decision is reversed;
- `Status: Accepted — amended by ADR-NNNN` when the decision holds but part of the record was wrong, with a one-line note under it on which part to distrust.

The Decisions table in `docs/blueprint.md` then names the new ADR.

## Step 6: Present gate 2

Build the gate page after the documents are written, from `docs/blueprint.md` and the ADRs and nothing else. The page is a view of the markdown: every diagram node, decision and epic on it appears in the markdown under the same name, and the page says that the approval is of `docs/blueprint.md`. When the owner asks for a change while reviewing it, change the markdown first, then rebuild the page from it. Nothing is decided only on the page.

- If the Artifact tool is in your tool list, publish the page as a private Artifact: the architecture diagram drawn from the mermaid block, the key decisions with each ADR's rejected alternatives, and the epics with the walking skeleton first. Give the owner the link.
- If the Artifact tool is not in your tool list, print a markdown summary in the terminal instead: the document path, the Architecture mermaid block as it is, the Decisions table, the Epics table and the Open threads.

## Step 7: Hand off to gate 2

Show the owner the document path, the ADR paths and a short summary, then ask them to run `/idea-to-issues:approve blueprint`. If `git status --porcelain -- docs/CONCEPT.md` prints anything, say that the approval will be refused until `docs/CONCEPT.md` is committed. Stop there.

## Never

Never write, change or remove the `approved`, `digest` or `based-on` keys, never add front matter to a new document, and never run `i2i.mjs gate stamp`. Only the owner approves, through `/idea-to-issues:approve blueprint`. The stamp records the owner's approval; a stamp written by the agent is a forged one.
