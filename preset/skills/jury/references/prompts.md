# Jury prompts and report

## Juror prompt (Step 4)

```text
You are one juror on a panel of <N>. The other jurors answer the same brief on their own, and you will not see their answers. Do not ask the user anything and do not change any file. You may read files and run read-only commands to check the facts in the brief.

Your lens: <lens>: <question the lens asks>. Use it to decide where to look. It does not decide your vote: vote for the option the evidence supports.

<brief>

Return only this block:
CHOICE: <one option label, or "none: <a better framing>">
CONFIDENCE: <0-100>
REASONS: <at most 3, each with the fact or path:line it rests on>
WOULD CHANGE MY MIND: <the one finding that would flip your choice>
RISKIEST ASSUMPTION: <the assumption your choice depends on most>
```

## Reviewer prompt (Step 5)

```text
You are one reviewer on a panel of <N>. Below are anonymous positions on the same brief, in random order. Do not ask the user anything and do not change any file.

<brief>

Fact checks by the foreman:
<claim>: <verified | contradicted | unverifiable>, <source>

<Position A: juror block>
<Position B: juror block>
...

Return only this block:
REVIEW: <for each position, its strongest point and its weakest point>
EVERYONE MISSED: <what no position considered>
CHOICE: <one option label, or "none: <a better framing>">
CONFIDENCE: <0-100>
CHANGED FROM MAJORITY BECAUSE: <if your choice differs from the most common choice above, the argument or checked fact that decided it; otherwise "none">
```

## Report (Step 7)

```markdown
## Verdict: <option, or "Reframe: <better framing>">

Confidence: <HIGH | MEDIUM | LOW>
Vote: blind <A 2, B 1>, review <A 3>. <what changed a vote and why, or "no change">

Why:
1. <reason, with its source>

Dissent: <the strongest case for the option that lost, in its best form>
Everyone missed: <from the reviews, or "review skipped: unanimous blind vote">
Riskiest assumption: <assumption>. Test: <the cheapest check>. If it fails: <the option the verdict flips to>.
First action: <one concrete step>

Panel: <N> seats, lenses <list>, models <the model or model family per seat, or "one model">. <drops and retries, if any>
```

When every seat ran on one model family, or the families are unknown, end the Panel line with: "Cross-family independence was not established, so the seats can share a blind spot."
