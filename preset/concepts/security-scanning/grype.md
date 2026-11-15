# Grype and Syft

Syft builds an SBOM (the list of every package) from a container image, an archive or a folder. Grype matches an SBOM, an image or a folder against its vulnerability database. Homepages: https://github.com/anchore/grype and https://github.com/anchore/syft. License: Apache-2.0, both. Publisher: Anchore.

## Use when

- scanning a container image, or an image archive, for vulnerable OS and language packages (the default image scanner)
- making an SBOM for a release, then scanning it now and again later without rebuilding
- scanning a folder or an unpacked root filesystem for installed OS packages

## Install

Check: `grype version` and `syft version` (0.121.3 and 1.57.1 were current in November 2026).

1. Windows: `winget install --id Anchore.Grype -e` and `winget install --id Anchore.syft -e`. The Syft manifest can be several releases behind.
2. Release archives from the GitHub releases pages (`grype_<version>_windows_amd64.zip`, `syft_<version>_linux_amd64.tar.gz`, ...).
   - Check each archive against `<tool>_<version>_checksums.txt`.
   - Verify that checksums file with cosign (v2.5 or later). For Grype:
     ```
     cosign verify-blob grype_<v>_checksums.txt --bundle grype_<v>_checksums.txt.sigstore.json \
       --certificate-identity-regexp 'https://github\.com/anchore/grype/\.github/workflows/.+' \
       --certificate-oidc-issuer https://token.actions.githubusercontent.com
     ```
     For Syft, the same command with `syft_<v>_...` files and `anchore/syft` in the identity.
   - If verification fails, or cosign isn't available and the user declines it, stop and tell the user. Don't fall back to an unverified download.
3. Container: `anchore/grype`, `anchore/syft`.
4. The documented install script (`curl -sSfL https://get.anchore.io/grype | sh -s -- -b <user bin dir>`). Prefer a verified binary over piping a script into a shell. Never run it with `sudo` without a separate yes.

## Run

- **SBOM:** `syft <image or dir:path> -o cyclonedx-json=<temp>/sbom.cdx.json`.
  - Sources: `dir:`, `docker:`, `docker-archive:`, `registry:`.
  - Formats: `cyclonedx-json`, `spdx-json`, `syft-json`.
- **Scan:**
  - `grype sbom:<temp>/sbom.cdx.json -o json --file <temp>/grype.json`
  - or directly: `grype <image>`, `grype dir:<path>`.
- **Flags:**
  - `-o`: `table`, `json`, `sarif`, `cyclonedx-json`, `template`.
  - `--fail-on <negligible|low|medium|high|critical>` exits with code `2` at or above that severity.
  - `--only-fixed` lists only findings that have a fixed version.
- **Database:** `grype db status`, `grype db update`; `grype db import <file>` for an offline database.

**Accepted risk:** an `ignore` rule in `.grype.yaml`, with `vulnerability`, optionally `package` (`name`, `version`), and `reason`. It has no expiry field, so put a review-by date in the reason.

```yaml
ignore:
  - vulnerability: CVE-2026-12345
    package: { name: libexample, version: 1.2.3 }
    reason: "Not reachable from the image's entrypoint; review by 2027-02-15."
```

## Limits

- **Network:**
  - Grype downloads its vulnerability database and updates it automatically (`db.auto-update`). It refuses a database older than about five days.
  - Both tools check for a newer version at launch. The config key `check-for-app-update: false` turns that off (as an environment variable: `GRYPE_CHECK_FOR_APP_UPDATE=false`, `SYFT_CHECK_FOR_APP_UPDATE=false`).
  - To scan offline, import a database fetched beforehand (`grype db import`), and turn off `db.auto-update` (`GRYPE_DB_AUTO_UPDATE=false`).
  - Syft's `--enrich` queries online sources: don't use it on a confidential project.
- **Images:** scanning an image by name pulls it, unless it's already local or given as an archive.
- **Help over this file:** run `grype --help` and `syft --help` once per session; they win over this file.
