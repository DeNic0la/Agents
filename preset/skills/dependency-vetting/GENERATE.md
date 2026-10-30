---
description: Recipe for a version of the dependency-vetting skill tailored to this repository.
---

# dependency-vetting (recipe)

Generate `.agents/skills/dependency-vetting/`: a version of the dependency-vetting skill that knows this repository's ecosystems, registries and dependency policy.

## Generate

1. **Inspect the project.**
   - The package managers and manifests in use (`package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `pom.xml`, `Gemfile`, ...), and their lockfiles.
   - Private or mirrored registries (`.npmrc`, `pip.conf`, Maven settings), and which scopes or groups must come from them. A public package with the same name as a private one is a dependency-confusion stop signal.
   - Existing dependency policy: allowlists, license rules, Renovate or Dependabot config, audit commands in CI.
   - The verification commands that work for these ecosystems (`npm audit signatures`, `gh attestation verify`, checksum files).
2. **Write `SKILL.md`** with frontmatter `name: dependency-vetting` and a `description` that leads with when to use it (before installing, adding, upgrading or recommending a package). Use spec fields only and no runtime controls; see the portable-skills concept. Leave out the "Repo version first" notice. Keep the global rule, the direction of trust, the stop signals and the proportionality section. Narrow the registry table to this repo's ecosystems and add its private registries and policy.
3. **Keep it small.** `SKILL.md` stays under about 60 lines, with no placeholders.
4. **Finish.** Show the skill to the user for approval, run `agents sync` so Claude Code gets its copy, and commit it.
