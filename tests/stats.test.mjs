// Tests des calculs partagés (page Progrès + récompenses).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setVolume, setE1rm, isRealSession, perDumbbell } from '../js/stats.js';
import { badges } from '../js/rewards.js';

const s = (w, r, done = true) => ({ w, r, done });

test('tractions assistées : ni tonnage ni record (le poids noté est l’assistance)', () => {
  assert.equal(setVolume('assisted-pullup', s(40, 10)), 0);
  assert.equal(setE1rm('assisted-pullup', s(40, 10)), 0);
});

test('haltères : deux haltères comptés deux fois, sauf exercice à un seul poids', () => {
  assert.equal(setVolume('db-bench', s(20, 10)), 400);
  assert.ok(perDumbbell('db-bench'));
  assert.equal(setVolume('goblet', s(20, 10)), 200);
  assert.equal(setVolume('bench', s(60, 10)), 600);
  assert.equal(setVolume('pompes', s(0, 20)), 0);
  assert.equal(setVolume('bench', s(60, 10, false)), 0);
});

test('séance réelle : au moins une série validée ; les séances vides ne comptent ni en Progrès ni en badges', () => {
  const vide = { week: 1, dayIndex: 0, date: '2026-11-02T10:00:00Z', exercises: [{ id: 'bench', sets: [s(60, 10, false)] }] };
  const vraie = { week: 1, dayIndex: 1, date: '2026-11-04T10:00:00Z', exercises: [{ id: 'bench', sets: [s(60, 10)] }] };
  assert.equal(isRealSession(vide), false);
  assert.equal(isRealSession(vraie), true);
  const n = badges([vide, vraie], { days: [0, 2] }).find((b) => b.id === 'first');
  assert.equal(n.earned, true);
  assert.equal(badges([vide], { days: [0, 2] }).find((b) => b.id === 'first').earned, false);
});

test('séance libre : seuls les efforts faits comptent ; traction passée = pas de badge', () => {
  const courte = { type: 'libre', place: 'dehors', minutes: 3, date: '2026-11-02T10:00:00Z', exercises: [{ id: 'pullup', sets: [] }] };
  assert.equal(isRealSession(courte), false, 'ancien format, moins de 5 min');
  const faite = { type: 'libre', place: 'dehors', minutes: 6, date: '2026-11-02T10:00:00Z', exercises: [{ id: 'pullup', sets: [{ w: 0, r: 0, done: true, secs: 40 }] }] };
  assert.equal(badges([faite], null).find((b) => b.id === 'pullup').earned, true);
  const ancienne = { type: 'libre', place: 'dehors', minutes: 20, date: '2026-11-02T10:00:00Z', exercises: [{ id: 'pullup', sets: [] }] };
  assert.equal(isRealSession(ancienne), true, 'ancien format sans détail, 20 min');
  assert.equal(badges([ancienne], null).find((b) => b.id === 'pullup').earned, false, 'pas de preuve que la traction a été faite');
});

test('badges de lieux : la muscu ciblée compte aussi', () => {
  const plage = { type: 'cible', muscle: 'pecs', place: 'plage', date: '2026-11-02T10:00:00Z', exercises: [{ id: 'pompes', sets: [s(0, 15)] }] };
  assert.equal(badges([plage], null).find((b) => b.id === 'beach').earned, true);
});
