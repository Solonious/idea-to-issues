# idea-to-issues

A Claude Code plugin that turns a product idea into a gated plan and a native GitHub Issues graph: concept, blueprint, specs, tickets.

> **Status: early development.** The plugin installs. The `i2i` modes and the concept and blueprint stages are in; the other stages are still being built. Progress is tracked in this repository's issues.

## What it does

You bring an idea. The plugin walks it through four stages, one session each. Every stage writes a document to your repository and ends at a gate: either a human approval or a mechanical check. The last stage files the result as GitHub Issues, with native parent and blocked-by links, labels and Project items.

The agent holds the judgement: the concept, the architecture, the specs, and whether an acceptance criterion is measurable. Code holds the structure, the gate stamps and every GitHub write.

## The four stages

| Stage | Output | Ends at |
|---|---|---|
| concept | `docs/CONCEPT.md` | gate 1 |
| blueprint | `docs/blueprint.md`, `docs/adr/` | gate 2 |
| specs | `docs/specs/<epic>.md`, with acceptance criteria and `### [KEY-N]` ticket blocks | the mechanical `check` |
| tickets | `docs/specs/index.md` (epic order), then the Issues | gate 3 |

Each stage starts by checking that the stage before it is approved and has not changed since. The conversation language is a plugin setting; every artifact is written in English.

### Running a stage

Stage 1 is `/idea-to-issues:concept`. Give it your idea and, if you have one, a prototype link. It scans a few close products, interviews you one question at a time, and writes `docs/CONCEPT.md`. It ends by asking you to run `/idea-to-issues:approve concept`.

Stage 2 is `/idea-to-issues:blueprint`. It starts with `i2i gate require blueprint` and stops unless the concept is approved and unchanged since. It settles the open threads the concept hands to it, writes `docs/blueprint.md` and one ADR per hard-to-reverse choice in `docs/adr/`, and shows gate 2 as a private Artifact page, or as a markdown summary in the terminal where the Artifact tool is not available. The page is a view of the markdown: you approve `docs/blueprint.md` with `/idea-to-issues:approve blueprint`. Run this stage on your strongest model. The skill asks for `model: best`, which lasts only for its first turn, so switch with `/model best` before you start.

### The fixed stack

The blueprint always designs on the same stack: an Nx monorepo, an Angular web app on Vercel, a NestJS API on Railway, and Prisma for data access. That is the author's opinion, not a recommendation for every product, and the plugin offers no other stack. What the stack leaves open, such as the database engine, is recorded as an ADR. A product the stack cannot serve, such as a native mobile app, is flagged at gate 2 rather than quietly redesigned.

## The three gates

1. **Concept**: the owner rules on the open questions, one question at a time.
2. **Blueprint**: the owner reviews the architecture on a rendered page.
3. **Tickets**: the owner reviews the ticket graph on a rendered page, then a `file --dry-run` that lists every write before anything reaches GitHub.

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
| concept | `docs/CONCEPT.md` | none |
| blueprint | `docs/blueprint.md` | `docs/CONCEPT.md` |
| tickets | `docs/specs/index.md` | `docs/specs`, without `index.md` itself |

- `digest` pins the approved body, so a document edited after its approval no longer counts as approved.
- The blueprint's digest covers `docs/blueprint.md` only, not `docs/adr/`. Each ADR's decision is repeated in one line in the blueprint's Decisions table, so that line is what gate 2 approves.
- `based-on` pins the upstream document at the commit the approval was made against. `gate stamp` takes the sha from `git rev-parse HEAD` and refuses while the upstream has uncommitted changes, so commit each approval before you approve the next gate.
- `i2i gate require <stage>` runs `git fetch`, then fails unless every gate before `<stage>` is approved, unedited since, and current with what it was based on. It checks both the working tree and the upstream branch, because `git fetch` updates the upstream branch but not the working tree, so an edit made on GitHub is visible only there. `require file` checks gate 3 before filing.

Only `/idea-to-issues:approve <gate>` calls `gate stamp`, and its `disable-model-invocation: true` means only you can fire it, not the agent. An agent with Bash can still run `i2i.mjs gate stamp` directly. A user-only command turns "forgot the gate" into "deliberately forged it", which is the most a plugin can do.

## The spine: `bin/i2i.mjs`

One zero-dependency Node tool with four modes:

| Mode | Purpose |
|---|---|
| `check` | validates the spec blocks before gate 3 |
| `file --dry-run \| --apply [--limit N] [--project <title>]` | creates Issues, parent and blocked-by links, labels and Project items in dependency order |
| `verify [--wait] [--interval <s>] [--timeout <s>]` | compares the approved spec blocks with what GitHub holds |
| `gate stamp \| require` | writes and checks the approval front matter |

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
| `language` | English | The language the stage skills talk to you in. Set when you enable the plugin. Documents stay in English. |

## Requirements

- [GitHub CLI](https://cli.github.com/) `gh` 2.94 or later, authenticated with the `project` scope: `gh auth refresh -s project`
- Node.js 20 or later
- git

## Development

No npm dependencies and no install step. Before opening a pull request, run:

```bash
node --test
claude plugin validate .
```

CI runs both on every push and pull request.

## Credits

The `grilling` skill is adapted from Matt Pocock's `grilling` skill in [mattpocock/skills](https://github.com/mattpocock/skills), MIT License. Its license is `skills/grilling/LICENSE`.

## License

[MIT](LICENSE)
