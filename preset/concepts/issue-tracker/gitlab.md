# GitLab

`#123` is the issue's IID, numbered per project. API paths take the IID, not the global `id`. A project is `group/subgroup/project`; in API paths it's URL-encoded (`group%2Fsubgroup%2Fproject`), or `:fullpath` in `glab api` inside the repository. Outside it, pass `-R group/project` to `glab`. The guide names the host (gitlab.com or a self-managed instance) and the project.

## Channels

| Channel | Read-only check |
|---|---|
| `glab` (GitLab CLI) | `glab auth status` |
| GitLab's MCP server at `https://<host>/api/v4/mcp` (Premium and Ultimate, beta), or another GitLab MCP server | a read tool returns the issue |
| REST API v4 through `glab api` (same login as `glab`) | `glab api user` |
| REST API v4 with `curl -H "PRIVATE-TOKEN: $GITLAB_TOKEN"` | `GET https://<host>/api/v4/user` |

For a self-managed instance, log in with `glab auth login --hostname <host>` and set `GITLAB_HOST=<host>` when you run `glab` outside the repository.

## Read

- **Issue with comments:** `glab issue view 123 --comments --output json > issue.json`.
- **All comments, in order:** `glab api "projects/:fullpath/issues/123/notes?sort=asc&per_page=100" --paginate`. Skip notes with `"system": true`; they record label, status and assignee changes, not discussion.
- **Links:** `glab api projects/:fullpath/issues/123/links`. Each entry has a `link_type`: `relates_to`, `blocks` or `is_blocked_by`.
- **Search:** `glab issue list --label needs-triage --output json`, or `glab issue list --search "<words>" --output json`.

## Write

The body goes in a file first. Pass its content with `"$(cat body.md)"` in a POSIX shell, or `(Get-Content -Raw body.md)` in PowerShell.

- **Create.** `glab issue create --title "<title>" --description "$(cat body.md)" --label needs-triage --yes`.
- **Comment.** `glab issue note 123 --message "$(cat comment.md)"`.
- **Labels.** `glab issue update 123 --label ready-for-agent --unlabel needs-triage`. A scoped label such as `workflow::ready` replaces any other label with the same scope.
- **Assign.** `glab issue update 123 --assignee <username>`.
- **Description.** `glab issue update 123 --description "$(cat body.md)"`, only for a description the agent wrote or the user asked to change.
- **Close and reopen.** `glab issue close 123`, `glab issue reopen 123`.
- **Links.** `glab api -X POST projects/:fullpath/issues/123/links -F target_project_id=<project id or URL-encoded path> -F target_issue_iid=124 -F link_type=is_blocked_by`. `blocks` and `is_blocked_by` need Premium. On Free, link with `relates_to` and add a `Blocked by: #124` line to the body.
- **Parent and children.** Child tasks and epics depend on the tier and the instance's version. The guide records the project's convention. Without one, put a `Parent: #12` line in the child's body and a task list of its children in the parent.
- **Closing through a merge request.** `Closes #123` (or `Fixes #123`) in a merge request description, or in a commit message, closes the issue when the change reaches the default branch. Use it only for an issue the change completes, and `Related to #123` for the others.
