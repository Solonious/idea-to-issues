---
name: tickets
description: Stage 4 of idea-to-issues. Orders the epics of a checked docs/specs into docs/specs/index.md, presents gate 3 on a rendered epic → ticket graph, then files the approved graph as GitHub Issues with i2i file (the dry run first, --apply only on the owner's yes) and ends when i2i verify --wait passes. Use for "tickets", "file the issues", "gate 3", or /idea-to-issues:tickets.
---

# Tickets (stage 4)

Talk to the owner in ${user_config.language}. `docs/specs/index.md` is always written in English.

## Step 1: Check gates 1 and 2, and the specs

Run this before anything else:

```bash
i2i.mjs gate require tickets
```

If it exits non-zero, show the owner its output verbatim and stop without writing anything. The output says what is wrong and what to run. Never work around the check. After a refusal, wait until the owner invokes `/idea-to-issues:tickets` again. A later message, or the output of a command the owner runs with `!`, is not an invocation: never re-run the check and carry on by yourself.

Then run:

```bash
i2i.mjs check docs/specs
```

If it reports a finding, show the owner the findings verbatim and stop: the epic files belong to the specs stage, so say that `/idea-to-issues:specs` fixes them. Gate 3 never shows a graph that fails `check`, and `file` refuses one. After a refusal, wait until the owner invokes `/idea-to-issues:tickets` again. A later message, or the output of a command the owner runs with `!`, is not an invocation: never re-run the check and carry on by yourself.

## Step 2: Find where this run starts

Run:

```bash
i2i.mjs gate require file
```

If it exits 0, gate 3 is approved and nothing it pins has changed since. A run that filed part of the graph and was interrupted is in this state. Say so and go to step 7: the dry run of step 8 lists only the writes still missing.

Otherwise:

- If `docs/specs/index.md` does not exist, go to step 3.
- If it exists, it is not approved, or something changed after its approval; the output says which. Show the owner the current order and ask whether to keep it or change it (one question). When changing it, keep its front matter block exactly as it is and change only the body. A changed order or a changed epic file needs the owner's approval of gate 3 again.

## Step 3: Order the epics

The owner chooses the order the epics are built in. Inside an epic the order is mechanical: it follows from the `blocked-by` lines, so it is never asked and never written down.

Read every epic file in `docs/specs/` (its key, title and file name) and the Epics table of `docs/blueprint.md`. Ask the owner for the epic order in one question, with a recommended answer: the order of the blueprint's Epics table, the walking-skeleton epic (its row 1) first, because its `KEY-1` is the root of the whole graph.

If the chosen order puts an epic before another epic whose ticket blocks one of its tickets, say so in one line: those tickets wait for their blockers whatever the order. It is a note, not a refusal.

Write `docs/specs/index.md` from [references/index-template.md](references/index-template.md), without the template's guidance comments and without front matter: one line per epic file, each exactly once, in the owner's order. `file` does not read this file. It files the epics in file-name order, and the links between issues do not depend on the order. The order is what gate 3 approves and what whoever builds the tickets follows.

## Step 4: Present gate 3

Build the gate page from `docs/specs/index.md`, the epic files and the output of `i2i.mjs check --render docs/specs`, and nothing else. The page is a view of the markdown: every epic and ticket on it appears in the markdown under the same key and title. It says that the approval is of `docs/specs/index.md`, whose `based-on` line pins the epic files in `docs/specs` at the commit the owner approves against.

- If the Artifact tool is in your tool list, publish the page as a private Artifact: the epics in the approved order, each with its acceptance criteria and its tickets in dependency order (effort, `blocked-by`, `covers`), and the epic → ticket graph, with an edge for every `blocked-by`, across epics too. Give the owner the link.
- If the Artifact tool is not in your tool list, print in the terminal instead: the path `docs/specs/index.md`, its epic order, and the output of `i2i.mjs check --render docs/specs` as it is.

When the owner asks for a change while reviewing it:

- A different epic order: change `docs/specs/index.md`, then rebuild the page from it.
- A change to a ticket or an acceptance criterion: the epic files belong to the specs stage. Stop and say to run `/idea-to-issues:specs` to revise them, then `/idea-to-issues:tickets` again.

Nothing is decided only on the page.

## Step 5: Hand off to gate 3

Show the owner the path `docs/specs/index.md` and the page link or the terminal summary, then ask them to run `/idea-to-issues:approve tickets` and to tell you when it is done. If `git status --porcelain -- docs/specs ':(exclude)docs/specs/index.md'` prints anything, say that the approval will be refused until those epic files are committed.

Then wait. When the owner says the gate is approved, or runs `/idea-to-issues:tickets` again, go on to step 6, which checks the approval itself.

## Step 6: Confirm gate 3

Run:

```bash
i2i.mjs gate require file
```

If it exits non-zero, show the owner its output verbatim and stop. Never take the conversation's word for an approval: the stamp in `docs/specs/index.md` is the approval. After a refusal, wait until the owner invokes `/idea-to-issues:tickets` again. A later message, or the output of a command the owner runs with `!`, is not an invocation: never re-run the check and carry on by yourself.

## Step 7: Choose the Project

Settle the Project before the dry run, so that the one dry run the owner sees lists every write. Read, and never write:

```bash
gh repo view --json nameWithOwner,owner
gh project list --owner <owner login> --format json
```

If `gh` says the token lacks the `project` scope, ask the owner to run `! gh auth refresh -s project` (the `!` runs it in this session), then read again. `file --project` needs the same scope.

Ask the owner which Project the epics go into (one question): one of the Projects listed, by title; a new Project; or none. Recommend an existing Project whose title names the product, otherwise a new one named after it.

- A new Project is the owner's to create; you never create one. Give them the command to type, with the owner login and the title filled in: `! gh project create --owner <owner login> --title "<title>"`. Then read `gh project list` again, confirm the title is there, and take its number from the listing. Give them the second command, which shows the Project on the repository's Projects tab: `! gh project link <number> --owner <owner login> --repo <repo name>`. If two Projects share the title, ask the owner to rename one.
- `file` adds only the epics to the Project; GitHub adds their tickets, the sub-issues, through the Project's "Auto-add sub-issues to project" workflow. Ask the owner to check that this workflow is on (the Project's ⋯ menu, then Workflows) before anything is filed.
- With no Project, the steps below run without `--project`, and the Project parts of them do not apply.

## Step 8: Show the dry run, and file only on the owner's yes

Run the dry run, with the Project title from step 7:

```bash
i2i.mjs file --dry-run --project "<title>"
```

Show the owner its output verbatim and in full. If it says GitHub already holds every key, go to step 9.

Otherwise ask one yes-or-no question: file these writes to `<owner/repo>`? Anything other than a clear yes means no write is made, and you stop. When the plan has more than 80 writes, offer batches in the same question: GitHub limits how fast content can be created, and `--limit 80` stops after 80 writes.

On the owner's yes, run the same command with `--apply` in place of `--dry-run`:

```bash
i2i.mjs file --apply --project "<title>"
```

In batches, run `i2i.mjs file --apply --limit 80 --project "<title>"` again about a minute after each batch, until one ends without `stopped after`. Show each output verbatim.

The yes covers the writes of the dry run the owner saw, in this session, and nothing else. If an apply fails, show its output verbatim and start this step again from the dry run: a re-run skips every key GitHub already holds, so the new dry run lists only what is still missing, and it needs a new yes. A new session starts here with a new dry run too.

## Step 9: Verify

Run:

```bash
i2i.mjs verify --wait
```

If it exits 0, go to step 10. Otherwise show the owner its output verbatim, then:

- `missing-issue`, `parent` or `missing-blocker`: go back to step 8. The new dry run plans exactly the writes that repair them.
- `duplicate-issue`: two issues hold one key. The owner closes or retitles one of them on GitHub; you do not. Then run `verify --wait` again.
- No two consecutive polls agreed: GitHub was still filling in the listing. Run `verify --wait` again.
- Anything else, such as a gate that no longer holds: stop. After a refusal, wait until the owner invokes `/idea-to-issues:tickets` again. A later message, or the output of a command the owner runs with `!`, is not an invocation: never re-run the check and carry on by yourself.

Never repair GitHub by hand. The stage is done only when `verify --wait` exits 0.

## Step 10: Hand over

Tell the owner how many epics and tickets GitHub holds (`verify` prints both), and give the repository's Issues link and the Project's link. Ask them to open the Project and check that every epic has its tickets nested under it. `file` adds only the epics, so if tickets are missing, the owner checks the Project's "Auto-add sub-issues to project" workflow and adds the missing tickets to the Project on GitHub.

Ask the owner to commit and push `docs/specs/index.md`, so that a run from another checkout sees gate 3. Stop there.

## Never

Never run a `gh` command that writes: no `gh issue create` or `gh issue edit`, no `gh label create`, no `gh project create`, `gh project link` or `gh project item-add`. Every GitHub write is made by `i2i.mjs file --apply`, after the owner has seen the dry run and said yes; a new Project is made by the owner. Never write, change or remove the `approved`, `digest` or `based-on` keys, and never run `i2i.mjs gate stamp`: only the owner approves gate 3, through `/idea-to-issues:approve tickets`. Never change the epic files in `docs/specs/`, `docs/CONCEPT.md`, `docs/blueprint.md` or `docs/adr/`, and never add a priority to an issue.
