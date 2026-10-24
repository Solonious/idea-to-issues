#!/usr/bin/env bash
# Gates 0 and 1 approved on a concept that leaves no product question open.
source "$(dirname "${BASH_SOURCE[0]}")/../lib/chain.sh"
init_repo
brainstorm_approved
write docs/CONCEPT.md <<'DOC'
# Concept

## Problem

People forget to water their houseplants, and a paper calendar is never at hand
when they pass the pot.

## Who it is for

Home growers with up to thirty plants. One person per account, no teams.

## Competitors

Paper calendars, and generic reminder apps that know nothing about plants.

## Rulings

- A reminder belongs to one plant and repeats every N days; N is set by the user.
- The user is reminded by email at 8:00 in their own time zone. No push, no SMS.
- Marking a plant as watered restarts its interval from that day.
- Sign-in is by email and password. No social login.
- The product is a web app only; there is no mobile app and no offline mode.
- The product is free. There is no billing.

## Open threads

None. Every product question is settled above and nothing is handed to the blueprint.
DOC
commit concept
approve concept
