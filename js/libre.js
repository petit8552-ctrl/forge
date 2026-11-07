// Séance libre : une séance ponctuelle, hors programme, construite selon le lieu, le matériel
// disponible, la durée et l'objectif (muscu, cardio ou mixte). Tout est chronométré :
// la séance se joue comme une suite d'étapes (effort / récupération) avec des bips.
import { hash } from './engine.js';

export const PLACES = {
  salle: ['Salle', '🏋️'], maison: ['Maison', '🏠'], dehors: ['Plein air', '🌳'], plage: ['Plage', '🏖️'],
};
export const EQUIP = {
  corde: 'Corde à sauter', elastique: 'Élastique', halteres: 'Haltères', kettlebell: 'Kettlebell',
  barre: 'Barre de traction', banc: 'Banc ou marche', velo: 'Vélo', tapis: 'Tapis de course',
  rameur: 'Rameur', elliptique: 'Elliptique',
};
export const MACHINES = ['velo', 'tapis', 'rameur', 'elliptique'];
// Matériel proposé par défaut selon le lieu (modifiable par l'utilisateur).
export const DEFAULT_EQUIP = {
  salle: ['corde', 'halteres', 'kettlebell', 'barre', 'banc', 'velo', 'tapis', 'rameur'],
  maison: [], dehors: ['barre', 'banc'], plage: [],
};
export const GOALS_LIBRE = {
  cardio: ['Cardio', 'Souffle, brûler'], muscu: ['Renfo', 'Muscles, circuit'], mixte: ['Mixte', 'Les deux'],
};
export const DURATIONS = [15, 20, 30, 45];

// kind : force | cardio · group : jambes | poussee | tirage | gainage | complet
// impact : high = sauts (déconseillé débutant / IMC élevé) · outdoor : besoin d'espace (dehors, plage)
// photo : nom dans Free Exercise DB (domaine public), null si l'exercice n'y figure pas.
export const FREE = [
  // Jambes
  { id: 'l-squat', name: 'Squat au poids du corps', kind: 'force', group: 'jambes', impact: 'low', diff: 1, photo: 'Bodyweight_Squat', cue: 'Fesses en arrière, talons au sol, descends cuisses parallèles.' },
  { id: 'l-fentes', name: 'Fentes alternées', kind: 'force', group: 'jambes', impact: 'low', diff: 1, photo: 'Bodyweight_Walking_Lunge', cue: 'Grand pas, genou arrière frôle le sol, buste droit.' },
  { id: 'l-pont', name: 'Pont fessier', kind: 'force', group: 'jambes', impact: 'low', diff: 1, photo: 'Butt_Lift_Bridge', cue: 'Pousse dans les talons, serre les fessiers 1 s en haut.' },
  { id: 'l-pont-1j', name: 'Pont fessier une jambe', kind: 'force', group: 'jambes', impact: 'low', diff: 2, photo: 'Single_Leg_Glute_Bridge', cue: 'Bassin bien horizontal, change de jambe à mi-temps.' },
  { id: 'l-step', name: 'Montées sur banc', kind: 'force', group: 'jambes', equip: 'banc', impact: 'low', diff: 1, photo: 'Step-up_with_Knee_Raise', cue: 'Pied entier sur le banc, monte le genou opposé en haut.' },
  { id: 'l-squat-saute', name: 'Squats sautés', kind: 'cardio', group: 'jambes', impact: 'high', diff: 2, photo: 'Freehand_Jump_Squat', cue: 'Réception souple, genoux dans l’axe, enchaîne.' },
  { id: 'l-fentes-sautees', name: 'Fentes sautées', kind: 'cardio', group: 'jambes', impact: 'high', diff: 3, photo: 'Split_Jump', cue: 'Change de jambe en l’air, atterris en douceur.' },
  { id: 'l-squat-halteres', name: 'Squat haltères', kind: 'force', group: 'jambes', equip: 'halteres', impact: 'low', diff: 1, photo: 'Dumbbell_Squat', cue: 'Haltères le long du corps, dos droit.' },
  { id: 'l-rdl-halteres', name: 'Soulevé roumain haltères', kind: 'force', group: 'jambes', equip: 'halteres', impact: 'low', diff: 1, photo: 'Stiff-Legged_Dumbbell_Deadlift', cue: 'Fesses en arrière, haltères frôlent les cuisses.' },
  { id: 'l-goblet', name: 'Goblet squat', kind: 'force', group: 'jambes', equip: 'kettlebell', impact: 'low', diff: 1, photo: 'Goblet_Squat', cue: 'Charge contre la poitrine, coudes entre les genoux.' },
  { id: 'l-squat-elastique', name: 'Squat élastique', kind: 'force', group: 'jambes', equip: 'elastique', impact: 'low', diff: 1, photo: 'Squats_-_With_Bands', cue: 'Élastique sous les pieds, mains aux épaules.' },
  // Poussée
  { id: 'l-pompes', name: 'Pompes', kind: 'force', group: 'poussee', impact: 'low', diff: 2, photo: 'Pushups', cue: 'Corps gainé, poitrine près du sol. Sur les genoux si besoin.' },
  { id: 'l-pompes-inclinees', name: 'Pompes inclinées', kind: 'force', group: 'poussee', impact: 'low', diff: 1, photo: 'Incline_Push-Up', cue: 'Mains sur un mur, un banc ou une table. Corps droit.' },
  { id: 'l-pompes-pieds', name: 'Pompes pieds surélevés', kind: 'force', group: 'poussee', equip: 'banc', impact: 'low', diff: 3, photo: 'Push-Ups_With_Feet_Elevated', cue: 'Pieds sur le banc, gainage maximal.' },
  { id: 'l-dips-banc', name: 'Dips sur banc', kind: 'force', group: 'poussee', equip: 'banc', impact: 'low', diff: 1, photo: 'Bench_Dips', cue: 'Mains au bord du banc, coudes vers l’arrière.' },
  { id: 'l-dev-halteres', name: 'Développé épaules haltères', kind: 'force', group: 'poussee', equip: 'halteres', impact: 'low', diff: 1, photo: 'Dumbbell_Shoulder_Press', cue: 'Debout, abdos serrés, pousse au-dessus de la tête.' },
  { id: 'l-dev-elastique', name: 'Développé épaules élastique', kind: 'force', group: 'poussee', equip: 'elastique', impact: 'low', diff: 1, photo: 'Shoulder_Press_-_With_Bands', cue: 'Élastique sous les pieds, pousse sans cambrer.' },
  // Tirage
  { id: 'l-tractions', name: 'Tractions', kind: 'force', group: 'tirage', equip: 'barre', impact: 'low', diff: 3, photo: 'Pullups', cue: 'Menton au-dessus de la barre, descente contrôlée. Fais ce que tu peux.' },
  { id: 'l-australien', name: 'Rowing australien', kind: 'force', group: 'tirage', equip: 'barre', impact: 'low', diff: 1, photo: 'Inverted_Row', cue: 'Sous une barre basse, corps droit, tire la poitrine vers la barre.' },
  { id: 'l-rowing-halteres', name: 'Rowing haltère', kind: 'force', group: 'tirage', equip: 'halteres', impact: 'low', diff: 1, photo: 'One-Arm_Dumbbell_Row', cue: 'Dos plat, tire le coude vers la hanche. Change de bras à mi-temps.' },
  { id: 'l-ecartes-elastique', name: 'Écartés élastique', kind: 'force', group: 'tirage', equip: 'elastique', impact: 'low', diff: 1, photo: 'Band_Pull_Apart', cue: 'Bras tendus devant, écarte jusqu’à la poitrine.' },
  { id: 'l-superman', name: 'Superman', kind: 'force', group: 'tirage', impact: 'low', diff: 1, photo: 'Superman', cue: 'À plat ventre, décolle bras et jambes, tiens 2 s.' },
  // Gainage
  { id: 'l-planche', name: 'Planche', kind: 'force', group: 'gainage', impact: 'low', diff: 1, photo: 'Plank', cue: 'Corps aligné, fessiers et abdos serrés.' },
  { id: 'l-planche-lat', name: 'Planche latérale', kind: 'force', group: 'gainage', impact: 'low', diff: 1, photo: 'Side_Bridge', cue: 'Hanches hautes, change de côté à mi-temps.' },
  { id: 'l-crunch-velo', name: 'Crunch bicyclette', kind: 'force', group: 'gainage', impact: 'low', diff: 1, photo: 'Air_Bike', cue: 'Coude vers genou opposé, lentement.' },
  { id: 'l-russian', name: 'Russian twist', kind: 'force', group: 'gainage', impact: 'low', diff: 2, photo: 'Russian_Twist', cue: 'Pieds décollés si possible, tourne les épaules.' },
  { id: 'l-flutter', name: 'Battements de jambes', kind: 'force', group: 'gainage', impact: 'low', diff: 1, photo: 'Flutter_Kicks', cue: 'Bas du dos collé au sol, petits battements.' },
  { id: 'l-mountain', name: 'Mountain climbers', kind: 'cardio', group: 'gainage', impact: 'low', diff: 1, photo: 'Mountain_Climbers', cue: 'Position de pompe, genoux vers la poitrine en alternance, rapide.' },
  // Cardio complet
  { id: 'l-burpees', name: 'Burpees', kind: 'cardio', group: 'complet', impact: 'high', diff: 2, photo: null, cue: 'Squat, mains au sol, pieds en arrière, pompe (facultatif), pieds vers les mains, saut.' },
  { id: 'l-jacks', name: 'Jumping jacks', kind: 'cardio', group: 'complet', impact: 'high', diff: 1, photo: null, cue: 'Saute en écartant bras et jambes, reviens pieds joints.' },
  { id: 'l-pas-chasses', name: 'Pas chassés', kind: 'cardio', group: 'complet', impact: 'low', diff: 1, photo: null, cue: 'Déplacements latéraux rapides, genoux fléchis, sans croiser les pieds.' },
  { id: 'l-genoux-hauts', name: 'Montées de genoux', kind: 'cardio', group: 'complet', impact: 'low', diff: 1, photo: null, cue: 'Sur place, genoux à hauteur de hanche, bras actifs.' },
  { id: 'l-inchworm', name: 'Inchworm', kind: 'cardio', group: 'complet', impact: 'low', diff: 1, photo: 'Inchworm', cue: 'Mains au sol, avance en planche, reviens en marchant les pieds.' },
  { id: 'l-tuck', name: 'Sauts genoux poitrine', kind: 'cardio', group: 'complet', impact: 'high', diff: 3, photo: 'Knee_Tuck_Jump', cue: 'Saute en ramenant les genoux, réception souple.' },
  { id: 'l-patineur', name: 'Sauts du patineur', kind: 'cardio', group: 'complet', impact: 'high', diff: 2, photo: 'Lateral_Bound', cue: 'Bonds latéraux d’une jambe sur l’autre, stabilise 1 s.' },
  { id: 'l-corde', name: 'Corde à sauter', kind: 'cardio', group: 'complet', equip: 'corde', impact: 'high', diff: 1, photo: 'Rope_Jumping', cue: 'Petits sauts sur l’avant du pied, poignets qui tournent.' },
  { id: 'l-swing', name: 'Kettlebell swing', kind: 'cardio', group: 'complet', equip: 'kettlebell', impact: 'low', diff: 2, photo: 'One-Arm_Kettlebell_Swings', cue: 'Le mouvement vient des hanches, pas des bras. Dos plat.' },
  { id: 'l-epaule-jete', name: 'Épaulé haltères', kind: 'cardio', group: 'complet', equip: 'halteres', impact: 'low', diff: 2, photo: 'Dumbbell_Clean', cue: 'Des cuisses aux épaules d’un coup de hanches.' },
  // Besoin d'espace : plein air et plage (sur le sable, l'effort double)
  { id: 'l-sprint', name: 'Sprint', kind: 'cardio', group: 'complet', impact: 'high', diff: 1, outdoor: true, photo: 'Wind_Sprints', cue: '20 à 30 m à fond, retour en marchant.' },
  { id: 'l-saut-longueur', name: 'Sauts en longueur', kind: 'cardio', group: 'jambes', impact: 'high', diff: 2, outdoor: true, photo: 'Standing_Long_Jump', cue: 'Pieds joints, élan des bras, réception genoux fléchis.' },
  { id: 'l-ours', name: 'Marche de l’ours', kind: 'cardio', group: 'complet', impact: 'low', diff: 2, outdoor: true, photo: null, cue: 'À quatre pattes, genoux décollés, avance main/pied opposés.' },
];

// Cardio sur machine : intervalles (effort / récupération active).
export const MACHINE_CARDIO = {
  velo: { name: 'Vélo', photo: 'Bicycling_Stationary', work: 'Effort : résistance haute, 90 tours/min', easy: 'Récup : pédale facile' },
  tapis: { name: 'Tapis de course', photo: 'Running_Treadmill', work: 'Effort : course rapide (ou pente 10 % en marche rapide)', easy: 'Récup : marche' },
  rameur: { name: 'Rameur', photo: 'Rowing_Stationary', work: 'Effort : tirage puissant, jambes d’abord', easy: 'Récup : rame lentement' },
  elliptique: { name: 'Elliptique', photo: 'Elliptical_Trainer', work: 'Effort : résistance haute, cadence rapide', easy: 'Récup : allure facile' },
};

const WARMUP = [
  { name: 'Montées de genoux', cue: 'Doucement, pour monter le cardio.' },
  { name: 'Rotations des bras', cue: 'Grands cercles, avant puis arrière.' },
  { name: 'Squats lents', cue: 'Amplitude complète, sans forcer.' },
  { name: 'Fentes avec rotation', cue: 'Tourne le buste vers la jambe avant.' },
  { name: 'Inchworm', cue: 'Mains au sol, avance, reviens.' },
];
const COOLDOWN = [
  { name: 'Étirement cuisses et fessiers', cue: 'Respire lentement, 30 s par côté.' },
  { name: 'Étirement épaules et pectoraux', cue: 'Bras derrière le dos ou contre un mur.' },
  { name: 'Respiration au sol', cue: 'Allongé, inspire 4 s, expire 6 s.' },
];

// Temps d'effort / de récupération selon le niveau.
const PACE = {
  debutant: { work: 30, rest: 30, rounds: [2, 3] },
  intermediaire: { work: 40, rest: 20, rounds: [3, 4] },
  avance: { work: 45, rest: 15, rounds: [3, 5] },
};
const LEVEL = { debutant: 1, intermediaire: 2, avance: 3 };
const BETWEEN = 60; // repos entre deux blocs (s)

// Exercices autorisés selon le lieu, le matériel, le niveau et la corpulence.
export function freePool(opts) {
  const lvl = LEVEL[opts.level] || 1;
  const eq = new Set(opts.equip || []);
  const space = opts.place === 'dehors' || opts.place === 'plage';
  return FREE.filter((e) => (!e.equip || eq.has(e.equip))
    && (!e.outdoor || space)
    && e.diff <= lvl + 1
    // Sauts : jamais si impact faible demandé (IMC élevé, genoux), et seulement les plus simples pour un débutant.
    && !(e.impact === 'high' && (opts.lowImpact || (lvl === 1 && e.diff > 1))));
}

// Petit générateur pseudo-aléatoire déterministe : même graine = même séance.
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s ^ (s >>> 15), 2246822507) + 0x9e3779b9) >>> 0; return s / 4294967296; };
}
function shuffle(arr, rand) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// Choix pondéré : le matériel disponible passe avant le poids du corps (on ne fait pas
// des supermans quand il y a des haltères).
function pickOne(cands, rand) {
  const equipped = cands.filter((e) => e.equip);
  const list = equipped.length && rand() < 0.75 ? equipped : cands;
  return shuffle(list, rand)[0];
}
// Circuit renfo : un exercice par groupe (jambes, poussée, tirage, gainage, jambes).
function forceCircuit(pool, rand, used, n) {
  const order = ['jambes', 'poussee', 'tirage', 'gainage', 'jambes'].slice(0, n);
  const out = [];
  for (const g of order) {
    const free = (e) => e.kind === 'force' && !out.includes(e);
    const c = pickOne(pool.filter((e) => free(e) && e.group === g && !used.has(e.id)), rand)
      || pickOne(pool.filter((e) => free(e) && e.group === g), rand)
      || pickOne(pool.filter(free), rand);
    if (c) out.push(c);
  }
  return out;
}
function cardioCircuit(pool, rand, used, n) {
  const cardio = pool.filter((e) => e.kind === 'cardio');
  const fresh = shuffle(cardio.filter((e) => !used.has(e.id)), rand);
  const equippedFirst = [...fresh.filter((e) => e.equip), ...fresh.filter((e) => !e.equip)];
  const all = [...(rand() < 0.75 ? equippedFirst : fresh), ...shuffle(cardio.filter((e) => used.has(e.id)), rand)];
  return all.slice(0, n);
}

const roundSeconds = (b) => b.perRound * (b.work + b.rest) + b.roundRest;
const blockTotal = (b) => b.rounds * roundSeconds(b) - b.roundRest - b.rest;

// Construit la séance : { title, blocks, steps, seconds }.
export function buildFreeSession(opts, seed = 0) {
  const level = opts.level || 'debutant';
  const pace = PACE[level];
  const rand = rng(hash(JSON.stringify([opts.place, opts.goal, opts.minutes, [...(opts.equip || [])].sort(), level, seed])));
  const pool = freePool({ ...opts, level });
  const machines = MACHINES.filter((m) => (opts.equip || []).includes(m) && (opts.place === 'salle' || opts.place === 'maison'));
  const used = new Set();
  const short = opts.minutes <= 20;
  const warmSteps = short ? 3 : 5; const coolSteps = short ? 2 : 3;
  const budget = opts.minutes * 60 - (warmSteps + coolSteps) * 60;
  const n = short ? 4 : 5;

  // Ordre des blocs selon l'objectif (on en prend autant que le temps permet).
  const plan = opts.goal === 'muscu' ? ['force', 'force', 'force']
    : opts.goal === 'cardio' ? (machines.length ? ['machine', 'cardio', 'machine'] : ['cardio', 'tabata', 'cardio'])
      : ['force', machines.length ? 'machine' : 'cardio', 'force'];
  const nBlocks = Math.max(1, Math.min(plan.length, Math.round(budget / (9 * 60))));

  const blocks = [];
  for (const type of plan.slice(0, nBlocks)) {
    if (type === 'machine') {
      const m = machines[Math.floor(rand() * machines.length)];
      const work = level === 'avance' ? 40 : 30;
      const easy = level === 'debutant' ? 60 : level === 'avance' ? 20 : 30;
      blocks.push({ type, name: `Intervalles ${MACHINE_CARDIO[m].name.toLowerCase()}`, machine: m, work, rest: easy, perRound: 1, roundRest: 0, rounds: 4, maxRounds: 15,
        exercises: [{ id: `m-${m}`, name: MACHINE_CARDIO[m].name, cue: `${MACHINE_CARDIO[m].work}. ${MACHINE_CARDIO[m].easy}.`, photo: MACHINE_CARDIO[m].photo }] });
    } else if (type === 'tabata' && level !== 'debutant') {
      const ex = cardioCircuit(pool, rand, used, 2);
      if (ex.length < 2) continue;
      ex.forEach((e) => used.add(e.id));
      // Tabata : 8 × (20 s / 10 s), les deux exercices en alternance. Durée fixe.
      blocks.push({ type, name: 'Tabata', work: 20, rest: 10, perRound: 2, roundRest: 0, rounds: 4, maxRounds: 4, exercises: ex });
    } else {
      const isForce = type === 'force';
      const ex = isForce ? forceCircuit(pool, rand, used, n) : cardioCircuit(pool, rand, used, n);
      if (ex.length < 2) continue;
      ex.forEach((e) => used.add(e.id));
      blocks.push({ type: isForce ? 'force' : 'cardio', name: isForce ? 'Circuit renfo' : 'Circuit cardio',
        work: isForce ? pace.work : Math.min(pace.work, 40), rest: isForce ? pace.rest : Math.max(pace.rest, 20),
        perRound: ex.length, roundRest: 60, rounds: 1, maxRounds: pace.rounds[1] + 1, exercises: ex });
    }
  }
  // Remplissage : on ajoute des tours à tour de rôle tant que ça tient dans le temps.
  const used_ = () => blocks.reduce((t, b) => t + blockTotal(b), 0) + Math.max(0, blocks.length - 1) * BETWEEN + 15;
  for (let grew = true; grew;) {
    grew = false;
    for (const b of [...blocks].sort((x, y) => x.rounds - y.rounds)) {
      if (b.rounds < b.maxRounds && used_() + roundSeconds(b) <= budget) { b.rounds++; grew = true; }
    }
  }
  // Reste au moins 2 min : finisher gainage (ou cardio) pour coller à la durée demandée.
  const left = budget - used_() - BETWEEN;
  if (left >= 120) {
    const fin = pickOne(pool.filter((e) => e.group === 'gainage' && !used.has(e.id)), rand) || pickOne(pool.filter((e) => e.group === 'gainage'), rand);
    if (fin) {
      const work = 30; const rest = 15;
      const rounds = Math.min(6, Math.floor((left + rest) / (work + rest)));
      blocks.push({ type: 'finisher', name: 'Finisher', work, rest, perRound: 1, roundRest: 0, rounds, maxRounds: rounds, exercises: [fin] });
    }
  }
  for (const b of blocks) b.seconds = blockTotal(b);

  const steps = toSteps(blocks, warmSteps, coolSteps);
  const seconds = steps.reduce((t, s) => t + s.secs, 0);
  return {
    title: `${GOALS_LIBRE[opts.goal][0]} · ${PLACES[opts.place][0]} · ${opts.minutes} min`,
    goal: opts.goal, place: opts.place, minutes: opts.minutes, blocks, steps, seconds,
  };
}

// Transforme les blocs en suite d'étapes chronométrées, échauffement et retour au calme compris.
export function toSteps(blocks, warmSteps = 5, coolSteps = 3) {
  const steps = [];
  const warm = WARMUP.slice(0, warmSteps); const cool = COOLDOWN.slice(0, coolSteps);
  warm.forEach((w, i) => steps.push({ phase: 'warmup', kind: 'work', label: w.name, cue: w.cue, secs: 60, block: 'Échauffement', pos: `${i + 1}/${warm.length}` }));
  blocks.forEach((b, bi) => {
    steps.push({ phase: 'main', kind: 'rest', label: bi === 0 ? 'Prépare-toi' : 'Récupération', cue: `Ensuite : ${b.name}`, secs: bi === 0 ? 15 : BETWEEN, block: b.name });
    for (let r = 0; r < b.rounds; r++) {
      for (let k = 0; k < b.perRound; k++) {
        const e = b.exercises[k % b.exercises.length];
        const machine = b.type === 'machine' && MACHINE_CARDIO[b.machine];
        steps.push({ phase: 'main', kind: 'work', label: machine ? `${e.name} : effort` : e.name, cue: machine ? machine.work : e.cue,
          exId: e.id, photo: e.photo, secs: b.work, block: b.name, pos: `Tour ${r + 1}/${b.rounds}` });
        const last = r === b.rounds - 1 && k === b.perRound - 1;
        if (last) continue;
        if (k === b.perRound - 1 && b.roundRest) steps.push({ phase: 'main', kind: 'rest', label: 'Fin du tour', cue: 'Respire, bois une gorgée.', secs: b.roundRest, block: b.name });
        else if (b.rest) steps.push({ phase: 'main', kind: 'rest', label: machine ? `${e.name} : récup` : 'Récup', cue: machine ? machine.easy : 'Respire, mets-toi en place.', secs: b.rest, block: b.name });
      }
    }
  });
  cool.forEach((c, i) => steps.push({ phase: 'cooldown', kind: 'work', label: c.name, cue: c.cue, secs: 60, block: 'Retour au calme', pos: `${i + 1}/${cool.length}` }));
  return steps;
}
