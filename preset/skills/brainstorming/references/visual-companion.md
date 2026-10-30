# Visual Companion

Part of the `brainstorming` skill: how to show mockups, diagrams, and
side-by-side options as a page in their browser. No server: each
mockup is one self-contained HTML file.

## Writing a page

1. **Resolve the temp dir.** `$TMPDIR`, falling back to `/tmp` on
   Linux and macOS; `%TEMP%` on Windows. Write to
   `<tmpdir>/brainstorm-<topic>-<question>.html`, named for the
   question (`brainstorm-bakery-layout.html`). Never overwrite a page:
   a revision gets a suffix (`-v2`, `-v3`), so earlier rounds stay
   viewable. Nothing goes in the repository.
2. **Make it self-contained.** Inline CSS. If you need more, load
   Tailwind and Mermaid from a CDN (`https://cdn.tailwindcss.com`,
   `https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js`) and
   nothing else. No build step, no local assets.
3. **Open it.** `xdg-open <path>` on Linux, `open <path>` on macOS,
   `start "" "<path>"` on Windows (in WSL, `explorer.exe "$(wslpath -w <path>)"`).
   Tell them the absolute path as well, in case it doesn't open.

## What goes on a page

- **One question per page.** The page title is the question you're
  asking with it ("Which layout makes today's bread easiest to find?",
  not "Pick one").
- **Mockups to react to:** realistic content from their project, not
  lorem ipsum. Use real images when the look depends on them. Match
  fidelity to the question: wireframes for layout, polish only for
  look-and-feel questions.
- **Side-by-side options:** two to four, labeled A, B, C, each with one
  line on what it trades off. Same size and same level of polish, so the
  layout doesn't pick for them.
- **Diagrams:** Mermaid for flows, sequences and graphs; plain
  boxes-and-arrows SVG or CSS when Mermaid would be clumsier.
- **Throwaway prototypes they can click:** plain HTML and a little
  inline JavaScript, clearly marked as throwaway.

## In the conversation

Keep the question itself in your text message, with the page path and a
one-line summary of what's on it ("Three layouts for the home page,
A-C"). Their answer comes back in the conversation, not on the page,
so labels let them answer in a word ("B, but with A's header").

When their reaction changes the current page, write a revised version
and settle it before moving to the next question. Update the design in
your playback as you go. When the conversation moves back to text-only
questions, just stop referring to the page; there's nothing to clean up.
