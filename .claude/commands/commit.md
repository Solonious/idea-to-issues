---
allowed-tools: Skill(conveyor:commit)
description: Generate commit message from changed files and create commit — permanent alias of /conveyor:commit
---

Invoke the `conveyor:commit` command now with the Skill tool. Its args are everything after this
colon, verbatim, and may be empty: $ARGUMENTS

Then carry out what it says — it runs inline, in this conversation, not forked.

This file is a permanent project alias, written by `/conveyor:setup` from the plugin's template;
the command itself is `plugin/commands/commit.md` in Solonious/conveyor, where every edit goes —
the doctor WARNs when this copy differs from the template. A plugin command answers only as
`/conveyor:commit`, so this alias keeps the name the owner types and the global CLAUDE.md grants
commit authority to.
