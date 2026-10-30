# Runtime controls

Runtime controls change how a skill or command runs. They depend on one user's agent and workflow, so they're never shared defaults. The fields below are Claude Code conventions, and they work the same in `.claude/commands/*.md` and `.claude/skills/*/SKILL.md`.

| Field | Effect |
|---|---|
| `context: fork` | Runs the skill in an isolated subagent context instead of the active conversation. You get a clean, repeatable start, tokens are spent in the fork rather than the main session, and only the result comes back. |
| `agent` | Chooses the subagent type for the fork, e.g. `agent: Plan`. Defaults to `general-purpose`. |
| `allowed-tools` | **Pre-approves** tools; it doesn't restrict them. Listed tools run without a permission prompt for the turn that invokes the skill, and the grant clears on your next message. It's in the Agent Skills spec as experimental, but it's still a runtime control. |
| `disallowed-tools` | **Restricts** tools: it removes them from the pool while the skill is active, which least privilege needs for passive stages such as review or audit. It clears on your next message. It's not a spec field, so a published `SKILL.md` that contains it fails packaging. |
| `model` | Pins a model for the skill. |

## Opting in

Create an override file. Its top-level keys replace the same keys in that tool's copy of the skill; nested maps like `metadata` are replaced as a whole.

```yaml
# .agents/overrides/claude/code-review.yaml  (project)
# ~/.agents/overrides/claude/code-review.yaml (this machine)
context: fork
agent: Plan
disallowed-tools: Edit Write
```

For Codex, `.agents/overrides/codex/<skill>.yaml` is used as the skill's `agents/openai.yaml`, for example to change `policy.allow_implicit_invocation`.

Then run `agents update`, or `agents add <skill>` in a project, to rebuild that tool's copy. Override files belong to the user: `agents` reads them but never writes, moves or deletes them.

Copilot reads the same skill folders as Claude Code and Codex, so it has no separate override.
