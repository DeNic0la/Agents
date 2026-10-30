---
name: dependency-vetting
description: Use whenever a task would install, add, upgrade or recommend a package or tool - a project dependency, a CLI tool, or anything from npm, PyPI, crates.io, Go modules, RubyGems, Homebrew or another registry. Also use when a registry page, install command or installed artifact looks inconsistent with the project that supposedly publishes it. Verifies the package is authentic and current first.
license: MIT
---

# Dependency vetting

> **Repo version first:** if this repository has `.agents/skills/dependency-vetting/SKILL.md`, follow that file instead of this one. It's tailored to the repository.

**The rule:** never install, add or recommend a package until you've opened the upstream project's own repository or docs and used the install command or import path published there.

## Direction of trust

Follow the link **from the upstream project to the install command**. Never the other way, from a search result or a registry page back to a project.

Treat unverified registry metadata as claims made by the publisher: author, email, homepage, repository link, README and license. Where the registry independently verifies a field or attestation, check what that verification proves and compare the verified identity with the upstream project you meant. Still open the upstream repository or docs and confirm the published install instructions.

If upstream documents no registry install, there is no registry package, whatever the registry shows. Stop and say so. Don't install it, don't pin around it, and don't quietly swap in an alternative. Pinning untrusted code to a SHA is the same code with better bookkeeping, not a fix.

## Registry signals worth using

Use the registry's own independent signal where one exists:

| Registry | Signal |
|---|---|
| npm | `npm audit signatures` |
| PyPI | "Verified details" plus PEP 740 attestations |
| GitHub release binaries | `gh attestation verify` |
| crates.io, Go modules, most others | checksum only, so the upstream link carries all the weight |

Download counts, stars and search ranking aren't evidence of authenticity.

## Stop signals

Any mismatch between the installed artifact and the upstream docs is a stop signal: a different executable name, version, file set or dependency list. Confirm with the user. Never write it off as a quirk and move on.

## Keep it proportionate

A tool a project really publishes passes these checks in seconds. So this costs nothing in the normal case and fires only when something is actually wrong. Don't turn it into pin-everything ceremony.

Separately: don't add or suggest outdated dependencies. Check the current release before pinning a version.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "It has millions of downloads" | Typosquats and hijacked packages get downloads too. Popularity isn't authenticity. |
| "The registry page links to the right GitHub repo" | That link is a claim by the publisher. Start from the repo and follow it to the registry. |
| "I'll pin it to a hash, so it's safe" | A pinned malicious package is still malicious. |
| "The executable name is a bit different, probably a rename" | A mismatch is a stop signal. Ask the user. |
