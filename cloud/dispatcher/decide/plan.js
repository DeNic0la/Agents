// What one dispatcher run does to one issue: label changes, one comment, a record
// update and at most one session start. Rules change a working copy of the labels,
// so a later rule sees what an earlier one decided.
'use strict';

const { STATES } = require('./labels');

class Plan {
  constructor(number, labels) {
    this.number = number;
    this.labels = new Set(labels);
    this.add = [];
    this.remove = [];
    this.say = []; // lines of the one comment this run posts
    this.notes = []; // why nothing started; shown in dry runs only
    this.record = {}; // hidden marker data; null deletes a key
    this.start = null; // { role, limitUsd }
  }

  has(label) {
    return this.labels.has(label);
  }

  addLabel(label) {
    if (this.labels.has(label)) return;
    this.labels.add(label);
    const i = this.remove.indexOf(label);
    if (i >= 0) this.remove.splice(i, 1);
    else this.add.push(label);
  }

  removeLabel(label) {
    if (!this.labels.has(label)) return;
    this.labels.delete(label);
    const i = this.add.indexOf(label);
    if (i >= 0) this.add.splice(i, 1);
    else this.remove.push(label);
  }

  get state() {
    return STATES.find((s) => this.labels.has(s)) || null;
  }

  setState(state) {
    for (const s of STATES) if (s !== state) this.removeLabel(s);
    this.addLabel(state);
    this.record.state = state;
  }

  remember(data) {
    Object.assign(this.record, data);
  }

  get isEmpty() {
    return !this.add.length && !this.remove.length && !this.say.length && !this.start && !Object.keys(this.record).length;
  }

  // What a dry run reports: everything but the record, which only a live run writes.
  get visible() {
    return { add: this.add, remove: this.remove, say: this.say, start: this.start, notes: this.notes };
  }
}

module.exports = { Plan };
