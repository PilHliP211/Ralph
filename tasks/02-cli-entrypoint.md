# Task 02: CLI Entrypoint Parity (`ralph.ts`)

## Goal
Mirror the quickstart entrypoint behavior while keeping the TypeScript/Bun CLI shape.

## Requirements
- Command mirrors `autonomous_agent_demo.py`:
  - `ralph --project-dir ./my_project`
  - `ralph --project-dir ./my_project --max-iterations 3`
  - `ralph --project-dir ./my_project --model gpt-4.1`
- Defaults:
  - `--project-dir` defaults to `./autonomous_demo_project`.
  - `--max-iterations` defaults to unlimited.
  - `--model` defaults to the chosen OpenAI default (document in README).
- Always enforce API key presence via `OPENAI_API_KEY`.
- Auto-continue with a 3s delay between sessions unless `--max-iterations` is reached.
- Stop safely on `Ctrl+C` and allow resume by re-running the same command.

## Deliverables
- Updated CLI docs covering usage, timing expectations, and API key setup.
- Entry point wiring: initialization run on first session, coding loop on subsequent sessions.
