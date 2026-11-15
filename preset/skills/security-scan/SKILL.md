---
name: security-scan
description: Scan a project for known vulnerabilities in dependencies, leaked secrets and image or IaC issues, then triage and propose fixes.
license: MIT
---

# Security scan

Runs a security scan of the current project, or of the path, image or scope named in the argument, and reports triaged findings. The rules are in the security-scanning concept (`~/.agents/concepts/security-scanning/CONCEPT.md`, or the project's `.agents/concepts/` copy); this skill is the entry point to them.

**Arguments:** a path, an image name, or a scope such as `deps`, `secrets`, `images`, `iac` or `history`. With none, scan everything the project has.

## Process

1. **Load the concept** and follow it for every step below. Open a scanner's file only when checking or running that scanner.
2. **Find the targets** in scope: lockfiles and manifests, Dockerfiles, compose files and images the project builds, IaC folders, and whether it's a git repository. List them, together with the scanner the concept assigns to each.
3. **Check the scanners.** For each missing one, name it with its install command and wait for the user's yes. Skip a target whose scanner the user declines, and say so in the report.
4. **Run** each scanner as its file says, with the output going to the OS temp folder. Run offline when the project is confidential.
5. **Triage** as the concept says.
6. **Report:**
   - the summary table, the triaged findings and the proposed fixes
   - the commands that were run, and what wasn't scanned and why
   - no secret values, ever
7. **Fix only after a yes,** finding by finding or as a group the user names. Re-scan the fixed targets, and report what's left.

Don't commit. The user commits with the `commit` or `ship-pr` skill.
