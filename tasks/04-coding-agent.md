# Task 04: Coding Agent Loop

## Goal
Implement the iterative coding loop that selects one PRD feature at a time, implements it, tests it, and commits the work.

## Responsibilities
- Load PRD and select the next `passes: false` feature.
- Orient with git history, progress log, and `temp-docs/next.md`.
- Implement feature in focused scope.
- Run Playwright tests and spot-check another feature.
- Commit changes and update PRD status.
- Write a fresh `temp-docs/next.md` listing any temp docs created this session.
- Repeat until time budget or PRD completion.

## Steps
1. Agent configuration:
   - Prompt constraints: one feature at a time; PRD changes limited to `passes`.
   - Enforce time budget (4h30m) in outer loop.
2. Orientation:
   - Read `prd.json`, `progress.md`, and `temp-docs/next.md`.
   - Inspect git log for last changes.
3. Implementation:
   - Write/modify code and tests tied to the feature’s acceptance steps.
   - Run ESLint (or equivalent) for quality.
4. Test phase:
   - Run Playwright tests for the feature.
   - Run a secondary smoke/spot test.
   - Iterate until tests pass.
5. Commit & PRD update:
   - `git add -A` then commit with a descriptive message.
   - Flip `passes` to `true` for the completed feature.
6. Logging:
   - Append a short progress entry (optional).
   - Overwrite `temp-docs/next.md` with the authoritative list of temp docs produced during the session (no incremental edits).

## Deliverables
- `src/coding-agent.ts` (or equivalent) exporting `runCodingLoop`.
- Tooling to run tests, lint, and git operations.

## Notes
- PRD edits are strictly limited to flipping `passes: false` to `passes: true` for the current feature. No other PRD fields may be changed.
- Use persisted artifacts as memory between sessions.
- Validate `prd.json` with Zod as the schema validator.
