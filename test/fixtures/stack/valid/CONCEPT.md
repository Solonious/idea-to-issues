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
16. Which language or languages will the product's users read on screen? → English — the household reads English

## Open threads

- Plant photos: settled by whether the household asks for them after a month
