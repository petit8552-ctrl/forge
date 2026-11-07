// Base d'exercices.
// pattern : schéma moteur (sert à construire les séances et à proposer des variantes équivalentes)
// kind    : 'compound' (polyarticulaire) ou 'iso' (isolation)
// diff    : 1 facile à apprendre, 3 technique
// bw      : exercice au poids du corps exigeant un bon rapport force / poids (tractions, dips…)
// coef    : charge ≈ 10RM d'un pratiquant intermédiaire, en fraction du poids de corps (par haltère si unit = 'halteres')
// unit    : 'barre' | 'halteres' | 'machine' | 'poulie' | 'pdc'
// assisted: la charge notée est une assistance (contrepoids) : la réduire rend l'exercice plus dur

export const EXERCISES = [
  // Squat / dominante quadriceps
  { id: 'squat', name: 'Squat barre', pattern: 'squat', kind: 'compound', diff: 3, coef: 0.8, unit: 'barre', muscles: ['quadriceps', 'fessiers'], cue: 'Pieds largeur d’épaules, genoux dans l’axe des pieds, descends au moins à la parallèle, dos gainé.' },
  { id: 'front-squat', name: 'Front squat', pattern: 'squat', kind: 'compound', diff: 3, coef: 0.6, unit: 'barre', muscles: ['quadriceps', 'fessiers'], cue: 'Coudes hauts, buste droit, la barre repose sur les deltoïdes.' },
  { id: 'hack-squat', name: 'Hack squat machine', pattern: 'squat', kind: 'compound', diff: 1, coef: 1.0, unit: 'machine', muscles: ['quadriceps', 'fessiers'], cue: 'Dos plaqué, descente contrôlée en 2 s, ne verrouille pas les genoux en haut.' },
  { id: 'presse', name: 'Presse à cuisses', pattern: 'squat', kind: 'compound', diff: 1, coef: 1.6, unit: 'machine', muscles: ['quadriceps', 'fessiers'], cue: 'Bas du dos collé au dossier, amplitude maximale sans décoller le bassin.' },
  { id: 'goblet', name: 'Goblet squat', pattern: 'squat', kind: 'compound', diff: 1, coef: 0.3, unit: 'halteres', muscles: ['quadriceps', 'fessiers'], cue: 'Haltère contre la poitrine, coudes entre les genoux en bas.' },
  { id: 'bulgare', name: 'Squat bulgare', pattern: 'squat', kind: 'compound', diff: 2, coef: 0.2, unit: 'halteres', muscles: ['quadriceps', 'fessiers'], cue: 'Pied arrière sur le banc, buste légèrement penché, genou avant stable.' },

  // Charnière de hanche
  { id: 'rdl', name: 'Soulevé de terre roumain', pattern: 'hinge', kind: 'compound', diff: 2, coef: 0.8, unit: 'barre', muscles: ['ischios', 'fessiers', 'lombaires'], cue: 'Genoux légèrement fléchis, pousse les fesses en arrière, barre collée aux jambes.' },
  { id: 'deadlift', name: 'Soulevé de terre', pattern: 'hinge', kind: 'compound', diff: 3, coef: 1.0, unit: 'barre', muscles: ['ischios', 'fessiers', 'lombaires', 'dos'], cue: 'Barre au-dessus du milieu du pied, dos neutre, pousse le sol avec les jambes.' },
  { id: 'hip-thrust', name: 'Hip thrust', pattern: 'hinge', kind: 'compound', diff: 1, coef: 1.0, unit: 'barre', muscles: ['fessiers', 'ischios'], cue: 'Haut du dos sur le banc, menton rentré, serre les fessiers 1 s en haut.' },
  { id: 'rdl-halteres', name: 'Soulevé roumain haltères', pattern: 'hinge', kind: 'compound', diff: 1, coef: 0.35, unit: 'halteres', muscles: ['ischios', 'fessiers'], cue: 'Haltères le long des cuisses, descends jusqu’à sentir l’étirement des ischios.' },
  { id: 'good-morning', name: 'Good morning', pattern: 'hinge', kind: 'compound', diff: 3, coef: 0.4, unit: 'barre', muscles: ['ischios', 'lombaires'], cue: 'Charge légère, dos parfaitement neutre, mouvement lent.' },

  // Poussée horizontale
  { id: 'bench', name: 'Développé couché barre', pattern: 'hpush', kind: 'compound', diff: 2, coef: 0.7, unit: 'barre', muscles: ['pectoraux', 'triceps', 'épaules'], cue: 'Omoplates serrées, pieds ancrés, barre au bas des pectoraux.' },
  { id: 'db-bench', name: 'Développé couché haltères', pattern: 'hpush', kind: 'compound', diff: 1, coef: 0.25, unit: 'halteres', muscles: ['pectoraux', 'triceps', 'épaules'], cue: 'Descends les haltères au niveau de la poitrine, coudes à 45°.' },
  { id: 'incline-db', name: 'Développé incliné haltères', pattern: 'hpush', kind: 'compound', diff: 1, coef: 0.22, unit: 'halteres', muscles: ['pectoraux', 'épaules', 'triceps'], cue: 'Banc à 30°, contrôle la descente, ne choque pas les haltères en haut.' },
  { id: 'incline-bench', name: 'Développé incliné barre', pattern: 'hpush', kind: 'compound', diff: 2, coef: 0.6, unit: 'barre', muscles: ['pectoraux', 'épaules', 'triceps'], cue: 'Banc à 30°, barre au haut des pectoraux.' },
  { id: 'chest-press', name: 'Développé machine', pattern: 'hpush', kind: 'compound', diff: 1, coef: 0.6, unit: 'machine', muscles: ['pectoraux', 'triceps'], cue: 'Poignées à hauteur de poitrine, garde les omoplates contre le dossier.' },
  { id: 'dips', name: 'Dips', pattern: 'hpush', kind: 'compound', diff: 2, bw: true, coef: 0, unit: 'pdc', muscles: ['pectoraux', 'triceps'], cue: 'Buste légèrement penché, descends jusqu’à ce que l’épaule passe sous le coude.' },
  { id: 'pompes', name: 'Pompes', pattern: 'hpush', kind: 'compound', diff: 1, coef: 0, unit: 'pdc', muscles: ['pectoraux', 'triceps'], cue: 'Corps gainé en planche, poitrine au ras du sol.' },

  // Poussée verticale
  { id: 'ohp', name: 'Développé militaire barre', pattern: 'vpush', kind: 'compound', diff: 2, coef: 0.45, unit: 'barre', muscles: ['épaules', 'triceps'], cue: 'Debout, fessiers serrés, la tête passe sous la barre en fin de poussée.' },
  { id: 'db-press', name: 'Développé épaules haltères assis', pattern: 'vpush', kind: 'compound', diff: 1, coef: 0.18, unit: 'halteres', muscles: ['épaules', 'triceps'], cue: 'Dossier presque vertical, coudes légèrement devant le corps.' },
  { id: 'arnold', name: 'Arnold press', pattern: 'vpush', kind: 'compound', diff: 2, coef: 0.15, unit: 'halteres', muscles: ['épaules', 'triceps'], cue: 'Rotation des poignets pendant la montée, mouvement fluide.' },
  { id: 'shoulder-machine', name: 'Développé épaules machine', pattern: 'vpush', kind: 'compound', diff: 1, coef: 0.4, unit: 'machine', muscles: ['épaules', 'triceps'], cue: 'Poignées à hauteur d’oreilles au départ.' },

  // Tirage horizontal
  { id: 'row', name: 'Rowing barre', pattern: 'hpull', kind: 'compound', diff: 2, coef: 0.6, unit: 'barre', muscles: ['dos', 'biceps'], cue: 'Buste à 45°, tire la barre vers le nombril, omoplates serrées.' },
  { id: 'db-row', name: 'Rowing haltère un bras', pattern: 'hpull', kind: 'compound', diff: 1, coef: 0.3, unit: 'halteres', muscles: ['dos', 'biceps'], cue: 'Main et genou sur le banc, tire le coude vers la hanche.' },
  { id: 'cable-row', name: 'Tirage horizontal poulie', pattern: 'hpull', kind: 'compound', diff: 1, coef: 0.6, unit: 'poulie', muscles: ['dos', 'biceps'], cue: 'Buste fixe, poitrine sortie, ramène les poignées au ventre.' },
  { id: 'tbar', name: 'Rowing T-bar', pattern: 'hpull', kind: 'compound', diff: 2, coef: 0.5, unit: 'barre', muscles: ['dos', 'biceps'], cue: 'Dos neutre, tire vers le bas des pectoraux.' },
  { id: 'machine-row', name: 'Rowing machine appui poitrine', pattern: 'hpull', kind: 'compound', diff: 1, coef: 0.6, unit: 'machine', muscles: ['dos', 'biceps'], cue: 'Poitrine contre l’appui, marque 1 s de contraction.' },

  // Tirage vertical
  { id: 'pullup', name: 'Tractions', pattern: 'vpull', kind: 'compound', diff: 2, bw: true, coef: 0, unit: 'pdc', muscles: ['dos', 'biceps'], cue: 'Départ bras tendus, menton au-dessus de la barre, sans balancer.' },
  { id: 'assisted-pullup', name: 'Tractions assistées', pattern: 'vpull', kind: 'compound', diff: 1, coef: 0, assisted: true, unit: 'machine', muscles: ['dos', 'biceps'], cue: 'Choisis l’assistance qui permet les répétitions visées. Réduis-la au fil des semaines.' },
  { id: 'lat-pulldown', name: 'Tirage vertical prise large', pattern: 'vpull', kind: 'compound', diff: 1, coef: 0.6, unit: 'poulie', muscles: ['dos', 'biceps'], cue: 'Tire la barre vers le haut de la poitrine, coudes vers le bas.' },
  { id: 'close-pulldown', name: 'Tirage vertical prise serrée', pattern: 'vpull', kind: 'compound', diff: 1, coef: 0.6, unit: 'poulie', muscles: ['dos', 'biceps'], cue: 'Prise neutre, buste légèrement incliné en arrière.' },
  { id: 'chinup', name: 'Tractions supination', pattern: 'vpull', kind: 'compound', diff: 2, bw: true, coef: 0, unit: 'pdc', muscles: ['dos', 'biceps'], cue: 'Paumes vers toi, poitrine vers la barre.' },

  // Quadriceps isolation / unilatéral
  { id: 'leg-ext', name: 'Leg extension', pattern: 'quad', kind: 'iso', diff: 1, coef: 0.5, unit: 'machine', muscles: ['quadriceps'], cue: 'Contraction 1 s en haut, descente lente.' },
  { id: 'lunges', name: 'Fentes marchées haltères', pattern: 'quad', kind: 'compound', diff: 2, coef: 0.15, unit: 'halteres', muscles: ['quadriceps', 'fessiers'], cue: 'Grand pas, genou arrière frôle le sol.' },
  { id: 'step-up', name: 'Step-up sur banc', pattern: 'quad', kind: 'compound', diff: 1, coef: 0.15, unit: 'halteres', muscles: ['quadriceps', 'fessiers'], cue: 'Pousse uniquement avec la jambe sur le banc.' },
  { id: 'sissy-presse', name: 'Presse unilatérale', pattern: 'quad', kind: 'compound', diff: 1, coef: 0.7, unit: 'machine', muscles: ['quadriceps', 'fessiers'], cue: 'Une jambe à la fois, pied au centre de la plateforme.' },

  // Ischios
  { id: 'lying-curl', name: 'Leg curl allongé', pattern: 'ham', kind: 'iso', diff: 1, coef: 0.35, unit: 'machine', muscles: ['ischios'], cue: 'Bassin collé au banc, descente en 3 s.' },
  { id: 'seated-curl', name: 'Leg curl assis', pattern: 'ham', kind: 'iso', diff: 1, coef: 0.4, unit: 'machine', muscles: ['ischios'], cue: 'Buste légèrement penché en avant pour plus d’étirement.' },
  { id: 'nordic', name: 'Nordic curl', pattern: 'ham', kind: 'iso', diff: 3, bw: true, coef: 0, unit: 'pdc', muscles: ['ischios'], cue: 'Descends le plus lentement possible, aide-toi des mains pour remonter.' },

  // Fessiers
  { id: 'kickback-cable', name: 'Kickback poulie', pattern: 'glutes', kind: 'iso', diff: 1, coef: 0.1, unit: 'poulie', muscles: ['fessiers'], cue: 'Bassin fixe, pousse le talon vers l’arrière.' },
  { id: 'abduction', name: 'Abduction machine', pattern: 'glutes', kind: 'iso', diff: 1, coef: 0.5, unit: 'machine', muscles: ['fessiers'], cue: 'Buste penché en avant, ouverture contrôlée.' },
  { id: 'glute-bridge', name: 'Pont fessier haltère', pattern: 'glutes', kind: 'iso', diff: 1, coef: 0.4, unit: 'halteres', muscles: ['fessiers'], cue: 'Pieds proches des fesses, contraction 2 s en haut.' },

  // Mollets
  { id: 'calf-standing', name: 'Mollets debout machine', pattern: 'calves', kind: 'iso', diff: 1, coef: 0.8, unit: 'machine', muscles: ['mollets'], cue: 'Pause 1 s en bas en étirement, monte sur la pointe.' },
  { id: 'calf-seated', name: 'Mollets assis', pattern: 'calves', kind: 'iso', diff: 1, coef: 0.5, unit: 'machine', muscles: ['mollets'], cue: 'Amplitude complète, rythme lent.' },
  { id: 'calf-press', name: 'Mollets à la presse', pattern: 'calves', kind: 'iso', diff: 1, coef: 1.2, unit: 'machine', muscles: ['mollets'], cue: 'Seulement l’avant du pied sur la plateforme.' },

  // Pectoraux isolation
  { id: 'cable-fly', name: 'Écarté poulie vis-à-vis', pattern: 'chest', kind: 'iso', diff: 1, coef: 0.15, unit: 'poulie', muscles: ['pectoraux'], cue: 'Coudes légèrement fléchis, croise les mains devant la poitrine.' },
  { id: 'pec-deck', name: 'Pec deck', pattern: 'chest', kind: 'iso', diff: 1, coef: 0.4, unit: 'machine', muscles: ['pectoraux'], cue: 'Poignées à hauteur de poitrine, contraction 1 s.' },
  { id: 'incline-fly', name: 'Écarté incliné haltères', pattern: 'chest', kind: 'iso', diff: 1, coef: 0.1, unit: 'halteres', muscles: ['pectoraux'], cue: 'Grande amplitude, étirement contrôlé.' },

  // Deltoïdes latéraux
  { id: 'lat-raise', name: 'Élévations latérales haltères', pattern: 'lateral', kind: 'iso', diff: 1, coef: 0.07, unit: 'halteres', muscles: ['épaules'], cue: 'Monte jusqu’à l’horizontale, coudes légèrement fléchis, sans élan.' },
  { id: 'cable-lat', name: 'Élévation latérale poulie', pattern: 'lateral', kind: 'iso', diff: 1, coef: 0.05, unit: 'poulie', muscles: ['épaules'], cue: 'Un bras à la fois, câble derrière le corps.' },
  { id: 'machine-lat', name: 'Élévations latérales machine', pattern: 'lateral', kind: 'iso', diff: 1, coef: 0.25, unit: 'machine', muscles: ['épaules'], cue: 'Coudes contre les appuis, montée lente.' },

  // Arrière d'épaule
  { id: 'face-pull', name: 'Face pull', pattern: 'rear', kind: 'iso', diff: 1, coef: 0.25, unit: 'poulie', muscles: ['épaules', 'dos'], cue: 'Corde à hauteur des yeux, écarte les mains en tirant.' },
  { id: 'rear-fly', name: 'Oiseau haltères', pattern: 'rear', kind: 'iso', diff: 1, coef: 0.06, unit: 'halteres', muscles: ['épaules'], cue: 'Buste penché, ouvre les bras sans hausser les épaules.' },
  { id: 'reverse-pec', name: 'Reverse pec deck', pattern: 'rear', kind: 'iso', diff: 1, coef: 0.25, unit: 'machine', muscles: ['épaules'], cue: 'Bras presque tendus, pense à écarter plutôt qu’à tirer.' },

  // Biceps
  { id: 'ez-curl', name: 'Curl barre EZ', pattern: 'biceps', kind: 'iso', diff: 1, coef: 0.3, unit: 'barre', muscles: ['biceps'], cue: 'Coudes fixes le long du corps, descente complète.' },
  { id: 'incline-curl', name: 'Curl incliné haltères', pattern: 'biceps', kind: 'iso', diff: 1, coef: 0.1, unit: 'halteres', muscles: ['biceps'], cue: 'Banc à 45°, bras pendants derrière le buste.' },
  { id: 'hammer', name: 'Curl marteau', pattern: 'biceps', kind: 'iso', diff: 1, coef: 0.13, unit: 'halteres', muscles: ['biceps'], cue: 'Prise neutre, alterne ou simultané.' },
  { id: 'preacher', name: 'Curl pupitre', pattern: 'biceps', kind: 'iso', diff: 1, coef: 0.25, unit: 'machine', muscles: ['biceps'], cue: 'Ne verrouille pas en bas, garde la tension.' },
  { id: 'cable-curl', name: 'Curl poulie basse', pattern: 'biceps', kind: 'iso', diff: 1, coef: 0.25, unit: 'poulie', muscles: ['biceps'], cue: 'Tension continue, contraction 1 s en haut.' },

  // Triceps
  { id: 'pushdown', name: 'Extension triceps poulie corde', pattern: 'triceps', kind: 'iso', diff: 1, coef: 0.3, unit: 'poulie', muscles: ['triceps'], cue: 'Coudes collés, écarte la corde en bas.' },
  { id: 'skull', name: 'Barre au front', pattern: 'triceps', kind: 'iso', diff: 2, coef: 0.3, unit: 'barre', muscles: ['triceps'], cue: 'Descends la barre derrière le front, coudes fixes.' },
  { id: 'overhead-ext', name: 'Extension nuque haltère', pattern: 'triceps', kind: 'iso', diff: 1, coef: 0.2, unit: 'halteres', muscles: ['triceps'], cue: 'Un haltère tenu à deux mains, grande amplitude derrière la tête.' },
  { id: 'overhead-cable', name: 'Extension triceps poulie au-dessus de la tête', pattern: 'triceps', kind: 'iso', diff: 1, coef: 0.25, unit: 'poulie', muscles: ['triceps'], cue: 'Dos à la poulie, coudes pointés vers l’avant.' },
  { id: 'close-bench', name: 'Développé couché prise serrée', pattern: 'triceps', kind: 'compound', diff: 2, coef: 0.6, unit: 'barre', muscles: ['triceps', 'pectoraux'], cue: 'Mains largeur d’épaules, coudes près du corps.' },

  // Gainage / abdos
  { id: 'plank', name: 'Gainage planche', pattern: 'core', kind: 'iso', diff: 1, coef: 0, unit: 'pdc', timed: true, muscles: ['abdos'], cue: 'Corps aligné, serre fessiers et abdos. Répétitions = secondes.' },
  { id: 'hanging-raise', name: 'Relevé de jambes suspendu', pattern: 'core', kind: 'iso', diff: 2, bw: true, coef: 0, unit: 'pdc', muscles: ['abdos'], cue: 'Enroule le bassin, ne balance pas.' },
  { id: 'cable-crunch', name: 'Crunch poulie haute', pattern: 'core', kind: 'iso', diff: 1, coef: 0.4, unit: 'poulie', muscles: ['abdos'], cue: 'À genoux, enroule la colonne, les hanches restent fixes.' },
  { id: 'ab-wheel', name: 'Roue abdominale', pattern: 'core', kind: 'iso', diff: 2, coef: 0, unit: 'pdc', muscles: ['abdos'], cue: 'Commence à genoux, dos jamais creusé.' },
  { id: 'pallof', name: 'Pallof press', pattern: 'core', kind: 'iso', diff: 1, coef: 0.15, unit: 'poulie', muscles: ['abdos'], cue: 'Résiste à la rotation, bras tendus 2 s.' },
  { id: 'side-plank', name: 'Gainage latéral', pattern: 'core', kind: 'iso', diff: 1, coef: 0, unit: 'pdc', timed: true, muscles: ['abdos'], cue: 'Hanches hautes, chaque côté. Répétitions = secondes.' },
  { id: 'dead-bug', name: 'Dead bug', pattern: 'core', kind: 'iso', diff: 1, coef: 0, unit: 'pdc', muscles: ['abdos'], cue: 'Bas du dos plaqué au sol, mouvements lents bras et jambe opposés.' },
];

export const BY_ID = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));

export const PATTERN_LABEL = {
  squat: 'Squat', hinge: 'Charnière hanche', hpush: 'Poussée horizontale', vpush: 'Poussée verticale',
  hpull: 'Tirage horizontal', vpull: 'Tirage vertical', quad: 'Quadriceps', ham: 'Ischios', glutes: 'Fessiers',
  calves: 'Mollets', chest: 'Pectoraux', lateral: 'Deltoïdes', rear: 'Arrière d’épaule', biceps: 'Biceps',
  triceps: 'Triceps', core: 'Gainage',
};

// Finishers cardio, choisis en rotation selon la semaine.
export const CARDIO = [
  { name: 'Vélo fractionné', detail: '8 × (20 s fort / 40 s souple)', impact: 'low' },
  { name: 'Rameur', detail: '10 min allure modérée, puis 5 × 30 s rapide', impact: 'low' },
  { name: 'Marche inclinée', detail: '15 min, pente 10–12 %, 5 km/h', impact: 'low' },
  { name: 'Elliptique zone 2', detail: '15 min à allure où tu peux parler', impact: 'low' },
  { name: 'Corde à sauter', detail: '6 × 1 min / 30 s de repos', impact: 'high' },
  { name: 'Farmer walk', detail: '6 × 30 m avec haltères lourds', impact: 'low' },
  { name: 'Course sur tapis', detail: '6 × (1 min rapide / 1 min marche)', impact: 'high' },
];

// Techniques qui renouvellent la séance d'une semaine à l'autre sans changer l'objectif.
export const TECHNIQUES = [
  { name: 'Tempo lent', detail: 'Descente en 3 s sur les exercices d’isolation.' },
  { name: 'Pause en bas', detail: 'Marque 1 s d’arrêt en position étirée sur les isolations.' },
  { name: 'Drop set', detail: 'Dernière série des isolations : baisse la charge de 25 % et continue jusqu’à l’échec technique.' },
  { name: 'Supersets', detail: 'Enchaîne les deux dernières isolations sans repos entre elles.' },
  { name: 'Myo-reps', detail: 'Dernière série des isolations : après la série, 3 mini-séries de 3–5 reps avec 15 s de repos.' },
  { name: 'Reps 1½', detail: 'Sur les isolations, ajoute une demi-répétition en position étirée à chaque rep.' },
];
