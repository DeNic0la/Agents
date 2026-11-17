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

const digest = (text) => crypto.createHash('sha256').update(normalize(text)).digest('hex').slice(0, 16);

// "Depends on #12" lines in the marked section (Definition of Ready, item 6).
function dependsOn(spec) {
  const out = new Set();
  for (const m of String(spec || '').matchAll(/^\s*[-*]?\s*Depends on #(\d+)\b/gim)) out.add(Number(m[1]));
  return [...out].sort((a, b) => a - b);
}

// "Closes #12" and its GitHub synonyms in a pull request body.
function closingIssues(body) {
  const out = new Set();
  for (const m of String(body || '').matchAll(/\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)\b/gi)) out.add(Number(m[1]));
  return [...out].sort((a, b) => a - b);
}

module.exports = { SPEC_START, SPEC_END, splitBody, digest, dependsOn, closingIssues };
