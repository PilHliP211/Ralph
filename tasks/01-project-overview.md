# Task 01: Project Overview & Feature Parity Baseline

## Goal
Align the Ralph harness with the Claude autonomous-coding quick start feature set, with the only difference being OpenAI model usage.

## Quickstart Parity Targets
- Two-agent pattern: initialization session + iterative coding sessions.
- Persisted artifacts as memory:
  - `feature_list.json` (source of truth; includes `passes` state per feature).
  - `app_spec.txt` (copied into project dir).
  - `init.sh` (setup script scaffolded by the initializer).
  - `progress.txt` or `progress.md` (session notes).
  - Security settings file (OpenAI-flavored equivalent of `.claude_settings.json`).
- Session management behavior:
  - fresh context per run.
  - auto-continue with a short delay (3s) between iterations.
  - resume by re-running the same command.
- CLI options parity:
  - `--project-dir`
  - `--max-iterations`
  - `--model` (OpenAI model ID)
- Document the timing expectations and guidance for reducing feature count.

## Deliverables
- Updated task set that mirrors the quickstart flow end-to-end (init → iterate → resume).
- A checklist mapping quickstart components to Ralph modules (entrypoint, client, security, progress, prompts, agents).

## Notes
- The implementation must use OpenAI models, but should otherwise match the quickstart behaviors.
