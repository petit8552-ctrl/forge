// Récompenses : badges calculés à partir de l'historique (rien de stocké, donc rien à synchroniser
// ni à tricher). On récompense la régularité, les records et la découverte, jamais le volume brut :
// des points au tonnage pousseraient à s'entraîner en se blessant ou à gonfler les saisies.
import { mondayOf, e1rm } from './engine.js';

const weekKey = (iso) => mondayOf(new Date(iso)).toISOString().slice(0, 10);

// Semaines d'affilée avec au moins une séance (programme ou libre), en partant de la semaine en cours.
// La semaine en cours ne casse pas la série tant qu'elle n'est pas finie.
export function weekStreak(history, now = new Date()) {
  const weeks = new Set(history.map((h) => weekKey(h.date)));
  let streak = 0;
  const d = mondayOf(now);
  if (!weeks.has(d.toISOString().slice(0, 10))) d.setDate(d.getDate() - 7);
  while (weeks.has(d.toISOString().slice(0, 10))) { streak++; d.setDate(d.getDate() - 7); }
  return streak;
}
function bestStreak(history) {
  const weeks = [...new Set(history.map((h) => weekKey(h.date)))].sort();
  let best = 0; let cur = 0; let prev = null;
  for (const w of weeks) {
    cur = prev && (new Date(w) - new Date(prev)) / 864e5 <= 8 ? cur + 1 : 1;
    best = Math.max(best, cur); prev = w;
  }
  return best;
}

// Nombre de records battus : une série dont le 1RM estimé dépasse le meilleur précédent sur l'exercice.
function recordCount(history) {
  const best = {}; let n = 0;
  for (const h of [...history].sort((a, b) => a.date.localeCompare(b.date))) {
    for (const e of h.exercises || []) {
      let top = 0;
      for (const s of e.sets || []) if (s.done && s.w > 0 && s.r > 0) top = Math.max(top, e1rm(s.w, s.r));
      if (!top) continue;
      if (best[e.id] && top > best[e.id]) n++;
      best[e.id] = Math.max(best[e.id] || 0, top);
    }
  }
  return n;
}

function perfectWeeks(history, profile) {
  if (!profile) return 0;
  const byWeek = {};
  for (const h of history) if (h.type !== 'libre' && h.week) (byWeek[h.week] = byWeek[h.week] || new Set()).add(h.dayIndex);
  return Object.values(byWeek).filter((s) => s.size >= profile.days.length).length;
}

const tiers = (id, icon, name, value, steps, unit) => steps.map((n, i) => ({
  id: `${id}-${n}`, icon, name: `${name}${steps.length > 1 ? ` ${['I', 'II', 'III', 'IV', 'V'][i]}` : ''}`,
  desc: `${n} ${unit}`, earned: value >= n, progress: Math.min(value, n), goal: n,
}));

export function badges(history = [], profile = null) {
  const done = history.filter((h) => h.type === 'libre' || (h.exercises || []).some((e) => (e.sets || []).some((s) => s.done)));
  const libres = done.filter((h) => h.type === 'libre');
  const places = new Set(libres.map((h) => h.place));
  const cardio = libres.filter((h) => h.goal === 'cardio' || h.goal === 'mixte').length;
  const pullup = history.some((h) => (h.exercises || []).some((e) => ['pullup', 'chinup', 'l-tractions'].includes(e.id) && (e.sets || []).some((s) => s.done && s.r > 0)))
    || libres.some((h) => (h.exercises || []).some((e) => e.id === 'l-tractions'));
  const list = [
    { id: 'first', icon: '🔥', name: 'C’est parti', desc: 'Première séance terminée', earned: done.length >= 1, progress: Math.min(done.length, 1), goal: 1 },
    ...tiers('sessions', '💪', 'Assidu', done.length, [10, 25, 50, 100], 'séances'),
    ...tiers('streak', '📅', 'Régulier', bestStreak(done), [2, 4, 8, 12], 'semaines d’affilée'),
    ...tiers('perfect', '✅', 'Semaine parfaite', perfectWeeks(done, profile), [1, 4], 'semaines avec toutes les séances prévues'),
    ...tiers('records', '🏆', 'Record battu', recordCount(done), [1, 10, 25], 'records personnels'),
    { id: 'pullup', icon: '🧗', name: 'Première traction', desc: 'Une traction sans assistance', earned: pullup, progress: pullup ? 1 : 0, goal: 1 },
    { id: 'beach', icon: '🏖️', name: 'Sur le sable', desc: 'Une séance libre à la plage', earned: places.has('plage'), progress: places.has('plage') ? 1 : 0, goal: 1 },
    { id: 'outdoor', icon: '🌳', name: 'Grand air', desc: 'Une séance libre en plein air', earned: places.has('dehors'), progress: places.has('dehors') ? 1 : 0, goal: 1 },
    { id: 'explorer', icon: '🧭', name: 'Partout', desc: 'Séances libres dans les 4 lieux', earned: places.size >= 4, progress: places.size, goal: 4 },
    ...tiers('cardio', '❤️', 'Cardio', cardio, [5, 20], 'séances libres cardio ou mixtes'),
  ];
  return list;
}

// Badges gagnés entre deux états de l'historique (pour féliciter juste après une séance).
export function newBadges(before, after, profile) {
  const had = new Set(badges(before, profile).filter((b) => b.earned).map((b) => b.id));
  return badges(after, profile).filter((b) => b.earned && !had.has(b.id));
}
