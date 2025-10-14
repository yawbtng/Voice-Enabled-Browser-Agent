
# Development Conventions - Agent Workflow

## Primary Objective
Maintain momentum and clarity by following a repeatable, transparent workflow. Ensure all work is traceable, well-documented, and easy for any contributor to follow.

## Core Workflow Process

### 1. Task Preparation
- Read all relevant rules.
- Confirm work is within the **student-only MVP** scope.
- Review `/Docs/Implementation.md` for current stage, available tasks, and dependencies.

### 2. Task Planning
- Break down work into clear, manageable subtasks.
- For complex tasks, create a detailed todo list.
- Propose a task plan before implementation.

### 3. Test-Driven Development (TDD) Protocol
- **RED**: Write failing tests first that define the expected behavior
- **GREEN**: Write minimal code to make tests pass
- **REFACTOR**: Improve code while keeping tests green
- Test coverage must be maintained at ≥80% for new features
- All tests must pass before any commit

### 4. Implementation Protocol
- Create a new branch for each task: `feat/<area>-<slug>`, `fix/<area>-<slug>`, `chore/<slug>`.
- Follow **atomic commit principles**:
  - One logical change per commit
  - Each commit should be independently reviewable
  - Commit messages: `feat(ui):`, `fix(api):`, `docs:`, `test:`, etc.
  - Maximum 200 lines changed per commit (prefer smaller)
- Open PRs early and update as you push.
- Ensure all code follows project structure and design guidelines (`/Docs/project_structure.md`, `/Docs/UI_UX_doc.md`).

### 5. Status Tracking
- After every meaningful change, update `docs/STATUS.md`:
  - **Today:** Actions performed
  - **Working:** Verified OK
  - **Blocked / Not working:** Hypothesis and next probe
  - **Next:** Commit/PR list with owners

### 6. Issue & Sprint Management
- Convert accepted plans into GitHub issues with labels:
  - `area:frontend|backend|infra`, `type:feat|bug|chore`, `size:S|M|L`, `prio:P0|P1|P2`
- 2 week = 1 sprint. Track progress in `/docs/Implementation.md` under Sprint Based Implementation Checklist.

### 7. Task Completion
- Mark tasks complete only when:
  - All functionality is implemented and tested
  - All tests pass (unit, integration, e2e as applicable)
  - Code matches project structure and UI/UX specs
  - No errors or warnings remain
  - All subtasks are complete

### 8. File Hygiene & Modularity
- Prefer small, focused files/components; split when large.
- Keep rule files concise and modular for better AI edits.

## Testing Strategy & Commit Best Practices

### Testing Guidelines
- **Unit Tests**: Test individual functions/components in isolation
- **Integration Tests**: Test component interactions and API endpoints
- **E2E Tests**: Test complete user workflows
- **Test Structure**: Use descriptive test names that explain the scenario
- **Mocking**: Mock external dependencies appropriately
- **Coverage**: Maintain ≥80% code coverage for new features

### Atomic Commit Guidelines
- **Single Responsibility**: Each commit addresses one specific change
- **Logical Units**: Group related changes that belong together
- **Reviewable Size**: Keep commits small enough for thorough review
- **Descriptive Messages**: Use conventional commit format with clear descriptions
- **Working State**: Each commit should leave the codebase in a working state
- **Examples**:
  - ✅ `feat(auth): add password validation tests`
  - ✅ `fix(ui): resolve button alignment issue`
  - ❌ `feat: implement auth system and fix UI bugs`

## Critical Rules
- **NEVER** skip documentation consultation.
- **NEVER** skip writing tests first (TDD RED phase).
- **NEVER** commit without all tests passing.
- **NEVER** make large commits with multiple logical changes.
- **NEVER** ignore project structure or design guidelines.
- **ALWAYS** write tests before implementation.
- **ALWAYS** make atomic commits (one logical change per commit).
- **ALWAYS** document errors and solutions.
- **ALWAYS** follow the established workflow process.

> Every action should leave clear breadcrumbs: what changed, what works, what’s broken, and what’s next. Build a maintainable, transparent, and collaborative project environment.
