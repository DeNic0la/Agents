// Hidden markers in the dispatcher's own comments hold what labels can't: where an
// issue waits from, the triage result, the approved spec. Markers count only in
// comments the dispatcher wrote.
'use strict';

const { actorKind } = require('./actors');

const RECORD_RE = /<!-- dispatcher-record (\{[\s\S]*?\}) -->/g;
const DRY_RUN_RE = /<!-- dispatcher-dry-run ([0-9a-f]+) -->/;

// '>' only occurs inside JSON strings, where > is the same character, so the
// marker can never close the HTML comment early.
const formatRecord = (data) => `<!-- dispatcher-record ${JSON.stringify(data).replace(/>/g, '\\u003e')} -->`;
const formatDryRun = (hash) => `<!-- dispatcher-dry-run ${hash} -->`;
// Text the dispatcher quotes (an agent's words, an error) can never read as a marker or
// hide behind an HTML comment: `<!--` shows as written.
const neutralizeMarkers = (text) => String(text).replace(/<!--/g, '<\\!--');

// The last marker: the dispatcher appends its record after everything it quotes.
function parseRecord(body) {
  const all = [...String(body || '').matchAll(RECORD_RE)];
  if (!all.length) return null;
  try {
    const data = JSON.parse(all[all.length - 1][1]);
    return data && typeof data === 'object' && !Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

// Folds every record marker of the dispatcher's comments, oldest first. A null value
// deletes the key. `at` maps each key to the timeline index of the comment that set it.
function readRecord(timeline, settings) {
  const record = {};
  const at = {};
  let lastDryRun = null;
  timeline.forEach((e, i) => {
    if (e.type !== 'commented' || actorKind(e.actor, settings) !== 'dispatcher') return;
    const data = parseRecord(e.body);
    if (data) {
      for (const [k, v] of Object.entries(data)) {
        if (v === null) delete record[k];
        else record[k] = v;
        at[k] = i;
      }
    }
    const dry = DRY_RUN_RE.exec(e.body || '');
    if (dry) lastDryRun = dry[1];
  });
  return { record, at, lastDryRun };
}

module.exports = { formatRecord, formatDryRun, parseRecord, readRecord, neutralizeMarkers };
