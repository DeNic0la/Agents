# Research synthesis methods

## Thematic analysis

1. **Familiarize:** read everything before coding anything.
2. **Code:** tag each observation, quote or data point with descriptive codes. Be generous; merging is easier than splitting.
3. **Develop themes:** group related codes into candidate themes that matter for the research question.
4. **Review:** enough evidence per theme? Distinct from each other? A coherent story?
5. **Refine:** name each theme and describe it in 1-2 sentences.
6. **Report** themes as findings with evidence.

## Affinity mapping

1. One observation per note.
2. Cluster by similarity. Let categories emerge; don't predefine them.
3. Label each cluster with its common thread.
4. Group clusters into higher levels if patterns emerge.
5. Read the themes off the clusters and their relationships.

Move notes freely; the first grouping is rarely best. Split a cluster that grows too big. Don't force outliers in.

## Triangulation

- **Method:** same question, different methods (interviews, survey, analytics).
- **Source:** same method, different participants or segments.
- **Time:** same observation at different times.

Findings backed by several sources and methods are much stronger. Disagreement between sources may reveal different segments or contexts.

## Interview notes

Per interview:

- **Observations:** separate behaviors (what they do) from attitudes (what they think). Note when, where, with whom, how often. Flag workarounds.
- **Quotes:** specific and vivid, not generic. A quote is evidence; the finding is your interpretation of it.
- **Behavior vs. stated preference:** if someone asks for feature X but never uses similar features, note the contradiction. Look for revealed preferences.
- **Intensity:** emotional language (frustration, excitement, resignation), frequency, effort spent on workarounds, consequence when things go wrong.

Across interviews: which observations recur, how often, whether user types differ, where participants disagree (often a segment boundary), what challenged prior assumptions.

## Survey data

**Quantitative:**

- Check the response rate; a low one may bias the sample.
- Look at distributions, not just averages. A 3.5 average can mean lukewarm or half love it, half hate it.
- Segment responses; aggregates hide differences.
- Be cautious with small samples and small differences. A 0.1 NPS change is noise.
- Compare against benchmarks or earlier surveys.

**Open-ended:** code them like mini interviews, count themes, pull representative quotes. Themes that show up here but not in the structured questions are things you didn't think to ask.

**Mistakes:** ignoring non-response bias, treating Likert scales as interval data, reading causation into cross-tabs.

## Combining qualitative and quantitative

- Qualitative finds what and why and generates hypotheses. Quantitative measures how much and how many. Go back to qualitative to explain surprising numbers.
- Use numbers to prioritize qualitative themes, and interviews to explain anomalies.
- Present combined evidence: "47% of surveyed users report difficulty with X; interviews show it's because Y."
- When they disagree: check whether different populations were measured, whether stated preference differs from behavior, whether the survey question measured what you think. Report the disagreement; don't pick a side.

## Personas

Build them from behavior, not imagination or demographics.

1. Find clusters of similar behaviors, goals and contexts.
2. Name the variables that separate clusters (company size, skill, usage frequency, main use case).
3. Write a profile per cluster.
4. Size each with quantitative data if you can.

```
[Persona name]: [One-line description]

Who they are: role, company type and size, experience; how they started using the product.
What they're trying to accomplish: main goals and jobs; how they measure success.
How they use the product: frequency and depth, key workflows, tools used alongside.
Key pain points: top 3 frustrations; workarounds.
What they value: what matters most; what would make them switch or churn.
Representative quotes: 2-3 verbatim.
```

3-5 personas is the sweet spot. Update them as the product and market change. A persona that changes no decision isn't useful.

## Opportunity sizing

Per opportunity, estimate addressable users, frequency (daily to one-time), severity (blocker, significant friction, minor annoyance), and effect on upgrades, retention or acquisition.

Score:

- **Impact** = users affected x frequency x severity
- **Evidence strength:** several sources beat one; behavior beats stated preference
- **Strategic alignment**
- **Feasibility:** technical, resources, time to impact

Show the math and assumptions: "About 2,000 users a month hit this, per ticket volume; interviews suggest 60% see it as a significant blocker." Use ranges ("1,500-2,500 a month"), not false precision. Rank opportunities against each other.
