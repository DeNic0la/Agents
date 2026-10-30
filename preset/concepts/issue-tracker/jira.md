# Jira

An issue is a key: the project key and a number, such as `ABC-123`. The guide names the site (Cloud `https://<site>.atlassian.net`, or a Data Center host), the project key, the issue types, and the transitions that start and finish work.

## Channels

| Channel | Works with | Read-only check |
|---|---|---|
| `acli` (Atlassian CLI) | Cloud | `acli jira auth status` |
| `jira` (jira-cli) | Cloud, Data Center | `jira me` |
| An MCP server, such as Atlassian's Rovo MCP server | Cloud | a read tool returns the issue |
| REST API with `curl` | Cloud, Data Center | `GET /rest/api/2/myself` |

- **REST auth.** Cloud: basic auth with the account's email and an API token, `curl -u "$JIRA_EMAIL:$JIRA_API_TOKEN"`. Data Center: a personal access token, `-H "Authorization: Bearer $JIRA_PAT"`. The base URL is `$JIRA_BASE_URL`. The guide names the variables if they differ.
- **MCP.** Tool names depend on the server and its version. Find the tools to read, search with JQL, create, edit, comment on and transition an issue in the session's tool list. Atlassian's server names them like `getJiraIssue` and `searchJiraIssuesUsingJql`, and most of its tools need the site's cloud id, which its resource-listing tool returns.

## Read

- **acli:** `acli jira workitem view ABC-123 --fields "*all" --json > issue.json`. Comments: `acli jira workitem comment list --key ABC-123`.
- **jira-cli:** `jira issue view ABC-123 --comments 100 --plain`.
- **REST:** `GET $JIRA_BASE_URL/rest/api/2/issue/ABC-123?fields=summary,description,status,issuetype,labels,assignee,parent,issuelinks,attachment,comment`. When there are many comments, page through `GET /rest/api/2/issue/ABC-123/comment?startAt=0&maxResults=100`. API v2 returns the description and comments as wiki markup, v3 as ADF; add `expand=renderedFields` for HTML.
- **Search with JQL:** `acli jira workitem search --jql "<JQL>" --json`, or `jira issue list -q "<JQL>" --plain`. REST: `GET /rest/api/3/search/jql?jql=<JQL>&fields=<fields>` on Cloud (the older `/search` endpoint is being removed there), `GET /rest/api/2/search?jql=<JQL>` on Data Center.

## Write

Write the body to a file first, in wiki markup for REST v2 and jira-cli, or in ADF or plain text for `acli` and REST v3. For REST, build the JSON payload from that file with a JSON tool, for example `jq -n --rawfile d body.txt '{fields: {..., description: $d}}' > payload.json`, and send it with `curl -X POST -H "Content-Type: application/json" --data @payload.json`.

- **Create.** `acli jira workitem create --project ABC --type Task --summary "<title>" --description-file body.txt`, or `--from-json workitem.json` for more fields (`--generate-json` writes a template). REST: `POST /rest/api/2/issue` with `{"fields": {"project": {"key": "ABC"}, "issuetype": {"name": "Task"}, "summary": "...", "description": "...", "labels": ["needs-triage"]}}`.
- **Comment.** `acli jira workitem comment create --key ABC-123 --body-file comment.txt`. REST: `POST /rest/api/2/issue/ABC-123/comment` with `{"body": "..."}`.
- **Labels.** REST: `PUT /rest/api/2/issue/ABC-123` with `{"update": {"labels": [{"add": "ready-for-agent"}, {"remove": "needs-triage"}]}}`.
- **Assign.** REST: `PUT /rest/api/2/issue/ABC-123/assignee` with `{"accountId": "..."}` on Cloud or `{"name": "<username>"}` on Data Center.
- **Status.** Jira has no plain "close". A status changes through a workflow transition, and each project's workflow has its own. List the transitions with `GET /rest/api/2/issue/ABC-123/transitions?expand=transitions.fields` (some require fields, such as a resolution), then `POST` to the same path with `{"transition": {"id": "<id>"}}`. CLIs: `acli jira workitem transition --key ABC-123 --status "Done"`, `jira issue move ABC-123 "Done"`.
- **Links.** Link type names come from `GET /rest/api/2/issueLinkType`; blocking is usually `Blocks`. REST: `POST /rest/api/2/issueLink` with `{"type": {"name": "Blocks"}, "inwardIssue": {"key": "ABC-2"}, "outwardIssue": {"key": "ABC-1"}}`. jira-cli: `jira issue link ABC-1 ABC-2 Blocks`. Which side blocks which is easy to get backwards: read `issuelinks` on both issues afterwards, check the wording ("blocks", "is blocked by"), and fix a reversed link.
- **Parent.** Set `"parent": {"key": "ABC-1"}` in the fields for a sub-task, and on Cloud for a child of an epic. Data Center epics use the Epic Link custom field instead; the guide records which applies.

## Cloud versus Data Center

| | Cloud | Data Center |
|---|---|---|
| CLI | `acli`, `jira` | `jira` |
| Auth | email and API token | personal access token |
| Users | `accountId` | username |
| JQL search | `/rest/api/3/search/jql` | `/rest/api/2/search` |
| Epic children | `parent` field | Epic Link custom field |
