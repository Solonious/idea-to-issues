#!/usr/bin/env bash
# Gates 0, 1 and 2 approved, then the concept edited and not re-approved.
source "$(dirname "${BASH_SOURCE[0]}")/../lib/chain.sh"
init_repo
brainstorm_approved
concept_approved
blueprint_approved
printf '\nAlso a native mobile app.\n' >> docs/CONCEPT.md
commit 'edit the concept after the blueprint was approved'
