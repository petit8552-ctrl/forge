// Calculs partagés par la page Progrès et les récompenses, pour que les chiffres soient les mêmes partout.
import { e1rm } from './engine.js';
import { exById } from './cible.js';

// Exercices avec haltères faits avec un seul poids tenu à deux mains : la charge notée est la charge totale.
// Pour tous les autres, on note le poids d'UN haltère (ou d'un bras) : il y en a deux.
const ONE_WEIGHT = new Set(['goblet', 'glute-bridge', 'overhead-ext']);

export const isAssisted = (id) => !!exById(id)?.assisted;
export const perDumbbell = (id) => exById(id)?.unit === 'halteres' && !ONE_WEIGHT.has(id);

// Kilos réellement déplacés sur une série : 0 pour l'assistance (machine à contrepoids) et le poids du corps.
export function setVolume(id, s) {
  if (!s.done || !(s.w > 0) || !(s.r > 0) || isAssisted(id)) return 0;
  return s.w * s.r * (perDumbbell(id) ? 2 : 1);
}
// 1RM estimé d'une série, ou 0 si la série ne mesure pas une charge (assistance, poids du corps).
export function setE1rm(id, s) {
  if (!s.done || !(s.w > 0) || !(s.r > 0) || isAssisted(id)) return 0;
  return e1rm(s.w, s.r);
}

// Une séance compte si au moins une série (ou un effort chronométré) a été validée.
// Anciennes séances libres (sans détail des efforts) : comptées si elles ont duré 5 min ou plus.
export function isRealSession(h) {
  const ex = h.exercises || [];
  if (ex.some((e) => (e.sets || []).some((s) => s.done))) return true;
  return h.type === 'libre' && !ex.some((e) => (e.sets || []).length) && h.minutes >= 5;
}
