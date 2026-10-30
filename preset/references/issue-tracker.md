---
description: Recipe for this project's issue-tracker guide. Skills that publish or plan work in the tracker (to-spec, wayfinder) follow `.agents/issue-tracker.md`. If that file doesn't exist, generate it with this recipe before they touch the tracker.
---

# Issue tracker (recipe)

Skills such as `to-spec` and `wayfinder` publish specs and decision tickets to "the project's issue tracker". Trackers differ in how they create issues, label them, nest them and express blocking. This recipe describes how to generate the project's own guide in `.agents/issue-tracker.md`, so those skills work the same way everywhere.

## Generate

1. **Inspect the project.**
   - The tracker it uses: the git remote (GitHub, GitLab, ...), issue templates (`.github/ISSUE_TEMPLATE/`), links in the README or CONTRIBUTING, existing issue references in commits.
   - Which CLI is available and authenticated (`gh`, `glab`, a Jira CLI). Check with a read-only command.
   - Existing labels, especially triage labels.
   - If no tracker is found, ask the user. If there is none, use the local Markdown tracker (below).
2. **Ask the user** to confirm the tracker and the label vocabulary before writing anything. Never create labels or issues while generating the guide.
3. **Write `.agents/issue-tracker.md`** with these sections, each naming the exact commands or API calls for this tracker:
   - **Tracker:** which one, the project or repo it lives in, and the CLI to use.
   - **Issues:** create, read, comment, close, assign; how to write a multi-line body safely (a body file, not an inline string).
   - **Labels:** the triage vocabulary, at least `ready-for-agent` (fully specified, an agent can pick it up) and `needs-triage`, mapped to this tracker's real labels. Also the `wayfinder:map`, `wayfinder:research`, `wayfinder:prototype`, `wayfinder:grilling` and `wayfinder:task` labels, and whether they exist yet.
   - **Wayfinding operations:** how this tracker expresses a parent with child issues, native blocking ("blocked by"), and the query for the **frontier** (open, unblocked, unassigned children of a map). If the tracker has no native blocking, a body convention: a `Blocked by: #<id>, #<id>` line.
4. **Local Markdown tracker,** when there is no hosted tracker: issues are files in `issues/` named `<id>-<slug>.md`, numbered from 1 by scanning for the highest id. Frontmatter holds `title`, `status` (`open` or `closed`), `labels`, `assignee`, `parent` and `blocked-by`. Comments are appended under a `## Comments` heading. The frontier is found by reading the frontmatter.
5. **Finish.** Show the guide to the user for approval and commit it. The guide is owned by the project; this recipe never overwrites it.
