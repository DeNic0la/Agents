---
name: standup
description: Use when preparing for a daily standup, summarizing recent commits, pull requests and ticket moves, or turning rough notes into a yesterday / today / blockers update. Writes a short, shareable standup update.
---

# Standup

Write a standup update from recent activity or the user's notes: short, concrete, and ready to paste.

## Gather

Use what's available, and say what you couldn't reach:

1. **The user's notes**, if they gave any ("worked on the auth migration, reviewed 3 PRs, blocked on rate limits"). They come first; activity data only fills gaps.
2. **Source control:** the user's commits since the last working day, across the repos they name, e.g. `git log --author="$(git config user.email)" --since="yesterday" --oneline --all`. On a Monday, go back to Friday.
3. **Pull requests:** opened, reviewed and merged, from the code host if a CLI or connector is available.
4. **Tickets:** moved to in progress or done, from the project tracker if one is connected.
5. **Chat:** decisions or threads waiting on the user, if chat is connected.

If nothing is reachable and there are no notes, ask the user what they worked on.

## Write

```markdown
## Standup: <date>

### Yesterday
- <outcome, with a ticket or PR reference if there is one>

### Today
- <planned item, with reference>

### Blockers
- <blocker, its context, and who can help>
```

- Report outcomes, not activity: "merged the retry fix (#412)" beats "worked on PRs".
- Group related commits into one item. Three to five items per section at most.
- Leave out "Blockers" items that aren't blockers; write "None" instead.
- "Today" comes from the user or open tickets. If neither says, ask rather than invent.

Offer another format (a chat message, an email) if the user asks for one.
