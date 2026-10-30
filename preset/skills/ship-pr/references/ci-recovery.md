# CI recovery

Use this for a failed PR check, or a failed CI or deployment workflow triggered by a merge. It covers repository defects the run exposed even when the shipped diff didn't introduce them. Keep the repair limited to the observed failure, and stay within the user's scope and permissions.

## Budget and evidence

The original shipping operation and all its repair PRs share **two repair cycles** and **one transient rerun**.

- Start fresh counters only for a new shipping operation. When continuing one, restore the counters from the shipping record; find its path from the caller or the earlier session first. If the earlier attempts can't be established, stop and report that gap instead of assuming a fresh budget.
- A new commit, failure, PR, session or post-merge run doesn't reset the counters.
- Count a repair cycle before editing. It covers the fix, verification, push, CI and any resulting post-merge check.
- An unexpected local verification failure or a review finding sends you back to diagnosis and spends the next cycle before more edits. A deliberate red regression test is part of the current cycle.
- Keep each failed attempt's logs. Don't replace them with a later pass.

**Stop** when the budget is spent, the cause can't be established from the evidence, required access is missing, or the fix needs an open product decision. Report the failing run and step, the diagnosis and its uncertainty, the repairs tried, the commits checked, and the exact blocker. A protected approval is a blocker, never a reason to change access or bypass it.

## Diagnose and recover

1. **Diagnose.** Read the failed job logs and inspect the implicated source, workflow and environment. Record the run ID, attempt, commit and failing command. Tell a repository defect apart from a transient service or runner failure and from an access or approval problem. A red check alone isn't evidence of a transient failure.
2. **Transient failure.** Spend the transient rerun on the failed jobs of that exact run (`gh run rerun <run-id> --failed` for GitHub Actions). Wait for the new attempt to settle and record the result. If it fails again, diagnose the new evidence: repair an established defect within the remaining budget, otherwise stop. Never rerun assertion failures just to get green.
3. **Repository defect.** Spend the next repair cycle and make the smallest fix on the existing PR branch. For a PR that's already merged, use the post-merge procedure below first.
   - Pin the pre-fix commit. Where a regression test can prove the failure, reproduce it before the fix and verify it after.
   - Keep checks and protections effective: don't skip tests, loosen assertions, remove required checks or disable protections to get green. Correct a defective assertion only with independent evidence of the intended behavior, and with a check that still rejects the wrong behavior.
   - Pass the repository's required local checks and commit the fix with the normal hooks.
4. **Verify the fix.** Run the affected checks, QA the affected behavior, and have a fresh reviewer that didn't write the fix review it against the pre-fix commit, with the failure evidence and earlier reports in hand. Keep independent review even for a test-only fix. Carry forward earlier evidence only when its source, dependencies, configuration and environment are unchanged. Every verified finding or QA failure must be resolved within the remaining budget; verification grants no extra cycles.
5. **Push.** Once verification passes and no verified finding is open, push the checked repair commits with the normal hooks. Update the existing PR, or open the post-merge repair PR. Return to the CI gate and wait for all checks on the new head. An earlier head's green CI can't authorize this merge. On failure, return to diagnosis with the counters intact.

## Post-merge repair

The original PR stays merged and its issue stays closed. Keep that outcome apart from the recovery. Never rewrite the default branch or reuse the merged feature branch for a repair.

1. **Hold merges.** Record the failed merge SHA and tell the caller to hold further merges. Fetch the default branch and, with a clean worktree, create a `fix/ci-<failure>` branch from `origin/<default>`. Switch to it in the existing worktree. Record both branch names for later cleanup.
2. **Repair.** Make and verify the repair with the procedure above. Open a follow-up PR that links the original PR and the failed run and explains the failure. Use normal review, hooks, required checks and squash merge; never push directly to the default branch. A repair that needs another product decision or broader permissions stops with that blocker.
3. **Verify and release.** Verify the repair merge's CI and deployment workflows at its exact SHA. Keep the shared counters across any further repair PR. Release the merge hold only when those workflows succeed, or the configuration shows none applies. If the default branch moved on in the meantime, verify its current tip too before releasing the hold; superseded or cancelled runs don't count as passing. If the budget runs out or an external blocker remains, keep the hold and report the original merge and the unresolved recovery separately.
