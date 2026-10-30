# Roadmap frameworks

## Formats

- **Now / Next / Later:** Now is committed work with high confidence (current sprint or month). Next is planned and scoped, less sure of timing (1-3 months). Later is directional bets with flexible scope and timing (3-6+ months). Fits most teams most of the time, and avoids false precision with leadership and outsiders.
- **Quarterly themes:** 2-3 strategic themes per quarter (e.g. "Enterprise readiness", "Activation"), each mapped to OKRs, initiatives listed under each. Explains why you build what you build.
- **OKR-aligned:** under each key result, the initiatives meant to move it and their expected impact. Ties every initiative to a measurable "why".
- **Timeline / Gantt:** start and end dates, parallelism, sequencing, dependencies, resource conflicts. For execution planning with engineering only; externally it creates false expectations of precision.

## Prioritization

- **RICE = (Reach x Impact x Confidence) / Effort.** Reach in concrete numbers per period ("500 users per quarter"). Impact 3 massive, 2 high, 1 medium, 0.5 low, 0.25 minimal. Confidence 100% data-backed, 80% some evidence, 50% gut feel. Effort in person-months across all functions. Quantitative and defensible for large backlogs; weak for strategic bets with unknowable impact.
- **MoSCoW:** Must (failure without it), Should (important, but viable without), Could (only if capacity allows), Won't (explicitly out this period; list them). Good for scoping a release and negotiating with stakeholders.
- **ICE = Impact x Confidence x Ease,** each 1-10. Quick, for early products or when there's not enough data for RICE.
- **Value vs. effort 2x2:** quick wins (high value, low effort) first; big bets (high, high) planned carefully; fill-ins (low, low) with spare capacity; money pits (low value, high effort) removed. Good for building shared understanding in a session.

## Dependencies

**Kinds:** technical (B needs A's infrastructure), team (design, platform, data), external (vendor, partner), knowledge (research needed first), sequential (A must ship before B).

**Managing them:** list each explicitly with an owner and a "need by" date. Add buffer; they're the riskiest items. Flag cross-team ones early. Have a contingency for a slip.

**Reducing them:** build a simpler version that avoids it, parallelize with an interface contract or mock, resequence to resolve it earlier, or absorb the work into your team.

## Capacity

- Start from engineers x time. Subtract meetings, on-call, interviews, holidays, PTO. Engineers typically spend 60-70% of their time on planned feature work. Account for ramp-up of new members.
- Healthy default split: 70% planned features, 20% technical health (debt, reliability, performance, developer experience), 10% unplanned buffer. New product: more features. Mature product or post-incident: more reliability. Rapid growth: more scalability.
- Better to commit to fewer things and deliver reliably than to overcommit.

## Communicating a change

**Common triggers:** new leadership priority, research or feedback, a technical discovery that changes estimates, a dependency slip, a team change, a competitor move.

1. State what's changing and why, directly.
2. Name the new information behind it.
3. Show the tradeoff: what was deprioritized or slips.
4. Show the updated roadmap.
5. Name who is affected. Stakeholders expecting a deprioritized item hear it directly.

**Avoid whiplash:** set a threshold for change; batch updates at monthly or quarterly cadence unless urgent; separate strategic reprioritization from normal scope adjustment; track how often the roadmap changes, since frequent changes can signal an unclear strategy.
