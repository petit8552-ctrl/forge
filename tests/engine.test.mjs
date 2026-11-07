// Tests du moteur de coaching et de la fusion des données. Lancer : node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { suggestLoad, buildSession, e1rm } from '../js/engine.js';
import { EXERCISES, BY_ID } from '../js/exercises.js';
import { merge } from '../js/sync.js';

const profile = (over = {}) => ({
  sex: 'h', age: 28, height: 175, weight: 75, level: 'intermediaire', goal: 'masse',
  days: [0, 2, 4], duration: 60, dailyActivity: 'modere', startDate: '2026-01-05T10:00:00Z', swaps: {}, ...over,
});
const perf = (id, sets) => [{ week: 1, dayIndex: 0, date: '2026-01-05T18:00:00Z', exercises: [{ id, sets: sets.map(([w, r]) => ({ w, r, done: true })) }] }];
const bench = BY_ID.bench;

test('3 reps lourdes puis fourchette 10–12 : charge recalculée vers le bas, pas 95 kg', () => {
  const { load } = suggestLoad(bench, profile(), perf('bench', [[100, 3], [100, 3]]), [3, 10, 12, 3, 120], 'acc');
  // 1RM estimé 110 kg → environ 78 kg pour 12 reps.
  assert.ok(load >= 70 && load <= 80, `charge proposée ${load}`);
});

test('15 reps légères puis fourchette 3 : charge recalculée vers le haut', () => {
  const { load } = suggestLoad(bench, profile(), perf('bench', [[40, 15]]), [5, 3, 3, 1, 240], 'int');
  assert.ok(load >= 50 && load <= 56, `charge proposée ${load}`);
});

test('même fourchette, haut atteint partout : +incrément', () => {
  const { load } = suggestLoad(bench, profile(), perf('bench', [[60, 12], [60, 12], [60, 12]]), [3, 10, 12, 3, 120], 'acc');
  assert.equal(load, 62.5);
});

test('même fourchette, reps manquées : légère baisse', () => {
  const { load } = suggestLoad(bench, profile(), perf('bench', [[60, 10], [60, 8]]), [3, 10, 12, 3, 120], 'acc');
  assert.equal(load, 57.5);
});

test('même fourchette, dans la fourchette : même charge', () => {
  const { load } = suggestLoad(bench, profile(), perf('bench', [[60, 11], [60, 10]]), [3, 10, 12, 3, 120], 'acc');
  assert.equal(load, 60);
});

test('barre : jamais sous 20 kg, même après conversion', () => {
  const { load } = suggestLoad(bench, profile(), perf('bench', [[20, 3]]), [3, 12, 15, 2, 60], 'acc');
  assert.ok(load >= 20);
});

test('séries sans reps notées : pas de crash, charge de départ estimée', () => {
  const h = [{ exercises: [{ id: 'bench', sets: [{ w: 60, r: 0, done: true }] }] }];
  const { load, note } = suggestLoad(bench, profile(), h, [3, 10, 12, 3, 120], 'acc');
  assert.ok(load > 0);
  assert.match(note, /départ/);
});

test('aucun exercice principal au poids du corps, tous profils et 12 semaines', () => {
  for (const level of ['debutant', 'intermediaire', 'avance']) {
    for (const n of [2, 3, 4, 5, 6]) {
      const days = [0, 1, 2, 3, 4, 5].slice(0, n);
      for (let w = 1; w <= 12; w++) {
        for (let d = 0; d < n; d++) {
          const s = buildSession(profile({ level, days, duration: 90 }), w, d, []);
          for (const e of s.exercises.filter((x) => x.role === 'main')) {
            assert.notEqual(BY_ID[e.id].unit, 'pdc', `${level} ${n}j S${w} J${d} : ${e.id}`);
          }
        }
      }
    }
  }
});

test('pas deux fois le même exercice dans une séance', () => {
  for (let w = 1; w <= 8; w++) for (let d = 0; d < 3; d++) {
    const ids = buildSession(profile(), w, d, []).exercises.map((e) => e.id);
    assert.equal(new Set(ids).size, ids.length, ids.join(','));
  }
});

test('tous les exercices ont les champs utilisés par le moteur', () => {
  for (const e of EXERCISES) {
    assert.ok(e.id && e.name && e.pattern && e.unit && e.muscles?.length, e.id);
    if (e.unit !== 'pdc' && !e.assisted) assert.ok(e.coef > 0, `${e.id} sans coef`);
  }
});

test('tractions assistées : réussir réduit l’assistance, échouer l’augmente', () => {
  const ex = BY_ID['assisted-pullup'];
  assert.equal(suggestLoad(ex, profile(), perf(ex.id, [[30, 12], [30, 12]]), [3, 10, 12, 3, 120], 'acc').load, 27.5);
  assert.equal(suggestLoad(ex, profile(), perf(ex.id, [[30, 8]]), [3, 10, 12, 3, 120], 'acc').load, 32.5);
  assert.equal(suggestLoad(ex, profile(), [], [3, 10, 12, 3, 120], 'acc').load, null);
});

test('e1rm (Epley)', () => { assert.equal(Math.round(e1rm(100, 10)), 133); });

// ---------- Fusion téléphone / compte ----------
const session = (date, done, week = 1, dayIndex = 0) => ({ week, dayIndex, date, exercises: [{ id: 'bench', sets: Array.from({ length: done }, () => ({ w: 60, r: 10, done: true })) }] });

test('fusion : même séance sur deux téléphones gardée une seule fois (la plus complète)', () => {
  const m = merge({ history: [session('2026-01-05T18:00:00Z', 3)] }, { history: [session('2026-01-05T19:00:00Z', 1)] });
  assert.equal(m.history.length, 1);
  assert.equal(m.history[0].exercises[0].sets.length, 3);
});

test('fusion : séances différentes toutes conservées', () => {
  const m = merge({ history: [session('2026-01-05T18:00:00Z', 3, 1, 0)] }, { history: [session('2026-01-07T18:00:00Z', 3, 1, 1)] });
  assert.equal(m.history.length, 2);
});

test('fusion : séance supprimée volontairement retirée des deux côtés', () => {
  const d = '2026-01-05T18:00:00Z';
  const m = merge({ history: [], deleted: [d] }, { history: [session(d, 3)] });
  assert.equal(m.history.length, 0);
});
