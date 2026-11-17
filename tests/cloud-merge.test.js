// Tests for the implementation's pull request and the agent's merge:
// cloud/dispatcher/decide/merge.js and cloud/dispatcher/merge-cli.js.
// Run: node --test "tests/*.test.js"
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const req = (p) => require(path.join(__dirname, '..', 'cloud/dispatcher', p));
const { branchName, pullBody, pullToReuse, mergeClassCheck, mergeVerdict, closingComment } = req('decide/merge.js');
const { runMerge } = req('merge-cli.js');
const { formatRecord, readRecord } = req('decide/markers.js');

const settings = {
  owner: 'owner', agentLogin: 'agents[bot]', dispatcherLogin: 'github-actions[bot]',
  typoSizeLines: 10, bigChange: { lines: 400, files: 15 },
};
const DOCS = [{ path: 'docs/a.md', status: 'modified', additions: 2, deletions: 1, executable: false }];

// ---- the pull request body ------------------------------------------------------------

test('CW-50: one branch per issue', () => {
  assert.equal(branchName(7), 'cloud/issue-7');
});

test('CW-51: the body closes its issue and carries the merge class', () => {
  assert.deepEqual(pullBody('Adds a flag.', 7, 'merge:agent'), { ok: true, body: 'Adds a flag.\n\nMerge class: merge:agent\n\nCloses #7' });
  assert.equal(pullBody('Adds a flag.\n\nFixes #7', 7, null).body, 'Adds a flag.\n\nFixes #7');
  assert.equal(pullBody('Done.\n\nMerge class: merge:self\n\nCloses #7', 7, 'merge:self').body, 'Done.\n\nMerge class: merge:self\n\nCloses #7');
  const other = pullBody('Done.\n\nCloses #8', 7, 'merge:self');
  assert.equal(other.ok, false);
  assert.match(other.error, /closes #8; it may close only #7/);
});

test('CW-55: a continuing session reuses the open pull request, else the newest one closed unmerged', () => {
  assert.equal(pullToReuse([]), null);
  assert.equal(pullToReuse([{ number: 3, state: 'closed', merged_at: null }, { number: 5, state: 'open' }]).number, 5);
  assert.equal(pullToReuse([{ number: 3, state: 'closed', merged_at: null }, { number: 4, state: 'closed', merged_at: null }]).number, 4);
  assert.equal(pullToReuse([{ number: 3, state: 'closed', merged_at: '2026-11-01T00:00:00Z' }]), null);
});

// ---- the merge class on each push ------------------------------------------------------

test('CW-62: the class is raised from the changed paths and never lowered', () => {
  const raised = mergeClassCheck(new Set(['merge:self']), { files: [{ path: 'cloud/settings.json', status: 'modified', additions: 1, deletions: 1 }] }, settings);
  assert.equal(raised.effective, 'merge:human');
  assert.equal(raised.raised, true);
  assert.ok(raised.reasons.length);
  const kept = mergeClassCheck(['merge:agent'], { files: DOCS }, settings);
  assert.equal(kept.effective, 'merge:agent');
  assert.equal(kept.raised, false);
  const unlabeled = mergeClassCheck([], { files: DOCS }, settings);
  assert.equal(unlabeled.now, null);
  assert.equal(unlabeled.raised, true);
});

// ---- the merge verdict -----------------------------------------------------------------

const pr = (over = {}) => ({ number: 9, author: 'agents[bot]', draft: false, headSha: 'sha1', body: 'Done.\n\nCloses #7', mergeable: true, mergeableState: 'clean', ...over });
const issue = (labels = ['merge:self'], record = { mergeCheck: { sha: 'sha1', merge: 'merge:self' } }, over = {}) => ({ number: 7, state: 'open', labels: ['in-review', ...labels], record, ...over });
const green = { checkRuns: [{ id: 1, name: 'ci', status: 'completed', conclusion: 'success' }], statuses: [{ context: 'merge-gate', state: 'success' }, { context: 'owner-merge', state: 'success' }] };
const verdict = (over = {}) => mergeVerdict({ pr: pr(), issue: issue(), ...green, settings, ...over });

test('CW-63: merge:self with the confirmed class, green ci and both gate statuses merges', () => {
  assert.deepEqual(verdict(), { action: 'merge', mergeClass: 'merge:self' });
  const reviewed = issue(['merge:agent'], { review: { sha: 'sha1', verdict: 'approved' } });
  assert.deepEqual(verdict({ issue: reviewed }), { action: 'merge', mergeClass: 'merge:agent' });
});

test('CW-65: pull requests that are not the agent\'s to merge are skipped', () => {
  assert.equal(verdict({ pr: pr({ author: 'owner' }) }).action, 'skip');
  assert.equal(verdict({ issue: null }).action, 'skip');
  assert.equal(verdict({ issue: issue(undefined, undefined, { state: 'closed' }) }).action, 'skip');
  const human = verdict({ issue: issue(['merge:human']) });
  assert.equal(human.action, 'skip');
  assert.match(human.why, /merge:human/);
  // Two classes: the highest counts (CW-67).
  assert.equal(verdict({ issue: issue(['merge:self', 'merge:human']) }).action, 'skip');
});

test('CW-63: the merge waits for every condition', () => {
  const why = (over) => {
    const v = verdict(over);
    assert.equal(v.action, 'wait');
    return v.why;
  };
  assert.match(why({ stopped: true }), /CLOUD_STOPPED/);
  assert.match(why({ pr: pr({ draft: true }) }), /draft/);
  assert.match(why({ issue: { ...issue(), labels: ['merge:self', 'in-progress'] } }), /not `in-review`/);
  assert.match(why({ issue: issue(['merge:self', 'paused']) }), /paused/);
  assert.match(why({ issue: issue(['merge:self'], {}) }), /^merge-gate: /);
  assert.match(why({ pr: pr({ mergeable: null, mergeableState: 'unknown' }) }), /not yet computed/);
  assert.match(why({ checkRuns: [] }), /no `ci` check/);
  assert.match(why({ checkRuns: [{ id: 1, name: 'ci', status: 'in_progress', conclusion: null }] }), /still running/);
  assert.match(why({ checkRuns: [{ id: 1, name: 'ci', status: 'completed', conclusion: 'failure' }] }), /ended with failure/);
  assert.match(why({ statuses: [{ context: 'merge-gate', state: 'success' }] }), /`owner-merge` status at the head commit is missing/);
  assert.match(why({ statuses: [{ context: 'merge-gate', state: 'pending' }, { context: 'owner-merge', state: 'success' }] }), /`merge-gate` status .* is pending/);
});

test('D75: the newest ci run counts, and other checks are ignored', () => {
  const runs = [
    { id: 1, name: 'ci', status: 'completed', conclusion: 'failure' },
    { id: 2, name: 'ci', status: 'completed', conclusion: 'success' },
    { id: 3, name: 'claude-review', status: 'completed', conclusion: 'failure' },
  ];
  assert.equal(verdict({ checkRuns: runs }).action, 'merge');
  assert.equal(verdict({ checkRuns: [runs[1], { ...runs[0], id: 4 }] }).action, 'wait');
});

test('CW-55, D79: a conflict goes back to the implement agent; a branch only behind still merges', () => {
  assert.equal(verdict({ pr: pr({ mergeable: false, mergeableState: 'dirty' }) }).action, 'conflict');
  assert.equal(verdict({ pr: pr({ mergeableState: 'behind' }) }).action, 'merge');
});

test('CW-69: the closing comment names who merged, the cost and the issues filed', () => {
  const text = closingComment({ pull: 9, title: 'Add --dry-run', by: 'agent', record: { totalUsd: 1.234, filed: [12, 13] } });
  assert.match(text, /Merged #9 \(Add --dry-run\) as the agent/);
  assert.match(text, /\$1\.23/);
  assert.match(text, /#12, #13/);
  assert.match(closingComment({ pull: 9, by: 'owner' }), /by the owner[\s\S]*\$0\.00[\s\S]*none/);
});

// ---- the merge job ---------------------------------------------------------------------

function fakeRepo({ pulls, issueLabels = ['in-review', 'merge:self'], record = { mergeCheck: { sha: 'sha1', merge: 'merge:self' }, totalUsd: 2 }, mergeFails = false } = {}) {
  const writes = [];
  const list = pulls || [{ number: 9, title: 'Add --dry-run', user: { login: 'agents[bot]' }, draft: false, head: { sha: 'sha1' }, body: 'Done.\n\nCloses #7', mergeable: true, mergeable_state: 'clean' }];
  const gh = {
    repo: 'o/r',
    request: async (method, p, body) => {
      if (method === 'GET') {
        const pull = /\/pulls\/(\d+)$/.exec(p);
        if (pull) return list.find((x) => x.number === Number(pull[1]));
        if (p === '/repos/o/r/issues/7') return { number: 7, state: 'open', labels: issueLabels.map((name) => ({ name })) };
        if (p.endsWith('/check-runs?per_page=100')) return { check_runs: green.checkRuns };
        if (p.endsWith('/status')) return { statuses: green.statuses };
        throw Object.assign(new Error(`unexpected GET ${p}`), { status: 404 });
      }
      writes.push({ who: 'gh', method, path: p, body });
      return {};
    },
    paginate: async (p) => {
      if (p.endsWith('/pulls?state=open')) return list;
      if (p.endsWith('/issues/7/comments')) return [{ user: { login: 'github-actions[bot]' }, body: `Ready.\n\n${formatRecord({ state: 'in-review', ...record })}` }];
      throw new Error(`unexpected paginate ${p}`);
    },
  };
  const agent = {
    repo: 'o/r',
    request: async (method, p, body) => {
      writes.push({ who: 'agent', method, path: p, body });
      if (method === 'PUT' && mergeFails) throw new Error('Head branch was modified');
      return method === 'PUT' ? { sha: 'merge123456', merged: true } : {};
    },
  };
  const mints = [];
  const deps = {
    gh, settings, live: true, now: () => new Date('2026-11-17T10:00:00Z'), log: () => {},
    mint: async () => { mints.push(1); return 'ghs_x'; },
    agentClient: async () => agent,
  };
  return { deps, writes, mints };
}

test('CW-63, CW-69, D77: the agent merges at the checked commit, the dispatcher records it, the agent comments', async () => {
  const { deps, writes } = fakeRepo();
  assert.deepEqual(await runMerge(deps), [{ number: 9, action: 'merge', why: 'merge:self' }]);
  const put = writes.find((w) => w.method === 'PUT');
  assert.equal(put.who, 'agent');
  assert.deepEqual([put.path, put.body], ['/repos/o/r/pulls/9/merge', { sha: 'sha1', merge_method: 'merge' }]);
  const recorded = writes.find((w) => w.who === 'gh' && w.path.endsWith('/issues/7/comments'));
  assert.match(recorded.body.body, /The agent merged #9 \(`merge:self`\) at merge12/);
  const { record } = readRecord([{ type: 'commented', actor: 'github-actions[bot]', body: recorded.body.body }], settings);
  assert.deepEqual(record.merged, { pull: 9, sha: 'merge123456', by: 'agent', at: '2026-11-17T10:00:00.000Z' });
  const closing = writes.find((w) => w.who === 'agent' && w.method === 'POST');
  assert.equal(closing.path, '/repos/o/r/issues/7/comments');
  assert.match(closing.body.body, /as the agent[\s\S]*\$2\.00/);
});

test('D83: a dry run only reports', async () => {
  const { deps, writes, mints } = fakeRepo();
  assert.equal((await runMerge({ ...deps, live: false }))[0].action, 'merge');
  assert.equal(writes.length, 0);
  assert.equal(mints.length, 0);
});

test('CW-65: pull requests by others are not even looked at, and merge:human waits for the owner', async () => {
  const owners = fakeRepo({ pulls: [{ number: 4, user: { login: 'owner' }, head: { sha: 's' } }] });
  assert.deepEqual(await runMerge(owners.deps), []);
  const human = fakeRepo({ issueLabels: ['in-review', 'merge:human'] });
  assert.equal((await runMerge(human.deps))[0].action, 'skip');
  assert.equal(human.writes.length, 0);
});

test('D79: a conflict asks the dispatcher to move the issue', async () => {
  const { deps, writes, mints } = fakeRepo({ pulls: [{ number: 9, user: { login: 'agents[bot]' }, head: { sha: 'sha1' }, body: 'Closes #7', mergeable: false, mergeable_state: 'dirty' }] });
  assert.equal((await runMerge(deps))[0].action, 'conflict');
  const dispatch = writes.find((w) => w.path.includes('/actions/workflows/'));
  assert.equal(dispatch.who, 'gh');
  assert.match(dispatch.path, /dispatch\.yml\/dispatches$/);
  assert.equal(dispatch.body.inputs.issue, '7');
  assert.equal(mints.length, 0);
});

test('CW-63: a refused merge is reported as waiting and records nothing', async () => {
  const { deps, writes } = fakeRepo({ mergeFails: true });
  const [row] = await runMerge(deps);
  assert.equal(row.action, 'wait');
  assert.match(row.why, /Head branch was modified/);
  assert.ok(!writes.some((w) => w.who === 'gh' || (w.who === 'agent' && w.method === 'POST')));
});
