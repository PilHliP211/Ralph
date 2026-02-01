# Task 04: Coding Agent Loop Parity

## Goal
Implement the iterative loop that resumes from `feature_list.json`, builds features one at a time, and commits progress.

## Responsibilities
- Load `feature_list.json` and select the next `passes: false` feature.
- Resume context from `progress.txt` and git history.
- Implement the feature, run tests, and mark it as passing.
- Commit after each feature completion.
- Auto-continue into the next iteration (3s delay) unless `--max-iterations` is reached.

## Deliverables
- Coding agent prompt file (e.g., `prompts/coding_prompt.md`) with the same “one feature at a time” constraint as the quickstart.
- Loop logic that persists feature completion status and commit history.

## Notes
- Ensure PRD/feature-list mutation is limited to flipping `passes` for the active feature.
- OpenAI model selection should be honored for each run.
