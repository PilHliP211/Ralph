# Task 01: Project Overview & Foundation

## Goal
Set the foundation for the CLI-based agentic AI harness (Ralph Wiggum technique) by translating the master plan into actionable objectives and artifacts that all future tasks will reference.

## Key Outcomes
- Align on the harness objective: an agent loop that enforces memory, decomposition, and incremental delivery through persistent artifacts (PRD, Git history, logs).
- Confirm the two-agent model: Initialization Agent (one-time setup) and Coding Agent (iterative feature delivery).
- Establish core artifacts that persist across runs:
  - `prd.json` (feature ledger with `passes` state).
  - Git history (progress memory).
  - Optional `progress.md` session log.
- Establish tech stack expectations:
  - Bun + TypeScript for the CLI harness.
  - OpenAI Agent SDK for agent orchestration.
  - Playwright for end-to-end verification.
  - ESLint for code quality.

## Deliverables
- A clear mapping of the harness responsibilities to the artifacts it must create or maintain.
- A high-level project directory model (source modules, scripts, configs).

## References
- Foundational plan: "Implementation Plan: CLI-Based Agentic AI Harness (Ralph Wiggum Technique)."
