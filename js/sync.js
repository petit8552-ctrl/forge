// Sauvegarde en ligne : compte email + mot de passe et synchronisation de l'état avec Supabase.
// Le téléphone reste la source principale (l'appli marche hors ligne) ; les changements sont
// envoyés dès qu'il y a du réseau, et fusionnés avec ce qui est déjà dans le compte.
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

const LIB = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.58.0/+esm';
let client = null;
let user = null;
let host = null; // { get(): état, set(état fusionné), changed() }
let timer = null;
const status = { configured: !!(SUPABASE_URL && SUPABASE_KEY), ready: false, lastSync: null, pending: false, error: null };

export function getStatus() { return { ...status, email: user?.email || null, connected: !!user }; }

export async function init(h) {
  host = h;
  if (!status.configured) return;
  try {
    const { createClient } = await import(LIB);
    client = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'forge.auth' } });
    const { data } = await client.auth.getSession();
    user = data.session?.user || null;
    client.auth.onAuthStateChange((_e, session) => { user = session?.user || null; host.changed(); });
    status.ready = true;
    if (user) await syncNow();
  } catch (e) {
    status.error = 'Hors connexion : la sauvegarde reprendra au retour du réseau.';
  }
  host.changed();
  window.addEventListener('online', () => { if (!client) init(host); else if (user) syncNow(); });
  // Au retour dans l'appli (par exemple après le raccourci Santé), on récupère les nouvelles données.
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && user) syncNow(); });
}

function friendly(err) {
  const m = (err && err.message) || String(err);
  if (/Invalid login credentials/i.test(m)) return 'Email ou mot de passe incorrect.';
  if (/Email not confirmed/i.test(m)) return 'Confirme d’abord ton email : clique sur le lien reçu, puis reconnecte-toi.';
  if (/already registered/i.test(m)) return 'Ce compte existe déjà : connecte-toi.';
  if (/Password should be/i.test(m)) return 'Mot de passe trop court (6 caractères minimum).';
  if (/fetch|network/i.test(m)) return 'Pas de connexion internet.';
  return m;
}

export async function signUp(email, password) {
  if (!client) throw new Error('Sauvegarde en ligne indisponible.');
  const { data, error } = await client.auth.signUp({ email, password, options: { emailRedirectTo: location.origin + location.pathname } });
  if (error) throw new Error(friendly(error));
  user = data.session?.user || null;
  if (user) await syncNow();
  return { needsConfirmation: !data.session };
}

export async function signIn(email, password) {
  if (!client) throw new Error('Sauvegarde en ligne indisponible.');
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(friendly(error));
  user = data.user;
  await syncNow();
}

export async function resetPassword(email) {
  if (!client) throw new Error('Sauvegarde en ligne indisponible.');
  const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname + '#/password' });
  if (error) throw new Error(friendly(error));
}

export async function updatePassword(password) {
  const { error } = await client.auth.updateUser({ password });
  if (error) throw new Error(friendly(error));
}

// Code personnel à coller dans le raccourci iPhone (en crée un nouveau, l'ancien cesse de marcher).
export async function createHealthToken() {
  if (!client || !user) throw new Error('Connecte-toi d’abord à ton compte Forge.');
  const { data, error } = await client.rpc('create_health_token');
  if (error) throw new Error(friendly(error));
  return data;
}

export async function signOut() {
  if (client) await client.auth.signOut();
  user = null; status.lastSync = null;
  if (host.setHealth) host.setHealth([]);
  host.changed();
}

// Appelé à chaque enregistrement local : on regroupe les envois (2 s).
export function schedule() {
  if (!user || !client) return;
  status.pending = true;
  clearTimeout(timer);
  timer = setTimeout(() => syncNow().catch(() => {}), 2000);
}

const payload = (s) => ({ profile: s.profile, history: s.history, weights: s.weights, deleted: s.deleted || [] });

export async function syncNow() {
  if (!user || !client) return;
  try {
    const { data, error } = await client.from('user_data').select('data').eq('user_id', user.id).maybeSingle();
    if (error) throw error;
    const local = host.get();
    const merged = data ? merge(local, data.data) : payload(local);
    host.set(merged);
    const { error: e2 } = await client.from('user_data').upsert({ user_id: user.id, data: payload(host.get()), updated_at: new Date().toISOString() });
    if (e2) throw e2;
    // Données Apple Santé des 30 derniers jours (envoyées par le raccourci).
    const since = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
    const { data: health, error: e3 } = await client.from('health_daily').select('day,steps,active_kcal,resting_hr,hrv,sleep_min,weight').gte('day', since).order('day');
    if (!e3 && host.setHealth) host.setHealth(health || []);
    status.lastSync = new Date(); status.pending = false; status.error = null;
  } catch (e) {
    status.error = friendly(e);
  }
  host.changed();
}

// Fusion local + compte : séances et pesées réunies (sans doublon), profil le plus récent gagnant,
// séances supprimées volontairement (« Modifier la séance ») retirées des deux côtés.
export function merge(local, remote = {}) {
  const deleted = [...new Set([...(local.deleted || []), ...(remote.deleted || [])])];
  const gone = new Set(deleted);
  const byDate = (a, b) => {
    const m = new Map();
    for (const x of [...(a || []), ...(b || [])]) if (x && x.date && !gone.has(x.date)) m.set(x.date, x);
    return [...m.values()].sort((x, y) => x.date.localeCompare(y.date));
  };
  const lp = local.profile; const rp = remote.profile;
  let profile = lp || rp || null;
  if (lp && rp) profile = (rp.updatedAt || rp.startDate || '') > (lp.updatedAt || lp.startDate || '') ? rp : lp;
  // Le programme garde la date de départ la plus ancienne, pour ne pas repartir en semaine 1.
  if (lp && rp && profile) {
    const start = [lp.startDate, rp.startDate].filter(Boolean).sort()[0];
    profile = { ...profile, startDate: start };
  }
  return { profile, history: byDate(local.history, remote.history), weights: byDate(local.weights, remote.weights), deleted };
}
