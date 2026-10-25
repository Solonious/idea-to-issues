# Stack: <product name>

Concept: `docs/CONCEPT.md`

## Capability profile

<!-- One line per group of CATEGORIES that share a question, in CATEGORIES order, categories in CATEGORIES order inside the group: `<categories>: yes|no — Ruling N`, where Ruling N is the concept ruling whose [stack: …] tag names them. The always-needed categories are one line ending `: always`. -->

- `monorepo`: yes — Ruling 7
- `web-framework`, `web-hosting`, `ui-library`: yes — Ruling 5
- `api-framework`, `api-hosting`: no — Ruling 8
- `ci-cd`, `error-tracking`, `analytics`: always

## Rows

<!-- One `### ` section per needed or always-needed category, in CATEGORIES order, then one per need outside CATEGORIES in ruling order. A CATEGORIES row's heading is the backticked category; a row for a need outside CATEGORIES has a plain heading and `Default: none — the owner decides`. Ten labelled lines at column 0, each exactly once, in this order. Default, Chosen, Driver, Alternative and ADR carry their value on the line. Driver is `Ruling N`, or `always` on an always-needed category's row. The four argument labels and Why stand alone on their line; the text follows. The four arguments are a subagent's words verbatim, every line prefixed `> ` (a blank line inside is `>`), so no line of them can read as a label. Why is the stage's own prose, plain lines up to ADR. ADR is `NNNN` when Chosen is not the default (a deviation, or a row with no default), else `none`. -->

### `monorepo`

Default: Nx
Chosen: Nx
Driver: Ruling 7
Alternative: Turborepo
For the default:
> <the default advocate's argument, verbatim>
For the alternative:
> <the alternative advocate's argument, verbatim>
Rebuttal by the default:
> <where I was wrong, where I still disagree, what I now propose — verbatim>
Rebuttal by the alternative:
> <verbatim>
Why:
<which side won and the concept fact that decided it, citing Ruling N; "the owner overrides at the gate">
ADR: none

### realtime

Default: none — the owner decides
Chosen: <the owner's answer>
Driver: Ruling 12
Alternative: <the other candidate>
For the default:
> <the case for the candidate that became Chosen, verbatim>
For the alternative:
> <verbatim>
Rebuttal by the default:
> <verbatim>
Rebuttal by the alternative:
> <verbatim>
Why:
<the owner's answer and reason; the stage's recommendation>
ADR: 0002

## Exclusion ledger

<!-- One row per category the concept ruled out, in CATEGORIES order; the Ruling is the one whose [stack: …] tag names the category; the Reason is one line from that ruling's "why". An always-needed category never appears here. -->

| Category | Ruling | Reason |
|---|---|---|
| `api-framework` | Ruling 8 | <one line> |

## Ledger challenge

<!-- The one challenger subagent's report, verbatim as a blockquote, then one `Finding:` line per finding — `Finding: none`, or `Finding: Ruling N needs \`<category>\`, excluded by Ruling M`. The stage resolves nothing here: the owner decides at the gate whether to approve anyway or revise docs/CONCEPT.md. -->

> <verbatim report>

Finding: none

## Rulings mapping

<!-- One row per concept ruling, in the concept's order. Maps to is the row heading(s) the ruling drives (backticked categories, or a plain service name), `ledger`, or `no runtime need`. -->

| Ruling | Maps to |
|---|---|
| Ruling 1 | no runtime need |
| Ruling 5 | `web-framework`, `web-hosting`, `ui-library` |
| Ruling 8 | ledger |
| Ruling 12 | realtime |
