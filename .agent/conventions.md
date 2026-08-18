# Project Conventions

## Branching & Commits
- **Agent Branches**: Work on branches named `agent/<task-id>-<description>` (e.g., `agent/WF-001-setup-frontend`).
- **Commit Format**: Follow Conventional Commits format (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`).
- **Commit Size**: One logical change per commit. Do not combine unrelated changes.

## Naming Conventions
- **Python (Backend)**:
  - `snake_case` for variables, functions, and module names.
  - `PascalCase` for classes.
- **TypeScript (Frontend)**:
  - `camelCase` for variables and functions.
  - `PascalCase` for React components and interfaces/types.
- **Files**:
  - React components should be `PascalCase.tsx`.
  - Python files should be `snake_case.py`.

## Validation
- Ensure no type errors or linter warnings are committed.
- Frontend must pass `npm run lint`.
- Backend must pass `flake8` and `mypy` (when configured).

## Database & State
- **No manual schema changes**: Always use migration files (e.g., Alembic for Python or Prisma/Supabase migrations).
- Do not store environment variables or API keys in code or session logs. Always use `.env`.

## Agents
- Read and update `.agent/state.md` upon completion of a task.
- Generate a session execution log for traceability.
