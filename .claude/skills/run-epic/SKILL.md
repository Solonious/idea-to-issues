---
name: run-epic
description: 'Permanent alias of conveyor:run-epic — pick one epic (an epic: label or a tracking issue) at a human gate, then run its frozen work-list unattended, one fresh child per ticket; every argument is forwarded verbatim.'
allowed-tools: Skill(conveyor:run-epic)
---

Invoke the `conveyor:run-epic` skill now with the Skill tool. Its args are everything after this
colon, verbatim, and may be empty: $ARGUMENTS

Then carry out what it says — it runs inline, in this conversation, not forked.

This file is a permanent project alias, written by `/conveyor:setup` from the plugin's template;
the skill itself is `plugin/skills/run-epic/SKILL.md` in Solonious/conveyor, where every edit
goes — the doctor WARNs when this copy differs from the template. A plugin skill answers only as
`conveyor:run-epic`, so this alias keeps the name the owner types and the `[[run-epic]]` name
next-issue links. No `context: fork` and no `model:` — a forked alias forks twice (the plugin's
`docs/decisions/context-fork.md`).
