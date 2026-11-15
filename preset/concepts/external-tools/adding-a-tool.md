# Adding a tool

## Check first

- **Source:** the official repository or homepage, not a mirror or a blog post. Read its README and install docs, not your memory of them.
- **Maintained:** a release or commit within the last year.
- **License:** note it. Flag anything that isn't open source.
- **Install:** at least one method that needs no admin rights. Note the runtime it needs (Python 3.10+, Node 20+, ...).
- **Reach:** what it touches: network, other people's data, credentials, files outside its output folder. This becomes the "Limits" section.

## File format

One file per tool, `<tool-name>.md`, next to `CONCEPT.md`. Keep it under about 80 lines; link to the tool's docs for the rest.

```markdown
# <tool name>

<One or two sentences: what it does.> Homepage: <URL>. License: <license>.

## Use when

- <the tasks it's for, as a reader scanning for a match would phrase them>

## Install

Check: `<command that prints the version>`

1. <preferred method, no admin rights>
2. <next method>
3. ...

<Runtime requirements and optional extras.>

## Run

<The common invocations, with the flags that matter and their defaults.>

## Limits

- <when it may run, what it reaches, where its output goes>
```

Then add the tool's row to the table in `CONCEPT.md` and to its "Supporting files" list.
