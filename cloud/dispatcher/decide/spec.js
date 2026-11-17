// The marked section of an issue body: the only part agents write (CW-8). The rest is
// what the issue asks for.
'use strict';

const crypto = require('crypto');

const SPEC_START = '<!-- spec:start -->';
const SPEC_END = '<!-- spec:end -->';

const normalize = (text) => String(text || '').replace(/\r\n/g, '\n').trim();

function splitBody(body) {
  const text = String(body || '');
  const start = text.indexOf(SPEC_START);
  if (start < 0) return { ask: normalize(text), spec: null };
  const end = text.indexOf(SPEC_END, start);
  const stop = end < 0 ? text.length : end + SPEC_END.length;
  return {
    ask: normalize(text.slice(0, start) + text.slice(stop)),
    spec: normalize(text.slice(start + SPEC_START.length, end < 0 ? text.length : end)),
  };
}

// The body with `spec` in its marked section. Everything outside the section stays as it
// is, character for character (CW-8), so the ask's digest doesn't change.
function withSpec(body, spec) {
  const text = String(body || '');
  const section = `${SPEC_START}\n${String(spec).trim()}\n${SPEC_END}`;
  const start = text.indexOf(SPEC_START);
  if (start < 0) {
    const gap = text === '' || text.endsWith('\n\n') ? '' : text.endsWith('\n') ? '\n' : '\n\n';
    return `${text}${gap}${section}\n`;
  }
  const end = text.indexOf(SPEC_END, start);
  const stop = end < 0 ? text.length : end + SPEC_END.length;
  return text.slice(0, start) + section + text.slice(stop);
}

const digest = (text) => crypto.createHash('sha256').update(normalize(text)).digest('hex').slice(0, 16);

// "Depends on #12" lines in the marked section (Definition of Ready, item 6).
function dependsOn(spec) {
  const out = new Set();
  for (const m of String(spec || '').matchAll(/^\s*[-*]?\s*Depends on #(\d+)\b/gim)) out.add(Number(m[1]));
  return [...out].sort((a, b) => a - b);
}

const CLOSING = /\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?):?\s+(#\d+\b|[\w.-]+\/[\w.-]+#\d+\b|https?:\/\/\S+\/(?:issues|pull)\/\d+\b)/gi;

// "Closes #12" and its GitHub synonyms in a pull request body.
function closingIssues(body) {
  const out = new Set();
  for (const m of String(body || '').matchAll(CLOSING)) if (m[1].startsWith('#')) out.add(Number(m[1].slice(1)));
  return [...out].sort((a, b) => a - b);
}

// Closing references GitHub also follows that name an issue by repository or URL
// ("Fixes o/r#8", "Closes https://github.com/o/r/issues/8"). The merge gate can't tell
// which issue they close, so a body with one names no single issue (D85).
function qualifiedClosing(body) {
  return [...String(body || '').matchAll(CLOSING)].map((m) => m[1]).filter((ref) => !ref.startsWith('#'));
}

module.exports = { SPEC_START, SPEC_END, splitBody, withSpec, digest, dependsOn, closingIssues, qualifiedClosing };
