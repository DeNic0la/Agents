# The candidates report

## File

Write a self-contained HTML file to the OS temp directory so nothing lands in the repo. Resolve the temp dir from `$TMPDIR`, falling back to `/tmp` (or `%TEMP%` on Windows), and write `<tmpdir>/architecture-review-<timestamp>.html`, so each run gets a fresh file. Open it for the user (`xdg-open <path>` on Linux, `open <path>` on macOS, `start <path>` on Windows) and tell them the absolute path.

## Visuals

Use **Tailwind via CDN** for layout and styling, and **Mermaid via CDN** where a graph, flow or sequence reliably shows the structure. Mix Mermaid with hand-made CSS or SVG: Mermaid when relationships are graph-shaped (call graphs, dependencies, sequences), hand-built divs or SVG for something more editorial (mass diagrams, cross-sections, collapse animations). Be visual.

Open with the **verdict** (Localized or Systemic), the scope and the symptoms that justify it.

## One card per candidate

- **Cluster:** the modules and concepts involved, with their files.
- **Problem:** the friction, named with `codebase-design` red flags, and the symptom it causes (change amplification, cognitive load, unknown unknowns).
- **Single responsibility:** one sentence saying what the deepened module does, with no "and".
- **What it owns:** the logic that moves inside the interface.
- **What stays out:** related logic that stays separate, and why.
- **Why they're coupled:** shared types, call patterns, co-ownership of a concept.
- **Dependency category:** which of the four in the `codebase-design` deepening reference applies.
- **Solution:** in plain English, what would change.
- **Benefits:** in terms of locality and leverage, and how the tests improve.
- **Test impact:** which existing tests would be replaced by tests at the new interface.
- **Before / after diagram:** side by side, drawn for this candidate, showing the shallowness and the deepening.
- **Recommendation strength:** `Strong`, `Worth exploring` or `Speculative`, rendered as a badge.

**ADR conflicts:** mark a candidate that contradicts an ADR with a warning callout, for example _"contradicts ADR-0007, but worth reopening because…"_.

## Close

End with a **Top recommendation** section: the candidate you'd tackle first and why.
