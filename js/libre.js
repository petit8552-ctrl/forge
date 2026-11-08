// Séance libre : une séance ponctuelle, hors programme, construite selon le lieu, le matériel
// disponible, la durée et l'objectif (cardio ou abdos). Tout est chronométré :
// la séance se joue comme une suite d'étapes (effort / récupération) avec des bips.
import { hash } from './engine.js';
import { BY_ID } from './exercises.js';
import { HOME } from './cible.js';

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
  cardio: ['Cardio', 'Souffle, brûler'], abdos: ['Abdos', 'Sangle abdominale'],
};
export const DURATIONS = [15, 20, 30, 45, 60, 75, 90];
// Durées proposées : jusqu'à 1 h 30 en cardio (endurance + intervalles), 30 min en abdos
// (au-delà, on répète les mêmes exercices sans bénéfice). La muscu a son propre volet (cible.js).
export function durationsFor(goal) {
  return goal === 'abdos' ? [15, 20, 30] : DURATIONS;
}

// kind : force | cardio · group : jambes | poussee | tirage | gainage | complet
// impact : high = sauts (déconseillé débutant / IMC élevé) · outdoor : besoin d'espace (dehors, plage)
// photo : nom dans Free Exercise DB (domaine public), null si l'exercice n'y figure pas.
// anim  : silhouette animée maison (media/anim/<id>.svg) pour les exercices sans photo.
export const FREE = [
  // Jambes
  { id: 'l-squat-saute', name: 'Squats sautés', kind: 'cardio', group: 'jambes', impact: 'high', diff: 2, photo: 'Freehand_Jump_Squat', cue: 'Réception souple, genoux dans l’axe, enchaîne.' },
  { id: 'l-fentes-sautees', name: 'Fentes sautées', kind: 'cardio', group: 'jambes', impact: 'high', diff: 3, photo: 'Split_Jump', cue: 'Change de jambe en l’air, atterris en douceur.' },
  // Poussée
  // Tirage
  // Gainage
  { id: 'plank', name: 'Planche', kind: 'force', group: 'gainage', impact: 'low', diff: 1, photo: 'Plank', cue: 'Corps aligné, fessiers et abdos serrés.' },
  { id: 'side-plank', name: 'Planche latérale', kind: 'force', group: 'gainage', impact: 'low', diff: 1, photo: 'Side_Bridge', cue: 'Hanches hautes, change de côté à mi-temps.' },
  { id: 'l-crunch-velo', name: 'Crunch bicyclette', kind: 'force', group: 'gainage', impact: 'low', diff: 1, photo: 'Air_Bike', cue: 'Coude vers genou opposé, lentement.' },
  { id: 'l-russian', name: 'Russian twist', kind: 'force', group: 'gainage', impact: 'low', diff: 2, photo: 'Russian_Twist', cue: 'Pieds décollés si possible, tourne les épaules.' },
  { id: 'l-flutter', name: 'Battements de jambes', kind: 'force', group: 'gainage', impact: 'low', diff: 1, photo: 'Flutter_Kicks', cue: 'Bas du dos collé au sol, petits battements.' },
  { id: 'l-crunch', name: 'Crunch', kind: 'force', group: 'gainage', impact: 'low', diff: 1, photo: 'Crunches', cue: 'Bas du dos au sol, enroule le haut du buste, mains aux tempes sans tirer la nuque.' },
  { id: 'l-crunch-inverse', name: 'Crunch inversé', kind: 'force', group: 'gainage', impact: 'low', diff: 1, photo: 'Reverse_Crunch', cue: 'Genoux pliés, décolle le bassin du sol en ramenant les genoux vers la poitrine.' },
  { id: 'l-genoux-poitrine', name: 'Genoux-poitrine assis', kind: 'force', group: 'gainage', impact: 'low', diff: 1, photo: 'Leg_Pull-In', cue: 'Assis, mains derrière, ramène les genoux vers la poitrine puis tends les jambes.' },
  { id: 'l-oblique', name: 'Crunch oblique', kind: 'force', group: 'gainage', impact: 'low', diff: 1, photo: 'Oblique_Crunches_-_On_The_Floor', cue: 'Sur le côté, genoux pliés, monte l’épaule vers la hanche. Change de côté à mi-temps.' },
  { id: 'l-toe-touch', name: 'Touchers de pieds', kind: 'force', group: 'gainage', impact: 'low', diff: 1, photo: 'Toe_Touchers', cue: 'Jambes tendues vers le plafond, monte les mains vers les pieds.' },
  { id: 'dead-bug', name: 'Dead bug', kind: 'force', group: 'gainage', impact: 'low', diff: 1, photo: 'Dead_Bug', cue: 'Dos plaqué au sol, tends bras et jambe opposés lentement.' },
  { id: 'l-sit-up', name: 'Sit-up', kind: 'force', group: 'gainage', impact: 'low', diff: 2, photo: '3_4_Sit-Up', cue: 'Pieds au sol, enroule le buste jusqu’à la verticale, redescends lentement.' },
  { id: 'l-jackknife', name: 'Jackknife', kind: 'force', group: 'gainage', impact: 'low', diff: 3, photo: 'Jackknife_Sit-Up', cue: 'Allongé, monte bras et jambes tendus en même temps pour te toucher les pieds.' },
  { id: 'hanging-raise', name: 'Relevés de jambes suspendu', kind: 'force', group: 'gainage', equip: 'barre', impact: 'low', diff: 2, photo: 'Hanging_Leg_Raise', cue: 'Suspendu, monte les genoux (ou jambes tendues) sans balancer.' },
  { id: 'l-spell', name: 'Rotations haltère', kind: 'force', group: 'gainage', equip: 'halteres', impact: 'low', diff: 2, photo: 'Spell_Caster', cue: 'Haltère à deux mains, passe-le d’une hanche à l’épaule opposée en pivotant.' },
  { id: 'l-mountain', name: 'Mountain climbers', kind: 'cardio', group: 'gainage', impact: 'low', diff: 1, photo: 'Mountain_Climbers', cue: 'Position de pompe, genoux vers la poitrine en alternance, rapide.' },
  // Cardio complet
  { id: 'l-burpees', name: 'Burpees', kind: 'cardio', group: 'complet', impact: 'high', diff: 2, photo: null, anim: 'l-burpees', cue: 'Squat, mains au sol, pieds en arrière, pompe (facultatif), pieds vers les mains, saut.' },
  { id: 'l-jacks', name: 'Jumping jacks', kind: 'cardio', group: 'complet', impact: 'high', diff: 1, photo: null, anim: 'l-jacks', cue: 'Saute en écartant bras et jambes, reviens pieds joints.' },
  { id: 'l-pas-chasses', name: 'Pas chassés', kind: 'cardio', group: 'complet', impact: 'low', diff: 1, photo: null, anim: 'l-pas-chasses', cue: 'Déplacements latéraux rapides, genoux fléchis, sans croiser les pieds.' },
  { id: 'l-genoux-hauts', name: 'Montées de genoux', kind: 'cardio', group: 'complet', impact: 'low', diff: 1, photo: null, anim: 'l-genoux-hauts', cue: 'Sur place, genoux à hauteur de hanche, bras actifs.' },
  { id: 'l-inchworm', name: 'Inchworm', kind: 'cardio', group: 'complet', impact: 'low', diff: 1, photo: 'Inchworm', cue: 'Mains au sol, avance en planche, reviens en marchant les pieds.' },
  { id: 'l-tuck', name: 'Sauts genoux poitrine', kind: 'cardio', group: 'complet', impact: 'high', diff: 3, photo: 'Knee_Tuck_Jump', cue: 'Saute en ramenant les genoux, réception souple.' },
  { id: 'l-patineur', name: 'Sauts du patineur', kind: 'cardio', group: 'complet', impact: 'high', diff: 2, photo: 'Lateral_Bound', cue: 'Bonds latéraux d’une jambe sur l’autre, stabilise 1 s.' },
  { id: 'l-corde', name: 'Corde à sauter', kind: 'cardio', group: 'complet', equip: 'corde', impact: 'high', diff: 1, photo: 'Rope_Jumping', cue: 'Petits sauts sur l’avant du pied, poignets qui tournent.' },
  { id: 'l-swing', name: 'Kettlebell swing', kind: 'cardio', group: 'complet', equip: 'kettlebell', impact: 'low', diff: 2, photo: 'One-Arm_Kettlebell_Swings', cue: 'Le mouvement vient des hanches, pas des bras. Dos plat.' },
  { id: 'l-epaule-jete', name: 'Épaulé haltères', kind: 'cardio', group: 'complet', equip: 'halteres', impact: 'low', diff: 2, photo: 'Dumbbell_Clean', cue: 'Des cuisses aux épaules d’un coup de hanches.' },
  // Besoin d'espace : plein air et plage (sur le sable, l'effort double)
  { id: 'l-sprint', name: 'Sprint', kind: 'cardio', group: 'complet', impact: 'high', diff: 1, outdoor: true, photo: 'Wind_Sprints', cue: '20 à 30 m à fond, retour en marchant.' },
  { id: 'l-saut-longueur', name: 'Sauts en longueur', kind: 'cardio', group: 'jambes', impact: 'high', diff: 2, outdoor: true, photo: 'Standing_Long_Jump', cue: 'Pieds joints, élan des bras, réception genoux fléchis.' },
  { id: 'l-footing', name: 'Footing', kind: 'endurance', group: 'complet', impact: 'low', diff: 1, outdoor: true, photo: null, anim: 'l-footing', cue: 'Allure où tu peux parler par phrases courtes. Sur le sable : foulée courte, ou marche rapide.' },
  { id: 'l-ours', name: 'Marche de l’ours', kind: 'cardio', group: 'complet', impact: 'low', diff: 2, outdoor: true, photo: null, anim: 'l-ours', cue: 'À quatre pattes, genoux décollés, avance main/pied opposés.' },
];

// Un mouvement partagé avec le programme ou la muscu ciblée porte le même nom partout.
const HOME_NAMES = Object.fromEntries(HOME.map((e) => [e.id, e.name]));
for (const e of FREE) e.name = BY_ID[e.id]?.name || HOME_NAMES[e.id] || e.name;

// Secondes par répétition à bon rythme (niveau avancé). Sert à donner un objectif de reps
// pour un effort chronométré. Absent = exercice au temps (gainage, corde, sprint, déplacements…).
const SEC_PER_REP = {
  'l-squat-saute': 2.5, 'l-fentes-sautees': 2.2, 'l-crunch-velo': 1.5, 'l-russian': 1.2, 'l-burpees': 3.5,
  'l-jacks': 1, 'l-tuck': 2.5, 'l-patineur': 1.5, 'l-swing': 2, 'l-epaule-jete': 3, 'l-saut-longueur': 5,
  'l-inchworm': 6, 'l-crunch': 2, 'l-crunch-inverse': 2.5, 'l-genoux-poitrine': 2.5, 'l-oblique': 2,
  'l-toe-touch': 2, 'dead-bug': 3, 'l-sit-up': 3, 'l-jackknife': 3, 'hanging-raise': 3, 'l-spell': 2.5,
};
// Exercices qui se font vraiment à la durée (position tenue, déplacement, rythme continu).
export const TIMED_FREE = ['plank', 'side-plank', 'l-flutter', 'l-mountain', 'l-pas-chasses', 'l-genoux-hauts', 'l-corde', 'l-sprint', 'l-ours', 'l-footing'];
const LEVEL_PACE = { debutant: 0.7, intermediaire: 0.85, avance: 1 };

// Objectif affiché pour un effort de `secs` secondes : « ≈ 10–13 reps » ou « au temps ».
export function repTarget(id, secs, level = 'intermediaire') {
  const spr = SEC_PER_REP[id];
  if (!spr) return { reps: null, text: 'au temps, sans t’arrêter' };
  const hi = Math.max(2, Math.round((secs / spr) * (LEVEL_PACE[level] || 0.85)));
  const lo = Math.max(1, Math.round(hi * 0.75));
  return { reps: [lo, hi], text: `≈ ${lo}–${hi} reps` };
}

// Endurance : effort continu à allure modérée, découpé en tranches de 5 min (repère + bip).
const ENDURANCE = {
  velo: 'Allure modérée, résistance moyenne : tu peux parler par phrases courtes.',
  tapis: 'Course lente ou marche rapide en pente : tu peux parler par phrases courtes.',
  rameur: 'Coups réguliers, sans forcer : tu peux parler par phrases courtes.',
  elliptique: 'Allure régulière, résistance moyenne : tu peux parler par phrases courtes.',
};

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
  return FREE.filter((e) => e.kind !== 'endurance' && (!e.equip || eq.has(e.equip))
    && (!e.outdoor || space)
    && e.diff <= lvl + 1
    // Sauts : jamais pour un débutant ni si impact faible demandé (IMC élevé) — même règle que le programme.
    && !(e.impact === 'high' && (opts.lowImpact || lvl === 1)));
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
  const fullBudget = opts.minutes * 60 - (warmSteps + coolSteps) * 60;
  let budget = fullBudget; // temps restant pour les blocs après l'endurance
  const n = short ? 4 : 5;
  const blocks = [];

  // Cardio long (1 h et plus) : d'abord un bloc d'endurance à allure modérée, puis les intervalles.
  // Enchaîner 1 h 30 d'intervalles serait épuisant et ce n'est pas ainsi qu'on construit l'endurance.
  if (opts.goal === 'cardio' && opts.minutes >= 60) {
    // Peu d'exercices possibles (débutant, sans matériel) : plus d'endurance, moins de circuits qui se répètent.
    const variety = pool.filter((e) => e.kind === 'cardio').length;
    const share = variety < 9 ? 0.55 : 0.45;
    const secs = Math.min(variety < 9 ? 50 : 40, Math.round((budget / 60) * share / 5) * 5) * 60;
    const space = opts.place === 'dehors' || opts.place === 'plage';
    let ex; let cue;
    if (machines.length) {
      const m = machines[Math.floor(rand() * machines.length)];
      ex = [{ id: `m-${m}`, name: MACHINE_CARDIO[m].name, photo: MACHINE_CARDIO[m].photo }]; cue = ENDURANCE[m];
    } else if (space) {
      const f = FREE.find((e) => e.id === 'l-footing');
      ex = [f]; cue = f.cue;
    } else {
      // Ni machine ni espace : cardio continu, un exercice sans saut par tranche de 5 min.
      ex = shuffle(pool.filter((e) => e.kind === 'cardio' && e.impact === 'low'), rand).slice(0, 4);
      cue = 'Rythme régulier, sans t’arrêter : tu peux parler par phrases courtes.';
    }
    if (ex.length) {
      blocks.push({ type: 'endurance', name: 'Endurance', work: 300, rest: 0, perRound: 1, roundRest: 0, rounds: secs / 300, maxRounds: secs / 300, exercises: ex, cue });
      budget -= secs + BETWEEN;
    }
  }

  // Ordre des blocs selon l'objectif (on en prend autant que le temps permet).
  const plan = opts.goal === 'abdos' ? ['abdos', 'abdos', 'abdos', 'abdos']
    : (machines.length ? ['machine', 'cardio', 'machine', 'cardio', 'tabata'] : ['cardio', 'tabata', 'cardio', 'tabata', 'cardio']);
  const nBlocks = Math.max(1, Math.min(plan.length, Math.round(budget / ((opts.goal === 'abdos' ? 8 : 9) * 60))));

  for (const type of plan.slice(0, nBlocks)) {
    if (type === 'machine') {
      const m = machines[Math.floor(rand() * machines.length)];
      const work = level === 'avance' ? 40 : 30;
      const easy = level === 'debutant' ? 60 : level === 'avance' ? 20 : 30;
      blocks.push({ type, name: `Intervalles ${MACHINE_CARDIO[m].name.toLowerCase()}`, machine: m, work, rest: easy, perRound: 1, roundRest: 0, rounds: 4, maxRounds: 15,
        exercises: [{ id: `m-${m}`, name: MACHINE_CARDIO[m].name, cue: `${MACHINE_CARDIO[m].work}. ${MACHINE_CARDIO[m].easy}.`, photo: MACHINE_CARDIO[m].photo }] });
    } else if (type === 'abdos') {
      // Circuit abdos : exercices de la sangle (gainage, enroulements, rotations), sans répétition dans le circuit.
      const abs = pool.filter((e) => e.group === 'gainage');
      const fresh = shuffle(abs.filter((e) => !used.has(e.id)), rand);
      const ex = [...fresh, ...shuffle(abs.filter((e) => used.has(e.id)), rand)].slice(0, n);
      if (ex.length < 3) continue;
      ex.forEach((e) => used.add(e.id));
      blocks.push({ type: 'abdos', name: 'Circuit abdos', work: pace.work, rest: pace.rest, perRound: ex.length, roundRest: 45, rounds: 1, maxRounds: pace.rounds[1] + 1, exercises: ex });
    } else if (type === 'tabata' && level !== 'debutant') {
      const ex = cardioCircuit(pool, rand, used, 2);
      if (ex.length < 2) continue;
      ex.forEach((e) => used.add(e.id));
      // Tabata : 8 × (20 s / 10 s), les deux exercices en alternance. Durée fixe.
      blocks.push({ type, name: 'Tabata', work: 20, rest: 10, perRound: 2, roundRest: 0, rounds: 4, maxRounds: 4, exercises: ex });
    } else {
      // Circuit cardio (tabata débutant inclus). Pas de 3e circuit s'il ne reste presque que des
      // exercices déjà faits : on ajoute plutôt des tours aux circuits existants.
      const fresh = pool.filter((e) => e.kind === 'cardio' && !used.has(e.id)).length;
      if (blocks.filter((x) => x.type === 'cardio').length >= 2 && fresh < 3) continue;
      const ex = cardioCircuit(pool, rand, used, n);
      if (ex.length < 2) continue;
      ex.forEach((e) => used.add(e.id));
      blocks.push({ type: 'cardio', name: 'Circuit cardio', work: Math.min(pace.work, 40), rest: Math.max(pace.rest, 20),
        perRound: ex.length, roundRest: 60, rounds: 1, maxRounds: pace.rounds[1] + (opts.minutes >= 60 ? 2 : 1), exercises: ex });
    }
  }
  // Remplissage : on ajoute des tours à tour de rôle tant que ça tient dans le temps.
  const used_ = () => blocks.reduce((t, b) => t + blockTotal(b), 0) + Math.max(0, blocks.length - 1) * BETWEEN + 15;
  for (let grew = true; grew;) {
    grew = false;
    for (const b of [...blocks].sort((x, y) => x.rounds - y.rounds)) {
      if (b.rounds < b.maxRounds && used_() + roundSeconds(b) <= fullBudget) { b.rounds++; grew = true; }
    }
  }
  // Reste au moins 2 min : finisher gainage (ou cardio) pour coller à la durée demandée.
  const left = fullBudget - used_() - BETWEEN;
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

// Où on en est dans le bloc, affiché pendant la séance.
function stepPos(b, r, k) {
  if (b.type === 'tabata') return `Série ${r * 2 + k + 1}/8`;
  if (b.type === 'machine' || b.type === 'finisher') return `Série ${r + 1}/${b.rounds}`;
  return `Exo ${k + 1}/${b.perRound} · Tour ${r + 1}/${b.rounds}`;
}

// Mode d'emploi d'un bloc, en clair : quoi faire, combien de temps, quand récupérer, quand recommencer.
export function blockGuide(b) {
  const min = Math.max(1, Math.round(b.seconds / 60));
  const n = b.exercises.length;
  if (b.type === 'tabata') {
    return { minutes: min, text: `Alterne les 2 exercices : ${b.work} s à fond, ${b.rest} s de repos, 8 fois de suite (1, 2, 1, 2…). Pas de pause entre les séries : c’est court mais intense.` };
  }
  if (b.type === 'machine') {
    return { minutes: min, text: `Sur le ${b.exercises[0].name.toLowerCase()}, sans descendre : ${b.work} s d’effort fort, puis ${b.rest} s à allure facile. Répète ${b.rounds} fois.` };
  }
  if (b.type === 'endurance') {
    const what = b.exercises.length > 1 ? `${b.exercises.length} exercices sans saut, 5 min chacun, sans pause` : `${b.exercises[0].name.toLowerCase()} en continu`;
    return { minutes: min, text: `${min} min d’effort modéré : ${what}. Tu dois pouvoir parler par phrases courtes. Un bip toutes les 5 min.` };
  }
  if (b.type === 'finisher') {
    return { minutes: min, text: `Un seul exercice pour finir : ${b.work} s d’effort, ${b.rest} s de repos, ${b.rounds} fois.` };
  }
  const tours = b.rounds > 1
    ? `Après le n°${n}, 1 min de pause, puis recommence au n°1. ${b.rounds} tours en tout.`
    : 'Un seul tour.';
  return { minutes: min, text: `Fais les ${n} exercices dans l’ordre : ${b.work} s d’effort chacun, ${b.rest} s de récup entre deux. ${tours}` };
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
        if (b.type === 'endurance') {
          const ex = b.exercises[r % b.exercises.length];
          steps.push({ phase: 'main', kind: 'work', label: b.exercises.length > 1 || ex.id.startsWith('m-') ? `${ex.name} : endurance` : ex.name, cue: b.cue,
            exId: ex.id, photo: ex.photo, anim: ex.anim, secs: b.work, block: b.name, pos: `Tranche ${r + 1}/${b.rounds} · 5 min` });
          continue;
        }
        const machine = b.type === 'machine' && MACHINE_CARDIO[b.machine];
        steps.push({ phase: 'main', kind: 'work', label: machine ? `${e.name} : effort` : e.name, cue: machine ? machine.work : e.cue,
          exId: e.id, photo: e.photo, anim: e.anim, secs: b.work, block: b.name, pos: stepPos(b, r, k) });
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
