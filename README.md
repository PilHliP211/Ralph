# Ralph

My own implementation of Ralph (from Geoffrey Huntley: https://ghuntley.com/ralph/) written in Typescript, using Bun and Open AI's Agents SDK.

## CLI Usage

```bash
ralph init <spec_file> [project_dir]
ralph continue
ralph
```

- `ralph init` initializes a new project when `prd.json` is missing.
- `ralph continue` (or `ralph` with no args) resumes the coding loop in the current directory.

Set `OPENAI_API_KEY` before running the CLI.
