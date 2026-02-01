# Task 06: Progress Tracking, Prompts, and Handoff

## Goal
Match the quickstart’s progress tracking, prompt loading, and restart behavior.

## Responsibilities
- Progress utilities:
  - Track iteration count and session notes in `progress.txt`.
  - Provide helpers to append, read, and summarize progress.
- Prompt loading:
  - Centralized prompt loader for `app_spec.txt`, `initializer_prompt.md`, and `coding_prompt.md`.
- Handoff behavior:
  - Confirm the CLI can be interrupted and resumed without losing state.
  - Ensure `feature_list.json` is the single source of truth for completion.

## Deliverables
- Progress utilities module with append/read helpers.
- Prompt loader module used by both agents.
- Documentation covering restart behavior and troubleshooting, aligned with the quickstart expectations.
