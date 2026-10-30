---
description: Recipe for a version of the documentation skill tailored to this repository.
---

# documentation (recipe)

Generate `.agents/skills/documentation/`: a version of the documentation skill that knows where this repository's docs live, how they are built and which conventions they follow.

## Generate

1. **Inspect the project.**
   - Where docs live: `README.md`, `docs/`, a docs site (MkDocs, Docusaurus, Sphinx, ...), generated API docs (OpenAPI, Javadoc, TypeDoc), runbooks, wiki links.
   - How docs are built and checked: the build command, link checker, linter (markdownlint, Vale), doc tests.
   - The conventions in use: headings, tone, diagram format, how docs link to ADRs and `GLOSSARY.md`.
   - Which doc types this repo actually has or needs. A library needs no runbook; a service usually does.
   - Who reads them: users, operators, contributors, API consumers.
2. **Write `SKILL.md`** with frontmatter `name: documentation` and a `description` that leads with when to use it (writing or updating docs for people). Use spec fields only and no runtime controls; see the portable-skills concept. Leave out the "Repo version first" notice. Keep the global process (name the reader, pick the type, read what exists, read the code, write most useful first, verify, report) with this repo's doc locations and its build or check command in the verify step. Keep the "Not for" list.
3. **Write `references/doc-types.md`** with only the doc types this repo uses, each in the shape its existing docs follow.
4. **Keep it small.** `SKILL.md` stays under about 100 lines, with no placeholders.
5. **Finish.** Show the skill to the user for approval, run `agents sync` so Claude Code gets its copy, and commit it.
