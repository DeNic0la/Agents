# 0003 Synced claude.ai plugins off on work machines

- **Status:** accepted, implemented (2026-11-16)

## Context

Plugins enabled in the claude.ai account are synced into Claude Code. On the work laptop, 18 of them added 188 skills and about 42,000 characters of descriptions to every session, twice the preset's share. 89 of the 188 skills duplicate preset skills by name or job, and 16 of the 18 plugins were never used there. `skillOverrides` doesn't apply to plugin skills.

## Decision

The `work` environment's Claude settings turn every `<plugin>@synced` off in `enabledPlugins`. The `context7` plugin installed from the official marketplace stays on in place of its synced copy. The default settings (other machines) turn off the 10 that existed when they were written.

## Rejected

- **Delete the synced plugin folder:** claude.ai syncs it back.
- **Turn off only the duplicates:** the non-duplicates weren't used either, and each one still costs listing space.

## Consequences

- Plugins with no preset counterpart are gone on work machines (Java/Spring, Kafka/Flink streaming, Chrome extensions, desktop control, design, code modernization). Setting one to `true` in the work settings, then `agents update`, brings it back.
- A plugin newly enabled in the account appears on work machines until it's added to the list.
