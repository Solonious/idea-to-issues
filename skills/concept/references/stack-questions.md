# Stack questions

The concept interview (Step 3) asks every question on this page, as written, one per turn, each with a recommended answer taken from the brainstorm summary's Chosen shape and Key scenarios. The owner's answer becomes a numbered ruling in `docs/CONCEPT.md`. The questions in the second table are the ones in `CATEGORIES` (`bin/lib/stack.mjs`), word for word; a test pins them, so a changed question is a change to `CATEGORIES` first.

The table order is not the asking order: ask the platform first, then let the grilling frontier decide.

## Product facts

| Fact | Question |
|---|---|
| platform | Where will people use the product: in a browser, as a native mobile app, on the desktop, from the command line, or inside another tool? |
| users | How many people will use it in its first year: one person, a household or a small team, hundreds, or the public? |
| offline | Must the product work without a network connection, and if so, what must work offline? |
| budget | How much may the first version cost a month in hosting and third-party services? |

## Stack categories

A ruling that answers a question in this table ends with `[stack: …]` listing the category names from its Decides cell, without their backticks, in that order.

| Decides | Question |
|---|---|
| `monorepo` | Will the product ship more than one deployable app or service, such as a web app and an API, from one codebase? |
| `web-framework`, `web-hosting`, `ui-library` | Does the product need a user interface in the browser, or is it an API, a CLI or an integration only? |
| `api-framework`, `api-hosting` | Does the product need server-side logic or data shared between users, or can it run entirely in the browser? |
| `data-access`, `database-engine`, `database-hosting` | Does the product store data on a server: records that outlive a session or are shared between users? |
| `auth` | Will people sign in to the product, or does any of its data belong to a specific person? |
| `file-storage` | Will users upload or download files in the product, such as images, documents or exports? |
| `email` | Must the product ever email a user, such as a sign-in link, a password reset, a receipt or an alert? |
| `push` | Must the product alert users while they do not have it open? |
| `payments` | Will users pay money inside the product: a subscription, a one-off purchase or usage charges? |
| `ai-api` | Does any feature need to generate, summarise, classify or converse in natural language rather than follow fixed rules? |

`ci-cd`, `error-tracking` and `analytics` are always needed and never asked about: never tag a ruling with them.
