# Plan stages

Each stage: who runs it, the brief to send, what to capture from the reply, and the judge's rubric. Send briefs as written plus the named values; send judges only the artifact, context and rubric. Each agent writes its own artifact and returns a short summary; reject a reply that pastes its work instead.

## 2a. Research — `researcher`

**Brief:** `Task file: <path>. Title: <title>. Write or update the research note and link it from the task file. Return only your summary.`

**Capture:** note path, created or updated, scratchpad path, source count, key recommendation.

**Judge** — artifact: the note. Context: "Research note for task <title>; evaluate coverage and reusability."

| Criterion | Weight | 1 → 5 |
|---|---|---|
| Resource coverage: docs and references gathered, libraries identified with recommendations | 0.30 | critical resources missing → comprehensive |
| Pattern relevance: applicable patterns, actionable recommendations | 0.25 | irrelevant → exact fit |
| Issue anticipation: pitfalls with solutions | 0.20 | none → comprehensive |
| Reusability: general enough for other tasks, no task-specific detail | 0.15 | too specific → highly reusable |
| Task integration: task file links the note | 0.10 | not linked → linked with clear pointers |

## 2b. Codebase analysis — `code-explorer`

**Brief:** `Task file: <path>. Title: <title>. Write the analysis file. Return only your summary.`

**Capture:** analysis path, scratchpad path, files to modify / create / delete, risk level, key integration points.

**Judge** — artifact: the analysis file. Context: "Codebase impact analysis for task <title>; evaluate accuracy and completeness."

| Criterion | Weight | 1 → 5 |
|---|---|---|
| File identification: all affected files with real paths, new versus modified distinguished | 0.35 | major files missing → complete |
| Interface documentation: key functions and types with signatures, changes clear | 0.25 | missing → complete |
| Integration points: identified with impact; similar patterns found | 0.25 | missing → comprehensive |
| Risk assessment: high-risk areas with mitigations | 0.15 | none → thorough |

## 2c. Business analysis — `business-analyst`

**Brief:** `Task file: <path>. Title: <title>. Run your full process and write the description and the acceptance criteria into the task file. Return only your summary.`

**Capture:** scratchpad path, scope defined, checklist counts by importance, regular checks, rubric criteria, test strategy applies, guidelines found. Re-dispatch if `# Description` or `## Acceptance Criteria` is missing.

**Judge** — artifact: the task file. Context: "Business analysis output: `# Description` with scope and user scenarios, and one `## Acceptance Criteria` section with the six sub-blocks (Checklist, Regular Checks, Rubric, Rubric Score Definitions, Test Strategy, Definition of Done) in the format of specs-workflow.md."

| Criterion | Weight | What a high score requires |
|---|---|---|
| Description clarity | 0.18 | what, why and who explained; value and constraints stated |
| Criteria quality | 0.22 | every checklist row a specific yes/no question with category, importance and a stable ID; business and technical mixed; Definition of Done derived from them |
| Scenario coverage | 0.12 | primary, alternative and error flows, each represented by a checklist item or test case |
| Scope definition | 0.09 | in and out of scope explicit; no implementation detail; no invented file paths |
| Rubric quality | 0.13 | task-specific criteria; weights sum to 1.0; every criterion has `score_2`, `score_4` and `contrast` anchors that are concrete excerpts differing on one thing; guidelines criterion present when guideline files exist |
| Coverage completeness | 0.13 | all six sub-blocks in order; real commands in Regular Checks; no orphan checklist items; no scoring configuration in the file |
| Test strategy | 0.13 | criticality, test matrix and cases grouped under existing `CK-n` headings; every testable item covered; a reason given if it doesn't apply |

## 3. Architecture synthesis — `software-architect`

**Brief:** `Task file: <path>. Research note: <path or none>. Analysis file: <path or none>. Write the Architecture Overview into the task file. Return only your summary.`

**Capture:** scratchpad path, sections added, number of decisions, components and contracts.

**Judge** — artifact: the task file. Context: "Architecture synthesis output: `## Architecture Overview` with solution strategy, key decisions and only the sections this task needs."

| Criterion | Weight | What a high score requires |
|---|---|---|
| Solution strategy | 0.30 | approach clear; decisions with reasoning; trade-offs stated |
| Reference integration | 0.20 | links and insights from the research note and analysis |
| Section relevance | 0.25 | only the sections this task needs, sized to its complexity |
| Expected changes | 0.25 | files to create and modify listed, consistent with the analysis |

## 4. Decomposition — `tech-lead`

**Brief:** `Task file: <path>. Agents you may assign: <list>. Assign each step's tier with these rules: <the Selection section of model-tiers.md>. Write the Implementation Process into the task file and one sub-task file per step. Return only your summary.`

**Capture:** scratchpad path, sub-task folder and files, steps, phases with reviewer tiers, critical path, peak parallel width (must be 1-5), agent and tier distribution, high-priority risks. Re-dispatch if the section or any listed sub-task file is missing.

**Judge** — artifacts: the task file and every file in the sub-task folder. Context: "Decomposition output in the format of specs-workflow.md. The task file holds only the execution directive, Parallelization Overview and Phase Overview; step bodies live in the sub-task files. Verification is per phase. Agents available: <list>."

| Criterion | Weight | What a high score requires |
|---|---|---|
| Step quality | 0.15 | all fields filled (`None` rather than omitted); clear goal, description and expected output; sensible size; each file reads standalone |
| Success criteria | 0.12 | verifiable criteria naming real paths and symbols; actionable subtasks; every step writes its tests |
| Risk coverage | 0.10 | step-specific blockers and risks with impact, likelihood and mitigation |
| Completeness | 0.15 | every component and expected change has a step; table and sub-task files match one to one; execution directive present; nothing extra in the task file |
| Dependency accuracy | 0.15 | no false or missing dependencies; files, table and diagram agree; dependencies resolve to the same or an earlier phase |
| Parallelization | 0.10 | independent steps marked parallel; diagram shows phase boundaries; peak width 1-5 |
| Agent and tier selection | 0.08 | agents fit each step's output and come from the list; tiers follow the rules, `deep` earned |
| Phase design | 0.15 | each phase ends in a working, verifiable state; reviewer tier never below the phase's highest implementation tier; sensible phase sizes; every criterion due at some phase; no thresholds in the file |
