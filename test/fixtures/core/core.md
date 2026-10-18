# [CORE] Deterministic spine — one zero-dependency Node tool with four modes

## Acceptance criteria

- **AC-1** The plugin installs and CI runs its tests — verify: CI is green on main
- **AC-2** A malformed or unapproved spec never reaches filing — verify: the check and gate tests pass
- **AC-3** Filing is idempotent and verified against GitHub — verify: the file and verify tests pass

## Tickets

### [CORE-1] plugin skeleton, marketplace entry and CI that validates the plugin and runs node --test

effort: S · blocked-by: none · covers: AC-1

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

### [CORE-2] spec parser and check — the ticket contract enforced before gate 3

effort: M · blocked-by: CORE-1 · covers: AC-2

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

### [CORE-3] file --dry-run and --apply — idempotent, dependency-ordered filing keyed by GitHub titles

effort: M · blocked-by: CORE-5, CORE-2 · covers: AC-3

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

### [CORE-4] verify — compare the approved spec blocks with what GitHub holds

effort: S · blocked-by: CORE-3 · covers: AC-3

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

### [CORE-5] gate stamp and require, and a user-only approve command — approvals live in front matter

effort: M · blocked-by: CORE-1 · covers: AC-2

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
