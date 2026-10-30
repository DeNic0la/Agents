# Changes outside the repo

User-global steering (`~/.agents/`, a tool's global instruction file such as `~/.claude/CLAUDE.md` or `~/.codex/AGENTS.md`), hook rules and installed skills are part of the agent's environment too. Read this before you propose a change to any file outside the repository.

- **Hook rules.** Take the tool's name from the hook's block message in the session and ask that tool where its rules live (its usage text, or a subcommand that prints the ruleset).
- **Never search the home directory (`~`) by content.** It holds every session transcript, and a rule's name is often its file name.
- **Trace the source first.** Resolve symlinks (`readlink -f`) and read the owning repository's `AGENTS.md` or `CLAUDE.md` for how the file is maintained.
- **A regular file can still be synced.** When `readlink -f` resolves nowhere new, search the `AGENTS.md` or `CLAUDE.md` of the repository your global steering resolves into for the file's name before you call the file hand-edited. Files that an agent preset's installer or `agents sync` writes are copies of that preset's repository.
- **Generated files are copies.** A file a tool writes (an `init` or install command, a plugin update) is overwritten by the next run. Target what generates it, move the change to a file the user edits by hand, or mark the candidate upstream.
- **Plugin caches are copies.** A skill installed from a plugin marketplace (for Claude Code, under `~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/`) is overwritten by the next update. Name its source checkout (for Claude Code, look `<marketplace>` up in `~/.claude/plugins/known_marketplaces.json`), or mark the candidate upstream when the user doesn't maintain it.
