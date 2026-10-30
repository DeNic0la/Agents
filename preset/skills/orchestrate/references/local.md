# Local Markdown tracker

GitHub hosts the code PRs; the local tracker holds the issue queue. Keep one canonical tracker in the main checkout, shared by every lane, so closing a ticket unblocks its dependents at once.

## Setup and selection

1. Find the issues folder in `.agents/issue-tracker.md`: one file per issue named `<id>-<slug>.md`, with frontmatter `title`, `status` (`open` or `closed`), `labels`, `assignee`, `parent` and `blocked-by`. Record the initial list of issue files, for the filing report.
2. The tracker must not be tracked by git: closing tickets would dirty the main checkout, which has to stay clean. Run `git ls-files -- <issues folder>`; if any file is tracked, stop and name them. Make sure the folder is ignored, adding it to `.git/info/exclude` if needed. Don't change the project's shared ignore rules.
3. Run QUEUE with `--local <issues folder>` in the main checkout. The first column is the issue file's path relative to the main checkout; that path is the queue key. Its absolute form is the REF passed to workers.

The selector reads the frontmatter. `status: closed` closes an issue. READY selects implementation work; BUG plus TRIAGE selects triage work. An `assignee` excludes an issue. `parent` and `blocked-by` take issue ids from the same folder. A missing, malformed or duplicate id fails the read instead of treating an unknown blocker as closed. An issue that other issues name as their `parent` is a spec: it enters verification once all its children are closed.

## Worker access and ownership

On every launch and restart, send the absolute paths of `.agents/issue-tracker.md`, the issues folder, REF and the parent spec when there is one, and tell the worker:

> Read and update the canonical local tracker at these absolute paths. They are shared files in the main checkout, outside your code worktree. Keep code edits and git commands in your assigned worktree. Include the repository-relative issue path in commit messages and the PR body. Do not copy the tracker into the worktree or commit it. Close the issue only after its code PR merges, the way the tracker guide closes issues. This lane owns only its assigned issue; other issue files are read-only unless the orchestrator grants a tracker write slot.

Send this before every worker task; a fresh session has none of the preceding session's context. Quote REF paths so spaces and shell characters survive.

The lane owns its issue until it completes or parks. A worker that needs to create gap tickets, file another bug or edit another issue file asks you for the **tracker write slot**. Grant it to one writer at a time across all lanes; the writer re-reads the folder, picks unused ids, writes the files and reports their paths before releasing the slot. A parked worker keeps any slot it still uses. This slot is separate from the ship slot.

## Triage, verification and completion

Use the tracker guide's read, comment, label and close operations on REF instead of `gh issue` commands. Re-read the files after each change.

For spec verification, use the children's repository-relative paths as the commit references that establish the fixed point. If the history has no reliable reference, use the recorded child merge commits; if neither establishes it, park with the evidence gap. Never invent a baseline.

After a code PR merges, make sure the issue is closed even if the shipping worker missed it. A queue read failure stops selection with its error; it's not evidence that the work is done.
