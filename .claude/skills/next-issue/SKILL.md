---
name: next-issue
description: Permanent alias of conveyor:next-issue — plan, implement, ship and land one backlog ticket; every argument is forwarded verbatim (an issue number or ticket id, unattended, grill, ship-only, uk, plan-model=, impl-model=).
allowed-tools: Skill(conveyor:next-issue)
---

Invoke the `conveyor:next-issue` skill now with the Skill tool. Its args are everything after this
colon, verbatim, and may be empty: $ARGUMENTS

Then carry out what it says — it runs inline, in this conversation, not forked.

This file is a permanent project alias, written by `/conveyor:setup` from the plugin's template;
the skill itself is `plugin/skills/next-issue/SKILL.md` in Solonious/conveyor, where every edit
goes — the doctor WARNs when this copy differs from the template. A plugin skill answers only as
`conveyor:next-issue`, so this alias keeps the name the owner types, the name
`conveyor-run-next-issue` hands a headless child, and the name the auto-git exception is written
against. No `context: fork` and no `model:` — a forked alias forks twice (the plugin's
`docs/decisions/context-fork.md`).
