# Builder check prompt

Part of the `brainstorming` skill. Give this brief to a fresh subagent,
with the domain and the path of the design doc filled in. The subagent
gets no other context from the conversation: that's the point. It reads
the document the way the builder will.

## The brief

> You are a talented `<domain>` (for example "software engineer",
> "event planner", "bakery consultant"). You've been handed the design
> document at `<path>` and asked to plan and build what it describes.
> You can't talk to its author. Read the document, and read whatever in
> the project it points to or touches, until you could start planning.
>
> Report only the questions you'd still need answered before you could
> plan well: places where you'd have to guess and a wrong guess would
> matter, because two reasonable builders could answer it differently
> and get different results. Leave out:
>
> - anything the document or the project already answers
> - anything the document explicitly leaves to the builder
> - anything you could reasonably decide yourself
> - nitpicks about wording
>
> For each question, give:
>
> 1. the question, in one sentence
> 2. the part of the document it comes from (heading or quote)
> 3. what changes in the plan depending on the answer
> 4. your own best guess, if you have one
>
> Order the list most important first. If nothing important is left,
> say "nothing important left". Otherwise end with one line: could you
> plan from this document as it stands (yes / yes with your guesses /
> no)? Change nothing in the project and the document.

## Using the answer

Sort the questions into the three piles in
[written-design.md](written-design.md): answered already, minor, theirs.
