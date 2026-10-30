#!/usr/bin/env node
// Prints open, unassigned work as "key<TAB>title<TAB>spec|ready|triage",
// specs first, then bugs, then lowest number first. An issue qualifies at one stage:
// - spec: a parent (it has sub-issues, or another issue names it as its parent)
//   whose children are all closed, so it is due for verification.
// - ready: it has the READY label.
// - triage: a BUG with the TRIAGE label.
// On GitHub, specs and triage bugs qualify only when filed by the repo's owner, a member
// or a collaborator (a stranger's issue waits for a human). Drops issues with an open
// blocker (native, or a "Blocked by:" line) and specs with open children.
// The key is the GitHub issue number, or the issue file's path relative to the working
// directory for a local Markdown tracker.
// Usage: next-issue.mjs [--local ISSUES_DIR] READY BUG TRIAGE
// Reads only: GitHub issues through `gh api`, or the files in ISSUES_DIR. Writes nothing.
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const TEAM = ["OWNER", "MEMBER", "COLLABORATOR"];

const key = (issue) => issue.localPath ?? issue.number;
const parents = (issue) => issue.parents ?? [...(issue.body ?? "").matchAll(/## Parent\s+#(\d+)/g)].map((m) => Number(m[1]));

const blockers = (issue) =>
  issue.blockers ?? (issue.body ?? "").split("\n").filter((l) => l.startsWith("Blocked by:")).flatMap((l) => [...l.matchAll(/#(\d+)/g)].map((m) => Number(m[1])));

export function pick(issues, ready, bug, triage) {
  issues = issues.filter((i) => !("pull_request" in i));
  const open = new Set(issues.filter((i) => i.state === "open").map(key));
  const children = new Map();
  for (const i of issues) for (const p of parents(i)) children.set(p, [...(children.get(p) ?? []), i]);
  const labelled = (i, name) => i.labels.some((l) => l.name === name);

  const stageOf = (i) => {
    const team = TEAM.includes(i.author_association);
    const subs = i.sub_issues_summary ?? {};
    if ((subs.total ?? 0) > 0 || children.has(key(i))) {
      const done = (subs.completed ?? 0) === (subs.total ?? 0) && !(children.get(key(i)) ?? []).some((c) => c.state === "open");
      return done && team ? "spec" : null;
    }
    if (labelled(i, ready)) return "ready";
    if (labelled(i, bug) && labelled(i, triage) && team) return "triage";
    return null;
  };
  const rank = (i) => (i.stage === "spec" ? 0 : labelled(i, bug) ? 1 : 2);

  return issues
    .map((i) => ({ ...i, stage: stageOf(i) }))
    .filter((i) =>
      i.stage && i.state === "open" &&
      i.assignees.length === 0 &&
      !(i.issue_dependencies_summary?.blocked_by > 0) &&
      !blockers(i).some((n) => open.has(n)))
    .sort((a, b) => rank(a) - rank(b) || a.number - b.number || String(key(a)).localeCompare(String(key(b))));
}

// Reads simple YAML frontmatter: "key: value", "key: [a, b]", or "key:" followed by "- item" lines.
export function frontmatter(text) {
  const match = text.replace(/\r\n/g, "\n").match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
  const fields = {};
  if (!match) return fields;
  let list = null;
  for (const line of match[1].split("\n")) {
    const item = line.match(/^\s*-\s+(.*)$/);
    if (item && list) { list.push(unquote(item[1])); continue; }
    const field = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (!field) { list = null; continue; }
    const [, name, raw] = field;
    const value = raw.trim();
    if (value === "") { list = fields[name.toLowerCase()] = []; continue; }
    list = null;
    fields[name.toLowerCase()] = value.startsWith("[") && value.endsWith("]")
      ? value.slice(1, -1).split(",").map(unquote).filter(Boolean)
      : unquote(value);
  }
  return fields;
}

const unquote = (value) => value.trim().replace(/^(["'])(.*)\1$/, "$2").trim();
const asList = (value) => (Array.isArray(value) ? value : value ? String(value).split(",").map(unquote).filter(Boolean) : []);
const ids = (value, path, name) => asList(value).map((entry) => {
  const id = entry.match(/^#?(\d+)$/);
  if (!id) throw new Error(`Invalid ${name} "${entry}" in ${path}`);
  return Number(id[1]);
});

// A local tracker is one folder of "<id>-<slug>.md" files with frontmatter
// (title, status, labels, assignee, parent, blocked-by), as the issue-tracker recipe defines.
export function loadLocal(dir, cwd = process.cwd()) {
  dir = resolve(dir);
  const byId = new Map();
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const match = entry.name.match(/^(\d+)-.+\.md$/);
    if (!entry.isFile() || !match) continue;
    const number = Number(match[1]);
    const path = join(dir, entry.name);
    if (byId.has(number)) throw new Error(`Duplicate issue ${number} in ${dir}`);
    const body = readFileSync(path, "utf8");
    const fields = frontmatter(body);
    const localPath = relative(cwd, path);
    const status = String(fields.status ?? "open").toLowerCase();
    byId.set(number, {
      localPath, number, body,
      title: String(fields.title || body.match(/^#\s+(.+)/m)?.[1] || entry.name).trim(),
      state: status === "closed" ? "closed" : "open",
      labels: asList(fields.labels).map((name) => ({ name })),
      assignees: asList(fields.assignee),
      author_association: "OWNER",
      parentIds: ids(fields.parent, localPath, "parent"),
      blockerIds: ids(fields["blocked-by"], localPath, "blocked-by"),
    });
  }
  const pathOf = (id, issue, name) => {
    const target = byId.get(id);
    if (!target) throw new Error(`Missing ${name} ${id} in ${issue.localPath}`);
    return target.localPath;
  };
  return [...byId.values()].map(({ parentIds, blockerIds, ...issue }) => ({
    ...issue,
    parents: parentIds.map((id) => pathOf(id, issue, "parent")),
    blockers: blockerIds.map((id) => pathOf(id, issue, "blocker")),
  }));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const local = args[0] === "--local";
  const dir = local ? args.splice(0, 2)[1] : null;
  if (args.length !== 3 || (local && !dir?.trim())) {
    console.error("usage: next-issue.mjs [--local ISSUES_DIR] READY BUG TRIAGE");
    process.exit(1);
  }
  try {
    const issues = local ? loadLocal(dir) : JSON.parse(execFileSync("gh", ["api", "repos/{owner}/{repo}/issues?state=all&per_page=100", "--paginate", "--slurp"], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 })).flat();
    for (const i of pick(issues, ...args)) console.log(`${key(i)}\t${i.title.replace(/[\t\r\n]/g, " ")}\t${i.stage}`);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
