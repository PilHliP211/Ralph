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
1. Agent definition & prompt (OpenAI Agents JS SDK):
   - Build `runInitialization` in `src/init-agent.ts` around an `Agent` from `@openai/agents`.
   - Store the agent instructions in a dedicated markdown file (for example `prompts/init-agent.md`) and load that content in `runInitialization` rather than inlining strings in `src/init-agent.ts`.
   - Construct the agent via `new Agent({ name, instructions, model, tools })` with:
     - `name`: a stable identifier like `initialization-agent`.
     - `instructions`: system prompt that explicitly forbids feature implementation and mandates PRD extraction.
     - `model`: include SDK-configurable fields (per docs) such as `model` name and `temperature`.
     - `tools`: array of registered tool definitions for IO + git actions.
   - Invoke the agent via the SDK runner (for example `agent.run(...)`) using the project spec as input.
2. Tooling support (SDK tool definitions):
   - Register tools using the SDK's tool definition conventions (name/description/parameters + async handler).
   - File IO tool set:
     - `readFile`, `writeFile`, `mkdir`, and `listDir` for spec intake and scaffolding.
     - Each tool should include a parameter schema consistent with SDK expectations (e.g., Zod-based params).
   - Git tool set:
     - `gitInit`, `gitAdd`, `gitCommit`, `gitStatus` backed by the shell tool.
     - Ensure tool handlers execute shell commands (e.g., `git init`, `git add -A`, `git commit -m ...`).
3. Artifact creation:
   - `prd.json` with detailed feature descriptions/steps.
   - Project structure (src, tests, configs).
   - Baseline ESLint config and Playwright config.
4. Zod validation for PRD generation:
   - Place PRD schemas in `src/schemas/prd.ts` (export both the schema and inferred types).
   - Validate the JSON produced by the agent with `prdSchema.parse(...)` before writing `prd.json`.
   - If validation fails, halt the write and surface the schema error in the run output.
   - Note: `zod` is required as a runtime dependency and must be added to `package.json` dependencies.
5. Git commit:
   - Stage all files.
   - Commit with a message like "Initial scaffolding and PRD".
6. Progress log and support docs:
   - Append a short summary of initialization actions to `progress.md`.
   - Create `temp-docs/next.md` as the canonical list of temp docs for the next session.
   - Commit `progress.md` and any support documents in `temp-docs/`.

## Deliverables
- `src/init-agent.ts` (or equivalent) exporting `runInitialization`.
- Initial scaffold output and PRD generation logic.

## Notes
- Use JSON for PRD to reduce accidental mutation beyond `passes`.
- Validate `prd.json` with Zod as the schema validator.
