---
name: run-lanes
description: 'Permanent alias of conveyor:run-lanes — work two backlog tickets at once in two worktrees through the merge queue; every argument is forwarded verbatim (--pick A,B, --yes, --dry-run).'
allowed-tools: Skill(conveyor:run-lanes)
---

Invoke the `conveyor:run-lanes` skill now with the Skill tool. Its args are everything after this
colon, verbatim, and may be empty: $ARGUMENTS

Then carry out what it says — it runs inline, in this conversation, not forked.

This file is a permanent project alias, written by `/conveyor:setup` from the plugin's template;
the skill itself is `plugin/skills/run-lanes/SKILL.md` in Solonious/conveyor, where every edit
goes — the doctor WARNs when this copy differs from the template. A plugin skill answers only as
`conveyor:run-lanes`, so this alias keeps the name the owner types, `/run-lanes`. No `context: fork` and no `model:` — a forked alias forks twice (the plugin's
`docs/decisions/context-fork.md`).
