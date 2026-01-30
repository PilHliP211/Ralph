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
   - Create the initialization agent with the SDK `Agent` entry point (e.g., `new Agent({ name: "initialization", model: "gpt-4.1-mini", instructions, tools })`).
   - Configure model settings explicitly (e.g., `modelSettings: { temperature: 0.2 }`) and provide a hard prompt that forbids feature implementation and requires PRD extraction.
   - Wire the runner entry point to `runInitialization` in `src/init-agent.ts`, calling the agent run method (e.g., `await agent.run({ input })`) from within `runInitialization`.
2. Tooling support (SDK tool conventions):
   - Register tool definitions via the SDK tool helper (e.g., `tool({ name, description, parameters, execute })`) and include them in the `tools` array passed to the `Agent`.
   - File IO tools: `readFile`, `writeFile`, `mkdirp`, and `listDir` for spec ingestion and scaffolding.
   - Git/shell tools: `gitInit`, `gitAddAll`, `gitCommit`, `gitStatus` (or a single `runShell` tool that wraps `git` commands) for repo setup.
   - Ensure tool invocation is explicit in agent output (e.g., "call `writeFile` to emit `prd.json`") so the SDK routes tool calls.
3. PRD schema validation with `zod`:
   - Define `zod` schemas in `src/schemas/prd.ts` (or `src/schemas/prd.schema.ts`) and export a `PrdSchema` plus `PrdFeatureSchema`.
   - In `runInitialization`, validate generated PRD data before writing `prd.json` (`PrdSchema.parse(prd)`), and reject/regen if validation fails.
   - Store schemas in a dedicated `src/schemas/` folder so tooling and agents can re-use them.
4. Artifact creation:
   - `prd.json` with detailed feature descriptions/steps.
   - Project structure (src, tests, configs).
   - Baseline ESLint config and Playwright config.
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
- `zod` is a runtime dependency and must be listed in `package.json` dependencies (not devDependencies).
