# Task 06: Validation, Restartability, and Handoff

## Goal
Prove the harness works end-to-end, can restart from persisted artifacts, and hands off cleanly across sessions.

## Responsibilities
- Validate initialization → coding loop end-to-end.
- Verify restart behavior with partially completed PRD.
- Capture progress and handoff signals.

## Steps
1. Run a small spec through init:
   - Confirm `prd.json` creation, scaffolding, and initial commit.
2. Let the coding loop complete at least one feature:
   - Verify test success, PRD update, and commit.
3. Simulate interruption:
   - Stop mid-run, then restart.
   - Confirm resumption from the next `passes: false` entry.
4. Review artifacts:
   - PRD, git log, and optional `progress.md` should align.
5. Edge-case checks:
   - Empty PRD.
   - Large PRD.
   - Interdependent features.

## Deliverables
- Validation checklist documented in README or a dedicated doc.
- Confidence that the harness can pause/resume safely.

## Notes
- Favor deterministic checks and observable outcomes.
