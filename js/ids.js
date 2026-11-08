// Un seul identifiant par mouvement, quel que soit l'écran (programme, séance libre, muscu ciblée) :
// l'historique, les charges proposées et les records suivent ainsi d'un volet à l'autre.
// Les anciens identifiants restent ici pour convertir l'historique déjà enregistré.
export const ALIAS = {
  'l-goblet': 'goblet', 'l-rdl-halteres': 'rdl-halteres', 'l-pompes': 'pompes', 'c-pompes': 'pompes',
  'l-dev-halteres': 'db-press', 'l-rowing-halteres': 'db-row', 'l-tractions': 'pullup', 'c-chinup': 'chinup',
  'l-planche': 'plank', 'l-releve-suspendu': 'hanging-raise', 'l-planche-lat': 'side-plank', 'l-dead-bug': 'dead-bug',
  'l-squat': 'c-squat', 'l-pont': 'c-pont', 'l-pont-1j': 'c-pont-1j', 'l-squat-halteres': 'c-squat-halteres',
  'l-squat-elastique': 'c-squat-elastique', 'l-pompes-inclinees': 'c-pompes-inclinees', 'l-dips-banc': 'c-dips-banc',
  'l-dev-elastique': 'c-dev-elastique', 'l-australien': 'c-australien', 'l-ecartes-elastique': 'c-ecartes-elastique',
  'l-superman': 'c-superman',
};
export const canon = (id) => ALIAS[id] || id;

// Convertit en place les identifiants d'une liste de séances (historique, séance en cours).
export function migrateIds(sessions) {
  let changed = false;
  for (const h of sessions || []) {
    for (const e of h.exercises || []) {
      const c = canon(e.id);
      if (c !== e.id) { e.id = c; changed = true; }
    }
  }
  return changed;
}
