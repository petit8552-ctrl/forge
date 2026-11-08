// Tests de la muscu ciblée.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTargeted, nextInZone, swapExercise, available, exById, MUSCLES, CIBLE_DURATIONS, CIBLE_EQUIP, HOME, ALL_TARGET_EXERCISES } from '../js/cible.js';
import { HOWTO } from '../js/coaching.js';
import { photos } from '../js/media.js';
import { existsSync } from 'node:fs';

const profile = (level = 'intermediaire') => ({ sex: 'h', age: 28, height: 175, weight: 75, level, goal: 'masse', days: [0, 2, 4], duration: 60 });
const PLACES = ['salle', 'maison', 'dehors', 'plage'];
const EQUIPS = [[], ['banc'], ['halteres'], ['elastique'], ['barre', 'banc'], Object.keys(CIBLE_EQUIP)];
function* cases() {
  for (const muscle of Object.keys(MUSCLES)) for (const place of PLACES) for (const equip of (place === 'salle' ? [[]] : EQUIPS))
    for (const minutes of CIBLE_DURATIONS) for (const level of ['debutant', 'intermediaire', 'avance'])
      yield { muscle, place, equip, minutes, level };
}

test('jamais plus long que demandé, plafond de séries respecté, pas de doublon', () => {
  for (const o of cases()) {
    const s = buildTargeted(profile(o.level), o, [], 0);
    assert.ok(s.minutes <= o.minutes, `${JSON.stringify(o)} → ${s.minutes} min`);
    assert.ok(s.sets <= MUSCLES[o.muscle].cap, `${o.muscle} : ${s.sets} séries`);
    const ids = s.exercises.map((e) => e.id);
    assert.equal(new Set(ids).size, ids.length, ids.join());
  }
});

test('à la salle, toutes les zones de chaque muscle sont couvertes dès 60 min', () => {
  for (const muscle of Object.keys(MUSCLES)) {
    const s = buildTargeted(profile(), { muscle, place: 'salle', equip: [], minutes: 60 }, [], 0);
    for (const z of s.zones) assert.ok(z.exercises.length >= 1, `${muscle} / ${z.zone.name}`);
  }
});

test('séance assez longue quand rien ne la limite (≥ 70 % du temps demandé ou plafond atteint)', () => {
  for (const muscle of Object.keys(MUSCLES)) for (const minutes of CIBLE_DURATIONS) {
    const s = buildTargeted(profile(), { muscle, place: 'salle', equip: [], minutes }, [], 0);
    assert.ok(s.minutes >= minutes * 0.7 || s.sets >= MUSCLES[muscle].cap - 3, `${muscle} ${minutes} min → ${s.minutes} min, ${s.sets} séries`);
  }
});

test('matériel respecté hors salle ; zone vide = matériel manquant indiqué', () => {
  for (const o of cases()) {
    if (o.place === 'salle') continue;
    const s = buildTargeted(profile(o.level), o, [], 0);
    for (const e of s.exercises) assert.ok(available(exById(e.id), o.place, o.equip), `${e.id} à ${o.place} avec ${o.equip}`);
    for (const z of s.zones) if (!z.exercises.length && z.missing) assert.ok(Array.isArray(z.missing));
  }
});

test('avec du matériel de base, chaque muscle a au moins 2 exercices à la maison', () => {
  for (const muscle of Object.keys(MUSCLES)) {
    const s = buildTargeted(profile(), { muscle, place: 'maison', equip: ['halteres', 'elastique', 'banc'], minutes: 45 }, [], 0);
    assert.ok(s.exercises.length >= 2, `${muscle} : ${s.exercises.map((e) => e.id)}`);
  }
});

test('le premier exercice est un polyarticulaire quand la zone le permet', () => {
  for (const muscle of ['pecs', 'dos', 'jambes', 'epaules']) {
    const s = buildTargeted(profile(), { muscle, place: 'salle', equip: [], minutes: 60 }, [], 0);
    assert.equal(exById(s.exercises[0].id).kind, 'compound', `${muscle} : ${s.exercises[0].id}`);
    assert.equal(s.exercises[0].role, 'main');
  }
});

test('la charge proposée reprend l’historique (même moteur que le programme)', () => {
  const hist = [{ date: '2026-11-01T10:00:00Z', exercises: [{ id: 'incline-bench', sets: [{ w: 60, r: 10, done: true }, { w: 60, r: 10, done: true }, { w: 60, r: 10, done: true }, { w: 60, r: 10, done: true }] }] }];
  const s = buildTargeted(profile(), { muscle: 'pecs', place: 'salle', equip: [], minutes: 60 }, hist, 0);
  const e = s.exercises.find((x) => x.id === 'incline-bench');
  assert.ok(e && e.load >= 60, `charge ${e && e.load}`);
});

test('variante : change d’exercice dans la même zone', () => {
  const p = profile(); const o = { muscle: 'pecs', place: 'salle', equip: [], minutes: 60 };
  const s = buildTargeted(p, o, [], 0);
  const first = s.exercises[0];
  const next = nextInZone(s, first.slot, o, p);
  assert.ok(next && next.id !== first.id);
  swapExercise(s, first.slot, next, p, []);
  assert.equal(s.exercises[0].id, next.id);
  assert.equal(s.exercises[0].zone, first.zone);
});

test('chaque exercice ciblé a une image, des repères et des données complètes', () => {
  for (const e of ALL_TARGET_EXERCISES()) {
    assert.ok(e, 'exercice inconnu dans une zone');
    assert.ok(photos(e.id) || e.anim, `${e.id} sans image`);
    if (e.anim) assert.ok(existsSync(new URL(`../media/anim/${e.anim}.svg`, import.meta.url)), e.anim);
    const ph = photos(e.id); if (ph) assert.ok(existsSync(new URL(`../${ph.start}`, import.meta.url)), ph.start);
    assert.ok(HOWTO[e.id], `${e.id} sans repères`);
    assert.ok(e.name && e.cue && e.unit && e.pattern, e.id);
  }
  for (const e of HOME) assert.ok(ALL_TARGET_EXERCISES().includes(e), `${e.id} n’est dans aucune zone`);
});

// ---------- Superset ----------
import { buildSuperset, CLASSIC_PAIRS, SUPERSET_TRANSITION } from '../js/cible.js';

test('superset : paires A/B qui alternent les 2 muscles, repos court après A', () => {
  for (const [a, b] of CLASSIC_PAIRS) for (const minutes of CIBLE_DURATIONS) {
    const s = buildSuperset(profile(), { muscles: [a, b], place: 'salle', equip: [], minutes }, [], 0);
    assert.ok(s.minutes <= minutes, `${a}+${b} ${minutes} → ${s.minutes}`);
    for (const z of s.zones.filter((x) => x.zone.id.startsWith('ss'))) {
      const [x, y] = z.exercises;
      assert.equal(x.muscle, a); assert.equal(y.muscle, b);
      assert.equal(x.superset, 'A'); assert.equal(y.superset, 'B');
      assert.equal(x.rest, SUPERSET_TRANSITION); assert.ok(y.rest >= 90);
      assert.equal(x.sets, y.sets);
      assert.equal(y.slot, x.slot + 1, 'B juste après A (minuteur « Enchaîne »)');
    }
    const ids = s.exercises.map((e) => e.id);
    assert.equal(new Set(ids).size, ids.length);
  }
});

test('superset : plafond de séries respecté pour chacun des 2 muscles', () => {
  for (const [a, b] of CLASSIC_PAIRS) {
    const s = buildSuperset(profile(), { muscles: [a, b], place: 'salle', equip: [], minutes: 90 }, [], 0);
    const count = (m) => s.exercises.filter((e) => e.muscle === m).reduce((n, e) => n + e.sets, 0);
    assert.ok(count(a) <= MUSCLES[a].cap && count(b) <= MUSCLES[b].cap, `${a} ${count(a)} / ${b} ${count(b)}`);
  }
});

test('superset : plus de travail que la séance d’un seul muscle dans le même temps', () => {
  const one = buildTargeted(profile(), { muscle: 'pecs', place: 'salle', equip: [], minutes: 45 }, [], 0);
  const ss = buildSuperset(profile(), { muscles: ['pecs', 'dos'], place: 'salle', equip: [], minutes: 45 }, [], 0);
  assert.ok(ss.sets > one.sets, `${ss.sets} séries en superset vs ${one.sets}`);
});

test('superset : matériel respecté hors salle, et rempli à au moins 70 % quand il y a de quoi faire', () => {
  for (const o of cases()) {
    if (o.place === 'salle' || o.muscle === 'jambes') continue;
    const s = buildSuperset(profile(o.level), { ...o, muscles: [o.muscle, 'jambes'] }, [], 0);
    for (const e of s.exercises) assert.ok(available(exById(e.id), o.place, o.equip), e.id);
  }
  const s = buildSuperset(profile(), { muscles: ['pecs', 'dos'], place: 'maison', equip: ['halteres', 'banc', 'elastique', 'barre'], minutes: 45 }, [], 0);
  assert.ok(s.minutes >= 45 * 0.7, `${s.minutes} min`);
});

test('pas de doublon d’exercice entre volets : une photo = un seul identifiant', async () => {
  const { EXERCISES } = await import('../js/exercises.js');
  const { MEDIA } = await import('../js/media.js');
  const { FREE } = await import('../js/libre.js');
  const byPhoto = {};
  const add = (id, photo) => { if (photo) (byPhoto[photo] = byPhoto[photo] || new Set()).add(id); };
  for (const e of EXERCISES) add(e.id, MEDIA[e.id]?.src);
  for (const e of FREE) add(e.id, e.photo);
  for (const e of HOME) add(e.id, e.photo);
  const dup = Object.entries(byPhoto).filter(([, ids]) => ids.size > 1).map(([ph, ids]) => `${ph}: ${[...ids]}`);
  assert.deepEqual(dup, []);
});

test('aucun superset ne contient deux fois le même exercice (toutes les paires, tous les lieux)', () => {
  const ms = Object.keys(MUSCLES);
  for (const a of ms) for (const b of ms) {
    if (a === b) continue;
    for (const place of PLACES) {
      const s = buildSuperset(profile(), { muscles: [a, b], place, equip: Object.keys(CIBLE_EQUIP), minutes: 90 }, [], 0);
      const ids = s.exercises.map((e) => e.id);
      assert.equal(new Set(ids).size, ids.length, `${a}+${b} ${place}`);
    }
  }
});
