# Task 03: Initialization Agent Parity

## Goal
Match the quickstart initializer session behavior, adapted to OpenAI models.

## Responsibilities
- Read `prompts/app_spec.txt` and generate `feature_list.json` with detailed test cases (default target: 200).
- Scaffold the project directory and initialize git.
- Copy `app_spec.txt` into the project directory.
- Create `init.sh` to set up the generated application environment.
- Write a progress note file (e.g., `progress.txt`) describing what happened.
- Persist security settings file (OpenAI-flavored equivalent of `.claude_settings.json`).

## Deliverables
- An initialization agent prompt file (e.g., `prompts/initializer_prompt.md`) that explicitly forbids feature implementation.
- Initialization logic that validates and writes `feature_list.json` as the source of truth.
- Initial git commit after scaffolding and file generation.

## Notes
- Keep the 200-feature expectation in prompts, but document how to reduce it for faster demos.
- Ensure the OpenAI model name is configurable via CLI.
