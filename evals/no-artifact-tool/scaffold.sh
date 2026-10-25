#!/usr/bin/env bash
# Every gate up to the design approved; the blueprint is not written. The concept leaves no product question open.
source "$(dirname "${BASH_SOURCE[0]}")/../lib/chain.sh"
init_repo
brainstorm_approved
# Keep everything before "## Open threads", then settle it: the eval's premise is that nothing is left open.
awk '/^## Open threads$/ { exit } { print }' "$ROOT/test/fixtures/stack/valid/CONCEPT.md" > docs/CONCEPT.md
printf '## Open threads\n\nNone. Every product question is settled above and nothing is handed to the blueprint.\n' >> docs/CONCEPT.md
commit concept
approve concept
stack_approved
design_approved
