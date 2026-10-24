#!/usr/bin/env bash
# Gates 0, 1 and 2 approved, and one spec whose two tickets block each other.
source "$(dirname "${BASH_SOURCE[0]}")/../lib/chain.sh"
init_repo
brainstorm_approved
concept_approved
blueprint_approved
write docs/specs/auth.md <<'SPEC'
# [AUTH] Authentication

## Acceptance criteria

- **AC-1** A user can sign in — verify: the login test passes
- **AC-2** A session survives a reload — verify: the cookie test passes

## Tickets

### [AUTH-1] Login form

effort: S · blocked-by: AUTH-2 · covers: AC-1

#### Problem

Placeholder text for problem.

#### Proposed solution

Placeholder text for proposed solution.

#### Affected areas

Placeholder text for affected areas.

#### Acceptance criteria

Placeholder text for acceptance criteria.

#### Validation

Placeholder text for validation.

#### Dependencies

Placeholder text for dependencies.

#### Risks

Placeholder text for risks.

#### Notes for implementer

Placeholder text for notes for implementer.

### [AUTH-2] Session cookie

effort: M · blocked-by: AUTH-1 · covers: AC-2

#### Problem

Placeholder text for problem.

#### Proposed solution

Placeholder text for proposed solution.

#### Affected areas

Placeholder text for affected areas.

#### Acceptance criteria

Placeholder text for acceptance criteria.

#### Validation

Placeholder text for validation.

#### Dependencies

Placeholder text for dependencies.

#### Risks

Placeholder text for risks.

#### Notes for implementer

Placeholder text for notes for implementer.
SPEC
commit specs
