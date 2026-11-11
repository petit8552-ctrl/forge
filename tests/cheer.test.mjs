// Tests des encouragements et du décompte vocal de la séance libre.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stepIntro, stepCues, milestone, musicMode } from '../js/cheer.js';

const work = (label, secs = 40, phase = 'main') => ({ kind: 'work', phase, label, secs });
const rest = (label = 'Récup', secs = 20) => ({ kind: 'rest', phase: 'main', label, secs });
const steps = [
  { kind: 'rest', phase: 'ready', label: 'Prêt ?', secs: 5 },
  work('Montées de genoux', 60, 'warmup'),
  rest('Prépare-toi', 15), work('Burpees'), rest(), work('Squats sautés'), rest('Fin du tour', 60),
  work('Gainage', 60, 'cooldown'),
];

test('annonces de début d’étape', () => {
  assert.match(stepIntro(steps, 0), /Premier exercice : Montées de genoux/);
  assert.match(stepIntro(steps, 1), /^Échauffement/);
  assert.match(stepIntro(steps, 2), /Prépare-toi\. Premier exercice : Burpees/);
  assert.match(stepIntro(steps, 3), /Burpees\.$/);
  assert.match(stepIntro(steps, 4), /Ensuite : Squats sautés/);
  assert.match(stepIntro(steps, 5), /^Dernier effort ! Squats sautés/);
  assert.match(stepIntro(steps, 6), /^Fin du tour, bravo/);
  assert.match(stepIntro(steps, 7), /^Retour au calme/);
  assert.equal(stepIntro(steps, 99), '');
});

test('encouragements : milieu, 10 s, puis 3-2-1, chacun une seule fois', () => {
  const st = work('Burpees', 40);
  const said = [];
  for (let t = 40; t > 0; t -= 0.25) said.push(...stepCues(st, t, t - 0.25, 3));
  assert.equal(said.length, 5);
  assert.deepEqual(said.slice(-3), ['3', '2', '1']);
  assert.match(said[1], /10 secondes/);
});

test('pas de relance à l’échauffement, en récup ni sur un effort très court', () => {
  assert.deepEqual(stepCues(work('Marche', 60, 'warmup'), 11, 9), []);
  assert.deepEqual(stepCues(rest(), 11, 9), []);
  assert.deepEqual(stepCues(work('Sprint', 6), 3.1, 2.9), []);
  assert.deepEqual(stepCues(work('Tabata', 20), 10.1, 9.9).length, 1); // 10 s, pas de milieu
});

test('repères de séance dits une fois, la fin prime sur la moitié', () => {
  const said = new Set();
  assert.equal(milestone(0.3, said), '');
  assert.match(milestone(0.55, said), /Mi-séance/);
  assert.equal(milestone(0.6, said), '');
  assert.match(milestone(0.85, said), /Dernière ligne droite/);
  assert.equal(milestone(0.9, said), '');
  const late = new Set();
  assert.match(milestone(0.9, late), /Dernière ligne droite/);
  assert.equal(milestone(0.95, late), '');
});

test('ambiance musicale selon l’étape', () => {
  assert.equal(musicMode(rest(), 5), 'rest');
  assert.equal(musicMode(work('Marche', 60, 'warmup'), 5), 'rest');
  assert.equal(musicMode(work('Burpees', 40), 30), 'work');
  assert.equal(musicMode(work('Burpees', 40), 8), 'final');
});
