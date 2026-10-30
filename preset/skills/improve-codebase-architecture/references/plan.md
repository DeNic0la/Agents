# The plan

Write the plan in the conversation (and to a file in the OS temp directory if the user will hand it to another session). It's the input for the `implement` skill, or for `to-spec` when the work needs more than one session.

```markdown
## Problem
- Which modules are shallow and tightly coupled
- What integration risk sits in the seams between them
- Which symptom it causes (change amplification, cognitive load, unknown unknowns)

## Proposed interface
- Interface signature (types, methods, parameters, invariants, error modes)
- Usage example showing how callers use it
- What complexity it hides

## Cohesion statement
- Single responsibility: one sentence, no "and"
- What this module owns: bulleted list
- What stays out: bulleted list, with reasons

## Dependency strategy
Which dependency category applies and how each dependency is handled (stand-in, port and adapters, mock).

## Testing strategy
- New tests at the interface: behaviors to verify through it
- Old tests to remove: tests on the shallow modules that the new tests replace
- Test environment needs: local stand-ins or adapters

## Migration strategy
Incremental (old and new coexist for a while) or a single switchover.
For high-traffic modules, prefer incremental with a deprecation path.

## Implementation steps
Concrete, ordered steps. Each names the files to change, what changes,
and any caller migration. Include an estimated scope.
```
