# Plan template

Read at step 3 of the refactor process, for file scope with 4 or more changes, or project scope.

```markdown
## Refactor plan: <title>

### Current state
<what's wrong and why it matters>

### Target state
<what the code looks like after: fewer lines, fewer concepts, clearer boundaries>

### Changes
| File | Action | Why | Blocked by |
|---|---|---|---|
| path | modify / create / delete | reason | dependencies |

### Sequence
Phase 1: contracts, types, interfaces (if any)
Phase 2: implementation changes
Phase 3: callers
Phase 4: test updates - mechanical renames and moves only
Phase 5: cleanup, delete dead code

Verify after each phase: <command>
Final validation: <command that must pass before this is done>

### Rollback
For the riskiest phase: <how to undo it>

### Risks
- <what could go wrong, and the mitigation>
```

The target state has less or equal total code. If the plan adds net lines without removing complexity, rethink it.
