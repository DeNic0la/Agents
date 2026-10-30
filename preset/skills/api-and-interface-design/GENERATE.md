---
description: Recipe for a version of the api-and-interface-design skill tailored to this repository.
---

# api-and-interface-design (recipe)

Generate `.agents/skills/api-and-interface-design/`: a version of the API and interface design skill that uses this repository's interface styles, error format, validation library and naming.

## Generate

1. **Inspect the project.**
   - Which interfaces it exposes: REST, GraphQL, RPC, library APIs, module boundaries, component props.
   - The language and type system.
   - The validation library, the existing error response shape, and how pagination and filtering work today.
   - Naming conventions in routes and fields.
   - Whether state-changing endpoints can be retried (payments, queues, webhooks).
   - Where the API documentation lives.
2. **Write `SKILL.md`** with frontmatter `name: api-and-interface-design` and a `description` that says what it does and when to use it. Use spec fields only and no runtime controls; see the portable-skills concept. Leave out the "Repo version first" notice. Sections:
   - **Overview** and **When to Use:** stable interfaces that are hard to misuse, applied to the interface kinds this repo actually has.
   - **Core principles:**
     - Hyrum's Law: every observable behavior becomes a contract
     - the one-version rule
     - contract first
     - one consistent error format: this repo's actual shape and status mapping
     - validate at boundaries: name the library and the boundaries, and treat third-party responses as untrusted
     - prefer addition over modification
     - predictable naming: this repo's conventions as a table
     - honouring idempotency keys, only if retried state changes exist
   - **Common Rationalizations**, **Red Flags** and a **Verification** checklist, kept to the items that apply here.
3. **Put details in supporting files** under `references/`, each with a "read when" line in `SKILL.md`. Write only the ones that apply, with examples in the repo's own language and style:
   - patterns for each interface style, e.g. REST resources, pagination, filtering, PATCH
   - type patterns, e.g. discriminated unions, input/output separation, branded IDs
   - idempotency: derive the key from the intent, claim it atomically with a unique constraint, guard the payload, handle in-flight duplicates deliberately, and set retention from the longest retry chain
4. **Keep it small.** `SKILL.md` stays under about 200 lines, with no placeholders.
5. **Finish.** Show the skill to the user for approval, run `agents sync` so Claude Code gets its copy, and commit it.
