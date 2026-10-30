# Assessment criteria

Read at step 2 of the refactor process. The default verdict is **Clean**: escalate only on clear evidence.

## Method scope

- **Cognitive complexity:** nesting deeper than 3, boolean expressions with more than 2 operators, or a branch count that makes the flow hard to follow. A long method that reads linearly isn't automatically a smell.
- **Length:** functions over about 50 lines warrant a look, but length alone isn't a verdict. A 70-line function with a clear flow beats 5 tiny functions that scatter the logic.
- **Parameters:** more than 4 on a public API suggests grouping. Internal helpers can have more.
- **Single responsibility:** does it do one thing?
- **Naming:** do names describe intent or mechanics?

## File scope

All method checks, plus:

- Dead code: unused functions, imports, variables.
- Duplicated logic across functions in the file.
- A god class or kitchen-sink module with unrelated responsibilities.
- Cohesion: do all parts belong together?

## Project scope

All file checks, plus:

- Circular dependencies between modules.
- Duplicated logic across files or modules.
- Overly deep nesting or more files than the code needs.
- Total size: could fewer files or functions do the same job?

A whole codebase always offers more findings than are worth acting on. Rank by hotspots first; it decides what to look at, not what is wrong.

## Architecture or refactoring?

Tightly coupled packages, shallow modules, missing abstractions at module level, and files that always change together without a code relationship are architecture problems. Report them as the architecture signal instead of planning refactors inside the module.
