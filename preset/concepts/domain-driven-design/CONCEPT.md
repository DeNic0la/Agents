---
name: domain-driven-design
description: When writing, reviewing or refactoring application code - name modules after the domain, keep business logic pure and separate from I/O and transport, keep control flow, data flow and side effects visible at the call site, handle errors with types and context, and prefer an established library over custom infrastructure code.
---

# Domain-driven design

Applies to every agent, in any tool, that writes, reviews or refactors application code in any language. It doesn't govern agent instructions (skills, AGENTS.md, ...); the other concepts do that.

The rules come from Domain-Driven Design (Evans), Clean Architecture (Martin) and Functional Core, Imperative Shell (Bernhardt). Their shared goal is managing complexity: a reader should see what code means in domain terms, and what it does, without opening other files.

## Precedence

- **The project wins.** Where the project has an established convention, a linter rule or an ADR that contradicts a rule here, follow the project and mention the conflict. Never restructure unrelated code just to comply.
- **Apply to what you touch.** Follow the rules in new and changed code. Flag violations elsewhere instead of fixing them unasked.
- **The domain language comes from the project.** When the project has a `GLOSSARY.md` (or `GLOSSARY-MAP.md`), its terms are the names. When a needed term is missing or contested, use the `domain-modeling` skill.

## Rules

### Architecture

1. **Separate the layers.** Transport (controllers, UI, CLI handlers) only translates requests and responses. Business rules live in domain services or functions. Data access lives in repositories or gateways. No queries in controllers, no business rules in UI components.
2. **Functional core, imperative shell.** Business logic is pure: inputs in, result out, no I/O, no logging, no clock or randomness it didn't receive. An outer shell fetches data, calls the core, then performs every side effect. The core is testable without mocks.
3. **Keep bounded contexts apart.** A module belongs to one context and talks to another context only through that context's public interface.

### Explicitness

4. **Policy at the call site, mechanism in helpers.** A helper computes and returns (`isValid`, `formatResult`, `applyDiscount`). The caller decides what to do with the result: throw, branch, log, check a feature flag. A function named like a check or a transformation never throws, logs or reads a flag as a hidden decision.
5. **Side effects are visible where they happen.** Don't wrap `logger.log(...)` in a `logResult(...)` helper; extract only the pure formatting.
6. **Data flows through return values.** If a function produces a result, it returns it. Never communicate output by mutating an argument. Prefer `const`/immutable bindings and expressions over reassignment.
7. **Return early.** Handle invalid input and edge cases with guard clauses at the top, so the happy path stays at the outer indentation level. More than three levels of nesting is a signal to restructure.

### Code quality

8. **Name modules after the domain.** No `utils`, `helpers`, `common`, `shared` or `misc`. A function that seems to belong in one is a sign of a domain module that hasn't been named yet: `order-pricing`, `invoice-numbering`, `user-display`.
9. **Never swallow an error.** Catch only what you can handle, distinguish expected domain errors from unexpected system failures by type, log with context (operation, relevant IDs) and rethrow or return a typed failure. Extract repeated handling into one handler instead of copying catch blocks.
10. **Library first.** Before writing infrastructure or general-purpose code (retries, validation, parsing, dates, auth, state management), check the project's dependencies, then the ecosystem's established packages. Write it yourself only for logic unique to the domain, a measured performance need, security code that needs full control, or when a dependency would be heavier than the code. Adding a new dependency is the user's decision: propose it, with the reason.

## Supporting files

Examples are TypeScript for brevity; apply the same shape in the project's language and idiom.

- [architecture.md](architecture.md): read when deciding where logic goes, splitting a controller or service, or separating a calculation from its I/O (rules 1-3).
- [explicitness.md](explicitness.md): read when writing a helper that validates, transforms, formats or logs, or when untangling nested conditionals or mutated arguments (rules 4-7).
- [naming-and-libraries.md](naming-and-libraries.md): read when naming a new module or file, or before writing general-purpose or infrastructure code (rules 8 and 10).
- [error-handling.md](error-handling.md): read when writing or reviewing a `catch`, error type or failure result (rule 9).
