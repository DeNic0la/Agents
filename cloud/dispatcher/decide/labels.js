// Label names the rules work with. cloud/labels.json holds the same names with
// colors and descriptions; tests/cloud-labels.test.js keeps the two in step.
'use strict';

// Life order: repairs fall back to the earliest of several (U1).
const STATES = ['triage', 'refining', 'needs-answer', 'needs-approval', 'ready', 'in-progress', 'in-review'];
const ORIGIN = { owner: 'origin:owner', agent: 'origin:agent', external: 'origin:external' };
const ORIGINS = Object.values(ORIGIN);
// Ascending: the later one is more process, or a higher class.
const ROUTES = ['route:direct', 'route:lean', 'route:full'];
const MERGES = ['merge:self', 'merge:agent', 'merge:human'];
const APPROVED = 'approved';
const OBJECTION = 'objection';
const BUDGET_EXTEND = 'budget:extend';
const PAUSED = 'paused';

const ALL = [...STATES, ...ORIGINS, ...ROUTES, ...MERGES, APPROVED, OBJECTION, BUDGET_EXTEND, PAUSED];

const routeOf = (label) => (ROUTES.includes(label) ? label.slice('route:'.length) : null);

module.exports = { STATES, ORIGIN, ORIGINS, ROUTES, MERGES, APPROVED, OBJECTION, BUDGET_EXTEND, PAUSED, ALL, routeOf };
