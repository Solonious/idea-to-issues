# Design: <product name>

Concept: `docs/CONCEPT.md` · Stack: `docs/stack.md` · Prototype: `docs/design/prototype.html`

## Inventory

<!-- One row per first-version screen. Id is the data-screen value ([a-z][a-z0-9-]*); Basis is the Ruling N of the concept that asks for the screen. -->

| Screen | Id | Basis | Purpose |
|---|---|---|---|
| <screen> | `<screen-id>` | Ruling N | <one line> |

## States

<!-- Every screen in its three states: say what the user sees in each. -->

| Screen | empty | filled | error |
|---|---|---|---|
| <screen> | <what shows> | <what shows> | <what shows> |

## Flows

<!-- One row per data-to in the prototype. -->

| From | To | Trigger |
|---|---|---|
| `<screen-id>` | `<screen-id>` | <the element the user taps> |

## Directions

<!-- The direction the owner chose, and why; one Rejected line for every other direction. With the owner's own prototype: "Owner prototype: no directions". -->

Chosen: `<slug>` — <why>
Rejected: `<slug>` — <why>

## Change list

<!-- Every change from the owner's prototype, and every change asked for in review. "none" when there is nothing. -->

| # | Change | From | Ruling |
|---|---|---|---|
| 1 | <what changed> | <where it came from> | Ruling N |

## Fidelity

<!-- What in the prototype is faithful to the chosen UI library, and what is an approximation. -->

- Faithful: <…>
- Approximated: <…>

## Screenshots

<!-- One pair per screen, from `i2i.mjs design shots`. -->

| Screen | Mobile | Desktop |
|---|---|---|
| `<screen-id>` | `png/<screen-id>-mobile.png` | `png/<screen-id>-desktop.png` |
