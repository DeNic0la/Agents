# 0006 Tailoring in levels: core, project, checkout

- **Status:** accepted, implemented (2026-11-16) (see [specs/tailoring-levels.md](../specs/tailoring-levels.md))

## Context

A tailored skill's recipe made the agent write a complete repository version, which then replaced the global skill. A later change to the core (a new safety rule, a new step) never reached existing repository versions. Subagents couldn't be tailored at all, although a role like a UI designer needs different specifics in a Java Swing client than in a containerized web app. Several clones of one codebase had nowhere to share what they have in common.

## Decision

- An instance is the core plus what a project and a checkout add. The agent generates only the specific parts; `agents sync` combines core, project level and checkout level into the files each tool reads, on every sync.
- Levels are additive; the more specific one wins on conflict. Removing or rewriting core text is a reviewed exception: three collected cases, agreement of an independent agent on another model or tool, evidence stored with the level, void when the core text changes. Safety rules are narrowed, never dropped.
- Subagents can have recipes and instances like skills.
- The project level lives in a machine-local store by default, shared by the project's clones on the machine; this repo is an opt-in store per project, for sharing across machines. The checkout level lives in the checkout. Projects get a neutral name at setup; the store is chosen once per project.
- Levels can carry tool settings (for example a write deny), not only instructions.
- Existing full-copy recipes keep working; each moves to the specifics format (`output: specifics` in the recipe's frontmatter) when it's next edited. No preset skill or subagent uses it yet; the tests use samples.
- What `agents` checks of a removal is mechanical: exactly one occurrence of the core text, at least three cases, an `agreed` verdict in the review line. The independence of the review is the agent's duty.

## Rejected

- **Full copies with a staleness warning:** every core change would need an agent run per skill per repository.
- **Instances that tell the agent to read the core at runtime:** an extra read per use, and subagents can't import files.
- **Named roles declared by the owner:** roles are inferred from usage instead, see [0007](0007-checkout-roles-are-inferred.md).
- **The project level in each checkout:** nothing would be shared between clones.

## Consequences

- Core changes reach every repository on the next update.
- The CLI, the portable-skills concept and the README change; the spec lists them.
- Environment-specific versions of preset skills remain open.
