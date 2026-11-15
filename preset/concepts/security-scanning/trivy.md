# Trivy

Scans IaC and configuration (Dockerfile, Kubernetes, Terraform, CloudFormation, Helm) for misconfigurations. It can also scan images, filesystems and repositories for vulnerabilities and secrets. Homepage: https://trivy.dev. License: Apache-2.0. Publisher: Aqua Security (`aquasecurity/trivy`).

## Supply chain: read before installing or updating

- **The incident:** Trivy's release pipeline was compromised in March 2026 (GHSA-69fq-xp46-6x23, CVE-2026-33634, Critical).
  - **v0.69.4** was malicious on every channel: GitHub Releases, GHCR, ECR Public, Docker Hub, deb/rpm and get.trivy.dev.
  - Docker Hub images **0.69.5 and 0.69.6** were malicious too.
  - The `trivy-action` tags below **0.35.0** and the `setup-trivy` tags below **0.2.6** were replaced with an infostealer.
  - The `aquasecurity/homebrew-trivy` tap was affected. The official Homebrew formula was not.
- **A second advisory:** GHSA-mcj4-mphf-j9ff (CVE-2026-55092), a path traversal through a crafted vulnerability database, affects every version below **0.71.1**.

So:

1. Use an exact version of **0.71.1 or later**, never `latest`. It was 0.76.2 in November 2026.
2. Verify the release's Sigstore signature before first use (cosign v3; add `--new-bundle-format` on cosign 2.4 or later):
   ```
   cosign verify-blob trivy_<v>_windows-64bit.zip --bundle trivy_<v>_windows-64bit.zip.sigstore.json \
     --certificate-oidc-issuer=https://token.actions.githubusercontent.com \
     --certificate-identity 'https://github.com/aquasecurity/trivy/.github/workflows/reusable-release.yaml@refs/tags/v<v>'
   ```
   For images, `cosign verify aquasec/trivy:<v>` with `--certificate-identity-regexp 'https://github\.com/aquasecurity/trivy/\.github/workflows/.+'` and the same issuer. Better still, pin the image by digest.
3. If verification fails or cosign isn't available, stop and tell the user. Don't fall back to an unverified download.
4. In CI, pin `trivy-action` (0.35.0 or later) and `setup-trivy` by full commit SHA, never by tag.
5. Before updating, check https://github.com/aquasecurity/trivy/security/advisories for anything newer.

## Use when

- scanning IaC or configuration files for misconfiguration (the concept's only Trivy job by default)
- the user asks for Trivy for images or filesystems

## Install

Check: `trivy --version`.

1. The release archive from https://github.com/aquasecurity/trivy/releases/tag/v<v> (`trivy_<v>_windows-64bit.zip`, `trivy_<v>_Linux-64bit.tar.gz`), verified as above, unpacked into a user bin folder.
2. Container, pinned by digest: `ghcr.io/aquasecurity/trivy` or `aquasec/trivy`.
3. Windows: `winget install --id AquaSecurity.Trivy -e --version <v>`. Aqua doesn't document this community manifest, so verify the installed binary against the release checksums.

## Run

- **IaC:** `trivy config <dir> -f json -o <temp>/trivy-config.json`.
- **Images or filesystems (on request):**
  - `trivy image <image>`, `trivy fs <dir>`.
  - `trivy fs` checks only `vuln,secret` by default; `--scanners vuln,secret,misconfig` adds IaC.
- **Flags:**
  - `-f`: `table`, `json`, `sarif`, `cyclonedx`. `-o` writes to a file.
  - `--severity HIGH,CRITICAL`.
- **Quiet:** `--skip-version-check --disable-telemetry`. Both are needed to stop calls to `check.trivy.dev`; pass them every run.
- **Offline:**
  - Pre-load the databases, then pass `--skip-db-update --skip-java-db-update`.
  - `--offline-scan` stops lookups of Java packages on Maven Central.

**Accepted risk:** `.trivyignore` in the scanned folder, one ID per line, with an expiry and a comment:

```
# Not deployed with this setting; review by the expiry date.
AVD-KSV-0014 exp:2027-02-15
```

## Limits

- **Network:** it downloads its vulnerability database, Java database and checks bundle as OCI images from `mirror.gcr.io` or `ghcr.io`. It also calls `check.trivy.dev` unless that's turned off.
- **Images:** scanning an image by name pulls it.
- **Help over this file:** run `trivy config --help` once per session; it wins over this file.
