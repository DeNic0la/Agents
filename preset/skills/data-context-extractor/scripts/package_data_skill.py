#!/usr/bin/env python3
"""
Validate a generated data-analyst skill and package it as a zip file.

Usage:
    python package_data_skill.py <path/to/skill-folder> [output-directory]

Example:
    python package_data_skill.py .agents/skills/acme-data-analyst
    python package_data_skill.py .agents/skills/acme-data-analyst dist

The zip is written to <output-directory>/<skill-name>.zip (default: the current
directory) and contains the skill folder itself as its top-level entry.
Nothing else is written, and no network access is used.

Validation follows the Agent Skills spec as this preset applies it:
frontmatter with spec fields only and no runtime controls, `name` equal to the
folder name, a description of at most 1024 characters, no unfilled
placeholders, and every reference file linked from SKILL.md.
"""

from __future__ import annotations

import re
import sys
import zipfile
from pathlib import Path

SPEC_FIELDS = {"name", "description", "license", "compatibility", "metadata"}
RUNTIME_CONTROLS = {"allowed-tools", "disallowed-tools", "context", "agent", "model", "effort"}
NAME_PATTERN = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
PLACEHOLDER_PATTERN = re.compile(r"\[[A-Z][A-Z0-9_]+\]")
SKIP_NAMES = {"__pycache__", ".DS_Store", "Thumbs.db"}


def read_frontmatter(text: str) -> list[str] | None:
    """Return the frontmatter lines, or None if SKILL.md has no frontmatter."""
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        return None
    for i in range(1, len(lines)):
        if lines[i].strip() == "---":
            return lines[1:i]
    return None


def top_level_fields(frontmatter: list[str]) -> dict[str, str]:
    """Map each top-level key to its value, joining indented continuation lines."""
    fields: dict[str, str] = {}
    current = None
    for line in frontmatter:
        match = re.match(r"^([A-Za-z0-9_-]+):\s*(.*)$", line)
        if match:
            current = match.group(1)
            fields[current] = match.group(2).strip()
        elif current and (line.startswith(" ") or line.startswith("\t")):
            fields[current] = (fields[current] + " " + line.strip()).strip()
    return fields


def clean_scalar(value: str) -> str:
    """Strip block indicators and surrounding quotes from a YAML scalar."""
    value = re.sub(r"^[>|][+-]?\s*", "", value).strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
        value = value[1:-1]
    return value


def included(file_path: Path, skill_path: Path) -> bool:
    """Skip hidden files and junk, judged relative to the skill folder."""
    parts = file_path.relative_to(skill_path).parts
    if any(part.startswith(".") for part in parts):
        return False
    return not any(part in SKIP_NAMES for part in parts)


def validate_skill(skill_path: Path) -> list[str]:
    """Return a list of problems; an empty list means the skill is valid."""
    problems: list[str] = []

    skill_md = skill_path / "SKILL.md"
    if not skill_md.exists():
        return ["Missing SKILL.md"]

    content = skill_md.read_text(encoding="utf-8")
    frontmatter = read_frontmatter(content)
    if frontmatter is None:
        return ["SKILL.md has no YAML frontmatter between '---' lines"]

    fields = top_level_fields(frontmatter)
    for key in fields:
        if key in RUNTIME_CONTROLS:
            problems.append(f"Runtime control '{key}' must not ship in SKILL.md; remove it")
        elif key not in SPEC_FIELDS:
            problems.append(f"Frontmatter key '{key}' is not a spec field ({', '.join(sorted(SPEC_FIELDS))})")

    name = clean_scalar(fields.get("name", ""))
    if not name:
        problems.append("Frontmatter is missing 'name'")
    else:
        if name != skill_path.name:
            problems.append(f"name '{name}' does not match the folder name '{skill_path.name}'")
        if len(name) > 64 or not NAME_PATTERN.match(name):
            problems.append(f"name '{name}' must be 1-64 lowercase letters, digits and single hyphens")

    description = clean_scalar(fields.get("description", ""))
    if not description:
        problems.append("Frontmatter is missing 'description'")
    elif len(description) > 1024:
        problems.append(f"description is {len(description)} characters; the maximum is 1024")

    for md_file in sorted(skill_path.rglob("*.md")):
        if not included(md_file, skill_path):
            continue
        found = sorted(set(PLACEHOLDER_PATTERN.findall(md_file.read_text(encoding="utf-8"))))
        if found:
            rel = md_file.relative_to(skill_path)
            problems.append(f"{rel} has unfilled placeholders: {', '.join(found)}")

    references = skill_path / "references"
    if references.is_dir():
        for ref in sorted(references.iterdir()):
            if not included(ref, skill_path):
                continue
            if ref.is_dir():
                problems.append(f"references/{ref.name}/ is nested; keep reference files one level deep")
            elif f"references/{ref.name}" not in content:
                problems.append(f"references/{ref.name} is not linked from SKILL.md")

    return problems


def package_skill(skill_path_arg: str, output_dir: str | None = None) -> Path | None:
    """Validate the skill folder and write <name>.zip. Return its path, or None on error."""
    skill_path = Path(skill_path_arg).resolve()

    if not skill_path.is_dir():
        print(f"Error: not a skill folder: {skill_path}")
        return None

    print("Validating skill...")
    problems = validate_skill(skill_path)
    if problems:
        print("Validation failed:")
        for problem in problems:
            print(f"  - {problem}")
        return None
    print("Validation passed\n")

    output_path = Path(output_dir).resolve() if output_dir else Path.cwd()
    output_path.mkdir(parents=True, exist_ok=True)
    zip_path = output_path / f"{skill_path.name}.zip"

    try:
        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
            for file_path in sorted(skill_path.rglob("*")):
                if not file_path.is_file() or not included(file_path, skill_path):
                    continue
                arcname = file_path.relative_to(skill_path.parent)
                zipf.write(file_path, arcname)
                print(f"  Added: {arcname.as_posix()}")
    except OSError as error:
        print(f"Error creating zip file: {error}")
        return None

    print(f"\nPackaged skill to: {zip_path}")
    return zip_path


def main() -> None:
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    skill_path = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else None

    print(f"Packaging skill: {skill_path}")
    if output_dir:
        print(f"Output directory: {output_dir}")
    print()

    result = package_skill(skill_path, output_dir)
    sys.exit(0 if result else 1)


if __name__ == "__main__":
    main()
