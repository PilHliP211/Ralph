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

## Task Set Overview (Quickstart Flow)
Use the Claude quickstart as the behavioral reference, but implement with the OpenAI Agents SDK and OpenAI model IDs.

1. **Init session (Task 03)**
   - Generate `feature_list.json`, copy `app_spec.txt`, scaffold `init.sh`, write progress, and save OpenAI security settings.
2. **First coding loop (Task 04 + Task 06)**
   - Load feature list, build the next feature, update progress, and commit.
3. **Auto-continue (Task 02 + Task 06)**
   - Sleep 3s between iterations until max iterations or features complete.
4. **Resume by re-running the same command (Task 02)**
   - Fresh context per run; rehydrate from `feature_list.json` + progress notes.

## Quickstart → Ralph Checklist (OpenAI-flavored)
- **Entrypoint + CLI**
  - Quickstart `autonomous_agent_demo.py` → `src/ralph.ts` (Task 02).
  - Supports `--project-dir`, `--max-iterations`, `--model` using OpenAI model IDs.
- **Initialization session**
  - Quickstart initializer prompt + artifacts → `src/init-agent.ts` + `prompts/initializer_prompt.md` (Task 03).
  - Writes `feature_list.json`, `app_spec.txt`, `init.sh`, progress file.
- **Iterative coding sessions**
  - Quickstart coding loop → `src/coding-agent.ts` (Task 04).
  - Loads next `passes: false` feature, implements, commits, updates progress.
- **Prompt loading**
  - Quickstart prompt files → `prompts/` (Task 06).
  - Central loader for `app_spec.txt`, `initializer_prompt.md`, `coding_prompt.md`.
- **Progress tracking**
  - Quickstart `progress.txt` → `src/progress` module (Task 06).
  - Append/read/summarize progress notes.
- **Security settings**
  - Quickstart `.claude_settings.json` → OpenAI security settings file (Task 05).
  - Enforce allowed tools/paths per OpenAI Agents SDK.
- **Model selection**
  - Claude model IDs → OpenAI model IDs set via `--model` + `OPENAI_API_KEY`.

## Notes
- The implementation must use OpenAI models, but should otherwise match the quickstart behaviors.
