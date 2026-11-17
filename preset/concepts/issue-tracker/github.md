# GitHub

`#123` is the issue's number, shared with pull requests in the same repository. Inside the clone, `gh` finds the repository itself; outside it, pass `-R owner/repo`. In `gh api` paths, `{owner}/{repo}` is filled in from the clone. The guide names the repository and, for a repository run by the cloud development workflow (`docs/development-workflow.md`), says so: there the dispatcher owns the state labels, and an agent sets none of them.

## Channels

| Channel | Read-only check |
|---|---|
| `gh` (GitHub CLI) | `gh auth status` |
| GitHub's MCP server, or another GitHub MCP server | a read tool returns the issue |
| REST or GraphQL API through `gh api` (same login as `gh`) | `gh api user -q .login` |
| REST API with `curl -H "Authorization: Bearer $GITHUB_TOKEN"` | `GET https://api.github.com/user` |

For GitHub Enterprise Server, log in with `gh auth login --hostname <host>` and set `GH_HOST=<host>` outside the clone.

## Read

- **Issue with comments:** `gh issue view 123 --comments --json number,title,body,state,stateReason,labels,author,comments > issue.json`.
- **Timeline** (labels, closes, references, in order): `gh api "repos/{owner}/{repo}/issues/123/timeline?per_page=100" --paginate`. Label and close events are the record of who decided what; comments are the discussion.
- **Search:** `gh issue list --state all --search "<words>" --json number,title,state,stateReason,url`. `--state all` matters: a closed issue, above all one closed as not planned, is as much a duplicate as an open one.
- **Linked pull requests:** `gh issue view 123 --json closedByPullRequestsReferences`.

## Before creating an issue

Search open issues, closed issues, and the repository's `.out-of-scope/` folder ([out-of-scope](../out-of-scope/CONCEPT.md)) for the same concept, not only the same title. If one exists, create nothing. When you have new evidence for it, comment on the existing issue; for a rejection in `.out-of-scope/`, tell the user which record it is.

## Write

The body goes in a file first. Pass it with `--body-file body.md`, never as an inline string.

- **Create for the user.** When the user asks for a feature or a change, put the user's own words in the body unchanged, under a heading such as `## The owner's request`, and anything you add (context, links, a proposed check) under its own heading after it. Report the issue's URL. An issue filed with the user's login is theirs; one filed by an agent identity says in its first line that it was filed on the user's behalf.
- **Create for something you noticed.** When you find something outside the issue or task you're on (a bug, a cleanup, an idea), file an issue for it with what you saw and where, and change nothing for it. Mention the new issue in your report.
- **Create.** `gh issue create --title "<title>" --body-file body.md`, adding `--label <label>` only with labels the guide lists. Without a guide, add none. Read the URL it prints.
- **Comment.** `gh issue comment 123 --body-file comment.md`.
- **Labels.** `gh issue edit 123 --add-label <label> --remove-label <label>`. In a repository run by the cloud workflow, an agent sets no state, merge or budget label; the dispatcher does.
- **Description.** `gh issue edit 123 --body-file body.md`, only for a description the agent wrote or the user asked to change.
- **Close and reopen.** `gh issue close 123 --reason "not planned"` (or `completed`), `gh issue reopen 123`. Closing as not planned is a rejection: in a repository with `.out-of-scope/`, it's the maintainer's call, not the agent's.
- **Links.** GitHub has no typed links between issues outside sub-issues. Write `Blocked by #124` or `Related to #124` in the body; a mention shows on both issues' timelines.
- **Parent and children.** Sub-issues: `gh api -X POST repos/{owner}/{repo}/issues/12/sub_issues -F sub_issue_id=<id>`, where `<id>` is the child's `id` from `gh api repos/{owner}/{repo}/issues/124 -q .id`, not its number. Without sub-issues, put a `Parent: #12` line in the child and a task list of its children in the parent.
- **Closing through a pull request.** `Closes #123` (or `Fixes #123`) in a pull request body closes the issue when it merges into the default branch. Use it only for the issue the change completes, and `Related to #123` for the others.
