# Ralph

My own implementation of Ralph (from Geoffrey Huntley: https://ghuntley.com/ralph/) written in Typescript, using Bun and Open AI's Agents SDK.

## CLI Usage

```bash
ralph --project-dir ./autonomous_demo_project
ralph --project-dir ./my_project --max-iterations 3 --model gpt-4.1
```

- `--project-dir` defaults to `./autonomous_demo_project`.
- `--max-iterations` defaults to unlimited.
- `--model` defaults to `gpt-4.1` (any OpenAI model ID works).

The CLI initializes when `feature_list.json` is missing, then runs coding iterations with a 3-second delay between each run. Re-run the same command to resume with a fresh context.

Set `OPENAI_API_KEY` before running the CLI.
