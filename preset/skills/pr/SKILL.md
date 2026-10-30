---
name: pr
description: Use when opening a pull request, writing or rewriting a PR description, or when another workflow needs a PR body. Gives the body's shape - a summary diagram, before/after evidence and merge danger - so the PR is fast to review.
license: MIT
metadata:
  credits-skill: show-me
  credits-author: Dex Horthy
  credits-organisation: Humanlayer
  credits-url: "https://github.com/humanlayer/skills/tree/main/plugins/show-me/skills/show-me"
---

# PR

> **Repo version first:** if this repository has `.agents/skills/pr/SKILL.md`, follow that file instead of this one. It's tailored to the repository.

Write the PR body with this template. If the repository has its own pull request template (`.github/pull_request_template.md` or similar), use that instead.

```markdown
## Summary

<diagram, diff-sketch, or tree>

## Evidence

- **Before:** <screenshot/output/failing test run>
  **After:** <screenshot/output/passing test run>

## Merge danger

**Door:** <one-way or two-way>

<optional: description>

**Blast radius:** <one-word description>

<optional: potential ramifications of merge>
```

Skip preambles and keep prose brief. Use the project's domain language from its glossary (`GLOSSARY.md`, if it has one).

## Summary

Pick the smallest view that makes the key point clear: pseudocode for logic, a call tree for control flow, a component tree for UI, a shallow file tree for a refactor, Mermaid for interactions, or a `diff` sketch when the point is what changes in a shape that already exists. Read [references/summary-views.md](references/summary-views.md) for an example of each when you write the summary.

Place each visual next to the short text it supports. Keep only the calls, files, props, states and boundaries a reviewer needs to understand the change. Use one view or several, rarely all of them. Don't overwhelm the reader.

## Evidence

Concrete evidence that the change works, as a before and after.

- Screenshots are best, when the change is visual and the environment can take them.
- Execution evidence is next best: test results, console output. Show the exact test that failed before and passes now, using pseudocode.

## Merge danger

- **Door:** a two-way door can be walked back; a one-way door can't. A PR that is cheap to roll back is lower risk. Destructive actions and hard-to-reverse decisions are one-way doors.
- **Blast radius:** the potential impact of the change. Consider all possibilities, such as layout shift, breakage for consumers or mobile responsiveness.

Credits: the Summary section is adapted from Dex Horthy's `show-me` skill; see [CREDITS.md](CREDITS.md).
