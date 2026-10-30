# Migration plan sections

Read at step 4 of the improve-file-structure process. Include every section, so another agent can carry out the plan without choosing a different layout.

1. **Problem and target:** scope, evidence, before/after tree, each directory's responsibility, and the placement rules for future files.
2. **Move map:** every source path and destination, including tests and resources. A directory-level row is enough only when every descendant keeps its relative path; list the exceptions. Note conflicts and case-only renames.
3. **Reference and contract updates:** importers and re-exports, manifests, aliases, discovery globs, resource paths, generated-file producers, packaging, CI, scripts and documentation. Name the external paths that are preserved and any approved compatibility mechanism. Flag dynamic references that need a runtime check.
4. **Migration sequence:** bounded steps, each keeping a move together with its caller and configuration updates. Separate independent clusters and leave unrelated work alone. Name any temporary forwarding files and how long they live. Never mix behavior refactors or test deletions into file moves.
5. **Verification:** the project's commands, their status before the migration, and the failure each one catches. Cover the affected tests, type check and build, runtime discovery and packaged entry points where they apply. Test assertions stay the same, and the same tests are discovered before and after. Add a focused behavior check only for a real uncovered path contract. Record failures that already exist and checks that can't run, rather than promising a green migration.

A directory-only smoke check is not proof that runtime behavior survived.
