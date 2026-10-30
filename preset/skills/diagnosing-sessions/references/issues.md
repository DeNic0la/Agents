# Issues

File with whoever maintains the source that report §7 rates possible or likely:

| Source | Where to file |
|---|---|
| A skill, agent or reference from this preset | the preset's repository: the git remote of the checkout `agents` runs from (resolve the command's symlink, then `git -C <checkout> remote get-url origin`) |
| A project's own instructions or repo skills | the project's tracker, following `.agents/issue-tracker.md` (generate it with the issue-tracker recipe if it's missing) |
| A third-party plugin, skill or MCP server | its repository, from its manifest, README or install source |

Confirm the target with the user before searching. One issue per maintainer; never file one source's findings with another.

## Search

Search open and closed issues for the symptoms. Use `gh` when it's installed and authenticated:

```bash
gh search issues --repo <owner/repo> --limit 10 "<terms>" \
  --json number,state,title --jq '.[] | "\(.number)\t\(.state)\t\(.title)"'
```

Without `gh`, use the public search API (unauthenticated, 10 requests a minute): `https://api.github.com/search/issues?q=repo:<owner/repo>+is:issue+<url-encoded terms>&per_page=10`. Without either, give the user `https://github.com/<owner/repo>/issues?q=<terms>`. For a non-GitHub tracker, use its CLI or search page.

Show the matches and suggest adding the report to the closest one as a comment.

## File

Fill `assets/issue.md`, following the repository's issue template when it has one. Write it to the workspace and show the exact text. After approval:

```bash
gh issue create --repo <owner/repo> --title "<title>" --body-file <path>
```

Add labels only if they exist in that repository; GitHub drops labels silently when the reporter lacks push access. `gh` can't attach files, so if a bundle exists, give the user its path to attach in the browser after the issue exists.

Without `gh`, hand over a prefilled link: `https://github.com/<owner/repo>/issues/new?title=<url-encoded title>&body=<url-encoded body>`. GitHub rejects URLs over about 8,000 characters; past that, send the link with the title only and tell the user to paste the body from the file.
