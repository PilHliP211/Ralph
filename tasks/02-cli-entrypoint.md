# Task 02: CLI Entry Point (`ralph.ts`)

## Goal
Implement the CLI front door that orchestrates initialization and the coding loop.

## Scope
- Parse CLI arguments (init/continue, spec path, project dir).
- Detect presence of `prd.json` to decide whether to initialize.
- Configure OpenAI API key and SDK initialization.
- Hand off to Initialization Agent then Coding Agent loop.

## Steps
1. Define command structure and defaults:
   - `ralph init <spec_file> [project_dir]`
   - `ralph continue` (or default to continue in current dir)
2. Validate inputs:
   - Ensure spec file exists for init.
   - Guard against missing project directory.
3. Load minimal context:
   - Check for `prd.json` to determine initialization needs.
4. Call agent modules:
   - `runInitialization(specPath)` when no PRD exists.
   - `runCodingLoop()` after initialization (or for continue).
5. Handle optional lifecycle scripts:
   - Run `startup.sh` if it exists before entering the coding loop.
   - Run `shutdown.sh` if it exists after the coding loop completes (even on early exit).
6. Add process safety:
   - Handle termination signals (e.g., ensure child processes stop cleanly).

## Deliverables
- `src/ralph.ts` (or equivalent) with CLI parsing, validation, and agent invocation.
- Documented CLI usage in README.

## Notes
- Keep the CLI thin; most logic belongs in agent modules.
