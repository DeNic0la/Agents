# The Written Design

Part of the `brainstorming` skill: what the design doc covers, where it
goes, and the builder check.

## What it covers

Write a plain document a talented builder in the domain could plan
from without going back to your human partner. Cover:

- intent and the why
- goals, non-goals, anti-goals
- constraints
- approaches: the two or three ways you considered, what each trades
  off, which one they picked, and why
- the parts of the how they decided, as they decided them
- what's left to the builder

For a small change, the short design covers the same points in a line
or two each and goes straight to your human partner, without the
builder check.

## Where it goes

In a software repo, `docs/specs/YYYY-MM-DD-<topic>-design.md`,
committed. If the repo already keeps specs or design docs somewhere
else, use that location and naming instead. Otherwise, ask. Your human
partner's preferences override both.

## Builder check (for a project)

Dispatch a fresh subagent with the brief in
`builder-check-prompt.md` (linked from SKILL.md). When you tell your
human partner you're writing it up, say a reviewer will read it first
and you may come back once with a few questions. Don't hand over the
document until the check is back. Sort what the builder asks into three
piles:

- **Answered already** by the conversation or the project: put the answer
  in the document.
- **Minor:** a sensible builder could settle it without changing what gets
  built. Settle it yourself and mark it in the document as your call.
- **Theirs:** only your human partner can answer it, and the answer changes
  what gets built.

Bring the "theirs" pile in one message, most important first. Update the
document with their answers, then hand it over with a short list of the
calls you made so they can check those while reading. That's the only
round of questions the check produces. Without a subagent, read the
document as that builder yourself.
