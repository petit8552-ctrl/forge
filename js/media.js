// Photos du mouvement (départ et arrivée) issues de Free Exercise DB (domaine public, Unlicense).
// https://github.com/yuhonas/free-exercise-db
export const MEDIA = {
  'squat': { src: 'Barbell_Full_Squat' },
  'front-squat': { src: 'Front_Barbell_Squat' },
  'hack-squat': { src: 'Hack_Squat' },
  'presse': { src: 'Leg_Press' },
  'goblet': { src: 'Goblet_Squat' },
  'bulgare': { src: 'Split_Squat_with_Dumbbells' },
  'rdl': { src: 'Romanian_Deadlift' },
  'deadlift': { src: 'Barbell_Deadlift' },
  'hip-thrust': { src: 'Barbell_Hip_Thrust' },
  'rdl-halteres': { src: 'Stiff-Legged_Dumbbell_Deadlift' },
  'good-morning': { src: 'Good_Morning' },
  'bench': { src: 'Barbell_Bench_Press_-_Medium_Grip' },
  'db-bench': { src: 'Dumbbell_Bench_Press' },
  'incline-db': { src: 'Incline_Dumbbell_Press' },
  'incline-bench': { src: 'Barbell_Incline_Bench_Press_-_Medium_Grip' },
  'chest-press': { src: 'Leverage_Chest_Press' },
  'dips': { src: 'Dips_-_Chest_Version' },
  'pompes': { src: 'Pushups' },
  'ohp': { src: 'Standing_Military_Press' },
  'db-press': { src: 'Dumbbell_Shoulder_Press' },
  'arnold': { src: 'Arnold_Dumbbell_Press' },
  'shoulder-machine': { src: 'Machine_Shoulder_Military_Press' },
  'row': { src: 'Bent_Over_Barbell_Row' },
  'db-row': { src: 'One-Arm_Dumbbell_Row' },
  'cable-row': { src: 'Seated_Cable_Rows' },
  'tbar': { src: 'T-Bar_Row_with_Handle' },
  'machine-row': { src: 'Leverage_Iso_Row' },
  'pullup': { src: 'Pullups' },
  'assisted-pullup': { src: 'Band_Assisted_Pull-Up', note: 'Photo : version assistée par élastique, même mouvement qu’à la machine.' },
  'lat-pulldown': { src: 'Wide-Grip_Lat_Pulldown' },
  'close-pulldown': { src: 'V-Bar_Pulldown' },
  'chinup': { src: 'Chin-Up' },
  'leg-ext': { src: 'Leg_Extensions' },
  'lunges': { src: 'Dumbbell_Lunges' },
  'step-up': { src: 'Dumbbell_Step_Ups' },
  'sissy-presse': { src: 'Leg_Press', note: 'Photo : presse à deux jambes, fais-la une jambe à la fois.' },
  'lying-curl': { src: 'Lying_Leg_Curls' },
  'seated-curl': { src: 'Seated_Leg_Curl' },
  'nordic': { src: 'Natural_Glute_Ham_Raise' },
  'kickback-cable': { src: 'One-Legged_Cable_Kickback' },
  'abduction': { src: 'Thigh_Abductor' },
  'glute-bridge': { src: 'Barbell_Glute_Bridge', note: 'Photo : version barre, même mouvement avec l’haltère.' },
  'calf-standing': { src: 'Standing_Calf_Raises' },
  'calf-seated': { src: 'Seated_Calf_Raise' },
  'calf-press': { src: 'Calf_Press_On_The_Leg_Press_Machine' },
  'cable-fly': { src: 'Cable_Crossover' },
  'pec-deck': { src: 'Butterfly' },
  'incline-fly': { src: 'Incline_Dumbbell_Flyes' },
  'lat-raise': { src: 'Side_Lateral_Raise' },
  'cable-lat': { src: 'Cable_Seated_Lateral_Raise' },
  'machine-lat': { src: 'Side_Lateral_Raise', note: 'Photo : version haltères, même trajectoire qu’à la machine.' },
  'face-pull': { src: 'Face_Pull' },
  'rear-fly': { src: 'Reverse_Flyes' },
  'reverse-pec': { src: 'Reverse_Machine_Flyes' },
  'ez-curl': { src: 'EZ-Bar_Curl' },
  'incline-curl': { src: 'Incline_Dumbbell_Curl' },
  'hammer': { src: 'Hammer_Curls' },
  'preacher': { src: 'Machine_Preacher_Curls' },
  'cable-curl': { src: 'Standing_Biceps_Cable_Curl' },
  'pushdown': { src: 'Triceps_Pushdown_-_Rope_Attachment' },
  'skull': { src: 'EZ-Bar_Skullcrusher' },
  'overhead-ext': { src: 'Standing_Dumbbell_Triceps_Extension' },
  'overhead-cable': { src: 'Cable_Rope_Overhead_Triceps_Extension' },
  'close-bench': { src: 'Close-Grip_Barbell_Bench_Press' },
  'plank': { src: 'Plank' },
  'hanging-raise': { src: 'Hanging_Leg_Raise' },
  'cable-crunch': { src: 'Cable_Crunch' },
  'ab-wheel': { src: 'Ab_Roller' },
  'pallof': { src: 'Pallof_Press' },
  'side-plank': { src: 'Side_Bridge' },
  'dead-bug': { src: 'Dead_Bug' },
};

export function photos(id) {
  const m = MEDIA[id];
  return m ? { start: `media/${m.src}_0.jpg`, end: `media/${m.src}_1.jpg`, note: m.note } : null;
}

// Recherche vidéo YouTube de l’exécution (ouvre l’appli YouTube sur le téléphone).
// Recherche YouTube (pas de vidéo hébergée : toujours à jour, rien à stocker).
// Les mots ajoutés orientent vers des tutoriels plutôt que vers des compilations.
const VIDEO_HINT = {
  muscu: 'exécution technique musculation',
  libre: 'exercice comment bien faire',
  machine: 'fractionné entraînement',
};
export function videoUrl(name, kind = 'muscu') {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${name} ${VIDEO_HINT[kind] || VIDEO_HINT.muscu}`)}`;
}
