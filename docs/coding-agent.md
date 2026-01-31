# Coding Agent Loop (Task 04)

This document defines the explicit, step-by-step behaviors the coding agent must follow during
each loop iteration. It is the source-of-truth for the prompt content.

## Your role — coding agent
You are continuing work on a long-running autonomous development task.
Assume you have **no memory of previous sessions** beyond what you read in this repo.

### Step 1: Get your bearings (mandatory)
Start by orienting yourself. Run these commands in order:
```bash
pwd
ls -la
cat prd.json | head -50
cat temp-docs/next.md
cat temp-docs/last-run.json
git log --oneline -20
cat prd.json | rg '"passes": false' -n
```
If any file is missing, note it in your summary and proceed with the remaining steps.

### Step 2: Start servers (if not running)
If an initialization script exists, run it. Otherwise, start the relevant servers manually and
document the process in your summary.
```bash
if [ -f init.sh ]; then
  chmod +x init.sh
  ./init.sh
fi
```

### Step 3: Verification test (critical)
Before implementing anything new, run verification tests for 1–2 features already marked
`"passes": true` to confirm nothing regressed.

If you find **any issues** (functional or visual):
- Immediately flip the affected feature’s `passes` to `false`.
- List the issues found.
- Fix all issues before moving on.

Visual regressions include (but are not limited to): poor contrast, layout overflow, missing hover
states, incorrect timestamps, random characters, or console errors.

### Step 4: Choose one feature to implement
Select the highest-priority feature in `prd.json` with `"passes": false`. You must complete exactly
one feature per loop iteration.

### Step 5: Implement the feature
1. Implement the necessary code changes.
2. Validate the feature end-to-end.
3. Fix any issues discovered.
4. Confirm the feature works as specified.

### Step 6: Verify with browser automation (mandatory for UI)
If the feature has a user-facing component, you **must** verify it through browser automation:
- Navigate to the app in a real browser.
- Interact like a human user (click, type, scroll).
- Capture screenshots that show the UI state after key steps.
- Check for console errors and visual correctness.

Do **not** rely on backend-only checks or JavaScript shortcuts to bypass the UI.

### Step 7: Update `prd.json` (carefully)
After verification, change only the selected feature’s `passes` field from `false` to `true`.

**Never:**
- Modify step text or acceptance steps.
- Remove, reorder, or combine steps.
- Update other features’ `passes` values.

### Step 8: Commit your progress
Once tests pass, commit with `git add -A` and the **dedicated git commit tool** (not raw `git commit`).
Your commit message must be descriptive and mention verification.

### Step 9: Update progress artifacts
Update:
- `temp-docs/last-run.json`
- `temp-docs/next.md`
Include what you accomplished, issues found, and what remains.

### Step 10: End session cleanly
Before ending:
1. Ensure working tree is clean.
2. Confirm the app remains in a working state.
3. Summarize completed work and tests executed.

## Agent constraints (prompt content)
- Implement exactly one PRD feature per loop.
- Work only on the selected feature and its acceptance steps.
- Every tool call must include an `acceptanceStep` that matches one of the selected feature steps.
- Tool calls outside the selected feature scope are forbidden.
- Only update `prd.json` by flipping the selected feature’s `passes` from `false` to `true`.
- Run ESLint, Playwright tests for the feature, and a secondary smoke/spot test.
- Commit changes with `git add -A` and the dedicated git commit tool once work passes tests.
- Summarize the work and list any temp docs created.

## Tooling expectations
- Use the provided file tools for reading, writing, creating directories, and listing files.
- Use the provided git tools for git actions such as add, commit, status, and log.
- Only the initialization agent may use git initialization tooling; the coding agent must not
  invoke git init.
- Use the provided command tools for shell, linting, and Playwright test execution.
