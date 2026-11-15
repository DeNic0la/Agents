#!/usr/bin/env node
// Collects this machine's agent setup, CLI versions, pending updates and Claude Code usage into
// one Markdown file for the upload-diagnostics skill. Aggregates only by default: no project
// names, session titles, file contents or env values. --detail adds project names and titles.
// Usage: node collect-diagnostics.js [--label <name>] [--out <file>] [--detail]
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const { spawnSync } = require('child_process');

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const detail = argv.includes('--detail');
const label = String(arg('--label', os.hostname()) || 'machine').replace(/[^\w.-]+/g, '-');
const date = new Date().toISOString().slice(0, 10);
const out = path.resolve(arg('--out', path.join(os.tmpdir(), `agents-diagnostics-${label}-${date}.md`)));
const home = os.homedir();
const win = process.platform === 'win32';
const claudeDir = process.env.CLAUDE_CONFIG_DIR || path.join(home, '.claude');
const codexDir = process.env.CODEX_HOME || path.join(home, '.codex');
const copilotDir = process.env.COPILOT_HOME || path.join(home, '.copilot');
const agentsDir = path.join(home, '.agents');
const tilde = p => p.split(home).join('~').replace(/\\/g, '/');
const lines = [], P = (...s) => lines.push(...s);

// shell: true only where Windows needs it to find .cmd shims (npm-installed CLIs); cmd.exe
// would mangle arguments such as git's %-formats.
function run(cmd, args, timeout = 15000, shell = false) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', timeout, shell: shell && win, windowsHide: true });
  if (r.error || r.status === null) return null;
  return { out: (r.stdout || '').trim(), err: (r.stderr || '').trim(), code: r.status };
}
const readJson = p => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } };
const list = d => { try { return fs.readdirSync(d); } catch { return []; } };
function linkInfo(p) {
  try {
    const st = fs.lstatSync(p);
    if (st.isSymbolicLink()) return 'link to ' + tilde(fs.readlinkSync(p));
    return st.isDirectory() ? 'folder' : 'file (not a link)';
  } catch { return 'missing'; }
}
function recentFiles(dir, days, ext) {
  let n = 0; const cut = Date.now() - days * 86400e3;
  (function walk(d) { for (const e of list(d)) { const p = path.join(d, e); let st; try { st = fs.statSync(p); } catch { continue; } if (st.isDirectory()) walk(p); else if (p.endsWith(ext) && st.mtimeMs >= cut) n++; } })(dir);
  return n;
}

P(`# Agent diagnostics: ${label}`, '', `Collected ${new Date().toISOString()} by collect-diagnostics.js, ${detail ? 'with --detail' : 'aggregates only'}.`, '');
P('## Machine', '', `- OS: ${os.type()} ${os.release()} (${process.platform}, ${os.arch()}), ${os.cpus().length} CPUs, ${Math.round(os.totalmem() / 2 ** 30)} GB memory`, '');

// ---- runtimes and CLIs --------------------------------------------------------------
P('## Runtimes and CLIs', '', '| Tool | Version |', '|---|---|');
for (const t of ['node', 'pnpm', 'npm', 'uv', 'python', 'python3', 'pwsh', 'bash', 'git', 'gh', 'jq', 'claude', 'codex', 'copilot', 'chatgpt']) {
  const r = run(t, ['--version'], 15000, true);
  let v = r ? (r.out || r.err).split('\n')[0].trim().slice(0, 80) : '';
  if (!r || r.code !== 0 || !v || /not (be )?found|not recognized|No such file|Microsoft Store|Run copilot in a terminal/i.test(v)) v = 'not found';
  P(`| ${t} | ${v} |`);
}
P('');

// ---- pending updates ----------------------------------------------------------------
P('## Pending updates', '');
const updates = [];
const RELEVANT = /claude|codex|copilot|chatgpt|openai|anthropic|github|\bgit\b|node|python|powershell/i;
if (win && run('winget', ['--version'])) {
  const w = run('winget', ['upgrade', '--accept-source-agreements'], 120000);
  for (const l of ((w && w.out) || '').split('\n')) if (RELEVANT.test(l) && /\d+\.\d+.*\d+\.\d+/.test(l)) updates.push('winget: ' + l.replace(/\s{2,}/g, '  ').trim());
}
if (!win && run('brew', ['--version'])) {
  const b = run('brew', ['outdated', '--verbose'], 120000);
  for (const l of ((b && b.out) || '').split('\n')) if (RELEVANT.test(l)) updates.push('brew: ' + l.trim());
}
// Global packages: pnpm is the preferred manager; npm may still hold older installs.
for (const [pm, args] of [['pnpm', ['outdated', '-g', '--format', 'json']], ['npm', ['outdated', '-g', '--json', '--depth=0']]]) {
  const r = run(pm, args, 60000, true);
  try { for (const [name, v] of Object.entries(JSON.parse((r && r.out) || '{}'))) updates.push(`${pm} global: ${name} ${v.current} -> ${v.latest}`); } catch {}
}
const uvSelf = run('uv', ['self', 'update', '--dry-run'], 30000);
if (uvSelf && /would update|Would update/i.test(uvSelf.out + uvSelf.err)) updates.push('uv: ' + (uvSelf.out + ' ' + uvSelf.err).trim().split('\n').pop());
P(...(updates.length ? updates.map(u => `- ${u}`) : ['- none found']), `- Claude Code's native installer updates itself; run \`claude update\` to check.`, '');

// ---- agents preset ------------------------------------------------------------------
P('## Agents preset', '');
P(`- ~/.claude/CLAUDE.md: ${linkInfo(path.join(claudeDir, 'CLAUDE.md'))}`);
P(`- ~/.claude/settings.json: ${linkInfo(path.join(claudeDir, 'settings.json'))}`);
P(`- ~/.agents: ${fs.existsSync(agentsDir) ? `concepts ${list(path.join(agentsDir, 'concepts')).length}, references ${list(path.join(agentsDir, 'references')).length}, skills ${list(path.join(agentsDir, 'skills')).length}` : 'missing'}`);
P(`- subagents: Claude ${list(path.join(claudeDir, 'agents')).filter(n => n.endsWith('.md')).length}, Codex ${list(path.join(codexDir, 'agents')).filter(n => n.endsWith('.toml')).length}, Copilot ${list(path.join(copilotDir, 'agents')).filter(n => n.endsWith('.md')).length}`);
P(`- agents command: ${fs.existsSync(path.join(home, '.local', 'bin', win ? 'agents.cmd' : 'agents')) ? 'installed' : 'missing'}`);
try {
  const repo = path.resolve(path.dirname(fs.realpathSync(path.join(claudeDir, 'CLAUDE.md'))), '..');
  const head = run('git', ['-C', repo, 'log', '-1', '--format=%h %cs %s']);
  const st = run('git', ['-C', repo, 'status', '-sb']);
  if (head && head.code === 0) {
    const sl = (st && st.out ? st.out.split('\n') : ['']);
    P(`- preset repo: ${head.out.slice(0, 90)} | ${sl[0].replace(/^## /, '')} (as of the last fetch) | ${sl.length - 1} uncommitted changes`);
  }
} catch {}
let agentSkills = 0, agentChars = 0, userSkills = 0;
for (const d of list(path.join(claudeDir, 'skills'))) {
  let t; try { t = fs.readFileSync(path.join(claudeDir, 'skills', d, 'SKILL.md'), 'utf8'); } catch { continue; }
  const fm = (t.match(/^---\r?\n([\s\S]*?)\r?\n---/) || [])[1] || '';
  if (/^disable-model-invocation:\s*true/m.test(fm)) { userSkills++; continue; }
  agentSkills++; agentChars += d.length + ((fm.match(/^description:\s*(.*)$/m) || [])[1] || '').length;
}
P(`- personal Claude skills: ${agentSkills} the agent may start (${agentChars} characters of names and descriptions in every session's listing), ${userSkills} user-invoked. Plugin skills aren't counted; \`/doctor\` estimates the whole listing.`, '');

// ---- Claude Code settings -------------------------------------------------------------
const s = readJson(path.join(claudeDir, 'settings.json')) || {};
const SAFE_ENV = /^(CLAUDE_CODE_(SUBAGENT_MODEL|SUBAGENT_MODEL_FORCE|EFFORT_LEVEL|AUTO_COMPACT_WINDOW|PROMPT_CACHE_TTL|SUBAGENT_PROMPT_CACHE_TTL|WORKFLOW_MAX_CONCURRENT_AGENTS)|USAGE_PACE_RESERVE|USAGE_SWITCH_ASK_TOKENS)$/;
const plugins = readJson(path.join(claudeDir, 'plugins', 'installed_plugins.json'));
const enabled = Object.entries(s.enabledPlugins || {});
P('## Claude Code settings', '');
P(`- model: ${s.model || 'default'}; per-model settings: ${JSON.stringify(s.modelSettings || {})}; autoCompactWindow: ${s.autoCompactWindow || 'default'}; permissions.defaultMode: ${(s.permissions || {}).defaultMode || 'default'}`);
P(`- env: ${Object.keys(s.env || {}).map(k => (SAFE_ENV.test(k) ? `${k}=${s.env[k]}` : `${k}=(value hidden)`)).join(', ') || 'none'}`);
P(`- status line: ${s.statusLine ? 'yes' : 'no'}; hooks on: ${Object.keys(s.hooks || {}).join(', ') || 'none'}; workflowSizeGuideline: ${s.workflowSizeGuideline || 'default'}; skipWorkflowUsageWarning: ${!!s.skipWorkflowUsageWarning}`);
P(`- plugins: ${plugins ? Object.keys(plugins.plugins || plugins).length : 0} installed; enabledPlugins: ${enabled.filter(([, v]) => v).length} on, ${enabled.filter(([, v]) => !v).length} off`);
const pace = readJson(path.join(claudeDir, 'usage-pace.json'));
if (pace && pace.seven_day) P(`- last plan-usage reading (${new Date(pace.updated_at * 1000).toISOString().slice(0, 16)}Z): week ${pace.seven_day.used}%, resets ${new Date(pace.seven_day.resets_at * 1000).toISOString().slice(0, 16)}Z${pace.five_hour ? `; 5h ${pace.five_hour.used}%` : ''}`);
P('');

// ---- Codex and Copilot ----------------------------------------------------------------
let cfg = ''; try { cfg = fs.readFileSync(path.join(codexDir, 'config.toml'), 'utf8'); } catch {}
const SHOW = /^(model|model_reasoning_effort|model_auto_compact_token_limit|approval_policy|sandbox_mode|default_subagent_model|default_subagent_reasoning_effort|max_threads)$/;
const shown = [...cfg.matchAll(/^\s*([A-Za-z0-9_.-]+)\s*=\s*(.+)$/gm)].filter(m => SHOW.test(m[1])).map(m => `${m[1]}=${m[2].trim()}`);
P('## Codex', '');
P(`- config.toml: ${cfg ? `${[...cfg.matchAll(/^\s*[A-Za-z0-9_.-]+\s*=/gm)].length} keys${shown.length ? '; ' + shown.join(', ') : ''}` : 'missing'}`);
P(`- ~/.codex/AGENTS.md: ${linkInfo(path.join(codexDir, 'AGENTS.md'))}; sessions in the last 30 days: ${recentFiles(path.join(codexDir, 'sessions'), 30, '.jsonl')}`, '');
P('## Copilot', '');
P(`- ~/.copilot: ${fs.existsSync(copilotDir) ? list(copilotDir).join(', ') || 'empty' : 'missing'}; copilot-instructions.md: ${linkInfo(path.join(copilotDir, 'copilot-instructions.md'))}`, '');

// ---- Claude Code usage ------------------------------------------------------------------
P('## Claude Code usage, last 30 days', '');
const ua = path.join(__dirname, '..', '..', 'usage-review', 'scripts', 'usage-analysis.js');
if (fs.existsSync(ua)) {
  const r = spawnSync(process.execPath, [ua, '--days', '30', ...(detail ? [] : ['--private'])], { encoding: 'utf8', timeout: 300000, windowsHide: true });
  P('```', ((r.stdout || '') + (r.stderr || '')).trim() || 'no output', '```');
} else P('- The usage-review skill\'s script isn\'t installed next to this skill.');

fs.writeFileSync(out, lines.join('\n') + '\n');
const sha = crypto.createHash('sha256').update(fs.readFileSync(out)).digest('hex');
console.log(`file: ${out}`);
console.log(`title: ${path.basename(out)}`);
console.log(`bytes: ${fs.statSync(out).size}`);
console.log(`base64Content: sha256:${sha}:${out.replace(/\\/g, '/')}`);
