# Searchability, structure and maintenance

## Titles

| Good | Bad | Why |
|------|-----|-----|
| How to configure SSO with Okta | SSO Setup | Names the tool customers search for |
| Fix: Dashboard shows blank page | Dashboard Issue | Names the symptom |
| API rate limits and quotas | API Information | Uses the exact terms customers search |
| Error: 'Connection refused' when importing data | Import Problems | Contains the exact error message |

## Keywords

- Exact error messages; customers paste them into search.
- Customer language, not internal terms: "can't log in", not "authentication failure".
- Common synonyms: delete/remove, dashboard/home page, export/download.
- Alternate phrasings of the problem in the overview.
- Categories and tags that match how customers think about the product.

## Opening sentence

Restate the problem or task in plain language:

- How-to: "This guide shows you how to [do X]."
- Troubleshooting: "If you're seeing [symptom], this article explains how to fix it."
- FAQ: "[Question in the customer's words]? Here's the answer."
- Known issue: "Some users are experiencing [symptom]. Here's what we know and how to work around it."

## Categories

Mirror how customers think:

```
Getting started: account setup, first-time configuration, quick start
Features and how-tos: one group per feature area
Integrations: one group per integration, API reference
Troubleshooting: common errors, performance, known issues
Billing and account: plans and pricing, billing questions, account management
```

## Links

- Troubleshooting links to the how-to ("For setup, see How to configure X"), and the how-to back to troubleshooting for errors.
- FAQs link to the full walkthrough. Known issues link straight to the workaround.
- Use relative links inside the knowledge base; they survive restructuring.
- Avoid circular links unless both articles are real entry points.

## Update or create new

**Update** when the product changed, the article misses a detail, feedback shows a confusing section, or a better fix was found.

**Create** when a new feature needs docs, a resolved ticket shows a gap, an existing article covers too much and should be split, or another audience needs the same information explained differently.

## Lifecycle

Draft (needs review), published, needs update (product change, feedback, age), archived (kept for reference), retired (removed).

## Maintenance

| Activity | Frequency | Who |
|----------|-----------|-----|
| Review new articles | Before publishing | Peer, plus SME for technical content |
| Accuracy audit | Quarterly | Support team, top-traffic articles |
| Stale content check | Monthly | Flag articles not updated in 6+ months |
| Known issue status | Weekly | All open known issues |
| Analytics | Monthly | Low helpfulness ratings, high bounce rates |
| Gap analysis | Quarterly | Top ticket topics without an article |

Every ticket that could have been answered by an article is a content gap. Articles that get no traffic or don't reduce tickets get improved or retired.
