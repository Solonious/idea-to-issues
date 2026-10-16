# idea-to-issues

## Working rules
- Talk to the user in Ukrainian. Code, comments, docs, commit messages, issues and PRs are in English.
- Commits follow Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `ci:`, `chore:`, `refactor:`); the body ends with `Closes #N`.
- One ticket per session: work on a single GitHub issue, then stop.
- Before opening a PR, both must pass:
  - `node --test`
  - `claude plugin validate .`

## Project constraints
- Zero npm dependencies; Node 20 or later.
- Public repository: write nothing about any private product or infrastructure.
