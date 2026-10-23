---
allowed-tools: Skill(conveyor:ship)
description: Push feature branch and create PR into the base branch (branches.base) — permanent alias of /conveyor:ship
---

Invoke the `conveyor:ship` command now with the Skill tool. Its args are everything after this
colon, verbatim, and may be empty: $ARGUMENTS

Then relay its report as it returned it — add nothing, drop nothing.

This file is a permanent project alias, written by `/conveyor:setup` from the plugin's template;
the command itself is `plugin/commands/ship.md` in Solonious/conveyor, where every edit goes —
the doctor WARNs when this copy differs from the template. It deliberately carries no
`context: fork` and no `model:`: the plugin command forks on its own pinned model, and a forked
alias forks twice — measured, a forked forwarder spawned two subagents where this shape spawns
one (the plugin's `docs/decisions/context-fork.md`).
