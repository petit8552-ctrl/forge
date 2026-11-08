// Muscu ciblée : une séance sur un seul muscle, découpée par zones (ex. haut / milieu / bas des pecs),
// adaptée au lieu et au matériel. Séries et reps à noter comme dans le programme ; les charges
// proposées viennent de l'historique (même moteur que le programme).
import { EXERCISES, BY_ID } from './exercises.js';
import { MEDIA } from './media.js';
import { suggestLoad, hash } from './engine.js';

// Exercices maison / plein air (pas de machine). unit 'pdc' = poids du corps ou élastique (pas de charge en kg).
// needs : matériel requis (tout doit être coché). photo : Free Exercise DB (domaine public).
export const HOME = [
  // Pecs
  { id: 'c-pompes-declinees', name: 'Pompes déclinées', unit: 'pdc', kind: 'compound', pattern: 'hpush', diff: 2, needs: ['banc'], photo: 'Decline_Push-Up', cue: 'Pieds sur un banc ou une marche, mains largeur d’épaules : le haut des pecs travaille.' },
  { id: 'c-pompes-larges', name: 'Pompes mains larges', unit: 'pdc', kind: 'compound', pattern: 'hpush', diff: 1, needs: [], photo: 'Push-Up_Wide', cue: 'Mains plus larges que les épaules, descends la poitrine entre les mains.' },
  { id: 'c-pompes', name: 'Pompes classiques', unit: 'pdc', kind: 'compound', pattern: 'hpush', diff: 1, needs: [], photo: 'Pushups', cue: 'Corps gainé, coudes à 45°, poitrine près du sol. Sur les genoux si besoin.' },
  { id: 'c-pompes-inclinees', name: 'Pompes inclinées', unit: 'pdc', kind: 'compound', pattern: 'hpush', diff: 1, needs: [], photo: 'Incline_Push-Up', cue: 'Mains sur un banc, un muret ou une table : le bas des pecs travaille.' },
  { id: 'c-floor-press', name: 'Développé haltères au sol', unit: 'halteres', kind: 'compound', pattern: 'hpush', diff: 1, coef: 0.25, needs: ['halteres'], photo: 'Dumbbell_Floor_Press', cue: 'Allongé au sol, coudes qui touchent le sol en bas, pousse vers le haut.' },
  { id: 'c-ecartes-sol', name: 'Écartés haltères', unit: 'halteres', kind: 'iso', pattern: 'chest', diff: 1, coef: 0.1, needs: ['halteres'], photo: 'Dumbbell_Flyes', cue: 'Bras légèrement fléchis, ouvre jusqu’à l’étirement, referme en serrant.' },
  // Dos
  { id: 'c-australien', name: 'Rowing australien', unit: 'pdc', kind: 'compound', pattern: 'hpull', diff: 1, needs: ['barre'], photo: 'Inverted_Row', cue: 'Sous une barre basse, corps droit, poitrine vers la barre.' },
  { id: 'c-rowing-2-halteres', name: 'Rowing deux haltères', unit: 'halteres', kind: 'compound', pattern: 'hpull', diff: 1, coef: 0.25, needs: ['halteres'], photo: 'Bent_Over_Two-Dumbbell_Row', cue: 'Buste penché, dos plat, coudes vers les hanches.' },
  { id: 'c-oiseau-elastique', name: 'Oiseau élastique', unit: 'pdc', kind: 'iso', pattern: 'rear', diff: 1, needs: ['elastique'], photo: 'Back_Flyes_-_With_Bands', cue: 'Bras tendus devant, ouvre en serrant les omoplates.' },
  { id: 'c-ecartes-elastique', name: 'Écartés élastique', unit: 'pdc', kind: 'iso', pattern: 'rear', diff: 1, needs: ['elastique'], photo: 'Band_Pull_Apart', cue: 'Élastique tendu devant, écarte jusqu’à la poitrine.' },
  { id: 'c-superman', name: 'Superman', unit: 'pdc', kind: 'iso', pattern: 'hinge', diff: 1, needs: [], photo: 'Superman', cue: 'À plat ventre, décolle bras et jambes, tiens 2 s.' },
  { id: 'c-hyper-sol', name: 'Extensions lombaires au sol', unit: 'pdc', kind: 'iso', pattern: 'hinge', diff: 1, needs: [], photo: 'Hyperextensions_With_No_Hyperextension_Bench', cue: 'À plat ventre, mains aux tempes, décolle le buste sans forcer.' },
  { id: 'c-good-morning-elastique', name: 'Good morning élastique', unit: 'pdc', kind: 'compound', pattern: 'hinge', diff: 1, needs: ['elastique'], photo: 'Band_Good_Morning', cue: 'Élastique sous les pieds et derrière la nuque, penche-toi dos plat.' },
  // Épaules
  { id: 'c-dev-elastique', name: 'Développé épaules élastique', unit: 'pdc', kind: 'compound', pattern: 'vpush', diff: 1, needs: ['elastique'], photo: 'Shoulder_Press_-_With_Bands', cue: 'Élastique sous les pieds, pousse au-dessus de la tête sans cambrer.' },
  { id: 'c-pompes-poirier', name: 'Pompes en poirier', unit: 'pdc', kind: 'compound', pattern: 'vpush', diff: 3, needs: [], photo: 'Handstand_Push-Ups', cue: 'Pieds contre un mur, descends la tête vers le sol. Réservé aux confirmés.' },
  { id: 'c-front-raise', name: 'Élévations frontales', unit: 'halteres', kind: 'iso', pattern: 'lateral', diff: 1, coef: 0.07, needs: ['halteres'], photo: 'Front_Dumbbell_Raise', cue: 'Bras presque tendus, monte devant toi jusqu’aux yeux.' },
  { id: 'c-lat-elastique', name: 'Élévations latérales élastique', unit: 'pdc', kind: 'iso', pattern: 'lateral', diff: 1, needs: ['elastique'], photo: 'Lateral_Raise_-_With_Bands', cue: 'Élastique sous les pieds, monte les bras sur le côté jusqu’aux épaules.' },
  { id: 'c-tirage-menton', name: 'Tirage menton élastique', unit: 'pdc', kind: 'iso', pattern: 'lateral', diff: 1, needs: ['elastique'], photo: 'Upright_Row_-_With_Bands', cue: 'Coudes qui montent plus haut que les mains, jusqu’à la poitrine.' },
  // Biceps
  { id: 'c-curl-halteres', name: 'Curl haltères alterné', unit: 'halteres', kind: 'iso', pattern: 'biceps', diff: 1, coef: 0.12, needs: ['halteres'], photo: 'Dumbbell_Alternate_Bicep_Curl', cue: 'Coudes collés au corps, tourne le poignet en montant.' },
  { id: 'c-curl-concentre', name: 'Curl concentré', unit: 'halteres', kind: 'iso', pattern: 'biceps', diff: 1, coef: 0.1, needs: ['halteres'], photo: 'Concentration_Curls', cue: 'Assis, coude contre l’intérieur de la cuisse, monte lentement.' },
  { id: 'c-curl-elastique', name: 'Curl élastique', unit: 'pdc', kind: 'iso', pattern: 'biceps', diff: 1, needs: ['elastique'], photo: null, anim: 'c-curl-elastique', cue: 'Élastique sous les pieds, coudes collés au corps, monte les mains aux épaules.' },
  { id: 'c-chinup', name: 'Tractions supination', unit: 'pdc', kind: 'compound', pattern: 'vpull', diff: 2, needs: ['barre'], photo: 'Chin-Up', cue: 'Paumes vers toi, menton au-dessus de la barre.' },
  // Triceps
  { id: 'c-pompes-diamant', name: 'Pompes serrées', unit: 'pdc', kind: 'compound', pattern: 'triceps', diff: 2, needs: [], photo: 'Push-Ups_-_Close_Triceps_Position', cue: 'Mains sous la poitrine, coudes le long du corps.' },
  { id: 'c-dips-banc', name: 'Dips sur banc', unit: 'pdc', kind: 'compound', pattern: 'triceps', diff: 1, needs: ['banc'], photo: 'Bench_Dips', cue: 'Mains au bord d’un banc ou d’une chaise, coudes vers l’arrière.' },
  { id: 'c-kickback', name: 'Kickback haltère', unit: 'halteres', kind: 'iso', pattern: 'triceps', diff: 1, coef: 0.06, needs: ['halteres'], photo: 'Tricep_Dumbbell_Kickback', cue: 'Buste penché, coude fixe et haut, tends le bras vers l’arrière.' },
  { id: 'c-ext-elastique', name: 'Extension élastique au-dessus de la tête', unit: 'pdc', kind: 'iso', pattern: 'triceps', diff: 1, needs: ['elastique'], photo: 'Speed_Band_Overhead_Triceps', cue: 'Élastique derrière le dos, tends les bras au-dessus de la tête.' },
  { id: 'c-skull-elastique', name: 'Barre au front élastique', unit: 'pdc', kind: 'iso', pattern: 'triceps', diff: 1, needs: ['elastique'], photo: 'Band_Skull_Crusher', cue: 'Allongé, coudes vers le plafond, tends les avant-bras.' },
  // Jambes
  { id: 'c-squat', name: 'Squat au poids du corps', unit: 'pdc', kind: 'compound', pattern: 'squat', diff: 1, needs: [], photo: 'Bodyweight_Squat', cue: 'Fesses en arrière, talons au sol, cuisses parallèles.' },
  { id: 'c-split-squat', name: 'Fente statique', unit: 'pdc', kind: 'compound', pattern: 'quad', diff: 1, needs: [], photo: 'Split_Squats', cue: 'Pieds décalés, descends à la verticale, genou arrière vers le sol.' },
  { id: 'c-squat-halteres', name: 'Squat haltères', unit: 'halteres', kind: 'compound', pattern: 'squat', diff: 1, coef: 0.3, needs: ['halteres'], photo: 'Dumbbell_Squat', cue: 'Haltères le long du corps, dos droit.' },
  { id: 'c-squat-elastique', name: 'Squat élastique', unit: 'pdc', kind: 'compound', pattern: 'squat', diff: 1, needs: ['elastique'], photo: 'Squats_-_With_Bands', cue: 'Élastique sous les pieds, mains aux épaules.' },
  { id: 'c-pont-1j', name: 'Pont fessier une jambe', unit: 'pdc', kind: 'iso', pattern: 'ham', diff: 1, needs: [], photo: 'Single_Leg_Glute_Bridge', cue: 'Talon d’appui loin des fesses pour sentir l’arrière de la cuisse.' },
  { id: 'c-curl-ischio-elastique', name: 'Leg curl élastique', unit: 'pdc', kind: 'iso', pattern: 'ham', diff: 1, needs: ['elastique'], photo: 'Seated_Band_Hamstring_Curl', cue: 'Élastique accroché devant, ramène le talon sous toi.' },
  { id: 'c-pont', name: 'Pont fessier', unit: 'pdc', kind: 'iso', pattern: 'glutes', diff: 1, needs: [], photo: 'Butt_Lift_Bridge', cue: 'Pousse dans les talons, serre les fessiers en haut.' },
  { id: 'c-kickback-sol', name: 'Kickback fessier', unit: 'pdc', kind: 'iso', pattern: 'glutes', diff: 1, needs: [], photo: 'Glute_Kickback', cue: 'À quatre pattes, pousse le talon vers le plafond.' },
  { id: 'c-fente-arriere', name: 'Fente arrière haltères', unit: 'halteres', kind: 'compound', pattern: 'quad', diff: 1, coef: 0.15, needs: ['halteres'], photo: 'Dumbbell_Rear_Lunge', cue: 'Grand pas en arrière, buste légèrement penché pour les fessiers.' },
  { id: 'c-mollets', name: 'Mollets debout', unit: 'pdc', kind: 'iso', pattern: 'calves', diff: 1, needs: [], photo: 'Rocking_Standing_Calf_Raise', cue: 'Sur une marche si possible, monte sur la pointe, descends talons bas.' },
  { id: 'c-mollets-halteres', name: 'Mollets haltères', unit: 'halteres', kind: 'iso', pattern: 'calves', diff: 1, coef: 0.3, needs: ['halteres'], photo: 'Standing_Dumbbell_Calf_Raise', cue: 'Haltères en main, monte sur la pointe, 1 s en haut.' },
];
// Les photos des exercices maison s'affichent comme celles du programme.
for (const e of HOME) if (e.photo && !MEDIA[e.id]) MEDIA[e.id] = { src: e.photo };
const HOME_BY_ID = Object.fromEntries(HOME.map((e) => [e.id, e]));
export const exById = (id) => HOME_BY_ID[id] || BY_ID[id];

// Matériel requis pour les exercices du programme hors salle (machines, poulies, barres : salle seulement).
const PROGRAM_NEEDS = {
  pullup: ['barre'], chinup: ['barre'], 'hanging-raise': ['barre'], pompes: [],
  'db-bench': ['halteres', 'banc'], 'incline-db': ['halteres', 'banc'], 'incline-fly': ['halteres', 'banc'],
  'incline-curl': ['halteres', 'banc'], bulgare: ['halteres', 'banc'], 'step-up': ['halteres', 'banc'],
};
function needsOf(e) {
  if (HOME_BY_ID[e.id]) return e.needs;
  if (PROGRAM_NEEDS[e.id]) return PROGRAM_NEEDS[e.id];
  if (e.unit === 'halteres') return ['halteres'];
  return null; // barre olympique, machine, poulie, barres parallèles… : salle uniquement
}
export function available(e, place, equip) {
  if (place === 'salle') return true;
  const n = needsOf(e);
  return n !== null && n.every((x) => equip.includes(x));
}

export const CIBLE_EQUIP = { halteres: 'Haltères', elastique: 'Élastique', barre: 'Barre de traction', banc: 'Banc ou marche' };
export const CIBLE_DURATIONS = [30, 45, 60, 75, 90];
// Matériel coché par défaut : à la maison, une chaise ou une marche fait office de banc.
export const CIBLE_DEFAULT_EQUIP = { salle: [], maison: ['banc'], dehors: ['barre', 'banc'], plage: [] };

// Muscles et zones. Chaque zone liste ses exercices par ordre de préférence (salle d'abord, maison ensuite).
// cap : nombre de séries au-delà duquel une séance sur ce muscle n'apporte plus grand-chose.
export const MUSCLES = {
  pecs: { name: 'Pectoraux', the: 'les pecs', icon: '🫁', cap: 18, zones: [
    { id: 'haut', name: 'Haut des pecs', desc: 'Partie sous la clavicule : banc incliné ou pieds surélevés. C’est souvent la zone en retard.', ex: ['incline-bench', 'incline-db', 'c-pompes-declinees'] },
    { id: 'milieu', name: 'Milieu des pecs', desc: 'Le gros de la masse : développés et pompes à plat.', ex: ['bench', 'db-bench', 'chest-press', 'c-floor-press', 'c-pompes-larges', 'c-pompes'] },
    { id: 'bas', name: 'Bas des pecs', desc: 'Le bas et le contour : dips, pompes mains surélevées, poulie de haut en bas.', ex: ['dips', 'cable-fly', 'c-pompes-inclinees'] },
    { id: 'iso', name: 'Étirement et contraction', desc: 'Exercices d’isolation pour finir : grande amplitude, contraction serrée.', ex: ['pec-deck', 'incline-fly', 'c-ecartes-sol'] },
  ] },
  dos: { name: 'Dos', the: 'le dos', icon: '🪽', cap: 20, zones: [
    { id: 'largeur', name: 'Largeur (grand dorsal)', desc: 'Tirages verticaux : ce qui donne la forme en V.', ex: ['pullup', 'lat-pulldown', 'assisted-pullup', 'chinup', 'close-pulldown'] },
    { id: 'epaisseur', name: 'Épaisseur (milieu du dos)', desc: 'Rowings : la densité entre les omoplates.', ex: ['row', 'tbar', 'cable-row', 'machine-row', 'db-row', 'c-rowing-2-halteres', 'c-australien'] },
    { id: 'haut', name: 'Haut du dos', desc: 'Trapèzes et arrière des épaules : posture et épaisseur du haut.', ex: ['face-pull', 'reverse-pec', 'rear-fly', 'c-oiseau-elastique', 'c-ecartes-elastique'] },
    { id: 'bas', name: 'Bas du dos (lombaires)', desc: 'Les muscles qui tiennent la colonne : charges modérées, mouvement contrôlé.', ex: ['rdl', 'good-morning', 'c-good-morning-elastique', 'c-hyper-sol', 'c-superman'] },
  ] },
  epaules: { name: 'Épaules', the: 'les épaules', icon: '🎯', cap: 16, zones: [
    { id: 'avant', name: 'Avant (développés)', desc: 'Faisceau avant : déjà sollicité par les pecs, un ou deux exercices suffisent.', ex: ['ohp', 'db-press', 'arnold', 'shoulder-machine', 'c-dev-elastique', 'c-pompes-poirier', 'c-front-raise'] },
    { id: 'cote', name: 'Côté (largeur)', desc: 'Faisceau moyen : ce qui élargit la carrure. Charges légères, beaucoup de reps.', ex: ['lat-raise', 'cable-lat', 'machine-lat', 'c-lat-elastique', 'c-tirage-menton'] },
    { id: 'arriere', name: 'Arrière', desc: 'Faisceau arrière : souvent oublié, important pour l’équilibre de l’épaule.', ex: ['rear-fly', 'face-pull', 'reverse-pec', 'c-oiseau-elastique', 'c-ecartes-elastique'] },
  ] },
  biceps: { name: 'Biceps', the: 'les biceps', icon: '💪', cap: 12, zones: [
    { id: 'long', name: 'Chef long (étirement)', desc: 'Bras derrière le corps (banc incliné) ou le long du corps : la « boule » du biceps.', ex: ['incline-curl', 'ez-curl', 'cable-curl', 'c-curl-halteres', 'c-chinup', 'c-curl-elastique'] },
    { id: 'court', name: 'Chef court (contraction)', desc: 'Coudes devant le corps : pupitre, curl concentré. L’épaisseur intérieure.', ex: ['preacher', 'c-curl-concentre', 'cable-curl', 'c-curl-elastique'] },
    { id: 'brachial', name: 'Brachial et avant-bras', desc: 'Prise marteau : le muscle sous le biceps qui pousse le bras vers l’extérieur.', ex: ['hammer'] },
  ] },
  triceps: { name: 'Triceps', the: 'les triceps', icon: '🔱', cap: 12, zones: [
    { id: 'long', name: 'Longue portion (au-dessus de la tête)', desc: 'Bras levés : la portion la plus volumineuse, travaillée en étirement.', ex: ['overhead-ext', 'overhead-cable', 'skull', 'c-ext-elastique', 'c-skull-elastique'] },
    { id: 'lateral', name: 'Portion latérale (bras le long du corps)', desc: 'Le « fer à cheval » visible de côté : poulie, kickback.', ex: ['pushdown', 'c-kickback'] },
    { id: 'poly', name: 'Polyarticulaires', desc: 'Exercices lourds qui chargent tout le triceps.', ex: ['close-bench', 'dips', 'c-pompes-diamant', 'c-dips-banc'] },
  ] },
  jambes: { name: 'Jambes', the: 'les jambes', icon: '🦵', cap: 22, zones: [
    { id: 'quad', name: 'Quadriceps (avant des cuisses)', desc: 'Squats, presse, fentes : genoux qui avancent.', ex: ['squat', 'hack-squat', 'presse', 'front-squat', 'goblet', 'bulgare', 'leg-ext', 'c-squat-halteres', 'c-split-squat', 'c-squat-elastique', 'c-squat'] },
    { id: 'ischios', name: 'Ischios (arrière des cuisses)', desc: 'Charnière de hanche et flexion du genou.', ex: ['rdl', 'lying-curl', 'seated-curl', 'rdl-halteres', 'c-curl-ischio-elastique', 'c-pont-1j'] },
    { id: 'fessiers', name: 'Fessiers', desc: 'Extension de hanche : hip thrust, ponts, fentes arrière.', ex: ['hip-thrust', 'glute-bridge', 'c-fente-arriere', 'kickback-cable', 'c-pont', 'c-kickback-sol'] },
    { id: 'mollets', name: 'Mollets', desc: 'Amplitude complète : talons bas, pointe haute.', ex: ['calf-standing', 'calf-seated', 'calf-press', 'c-mollets-halteres', 'c-mollets'] },
  ] },
};

const LEVEL = { debutant: 1, intermediaire: 2, avance: 3 };

// Séries / reps / RIR / repos selon le type d'exercice et le niveau.
function schemeFor(e, isFirst, level) {
  const deb = level === 'debutant';
  if (e.unit === 'pdc' && !e.coef) {
    // Poids du corps ou élastique : on vise des séries longues, proches de l'échec.
    return [3, 10, 20, deb ? 3 : 2, e.kind === 'iso' ? 60 : 90];
  }
  if (isFirst && e.kind === 'compound') return [deb ? 3 : 4, 6, 10, deb ? 3 : 2, 150];
  if (e.kind === 'compound') return [3, 8, 12, deb ? 3 : 2, 120];
  return [3, 10, 15, deb ? 2 : 1, 75];
}
const setSeconds = (rest) => 45 + rest;

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s ^ (s >>> 15), 2246822507) + 0x9e3779b9) >>> 0; return s / 4294967296; };
}

// Candidats d'une zone selon lieu, matériel et niveau (dans l'ordre de préférence).
export function zoneCandidates(zone, opts) {
  const lvl = LEVEL[opts.level] || 1;
  return zone.ex.map(exById).filter((e) => e && available(e, opts.place, opts.equip || []) && (e.diff || 1) <= lvl + 1);
}

// Matériel qui débloquerait une zone vide (pour le dire à l'utilisateur).
export function missingFor(zone, equip = []) {
  const opts = new Set();
  for (const id of zone.ex) { const e = exById(id); const n = e && needsOf(e); if (n) n.filter((x) => !equip.includes(x)).forEach((x) => opts.add(x)); }
  return [...opts].map((k) => CIBLE_EQUIP[k]).filter(Boolean);
}

// Construit la séance : { title, muscle, zones: [{ zone, exercises }], exercises, minutes, capped }.
export function buildTargeted(p, opts, history = [], seed = 0) {
  const m = MUSCLES[opts.muscle];
  const rand = rng(hash(JSON.stringify([opts.muscle, opts.place, [...(opts.equip || [])].sort(), p.level, seed])));
  const budget = (opts.minutes - 5) * 60; // 5 min d'échauffement général
  const zones = m.zones.map((z) => {
    const cands = zoneCandidates(z, { ...opts, level: p.level });
    // Un peu de variété avec « Autre séance » : on tire parmi les 3 premiers candidats.
    const top = cands.slice(0, 3); const rest = cands.slice(3);
    for (let i = top.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [top[i], top[j]] = [top[j], top[i]]; }
    return { zone: z, cands: seed ? [...top, ...rest] : cands, picked: [] };
  });
  let used = 180; // séries d'échauffement sur le premier exercice
  let sets = 0;
  const taken = new Set();
  // Tour à tour sur les zones : une zone reçoit un 2e exercice seulement si toutes en ont un.
  for (let pass = 0; pass < 4; pass++) {
    let added = false;
    for (const z of zones) {
      const e = z.cands.find((c) => !taken.has(c.id));
      if (!e) continue;
      const isFirst = taken.size === 0;
      const sc = schemeFor(e, isFirst, p.level);
      const cost = sc[0] * setSeconds(sc[4]) + 60;
      if (used + cost > budget || sets + sc[0] > m.cap) continue;
      taken.add(e.id); z.picked.push({ e, sc }); used += cost; sets += sc[0]; added = true;
    }
    if (!added) break;
  }
  // Composés avant isolation à l'intérieur de la séance : on garde l'ordre des zones, qui va déjà du lourd au léger.
  let slot = 0;
  const outZones = zones.map((z) => ({
    zone: z.zone,
    missing: z.cands.length ? null : missingFor(z.zone, opts.equip || []),
    exercises: z.picked.map(({ e, sc }) => {
      const sug = suggestLoad(e, p, history, sc, 'acc');
      const pool = z.cands.length;
      return {
        slot: slot++, role: slot === 1 ? 'main' : e.kind === 'compound' ? 'sec' : 'acc', pattern: e.pattern,
        id: e.id, name: e.name, cue: e.cue, unit: e.unit, timed: !!e.timed, zone: z.zone.id, anim: e.anim,
        subtitle: z.zone.name, sets: sc[0], repsMin: sc[1], repsMax: sc[2], rir: sc[3], rest: sc[4],
        load: sug.load, loadNote: e.unit === 'pdc' && !e.coef
          ? (e.needs?.includes('elastique') ? 'Élastique : choisis une tension qui t’amène près de l’échec dans la fourchette.' : 'Au-delà de 20 reps faciles, passe à la variante plus dure (⇄).')
          : sug.note,
        assisted: !!sug.assisted, poolSize: pool,
      };
    }),
  }));
  const exercises = outZones.flatMap((z) => z.exercises);
  const minutes = Math.round((used + 300) / 60);
  return {
    title: `${m.name} · ${opts.minutes} min`, muscle: opts.muscle, place: opts.place, requested: opts.minutes,
    zones: outZones, exercises, minutes, sets,
    capped: sets >= m.cap - 2 && minutes < opts.minutes - 5,
  };
}

// Variante : exercice suivant de la même zone, pas déjà dans la séance.
export function nextInZone(session, slot, opts, p) {
  const ex = session.exercises.find((x) => x.slot === slot);
  const zone = MUSCLES[session.muscle].zones.find((z) => z.id === ex.zone);
  const cands = zoneCandidates(zone, { ...opts, level: p.level });
  const used = new Set(session.exercises.map((x) => x.id));
  const start = cands.findIndex((c) => c.id === ex.id);
  for (let k = 1; k <= cands.length; k++) {
    const c = cands[(start + k) % cands.length];
    if (!used.has(c.id)) return c;
  }
  return null;
}

// Remplace l'exercice d'un emplacement en recalculant séries et charge.
export function swapExercise(session, slot, next, p, history) {
  const ex = session.exercises.find((x) => x.slot === slot);
  const sc = schemeFor(next, ex.role === 'main', p.level);
  const sug = suggestLoad(next, p, history, sc, 'acc');
  Object.assign(ex, {
    id: next.id, name: next.name, cue: next.cue, unit: next.unit, pattern: next.pattern, anim: next.anim,
    sets: sc[0], repsMin: sc[1], repsMax: sc[2], rir: sc[3], rest: sc[4], load: sug.load,
    loadNote: next.unit === 'pdc' && !next.coef ? 'Poids du corps ou élastique : vise la fourchette, proche de l’échec.' : sug.note,
  });
  return session;
}

export const ALL_TARGET_EXERCISES = () => [...new Set(Object.values(MUSCLES).flatMap((m) => m.zones.flatMap((z) => z.ex)))].map(exById);
export { EXERCISES };
