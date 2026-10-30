# Refactoring moves

Read at step 5 of the refactor process, before the first edit. Apply only the moves that improve this code.

## Reduce complexity

- Replace nested conditionals with guard clauses or early returns.
- Extract focused helper functions from long methods.
- Replace complex boolean expressions with named predicates.
- Break god classes into cohesive modules.

## Eliminate duplication

- Extract shared logic into one function.
- Replace copy-pasted code with a parameterized function.
- Consolidate duplicate type definitions.

## Improve clarity

- Rename variables and functions to describe intent, not mechanics.
- Replace magic numbers and strings with named constants.
- Group related parameters into an object or record.
- Move logic to the object that owns the data (feature envy).

## Reduce entropy

- Delete dead code: unused functions, imports, variables, commented-out blocks.
- Inline single-use abstractions: needless wrappers, thin delegators.
- Prefer plain data structures over custom types when no custom behavior is needed.
- Ask: could this be fewer functions, fewer files, fewer concepts?

## Method complexity reduction

1. Identify the sources: nesting, long if/else chains, repeated blocks, complex booleans.
2. Extract focused helpers, each with one clear responsibility.
3. Use guard clauses to reduce nesting.
4. The main method reads as a high-level flow.
5. Preserve all input/output behavior, error handling and edge cases.

## Where deletion goes wrong

"Less code" is the measure, not the goal. Reject a change that wins on line count and loses on reading:

- Nested ternaries and dense one-liners are fewer lines and harder to read.
- An abstraction that names a concept isn't a needless wrapper. Inline the thin delegator, keep the one that names something.
- If the metric improved but the code reads worse, the change failed. Readability is the criterion; line count is a proxy.
