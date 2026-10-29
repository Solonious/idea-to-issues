#!/usr/bin/env bash
# Every gate up to the design approved, then the prototype edited and not re-approved.
source "$(dirname "${BASH_SOURCE[0]}")/../lib/chain.sh"
init_repo
brainstorm_approved
concept_approved
stack_approved
design_approved
printf '<!-- reworked after approval -->\n' >> docs/design/prototype.html
commit 'edit the prototype after the design was approved'
