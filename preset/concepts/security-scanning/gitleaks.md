# Gitleaks

Finds secrets (API keys, tokens, passwords, private keys) in files, git history or stdin, using regex and entropy rules. Homepage: https://github.com/gitleaks/gitleaks. License: MIT.

## Use when

- checking a repository's git history for committed secrets
- checking the working tree or a folder before a commit, a release or publishing
- a secret may have leaked and you need every place it appears

## Install

Check: `gitleaks version` (8.30.1 was current in November 2026).

1. Windows: `winget install --id Gitleaks.Gitleaks -e`. It's a community manifest, so check the installed binary's version against the release and its checksums file.
2. A release archive from https://github.com/gitleaks/gitleaks/releases (`gitleaks_<version>_windows_x64.zip`, `..._linux_x64.tar.gz`), checked against `gitleaks_<version>_checksums.txt`. Releases carry no signatures, so the checksum is the only check.
3. Container: `ghcr.io/gitleaks/gitleaks` (also `zricethezav/gitleaks`).
4. From source with `make build`, as its README shows.

## Run

- **Git history:** `gitleaks git <repo> --redact -f json -r <temp>/gitleaks.json`.
  - `--log-opts="<git log options>"` narrows the commits, such as `--log-opts="--all"` or a range `A..B`.
- **Files, with no git involved:** `gitleaks dir <path> --redact -f json -r <temp>/gitleaks.json`.
- **Piped text:** `gitleaks stdin`.
- **Flags:**
  - `--redact` masks secrets in logs and stdout (100% by default; never pass a lower percentage).
  - `-f/--report-format`: `json`, `sarif`, `csv`, `junit`, `template`.
  - `-r/--report-path` writes the report.
  - `-b/--baseline-path <report>` shows only findings that aren't in an earlier report.
  - `-c/--config <file>` sets custom rules (the default is `.gitleaks.toml` in the repo, then the built-in rules).
  - `-v` lists each finding.
- **Exit codes:** `0` means no leaks; `1` means leaks or an error; `--exit-code` changes the leak code.
- The subcommands `detect` and `protect` are deprecated since v8.19.0. Use `git` and `dir`.

**Accepted risk** (a false positive or a test fixture):
- add the finding's fingerprint to `.gitleaksignore` in the repo root (or a file given with `-i`), with a comment line above it giving the reason and a review-by date; or
- put a `gitleaks:allow` comment on the line itself.

Neither has an expiry date. Never ignore a real secret: rotate it.

## Limits

- **Reach:** it reads every file and commit it's pointed at. Its README mentions no network use.
- **The report file holds the matched lines**, so treat it as sensitive whatever the redaction says. Keep it in the OS temp folder, read it, write the report without secret values, then delete the file.
- **A clean result isn't proof** there's no secret: a custom format or a secret split across lines can pass its rules.
- **Help over this file:** run `gitleaks git --help` once per session; it wins over this file.
