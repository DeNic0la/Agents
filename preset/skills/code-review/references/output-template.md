# Output template

Read at step 7 of the code-review process. Print the review as its own message, also when another skill loaded this one, before anything else continues.

```markdown
## Code review: <branch or PR title>

**Fixed point:** <ref> (<merge-base sha>) · **Commits:** <n> · **Spec:** <path, issue or "none"> · **Reader:** <fresh subagent | this session (not independent)>
**Checks:** <command: pass/fail, or "could not run: why">

<one or two sentences: what the change does and its overall state>

## SP Spec
SP1 P1 · `path/file.ts:42` · `<quoted line>`
<what a user or caller sees> Spec: "<quoted spec line>". Fix: <one fix>.
Dropped: <what verification removed, with the reason>

## CO Correctness
...

## SE Security
...

## PE Performance
...

## ST Standards
...

## What looks good
- <short, specific observations; skip when there's nothing worth saying>

Verdict: <Not ready | Ready with fixes | Ready> - <SP1 P1, CO2 P0, ... | no findings>
```

Rules:

- An axis with no findings says "No findings." on one line. A skipped axis says why ("no spec available").
- Label a finding `unverified` when step 6 couldn't settle it.
- On a follow-up, list earlier findings with their disposition (`fixed in <sha>`, `declined by user`, `still open`) under their axis, keeping their codes.
- Nothing follows the verdict line.
