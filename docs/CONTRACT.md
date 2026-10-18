# Spec format contract

`docs/specs/<epic>.md` files are the input of gate 3. `i2i check <dir>` enforces this contract before the gate: it reads every epic file in `<dir>` and reports each violation, so that a ticket graph that is cyclic, uncovered or malformed never reaches the owner. The grammar is strict on purpose: anything ambiguous is rejected, not guessed.

## Directory and epic file

`<dir>` is the specs directory itself (for example `docs/specs`). Every `*.md` file directly inside it is an epic, in sorted file-name order; subdirectories are ignored and `index.md` is reserved for the epic order and skipped.

An epic file may start with front matter: line 1 is exactly `---` and the block ends at the next line that is exactly `---`. `check` skips the block without reading it and does not validate any key in it. An opening `---` with no closing one is an `epic-heading` finding. Line numbers in findings are always real file line numbers.

The first non-blank line after the front matter is the epic heading, `# [KEY] <title>`, where `KEY` matches `[A-Z][A-Z0-9]*`. No other `# ` line is allowed. `## ` headings are free in the preamble (everything before the first `### ` line) and are not allowed after the first ticket.

## Acceptance criteria

Acceptance criteria are listed in the preamble only, one per line:

```
- **AC-<n>** <text> — verify: <how it is measured>
```

`—` is U+2014 (em dash) with a space on each side. `n` is a positive integer without leading zeros, unique within the epic; ids are scoped to their epic. A preamble line that starts with `- **AC-` and does not match is `malformed-ac`. An empty `verify` is a `verify` finding. Whether an AC is truly measurable stays the agent's review.

## Ticket heading

```
### [KEY-N] <title>
```

`KEY` must equal the epic key and `N` is a positive integer. A key may be defined only once across all epic files.

## Meta line

The first non-blank line after the heading holds exactly these fields, in this order, separated by ` · ` (U+00B7 middle dot with a space on each side):

```
effort: S|M|L|XL · blocked-by: KEY-N, … · covers: AC-n, …
```

Lists are separated by `, `. An empty list is written with the keyword `none`, alone. `blocked-by` may name tickets in any epic. `covers` names ACs of the ticket's own epic.

## Sections

Each ticket has these eight `#### ` sections, in this order, each exactly once: Problem, Proposed solution, Affected areas, Acceptance criteria, Validation, Dependencies, Risks, Notes for implementer. Bodies may be empty. `#####` and deeper headings are body text.

## Fences

A line starting with three or more backticks or tildes opens a fenced block; it closes on a line of the same character, at least as long, with nothing else. Lines inside a fence are opaque: they are never read as headings, ACs or meta lines. A fence that is never closed is an `unclosed-fence` finding, because everything after it would otherwise vanish unread.

## Rules

Every finding is printed as `<file>:<line>: [<key>] <rule>: <message>`.

| Rule | Meaning |
|---|---|
| `epic-heading` | the epic heading is missing or malformed, a second `# ` line, or unclosed front matter |
| `malformed-ac` | an `- **AC-` line does not match the grammar |
| `duplicate-ac` | an AC id is defined twice in one epic |
| `verify` | an AC has no `verify` text |
| `coverage` | an AC is covered by no ticket |
| `malformed-heading` | a `### ` line is not a ticket heading, or a `## ` line follows the first ticket |
| `foreign-key` | the ticket key prefix differs from the epic key |
| `duplicate-key` | a ticket key is defined twice |
| `malformed-meta` | the meta line is missing or breaks the grammar |
| `effort` | the effort is missing or not one of S, M, L, XL |
| `unknown-ac` | `covers` names an AC the epic does not define |
| `sections` | a section is missing, unknown, duplicated or out of order |
| `unclosed-fence` | a fenced block is opened and never closed |
| `cap` | an epic has more than 100 tickets, GitHub's sub-issue cap |
| `unknown-blocker` | a `blocked-by` key names no ticket |
| `cycle` | the blocked-by graph has a cycle; the message is the path, such as `AUTH-1 → AUTH-2 → AUTH-1` |

## Output and exit codes

- `0`: no findings. stdout is `check: <e> epics, <t> tickets, <a> ACs, 0 findings`.
- `1`: at least one finding. Each is printed on stderr, then `check: <n> finding(s)`. Nothing is printed on stdout, even with `--render`.
- `2`: usage error, a missing directory, or a directory without epic files.

## `--render`

On success, `check --render <dir>` prints a markdown table instead of the summary, one row per ticket in dependency order (a ticket's blockers come first; ties follow epic file order, then file order). Empty lists show `—`.

```
| Epic | Ticket | Effort | Blocked by | Covers |
```

## Example

Two epics that pass `check`. `BILL-1` is blocked by a ticket of another epic.

````markdown auth.md
# [AUTH] Authentication

## Acceptance criteria

- **AC-1** A user can sign in — verify: the login test passes
- **AC-2** A session survives a reload — verify: the cookie test passes

## Tickets

### [AUTH-1] Login form

effort: S · blocked-by: none · covers: AC-1

#### Problem

Text.

#### Proposed solution

Text.

#### Affected areas

Text.

#### Acceptance criteria

Text.

#### Validation

```bash
node --test
```

#### Dependencies

Text.

#### Risks

Text.

#### Notes for implementer

Text.

### [AUTH-2] Session cookie

effort: M · blocked-by: AUTH-1 · covers: AC-2

#### Problem

Text.

#### Proposed solution

Text.

#### Affected areas

Text.

#### Acceptance criteria

Text.

#### Validation

```bash
node --test
```

#### Dependencies

Text.

#### Risks

Text.

#### Notes for implementer

Text.
````

````markdown billing.md
# [BILL] Billing

## Acceptance criteria

- **AC-1** An invoice can be exported — verify: the export test passes

## Tickets

### [BILL-1] Invoice PDF

effort: L · blocked-by: AUTH-2 · covers: AC-1

#### Problem

Text.

#### Proposed solution

Text.

#### Affected areas

Text.

#### Acceptance criteria

Text.

#### Validation

```bash
node --test
```

#### Dependencies

Text.

#### Risks

Text.

#### Notes for implementer

Text.
````

`test/check.test.mjs` extracts these fences and runs `check` on them, so the example is the contract's executable form.
