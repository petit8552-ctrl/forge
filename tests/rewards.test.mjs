// Tests des récompenses.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { badges, newBadges, weekStreak } from '../js/rewards.js';

const prog = (date, week, dayIndex, sets = [[60, 10]], id = 'bench') => ({ week, dayIndex, date, exercises: [{ id, sets: sets.map(([w, r]) => ({ w, r, done: true })) }] });
const libre = (date, place, goal = 'cardio') => ({ type: 'libre', place, goal, minutes: 30, date, exercises: [] });
const earned = (h, p) => new Set(badges(h, p).filter((b) => b.earned).map((b) => b.id));

test('série : semaines consécutives, la semaine en cours ne casse pas la série', () => {
  const now = new Date('2026-11-12T12:00:00'); // jeudi
  const h = [libre('2026-10-27T10:00:00', 'plage'), libre('2026-11-03T10:00:00', 'plage')]; // 2 semaines passées
  assert.equal(weekStreak(h, now), 2);
  assert.equal(weekStreak([...h, libre('2026-11-10T10:00:00', 'plage')], now), 3);
  assert.equal(weekStreak([libre('2026-10-20T10:00:00', 'plage')], now), 0);
});

test('première séance, lieux et record', () => {
  const p = { days: [0, 2] };
  const h = [prog('2026-11-02T18:00:00', 1, 0, [[60, 10]]), prog('2026-11-04T18:00:00', 1, 1, [[62.5, 10]]), libre('2026-11-05T08:00:00', 'plage')];
  const e = earned(h, p);
  for (const id of ['first', 'records-1', 'beach', 'perfect-1']) assert.ok(e.has(id), id);
  assert.ok(!e.has('outdoor'));
});

test('une séance sans aucune série validée ne compte pas', () => {
  const h = [{ week: 1, dayIndex: 0, date: '2026-11-02T18:00:00', exercises: [{ id: 'bench', sets: [{ w: 60, r: 10, done: false }] }] }];
  assert.ok(!earned(h, { days: [0, 2] }).has('first'));
});

test('tractions assistées ne débloquent pas « Première traction »', () => {
  assert.ok(!earned([prog('2026-11-02T18:00:00', 1, 0, [[30, 8]], 'assisted-pullup')], { days: [0] }).has('pullup'));
  assert.ok(earned([prog('2026-11-02T18:00:00', 1, 0, [[0.5, 3]], 'pullup')], { days: [0] }).has('pullup'));
});

test('newBadges ne renvoie que les nouveaux', () => {
  const before = [libre('2026-11-02T08:00:00', 'plage')];
  const after = [...before, libre('2026-11-03T08:00:00', 'dehors')];
  assert.deepEqual(newBadges(before, after, null).map((b) => b.id), ['outdoor']);
});
