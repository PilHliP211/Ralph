# Task 05: Testing & Linting Integration

## Goal
Ensure Playwright and ESLint are integrated into the agent workflow to validate features and keep code quality high.

## Responsibilities
- Provide Playwright configuration and test harness.
- Ensure startup/shutdown scripts can orchestrate the app when needed.
- Wire ESLint to run after code changes.

## Steps
1. Configure Playwright:
   - `playwright.config.ts` with browser selection and base URL.
2. Define test strategy:
   - Generate feature-specific tests from PRD steps.
   - Keep a smoke test for regressions.
3. Add linting:
   - `.eslintrc.js` and `tsconfig.json` as needed.
   - Package scripts for `lint` and `test`.
4. Validation loop:
   - After implementation, run `eslint` then `playwright test`.
   - If tests fail, iterate on fixes.

## Deliverables
- Playwright configuration and scripts.
- ESLint configuration and package scripts.
- Agent tooling wrappers for test/lint execution.

## Notes
- Avoid superficial testing by always running at least one regression check.
