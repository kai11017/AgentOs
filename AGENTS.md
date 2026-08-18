# Agent Workflow Instructions

This file contains permanent instructions for AI agents working on the LocalFlow Agent repository.

## Project Rules
*   Do not modify `main` directly.
*   Work on a dedicated branch (e.g., `agent/<task-id>-<short-description>`).
*   Inspect current Git state before making changes.
*   Read the relevant `.agent/` context before modifying code.
*   Make small, focused changes.
*   Do not modify unrelated files.
*   Do not introduce dependencies without justification.
*   Do not perform destructive operations without explicit approval.
*   Do not modify database schema without a migration.
*   Run appropriate validation before committing.
*   Never claim a task is complete if validation failed.
*   Update project state after meaningful work.

## Required Workflow
1.  **Load Context**: Read `AGENTS.md` and `.agent/state.md`. Progressively load `.agent/project.md`, `architecture.md`, `decisions.md`, and `conventions.md` as needed.
2.  **Inspect Git**: Run `git status`, `git log`, `git branch`. Identify base commit.
3.  **Understand Task**: Read task requirements and explicitly define scope and constraints.
4.  **Create Plan**: Produce a concise working plan.
5.  **Modify Code**: Implement the necessary changes.
6.  **Validate**: Run Lint, Typecheck, Unit/Integration Tests, and Build. Do not skip validation.
7.  **Review Diff**: Verify only intended files were modified. Ensure no secrets are committed.
8.  **Commit**: Use conventional commits (e.g., `feat:`, `fix:`, `docs:`, `test:`).
9.  **Update State**: Reflect changes in `.agent/state.md`.
10. **Generate Execution Record**: Document the session in `.agent/sessions/`.

## Validation Pipeline (Planned)
*   **Frontend**: `npm run lint`, `npm test`, `npm run build`
*   **Backend**: `flake8`, `pytest`

*Note: Validation scripts are currently placeholders in the scaffolded project.*
