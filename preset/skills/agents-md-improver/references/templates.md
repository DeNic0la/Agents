# Templates

Use only the sections that apply. Every placeholder in angle brackets gets replaced with real project content; a template left half-filled is a red flag.

## Sections

```markdown
## Commands

| Command | Description |
|---|---|
| `<install>` | install dependencies |
| `<dev>` | start the dev server |
| `<build>` | production build |
| `<test>` | run tests |
| `<lint>` | lint and format |
```

```markdown
## Architecture

<root>/
  <dir>/   # <purpose>
  <dir>/   # <purpose>
```

```markdown
## Key files

- `<path>` - <purpose>
```

```markdown
## Code style

- <project convention, not generic advice>
```

```markdown
## Environment

- `<VAR>` - <purpose>
- <setup step>
```

```markdown
## Testing

- `<test command>` - <what it covers>
- <testing convention>
```

```markdown
## Gotchas

- <non-obvious thing that causes problems>
- <ordering dependency or prerequisite>
```

```markdown
## Docs

- `<path>` - read when <situation>
```

## Project root (minimal)

```markdown
# <Project>

<One line: what it is.>

## Commands
<table>

## Architecture
<tree>

## Gotchas
- <gotcha>
```

## Package or module (nested file)

```markdown
# <Package>

<Purpose of this package.>

## Usage
<import or call example>

## Notes
- <what an agent working only here must know>
```

## Monorepo root

```markdown
# <Monorepo>

<Description.>

## Packages

| Package | Purpose | Path |
|---|---|---|
| `<name>` | <purpose> | `<path>` |

## Commands
<table>

## Cross-package patterns
- <shared pattern, generation or sync step>
```

## Alias file

A tool-specific file that should carry the same content contains only the import, for example a `CLAUDE.md` with the single line `@AGENTS.md`.
