---
description: Read before running workers or lanes in parallel: who owns each shared resource (databases, ports, caches, remote targets) and how each worker gets its own.
---

# Parallel resources

Worktrees isolate files, but a test, build, preview or deployment can still change shared state. The coordinator owns resource assignments for the run.

1. **Inspect before dispatch.** Look at the commands each worker will run. Record the owner and concrete identity of each conflicting resource: files, databases or schemas, listening ports, shared build output or mutable caches, and remote write targets. Read-only inputs can be shared. An unknown mutable target is unresolved, not independent.
2. **Give each worker distinct resources** using the project's existing configuration. Verify that the command actually uses those identities; a different worktree or environment-variable name alone is no proof. If isolation isn't available, serialize only the conflicting operation while unrelated work continues.
3. **Pass the assignment** and any wait condition with the task. A worker that discovers a new shared target reports it before using it; the coordinator updates ownership before allowing the operation. Keep assignments in the run's temporary state, not in project configuration committed for this run.
4. **Release ownership** only after the operation and its child processes have stopped using the resource. Parking a worker or receiving its final message is not enough. Keep the owner and the blocker recorded when exit or cleanup is unverified. Recheck ownership after a restart before reassigning it.

Integration and shipping slots still protect their own operations. They don't isolate databases or previews used before a merge.
