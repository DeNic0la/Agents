---
description: Recipe for this project's testing patterns. When writing or changing tests, follow `.agents/testing-patterns.md`. If that file doesn't exist, generate it with this recipe before starting other work.
---

# Testing patterns (recipe)

A short, project-specific reference of how tests are written here, generated into `.agents/testing-patterns.md`. The principles are universal; the syntax, tools and commands must be the project's own.

## Generate

1. **Inspect the project.**
   - Test frameworks and runners for each layer: unit, component, API/integration, end-to-end.
   - The commands to run all tests and a single test.
   - Where tests live and how files and cases are named.
   - Shared fixtures and helpers, and the mocking library.
   - How CI runs the tests.
2. **Write `.agents/testing-patterns.md`.** Give every section a short example in the project's language and framework. Prefer adapting a real test from the repo over inventing one.
   - **Header:** the stack, and the commands to run all tests and a single test.
   - **Test structure:** Arrange-Act-Assert, with one example.
   - **Naming:** `[unit] [expected behavior] [condition]`, adjusted to the existing convention.
   - **Common assertions:** the framework's forms for equality vs. deep equality, errors, and async results.
   - **Mocking:** the framework's mock API, and the rule to mock only at boundaries:
     - mock database, HTTP, file system, external APIs, and time when needed
     - never mock business logic, validation or pure functions
   - **One section per test layer the project has** (component, API/integration, end-to-end), each with a realistic example. For UI tests, find elements by accessible role and label, not by test IDs.
   - **Anti-patterns:** a table of problem and better approach:
     - testing implementation details
     - snapshotting everything
     - shared mutable state between tests
     - testing third-party code
     - skipping or permanently disabling tests to get CI green
     - overly broad assertions
     - async tests that aren't awaited
3. **Fit it to the project.** Cover only the layers and tools the project uses. Keep it under about 250 lines. Leave no placeholders.
4. **Get approval.** Show the file to the user, apply their changes, and commit it.

## Afterwards

Update the file when the project adopts a new test layer or tool. If this recipe changes later, suggest the additions to the user instead of regenerating the file silently.
