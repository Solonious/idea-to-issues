# idea-to-issues

A Claude Code plugin that turns a product idea into a gated plan and a native GitHub Issues graph: brainstorm, concept, stack, design, blueprint, specs, tickets.

> **Status: early development.** The plugin installs. The `i2i` modes and the seven stages are in; three release-time evals guard the refusals a pilot does not exercise. Progress is tracked in this repository's issues.

## What it does

You bring an idea. The plugin walks it through seven stages. Every stage but the brainstorm is one session; the brainstorm runs across as many as you want. Every stage writes a document to your repository and ends at a gate: either a human approval or a mechanical check. The last stage files the result as GitHub Issues, with native parent and blocked-by links, labels and Project items.

The agent holds the judgement: the concept, the architecture, the specs, and whether an acceptance criterion is measurable. Code holds the structure, the gate stamps and every GitHub write.

## The seven stages

| Stage | Output | Ends at |
|---|---|---|
| brainstorm | `docs/brainstorm/notes.md` (working notes), `docs/brainstorm/summary.md` | gate 0 |
| concept | `docs/CONCEPT.md` | gate 1 |
| stack | `docs/stack.md`, `docs/adr/` | the stack gate |
| design | `docs/design/index.md`, `docs/design/prototype.html`, `docs/design/directions/`, `docs/design/png/` | the design gate |
| blueprint | `docs/blueprint.md`, `docs/adr/` | gate 2 |
| specs | `docs/specs/<epic>.md`, with acceptance criteria and `### [KEY-N]` ticket blocks | the mechanical `check` |
| tickets | `docs/specs/index.md` (epic order), then the Issues | gate 3 |

Each stage starts by checking that the stage before it is approved and has not changed since. The conversation language is a plugin setting; every artifact is written in English. Each gate page is shown entirely in the conversation language, keys, technology names and paths aside, and says which English document you approve. Gate 0 has no page: the brainstorm shows its summary in the terminal, translated, and names the English document you approve.

### Running a stage

Stage 0 is `/idea-to-issues:brainstorm`. An idea alone is enough; a prototype link, earlier notes or competitors you already know are welcome, not needed. A working notes file, `docs/brainstorm/notes.md`, grows across as many sessions as you want. It proposes one activity at a time: user scenarios, an attack on the idea by two subagents with opposed positions (both arguments and both rebuttals are shown verbatim, and you rule), alternative product shapes, and a deep competitor analysis. When you say the brainstorm is done, it writes `docs/brainstorm/summary.md` (the chosen shape, the key scenarios, what was rejected and why), shows it translated in the terminal and asks you to run `/idea-to-issues:approve brainstorm`.

Stage 1 is `/idea-to-issues:concept`. It starts with `i2i gate require concept` and stops unless the brainstorm summary is approved and unchanged since. It reads the approved summary, asks once for a prototype link if you have one, and interviews you one question at a time: the problem, the audience, the first version, how it differs from the brainstorm's competitors, and the product facts the stack stage depends on — the platform, the number of users, offline use, the budget, the language your users read on screen, and whether each stack category is needed. It runs no competitor search of its own. Every answer is a numbered ruling in `docs/CONCEPT.md`; a ruling that decides a stack category is tagged with the category names, so the stack stage can cite it. It ends by asking you to run `/idea-to-issues:approve concept`.

The stack stage is `/idea-to-issues:stack`. It starts with `i2i gate require stack` and stops unless the concept is approved and unchanged since, and stops before writing anything when a stack category has no ruling in the concept. For every category the concept needs, and the three always needed, two subagents argue the owner's default against the best alternative, each with a rebuttal, and the row records both verbatim with the reason one won; a deviation gets an ADR. Categories the concept ruled out go to an exclusion ledger that one more subagent challenges; every concept ruling is mapped. The gate page shows the debates in the conversation language; you approve `docs/stack.md` with `/idea-to-issues:approve stack`. Before the gate page, `i2i stack check docs` refuses a stack that drops a category, excludes an always-needed one, cites a ruling the concept does not have, leaves a row without its driver or leaves a ruling unmapped; the next stage's `i2i gate require` runs the same check. The research behind each default is `i2i stack defaults`.

The design stage is `/idea-to-issues:design`. It starts with `i2i gate require design` and stops unless the concept and the stack are approved and unchanged since, and the stack passes its check. It needs a concept ruling on the language your users read on screen, and stops until you add one. It proposes the first-version screens from the concept's rulings and the brainstorm's scenarios and puts them to you one question at a time; with your prototype it moves it onto the chosen UI library and lists every change for your ruling, without one three subagents draw three directions you choose from. It writes a self-contained `docs/design/prototype.html` (every screen in its empty, filled and error states, at mobile and desktop widths, with an id on every screen, state and transition), `docs/design/index.md` as the gate document, and per-screen PNGs with `i2i design shots`. Before the gate page, `i2i design check` refuses a design whose `index.md` and prototype disagree: a screen in one and not the other, a screen without its empty, filled and error states, or a transition to a screen that does not exist; the next stage's `i2i gate require` runs the same check. The prototype is published as a private Artifact byte for byte from `docs/design/prototype.html`, and republished from the file after every change you ask for in review; you commit `docs/design/` once and approve with `/idea-to-issues:approve design`. The format is in `docs/CONTRACT.md`.

Stage 2 is `/idea-to-issues:blueprint`. It starts with `i2i gate require blueprint` and stops unless the concept, the stack and the design are approved and unchanged since. It settles the open threads the concept hands to it, writes `docs/blueprint.md` and one ADR per hard-to-reverse choice in `docs/adr/`, and shows gate 2 as a private Artifact page, or as a markdown summary in the terminal where the Artifact tool is not available. The page is a view of the markdown: you approve `docs/blueprint.md` with `/idea-to-issues:approve blueprint`. It runs on Fable, the strongest model (see [Models and cost](#models-and-cost)). It reads `docs/stack.md` and `docs/design/index.md`: every technology it names is a `Chosen:` row of the stack, a layer the stack lacks becomes an open thread that sends you back to `/idea-to-issues:stack`, and its Screens table carries the design's screens and ids. Its ADRs are numbered after the stack's, in the shared `docs/adr/`.

Stage 3 is `/idea-to-issues:specs`. It starts with `i2i gate require specs` and stops unless the blueprint is approved and unchanged since. It writes one `docs/specs/<key>.md` per epic in the blueprint: acceptance criteria in the contract format, a slice table with the epic's walking skeleton first, a coverage table, and the `### [KEY-N]` ticket blocks. It runs `i2i check docs/specs` and fixes every finding before it hands over to the tickets stage; `check` enforces the structure, and whether an acceptance criterion is measurable stays the agent's review. Commit `docs/specs` before the tickets stage, which pins it at gate 3.

Stage 4 is `/idea-to-issues:tickets`. It starts with `i2i gate require tickets` and `i2i check docs/specs`, and stops unless both pass. It asks you to order the epics and writes the order to `docs/specs/index.md`; inside an epic, the order follows from the blockers. `file` does not read this order and files the epics in file-name order: the order is what gate 3 approves and what the build follows. The stage shows gate 3 as a private Artifact page with the epic → ticket graph, or as the `check --render` table in the terminal, and you approve `docs/specs/index.md` with `/idea-to-issues:approve tickets`. It then asks which GitHub Project the epics go into. It never creates one, so a new Project is yours to create with `gh project create`, and its "Auto-add sub-issues to project" workflow should be on, because `file` adds only the epics. It shows `i2i file --dry-run`, runs `i2i file --apply` only on your yes, and ends when `i2i verify --wait` exits 0. A run that was interrupted starts again at the dry run, which lists only the writes still missing.

### Models and cost

Each stage skill names its model in its front matter, and each subagent dispatch names its model in the skill text. The owner chose them on 2026-10-25.

| Stage | Session model | Subagents | Cost of the stage |
|---|---|---|---|
| brainstorm | Opus | the attack pair and its rebuttals: Opus | about $2.60 |
| concept | Opus | none | about $2.20 |
| stack | Opus | per row, the advocate pair and its rebuttals: Opus; the ledger challenger: Opus | about $23 |
| design | Opus | one per direction, in parallel: Opus | not measured yet; measure on the first real run |
| blueprint | Fable | none | about $12 |
| specs | Opus | none | about $4.70 |
| tickets | Sonnet | none | about $1.70 |

The grilling skill runs on the model of the stage that uses it (`model: inherit`); its fact-lookup subagent runs on Sonnet.

**One full run costs about $46**, at API list prices. Basis: the token counts of the pilot runs on one product, measured on 2026-10-25, priced at the chosen models with the prices of 2026-10-21 per million tokens: Fable $10 input and $50 output, Opus $4 and $20, Sonnet $2 and $10. Most of those runs used a model other than the one chosen now, and a different model spends a different number of tokens, so every figure is an estimate. The stack stage grows with the product: about $1.80 per row, and the pilot product had 13. Prices change; check the current ones before you rely on these. The design stage is not in that figure yet.

A skill's `model:` lasts only for the turn that invokes it, so start each stage's session on the stage's model with `claude --model <model>`, for example `claude --model fable` for the blueprint: the flag applies to that session only. Inside a running session, open `/model` and press `s` on the model's row instead. Typing `/model <model>` directly, or pressing Enter in the picker, also saves the model as the default for new sessions, so the next stage would start on it too. If that happened, open `/model`, select the model new sessions should start on, and press Enter.

A subagent dispatch that names its model runs on it, whatever the session model. `CLAUDE_CODE_SUBAGENT_MODEL` changes only dispatches that name none, and `CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1` makes Claude Code ignore the models the skills name.

### Stack defaults

The plugin ships the owner's default for every stack category a product may need: the application layers (monorepo, web framework and hosting, API framework and hosting, data access, database engine and hosting), the UI library, the runtime services (auth, file storage, email, push, payments, AI APIs) and three operations categories (CI/CD, error tracking, analytics). They are the `CATEGORIES` list in `bin/lib/stack.mjs`. Each entry names its default and, unless the category is always needed, the concept question that decides whether a product needs it. CI/CD, error tracking and analytics are always needed. The concept stage asks every such question, so each answer is a numbered ruling in `docs/CONCEPT.md` that the stack stage cites.

[`docs/stack-defaults.md`](docs/stack-defaults.md) records, per category, the options considered, the reasons and the sources. The stack stage argues these defaults per product and reads them with `i2i stack defaults [<category>…]`; the blueprint builds on the approved `docs/stack.md` and reopens no row. Defaults age: changing one is a PR to `CATEGORIES` and to its section in that file.

## The gates

| Gate | What you approve |
|---|---|
| brainstorm | the summary, read translated in the terminal, as the English document |
| concept | the rulings on the open questions, one question at a time |
| stack | the argued rows, the exclusion ledger and its challenge, on a rendered page |
| design | the screen inventory, states and flows on a rendered page, and the prototype itself as a second page |
| blueprint | the architecture, on a rendered page |
| tickets | the ticket graph on a rendered page, then a `file --dry-run` that lists every write before anything reaches GitHub |

Before the stack gate page, `stack check docs` rejects a `docs/stack.md` that drops a category or cites a ruling the concept does not have; the format is in `docs/CONTRACT.md`. Before the design gate page, `design check` rejects a `docs/design` whose inventory and prototype disagree; the format is in `docs/CONTRACT.md`.

Before gate 3, `check` rejects a ticket graph that is cyclic, leaves an acceptance criterion uncovered, or is malformed. The spec format is `docs/CONTRACT.md`.

### Gate stamps

An approval is front matter on the gate's document. There is no state file.

```yaml
---
approved: 2026-10-18
digest: sha256:<hash of the document body>
based-on: docs/CONCEPT.md@<commit sha>
---
```

| Gate | Document | `based-on` |
|---|---|---|
| brainstorm | `docs/brainstorm/summary.md` | none |
| concept | `docs/CONCEPT.md` | `docs/brainstorm/summary.md` |
| stack | `docs/stack.md` | `docs/CONCEPT.md` |
| design | `docs/design/index.md` | `docs/design`, without `index.md` itself |
| blueprint | `docs/blueprint.md` | `docs/design/index.md` |
| tickets | `docs/specs/index.md` | `docs/specs`, without `index.md` itself |

- `digest` pins the approved body, so a document edited after its approval no longer counts as approved.
- A gate also pins the body of every approved document before it (the documents in the table), at the commit its `based-on` names. `require` fails when any of those bodies differs from what that commit holds, and names the gate to approve again. Only the body counts: a re-approval that changes nothing but the front matter invalidates no later gate; a re-approval after a body edit invalidates every gate after it, in order.
- The blueprint's digest covers `docs/blueprint.md` only, not `docs/adr/`. Each blueprint ADR's decision is repeated in one line in the blueprint's Decisions table, so that line is what gate 2 approves.
- The stack's digest covers `docs/stack.md` only, not `docs/adr/`. Each row's `Chosen:`, `Why:` and `ADR:` lines are what the stack gate approves.
- The design's digest covers `docs/design/index.md` only; its `based-on` pins everything else under `docs/design/`, so an edited prototype or a new PNG fails the next gate until the design is approved again. The blueprint pins `docs/design/index.md`: a blueprint approved before the design stage existed carries `based-on: docs/CONCEPT.md@…` and fails `gate require specs` until the stack and the design are approved and the blueprint is approved again.
- The concept's `based-on` pins `docs/brainstorm/summary.md` only, not `docs/brainstorm/notes.md`: the notes stay free to grow after gate 0.
- `based-on` pins the upstream document at the commit the approval was made against. `gate stamp` takes the sha from `git rev-parse HEAD` and refuses while the upstream has uncommitted changes, so commit each approval before you approve the next gate. It also refuses while an approved document further up has a body edit that HEAD does not hold, because the stamp would be stale the moment that edit is committed.
- `i2i gate require <stage>` runs `git fetch`, then fails unless every gate before `<stage>` is approved, unedited since, and current with what it was based on, every approved document before it included. It checks both the working tree and the upstream branch, because `git fetch` updates the upstream branch but not the working tree, so an edit made on GitHub is visible only there. `require file` checks gate 3 before filing. When `stack` is among the gates it checks, `require` also runs `stack check` on `docs/stack.md` and refuses while it has a finding; when `design` is among them it likewise runs `design check` on `docs/design`. `gate stamp` never runs either check.

Only `/idea-to-issues:approve <gate>` calls `gate stamp`, and its `disable-model-invocation: true` means only you can fire it, not the agent. An agent with Bash can still run `i2i.mjs gate stamp` directly. A user-only command turns "forgot the gate" into "deliberately forged it", which is the most a plugin can do.

## The spine: `bin/i2i.mjs`

One zero-dependency Node tool with six modes:

| Mode | Purpose |
|---|---|
| `check` | validates the spec blocks before gate 3 |
| `file --dry-run \| --apply [--limit N] [--project <title>]` | creates Issues, parent and blocked-by links, labels and Project items in dependency order |
| `verify [--wait] [--interval <s>] [--timeout <s>]` | compares the approved spec blocks with what GitHub holds |
| `gate stamp \| require` | writes and checks the approval front matter |
| `stack defaults [<category>…] \| check [<dir>]` | prints each stack category's default, question and research for the stack stage, or checks `docs/stack.md` against `docs/CONCEPT.md` |
| `design shots [<dir>] \| check [<dir>]` | screenshots every `data-screen` of `docs/design/prototype.html` at 390×844 and 1440×900 in the light theme into `docs/design/png/`, finding Chrome through `I2I_CHROME` or the default locations; or checks `docs/design/index.md` against the prototype: ids both ways, three states per screen, transition targets |

Run `node bin/i2i.mjs --help` for the usage.

### Filing

`file` refuses unless gate 3 passes (`gate require file`) and `check` passes, then files `docs/specs`, the directory gate 3 approved. On every run it rebuilds the key to number map from GitHub issue titles (`[KEY]` epics, `[KEY-N]` tickets, open and closed) and writes no map. `--dry-run` prints every write and makes none; `--apply` performs them in order, and `--limit N` stops after N writes. A re-run skips the keys GitHub already holds and only adds missing links. `--project <title>` names the Project; only epic parents are added to it, because GitHub adds their sub-issues itself.

### Verifying

`verify` runs after filing and never writes. Like `file`, it refuses unless gate 3 and `check` pass. It then reads `gh issue list --state all`, native links only, and checks every key of `docs/specs` against it. It reports four defects:

- `missing-issue`: no issue holds a key.
- `duplicate-issue`: a key is held by two issues, as in `KEY-7 held by #12 and #31`.
- `parent`: a ticket has no parent, or a parent other than its epic.
- `missing-blocker`: a `blocked-by` key is not a native blocker of the ticket.

Each defect is printed as `[KEY] rule: message` on stderr, and the exit code is 1. When there is no defect, the exit code is 0. A key that the specs do not define is ignored.

GitHub fills in a Project after the write that triggered it, for example when it adds an epic's sub-issues. `--wait` polls the listing every `--interval` seconds (default 5) until two consecutive polls agree. Two polls agree when they show the same issues, parents, blockers and Project item counts. Only then does `verify` compare. If the listing is still changing after `--timeout` seconds (default 120), `verify` exits 1 and verifies nothing.

## Install

In Claude Code:

```
/plugin install idea-to-issues --marketplace Solonious/idea-to-issues
```

Or in two steps:

```
/plugin marketplace add Solonious/idea-to-issues
/plugin install idea-to-issues@idea-to-issues
```

## Settings

| Option | Default | Purpose |
|---|---|---|
| `language` | English | The language the stage skills talk to you in and show gate pages in. Set when you enable the plugin. Documents stay in English. |

## Requirements

- [GitHub CLI](https://cli.github.com/) `gh` 2.94 or later, authenticated with the `project` scope: `gh auth refresh -s project`
- Node.js 20 or later
- Google Chrome or Chromium, for `i2i design shots`
- git

## Development

No npm dependencies and no install step. Before opening a pull request, run:

```bash
node --test
claude plugin validate .
```

CI runs both on every push and pull request.

## Releasing

Three evals under `evals/` run before a release. Each starts from a scaffolded workspace.

- `upstream-edited`: the concept was edited after the blueprint was approved. The specs stage must stop and name the change.
- `cyclic-graph`: a spec holds a dependency cycle. The tickets stage must file nothing and `check` must report the cycle.
- `no-artifact-tool`: gate 2 runs without the Artifact tool. The markdown fallback must render.

```bash
claude plugin eval . --runs 1 --ablation none --scaffold --allow-tools 'Bash(i2i.mjs:*)' 'Bash(node:*)' Write
```

One suite run is three full agent runs, one per case, on your own credential. `--ablation none` skips the no-plugin baseline arm, and every grader is free, so there are no judge calls. The blueprint case costs the most, because that stage runs on the strongest model. `--max-cost-usd <usd>` sets a ceiling.

No case can reach GitHub. No grant names `gh`. The scaffolds create no remote and never approve gate 3, so `i2i file` refuses before it calls `gh`. A grader fails any run that calls `gh` or `file --apply`.

The evals are a release checklist, not CI. The scaffold test in `node --test` checks the fixtures on every push.

## Credits

The `grilling` skill is adapted from Matt Pocock's `grilling` skill in [mattpocock/skills](https://github.com/mattpocock/skills), MIT License. Its license is `skills/grilling/LICENSE`.

## License

[MIT](LICENSE)
