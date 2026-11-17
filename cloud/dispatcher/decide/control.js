// The stop switch (CW-84) as the issues see it: which platform session belongs to which
// issue's open session request, and what the dispatcher records on the issue once the
// stop has ended it. Pure: the sessions and views come from the caller.
'use strict';

const { Plan } = require('./plan');
const { costRecord } = require('./spend');

const usd = (n) => `$${Number(n || 0).toFixed(2)}`;
// Clocks of GitHub's runner and the platform may differ a little.
const CLOCK_SKEW_MS = 5 * 60 * 1000;

// The platform sessions started for an issue's open request: same issue and role in the
// session metadata, created after the request (record.session.at) was written.
// `sessions`: [{ id, issue, role, createdAt }].
function sessionsFor(number, request, sessions) {
  const since = Date.parse(request.at || 0) - CLOCK_SKEW_MS;
  return sessions.filter((s) => String(s.issue) === String(number) && s.role === request.role
    && !(Date.parse(s.createdAt) < since));
}

// CW-84, CW-85: the issue's comment after the stop. Each session's cost is recorded (one
// ledger entry for all of them) and the request is cleared, so resuming starts the agent
// again without counting a failure (CW-16 counts only runs that ended on their own).
// `ended`: [{ id, link, costUsd, running }] from sessionsFor, after the interrupt.
function stoppedPlan(view, record, ended) {
  const plan = new Plan(view.number, view.labels);
  const role = record.session.role;
  const cost = ended.reduce((sum, s) => sum + Number(s.costUsd || 0), 0);
  if (!ended.length) plan.say.push(`The owner's stop switch ended the ${role} session run before its session started.`);
  for (const s of ended) {
    plan.say.push(s.running
      ? `The owner's stop switch interrupted the ${role} session [${s.id}](${s.link}), but it could not be confirmed stopped; check it at its link and stop it there. It has cost ${usd(s.costUsd)} so far.`
      : `The owner's stop switch ended the ${role} session [${s.id}](${s.link}). It cost ${usd(s.costUsd)}.`);
  }
  plan.say.push('Its result is not applied. When the owner resumes, the agent for the state starts again.');
  plan.remember({ ...costRecord(record, role, cost), session: null });
  return plan;
}

module.exports = { sessionsFor, stoppedPlan, CLOCK_SKEW_MS };
