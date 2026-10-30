---
name: kb-article
description: Use when a resolved support ticket is worth documenting for self-service, the same customer question keeps coming up, a workaround needs publishing, or a known issue should be communicated to customers. Drafts a searchable, publish-ready knowledge base article.
---

# KB article

Draft a publish-ready knowledge base article from a resolved support issue, a common question or a documented workaround, structured for search and self-service.

## 1. Understand the source material

Identify:

- **Problem:** the original issue, question or error.
- **Solution:** the resolution, workaround or answer.
- **Who it affects:** user type, plan, configuration.
- **How common:** one-off or recurring.
- **Article type:** how-to, troubleshooting, FAQ, known issue or reference.

If a ticket is referenced, pull the thread, resolution and internal notes from the support platform if connected. Check the knowledge base for a similar article (update vs. create new) and the project tracker for a related bug or feature request.

## 2. Draft

Read [references/article-templates.md](references/article-templates.md) for the template of the chosen type. Read [references/searchability-and-maintenance.md](references/searchability-and-maintenance.md) when writing the title and opening, choosing category and links, or deciding whether to update an existing article.

Every article has a searchable title in customer words, a 1-2 sentence overview of what it covers and for whom, the body, related articles, and metadata.

Formatting:

- H2/H3 headers; numbered lists for steps, bullets otherwise.
- **Bold** for UI elements and key terms; code blocks for commands, API calls, error messages and config values.
- Tables for comparisons and reference data; callouts for warnings and tips.
- Paragraphs of 2-4 sentences, one idea per section.

## 3. Present the draft

```
## KB article draft

**Title:** [Title]
**Type:** [How-to / Troubleshooting / FAQ / Known issue / Reference]
**Category:** [Product area or topic]
**Tags:** [Searchable tags]
**Audience:** [All users / Admins / Developers / Specific plan]

---

[Full article, from the type's template]

---

### Publishing notes
- **Source:** [Ticket, conversation or internal discussion]
- **Existing articles to update:** [Overlapping content]
- **Review needed from:** [SME or team, for technical accuracy]
- **Suggested review date:** [When to recheck accuracy]
```

## 4. Next steps

Offer to check the knowledge base for a similar article, adjust technical depth for another audience, write a companion article (a how-to for a troubleshooting guide), or an internal version with more technical detail. Publish to a connected knowledge base only after the user confirms.

## Rules

- Write for a frustrated customer searching for an answer: clear, direct, helpful.
- One problem, one solution. Split articles that grow.
- Test the steps, or check them against a recent resolution.
- A wrong article is worse than none. Date it and set a review date.
