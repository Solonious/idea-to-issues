# Design: Plant reminders

Concept: `docs/CONCEPT.md` · Stack: `docs/stack.md` · Prototype: `docs/design/prototype.html`

## Inventory

| Screen | Id | Basis | Purpose |
|---|---|---|---|
| Home | `home` | Ruling 6 | the plant list |
| Plant | `plant` | Ruling 6 | one plant |

## States

| Screen | empty | filled | error |
|---|---|---|---|
| Home | no plants yet | the plant list | the list did not load |
| Plant | no care history | the care history | the plant did not load |

## Flows

| From | To | Trigger |
|---|---|---|
| `home` | `plant` | the plant row |
| `plant` | `home` | Back |

## Directions

Owner prototype: no directions

## Change list

none

## Fidelity

- Faithful: spacing and colors follow the chosen UI library's tokens
- Approximated: the buttons are plain HTML with the library's class names

## Screenshots

| Screen | Mobile | Desktop |
|---|---|---|
| `home` | `png/home-mobile.png` | `png/home-desktop.png` |
| `plant` | `png/plant-mobile.png` | `png/plant-desktop.png` |
