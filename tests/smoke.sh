#!/usr/bin/env bash
# Smoke test for install.sh and the agents command on Linux and WSL. It works on a
# copy of this repo and a temporary home, so your own setup is never touched.
# On native Windows run tests/smoke.ps1 instead.
#
#   bash tests/smoke.sh
set -euo pipefail
shopt -s nullglob

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
FAILURES=0

check() {
  local what="$1"; shift
  if "$@"; then echo "pass    $what"; else echo "FAIL    $what"; FAILURES=$((FAILURES + 1)); tail -5 "$TMP/out" | sed 's/^/        /'; fi
}
not() { ! "$@"; }
gone() { [ ! -e "$1" ] && [ ! -L "$1" ]; }
no_line() { ! grep -qE "$1" "$TMP/out"; }
run_install() { bash "$TMP/repo/install.sh" "$@" > "$TMP/out" 2>&1; }
# Every line of the last install is "ok" (or the PATH note, or the summary).
all_ok() { run_install && ! grep -vqE '^(ok |note: |Done )' "$TMP/out"; }
agents_in() { (cd "$1" && shift && agents "$@") > "$TMP/out" 2>&1; }
# Paths and checksums of a project's files, to show that a command changed nothing.
snapshot() { (cd "$1" && find . -path ./.git -prune -o -type f -print | sort | xargs -r md5sum); }
# Writes stdin to a file, creating its folder.
put() { mkdir -p "$(dirname "$1")"; cat > "$1"; }
# A git repository with one empty commit, so "git status" shows what agents changed.
new_repo() { mkdir "$1" && git -C "$1" init -q && commit_in "$1" init --allow-empty; }
commit_in() { local d="$1" m="$2"; shift 2; git -C "$d" -c user.name=smoke -c user.email=smoke@example.invalid -c core.autocrlf=false commit -qm "$m" "$@"; }
clean() { test -z "$(git -C "$1" status --porcelain)"; }
# The lines the managed block of a repository's exclude file holds.
excluded() { sed -n '/^# agents-preset:start$/,/^# agents-preset:end$/p' "$1/.git/info/exclude"; }
excludes() { excluded "$1" | grep -qxF -- "$2"; }
# The first line number of each text, which must be in the order given.
in_order() {
  local f="$1" prev=0 n t; shift
  for t in "$@"; do
    n="$(grep -nF -m1 -- "$t" "$f" | cut -d: -f1)"
    [ -n "$n" ] && [ "$n" -gt "$prev" ] || return 1
    prev="$n"
  done
}
has() { grep -qF -- "$2" "$1"; }
# A JSON tool agents can use, by the name AGENTS_JSON_TOOL takes.
have_tool() { case "$1" in node) command -v node >/dev/null 2>&1 ;; *) command -v "$1" >/dev/null 2>&1 && "$1" -c 'import json' >/dev/null 2>&1 ;; esac; }
# agents in a folder with a given JSON tool (AGENTS_JSON_TOOL), the output in $TMP/out.
agents_tool() { local t="$1" d="$2"; shift 2; (cd "$d" && AGENTS_JSON_TOOL="$t" agents "$@") > "$TMP/out" 2>&1; }
# agents in a folder with another home, the output in $TMP/out.
agents_home() { local h="$1" d="$2"; shift 2; (export HOME="$h"; cd "$d" && agents "$@") > "$TMP/out" 2>&1; }

# A copy without .git, so the test can change the preset.
mkdir "$TMP/repo"
tar -C "$REPO_DIR" --exclude=./.git -cf - . | tar -C "$TMP/repo" -xf -
export HOME="$TMP/home" AGENTS_BIN_DIR="$TMP/bin" PATH="$TMP/bin:$PATH"
# git must not read the developer's own configuration: a global ignore file would hide a broken
# exclude block from the "git status stays empty" checks.
: > "$TMP/gitconfig"
export GIT_CONFIG_GLOBAL="$TMP/gitconfig" GIT_CONFIG_NOSYSTEM=1 XDG_CONFIG_HOME="$TMP/xdg"
unset CLAUDE_CONFIG_DIR CODEX_HOME COPILOT_HOME
mkdir -p "$HOME"

echo "== global install"
check "install succeeds" run_install
check "install moves nothing aside" no_line '^backup'
check "agents command is installed" test -x "$AGENTS_BIN_DIR/agents"
check "second install reports only ok" all_ok

agent="$(basename "$(printf '%s\n' "$TMP"/repo/preset/agents/*.md | head -1)" .md)"
rm "$TMP/repo/preset/agents/$agent.md"
echo "changed" >> "$TMP/repo/preset/concepts/INDEX.md"
check "install after preset changes succeeds" run_install
check "install after preset changes moves nothing aside" no_line '^backup'
check "deleted subagent is removed for Claude" gone "$HOME/.claude/agents/$agent.md"
check "deleted subagent is removed for Copilot" gone "$HOME/.copilot/agents/$agent.agent.md"
check "deleted subagent is removed for Codex" gone "$HOME/.codex/agents/$agent.toml"
check "changed file is current" cmp -s "$TMP/repo/preset/concepts/INDEX.md" "$HOME/.agents/concepts/INDEX.md"

echo "== environment"
envfile="$TMP/repo/tools/environments/smoke/claude/settings.json"
machine_env="$HOME/.agents/local/environment"
mkdir -p "${envfile%/*}" "${machine_env%/*}"
echo '{"smoke": "environment"}' > "$envfile"
printf 'smoke\r\n' > "$machine_env"
check "install with an environment succeeds" run_install
check "install with an environment moves nothing aside" no_line '^backup'
check "the environment's file replaces the default" cmp -s "$envfile" "$HOME/.claude/settings.json"
echo '../claude' > "$machine_env"
check "install with an invalid environment name succeeds" run_install
check "an invalid environment name keeps the default" cmp -s "$TMP/repo/tools/claude/settings.json" "$HOME/.claude/settings.json"
check "an invalid environment name prints a warning" grep -q '^warning: ignoring' "$TMP/out"
printf '\357\273\277smoke\n' > "$machine_env"
check "install with a BOM before the environment name succeeds" run_install
check "a BOM before the environment name is ignored" cmp -s "$envfile" "$HOME/.claude/settings.json"
echo 'nosuch' > "$machine_env"
check "install with an unknown environment succeeds" run_install
check "an unknown environment prints a warning" grep -q "^warning: there's no tools/environments/nosuch" "$TMP/out"
rm "$machine_env"

echo "== project"
tailored="" global=""
for d in "$TMP"/repo/preset/skills/*/; do
  if [ -f "$d/GENERATE.md" ]; then tailored="${tailored:-$(basename "$d")}"; else global="${global:-$(basename "$d")}"; fi
done
agent="$(basename "$(printf '%s\n' "$TMP"/repo/preset/agents/*.md | head -1)" .md)"

# A sample tailored skill and a sample tailored subagent, both with a specifics recipe.
put "$TMP/repo/preset/skills/smoke-skill/SKILL.md" <<'EOF'
---
name: smoke-skill
description: Use in the smoke test.
---

# Smoke skill

> **Repo version first:** if this repository has `.agents/skills/smoke-skill/SKILL.md`, follow that file instead of this one. It's tailored to the repository.

CORE-SENTENCE-A applies here.
CORE-SENTENCE-B applies here.
CORE-SENTENCE-C applies here.
DUP-LINE then DUP-LINE again.
EOF
put "$TMP/repo/preset/skills/smoke-skill/GENERATE.md" <<'EOF'
---
description: Recipe for the smoke skill.
output: specifics
---

# smoke-skill (recipe)

Write the specifics.
EOF
put "$TMP/repo/preset/skills/smoke-skill/references/extra.md" <<'EOF'
# Extra

Supporting file of the smoke skill.
EOF
put "$TMP/repo/preset/agents/smoke-agent.md" <<'EOF'
---
name: smoke-agent
description: Smoke test subagent.
model: haiku
---

You are the smoke agent. AGENT-CORE-SENTENCE stays.
AGENT-DROP-ME goes.
EOF
put "$TMP/repo/preset/agents/recipes/smoke-agent.md" <<'EOF'
---
description: Recipe for the smoke subagent.
output: specifics
---

# smoke-agent (recipe)

Write the specifics.
EOF
# A sample skill for removals that overlap or build on each other.
put "$TMP/repo/preset/skills/smoke-order/SKILL.md" <<'EOF'
---
name: smoke-order
description: Use in the smoke test.
---

# Smoke order

> **Repo version first:** if this repository has `.agents/skills/smoke-order/SKILL.md`, follow that file instead of this one. It's tailored to the repository.

ORDER-A-ONE here.
ORDER-B-TWO here.
EOF
put "$TMP/repo/preset/skills/smoke-order/GENERATE.md" <<'EOF'
---
description: Recipe for the order sample.
output: specifics
---

# smoke-order (recipe)

Write the specifics.
EOF
# The copy's preset was changed above, so only that check finishes is tested here.
proj="$TMP/project"
new_repo "$proj"
check "agents check runs" eval 'agents_in "$proj" check; grep -qE "^(ok - |[0-9]+ problem)" "$TMP/out"'
check "agents check finds no problem in the sample recipe" no_line 'agents/recipes/smoke-agent'
put "$TMP/repo/preset/agents/recipes/smoke-bad.md" <<'EOF'
---
description: A recipe without the output field.
---
EOF
check "agents check runs with a bad recipe" eval 'agents_in "$proj" check; grep -qE "^(ok - |[0-9]+ problem)" "$TMP/out"'
check "agents check names the recipe without output: specifics" grep -qE "agents/recipes/smoke-bad.md.*output: specifics" "$TMP/out"
rm "$TMP/repo/preset/agents/recipes/smoke-bad.md"

# The old list of checkouts, a file called projects, becomes checkouts.
checkouts="$HOME/.agents/local/checkouts"
mkdir -p "$HOME/.agents/local"
printf '%s\n' "$TMP/old-listed" > "$HOME/.agents/local/projects"
check "add succeeds" agents_in "$proj" add "skills/$tailored" ${global:+"skills/$global"} "agents/$agent"
for f in .agents/preset.txt .agents/project ".agents/recipes/skills/$tailored.md" ".claude/agents/$agent.md" \
         ".github/agents/$agent.agent.md" ".codex/agents/$agent.toml" ${global:+".agents/skills/$global/SKILL.md" ".claude/skills/$global/SKILL.md"}; do
  check "add creates $f" test -f "$proj/$f"
done
proj_root="$(cd "$(git -C "$proj" rev-parse --show-toplevel)" && pwd)"
check "add lists the project for update" grep -qxF "$proj_root" "$checkouts"
check "add moves the old checkout list to checkouts" eval 'gone "$HOME/.agents/local/projects" && grep -qxF "$TMP/old-listed" "$checkouts"'
check "add names the project after the folder when there is no origin" test "$(cat "$proj/.agents/project")" = "$(printf 'name=project\nstore=machine')"
check "AGENTS.md has the managed block" grep -q '^<!-- agents-preset:start -->' "$proj/AGENTS.md"
check "CLAUDE.md imports AGENTS.md" grep -q '^@AGENTS.md' "$proj/CLAUDE.md"
check "add leaves git status empty" clean "$proj"
check "the exclude block lists .agents/" excludes "$proj" "/.agents/"
check "the exclude block lists the subagent copies" eval 'excludes "$proj" "/.claude/agents/$agent.md" && excludes "$proj" "/.codex/agents/$agent.toml"'
check "the exclude block lists AGENTS.md and CLAUDE.md" eval 'excludes "$proj" "/AGENTS.md" && excludes "$proj" "/CLAUDE.md"'
before="$(snapshot "$proj")"
exclude_before="$(cat "$proj/.git/info/exclude")"
check "remove --dry-run succeeds" agents_in "$proj" remove --dry-run "agents/$agent"
check "remove --dry-run reports the exclude block" grep -q 'exclude block' "$TMP/out"
check "remove --dry-run changes nothing" test "$before" = "$(snapshot "$proj")"
check "remove --dry-run leaves the exclude block alone" test "$exclude_before" = "$(cat "$proj/.git/info/exclude")"
check "sync succeeds" agents_in "$proj" sync
check "sync changes nothing" eval 'test "$before" = "$(snapshot "$proj")" && clean "$proj"'
check "sync leaves the exclude block alone" test "$exclude_before" = "$(cat "$proj/.git/info/exclude")"

# A line the owner wrote in the exclude file stays, in and after the block.
printf 'owner-line\n' >> "$proj/.git/info/exclude"
check "sync after an owner edit succeeds" agents_in "$proj" sync
check "lines outside the block are never changed" grep -qxF owner-line "$proj/.git/info/exclude"

echo "== tracked files"
# A preset path the repository tracks (committed earlier): warned about, never changed.
p2="$TMP/committed"
new_repo "$p2"
agents_in "$p2" add "agents/$agent" >/dev/null
git -C "$p2" add -f ".claude/agents/$agent.md" && commit_in "$p2" "track a preset file"
echo "own edit" >> "$p2/.claude/agents/$agent.md"
before="$(snapshot "$p2")"
check "sync with a tracked preset path succeeds" agents_in "$p2" sync
check "sync warns how to stop tracking a preset path" grep -qF "git rm -r --cached .claude/agents/$agent.md" "$TMP/out"
check "sync changes nothing in a tracked preset path" test "$before" = "$(snapshot "$p2")"
check "sync never runs git rm" eval 'git -C "$p2" ls-files | grep -qxF ".claude/agents/$agent.md"'

# A repository that tracks AGENTS.md: the block goes into CLAUDE.local.md.
p3="$TMP/tracks-agents-md"
new_repo "$p3"
printf '# Own rules\n' > "$p3/AGENTS.md"
git -C "$p3" add AGENTS.md && commit_in "$p3" "own rules"
check "add in a repository that tracks AGENTS.md succeeds" agents_in "$p3" add "skills/$tailored"
check "add leaves a tracked AGENTS.md unchanged" test "$(cat "$p3/AGENTS.md")" = "# Own rules"
check "the block goes into CLAUDE.local.md" grep -q '^<!-- agents-preset:start -->' "$p3/CLAUDE.local.md"
check "CLAUDE.local.md imports AGENTS.md" grep -q '^@AGENTS.md' "$p3/CLAUDE.local.md"
check "git status stays empty with a tracked AGENTS.md" clean "$p3"
check "the exclude block lists CLAUDE.local.md and not AGENTS.md" eval 'excludes "$p3" "/CLAUDE.local.md" && ! excludes "$p3" "/AGENTS.md"'
check "no CLAUDE.md is written beside CLAUDE.local.md" gone "$p3/CLAUDE.md"

# Only CLAUDE.md tracked: the block stays in AGENTS.md, CLAUDE.local.md imports it.
p4="$TMP/tracks-claude-md"
new_repo "$p4"
printf '# Own claude rules\n' > "$p4/CLAUDE.md"
git -C "$p4" add CLAUDE.md && commit_in "$p4" "own claude rules"
check "add in a repository that tracks CLAUDE.md succeeds" agents_in "$p4" add "skills/$tailored"
check "add leaves a tracked CLAUDE.md unchanged" test "$(cat "$p4/CLAUDE.md")" = "# Own claude rules"
check "the block stays in AGENTS.md" grep -q '^<!-- agents-preset:start -->' "$p4/AGENTS.md"
check "CLAUDE.local.md imports AGENTS.md" grep -q '^@AGENTS.md' "$p4/CLAUDE.local.md"
check "git status stays empty with a tracked CLAUDE.md" clean "$p4"
# A tracked CLAUDE.md that imports AGENTS.md needs no CLAUDE.local.md.
p4b="$TMP/claude-md-imports"
new_repo "$p4b"
printf '@AGENTS.md\n' > "$p4b/CLAUDE.md"
git -C "$p4b" add CLAUDE.md && commit_in "$p4b" "own claude rules"
agents_in "$p4b" add "skills/$tailored" >/dev/null
check "a tracked CLAUDE.md that imports AGENTS.md gets no CLAUDE.local.md" gone "$p4b/CLAUDE.local.md"

# A managed block inside a tracked file: warned about, left as it is.
p5="$TMP/block-in-tracked"
new_repo "$p5"
agents_in "$p5" add "skills/$tailored" >/dev/null
git -C "$p5" add -f AGENTS.md && commit_in "$p5" "track AGENTS.md with the block"
before="$(snapshot "$p5")"
check "sync with a block in a tracked file succeeds" agents_in "$p5" sync
check "sync warns about a block in a tracked file" grep -qE "AGENTS.md.*remove the block and commit, or keep it" "$TMP/out"
check "sync leaves a tracked file with a block as it is" test "$(git -C "$p5" show HEAD:AGENTS.md)" = "$(cat "$p5/AGENTS.md")"

echo "== tailored items"
tp="$TMP/tailored"
new_repo "$tp"
git -C "$tp" remote add origin https://example.invalid/team/Smoke-Repo.git
check "add tailored items succeeds" agents_in "$tp" add skills/smoke-skill agents/smoke-agent
check "the project is named after the origin" test "$(cat "$tp/.agents/project")" = "$(printf 'name=smoke-repo\nstore=machine')"
check "without level files the skill has no repo version yet" gone "$tp/.agents/skills/smoke-skill"
check "without level files the subagent is the core" cmp -s "$TMP/repo/preset/agents/smoke-agent.md" "$tp/.claude/agents/smoke-agent.md"
check "the recipes are copied" eval 'test -f "$tp/.agents/recipes/skills/smoke-skill.md" && test -f "$tp/.agents/recipes/agents/smoke-agent.md"'
check "AGENTS.md names the recipe and the level paths" eval 'has "$tp/AGENTS.md" ".agents/recipes/skills/smoke-skill.md" && has "$tp/AGENTS.md" ".agents/levels/skills/smoke-skill.md" && has "$tp/AGENTS.md" "~/.agents/local/projects/smoke-repo/skills/smoke-skill.md"'

store="$HOME/.agents/local/projects/smoke-repo"
put "$store/skills/smoke-skill.md" <<'EOF'
PROJECT-LEVEL-TEXT

## Removed from the core

### Drop sentence A
Core text: "CORE-SENTENCE-A applies here."
Replacement: "REPLACED-A"
Cases:
1. first case
2. second case
3. third case
Review: other-model, 2026-11-16, agreed: the sentence is wrong here

### Two cases only
Core text: "CORE-SENTENCE-B applies here."
Replacement: ""
Cases:
1. first case
2. second case
Review: other-model, 2026-11-16, agreed: fine

### Not agreed
Core text: "CORE-SENTENCE-C applies here."
Replacement: ""
Cases:
1. first case
2. second case
3. third case
Review: other-model, 2026-11-16, rejected: it is needed

### Twice
Core text: "DUP-LINE"
Replacement: ""
Cases:
1. first case
2. second case
3. third case
Review: other-model, 2026-11-16, agreed: fine

### Stale
Core text: "TEXT THAT IS NOT IN THE CORE"
Replacement: ""
Cases:
1. first case
2. second case
3. third case
Review: other-model, 2026-11-16, agreed: fine

### Multi line
Core text: "DUP-LINE then
DUP-LINE again."
Replacement: ""
Cases:
1. first case
2. second case
3. third case
Review: other-model, 2026-11-16, agreed: fine
EOF
put "$tp/.agents/levels/skills/smoke-skill.md" <<'EOF'
CHECKOUT-LEVEL-TEXT
EOF
put "$store/agents/smoke-agent.md" <<'EOF'
AGENT-PROJECT-TEXT

## Removed from the core

### Drop the agent line
Core text: "AGENT-DROP-ME goes."
Replacement: ""
Cases:
1. first case
2. second case
3. third case
Review: other-model, 2026-11-16, agreed: fine
EOF
put "$tp/.agents/levels/agents/smoke-agent.md" <<'EOF'
AGENT-CHECKOUT-TEXT
EOF
skill_md="$tp/.agents/skills/smoke-skill/SKILL.md"
check "sync composes the levels" agents_in "$tp" sync
check "the composed skill has the core, the project and the checkout level in this order" in_order "$skill_md" "CORE-SENTENCE-B applies here." "## In this project" "PROJECT-LEVEL-TEXT" "## In this checkout" "CHECKOUT-LEVEL-TEXT" "the more specific one wins"
check "the composed skill keeps its frontmatter first" test "$(head -1 "$skill_md")" = "---"
check "the composed skill drops the repo-version notice" not has "$skill_md" "Repo version first"
check "the composed skill carries the core's supporting files" test -f "$tp/.agents/skills/smoke-skill/references/extra.md"
check "the composed skill has no recipe inside" gone "$tp/.agents/skills/smoke-skill/GENERATE.md"
check "the composed skill is mirrored for Claude Code" has "$tp/.claude/skills/smoke-skill/SKILL.md" "CHECKOUT-LEVEL-TEXT"
check "the removal section is not copied" not has "$skill_md" "Removed from the core"
check "a valid removal applies" eval 'has "$skill_md" "REPLACED-A" && ! has "$skill_md" "CORE-SENTENCE-A applies here."'
check "a removal with two cases does not apply" has "$skill_md" "CORE-SENTENCE-B applies here."
check "a removal with two cases warns" grep -qE 'smoke-skill.*"Two cases only".*3 cases' "$TMP/out"
check "a removal without agreed does not apply" has "$skill_md" "CORE-SENTENCE-C applies here."
check "a removal without agreed warns" grep -qE 'smoke-skill.*"Not agreed".*agreed' "$TMP/out"
check "a removal whose core text occurs twice does not apply" has "$skill_md" "DUP-LINE then DUP-LINE again."
check "a removal whose core text occurs twice warns" grep -qE 'smoke-skill.*"Twice".*2 times' "$TMP/out"
check "a removal whose core text is not there warns" grep -qE 'smoke-skill.*"Stale".*not in the core' "$TMP/out"
check "a removal whose quoted text runs over two lines warns about the line, not the core" grep -qE 'smoke-skill.*"Multi line".*one line' "$TMP/out"
for f in .claude/agents/smoke-agent.md .github/agents/smoke-agent.agent.md .codex/agents/smoke-agent.toml; do
  check "the composed subagent $f has the core, the project and the checkout level in this order" in_order "$tp/$f" "AGENT-CORE-SENTENCE stays." "## In this project" "AGENT-PROJECT-TEXT" "## In this checkout" "AGENT-CHECKOUT-TEXT" "the more specific one wins"
  check "the composed subagent $f applies its removal" not has "$tp/$f" "AGENT-DROP-ME"
done
check "the composed subagent keeps its frontmatter" test "$(head -1 "$tp/.claude/agents/smoke-agent.md")" = "---"
check "the composed subagent keeps its model" has "$tp/.claude/agents/smoke-agent.md" "model: haiku"
check "git status stays empty with composed items" clean "$tp"
check "the exclude block lists the composed items" eval 'excludes "$tp" "/.claude/skills/smoke-skill" && excludes "$tp" "/.github/agents/smoke-agent.agent.md"'
before="$(snapshot "$tp")"
check "a second sync succeeds" agents_in "$tp" sync
check "a second sync changes nothing" test "$before" = "$(snapshot "$tp")"

# A change to the core shows up on the next sync.
echo "NEWCORE-LINE" >> "$TMP/repo/preset/skills/smoke-skill/SKILL.md"
echo "NEWCORE-AGENT-LINE" >> "$TMP/repo/preset/agents/smoke-agent.md"
check "sync after a core change succeeds" agents_in "$tp" sync
check "a core change reaches the composed skill" has "$skill_md" "NEWCORE-LINE"
check "a core change reaches the composed subagent" has "$tp/.claude/agents/smoke-agent.md" "NEWCORE-AGENT-LINE"
check "a core change reaches the Codex agent" has "$tp/.codex/agents/smoke-agent.toml" "NEWCORE-AGENT-LINE"

# A removal whose core text changed no longer applies.
sed -i 's/CORE-SENTENCE-A applies here\./CORE-SENTENCE-A was reworded./' "$TMP/repo/preset/skills/smoke-skill/SKILL.md"
check "sync after the removed core text changed succeeds" agents_in "$tp" sync
check "a removal whose core text changed does not apply" eval 'has "$skill_md" "CORE-SENTENCE-A was reworded." && ! has "$skill_md" "REPLACED-A"'
check "a removal whose core text changed warns" grep -qE 'smoke-skill.*"Drop sentence A".*not in the core' "$TMP/out"

# No level file left: the items behave as before.
rm "$store/skills/smoke-skill.md" "$tp/.agents/levels/skills/smoke-skill.md" "$store/agents/smoke-agent.md" "$tp/.agents/levels/agents/smoke-agent.md"
check "sync without level files succeeds" agents_in "$tp" sync
check "without level files the composed skill is gone" eval 'gone "$tp/.agents/skills/smoke-skill" && gone "$tp/.claude/skills/smoke-skill"'
check "without level files the subagent is the core again" cmp -s "$TMP/repo/preset/agents/smoke-agent.md" "$tp/.claude/agents/smoke-agent.md"

echo "== composition edge cases"
# Removals are checked against the core, not against the text earlier removals made.
to="$TMP/order"
new_repo "$to"
check "add for the order test succeeds" agents_in "$to" add --project smoke-order skills/smoke-order
put "$HOME/.agents/local/projects/smoke-order/skills/smoke-order.md" <<'EOF'
ORDER-PROJECT-TEXT

## Removed from the core

### Grow A
Core text: "ORDER-A-ONE here."
Replacement: "ORDER-B-TWO here. ORDER-B-TWO here. ONLY-IN-REPLACEMENT"
Cases:
1. first case
2. second case
3. third case
Review: other-model, 2026-11-16, agreed: fine

### Reword B
Core text: "ORDER-B-TWO here."
Replacement: "B-REWORDED"
Cases:
1. first case
2. second case
3. third case
Review: other-model, 2026-11-16, agreed: fine

### Only in a replacement
Core text: "ONLY-IN-REPLACEMENT"
Replacement: ""
Cases:
1. first case
2. second case
3. third case
Review: other-model, 2026-11-16, agreed: fine

### Overlap
Core text: "A-ONE here"
Replacement: ""
Cases:
1. first case
2. second case
3. third case
Review: other-model, 2026-11-16, agreed: fine
EOF
check "sync with removals that build on each other succeeds" agents_in "$to" sync
order_md="$to/.agents/skills/smoke-order/SKILL.md"
check "a removal is not refused because an earlier replacement repeated its core text" eval 'has "$order_md" "B-REWORDED" && test "$(grep -o "ORDER-B-TWO here\." "$order_md" | wc -l)" = 2'
check "text that only an earlier replacement brought in is not removed" has "$order_md" "ONLY-IN-REPLACEMENT"
check "a removal for text that is only in a replacement warns it is not in the core" grep -qE 'smoke-order.*"Only in a replacement".*not in the core' "$TMP/out"
check "a removal that overlaps an earlier one warns" grep -qE 'smoke-order.*"Overlap".*overlaps' "$TMP/out"
check "the earlier of two overlapping removals applies" not has "$order_md" "ORDER-A-ONE here."

# A level file with no text composes nothing.
tb="$TMP/blank"
new_repo "$tb"
check "add for the blank level test succeeds" agents_in "$tb" add --project smoke-blank skills/smoke-skill agents/smoke-agent
mkdir -p "$tb/.agents/levels/skills" "$tb/.agents/levels/agents"
printf '\n  \n\n' > "$tb/.agents/levels/skills/smoke-skill.md"
printf '\n\n' > "$tb/.agents/levels/agents/smoke-agent.md"
check "sync with blank level files succeeds" agents_in "$tb" sync
check "a blank level composes no skill" gone "$tb/.agents/skills/smoke-skill"
check "a blank level leaves the subagent as the core" cmp -s "$TMP/repo/preset/agents/smoke-agent.md" "$tb/.claude/agents/smoke-agent.md"
check "a blank level counts as no level" grep -q 'No level yet' "$TMP/out"
# A level that looks like a whole file is warned about.
printf -- '---\nname: x\n---\n> **Repo version first:** x\nBODY-OF-LEVEL\n' > "$tb/.agents/levels/agents/smoke-agent.md"
check "sync with a level that has frontmatter succeeds" agents_in "$tb" sync
check "a level that starts with frontmatter warns" grep -q "starts with frontmatter" "$TMP/out"
check "a level with the repo-version notice warns" grep -q 'holds the "Repo version first" notice' "$TMP/out"
check "the level is still composed" has "$tb/.claude/agents/smoke-agent.md" "BODY-OF-LEVEL"

echo "== exclude block edge cases"
# A marker without its partner: the file is left alone.
p6="$TMP/unbalanced"
new_repo "$p6"
agents_in "$p6" add "agents/$agent" >/dev/null
sed -i '/^# agents-preset:end$/d' "$p6/.git/info/exclude"
printf 'my-ignored-dir/\n' >> "$p6/.git/info/exclude"
before="$(cat "$p6/.git/info/exclude")"
check "sync with an end marker missing succeeds" agents_in "$p6" sync
check "sync leaves an exclude file with an unbalanced marker as it is" test "$before" = "$(cat "$p6/.git/info/exclude")"
check "sync warns about the marker" grep -q 'block marker' "$TMP/out"

# A repository that tracks files in .agents/: exact paths, so the owner's new files stay visible.
p7="$TMP/tracks-agents-dir"
new_repo "$p7"
put "$p7/.agents/skills/own-skill/SKILL.md" <<'EOF'
# Own skill
EOF
git -C "$p7" add .agents && commit_in "$p7" "own agents folder"
check "add in a repository that tracks files in .agents succeeds" agents_in "$p7" add "agents/$agent"
check "git status stays empty with a tracked .agents folder" clean "$p7"
check "the exclude block does not hide the whole .agents folder" not excludes "$p7" "/.agents/"
check "the exclude block lists the manifest" excludes "$p7" "/.agents/preset.txt"
put "$p7/.agents/skills/new-skill/SKILL.md" <<'EOF'
# New skill
EOF
check "a new file the owner adds to a tracked .agents folder stays visible" test "$(git -C "$p7" status --porcelain)" = "?? .agents/skills/new-skill/"

# The last item goes, but the owner's levels stay hidden.
p8="$TMP/levels-left"
new_repo "$p8"
agents_in "$p8" add --project smoke-left skills/smoke-skill >/dev/null
put "$p8/.agents/levels/skills/smoke-skill.md" <<'EOF'
LEFT-LEVEL
EOF
agents_in "$p8" sync >/dev/null
# shellcheck disable=SC2046
check "removing the last item succeeds" agents_in "$p8" remove $(grep -v '^#' "$p8/.agents/preset.txt")
check "the owner's levels are kept" test -f "$p8/.agents/levels/skills/smoke-skill.md"
check "the owner's levels stay out of git status" clean "$p8"
check "the exclude block keeps hiding .agents/" excludes "$p8" "/.agents/"

# State files the repository tracks are not deleted with the last item.
p9="$TMP/tracks-state"
new_repo "$p9"
agents_in "$p9" add "agents/$agent" >/dev/null
git -C "$p9" add -f .agents/preset.txt .agents/project && commit_in "$p9" "track the state"
# shellcheck disable=SC2046
check "removing the last item with tracked state files succeeds" agents_in "$p9" remove $(grep -v '^#' "$p9/.agents/preset.txt")
check "tracked state files are not deleted" eval 'test -f "$p9/.agents/preset.txt" && test -f "$p9/.agents/project"'
check "git status shows no deleted file" not eval 'git -C "$p9" status --porcelain | grep -qE "^( D|D )"'
check "a tracked manifest no longer lists any item" test -z "$(grep -v '^#' "$p9/.agents/preset.txt")"

# Linked worktrees share one exclude file: each one's paths stay hidden while it needs them.
wr="$TMP/wt-main"
wt="$TMP/wt-linked"
new_repo "$wr"
git -C "$wr" worktree add -q "$wt" -b wt-branch
agents_in "$wr" add "agents/$agent" >/dev/null
agents_in "$wt" add "agents/$agent" skills/smoke-skill >/dev/null
check "the main checkout is clean" clean "$wr"
check "a linked worktree is clean" clean "$wt"
# shellcheck disable=SC2046
check "removing everything in the main checkout succeeds" agents_in "$wr" remove $(grep -v '^#' "$wr/.agents/preset.txt")
check "the main checkout is clean after that" clean "$wr"
check "a linked worktree stays clean when the main checkout drops its items" clean "$wt"
check "the shared exclude block still lists what the worktree needs" excludes "$wr" "/.codex/agents/$agent.toml"
# shellcheck disable=SC2046
check "removing everything in the worktree succeeds" agents_in "$wt" remove $(grep -v '^#' "$wt/.agents/preset.txt")
check "the shared exclude block goes when no checkout needs it" not grep -q 'agents-preset' "$wr/.git/info/exclude"
check "both are clean at the end" eval 'clean "$wr" && clean "$wt"'

# Both checkout lists exist: they are joined, so the machine store's folder can be created.
h2="$TMP/home2"
mkdir -p "$h2/.agents/local"
printf '%s\n' "$TMP/old-a" > "$h2/.agents/local/projects"
printf '%s\n' "$TMP/new-b" > "$h2/.agents/local/checkouts"
pj="$TMP/both-lists"
new_repo "$pj"
check "add with both checkout lists succeeds" agents_home "$h2" "$pj" add --project smoke-both skills/smoke-skill
check "both checkout lists are joined into checkouts" eval 'grep -qxF "$TMP/old-a" "$h2/.agents/local/checkouts" && grep -qxF "$TMP/new-b" "$h2/.agents/local/checkouts"'
check "the old list file is gone, so the project store can be created" eval '! test -f "$h2/.agents/local/projects" && mkdir -p "$h2/.agents/local/projects/smoke-both/skills"'

echo "== project name and store"
sp="$TMP/shared"
new_repo "$sp"
check "an invalid project name is refused" not agents_in "$sp" add --project ../x skills/smoke-skill
check "an invalid project name is named in the message" grep -q 'invalid project name' "$TMP/out"
check "an invalid project name changes nothing" test -z "$(ls -A "$sp" | grep -v '^.git$')"
check "a project name starting with a dot is refused" not agents_in "$sp" add --project .hidden skills/smoke-skill
check "an unknown store is refused" not agents_in "$sp" add --store nowhere skills/smoke-skill
check "add --project --store agents succeeds" agents_in "$sp" add --project smoke-shared --store agents skills/smoke-skill
check ".agents/project records the name and the store" test "$(cat "$sp/.agents/project")" = "$(printf 'name=smoke-shared\nstore=agents')"
put "$TMP/repo/projects/smoke-shared/skills/smoke-skill.md" <<'EOF'
SHARED-PROJECT-TEXT
EOF
check "sync with the agents store succeeds" agents_in "$sp" sync
check "the project level comes from projects/<name>/ in the repo" has "$sp/.agents/skills/smoke-skill/SKILL.md" "SHARED-PROJECT-TEXT"
check "the machine store is not used for it" gone "$HOME/.agents/local/projects/smoke-shared"
check "AGENTS.md names the agents store" has "$sp/AGENTS.md" "projects/smoke-shared/skills/smoke-skill.md"

echo "== settings in a level"
# The merge runs once per JSON tool that is installed, because each tool has its own code path.
settings_tests() {
  local tool="$1" st st2 st3 st4
  st="$TMP/settings-$tool"
  new_repo "$st"
  check "[$tool] add for the settings test succeeds" agents_tool "$tool" "$st" add --project "smoke-set-$tool" agents/smoke-agent
  put "$HOME/.agents/local/projects/smoke-set-$tool/settings/claude.json" <<'EOF'
{"permissions": {"deny": ["Write(**)"]}, "model": "project"}
EOF
  put "$st/.agents/levels/settings/claude.json" <<'EOF'
{"permissions": {"deny": ["Edit(**)", "Write(**)"]}, "model": "checkout"}
EOF
  check "[$tool] sync with settings levels succeeds" agents_tool "$tool" "$st" sync
  check "[$tool] a deny rule in a level produces .claude/settings.local.json" eval 'has "$st/.claude/settings.local.json" "Edit(**)" && has "$st/.claude/settings.local.json" "Write(**)"'
  check "[$tool] arrays are concatenated without duplicates" test "$(grep -c 'Write(\*\*)' "$st/.claude/settings.local.json")" = 1
  check "[$tool] the more specific level wins a plain value" has "$st/.claude/settings.local.json" '"checkout"'
  check "[$tool] the settings file is excluded" excludes "$st" "/.claude/settings.local.json"
  check "[$tool] git status stays empty with settings" clean "$st"
  before="$(snapshot "$st")"
  check "[$tool] sync with unchanged settings succeeds" agents_tool "$tool" "$st" sync
  check "[$tool] sync with unchanged settings changes nothing" test "$before" = "$(snapshot "$st")"
  rm "$st/.agents/levels/settings/claude.json"
  check "[$tool] sync after the checkout settings level is gone succeeds" agents_tool "$tool" "$st" sync
  check "[$tool] the settings file follows its levels" eval '! has "$st/.claude/settings.local.json" "Edit(**)" && has "$st/.claude/settings.local.json" "Write(**)"'
  # A file the owner edited after agents wrote it is not overwritten.
  printf '{"edited": true}\n' > "$st/.claude/settings.local.json"
  put "$st/.agents/levels/settings/claude.json" <<'EOF'
{"model": "again"}
EOF
  check "[$tool] sync with an edited settings file succeeds" agents_tool "$tool" "$st" sync
  check "[$tool] an edited settings file is left alone" test "$(cat "$st/.claude/settings.local.json")" = '{"edited": true}'
  check "[$tool] an edited settings file gets a warning" grep -q '^warning: .claude/settings.local.json' "$TMP/out"

  st2="$TMP/settings-own-$tool"
  new_repo "$st2"
  put "$st2/.claude/settings.local.json" <<'EOF'
{"mine": true}
EOF
  put "$st2/.agents/levels/settings/claude.json" <<'EOF'
{"permissions": {"deny": ["Write(**)"]}}
EOF
  check "[$tool] add with an existing settings file succeeds" agents_tool "$tool" "$st2" add agents/smoke-agent
  check "[$tool] an existing settings file is left alone" test "$(cat "$st2/.claude/settings.local.json")" = '{"mine": true}'
  check "[$tool] an existing settings file gets a warning and the rules to add" eval 'grep -q "^warning: .claude/settings.local.json" "$TMP/out" && grep -qF "Write(**)" "$TMP/out"'
  check "[$tool] an existing settings file is not excluded" not excludes "$st2" "/.claude/settings.local.json"

  # Malformed JSON in a level: a warning, and nothing is written.
  st3="$TMP/settings-bad-$tool"
  new_repo "$st3"
  put "$st3/.agents/levels/settings/claude.json" <<'EOF'
{"permissions": 
EOF
  check "[$tool] add with a malformed settings level succeeds" agents_tool "$tool" "$st3" add agents/smoke-agent
  check "[$tool] a malformed settings level warns" grep -q "couldn't merge" "$TMP/out"
  check "[$tool] a malformed settings level writes no settings file" gone "$st3/.claude/settings.local.json"

  # A settings file the repository tracks is never changed.
  st4="$TMP/settings-tracked-$tool"
  new_repo "$st4"
  put "$st4/.claude/settings.local.json" <<'EOF'
{"tracked": true}
EOF
  git -C "$st4" add .claude/settings.local.json && commit_in "$st4" "track the settings"
  put "$st4/.agents/levels/settings/claude.json" <<'EOF'
{"permissions": {"deny": ["Write(**)"]}}
EOF
  check "[$tool] add with a tracked settings file succeeds" agents_tool "$tool" "$st4" add agents/smoke-agent
  check "[$tool] a tracked settings file is left alone" test "$(cat "$st4/.claude/settings.local.json")" = '{"tracked": true}'
  check "[$tool] a tracked settings file gets a warning" grep -q '^warning: .claude/settings.local.json' "$TMP/out"
  check "[$tool] git status stays empty with a tracked settings file" clean "$st4"
}
tools_run=0
for t in node python3 python; do
  if have_tool "$t"; then tools_run=$((tools_run + 1)); settings_tests "$t"; else echo "skip    settings tests with $t: not installed"; fi
done
# Without any JSON tool the settings can't be merged: a warning, no file. Tested with a tool that doesn't exist.
st5="$TMP/settings-notool"
new_repo "$st5"
put "$st5/.agents/levels/settings/claude.json" <<'EOF'
{"permissions": {"deny": ["Write(**)"]}}
EOF
check "add without a JSON tool succeeds" agents_tool nosuchtool "$st5" add agents/smoke-agent
check "without a JSON tool the settings are skipped with a warning" grep -q 'settings in a level are skipped' "$TMP/out"
check "without a JSON tool no settings file is written" gone "$st5/.claude/settings.local.json"
check "at least one JSON tool is installed to test the settings merge" test "$tools_run" -gt 0

echo "== update"
# Simulates a pull: the copy becomes a git repo as it is now, then gains a new skill and a
# change to the global skill the project uses.
git -C "$TMP/repo" init -q && git -C "$TMP/repo" add -A
git -C "$TMP/repo" -c user.name=smoke -c user.email=smoke@example.invalid commit -qm base
base="$(git -C "$TMP/repo" rev-parse HEAD)"
mkdir "$TMP/repo/preset/skills/smoke-new"
printf -- '---\nname: smoke-new\ndescription: Use in the smoke test.\n---\n' > "$TMP/repo/preset/skills/smoke-new/SKILL.md"
if [ -n "$global" ]; then echo "changed" >> "$TMP/repo/preset/skills/$global/SKILL.md"; fi
git -C "$TMP/repo" add -A
git -C "$TMP/repo" -c user.name=smoke -c user.email=smoke@example.invalid commit -qm pulled
# Only the first project is refreshed here.
printf '%s\n' "$proj_root" > "$checkouts"
# A hand-edited list: CRLF, a trailing slash, a folder that's gone, a checkout without a manifest.
other="$TMP/no-manifest"
mkdir "$other" && git -C "$other" init -q
other_root="$(cd "$(git -C "$other" rev-parse --show-toplevel)" && pwd)"
printf '%s/\r\n%s\r\n%s\r\n' "$proj_root" "$TMP/gone" "$other" >> "$checkouts"
check "update outside the project succeeds" agents_in "$TMP" update --no-pull "$base"
if [ -n "$global" ]; then
  check "update refreshes a listed project" cmp -s "$TMP/repo/preset/skills/$global/SKILL.md" "$proj/.agents/skills/$global/SKILL.md"
fi
check "update names a new item the project doesn't use" grep -qF "not used in $proj_root: skills/smoke-new" "$TMP/out"
check "update does not name the recipes folder as an item" no_line 'agents/recipes'
check "update refreshes a project listed twice only once" test "$(grep -c "^Refreshing " "$TMP/out")" = 1
check "update lists a project once, as its top level" test "$(grep -cF "$proj_root" "$checkouts")" = 1
check "update skips a missing folder" grep -qF "skipped $TMP/gone: folder not found" "$TMP/out"
check "update skips a checkout without a manifest" grep -qF "skipped $other_root: no .agents/preset.txt" "$TMP/out"
check "update keeps skipped projects listed" eval 'grep -qxF "$TMP/gone" "$checkouts" && grep -qxF "$other_root" "$checkouts"'
printf '%s\n' "$proj_root" > "$checkouts"

# shellcheck disable=SC2046
check "removing every item succeeds" agents_in "$proj" remove $(grep -v '^#' "$proj/.agents/preset.txt")
check "removing every item leaves the project as it was" test "$(ls -A "$proj")" = ".git"
check "removing every item drops the project from the update list" gone "$checkouts"
check "removing every item removes the exclude block" not grep -q 'agents-preset' "$proj/.git/info/exclude"
check "removing every item keeps the owner's exclude lines" grep -qxF owner-line "$proj/.git/info/exclude"
check "removing every item leaves git status empty" clean "$proj"

echo "== uninstall"
rm -rf "$HOME/.agents/local/projects"
check "uninstall succeeds" run_install --uninstall
check "uninstall leaves no files" test -z "$(find "$HOME" "$AGENTS_BIN_DIR" \( -type f -o -type l \) 2>/dev/null)"

echo
if [ "$FAILURES" -gt 0 ]; then echo "$FAILURES check(s) failed"; exit 1; fi
echo "smoke test passed"
