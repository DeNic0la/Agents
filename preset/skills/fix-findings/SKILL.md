---
name: fix-findings
description: Apply every finding from the most recent review, audit, verification or check in this session.
license: MIT
---

# Fix findings

Apply the findings from the most recent review, audit, verification, lint run, test run or other check reported earlier in this session, whatever produced it.

**Arguments:**

- Arguments that name findings (codes or numbers, such as `2-4` or `S1 C1`) narrow which ones.
- Arguments that carry a finding's own text are the report, even when it came from another session.
- No arguments means every finding, at every severity.

**Findings left as a choice for the user:** apply the option the arguments name, else the one the report recommended in so many words ("I recommend X"), worded exactly as it was offered. An option listed first or labelled "proposed" isn't a recommendation. With none named, skip the finding as waiting on that choice.

## Process

1. **Find the report.** If there's no such report in this session and no finding text in the arguments, say so and stop. Don't go looking for problems to invent.
2. **Fix root causes,** not the symptom each finding names. Search for every caller before editing a shared function: one guard where the callers converge beats a guard in each of them.
3. **Don't expand scope.** A finding is a fix, not an invitation to refactor around it.
   - When the finding proposes a fix, apply that fix, together with any change it can't work without, and name that change on the finding's report line.
   - If it can't work even so, skip the finding and say why instead of choosing another fix.
   - If it works at only some of the places the finding names, apply it there and report the finding as partly fixed.
4. **Run each edited repository's checks.** For every repository you edited, this one or another, read its `AGENTS.md`, `CLAUDE.md` and `CONTRIBUTING.md`. Run the checks they name, and make the other edits they require of a change (a version bump, a changelog entry). Done when each edited repository has had its checks run, or is named in the report as having none after you read those files.
5. **Report** one line per finding: `<code>: fixed`, `<code>: partly fixed, <what is left and why>`, or `<code>: skipped, <why>`. Then one line per edited repository with the checks run. Say plainly when a finding was wrong.

Don't commit. The user commits with the `commit` or `ship-pr` skill.
