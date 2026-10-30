# Asking about a finding

A finding ends fixed or asked. Ask the user when the fix would reverse something the spec asked for, when its cause lies outside this repository, or when you judge it not worth fixing (a one-caller helper, a local convention).

Shape each question so the user can answer with a code:

1. Open with the code it concerns (`file:line`) and what the choice changes.
2. List the options as O1, O2, ..., each with what it does and what it costs. When the reviewer proposed a fix, one option is that fix in the reviewer's own words.
3. End on the option you recommend and the reason that decides it.

Once the user answers, post each decision and its reason on the issue with the tracker's comment operation (`.agents/issue-tracker.md`). A later session (QA, refactor, ship) reads the issue, not this chat, and would otherwise ask again.
