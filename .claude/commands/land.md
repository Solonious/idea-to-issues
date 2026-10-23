---
allowed-tools: Skill(conveyor:land)
description: Merge the current branch's PR, close its linked issue, and clean up — permanent alias of /conveyor:land
---

Invoke the `conveyor:land` command now with the Skill tool. Its args are everything after this
colon, verbatim, and may be empty: $ARGUMENTS

Then relay its report as it returned it — add nothing, drop nothing.

This file is a permanent project alias, written by `/conveyor:setup` from the plugin's template;
the command itself is `plugin/commands/land.md` in Solonious/conveyor, where every edit goes —
the doctor WARNs when this copy differs from the template. It deliberately carries no
`context: fork` and no `model:`: the plugin command forks on its own pinned model, and a forked
alias forks twice — measured, a forked forwarder spawned two subagents where this shape spawns
one (the plugin's `docs/decisions/context-fork.md`).
