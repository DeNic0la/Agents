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
gone() { [ ! -e "$1" ] && [ ! -L "$1" ]; }
no_line() { ! grep -qE "$1" "$TMP/out"; }
run_install() { bash "$TMP/repo/install.sh" "$@" > "$TMP/out" 2>&1; }
# Every line of the last install is "ok" (or the PATH note, or the summary).
all_ok() { run_install && ! grep -vqE '^(ok |note: |Done )' "$TMP/out"; }
agents_in() { (cd "$1" && shift && agents "$@") > "$TMP/out" 2>&1; }
# Paths and checksums of a project's files, to show that a command changed nothing.
snapshot() { (cd "$1" && find . -path ./.git -prune -o -type f -print | sort | xargs -r md5sum); }

# A copy without .git, so the test can change the preset.
mkdir "$TMP/repo"
tar -C "$REPO_DIR" --exclude=./.git -cf - . | tar -C "$TMP/repo" -xf -
export HOME="$TMP/home" AGENTS_BIN_DIR="$TMP/bin" PATH="$TMP/bin:$PATH"
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
proj="$TMP/project"
mkdir "$proj" && git -C "$proj" init -q
# The copy's preset was changed above, so only that check finishes is tested here.
check "agents check runs" eval 'agents_in "$proj" check; grep -qE "^(ok - |[0-9]+ problem)" "$TMP/out"'
check "add succeeds" agents_in "$proj" add "skills/$tailored" ${global:+"skills/$global"} "agents/$agent"
for f in .agents/preset.txt ".agents/recipes/skills/$tailored.md" ".claude/agents/$agent.md" \
         ".github/agents/$agent.agent.md" ".codex/agents/$agent.toml" ${global:+".agents/skills/$global/SKILL.md" ".claude/skills/$global/SKILL.md"}; do
  check "add creates $f" test -f "$proj/$f"
done
check "AGENTS.md has the managed block" grep -q '^<!-- agents-preset:start -->' "$proj/AGENTS.md"
check "CLAUDE.md imports AGENTS.md" grep -q '^@AGENTS.md' "$proj/CLAUDE.md"
before="$(snapshot "$proj")"
check "remove --dry-run succeeds" agents_in "$proj" remove --dry-run "agents/$agent"
check "remove --dry-run changes nothing" test "$before" = "$(snapshot "$proj")"
git -C "$proj" add -A && git -C "$proj" -c user.name=smoke -c user.email=smoke@example.invalid commit -qm setup
check "sync succeeds" agents_in "$proj" sync
check "sync changes nothing" test -z "$(git -C "$proj" status --porcelain)"
# shellcheck disable=SC2046
check "removing every item succeeds" agents_in "$proj" remove $(grep -v '^#' "$proj/.agents/preset.txt")
check "removing every item leaves the project as it was" test "$(ls -A "$proj")" = ".git"

echo "== uninstall"
check "uninstall succeeds" run_install --uninstall
check "uninstall leaves no files" test -z "$(find "$HOME" "$AGENTS_BIN_DIR" \( -type f -o -type l \) 2>/dev/null)"

echo
if [ "$FAILURES" -gt 0 ]; then echo "$FAILURES check(s) failed"; exit 1; fi
echo "smoke test passed"
