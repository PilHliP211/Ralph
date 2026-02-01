# Task 05: Security Model & OpenAI Client

## Goal
Replicate the quickstart security model and client configuration with OpenAI models.

## Responsibilities
- Implement a security layer that:
  - Restricts file operations to the project directory.
  - Enforces a bash allowlist for command execution.
  - Validates tool usage before execution.
- Provide a client module that:
  - Reads `OPENAI_API_KEY` from the environment.
  - Initializes the OpenAI SDK with the configured model.
  - Exposes a consistent interface for the agent runner.

## Deliverables
- Security module with an explicit allowlist (e.g., `ls`, `cat`, `head`, `tail`, `wc`, `grep`, `npm`, `node`, `git`, `ps`, `lsof`, `sleep`, `pkill`).
- Unit tests covering security enforcement.
- Client module mirroring the quickstart’s `client.py` behavior, but for OpenAI.
