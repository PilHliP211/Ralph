# Coding Agent Loop (Task 04)

This document describes how the coding agent loop works and where its shared tooling lives.

## Overview
- `runCodingLoop` is responsible for selecting the next `passes: false` feature from `prd.json`,
  running a single-feature coding iteration, and updating PRD/progress artifacts.
- PRD validation and mutation checks ensure only the active feature’s `passes` flag can flip
  from `false` to `true`.
- Loop outputs are persisted to `temp-docs/last-run.json`, and `temp-docs/next.md` is rewritten
  every iteration.

## Agent constraints (prompt content)
- Implement exactly one PRD feature per loop.
- Work only on the selected feature and its acceptance steps.
- Every tool call must include an `acceptanceStep` that matches one of the selected feature steps.
- Tool calls outside the selected feature scope are forbidden.
- Only update `prd.json` by flipping the selected feature’s `passes` from `false` to `true`.
- Run ESLint, Playwright tests for the feature, and a secondary smoke/spot test.
- Commit changes with `git add -A` and `git commit -m "..."` once work passes tests.
- Summarize the work and list any temp docs created.

## Shared tooling
Tool definitions are shared between initialization and coding agents in `src/tools/agent-tools.ts`.

Exports include:
- `createFileTools` — file IO (`readFile`, `writeFile`, `mkdir`, `listDir`) with optional
  acceptance-step gating and PRD validation hooks.
- `createGitTools` — git helpers (`gitInit`, `gitAdd`, `gitCommit`, `gitStatus`, `gitLog`).
- `createCommandTools` — shell, lint, and Playwright helpers.
- `runCommand` — shared command runner.

## Files
- `src/coding-agent.ts` — coding loop logic and PRD enforcement.
- `src/init-agent.ts` — initialization loop using shared tools.
- `src/tools/agent-tools.ts` — shared tool factories.
