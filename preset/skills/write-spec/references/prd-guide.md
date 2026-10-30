# PRD guide

## Sections

**Problem statement:** the user problem in 2-3 sentences; who has it and how often; the cost of not solving it (user pain, business impact, competitive risk). Ground it in research, support data, metrics or customer feedback.

**Goals:** 3-5 measurable outcomes, each answering "how will we know this succeeded?" Separate user goals from business goals. Outcomes, not outputs: "reduce time to first value by 50%", not "build an onboarding wizard".

**Non-goals:** 3-5 adjacent things this version won't do, each with why (too little impact, too complex, separate initiative, premature). They prevent scope creep and set stakeholder expectations.

**Requirements:**

- **P0 must-have:** the minimum viable version. Test: if we cut it, does the feature still solve the core problem? If not, it's P0.
- **P1 nice-to-have:** improves the experience a lot, but the core works without it. Often a fast follow. Only things you're confident you'll build soon, not a wish list.
- **P2 future:** out of scope for v1, but design so it stays possible. Architectural insurance.

Each requirement: unambiguous expected behavior, acceptance criteria, technical considerations, dependencies on other teams or systems.

MoSCoW maps onto this: Must (P0), Should (P1), Could (include if time permits), Won't this time (non-goals).

**Open questions:** tag who answers (engineering, design, legal, data, a stakeholder) and whether it blocks starting.

**Timeline:** hard deadlines (contracts, events, compliance dates), dependencies on other teams' releases, phasing if it's too big for one release.

## User stories

"As a [user type], I want [capability] so that [benefit]."

- Specific user type ("enterprise admin", not "user").
- The capability says what they want to accomplish, not how.
- The benefit says why.
- Cover error states, empty states and boundaries, and every persona the feature serves.

Example:

- As a team admin, I want to configure SSO for my organization so that my team logs in with corporate credentials.
- As a team member, I want to be redirected to my company's SSO login so that I don't need a separate password.
- As a team admin, I want to see who logged in via SSO so that I can verify the rollout.

Good stories are INVEST: independent, negotiable, valuable to the user, estimable, small (fits a sprint), testable.

Mistakes: too vague ("the product should be faster"), prescribing UI ("I want a dropdown"), no benefit ("I want to click a button"), too large ("manage my team"), internal tasks posing as stories ("as engineering, we want to refactor the database").

## Acceptance criteria

Given/When/Then:

- Given the admin has configured SSO for the organization
- When a team member visits the login page
- Then they're redirected to the organization's SSO provider

Or a checklist:

- [ ] Admin can enter the SSO provider URL in organization settings
- [ ] Team members see "Log in with SSO" on the login page
- [ ] SSO login creates an account if none exists
- [ ] SSO login links to the existing account if the email matches
- [ ] Failed SSO attempts show a clear error

Cover the happy path, errors and edge cases, plus what must not happen. Specify behavior, not implementation. Each criterion is independently testable. Replace vague words ("fast", "intuitive") with concrete definitions.

## Success metrics

**Leading (days to weeks):** adoption rate, activation rate, task completion rate, time to complete, error rate, usage frequency.

**Lagging (weeks to months):** retention, revenue (upgrades, expansion), NPS or satisfaction, support ticket reduction, competitive win rate.

**Targets:** specific ("50% adoption within 30 days"), based on comparable features, benchmarks or an explicit hypothesis. Set a success threshold and a stretch target. Define the measurement (tool, query, window) and when you'll evaluate (1 week, 1 month, 1 quarter after launch).

## Scope control

Signs of scope creep: requirements added after approval, small additions piling up, "while we're at it" features nobody asked for, a launch date that keeps moving without re-scoping, stakeholders adding without removing.

Prevention: explicit non-goals; every addition comes with a removal or a timeline extension; clear v1 vs. v2; check everything against the problem statement; time-box investigations ("if we can't figure out X in 2 days, we cut it"); a parking lot for good out-of-scope ideas.
