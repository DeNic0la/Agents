# Out-of-scope file format

How to write a file in `.out-of-scope/`.

## Naming

Use a short, descriptive kebab-case name for the concept: `dark-mode.md`, `plugin-system.md`, `graphql-api.md`. Someone browsing the folder should know what was rejected without opening the file.

## Style

Write it like a short design document, not a database entry. Use paragraphs, code samples and examples, so the reasoning makes sense to someone seeing it for the first time.

## Writing the reason

The reason says why, not just "we don't want this". Good reasons point to:

- project scope or philosophy ("This project focuses on X; theming is a downstream concern")
- technical constraints ("Supporting this would require Y, which conflicts with our Z architecture")
- strategic decisions ("We chose A over B because ...")

Keep it durable. Temporary circumstances ("we're too busy right now") are deferrals, not rejections.

## Example

````markdown
# Dark Mode

This project does not support dark mode or user-facing theming.

## Why this is out of scope

The rendering pipeline assumes a single color palette defined in
`ThemeConfig`. Supporting multiple themes would require:

- A theme context provider wrapping the entire component tree
- Per-component theme-aware style resolution
- A persistence layer for user theme preferences

This is a significant architectural change that doesn't align with the
project's focus on content authoring. Theming is a concern for downstream
consumers who embed or redistribute the output.

```ts
// The current ThemeConfig interface is not designed for runtime switching:
interface ThemeConfig {
  colors: ColorPalette; // single palette, resolved at build time
  fonts: FontStack;
}
```

## Prior requests

- #42: "Add dark mode support"
- #87: "Night theme for accessibility"
- #134: "Dark theme option"
````
