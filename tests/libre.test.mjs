// Tests du générateur de séance libre.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HOWTO } from '../js/coaching.js';
import { EXERCISES } from '../js/exercises.js';
import { buildFreeSession, FREE, PLACES, GOALS_LIBRE, DURATIONS, EQUIP, MACHINES } from '../js/libre.js';

const BY = Object.fromEntries(FREE.map((e) => [e.id, e]));
const LEVELS = ['debutant', 'intermediaire', 'avance'];
const EQUIP_SETS = [[], ['corde'], ['halteres', 'banc'], ['barre', 'banc', 'elastique'], Object.keys(EQUIP)];

function* allCases() {
  for (const place of Object.keys(PLACES)) for (const goal of Object.keys(GOALS_LIBRE))
    for (const minutes of DURATIONS) for (const level of LEVELS) for (const equip of EQUIP_SETS)
      yield { place, goal, minutes, level, equip };
}

test('durée réelle entre 85 % et 100 % de la durée demandée', () => {
  for (const o of allCases()) {
    const s = buildFreeSession(o, 1);
    const ratio = s.seconds / (o.minutes * 60);
    assert.ok(ratio >= 0.85 && ratio <= 1.0, `${JSON.stringify(o)} → ${(s.seconds / 60).toFixed(1)} min`);
  }
});

test('n’utilise que le matériel coché et l’espace disponible', () => {
  for (const o of allCases()) {
    for (const st of buildFreeSession(o, 2).steps.filter((x) => x.exId)) {
      if (st.exId.startsWith('m-')) {
        const m = st.exId.slice(2);
        assert.ok(o.equip.includes(m) && MACHINES.includes(m), `${m} sans l’avoir coché`);
        assert.ok(o.place === 'salle' || o.place === 'maison', `machine à ${o.place}`);
        continue;
      }
      const e = BY[st.exId];
      if (e.equip) assert.ok(o.equip.includes(e.equip), `${e.id} demande ${e.equip}`);
      if (e.outdoor) assert.ok(['dehors', 'plage'].includes(o.place), `${e.id} à ${o.place}`);
    }
  }
});

test('débutant : pas de sauts difficiles ; impact faible : aucun saut', () => {
  for (const o of allCases()) {
    if (o.level === 'debutant') for (const st of buildFreeSession(o, 3).steps.filter((x) => BY[x.exId])) {
      const e = BY[st.exId];
      assert.ok(!(e.impact === 'high' && e.diff > 1), `${e.id} pour un débutant`);
    }
    for (const st of buildFreeSession({ ...o, lowImpact: true }, 3).steps.filter((x) => BY[x.exId])) {
      assert.notEqual(BY[st.exId].impact, 'high', `${st.exId} malgré impact faible`);
    }
  }
});

test('chaque séance a un vrai contenu (au moins 6 étapes d’effort hors échauffement)', () => {
  for (const o of allCases()) {
    const work = buildFreeSession(o, 4).steps.filter((x) => x.phase === 'main' && x.kind === 'work');
    assert.ok(work.length >= 6, `${JSON.stringify(o)} : ${work.length} efforts`);
  }
});

test('même graine = même séance ; autre graine = autre séance', () => {
  const o = { place: 'plage', goal: 'mixte', minutes: 30, level: 'intermediaire', equip: [] };
  assert.deepEqual(buildFreeSession(o, 7), buildFreeSession(o, 7));
  const ids = (s) => s.steps.map((x) => x.exId).join();
  const variants = new Set([1, 2, 3, 4, 5].map((k) => ids(buildFreeSession(o, k))));
  assert.ok(variants.size >= 3, 'le bouton « Autre séance » doit vraiment changer la séance');
});

test('cardio débutant sans machine : que des blocs cardio', () => {
  const s = buildFreeSession({ place: 'plage', goal: 'cardio', minutes: 20, level: 'debutant', equip: [] }, 0);
  assert.ok(s.blocks.filter((b) => b.type !== 'finisher').every((b) => b.type === 'cardio'), s.blocks.map((b) => b.type).join());
});

test('chaque exercice a ses repères (sentir, ralentir, temps fort)', () => {
  for (const e of [...EXERCISES, ...FREE]) {
    const h = HOWTO[e.id];
    assert.ok(h && h.length === 3 && h.every((x) => x && x.length), `${e.id} sans repères`);
  }
});
