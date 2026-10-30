# Review axes

Read at step 5 of the code-review process. Review each axis on its own; a change can pass one and fail another.

## Severity

| Severity | Meaning | `change-reviewer` label |
|---|---|---|
| **P0** | Breaks production, loses data, opens a security hole, or turns a check red | Critical |
| **P1** | Wrong behavior in normal use, or a spec requirement missing | High |
| **P2** | A real problem with limited reach | Medium |
| **P3** | Minor | Low |

When a subagent with the `change-reviewer` persona did the reading, map its labels with this table.

## SP: Spec

Skip with "no spec available" when step 2 found none. Quote the spec line for each finding.

- A requirement the spec asks for that is missing or only partly done (P1, or P0 when it loses data or breaks a contract).
- A requirement that looks implemented, but wrongly.
- Behavior the spec didn't ask for (scope creep). Usually P2; P1 when it changes behavior users rely on.
- Two requirements that can't both hold: report the conflict, don't pick a side.

## CO: Correctness

- Logic errors, wrong conditions, off-by-one errors.
- Edge cases: empty, null, zero, one, many, boundaries, overflow, unicode.
- Error handling and propagation: swallowed errors, wrong error type, partial writes left behind.
- Race conditions and concurrency: shared state, ordering, retries that double an effect.
- Type safety and unchecked casts.
- Behavior changes the intent doesn't mention.
- Tests: the changed behavior has a test that would go red if it broke. A test that can't fail (it asserts what a stub returns, or recomputes the expected value the way the code does) is P2.
- A change meant to keep behavior (a refactor) that edits test files beyond a rename or move is P1: the contract was rewritten to match the code.

## SE: Security

- Untrusted input reaching queries (SQL injection), commands, templates (XSS), file paths (path traversal), URLs (SSRF) or deserialization.
- Missing or wrong authentication and authorization; CSRF on state-changing requests.
- Secrets or credentials in code, config or logs; personal data in logs.
- New dependencies: known vulnerabilities, or a package that isn't what it claims (the `dependency-vetting` skill checks this).

## PE: Performance

- N+1 queries, missing indexes for new queries.
- Unbounded queries, loops or result sets; missing pagination.
- Work added on a hot path; algorithmic complexity (O(n²) where n grows).
- Leaked resources: connections, files, listeners, timers.
- Blocking calls in async code; unnecessary allocations in tight loops.

Flag only what the diff makes reachable, with the input that triggers it. "Might be slow under load" without a trigger is not a finding.

## ST: Standards

- Breaches of the project's documented rules (cite the file and the rule), its definition of done, and its testing patterns.
- Domain language: new names that contradict `GLOSSARY.md`, decisions that contradict an ADR.
- Maintainability: duplication, needless abstraction, unclear names, code in the wrong layer, dead code, missing comments on non-obvious logic.
- Operations: configuration, timeouts, migrations that lock or can't roll back, and the logs, metrics or alerts the change needs.

Documented-rule breaches can be P1. Smells without a documented rule behind them are P2 or P3.
