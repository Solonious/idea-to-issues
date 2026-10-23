---
allowed-tools: Skill(conveyor:pipeline)
description: Run post-implementation quality pipeline (simplify, review, test, docs) — permanent alias of /conveyor:pipeline
---

Invoke the `conveyor:pipeline` command now with the Skill tool. Its args are everything after this
colon, verbatim, and may be empty: $ARGUMENTS

Then carry out what it says — it runs inline, in this conversation, not forked.

This file is a permanent project alias, written by `/conveyor:setup` from the plugin's template;
the command itself is `plugin/commands/pipeline.md` in Solonious/conveyor, where every edit goes —
the doctor WARNs when this copy differs from the template. A plugin command answers only as
`/conveyor:pipeline`, so this alias keeps the name the owner types.
