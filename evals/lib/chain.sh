# Sourced by each evals/<case>/scaffold.sh, never run on its own. It builds the
# approved-gate chain a case starts from, in the current directory.
set -euo pipefail

# Git isolated from the operator's configuration, with a pinned identity.
export GIT_AUTHOR_NAME=Eval GIT_AUTHOR_EMAIL=eval@example.com
export GIT_COMMITTER_NAME=Eval GIT_COMMITTER_EMAIL=eval@example.com
export GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_NOSYSTEM=1 GIT_TERMINAL_PROMPT=0

# The scaffold is evals/<case>/scaffold.sh, so the plugin root is two levels up.
ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
I2I=$ROOT/bin/i2i.mjs
if [ ! -f "$I2I" ]; then
  echo "chain.sh: $I2I not found" >&2
  exit 1
fi

# A repository with one commit and no remote, so nothing here can reach GitHub.
init_repo() {
  git init -q -b main
  printf '# Product\n' > README.md
  commit init
}

commit() {
  git add -A
  git commit -q -m "$1"
}

# write <path>: the file's content is stdin.
write() {
  mkdir -p "$(dirname "$1")"
  cat > "$1"
}

# Upstream must be committed before it is stamped.
approve() {
  node "$I2I" gate stamp "$1"
  commit "approve $1"
}

brainstorm_approved() {
  write docs/brainstorm/summary.md <<'DOC'
# Brainstorm summary: Plant reminders

## Chosen shape

A web app that reminds one person to water each of their plants.

## Key scenarios

1. Passing a pot, the user checks when it was last watered and marks it done.

## Rejected alternatives

- A paper calendar — rejected because it is never at hand when the user passes the pot.

## Competitor takeaways

The competitors activity was skipped.

## Skipped activities

competitors
DOC
  commit brainstorm
  approve brainstorm
}

concept_approved() {
  write docs/CONCEPT.md <<'DOC'
# Concept

## Problem

People forget to water their plants.

## Who it is for

Home growers with a few pots.

## Competitors

Paper calendars and generic reminder apps.

## Rulings

- A reminder is per plant.

## Open threads

None.
DOC
  commit concept
  approve concept
}

blueprint_approved() {
  write docs/blueprint.md <<'DOC'
# Blueprint

One web app and one API.
DOC
  commit blueprint
  approve blueprint
}
