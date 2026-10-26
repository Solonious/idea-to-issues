---
name: design
description: The design stage of idea-to-issues, between the stack and the blueprint. Reads the approved concept, brainstorm summary and stack, proposes the first-version screens from the rulings and puts them to the owner one at a time, draws directions or takes the owner's prototype, writes a self-contained docs/design/prototype.html with every screen, state and transition, docs/design/index.md and per-screen PNGs, and ends at the design gate on two rendered pages. Use for "design", "prototype", "screens", "mockup" of an approved stack, or /idea-to-issues:design.
model: opus
---

# Design

Talk to the owner in ${user_config.language}. `docs/design/index.md` is always written in English. The text on the screens of the prototype is in the language of the product's users (Step 2). The format of everything this stage writes is the Design document contract in `docs/CONTRACT.md`.

## Step 1: Check the stack gate

Run this before anything else:

```bash
i2i.mjs gate require design
```

If it exits non-zero, show the owner its output verbatim and stop without writing anything. The output says what is wrong, such as an unapproved stack, one changed after its approval or one that fails its check, and what to run. Never work around the check. After a refusal, wait until the owner invokes `/idea-to-issues:design` again. A later message, or the output of a command the owner runs with `!`, is not an invocation: never re-run the check and carry on by yourself.

## Step 2: Read the inputs

Read `docs/CONCEPT.md` in full. Its Rulings are settled: reopen none. Read `## Key scenarios` of `docs/brainstorm/summary.md`. Read the `ui-library` row of `docs/stack.md`: its `Chosen:` line is final, never reopened and never argued.

Then, in this order:

1. The language of the screens. Find the ruling whose question is exactly `Which language or languages will the product's users read on screen?`. If there is none, name the missing ruling, tell the owner to run `/idea-to-issues:concept`, choose revise, answer that question and approve the concept again, and stop without writing anything. After a refusal, wait until the owner invokes `/idea-to-issues:design` again. A later message, or the output of a command the owner runs with `!`, is not an invocation: never re-run the check and carry on by yourself. The answer is the language of all UI copy.
2. No screens. If `## Exclusion ledger` of `docs/stack.md` has a `` | `ui-library` | Ruling N | … | `` line, write `docs/design/index.md` as the no-UI form of the contract (`# Design: <product>` and the one line `No screens: ui-library excluded by Ruling N`, with N from that ledger line), and go to Step 9.
3. An existing design. If `docs/design/index.md` exists, say so and ask one question: revise it or stop. When revising, keep its front matter block exactly as it is and change only the body. A revised design needs the owner's approval again.
4. Directions need the Agent tool. If the concept has no `Prototype:` link and the Agent tool is not in your tool list, say that the directions cannot be drawn here and stop without writing anything. After a refusal, wait until the owner invokes `/idea-to-issues:design` again. A later message, or the output of a command the owner runs with `!`, is not an invocation: never re-run the check and carry on by yourself.

## Step 3: Propose the screen inventory

Derive every first-version screen from the concept's Rulings and the brainstorm's Key scenarios. Each screen has an id (`[a-z][a-z0-9-]*`), a purpose, `Basis: Ruling N`, its three states (empty, filled, error) and its transitions to other screens.

Put the inventory to the owner one question at a time with the grilling skill (`/idea-to-issues:grilling`), the recommended answer first: which screens exist, which are missing, which to drop. A screen with no ruling behind it is a question to the owner, never added silently. The agreed inventory goes into `## Inventory` of `docs/design/index.md`.

## Step 4: The owner's prototype

Read the concept's `Prototype:` line. If it has a link, open it with what this session has: a local file with Read, a claude.ai Artifact link with the Artifact tool's read, images with Read. If it cannot be opened (a Figma link without access, for example), say so, ask the owner for an export and wait for it.

Start from the owner's prototype: move it onto the chosen UI library, add the missing screens, states and transitions. Every change from the owner's prototype is a row of `## Change list` in `docs/design/index.md`, and each is put to the owner for a ruling one question at a time. Then skip Step 5.

## Step 5: Directions

Only without an owner prototype. For each of the three directions, dispatch one subagent with the Agent tool, `model: opus`, given the concept's Problem, Who it is for and Rulings, the approved inventory, the `ui-library` row and the Design document contract of `docs/CONTRACT.md`, with one assigned character, dense, calm or expressive, told to write `docs/design/directions/<slug>.html`: a key screen, the palette, the type scale and the density, the root marked `data-direction="<slug>"` and never a `data-screen`. The three run in parallel and never see each other's work.

Show them to the owner. With the Artifact tool, publish each file byte for byte as a private Artifact; without it, give the owner the three paths to open in a browser. Then ask one question: which direction, with a recommended one and the reason. The answers are the three directions and "none of them, redraw". On "none of them", run this step again with three fresh subagents; the files already in `docs/design/directions/` stay and are recorded as rejected.

Record ``Chosen: `<slug>` — <why>`` and one ``Rejected: `<slug>` — <why>`` for every other direction in `## Directions`.

## Step 6: Build docs/design/prototype.html

Write `docs/design/prototype.html` yourself, per the Design document contract: every screen of the inventory, each with its three states, `data-to` transitions, rendering at 390 and 1440 px, the hash routing applied on load without animation, the UI copy in the language of Step 2, on the chosen UI library with the approximation recorded in `## Fidelity`. Use no Artifact-only runtime feature; load only what the contract allows. The file opens from disk in a plain browser. Its size is measured on the first real run; say what it is when it is written.

## Step 7: Write docs/design/index.md

Write `docs/design/index.md` in English from [references/index-template.md](references/index-template.md), without the template's guidance comments. A new document gets no front matter. Every `Ruling N` in it is a ruling of the concept.

## Step 8: Screenshots

Run this once `docs/design/prototype.html` is final:

```bash
i2i.mjs design shots
```

It writes `docs/design/png/<screen-id>-mobile.png` and `docs/design/png/<screen-id>-desktop.png` for every `data-screen`; list them in `## Screenshots` of `docs/design/index.md`. If it exits 2 with "no Chrome found", show the list it printed, ask the owner for Chrome or for `I2I_CHROME=<path>`, and wait. If Chrome aborts inside the sandbox (`Failed to bind() … SingletonSocket: Operation not permitted`), give the owner one step, once: `/sandbox exclude` for the `i2i.mjs design shots` prefix, or `! <the exact command>`; then wait. A browser tool may replace the command when one is available, but the files, their names, the viewport sizes at scale 1 and the light theme must match the contract.

Run it once, when the HTML is final, and again only after the HTML changes during review. Never run it after the approval without a revision: a fresh run changes the PNG bytes and dirties the pinned folder. Never hand off without the PNGs, except in the no-UI form.

## Step 9: Present the design gate

Build the gate page after the documents are written, from `docs/design/index.md` and nothing else. The page is a view of the markdown: every screen, state, flow, change and direction on it appears in the markdown under the same screen id, `Ruling N` or slug, and the page says that the approval is of the English document `docs/design/index.md`. When the owner asks for a change while reviewing it, change the markdown first, then rebuild the page from it. Nothing is decided only on the page.

The page is written entirely in ${user_config.language}: headings, intro, the inventory, the states, the flows, the change list and the reasons for the directions. Keys (`SKEL-1`), screen ids, `Ruling N` references, technology names and paths stay as they are, so every item traces back to the markdown. The documents stay in English.

In the no-UI form there is no prototype and no PNG: the gate page shows the one line of `docs/design/index.md` and the ledger line it cites.

- If the Artifact tool is in your tool list, publish two private Artifacts (one in the no-UI form). First the prototype, byte for byte from `docs/design/prototype.html`. Second the gate page: the inventory with its `Ruling N`, the states, the flows, the change list, the directions chosen and rejected with the reasons, the PNGs, and the link to the prototype Artifact. Give the owner both links.
- If the Artifact tool is not in your tool list, print in the terminal: the paths of `docs/design/index.md` and `docs/design/prototype.html`, the Inventory, Flows, Directions and Change list tables, and the PNG paths. Its headings and explanations are in ${user_config.language}; the tables are copied from the document as they are.

A change the owner asks for during review goes into `docs/design/index.md`, `docs/design/prototype.html` and the PNGs together (run Step 8 again), and then both Artifacts are republished from the files on disk, byte for byte.

## Step 10: Hand off to the design gate

Show the owner the paths and a short summary, then ask them to commit `docs/design/` in one commit and then run `/idea-to-issues:approve design`. If `git status --porcelain -- docs/design ':(exclude)docs/design/index.md'` prints anything, say that the approval will be refused until those files are committed. Stop there.

## Never

Never write, change or remove the `approved`, `digest` or `based-on` keys, never add front matter to a new document, and never run `i2i.mjs gate stamp`. Only the owner approves, through `/idea-to-issues:approve design`. The stamp records the owner's approval; a stamp written by the agent is a forged one.

Never reopen the `ui-library` row or any ruling of the concept. Never ask the owner which model a subagent runs on: the dispatch above names it. Keep to the rule that you never draw a direction yourself: the three subagents do, and a direction file never carries a `data-screen`. You never commit or push: the owner commits `docs/design/`. Never change `docs/CONCEPT.md`, `docs/stack.md`, `docs/blueprint.md` or an ADR.
