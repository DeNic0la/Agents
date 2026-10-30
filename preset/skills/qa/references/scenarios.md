# Writing scenarios

Read at step 2 of the qa process.

## A full pass covers

- every requirement in the request;
- every user-reachable path the diff changes that the request never names (a new flag, a reworded message, a moved button);
- the unhappy paths of each: invalid or empty input, cancel or interrupt midway, the same action twice, a first run with no saved state;
- data attacks on each new input: too small, too big and just right; each boundary and one past it; 0, 1 and many items; text with unicode, emoji, leading or trailing spaces, quotes, delimiters and a newline;
- create, read, update and delete on each record the change writes, following the data to every view that shows it and through a restart;
- a flow: the scenarios chained one after another with no reset between them, the way a user's session runs, entering and leaving each state the change adds;
- one existing flow that shares the changed code, to catch a regression next to the change.

On a follow-up, mark which scenarios are reruns and which carry forward earlier evidence.

## Never and always

Above the scenarios, list the change's invariants: what must never happen (data lost, a file left half-written, a secret in a log) and what must always hold (the terminal restored, old data still readable). Check them after every scenario, the unhappy ones most of all.

## A change meant to keep behavior

For a refactor, the expected result is the base build's screen.

- Export the base commit with `git archive <base> | tar -x -C "$DIR/base"` and build it there, with its own lockfile, a private dependency directory and its own caches.
- Don't use a `git worktree` for this: it shares `.git/hooks` with the main checkout, so a dependency install in it can run the old commit's `prepare` script and rewrite the main checkout's hooks.
- Before comparing, confirm the base renders its normal screen. A server that answers with a runner error is a blocked comparison; keep its startup output as evidence.
- Drive both builds with the same keys, from folders with the same name and the same seeded state, and diff the captures. Mask only what changes on every run, such as a clock.

The same exported base build answers "introduced or pre-existing?" for a fail.
