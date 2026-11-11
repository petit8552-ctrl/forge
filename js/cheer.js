// Encouragements et décompte vocal de la séance libre.
// Fonctions pures (aucun accès au navigateur) : testées dans tests/cheer.test.mjs.

const GO = ['C’est parti !', 'Allez, on y va !', 'Go !', 'À toi de jouer !'];
const MID = ['Tu tiens le rythme, continue !', 'Respire, reste gainé.', 'C’est bien, garde cette cadence.',
  'Concentre-toi sur le mouvement.', 'Tu gères, on lâche rien !', 'Propre et régulier, c’est parfait.'];
const END = ['Plus que 10 secondes, tiens bon !', 'Dix secondes, donne tout !', 'Allez, 10 secondes, finis fort !',
  'Encore 10 secondes, tu y es presque !'];
const REST = ['Récupère.', 'Souffle un peu.', 'Respire profondément.'];

export const pick = (list, seed) => list[Math.abs(seed | 0) % list.length];
const clean = (label) => String(label || '').replace(/ : (effort|endurance|récup)$/, '');
const isWork = (s) => s && s.kind === 'work';

// Phrase dite au début d'une étape.
export function stepIntro(steps, idx) {
  const st = steps[idx]; if (!st) return '';
  const name = clean(st.label);
  const next = steps.slice(idx + 1).find(isWork);
  if (st.phase === 'ready') return `Prêt ? La séance commence. Premier exercice : ${clean(steps[idx + 1]?.label)}.`;
  if (st.kind === 'rest') {
    if (st.label === 'Prépare-toi') return next ? `Prépare-toi. Premier exercice : ${clean(next.label)}.` : 'Prépare-toi.';
    if (st.label === 'Fin du tour') return `Fin du tour, bravo ! ${pick(REST, idx)}`;
    return next ? `${pick(REST, idx)} Ensuite : ${clean(next.label)}.` : pick(REST, idx);
  }
  if (st.phase === 'warmup') return idx === 0 || steps[idx - 1]?.phase !== 'warmup' ? `Échauffement. ${name}, doucement.` : name;
  if (st.phase === 'cooldown') return steps[idx - 1]?.phase !== 'cooldown' ? `Retour au calme. ${name}. Bravo, le plus dur est fait.` : name;
  const lastMain = !steps.slice(idx + 1).some((s) => isWork(s) && s.phase === 'main');
  if (lastMain) return `Dernier effort ! ${name}, donne tout !`;
  return `${pick(GO, idx)} ${name}.`;
}

// Ce qu'il faut dire quand le temps restant de l'étape passe de `prev` à `left` secondes.
// Échauffement et retour au calme restent calmes : pas de relance.
export function stepCues(st, prev, left, seed = 0) {
  if (!isWork(st) || st.phase !== 'main' || !(prev > left)) return [];
  const out = [];
  const crossed = (t) => prev > t && left <= t;
  if (st.secs >= 30 && crossed(Math.floor(st.secs / 2))) out.push(pick(MID, seed));
  if (st.secs >= 20 && crossed(10)) out.push(pick(END, seed));
  if (st.secs >= 8) for (const n of [3, 2, 1]) if (crossed(n)) out.push(String(n));
  return out;
}

// Repères de séance (moitié, dernière ligne droite) : une seule fois chacun.
export function milestone(fraction, said) {
  if (fraction >= 0.8 && !said.has(0.8)) { said.add(0.8); said.add(0.5); return 'Dernière ligne droite, tu y es presque !'; }
  if (fraction >= 0.5 && !said.has(0.5)) { said.add(0.5); return 'Mi-séance ! La moitié est faite.'; }
  return '';
}

// Ambiance de la musique selon l'étape : calme en récup, échauffement et retour au calme ; poussée en fin d'effort.
export function musicMode(st, left) {
  if (!isWork(st) || st.phase !== 'main') return 'rest';
  return st.secs >= 20 && left <= 10 ? 'final' : 'work';
}
