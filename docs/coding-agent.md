# Coding Agent Loop (Task 04)

This document defines the required behaviors for the coding agent during each loop iteration.

## Overview
- Select the next `passes: false` feature from `prd.json` and complete exactly one feature per
  loop iteration.
- Only the active feature’s `passes` flag may change from `false` to `true`.
- Update PRD and progress artifacts for each iteration.

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

## Files
- `prd.json`
- `temp-docs/last-run.json`
- `temp-docs/next.md`
