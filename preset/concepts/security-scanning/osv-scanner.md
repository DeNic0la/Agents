# OSV-Scanner

Finds known vulnerabilities in dependencies by matching lockfiles, manifests, SBOMs and container images against the OSV database. Homepage: https://google.github.io/osv-scanner/. License: Apache-2.0. Publisher: Google (`google/osv-scanner`).

## Use when

- scanning a project's lockfiles or manifests for known vulnerabilities (the default dependency scanner)
- checking one lockfile after a dependency was added or upgraded
- scanning a container image when Grype isn't installed

## Install

Check: `osv-scanner --version` (2.7.1 was current in November 2026).

1. Windows: `winget install --id Google.OSVScanner -e`. The winget manifest can be days behind the release.
2. A release binary from https://github.com/google/osv-scanner/releases (`osv-scanner_windows_amd64.exe`, `osv-scanner_linux_amd64`, ...), checked against `osv-scanner_SHA256SUMS`. Releases also carry SLSA provenance; the installation docs show the `slsa-verifier` command.
3. `go install github.com/google/osv-scanner/v2/cmd/osv-scanner@v<version>`, pinned to a release tag rather than `@latest`, with the Go version the installation docs name.
4. Container: `ghcr.io/google/osv-scanner`.

## Run

- **A project:** `osv-scanner scan source -r <dir> -f json --output-file <temp>/osv.json`. `scan source` is the default subcommand.
- **One lockfile:** `osv-scanner scan source -L <lockfile>`.
- **An image:**
  - `osv-scanner scan image <name>:<tag>`: the tag is required, and it needs `docker` on PATH (it uses `docker save`).
  - Without docker: `osv-scanner scan image --archive <file.tar>`.
- **Formats** (`-f`):
  - `table` (the default), `json`, `sarif`, `markdown`, `html`, `vertical`, `gh-annotations`
  - SBOMs: `cyclonedx-1-4` to `cyclonedx-1-7`, `spdx-2-3`
  - `--output` is deprecated: use `--output-file`.
- **Offline:**
  - `--offline-vulnerabilities --download-offline-databases` downloads the databases, then matches locally.
  - `--offline` turns off everything that needs the network, so the databases must already be cached.
  - The cache folder is set by `OSV_SCANNER_LOCAL_DB_CACHE_DIRECTORY`.
- **Exit codes:** `0` means nothing found, `1` means vulnerabilities found, and `128` means no package sources were found.
- **Other flags:**
  - `--allow-no-lockfiles`: exit `0` instead of `128` when there's nothing to scan
  - `--no-resolve`: no transitive resolution of manifests
  - `--x-exclude <dir>`
  - `--licenses <allowlist>`
- **Call analysis:** Go call analysis (govulncheck) is on by default and uses the `go` toolchain; `--no-call-analysis=go` turns it off. `--call-analysis=rust` or `=all` compiles the project.
- **Fixes:** `osv-scanner fix -M <manifest> -L <lockfile>` rewrites dependency versions without asking.

**Accepted risk:** `osv-scanner.toml` next to the scanned lockfile. It isn't inherited by subfolders, and `--config <file>` overrides it. Ignoring an ID also ignores its aliases.

```toml
[[IgnoredVulns]]
id = "GHSA-xxxx-xxxx-xxxx"
effectiveUntil = 2027-02-15
reason = "Only reachable from the dev server; review by the expiry date."
```

## Limits

- **Network:**
  - Online, it queries the OSV API (osv.dev) and resolves manifests through deps.dev (`--data-source`, default `deps.dev`; `native` asks the package registries instead).
  - The docs don't list what is sent. Assume package names and versions leave the machine, and scan offline for a confidential project.
- **Rust call analysis** runs dependency `build.rs` scripts, which may execute arbitrary code. Only with the user's yes, and never on code you don't trust.
- **`fix`** changes manifests and lockfiles and may run package-manager scripts. Only after the user's yes on that project.
- **Help over this file:** run `osv-scanner scan source --help` once per session; it wins over this file.
