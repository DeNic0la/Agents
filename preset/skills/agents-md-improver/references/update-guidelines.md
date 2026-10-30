# Update guidelines

Add only what helps future sessions. The file loads into every session, so every line must earn its place.

## Add

- **Commands and workflows discovered**, so the next session doesn't rediscover them:
  ```markdown
  - `npm run build:prod` - full production build
  - `npm run build:dev` - fast build, no minification
  ```
- **Gotchas and non-obvious patterns**, so the same debugging doesn't happen twice:
  ```markdown
  - Tests run sequentially (`--runInBand`): they share database state.
  - `yarn.lock` is authoritative; delete `node_modules` if dependencies mismatch.
  ```
- **Relationships the code doesn't show:** "The `auth` module needs `crypto` initialized first; import order in `src/bootstrap.ts` matters."
- **Testing approaches that work:** "API tests use `supertest` with the helper in `tests/setup.ts`; factories in `tests/factories/`, not inline mocks."
- **Configuration quirks:** "`NEXT_PUBLIC_*` variables are read at build time, not runtime."
- **Pointers** to existing docs, with when to read them: "Before changing the schema, read `docs/database.md`."

## Leave out

- What the code already says: "The `UserService` class handles user operations."
- Generic best practice: "Always write tests." "Use meaningful names."
- One-off fixes: "Fixed the login button in commit abc123."
- Long explanations. Not "JWT (JSON Web Tokens) are an open standard (RFC 7519) that…", but "Auth: JWT (HS256) in the `Authorization: Bearer` header."
- Content another instruction file already has.

## Diff format

For each change:

````markdown
### Update: ./AGENTS.md (section: Commands)

Why: the build commands weren't documented, so sessions had to read `package.json`.

```diff
 ## Architecture
 ...

+## Commands
+
+| Command | Purpose |
+|---|---|
+| `npm run dev` | dev server with hot reload |
+| `npm test` | test suite |
```
````

## Before applying

- [ ] Each addition is specific to this project.
- [ ] No generic advice, nothing obvious from the code.
- [ ] Commands were run or checked and work.
- [ ] Paths exist.
- [ ] It goes in the canonical file, not an alias.
- [ ] It is the shortest way to say it.
