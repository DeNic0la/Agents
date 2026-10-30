#!/bin/bash
# Checks a solution doc against the repository: frontmatter fields and enums,
# cited repo paths, relative links, commit SHAs and leftover drafting scaffold.
# Usage: scripts/check-doc.sh <doc.md>
# Prints {"doc": ..., "flags": [{"kind", "value", "detail"}]} to stdout. Flags are
# for the agent to judge, so the exit code is 0 unless the usage is wrong.
set -e

doc="$1"
[ -n "$doc" ] && [ -f "$doc" ] || { echo "usage: check-doc.sh <doc.md>" >&2; exit 2; }

root="$(git -C "$(dirname "$doc")" rev-parse --show-toplevel 2>/dev/null || pwd)"
docdir="$(cd "$(dirname "$doc")" && pwd)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

flags="$tmp/flags"
: > "$flags"
json() { printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' | tr -d '\r\n'; }
flag() { printf '{"kind":"%s","value":"%s","detail":"%s"}\n' "$1" "$(json "$2")" "$(json "$3")" >> "$flags"; }

# Frontmatter: the block between the first two '---' lines.
awk 'NR==1 && $0!="---" {exit} NR>1 && $0=="---" {exit} NR>1 {print}' "$doc" > "$tmp/fm"
field() { sed -n "s/^$1:[[:space:]]*//p" "$tmp/fm" | sed 's/[[:space:]]*#.*$//' | head -n 1; }

BUG="build_error test_failure runtime_error performance_issue database_issue security_issue ui_bug integration_issue logic_error"
KNOWLEDGE="architecture_pattern design_pattern tooling_decision convention workflow_issue developer_experience documentation_gap best_practice"
SEVERITY="critical high medium low"
RESOLUTION="code_fix config_change dependency_update environment_setup workaround documentation test_fix"
in_words() { case " $2 " in *" $1 "*) return 0 ;; *) return 1 ;; esac; }

if [ ! -s "$tmp/fm" ]; then
  flag frontmatter "" "no YAML frontmatter found"
else
  for key in title date problem_type component tags severity; do
    [ -n "$(field "$key")" ] || flag frontmatter "$key" "required field is missing or empty"
  done
  ptype="$(field problem_type)"
  if [ -n "$ptype" ] && ! in_words "$ptype" "$BUG $KNOWLEDGE"; then
    flag frontmatter "problem_type: $ptype" "not one of the allowed values"
  fi
  sev="$(field severity)"
  if [ -n "$sev" ] && ! in_words "$sev" "$SEVERITY"; then
    flag frontmatter "severity: $sev" "not one of: $SEVERITY"
  fi
  if [ -n "$ptype" ] && in_words "$ptype" "$BUG"; then
    for key in root_cause resolution_type; do
      [ -n "$(field "$key")" ] || flag frontmatter "$key" "required on the bug track"
    done
  fi
  res="$(field resolution_type)"
  if [ -n "$res" ] && ! in_words "$res" "$RESOLUTION"; then
    flag frontmatter "resolution_type: $res" "not one of: $RESOLUTION"
  fi
fi

# The body without frontmatter and fenced code blocks.
awk 'NR==1 && $0=="---" {fm=1; next} fm && $0=="---" {fm=0; next} fm {next}
     /^[[:space:]]*(```|~~~)/ {code=!code; next} !code {print}' "$doc" > "$tmp/body"

# Inline code spans: repo paths (with an optional :line suffix) and commit SHAs.
grep -o '`[^`]*`' "$tmp/body" | tr -d '`' | sort -u > "$tmp/spans" || true
while IFS= read -r span; do
  case "$span" in
    *" "*|*://*|"") continue ;;
  esac
  if printf '%s' "$span" | grep -qE '^[0-9a-f]{7,40}$'; then
    git -C "$root" cat-file -e "$span^{commit}" 2>/dev/null || flag sha "$span" "commit not found in this repository"
  elif printf '%s' "$span" | grep -qE '^[A-Za-z0-9_.-]+(/[A-Za-z0-9_.-]+)+(:[0-9]+(-[0-9]+)?)?$'; then
    path="${span%%:*}"
    [ -e "$root/$path" ] || flag path "$span" "path does not exist in the repository"
  fi
done < "$tmp/spans"

# Relative Markdown links, resolved from the doc's folder.
grep -oE '\]\([^)]+\)' "$tmp/body" | sed -E 's/^\]\(//; s/\)$//; s/[[:space:]].*$//' | sort -u > "$tmp/links" || true
while IFS= read -r link; do
  case "$link" in
    *://*|mailto:*|\#*|"") continue ;;
  esac
  target="${link%%#*}"
  [ -e "$docdir/$target" ] || flag link "$link" "link target does not exist"
done < "$tmp/links"

# Drafting scaffold left behind.
grep -nE 'TODO|TBD|FIXME|XXX|<[a-z][a-z -]*>' "$tmp/body" | while IFS= read -r line; do
  flag scaffold "$line" "looks like an unfilled placeholder"
done || true

echo "checked $doc" >&2
printf '{"doc":"%s","flags":[%s]}\n' "$(json "$doc")" "$(paste -sd, "$flags")"
