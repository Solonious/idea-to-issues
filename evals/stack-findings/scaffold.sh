#!/usr/bin/env bash
# Every gate up to the concept approved, then a stack with a check finding approved anyway.
source "$(dirname "${BASH_SOURCE[0]}")/../lib/chain.sh"
init_repo
brainstorm_approved
concept_approved
grep -v '^| `email` |' "$ROOT/test/fixtures/stack/valid/stack.md" > docs/stack.md
commit stack
approve stack
