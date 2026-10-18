# idea-to-issues

A Claude Code plugin that turns a product idea into a gated plan and a native GitHub Issues graph: concept, blueprint, specs, tickets.

> **Status: early development.** The plugin installs, but its stages and the `i2i` modes are still being built. Progress is tracked in this repository's issues.

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
- `based-on` pins the upstream document at the commit the approval was made against. `gate stamp` takes the sha from `git rev-parse HEAD` and refuses while the upstream has uncommitted changes, so commit each approval before you approve the next gate.
- `i2i gate require <stage>` runs `git fetch`, then fails unless every gate before `<stage>` is approved, unedited since, and current with what it was based on. It checks both the working tree and the upstream branch, because `git fetch` updates the upstream branch but not the working tree, so an edit made on GitHub is visible only there. `require file` checks gate 3 before filing.

Only `/idea-to-issues:approve <gate>` calls `gate stamp`, and its `disable-model-invocation: true` means only you can fire it, not the agent. An agent with Bash can still run `i2i.mjs gate stamp` directly. A user-only command turns "forgot the gate" into "deliberately forged it", which is the most a plugin can do.

## The spine: `bin/i2i.mjs`

One zero-dependency Node tool with four modes:

| Mode | Purpose |
|---|---|
| `check` | validates the spec blocks before gate 3 |
| `file --dry-run \| --apply [--limit N] [--project <title>]` | creates Issues, parent and blocked-by links, labels and Project items in dependency order |
| `verify` | compares the approved spec blocks with what GitHub holds |
| `gate stamp \| require` | writes and checks the approval front matter |

Run `node bin/i2i.mjs --help` for the usage.

### Filing

`file` refuses unless gate 3 passes (`gate require file`) and `check` passes, then files `docs/specs`, the directory gate 3 approved. On every run it rebuilds the key to number map from GitHub issue titles (`[KEY]` epics, `[KEY-N]` tickets, open and closed) and writes no map. `--dry-run` prints every write and makes none; `--apply` performs them in order, and `--limit N` stops after N writes. A re-run skips the keys GitHub already holds and only adds missing links. `--project <title>` names the Project; only epic parents are added to it, because GitHub adds their sub-issues itself.

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

## License

[MIT](LICENSE)
