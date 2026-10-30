---
name: prototype
description: Use when the user wants to sanity-check whether a state model or piece of logic feels right, or explore what a UI should look like, before building it for real. Builds a throwaway prototype that answers one design question.
license: MIT
---

# Prototype

> **Repo version first:** if this repository has `.agents/skills/prototype/SKILL.md`, follow that file instead of this one. It's tailored to the repository.

A prototype is **throwaway code that answers a question**. The question decides the shape.

## Pick a Branch

Work out which question is being asked from the user's prompt or the surrounding code. If it's still ambiguous and the user is available, ask (a multiple-choice question where the host has one, else in chat):

- **"Does this logic or state model feel right?"** Read [references/logic.md](references/logic.md). Build one shareable HTML file (free-play buttons plus tabbed guided walkthroughs) that pushes the state model through cases that are hard to reason about on paper, and that a non-developer can drive.
- **"What should this look like?"** Read [references/ui.md](references/ui.md). Generate several radically different UI variations on one route, switchable with a URL search param and a floating bottom bar.

The two branches produce very different artifacts, so picking wrong wastes the whole prototype. If the question is genuinely ambiguous and the user isn't reachable, pick the branch that matches the surrounding code (a backend module: logic; a page or component: UI) and state the assumption at the top of the prototype.

## Rules for Both

1. **Throwaway from day one, and marked as such.** Put the prototype close to where it will be used, so the context is obvious, but name it so a casual reader sees it's a prototype. For UI routes, follow the project's routing convention; don't invent a new top-level structure.
2. **Trivial to run.** A UI prototype starts with one command from the project's task runner (`pnpm <name>`, `python <path>`). A logic demo is a single HTML file the user double-clicks.
3. **No persistence by default.** State lives in memory; persistence is what a prototype checks, not something it depends on. If the question involves a database, use a scratch database or a local file with a clear "PROTOTYPE, wipe me" name. For a logic demo opened from disk, probe `localStorage` with a guarded write and remove first, since file-URL support varies and can throw. When it's unavailable, show the limitation and offer JSON export and import instead.
4. **Skip the polish.** No tests, no error handling beyond what makes it run, no abstractions. The point is to learn fast.
5. **Surface the state.** After every action (logic) or variant switch (UI), show the full relevant state so the user sees what changed.
6. **Capture it when done.** Fold any validated decision into the real code. Then keep the prototype as a primary source: commit it to a throwaway `prototype/<name>` branch, not the main branch, push it when the repository has a remote, and leave a pointer to that branch on the issue that asked the question. With no issue yet, put the pointer in the handoff or the conversation, so the `to-spec` skill carries it into the spec. Record the answer too (the verdict and the question it settled) in the issue or a commit. The main branch keeps only the validated decision.
