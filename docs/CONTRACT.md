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

# Stack document contract

`docs/stack.md` is checked against the rulings of `docs/CONCEPT.md`. `i2i stack check [<dir>]` reads `<dir>/stack.md` and `<dir>/CONCEPT.md` (`<dir>` defaults to `docs`) and reports findings in the same shape as `check`: `<file>:<line>: [<key>] <rule>: <message>`. A leading front matter block is skipped and line numbers stay real. Fenced code, and every line that starts with `>` (the subagents' verbatim arguments), is opaque to ruling references.

The concept's rulings are the `N. ` items under `## Rulings`, up to the next `## ` heading. The stack document has three sections the check reads; every other section is free text:

- `## Rows`: one `### ` heading per row. A row for a category of the tool's list is headed with the backticked category (`` ### `web-framework` ``); a row for a need outside that list has a plain heading. A line `Driver: Ruling N` names the ruling that drives the row; `Driver: always` is allowed only on the row of an always-needed category (`ci-cd`, `error-tracking`, `analytics`). The first `Driver:` line of a row counts.
- `## Exclusion ledger`: a table whose lines read `` | `<category>` | Ruling N | <reason> | ``, one per category the concept ruled out. An always-needed category never appears here.
- `## Rulings mapping`: a table whose lines read `| Ruling N | <maps to> |`, one per ruling of the concept. `<maps to>` is never empty.

Every `Ruling N` written outside a fence and outside a `>` line, in any section, must be a ruling of the concept.

| Rule | Meaning |
|---|---|
| `missing-category` | A category of the tool's list is neither a row nor a ledger line. The finding is on the `## Rows` line. |
| `not-needed-on-always-on` | An always-needed category is on the ledger. |
| `bad-ruling-ref` | A `Ruling N` that is not a ruling of the concept. One finding per occurrence. |
| `orphan-row` | A row without a `Driver: Ruling N` line (or `Driver: always` on an always-needed category's row). |
| `unmapped-ruling` | A ruling of the concept with no line in the mapping, or one that maps to nothing. |

Findings go to stderr, sorted by line, followed by `stack check: N finding(s)`, and the exit code is 1. With none, stdout reads `stack check: <rows> rows, <ledger> ledger lines, <mapped> rulings mapped, 0 findings` and the exit code is 0. A missing `stack.md` or `CONCEPT.md`, or a wrong argument, exits 2.

`i2i gate require <stage>` runs the same check once every gate before `<stage>` holds and `stack` is among them, and refuses the stage while `docs/stack.md` has a finding; `gate stamp` never runs it.

The example is a stack for a browser-only household plant reminder: its concept first, then its stack.

````markdown docs/CONCEPT.md
# Concept: Plant reminders

## Problem

A household keeps a dozen houseplants and forgets which one was watered when. Today they guess from a note on the fridge.

## Who it is for

The people of one household. Not a shop, not a garden centre.

## Competitors

The competitors activity was skipped.

## Rulings

1. Where will people use the product: in a browser, as a native mobile app, on the desktop, from the command line, or inside another tool? → In a browser — the household uses a laptop and a phone browser
2. How many people will use it in its first year: one person, a household or a small team, hundreds, or the public? → A household — four people
3. Must the product work without a network connection, and if so, what must work offline? → No — the household is always online at home
4. How much may the first version cost a month in hosting and third-party services? → Nothing — a hobby project
5. Will the product ship more than one deployable app or service, such as a web app and an API, from one codebase? → No — a single browser app [stack: monorepo]
6. Does the product need a user interface in the browser, or is it an API, a CLI or an integration only? → Yes — people use it in a browser [stack: web-framework, web-hosting, ui-library]
7. Does the product need server-side logic or data shared between users, or can it run entirely in the browser? → No — it runs entirely in the browser [stack: api-framework, api-hosting]
8. Does the product store data on a server: records that outlive a session or are shared between users? → No — the plants live in the browser [stack: data-access, database-engine, database-hosting]
9. Will people sign in to the product, or does any of its data belong to a specific person? → No — one shared household list [stack: auth]
10. Will users upload or download files in the product, such as images, documents or exports? → No — no photos in the first version [stack: file-storage]
11. Must the product ever email a user, such as a sign-in link, a password reset, a receipt or an alert? → No — reminders are on screen [stack: email]
12. Must the product alert users while they do not have it open? → No — the list is checked by hand [stack: push]
13. Will users pay money inside the product: a subscription, a one-off purchase or usage charges? → No — it is free [stack: payments]
14. Does any feature need to generate, summarise, classify or converse in natural language rather than follow fixed rules? → No — fixed watering intervals [stack: ai-api]
15. Should each plant show the shop it came from on a map? → Yes — the household buys from three shops

## Open threads

- Plant photos: settled by whether the household asks for them after a month
````

````markdown docs/stack.md
# Stack: Plant reminders

Concept: `docs/CONCEPT.md`

## Capability profile

- `monorepo`: no — Ruling 5
- `web-framework`, `web-hosting`, `ui-library`: yes — Ruling 6
- `api-framework`, `api-hosting`: no — Ruling 7
- `data-access`, `database-engine`, `database-hosting`: no — Ruling 8
- `auth`: no — Ruling 9
- `file-storage`: no — Ruling 10
- `email`: no — Ruling 11
- `push`: no — Ruling 12
- `payments`: no — Ruling 13
- `ai-api`: no — Ruling 14
- `ci-cd`, `error-tracking`, `analytics`: always

## Rows

### `web-framework`

Default: Angular
Chosen: Angular
Driver: Ruling 6
Alternative: Alternative web-framework
For the default:
> The default fits the concept.
For the alternative:
> The alternative fits less well.
Rebuttal by the default:
> Nothing to concede.
Rebuttal by the alternative:
> Nothing to add.
Why:
The default stands; Ruling 6 gives no fact it cannot meet.
ADR: none

### `web-hosting`

Default: Vercel
Chosen: Vercel
Driver: Ruling 6
Alternative: Alternative web-hosting
For the default:
> The default fits the concept.
For the alternative:
> The alternative fits less well.
Rebuttal by the default:
> Nothing to concede.
Rebuttal by the alternative:
> Nothing to add.
Why:
The default stands; Ruling 6 gives no fact it cannot meet.
ADR: none

### `ui-library`

Default: spartan/ui (Tailwind CSS v4)
Chosen: spartan/ui (Tailwind CSS v4)
Driver: Ruling 6
Alternative: Alternative ui-library
For the default:
> The default fits the concept.
For the alternative:
> The alternative fits less well.
Rebuttal by the default:
> Nothing to concede.
Rebuttal by the alternative:
> Nothing to add.
Why:
The default stands; Ruling 6 gives no fact it cannot meet.
ADR: none

### `ci-cd`

Default: GitHub Actions
Chosen: GitHub Actions
Driver: always
Alternative: Alternative ci-cd
For the default:
> The default fits the concept.
For the alternative:
> The alternative fits less well.
Rebuttal by the default:
> Nothing to concede.
Rebuttal by the alternative:
> Nothing to add.
Why:
Always needed; the default stands.
ADR: none

### `error-tracking`

Default: Sentry (EU region)
Chosen: Sentry (EU region)
Driver: always
Alternative: Alternative error-tracking
For the default:
> The default fits the concept.
For the alternative:
> The alternative fits less well.
Rebuttal by the default:
> Nothing to concede.
Rebuttal by the alternative:
> Nothing to add.
Why:
Always needed; the default stands.
ADR: none

### `analytics`

Default: PostHog Cloud EU
Chosen: PostHog Cloud EU
Driver: always
Alternative: Alternative analytics
For the default:
> The default fits the concept.
For the alternative:
> The alternative fits less well.
Rebuttal by the default:
> Nothing to concede.
Rebuttal by the alternative:
> Nothing to add.
Why:
Always needed; the default stands.
ADR: none

### maps

Default: none — the owner decides
Chosen: Leaflet
Driver: Ruling 15
Alternative: MapLibre
For the default:
> The default fits the concept.
For the alternative:
> The alternative fits less well.
Rebuttal by the default:
> Nothing to concede.
Rebuttal by the alternative:
> Nothing to add.
Why:
The owner decides; maps is the only candidate.
ADR: 0001

## Exclusion ledger

| Category | Ruling | Reason |
|---|---|---|
| `monorepo` | Ruling 5 | A single browser app |
| `api-framework` | Ruling 7 | It runs entirely in the browser |
| `api-hosting` | Ruling 7 | It runs entirely in the browser |
| `data-access` | Ruling 8 | The plants live in the browser |
| `database-engine` | Ruling 8 | The plants live in the browser |
| `database-hosting` | Ruling 8 | The plants live in the browser |
| `auth` | Ruling 9 | One shared household list |
| `file-storage` | Ruling 10 | No photos in the first version |
| `email` | Ruling 11 | Reminders are on screen |
| `push` | Ruling 12 | The list is checked by hand |
| `payments` | Ruling 13 | It is free |
| `ai-api` | Ruling 14 | Fixed watering intervals |

## Ledger challenge

> No ruling needs an excluded category.

Finding: none

## Rulings mapping

| Ruling | Maps to |
|---|---|
| Ruling 1 | no runtime need |
| Ruling 2 | no runtime need |
| Ruling 3 | no runtime need |
| Ruling 4 | no runtime need |
| Ruling 5 | ledger |
| Ruling 6 | `web-framework`, `web-hosting`, `ui-library` |
| Ruling 7 | ledger |
| Ruling 8 | ledger |
| Ruling 9 | ledger |
| Ruling 10 | ledger |
| Ruling 11 | ledger |
| Ruling 12 | ledger |
| Ruling 13 | ledger |
| Ruling 14 | ledger |
| Ruling 15 | maps |
````

`test/stack.test.mjs` extracts these fences and runs `stack check` on them, so the example is the contract's executable form.
