# maigret

Collects a dossier on a person from a username alone: it checks thousands of sites for an account with that name and extracts what the profile pages show (names, links, other usernames). Homepage: https://github.com/soxoj/maigret. Docs: https://maigret.readthedocs.io. License: MIT.

## Use when

- the user asks which sites an account name exists on, or whether a handle is taken
- the user asks for an OSINT report on a username, for example their own footprint or an authorized investigation
- the user gives a profile URL and wants the accounts linked to it

## Install

Check: `maigret --version`

Needs Python 3.10 or later (3.11 recommended).

1. `uv tool install maigret` (upgrade: `uv tool upgrade maigret`)
2. `pipx install maigret` (upgrade: `pipx upgrade maigret`)
3. Docker, if Python isn't available: `docker pull soxoj/maigret`, then `docker run -v <output-dir>:/app/reports soxoj/maigret:latest <username> --html`
4. Windows without Python: `maigret_standalone.exe` from the GitHub releases page

PDF reports need the extra: `uv tool install 'maigret[pdf]'` or `pipx install 'maigret[pdf]'`. On Windows that needs nothing else. On Linux and macOS it needs the cairo headers, which need a system package manager (`apt`, `dnf`, `brew`) and so a separate yes. Without the extra, the other formats still work.

## Run

`maigret <username> [<username> ...] --folderoutput <dir> [report flags]`

- Always pass `--folderoutput <dir>` (`-fo`). The docs disagree on the default folder (`results/` or `reports/` in the current directory), and the current directory is often a repo.
- Sites: the top 500 by default. `--top-sites <n>` changes the count, `-a`/`--all-sites` checks all of them (slow), `--tags <tags>` narrows by category or two-letter country code (`--tags photo,dating`, `--tags us`).
- Reports: `--html` (`-H`), `--md` (`-M`), `--txt` (`-T`), `--csv` (`-C`), `--json simple|ndjson` (`-J`), `--pdf` (`-P`), `--xmind` (`-X`), `--graph`. Use `--json ndjson` or `--md` when you read the result yourself; `--html` for the user.
- From a profile URL: `maigret --parse <url>`.
- `--no-recursion` stops it from searching again for the other usernames it finds. Use it unless the user wants the wider search.
- Network: `--timeout <seconds>` (default 30), `--retries <n>`, `--proxy <url>` (`-p`, e.g. `socks5://127.0.0.1:1080`).
- Debugging: `--print-errors`, `--print-not-found`, `-v`/`-vv`/`-vvv`. `--self-check` tests the site database.

## Limits

- **Lawful use only**, as its authors state. Run it only on a username the user gives you, for a lookup they asked for. Don't run it on names you find in other material on your own initiative, and don't chain a lookup into profiling further people without asking.
- **Results are personal data about a real person.** Write reports outside the repo (the OS temp folder or a folder the user names), never commit them, and tell the user where they are.
- **Results are leads, not facts.** The same username on two sites isn't necessarily the same person; say so when you summarize.
- **It sends many requests** (100 parallel connections by default). Don't loop it over many names without asking.
