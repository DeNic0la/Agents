// The stop switch (CW-84) as the issues see it: which platform session belongs to which
// issue's open session request, and what the dispatcher records on the issue once the
// stop has ended it. Pure: the sessions and views come from the caller.
'use strict';

const { Plan } = require('./plan');
const { costRecord } = require('./spend');
const { toNeedsAnswer } = require('./index');

const usd = (n) => `$${Number(n || 0).toFixed(2)}`;
// Clocks of GitHub's runner and the platform may differ a little.
const CLOCK_SKEW_MS = 5 * 60 * 1000;

// The platform sessions started for an issue's open request. A session job names the
// request in the session's metadata (`request`: the request's time, record.session.at), so
// a session of an earlier request, already recorded, never matches. A session without it
// counts when its issue and role match and it was created after the request.
// `sessions`: [{ id, issue, role, request, createdAt }].
function sessionsFor(number, request, sessions) {
  const since = Date.parse(request.at || 0) - CLOCK_SKEW_MS;
  return sessions.filter((s) => String(s.issue) === String(number) && s.role === request.role
    && (s.request ? s.request === request.at : !(Date.parse(s.createdAt) < since)));
}

// CW-84, CW-85: the issue's comment after the stop. Each session's cost is recorded (one
// ledger entry for all of them) and the request is cleared, so resuming starts the agent
// again without counting a failure (CW-16 counts only runs that ended on their own).
// A session that could not be confirmed stopped, or a stop that could not check the
// platform (`unchecked`), sends the issue to the owner instead: an automatic restart could
// run a second paid session next to it.
// `ended`: [{ id, link, costUsd, running }] from sessionsFor, after the interrupt.
function stoppedPlan(view, record, ended, { unchecked = false } = {}) {
  const plan = new Plan(view.number, view.labels);
  const role = record.session.role;
  const cost = ended.reduce((sum, s) => sum + Number(s.costUsd || 0), 0);
  if (!ended.length && !unchecked) plan.say.push(`The owner's stop switch ended the ${role} session run before its session started.`);
  for (const s of ended) {
    plan.say.push(s.running
      ? `The owner's stop switch interrupted the ${role} session [${s.id}](${s.link}), but it could not be confirmed stopped. It has cost ${usd(s.costUsd)} so far.`
      : `The owner's stop switch ended the ${role} session [${s.id}](${s.link}). It cost ${usd(s.costUsd)}.`);
  }
  plan.remember({ ...costRecord(record, role, cost), session: null });
  if (view.state === 'closed') {
    // CW-43: the record agent's issue is closed and waits for no one (D116).
    const doubt = unchecked || ended.some((s) => s.running);
    plan.say.push(doubt
      ? 'Its result is not applied. Check the platform and stop the session there if it still runs.'
      : 'Its result is not applied. When the owner resumes, a dispatch run that looks at this issue starts the record agent again.');
  } else if (unchecked) {
    toNeedsAnswer(plan, plan.state, `the stop switch had no platform key to find and stop the ${role} session; check the platform and stop it there`, 'The stop switch cancelled the session run.');
  } else if (ended.some((s) => s.running)) {
    toNeedsAnswer(plan, plan.state, `the ${role} session could not be confirmed stopped; check it at its link and stop it there`, 'Its result is not applied.');
  } else {
    plan.say.push('Its result is not applied. When the owner resumes, the agent for the state starts again.');
  }
  return plan;
}

module.exports = { sessionsFor, stoppedPlan, CLOCK_SKEW_MS };
