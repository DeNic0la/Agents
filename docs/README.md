# Documentation

This repo is a product. Its code is Markdown instructions for AI agents and the scripts that install them; these docs say what the product is meant to be and how it's meant to work. The [README](../README.md) is the user manual: commands, setup, update. [REQUIREMENTS.md](../REQUIREMENTS.md) lists what the code must do, one testable row each.

| Read | When you want to |
|---|---|
| [vision.md](vision.md) | know what this project is for, who uses it, and the principles every change must keep |
| [model.md](model.md) | understand how the preset reaches machines and repositories: core and instances, tailoring levels, storage, checkout roles, environments |
| [development-workflow.md](development-workflow.md) | know how this repo is meant to be developed: issues as the backlog, cloud agents, Definition of Ready and Done, who may merge what |
| [decisions/](decisions/) | know why something is the way it is: one record per decision, with what was rejected |
| [specs/](specs/) | build the next planned change; each spec is the input for one task |

Agents changing this repo read `vision.md` and `model.md` before changing how items are installed, copied or tailored, and add a decision record when they make a decision with alternatives.

## Glossary

| Term | Meaning |
|---|---|
| Preset | Everything under `preset/`: skills, subagents (personas), commands, references, concepts, hooks. Tool-neutral. |
| Item | One preset entry a repository can select, such as `skills/tdd` or `agents/developer.md`. |
| Kind | Skills, personas, commands, references, concepts, hooks. The README calls these the six "layers" of the preset; they are not tailoring levels. |
| Core | The tracked, versioned part of an item, in this repo: what is always true, plus the recipe for tailoring it. |
| Recipe | `GENERATE.md` next to a core item: what to inspect in a repository and what to write for it. |
| Instance | What a specific project or checkout adds to a core item. Regenerable from the core and its recipe. |
| Level | Where an instance's content applies: core, project or checkout. Levels are combined into the file a tool reads. |
| Project | One codebase, whatever number of clones it has, under a name chosen at setup. |
| Checkout | One clone or worktree of a project on one machine. |
| Role | What a checkout is used for (for example integration, reference, development), inferred from how it's used. |
| Environment | A kind of machine (for example `work`) whose tool files differ from the defaults. |
| Dispatcher | The program without AI that turns GitHub events and a schedule into cloud agent sessions and enforces the workflow's gates and limits. |
| Route | How much refinement an issue gets before it's built: direct, lean or full. Chosen by the triage agent. |
| Merge class | Who may merge a change: the implementing agent, a review agent or the owner. Set by risk. |
