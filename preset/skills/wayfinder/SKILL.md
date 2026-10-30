---
name: wayfinder
description: Plan a huge chunk of work (more than one agent session can hold) as a shared map of decision tickets on your issue tracker, and resolve them one at a time until the way to the destination is clear.
license: MIT
---

# Wayfinder

> **Repo version first:** if this repository has `.agents/skills/wayfinder/SKILL.md`, follow that file instead of this one. It's tailored to the repository.

A loose idea has arrived, too big for one agent session, and wrapped in fog: the way from here to the **destination** isn't visible yet. Wayfinding is about finding that way, not charging at the destination. This skill charts the way as a **shared map** on the repo's issue tracker, then works its **decision tickets** (questions whose resolution is a decision, not slices of a build to execute) one at a time until the route is clear.

The destination varies per effort, and naming it is the first act of charting: it shapes every ticket. It might be a spec to hand off and iterate on, a decision to lock before planning starts, or a change made in place like a data-structure migration. The map is domain-agnostic: engineering work, course content, whatever fits the shape.

## Supporting files

- [references/map-format.md](references/map-format.md): read before creating or editing a map or ticket, and whenever you decide whether something is a ticket, fog or out of scope. It holds the map body and ticket templates, claiming, blocking and the frontier, fog of war, and out of scope.

## Plan, don't do

Wayfinder is **planning** by default: each ticket resolves a decision, and the map is done when the way is clear and the first working version can be built. Decisions that only matter once it runs belong to the implementation, not the map. The pull to just do the work is usually the signal you've reached the edge of the map and it's time to hand off. An effort can override this in its **Notes**, carrying execution into the map itself, but absent that, produce decisions, not deliverables.

## Asking questions

Ask every user question the way the `grilling` skill does: numbered, with your recommended answer, in the main conversation. That covers naming the destination, the smallest-version check, the challenge pick and the clear-route handoff. Subagents return facts or candidate answers to the main conversation; they never ask the user themselves. Record a human decision, or resolve a HITL ticket, only after the user has answered.

## Refer by name

Every map and ticket is an issue, so it has a **name**: its title. In everything the human reads (narration, the map's Decisions-so-far), refer to it by that name, never by a bare id, number, or slug. A wall of `#42, #43, #44` is illegible; names read at a glance. The id and URL don't vanish; a name wraps its link, but they ride _inside_ the name, never stand in for it.

## The tracker

The map is a single issue on this repo's issue tracker, labelled `wayfinder:map`, the canonical artifact. Its tickets are child issues of the map. The map is an **index**, not a store: a decision lives in exactly one place, its ticket, so the map only gists it and links.

**Where the map, its child tickets, blocking, and frontier queries physically live is tracker-specific.** Follow `.agents/issue-tracker.md`, especially its "Wayfinding operations" section. If that file doesn't exist, generate it first with the issue-tracker recipe: `.agents/references/issue-tracker.md` in the project, else `~/.agents/references/issue-tracker.md`. With no hosted tracker, the recipe's local Markdown tracker is the default.

## Ticket Types

Every ticket is either **HITL** (human in the loop, worked _with_ a human who speaks for themselves) or **AFK**, driven by the agent alone. A HITL ticket only resolves through that live exchange; the agent never stands in for the human's side of it (a grilling agent that answers its own questions has broken this).

- **Research** (AFK): Reading documentation, third-party APIs, or local resources like knowledge bases to surface a fact a decision waits on. Resolved by a subagent with a fresh context window that uses the `research` skill: primary sources, cited findings. Use when knowledge outside the current working directory is required.
- **Prototype** (HITL): Raise the fidelity of the discussion by making a cheap, rough, throwaway artifact to react to. For a logic or UI question, use the `prototype` skill; make any other artifact (an outline, a rough take, a stub) yourself. In planning mode, skip the prototype skill's fold-into-real-code step: keep the throwaway artifact, record the decision, and leave the implementation for after the handoff. Links the prototype as an asset. Use when "how should it look" or "how should it behave" is the key question.
- **Grilling** (HITL): Conversation. The default case. Always use the `grilling` and `domain-modeling` skills together.
- **Task** (HITL or AFK): Manual work that must happen before a _decision_ can be made: nothing to decide, prototype, or research, but the discussion is blocked until it's done. Signing up for a service so its API can be judged, provisioning access, moving data so its shape can be seen. This is the one type that _does_ rather than decides, and it earns its place by unblocking a decision, not by delivering the destination. The agent drives it alone where it can (AFK); otherwise it hands the human a precise checklist (HITL). Resolved when the work is done; the answer records what was done and any resulting facts (credentials location, new URLs, row counts) later tickets depend on.

## Invocation

Two modes. Either way, **never resolve more than one ticket per session**, with the exception of research tickets.

### Chart the map

User invokes with a loose idea.

1. **Name the destination.** Use the `grilling` and `domain-modeling` skills together to pin down what this map is finding its way to: the spec, decision, or change. The destination fixes the scope, so it's settled first.
2. **Name the smallest version.** State the smallest thing that delivers the destination's goal, often an existing tool plus a prompt or a doc. Ask the user whether building it first would teach more than planning it. If it would, stop: the effort starts as that build, not as a map.
3. **Map the frontier.** Grill again, **breadth-first** this time: fan out across the whole space rather than deep on any one thread, surfacing the open decisions and the first steps takeable now. **If this surfaces no fog** (the way to the destination is already clear, the whole journey small enough for one session), you don't need a map. Stop and ask the user how they'd like to proceed.
4. **Create the map** (label `wayfinder:map`): Destination and Notes filled in, Decisions-so-far empty, the fog sketched into **Not yet specified**.
5. **Create the tickets you can specify now** as child issues of the map, then wire blocking edges in a **second pass** (issues need ids before they can reference each other). Write cross-references in that pass too, with real ids: a placeholder `#<n>` auto-links to an unrelated issue. Wiring sorts them into the frontier and the blocked; everything you can't yet specify stays in the fog: the **Not yet specified** section.
6. **Fire the research subagents.** Claim only the unblocked, unclaimed `research` tickets on the frontier; leave blocked ones and recheck the frontier after each resolution. For each, spin up a subagent with a fresh context window, each in its own git worktree, to resolve it in parallel, capturing its findings on a throwaway `research/<name>` branch with a context pointer from the ticket. Push the branch but open no PR: it is never merged. As each subagent reports back, record its resolution from this session's own checkout, not the subagent's worktree.
7. Stop: charting is one session's work; it hand-resolves nothing.

### Work through the map

User invokes with a map (URL or number). A ticket is **optional**: without one, you pick the next decision, not the user.

1. Load the **map**: the low-res view, not every ticket body.
2. Choose the ticket. If the user named one, use it. Otherwise take the first frontier ticket in order. **Claim it**: assign it to yourself before any work.
3. Resolve it as the type its `wayfinder:<type>` label names (see [Ticket Types](#ticket-types)). Read the label, not just the body: the body never states the type. **Zoom as needed**: fetch the full body of any related or closed ticket on demand. Use whichever skills the `## Notes` block names; use a conditional one as soon as the work first meets its condition, even mid-resolution. If in doubt, use the `grilling` and `domain-modeling` skills.
4. **Challenge the answer.** Once the grilling frontier is empty, and before asking the user to confirm anything, give a subagent the drafted answer and the map's Destination, and tell it to argue for the smallest answer that still reaches the destination. Put the drafted answer and any smaller one it found to the user in one question. Their pick is the shared understanding grilling waits for. Change no file before it.
5. Record the resolution: post the answer as a **resolution comment**, **close** the issue, **append a context pointer** to the map's Decisions-so-far, and add what the answer adds to **Added so far**. The pointer is one sentence of at most 30 words after the link: the decision alone. Reasons, rejected options and changed text go in the resolution comment, never in the map. Commit the repository files the resolution changed (such as the glossary or an ADR), and only those, in one commit named after the ticket, without asking first.
6. **Prune.** Close every open ticket and clear every **Not yet specified** patch this answer made unneeded, each with an **Out of scope** line saying why.
7. Add newly-surfaced tickets (create-then-wire); graduate any fog the answer has made specifiable, clearing each graduated patch from **Not yet specified** so it lives only as its new ticket. If the answer reveals that a ticket (this one or another) sits beyond the destination, **rule it out of scope** rather than resolving it on the route. If the decision invalidates other parts of the map, update or delete those tickets.
8. **Hand off when the way is clear.** When no open tickets remain and **Not yet specified** is empty, the map is done. When the destination is something to build, tell the user to use the `to-spec` skill on the map, which collapses its decisions into a buildable spec; otherwise tell them the destination is reached.

The user may run unblocked tickets in parallel, so expect other sessions to be editing the tracker concurrently.
