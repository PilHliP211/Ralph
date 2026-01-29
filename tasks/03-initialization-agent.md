# Task 03: Initialization Agent

## Goal
Create the one-time initialization flow that turns a project spec into a scaffolded repo with a PRD and baseline tooling.

## Responsibilities
- Read project spec and extract feature requirements.
- Generate `prd.json` with all features marked as `passes: false`.
- Scaffold project structure and configuration files.
- Create optional scripts (`startup.sh`, `shutdown.sh`) if needed.
- Initialize Git and commit initial scaffolding.
- Write `progress.md` for handoff context.
- Store support documents and progress artifacts in a dedicated `temp-docs/` folder and commit them (e.g., PRD drafts, setup notes, session summaries).
- Seed `temp-docs/next.md` as a handoff index that future Coding Agent runs fully overwrite with the temp docs created in their session.

## Steps
1. Agent definition & prompt:
   - Explicitly prohibit feature implementation.
   - Require full PRD extraction and JSON schema.
2. Tooling support:
   - File reads/writes for spec and scaffolding.
   - Shell tool for git init/add/commit.
3. Artifact creation:
   - `prd.json` with detailed feature descriptions/steps.
   - Project structure (src, tests, configs).
   - Baseline ESLint config and Playwright config.
4. Git commit:
   - Stage all files.
   - Commit with a message like "Initial scaffolding and PRD".
5. Progress log and support docs:
   - Append a short summary of initialization actions to `progress.md`.
   - Create `temp-docs/next.md` as the canonical list of temp docs for the next session.
   - Commit `progress.md` and any support documents in `temp-docs/`.

## Deliverables
- `src/init-agent.ts` (or equivalent) exporting `runInitialization`.
- Initial scaffold output and PRD generation logic.

## Notes
- Use JSON for PRD to reduce accidental mutation beyond `passes`.
