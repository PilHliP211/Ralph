# Task 04: Coding Agent Loop

## Goal
Implement the iterative coding loop that selects one PRD feature at a time, implements it, tests it, and commits the work.

## Responsibilities
- Load PRD and select the next `passes: false` feature.
- Orient with git history, progress log, and `temp-docs/next.md`.
- Implement feature in focused scope.
- Run Playwright tests and spot-check another feature.
- Commit changes and update PRD status.
- Write a fresh `temp-docs/next.md` listing any temp docs created this session.
- Repeat until time budget or PRD completion.

## Steps
1. Agent configuration:
   - Prompt constraints: one feature at a time; PRD changes limited to `passes`.
   - Enforce time budget (4h30m) in outer loop.
   - Initialize the OpenAI Agents JS SDK runner and tool registry up front (see `src/coding-agent.ts`).
2. Orientation:
   - Read `prd.json`, `progress.md`, and `temp-docs/next.md`.
   - Validate `prd.json` with `zod` schemas before selecting or updating a feature; reject/repair invalid data before proceeding.
   - Inspect git log for last changes.
3. Implementation:
   - Write/modify code and tests tied to the feature’s acceptance steps.
   - Run ESLint (or equivalent) for quality.
   - Keep tool calls scoped to the acceptance steps of the single selected feature only.
4. Test phase:
   - Run Playwright tests for the feature.
   - Run a secondary smoke/spot test.
   - Iterate until tests pass.
5. Commit & PRD update:
   - `git add -A` then commit with a descriptive message.
   - Flip `passes` to `true` for the completed feature.
6. Logging:
   - Append a short progress entry (optional).
   - Overwrite `temp-docs/next.md` with the authoritative list of temp docs produced during the session (no incremental edits).

## Deliverables
- `src/coding-agent.ts` (or equivalent) exporting `runCodingLoop`.
- Tooling to run tests, lint, and git operations.

## Notes
- PRD edits are strictly limited to flipping `passes: false` to `passes: true` for the current feature. No other PRD fields may be changed.
- Use persisted artifacts as memory between sessions.

## OpenAI Agents JS SDK integration details
When implementing `runCodingLoop` in `src/coding-agent.ts`, follow the Agents SDK run/execution model explicitly:
- Create an agent instance with the system prompt that enforces one-feature-at-a-time behavior and passes-only PRD mutation rules.
- Invoke the SDK’s run/execution API with:
  - A `messages` array seeded from the current session context (orientation notes plus the selected feature).
  - The tool registry (file ops, git ops, tests, docs) bound to the runner so tool calls can be dispatched.
- Stream or iterate over run events:
  - Handle assistant messages emitted by the runner and append them to the working transcript.
  - When a tool call event is emitted, dispatch it through the registered tool handler, append the tool result message, and continue the run until a terminal completion event.
- Persist the final assistant output for the loop iteration (used for progress logging and `temp-docs/next.md`).

## Tool-call and PRD mutation constraints
- Tool calls must stay inside the selected feature’s acceptance steps:
  - Gate tool execution by validating that each planned action maps to an acceptance step for the active feature.
  - If a tool call would affect unrelated features, the loop must reject it and instruct the model to refocus.
- PRD mutation must be passes-only:
  - The loop may flip `passes: false` to `passes: true` for the active feature and must prevent any other field edits.
  - Enforce this by checking the diff of `prd.json` after tool actions and rejecting updates that touch non-`passes` fields.

## PRD validation guidance (zod)
- Before feature selection, parse `prd.json` into a `zod` schema that validates:
  - The PRD root structure.
  - Feature entries with `passes: boolean` and acceptance step arrays.
- Fail fast if validation fails; do not start a run until `prd.json` is valid.
- Re-validate `prd.json` immediately after the `passes` update to ensure no accidental structural changes.

## Implementation hooks in `src/coding-agent.ts`
- `runCodingLoop` is the entry point for wiring the SDK’s run/execution API, the tool registry, and the PRD workflow.
- The tool registry should be defined alongside the runner setup so tool handlers can be injected into the run invocation.
- Add SDK-specific runner hooks (message streaming, tool call dispatch, completion handling) within `runCodingLoop` to keep the control flow centralized and testable.
