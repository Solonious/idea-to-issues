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
