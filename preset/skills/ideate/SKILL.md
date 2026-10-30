---
name: ideate
description: Generate grounded ideas for what to build next in this project, critique every one, and rank the survivors in a Markdown file.
license: MIT
---

# Ideate

> **Repo version first:** if this repository has `.agents/skills/ideate/SKILL.md`, follow that file instead of this one. It's tailored to the repository.

Answer one question: **which ideas are worth building?** Generate many, critique all of them, and explain only the **survivors**. This skill ends when the user holds a ranked list. Picking one and shaping it is the job of the `grill-with-docs` skill.

**Which skill:** this one finds *what* to build, grounded in the project. To sharpen one idea the user already has into variations, use `idea-refine`. To take a chosen request to an approved design, use `brainstorming`.

Every idea carries a **basis**, evidence a reader can check. An idea without one is slop, however plausible it sounds. Tag each basis:

- `direct:` a line, file or issue you actually read, quoted with its `file:line`.
- `external:` named prior art or a known pattern, with its source.
- `reasoned:` a first-principles argument, written out in full.

## Process

### 1. Scope

The argument is the **focus**: a feature, a flow, a constraint, or nothing. Ideate at full ambition inside the focus; with no focus, the whole repo is the subject.

When there's no argument and no clear project in the working directory, ask one question with three options: a subject the user names, **Surprise me** (each frame picks the subject it finds most interesting), or **Cancel**. Leave solution direction, audience and success criteria to `grill-with-docs`.

Done when the subject is named or the user picked Surprise me.

### 2. Ground

Read `GLOSSARY.md`, the ADRs (`docs/adr/`) and the README. Then dispatch one fresh read-only subagent to map the subject: what exists, where it hurts, what changed recently (`git log`), open TODOs, and open issues in the tracker if `.agents/issue-tracker.md` says where they are. It returns a **grounding summary** of at most 150 lines, with `file:line` pointers for every claim. Without subagents, do this and the later generation and verification yourself, and report that there was no independent verifier.

Done when the grounding summary exists. If grounding fails (no repo, empty repo), say so and ideate from the user's description, with `reasoned:` and `external:` bases only.

### 3. Generate

Run four frame tasks as subagents, each with the same grounding summary and focus. Dispatch only as many as you can run at once and queue the rest; if capacity is unknown, run one at a time. A frame is a starting bias, not a fence: cross-frame ideas are welcome.

1. **Pain and friction:** what's slow, broken or annoying.
2. **Inversion, removal or automation:** flip a painful step, delete it, or automate it away.
3. **Assumption-breaking:** what's treated as fixed but is a choice; reframe one level up or sideways.
4. **Leverage and compounding:** moves that make many future moves cheaper.
5. **Cross-domain analogy:** how another field solves the same shape of problem. Push past the first analogy.
6. **Constraint-flipping:** take a constraint to its opposite or extreme (budget 10x or zero, one user or a million) and keep the design that falls out.

Frames 1, 2 and 4 get a task each; frames 3, 5 and 6 share the fourth, since all three invert givens. Give every task this charter:

> The user will pick one of these ideas to build, so an idea earns its place only if it could change what they do next. Your first few ideas are the obvious ones: treat them as warm-up. Return about 6 per frame, each with a title, a 2-4 sentence summary, a tagged basis, and one line on why it matters. A `direct:` basis quotes a line you read, never a guessed citation. Drop any idea you can't give a basis. Stay inside the focus.

Done when all four tasks have returned.

### 4. Merge

Dedupe into one list, then add up to five **combinations**: ideas from different frames that are stronger together. In Surprise me, combinations are the point, so give them more attention.

### 5. Verify

Dispatch one fresh subagent with only the grounding summary and the merged list, never the generation history. Its job is to **refute**: check that every `direct:` quote exists, every `external:` source says what's claimed, and every `reasoned:` argument holds. It returns a verdict per idea.

Then decide the final cut. Overrule a verdict only when evidence in context contradicts it, and say so. Every cut idea gets a one-line reason: vague, basis refuted, no basis, duplicate of a stronger idea, already done, cost over value, or outside the focus.

Rank the survivors by basis strength (`direct:` above `external:` above `reasoned:`, all else equal), expected value, leverage and size. Keep 5-7, or the count the user asked for. When fewer pass, report fewer.

Done when every merged idea is ranked or has a cut reason.

### 6. Write

Write `docs/ideation/YYYY-MM-DD-<topic>.md` (topic `open` when there's no focus), creating the folder if needed:

- **Subject:** the focus, and the grounding summary cut to its key points.
- **Ranked ideas:** for each survivor, the title, summary, basis, why it matters, size (S, M or L), and a **Take it further** prompt in a fenced block. A fresh session has no report and no grounding, so the prompt stands alone: it says it's for the `grill-with-docs` skill, then names the idea, its basis with the `file:line` pointers, and why it matters.
- **Cut:** a table of every cut idea and its reason.

### 7. Present

Print one line with the counts and the absolute path (`7 ranked, 31 cut → <path>`), then one line per survivor: `1. <title> · <basis type> · <size>`. Name the top pick in a sentence. Then stop: the user starts `grill-with-docs` and pastes the idea's **Take it further** prompt.

See [CREDITS.md](CREDITS.md) for where this method comes from.
