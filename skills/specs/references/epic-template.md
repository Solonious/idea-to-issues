# [KEY] <epic title, as in the blueprint's Epics table>

<!-- Name the file after the epic key in lowercase (AUTH → auth.md): the name becomes the epic:<name> label. Replace KEY everywhere with the epic's key from the blueprint. -->

<What the epic delivers, in one or two sentences, from its row in the blueprint's Epics table.>

## Acceptance criteria

<!-- One line per criterion, in the contract format (docs/CONTRACT.md). Each verify names a test, a command or an observation with a pass or fail outcome. check enforces the format only; whether a criterion is measurable is your review. -->

- **AC-1** <what is true for a user when the epic is done> — verify: <the test, command or observation that shows it>
- **AC-2** <another thing that is true when the epic is done> — verify: <the test, command or observation that shows it>

## Slices

<!-- One row per ticket, in build order, built from the meta lines. Row 1 is the walking skeleton: the thinnest slice that runs end to end through every part the epic touches, blocked by no ticket of this epic. Every slice ships on its own; never split by layer. -->

| # | Ticket | Delivers | Blocked by |
|---|---|---|---|
| 1 | KEY-1 | Walking skeleton: <one real user action, end to end> | none |
| 2 | KEY-2 | <one more thing a user can do> | KEY-1 |

## Coverage

<!-- One row per AC, built from the tickets' covers lines. Every AC names at least one ticket. -->

| AC | Covered by |
|---|---|
| AC-1 | KEY-1 |
| AC-2 | KEY-2 |

## Tickets

### [KEY-1] <walking skeleton title>

effort: S · blocked-by: none · covers: AC-1

#### Problem

<What a user cannot do yet, in this slice's scope only.>

#### Proposed solution

<What to build through every part the slice touches, named from the blueprint's modules, API surface and screens.>

#### Affected areas

- <project, module or path>: <what changes>

#### Acceptance criteria

- [ ] AC-1: <the epic criterion this slice closes, restated for this slice>

#### Validation

```bash
<the command that checks it>
```

#### Dependencies

<!-- Why the slice waits for its blockers, in prose. file adds the "Depends on" line with the issue numbers itself. -->

None.

#### Risks

<What could go wrong, or "None identified.">

#### Notes for implementer

<The blueprint decisions and ADRs this slice must not reopen.>

### [KEY-2] <slice title>

effort: M · blocked-by: KEY-1 · covers: AC-2

#### Problem

<What a user cannot do yet, in this slice's scope only.>

#### Proposed solution

<What to build through every part the slice touches, named from the blueprint's modules, API surface and screens.>

#### Affected areas

- <project, module or path>: <what changes>

#### Acceptance criteria

- [ ] AC-2: <the epic criterion this slice closes, restated for this slice>

#### Validation

```bash
<the command that checks it>
```

#### Dependencies

Waits for KEY-1: <why this slice needs the walking skeleton in place>.

#### Risks

<What could go wrong, or "None identified.">

#### Notes for implementer

<The blueprint decisions and ADRs this slice must not reopen.>
