# Doc types

What each type of doc must contain. Use only the parts the reader needs; skip a part when it would be empty.

## README

- What this is and why it exists, in two or three sentences
- Quick start: under five minutes to first success, with copy-pasteable commands and the expected output
- Configuration and usage
- How to run the tests
- How to contribute, or a link to the contributing guide

## API reference

- Each endpoint or function: purpose, parameters, request and response, with a real example
- Authentication
- Errors: codes, their meaning, and what the caller should do
- Rate limits and pagination, if they apply
- Client or SDK examples, if clients exist

## Runbook

- When to use it: the alert, symptom or task that sends someone here
- Prerequisites and the access needed
- Numbered steps, each with the command and how to tell it worked
- Rollback steps
- Escalation path: who to contact when the steps don't work

## Architecture doc

- Context and goals, including what is out of scope
- High-level design with a diagram (ASCII or Mermaid)
- Key decisions and trade-offs, linking the ADRs instead of repeating them
- Data flow and integration points

## Onboarding guide

- Environment setup, start to a working build
- The key systems and how they connect
- Common tasks with walkthroughs
- Who to ask for what
