// Moteur de coaching : bilan corporel, choix du split, périodisation sur blocs de 4 semaines,
// sélection des exercices avec variantes hebdomadaires et suggestion de charges.
import { EXERCISES, BY_ID, CARDIO, TECHNIQUES } from './exercises.js';

// ---------- Utilitaires ----------
export function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
const LEVEL = { debutant: 1, intermediaire: 2, avance: 3 };
const round = (x, step) => Math.max(step, Math.round(x / step) * step);
const DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
export { DAY_NAMES };

export const DEFAULT_DAYS = {
  2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 4, 5], 6: [0, 1, 2, 3, 4, 5],
};

// ---------- Données Apple Santé ----------
const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const isoDay = (d) => d.toISOString().slice(0, 10);

// Forme du jour à partir du sommeil, du cœur au repos et de la VFC, comparés à ta moyenne des 14 jours précédents.
export function readiness(health = [], date = new Date()) {
  if (!health.length) return null;
  const rows = [...health].sort((a, b) => a.day.localeCompare(b.day));
  const today = isoDay(date);
  const yest = isoDay(new Date(date.getTime() - 864e5));
  const last = rows[rows.length - 1];
  if (last.day !== today && last.day !== yest) return null;
  const before = rows.filter((r) => r.day < last.day).slice(-14);
  const base = (k) => { const v = before.map((r) => Number(r[k])).filter((x) => x > 0); return v.length >= 3 ? avg(v) : null; };
  let score = 0; const reasons = []; let measured = 0;
  if (last.sleep_min) {
    measured++;
    const h = last.sleep_min / 60;
    if (h < 5) { score -= 2; reasons.push(`nuit courte (${fmtH(last.sleep_min)})`); }
    else if (h < 6) { score -= 1; reasons.push(`sommeil un peu court (${fmtH(last.sleep_min)})`); }
  }
  if (last.resting_hr) {
    measured++;
    const b = base('resting_hr');
    if (b && last.resting_hr > b + 7) { score -= 2; reasons.push(`cœur au repos élevé (${Math.round(last.resting_hr)} contre ${Math.round(b)} bpm d’habitude)`); }
    else if (b && last.resting_hr > b + 4) { score -= 1; reasons.push(`cœur au repos un peu haut (${Math.round(last.resting_hr)} bpm)`); }
  }
  if (last.hrv) {
    measured++;
    const b = base('hrv');
    if (b && last.hrv < b * 0.8) { score -= 2; reasons.push('variabilité cardiaque basse'); }
    else if (b && last.hrv < b * 0.9) { score -= 1; reasons.push('variabilité cardiaque en baisse'); }
  }
  if (!measured) return { level: null, last, reasons };
  const level = score >= 0 ? 'bonne' : score === -1 ? 'moyenne' : 'basse';
  return { level, score, last, reasons };
}
export function fmtH(min) { return `${Math.floor(min / 60)} h ${String(Math.round(min % 60)).padStart(2, '0')}`; }

// Dépense réelle mesurée (moyenne des 7 derniers jours d'énergie active), si au moins 3 jours disponibles.
function measuredActive(health = []) {
  const v = [...health].sort((a, b) => a.day.localeCompare(b.day)).slice(-7).map((r) => Number(r.active_kcal)).filter((x) => x > 0);
  return v.length >= 3 ? avg(v) : null;
}

// ---------- Bilan corporel ----------
export function bodyMetrics(p, health) {
  const h = p.height / 100;
  const bmi = p.weight / (h * h);
  const bmr = 10 * p.weight + 6.25 * p.height - 5 * p.age + (p.sex === 'f' ? -161 : 5);
  const sessions = p.days.length;
  const activity = 1.2 + 0.06 * sessions + (p.dailyActivity === 'actif' ? 0.1 : p.dailyActivity === 'sedentaire' ? 0 : 0.05);
  // Avec la montre : métabolisme + petite marge + énergie active réellement mesurée.
  const active = measuredActive(health);
  const tdee = active ? bmr * 1.15 + active : bmr * activity;
  // Surplus léger en prise de muscle, déficit de 20 % plafonné à 600 kcal en sèche.
  const target = {
    masse: tdee + (bmi < 18.5 ? 400 : 300),
    seche: Math.max(tdee * 0.8, tdee - 600),
    force: tdee + 150,
    forme: bmi >= 27 ? Math.max(tdee * 0.85, tdee - 500) : tdee,
  }[p.goal];
  const kcal = Math.round(target / 10) * 10;
  // Protéines rapportées au poids de référence quand l'IMC est élevé (évite des apports démesurés).
  const refWeight = bmi > 30 ? 25 * h * h : p.weight;
  const protein = Math.round(refWeight * (p.goal === 'seche' ? 2.2 : 1.8));
  const fat = Math.round(p.weight * 0.9 * (bmi > 30 ? 0.8 : 1));
  const carbs = Math.max(50, Math.round((kcal - protein * 4 - fat * 9) / 4));
  const water = Math.round((p.weight * 0.035 + 0.5) * 10) / 10;
  let bmiLabel = 'Corpulence normale';
  if (bmi < 18.5) bmiLabel = 'Maigreur'; else if (bmi >= 30) bmiLabel = 'Obésité'; else if (bmi >= 25) bmiLabel = 'Surpoids';
  return { bmi, bmiLabel, bmr: Math.round(bmr), tdee: Math.round(tdee), kcal, protein, fat, carbs, water, measured: !!active, active: active && Math.round(active) };
}

// Conseils généraux adaptés au profil.
export function coachAdvice(p) {
  const m = bodyMetrics(p);
  const tips = [];
  if (m.bmi >= 30) tips.push('Ton programme privilégie les machines et un cardio sans impact (vélo, elliptique, marche inclinée) pour protéger genoux et dos.');
  if (m.bmi < 18.5) tips.push('Priorité à la prise de poids : vise +0,25 à 0,5 kg par semaine et ajoute une collation riche (lait, flocons d’avoine, beurre de cacahuète).');
  if (p.goal === 'masse') tips.push('Surplus calorique léger : si ton poids ne bouge pas en 2 semaines, ajoute 150 kcal par jour.');
  if (p.goal === 'seche') tips.push('Déficit modéré : vise −0,5 à −1 % du poids par semaine. Garde des charges lourdes pour conserver le muscle.');
  if (p.goal === 'force') tips.push('Repos longs (3 min) sur les exercices principaux : la qualité de chaque répétition prime.');
  if (p.goal === 'forme') tips.push('Chaque séance finit par du cardio : c’est le meilleur investissement pour la santé du cœur.');
  if (p.level === 'debutant') tips.push('Les 4 premières semaines servent à apprendre les mouvements : charges modérées, technique parfaite.');
  tips.push(`Vise ${p.dailyActivity === 'actif' ? '8 000' : '10 000'} pas par jour et 7 à 9 h de sommeil : la récupération fait grandir le muscle.`);
  return tips;
}

// ---------- Split selon le nombre de séances ----------
// Chaque séance = liste de créneaux [pattern, rôle]. Rôles : main (principal), sec (secondaire), acc (accessoire).
const T = {
  fullA: { name: 'Full body A', focus: 'Squat & poussée', slots: [['squat', 'main'], ['hpush', 'main'], ['hpull', 'sec'], ['ham', 'acc'], ['lateral', 'acc'], ['core', 'acc'], ['biceps', 'acc']] },
  fullB: { name: 'Full body B', focus: 'Charnière & tirage', slots: [['hinge', 'main'], ['vpull', 'main'], ['vpush', 'sec'], ['quad', 'acc'], ['triceps', 'acc'], ['calves', 'acc'], ['core', 'acc']] },
  fullC: { name: 'Full body C', focus: 'Volume global', slots: [['quad', 'sec'], ['hpush', 'sec'], ['hpull', 'main'], ['hinge', 'sec'], ['rear', 'acc'], ['biceps', 'acc'], ['triceps', 'acc']] },
  upperA: { name: 'Haut du corps A', focus: 'Pectoraux & dos', slots: [['hpush', 'main'], ['hpull', 'main'], ['vpush', 'sec'], ['vpull', 'sec'], ['lateral', 'acc'], ['biceps', 'acc'], ['triceps', 'acc']] },
  lowerA: { name: 'Bas du corps A', focus: 'Quadriceps', slots: [['squat', 'main'], ['hinge', 'sec'], ['quad', 'acc'], ['ham', 'acc'], ['calves', 'acc'], ['core', 'acc']] },
  upperB: { name: 'Haut du corps B', focus: 'Épaules & dos', slots: [['vpush', 'main'], ['vpull', 'main'], ['hpush', 'sec'], ['hpull', 'sec'], ['rear', 'acc'], ['triceps', 'acc'], ['biceps', 'acc']] },
  lowerB: { name: 'Bas du corps B', focus: 'Ischios & fessiers', slots: [['hinge', 'main'], ['squat', 'sec'], ['glutes', 'acc'], ['ham', 'acc'], ['calves', 'acc'], ['core', 'acc']] },
  push: { name: 'Push', focus: 'Pectoraux, épaules, triceps', slots: [['hpush', 'main'], ['vpush', 'sec'], ['hpush', 'sec'], ['chest', 'acc'], ['lateral', 'acc'], ['triceps', 'acc'], ['triceps', 'acc']] },
  pull: { name: 'Pull', focus: 'Dos & biceps', slots: [['vpull', 'main'], ['hpull', 'main'], ['hpull', 'sec'], ['rear', 'acc'], ['biceps', 'acc'], ['biceps', 'acc'], ['core', 'acc']] },
  legs: { name: 'Jambes', focus: 'Quadriceps, ischios, fessiers', slots: [['squat', 'main'], ['hinge', 'sec'], ['quad', 'acc'], ['ham', 'acc'], ['glutes', 'acc'], ['calves', 'acc']] },
};

export function splitFor(n) {
  switch (n) {
    case 2: return { name: 'Full body ×2', days: [T.fullA, T.fullB] };
    case 3: return { name: 'Full body ×3', days: [T.fullA, T.fullB, T.fullC] };
    case 4: return { name: 'Haut / Bas ×2', days: [T.upperA, T.lowerA, T.upperB, T.lowerB] };
    case 5: return { name: 'Haut / Bas + Push / Pull / Jambes', days: [T.upperA, T.lowerA, T.push, T.pull, T.legs] };
    default: return { name: 'Push / Pull / Jambes ×2', days: [T.push, T.pull, T.legs, T.push, T.pull, T.legs] };
  }
}

// ---------- Périodisation ----------
export const PHASES = [
  { key: 'acc', name: 'Accumulation', short: 'S1', desc: 'Volume modéré, on installe la technique et les sensations.' },
  { key: 'prog', name: 'Progression', short: 'S2', desc: 'Une série de plus, charges un peu plus lourdes.' },
  { key: 'int', name: 'Intensification', short: 'S3', desc: 'Semaine la plus dure : près de l’échec, techniques d’intensité.' },
  { key: 'deload', name: 'Récupération', short: 'S4', desc: 'Volume et charges réduits pour assimiler. Les nouveaux exercices arrivent la semaine prochaine.' },
];

export function phaseOf(week) { return PHASES[(week - 1) % 4]; }
export function blockOf(week) { return Math.floor((week - 1) / 4); }

// Schémas séries × reps par objectif, phase et rôle : [séries, repsMin, repsMax, RIR, repos s]
const SCHEMES = {
  masse: {
    main: [[3, 10, 12, 3, 120], [4, 8, 10, 2, 150], [4, 6, 8, 1, 150], [2, 8, 10, 4, 120]],
    sec: [[3, 10, 12, 3, 90], [3, 10, 12, 2, 90], [4, 8, 10, 1, 90], [2, 10, 12, 4, 90]],
    acc: [[3, 12, 15, 2, 60], [3, 12, 15, 1, 60], [3, 10, 12, 0, 60], [2, 12, 15, 3, 60]],
  },
  force: {
    main: [[4, 6, 6, 3, 180], [5, 5, 5, 2, 210], [5, 3, 3, 1, 240], [3, 5, 5, 4, 180]],
    sec: [[3, 8, 8, 3, 120], [4, 6, 8, 2, 120], [4, 6, 6, 1, 150], [2, 8, 8, 4, 120]],
    acc: [[3, 10, 12, 2, 75], [3, 10, 12, 1, 75], [3, 8, 10, 1, 75], [2, 10, 12, 3, 60]],
  },
  seche: {
    main: [[3, 8, 10, 3, 120], [4, 8, 10, 2, 120], [4, 6, 8, 1, 120], [2, 8, 10, 4, 90]],
    sec: [[3, 10, 12, 2, 75], [3, 10, 12, 2, 75], [3, 8, 10, 1, 75], [2, 10, 12, 4, 60]],
    acc: [[3, 12, 15, 2, 45], [3, 15, 20, 1, 45], [3, 12, 15, 0, 45], [2, 12, 15, 3, 45]],
  },
  forme: {
    main: [[3, 10, 12, 3, 90], [3, 10, 12, 2, 90], [3, 8, 10, 2, 90], [2, 10, 12, 4, 75]],
    sec: [[3, 12, 12, 3, 75], [3, 10, 12, 2, 75], [3, 10, 12, 2, 75], [2, 12, 12, 4, 60]],
    acc: [[2, 12, 15, 2, 45], [3, 12, 15, 2, 45], [3, 12, 15, 1, 45], [2, 12, 15, 3, 45]],
  },
};

function maxSlots(duration) {
  if (duration <= 45) return 5;
  if (duration <= 60) return 6;
  return 7;
}

// ---------- Sélection des exercices ----------
function eligible(pattern, p, role) {
  const m = bodyMetrics(p);
  const lvl = LEVEL[p.level];
  const heavy = m.bmi >= 30;
  let pool = EXERCISES.filter((e) => e.pattern === pattern && e.diff <= lvl + 1);
  // Exercices au poids du corps exigeants : écartés pour les débutants et les profils à IMC élevé.
  if (lvl === 1 || heavy) pool = pool.filter((e) => !e.bw);
  // Profil à IMC élevé : on évite la charge axiale lourde en exercice principal.
  if (heavy && role === 'main') pool = pool.filter((e) => !['squat', 'deadlift', 'good-morning', 'front-squat'].includes(e.id)) ;
  // Débutant : exercice principal simple à apprendre.
  if (lvl === 1 && role === 'main') pool = pool.filter((e) => e.diff <= 2);
  // Les pompes n'ont pas leur place en exercice principal à la salle.
  if (role !== 'acc') pool = pool.filter((e) => e.id !== 'pompes');
  return pool.length ? pool : EXERCISES.filter((e) => e.pattern === pattern);
}

export function poolFor(pattern, p, role) { return eligible(pattern, p, role); }

// Le principal change à chaque bloc de 4 semaines (pour pouvoir progresser dessus) ;
// secondaires et accessoires tournent chaque semaine pour casser la monotonie.
function pick(pool, seed, used) {
  for (let i = 0; i < pool.length; i++) {
    const ex = pool[(seed + i) % pool.length];
    if (!used.has(ex.id)) return ex;
  }
  return pool[seed % pool.length];
}

// ---------- Charges ----------
function increment(ex) {
  if (ex.unit === 'halteres') return 2;
  if (ex.kind === 'iso') return ex.unit === 'barre' ? 2.5 : 2.5;
  return ['squat', 'hinge'].includes(ex.pattern) ? 5 : 2.5;
}
function step(ex) { return ex.unit === 'halteres' ? 2 : ex.unit === 'barre' ? 2.5 : 2.5; }

function baselineLoad(ex, p, targetReps) {
  if (!ex.coef) return null;
  const lvlF = { debutant: 0.55, intermediaire: 1, avance: 1.3 }[p.level];
  const lower = ['squat', 'hinge', 'quad', 'ham', 'glutes', 'calves'].includes(ex.pattern);
  const sexF = p.sex === 'f' ? (lower ? 0.8 : 0.6) : 1;
  // Plafonne le poids pris en compte : la force ne croît pas linéairement avec la masse grasse.
  const w = Math.min(p.weight, 25 * (p.height / 100) ** 2 * 1.15);
  const l10 = ex.coef * w * lvlF * sexF;
  const load = l10 * (1 + 10 / 30) / (1 + targetReps / 30); // Epley
  const min = ex.unit === 'barre' ? 20 : step(ex);
  return Math.max(min, round(load, step(ex)));
}

// Dernière performance enregistrée pour un exercice.
export function lastPerformance(history, exId) {
  for (let i = history.length - 1; i >= 0; i--) {
    const ex = history[i].exercises.find((e) => e.id === exId);
    if (ex && ex.sets.some((s) => s.done)) return { session: history[i], sets: ex.sets.filter((s) => s.done) };
  }
  return null;
}

export function suggestLoad(ex, p, history, scheme, phaseKey) {
  const [, rMin, rMax] = scheme;
  if (ex.unit === 'pdc') return { load: null, note: ex.bw ? 'Poids du corps (leste-toi si tu dépasses les reps visées)' : 'Poids du corps' };
  const last = lastPerformance(history, ex.id);
  let load; let note;
  if (!last || !last.sets.some((s) => s.w > 0)) {
    load = baselineLoad(ex, p, rMax);
    note = 'Charge de départ estimée : ajuste au ressenti.';
  } else {
    const ref = Math.max(...last.sets.map((s) => s.w || 0));
    const allTop = last.sets.every((s) => s.r >= rMax);
    const anyLow = last.sets.some((s) => s.r < rMin);
    if (allTop) { load = ref + increment(ex); note = `+${increment(ex)} kg : tu as atteint le haut de la fourchette la dernière fois.`; }
    else if (anyLow) { load = Math.max(step(ex), round(ref * 0.95, step(ex))); note = 'Légère baisse : reps manquées la dernière fois.'; }
    else { load = ref; note = 'Même charge : vise une rep de plus par série.'; }
  }
  if (phaseKey === 'deload' && load) { load = round(load * 0.85, step(ex)); note = 'Semaine de récupération : −15 %.'; }
  return { load, note };
}

// ---------- Génération d'une séance ----------
export function buildSession(p, week, dayIndex, history = [], ready = null) {
  const split = splitFor(p.days.length);
  const tpl = split.days[dayIndex];
  const phase = phaseOf(week);
  const pi = (week - 1) % 4;
  const block = blockOf(week);
  const goalSchemes = SCHEMES[p.goal];
  const lvl = LEVEL[p.level];
  const m = bodyMetrics(p);
  const used = new Set();
  const slots = tpl.slots.slice(0, maxSlots(p.duration));

  const exercises = slots.map(([pattern, role], si) => {
    const pool = eligible(pattern, p, role);
    const key = `${tpl.name}|${si}`;
    const seed = role === 'main' ? block + hash(key) : week + hash(key + dayIndex);
    let ex = pick(pool, seed, used);
    const swapKey = `${week}|${dayIndex}|${si}`;
    if (p.swaps && p.swaps[swapKey] && BY_ID[p.swaps[swapKey]]) ex = BY_ID[p.swaps[swapKey]];
    used.add(ex.id);
    const base = goalSchemes[role][pi];
    let sets = base[0];
    if (lvl === 1 && role !== 'main') sets = Math.max(2, sets - 1);
    if (lvl === 3 && role !== 'acc' && phase.key !== 'deload') sets += 1;
    const scheme = [sets, base[1], base[2], base[3], base[4]];
    const sug = suggestLoad(ex, p, history, scheme, phase.key);
    return {
      slot: si, role, pattern, id: ex.id, name: ex.name, cue: ex.cue, muscles: ex.muscles, unit: ex.unit, timed: !!ex.timed,
      sets, repsMin: ex.timed ? 30 : base[1], repsMax: ex.timed ? 45 : base[2], rir: base[3], rest: base[4],
      load: sug.load, loadNote: sug.note, poolSize: pool.length,
    };
  });

  // Technique d'intensité de la semaine (S2 et S3 seulement), tournante.
  let technique = null;
  if (phase.key === 'int' || (phase.key === 'prog' && lvl >= 2)) {
    technique = TECHNIQUES[(hash(`tech${week}`) + dayIndex) % TECHNIQUES.length];
  }

  // Cardio : systématique en sèche et forme, une séance sur deux sinon.
  let cardio = null;
  const wantsCardio = ['seche', 'forme'].includes(p.goal) || dayIndex % 2 === 1;
  if (wantsCardio && phase.key !== 'deload') {
    const pool = CARDIO.filter((c) => !(m.bmi >= 30 || p.level === 'debutant') || c.impact === 'low');
    cardio = pool[(week + dayIndex * 3) % pool.length];
  }

  // Ajustement selon la forme du jour (uniquement pour la séance du jour, données de la montre).
  let adjust = null;
  if (ready && ready.level === 'moyenne' && phase.key !== 'deload') {
    for (const e of exercises) if (e.role !== 'acc') e.rir += 1;
    adjust = { level: 'moyenne', text: `Forme moyenne (${ready.reasons.join(', ')}) : garde 1 répétition de plus en réserve sur les exercices principaux.` };
  } else if (ready && ready.level === 'basse') {
    for (const e of exercises) {
      e.sets = Math.max(2, e.sets - 1);
      e.rir += 1;
      if (e.load) { e.load = Math.max(step(BY_ID[e.id]), round(e.load * 0.9, step(BY_ID[e.id]))); e.loadNote = 'Charge allégée de 10 % : récupération insuffisante.'; }
    }
    technique = null;
    if (cardio) cardio = { name: 'Cardio très léger', detail: '15 min de marche ou de vélo facile, sans essoufflement.', impact: 'low' };
    adjust = { level: 'basse', text: `Récupération insuffisante (${ready.reasons.join(', ')}) : une série de moins partout, charges −10 %, pas de technique d’intensité.` };
  }

  const warmup = warmupFor(tpl, exercises[0]);
  const minutes = estimateMinutes(exercises, cardio);
  return { week, dayIndex, name: tpl.name, focus: tpl.focus, phase, technique, cardio, warmup, exercises, minutes, adjust };
}

function warmupFor(tpl, first) {
  const lower = /Bas|Jambes/.test(tpl.name);
  const upper = /Haut|Push|Pull/.test(tpl.name);
  const mob = lower ? 'Mobilité hanches et chevilles : 10 squats au poids du corps, 10 fentes, 10 ponts fessiers.'
    : upper ? 'Mobilité épaules : 15 rotations avec élastique, 10 pompes inclinées, 10 tirages élastique.'
      : 'Mobilité globale : 10 squats au poids du corps, 10 pompes, 10 rotations d’épaules.';
  return [
    '5 min de cardio léger (vélo ou rameur).',
    mob,
    `2 séries de montée en charge sur ${first.name} (50 % × 8, 75 % × 4).`,
  ];
}

function estimateMinutes(exs, cardio) {
  let s = 8 * 60; // échauffement
  for (const e of exs) s += e.sets * (40 + e.rest) + 60;
  if (cardio) s += 12 * 60;
  return Math.round(s / 60 / 5) * 5;
}

// ---------- Calendrier ----------
export function mondayOf(d) {
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  const day = (x.getDay() + 6) % 7; x.setDate(x.getDate() - day); return x;
}
export function currentWeek(p, date = new Date()) {
  const start = mondayOf(p.startDate);
  const diff = Math.floor((mondayOf(date) - start) / (7 * 864e5));
  return Math.max(1, diff + 1);
}
export function dateFor(p, week, dayIndex) {
  const d = mondayOf(p.startDate); d.setDate(d.getDate() + (week - 1) * 7 + p.days[dayIndex]); return d;
}
export function todayIndex(p, date = new Date()) {
  const wd = (date.getDay() + 6) % 7; return p.days.indexOf(wd);
}

// Volume hebdomadaire par muscle (séries directes), pour vérifier l'équilibre du programme.
export function weeklyVolume(p, week) {
  const vol = {};
  for (let d = 0; d < p.days.length; d++) {
    const s = buildSession(p, week, d, []);
    for (const e of s.exercises) {
      e.muscles.forEach((mu, i) => { vol[mu] = (vol[mu] || 0) + e.sets * (i === 0 ? 1 : 0.5); });
    }
  }
  return vol;
}

// 1RM estimé (Epley) pour les records.
export function e1rm(w, r) { return w * (1 + r / 30); }
