// Musique de fond, bips et voix du coach pour la séance libre.
//
// Pourquoi des fichiers audio : sur iPhone (surtout l'appli lancée depuis l'écran d'accueil), le son
// fabriqué en direct par la page (Web Audio) est souvent muet, en particulier en mode silencieux.
// Un vrai fichier lu par un lecteur <audio> passe, lui, comme une musique. On fabrique donc la musique
// et les bips une fois, sur le téléphone, en petits fichiers WAV (aucun téléchargement, aucun droit
// d'auteur, marche hors ligne), puis on les lit avec deux lecteurs <audio> débloqués par un toucher.

const RATE = 22050;
// Style « Tabata » : électro rapide à 160 BPM, grosse caisse à chaque temps, basse qui pompe entre
// les temps, accords plaqués ; plus calme en récupération ; montée de caisse claire et souffle dans
// les 10 dernières secondes d'effort. Sifflet d'arbitre pour partir, cloche de boxe pour s'arrêter.
const BPM = 160;
const SIXTEENTH = 60 / BPM / 4;
const CHORDS = [[57, 60, 64], [57, 60, 64], [53, 57, 60], [55, 59, 62]]; // la mineur ×2, fa, sol
const BASS = [45, 45, 41, 43];
const CUTOFF = { rest: 1100, work: 7000, final: 10000 };
const hz = (m) => 440 * 2 ** ((m - 69) / 12);

// ---------- Fabrication des fichiers ----------
function toWav(buf) {
  const d = buf.getChannelData(0); const n = d.length;
  const ab = new ArrayBuffer(44 + n * 2); const v = new DataView(ab);
  const w = (o, t) => { for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, buf.sampleRate, true); v.setUint32(28, buf.sampleRate * 2, true);
  v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, d[i])) * 0x7fff, true);
  return URL.createObjectURL(new Blob([ab], { type: 'audio/wav' }));
}
// Mise à niveau : les bips sont ramenés à une crête de 0,95 ; la musique est montée jusqu'au volume
// moyen visé (`loud`), les crêtes étant arrondies en douceur (saturation légère, sans craquement).
function level(buf, loud) {
  const d = buf.getChannelData(0); let peak = 0; let sum = 0;
  for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > peak) peak = a; sum += d[i] * d[i]; }
  if (!peak) return buf;
  if (!loud) { const g = 0.95 / peak; for (let i = 0; i < d.length; i++) d[i] *= g; return buf; }
  const g = loud / Math.sqrt(sum / d.length);
  for (let i = 0; i < d.length; i++) d[i] = Math.tanh(d[i] * g);
  return buf;
}
function render(secs, draw, loud = 0) {
  const OC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const c = new OC(1, Math.ceil(RATE * secs), RATE);
  draw(c, out(c));
  return new Promise((res, rej) => {
    c.oncomplete = (e) => res(e.renderedBuffer); // anciens Safari : pas de promesse
    const p = c.startRendering(); if (p && p.then) p.then(res, rej);
  }).then((b) => { const l = level(b, loud); return { url: toWav(l), buf: l }; });
}
// Sortie commune : compresseur pour éviter la saturation quand tout joue ensemble.
function out(c) {
  const comp = c.createDynamicsCompressor();
  comp.threshold.value = -12; comp.ratio.value = 6;
  const g = c.createGain(); g.gain.value = 0.9;
  comp.connect(g).connect(c.destination);
  return comp;
}
function env(g, t, peak, dur, attack = 0.005) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
}
function tone(c, dest, type, freq, t, dur, peak, attack) {
  const o = c.createOscillator(); const g = c.createGain();
  o.type = type; o.frequency.value = freq; env(g, t, peak, dur, attack);
  o.connect(g).connect(dest); o.start(t); o.stop(t + dur + 0.05);
}

function noiseBuf(c) {
  const b = c.createBuffer(1, RATE, RATE); const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}
function hissAt(c, dest, noise, t, dur, peak, type, freq, attack = 0.002) {
  const s = c.createBufferSource(); const f = c.createBiquadFilter(); const g = c.createGain();
  s.buffer = noise; f.type = type; f.frequency.value = freq; env(g, t, peak, dur, attack);
  s.connect(f).connect(g).connect(dest); s.start(t); s.stop(t + dur + 0.02);
}
// Accord « supersaw » : 3 dents de scie légèrement désaccordées par note.
function stab(c, dest, notes, t, dur, peak) {
  for (const m of notes) for (const det of [-12, 0, 12]) {
    const o = c.createOscillator(); const g = c.createGain();
    o.type = 'sawtooth'; o.frequency.value = hz(m); o.detune.value = det; env(g, t, peak, dur, 0.004);
    o.connect(g).connect(dest); o.start(t); o.stop(t + dur + 0.05);
  }
}

function drawLoop(c, dest, mode) {
  const filter = c.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = CUTOFF[mode];
  const mix = c.createGain(); mix.gain.value = 0.5; filter.connect(mix).connect(dest);
  const noise = noiseBuf(c);
  const calm = mode === 'rest'; const final = mode === 'final';
  const kick = (t, peak) => {
    const o = c.createOscillator(); const g = c.createGain();
    o.frequency.setValueAtTime(170, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.1);
    env(g, t, peak, 0.26, 0.001); o.connect(g).connect(mix); o.start(t); o.stop(t + 0.3);
    hissAt(c, mix, noise, t, 0.012, peak * 0.4, 'highpass', 3000); // attaque sèche
  };
  const snare = (t, peak) => {
    hissAt(c, filter, noise, t, 0.18, peak, 'bandpass', 2200);
    tone(c, filter, 'triangle', 190, t, 0.09, peak * 0.6, 0.001);
  };
  for (let n = 0; n < 64; n++) {
    const t = n * SIXTEENTH; const s = n % 16; const bar = Math.floor(n / 16);
    const chord = CHORDS[bar];
    if (calm) {
      if (s === 0) { chord.forEach((m) => tone(c, filter, 'sawtooth', hz(m), t, SIXTEENTH * 16, 0.05, 0.4)); kick(t, 0.45); tone(c, filter, 'sine', hz(BASS[bar]), t, SIXTEENTH * 8, 0.3, 0.02); }
      if (s === 8) kick(t, 0.3);
      if (s % 4 === 2) hissAt(c, filter, noise, t, 0.05, 0.08, 'highpass', 7000);
      continue;
    }
    if (s % 4 === 0) kick(t, 0.95);
    if (s === 4 || s === 12) snare(t, 0.5);
    if (s % 2 === 0) hissAt(c, filter, noise, t, 0.03, s % 4 === 2 ? 0.22 : 0.1, 'highpass', 8000); // charleston fermé
    if (s % 4 === 2) hissAt(c, filter, noise, t, 0.14, 0.14, 'highpass', 6000); // charleston ouvert
    if (final && s % 2 === 1) hissAt(c, filter, noise, t, 0.03, 0.12, 'highpass', 8000);
    // Basse qui pompe : jouée entre les grosses caisses, comme un « sidechain ».
    if (s % 4 !== 0) {
      const m = BASS[bar] + (s % 4 === 2 ? 12 : 0);
      tone(c, filter, 'sawtooth', hz(m), t, SIXTEENTH * 0.9, 0.2, 0.004);
      tone(c, filter, 'square', hz(m - 12), t, SIXTEENTH * 0.9, 0.12, 0.004);
    }
    if (s === 6 || s === 14 || (bar % 2 === 1 && s === 11)) stab(c, filter, chord.map((x) => x + 12), t, 0.16, 0.035);
    if (final) tone(c, filter, 'square', hz(chord[(n % 3)] + 24), t, SIXTEENTH * 0.7, 0.05, 0.003); // arpège rapide
    if (final && bar === 3 && s >= 8) snare(t, 0.12 + (s - 8) * 0.05); // roulement qui monte
  }
  if (final) { // souffle qui monte sur toute la boucle
    const src = c.createBufferSource(); const f = c.createBiquadFilter(); const g = c.createGain();
    src.buffer = noise; src.loop = true; f.type = 'bandpass'; f.Q.value = 2;
    const T = 64 * SIXTEENTH;
    f.frequency.setValueAtTime(400, 0); f.frequency.exponentialRampToValueAtTime(6000, T);
    g.gain.setValueAtTime(0.0001, 0); g.gain.exponentialRampToValueAtTime(0.18, T - 0.05); g.gain.linearRampToValueAtTime(0, T);
    src.connect(f).connect(g).connect(mix); src.start(0); src.stop(T);
  }
}

// Cloche de boxe : partiels non harmoniques, longue résonance.
function bell(c, dest, t, peak = 0.25) {
  [[1, 1], [1.5, 0.5], [2, 0.6], [2.74, 0.35], [3.76, 0.2]].forEach(([r, a]) => tone(c, dest, 'sine', 820 * r, t, 1.6 / r ** 0.3, peak * a, 0.002));
}
// Sifflet d'arbitre : son aigu qui « roule » (modulation rapide) + souffle.
function whistle(c, dest, t, dur, peak = 0.5) {
  const o = c.createOscillator(); const lfo = c.createOscillator(); const depth = c.createGain(); const g = c.createGain();
  o.type = 'sine'; o.frequency.value = 2900; lfo.frequency.value = 32; depth.gain.value = 220;
  lfo.connect(depth).connect(o.frequency);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.02);
  g.gain.setValueAtTime(peak, t + dur - 0.04); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(dest); o.start(t); lfo.start(t); o.stop(t + dur + 0.02); lfo.stop(t + dur + 0.02);
}
const tick = (c, dest, t) => tone(c, dest, 'sine', 880, t, 0.12, 0.8, 0.003);
const CLIPS = {
  // Séance libre : 3 tops puis sifflet « tu-tuuut » au départ de l'effort.
  count: [3.8, (c, d) => { [0, 1, 2].forEach((t) => tick(c, d, t)); whistle(c, d, 3, 0.12); whistle(c, d, 3.2, 0.5); }],
  // Fin d'effort : double coup de cloche.
  rest: [2.2, (c, d) => { bell(c, d, 0); bell(c, d, 0.3); }],
  // Fin de séance : trois coups de cloche.
  end: [2.8, (c, d) => { bell(c, d, 0); bell(c, d, 0.35); bell(c, d, 0.7); }],
  // Muscu, fin du repos : 3 tops puis cloche (lancé à 3 s de la fin) ; « bell » seul si le repos est très court.
  restEnd: [5, (c, d) => { [0, 1, 2].forEach((t) => tick(c, d, t)); bell(c, d, 3); bell(c, d, 3.3); }],
  bell: [2.2, (c, d) => { bell(c, d, 0); bell(c, d, 0.3); }],
  test: [2.4, (c, d) => { [0, 0.25].forEach((t) => tick(c, d, t)); whistle(c, d, 0.5, 0.4); bell(c, d, 1.1); }],
};

const clips = {}; // nom -> fichier WAV (lecteur <audio>)
const bufs = {};  // nom -> son brut (lecture Web Audio, anciens iPhone)
export { clips as soundFiles }; // pour le diagnostic
let preparing = null;
// Fabrique les fichiers (moins d'une seconde) ; appelé dès l'ouverture de l'onglet Libre ou du minuteur.
export function prepareSounds() {
  if (!preparing) {
    preparing = (async () => {
      const keep = (k, r) => { clips[k] = r.url; bufs[k] = r.buf; };
      for (const [k, [secs, draw]] of Object.entries(CLIPS)) keep(k, await render(secs, draw));
      const LOUD = { work: 0.17, final: 0.19, rest: 0.08 };
      for (const m of ['work', 'rest', 'final']) keep(`m-${m}`, await render(64 * SIXTEENTH, (c, d) => drawLoop(c, d, m), LOUD[m]));
    })().catch((e) => { preparing = null; throw e; });
  }
  return preparing;
}

// ---------- Lecture, sans jamais couper ta musique ----------
// Règle : Forge ne doit JAMAIS arrêter la musique que tu écoutes (Spotify, Apple Music…).
// - iPhone récent (iOS 17+) : session audio « ambient » = les sons de Forge se mélangent à ta musique.
//   On peut alors utiliser des lecteurs <audio>, fiables.
// - Ancien iPhone (pas de réglage de session) : un lecteur <audio> couperait ta musique. On joue donc
//   les mêmes sons par Web Audio, qui se mélange par défaut.
// Contrepartie assumée : en mode silencieux (bouton sur le côté), Forge reste muet.
const canMix = () => typeof navigator !== 'undefined' && !!navigator.audioSession;
function ambient() { if (canMix()) { try { navigator.audioSession.type = 'ambient'; } catch { /* rien */ } } }
let musicEl = null; let fxEl = null; let silent = null;
let ctx = null; let musicSrc = null; let fxSrc = null;
let musicWanted = false; let musicCur = null;
export let lastError = '';
function player() { const a = document.createElement('audio'); a.setAttribute('playsinline', ''); a.preload = 'auto'; return a; }
function silentUrl() {
  if (!silent) silent = toWav({ getChannelData: () => new Float32Array(2205), sampleRate: RATE }); // 0,1 s de silence
  return silent;
}
function webCtx() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!ctx || ctx.state === 'closed') ctx = new AC();
  if (ctx.state !== 'running') ctx.resume().catch(() => {});
  return ctx;
}
function webPlay(buf, loop) {
  const c = webCtx(); const src = c.createBufferSource();
  src.buffer = buf; src.loop = loop; src.connect(c.destination); src.start();
  return src;
}
const stopSrc = (x) => { try { if (x) x.stop(); } catch { /* déjà arrêté */ } };

// À appeler PENDANT un toucher (Démarrer, Reprendre, valider une série, Tester le son) : iPhone n'autorise
// ensuite les sons automatiques (bips, changement de piste) que si le lecteur a déjà joué sur un toucher.
export function unlockAudio() {
  ambient();
  if (!canMix()) { // ancien iPhone : Web Audio, débloqué par un son vide
    const c = webCtx(); const b = c.createBuffer(1, 1, 22050); const s = c.createBufferSource();
    s.buffer = b; s.connect(c.destination); s.start(0);
    return;
  }
  musicEl = musicEl || player(); fxEl = fxEl || player();
  for (const a of [musicEl, fxEl]) {
    if (!a.paused) continue;
    a.loop = false; a.src = silentUrl();
    const p = a.play();
    if (p && p.then) p.then(() => { if (a.src === silentUrl()) a.pause(); }).catch((e) => { lastError = e.name || 'erreur'; });
  }
}
export function releaseAudio() { musicStop(); }
async function play(a, src, loop) {
  a.loop = loop; if (a.src !== src) a.src = src;
  try { a.currentTime = 0; } catch { /* pas encore chargé */ }
  await a.play();
}
async function playClip(name, loop) {
  if (canMix()) { const a = loop ? musicEl : fxEl; if (!a) throw new Error('verrouillé'); await play(a, clips[name], loop); return; }
  const src = webPlay(bufs[name], loop);
  if (loop) { stopSrc(musicSrc); musicSrc = src; } else { stopSrc(fxSrc); fxSrc = src; }
  if (ctx.state !== 'running') throw new Error(`son bloqué (${ctx.state})`);
}

export async function musicStart(mode = 'work') {
  musicWanted = true;
  try { await prepareSounds(); } catch { return; }
  if (!musicWanted) return;
  musicCur = null; musicMode(mode);
}
export function musicMode(mode) {
  if (!musicWanted || mode === musicCur || !clips[`m-${mode}`]) return;
  musicCur = mode;
  playClip(`m-${mode}`, true).catch((e) => { lastError = e.name || e.message || 'erreur'; });
}
export function musicStop() {
  musicWanted = false; musicCur = null;
  if (musicEl) musicEl.pause();
  stopSrc(musicSrc); musicSrc = null;
}
export function fxStop() {
  if (fxEl && fxEl.src !== silentUrl()) fxEl.pause();
  stopSrc(fxSrc); fxSrc = null;
}
// Sons : « count », « rest », « end », « restEnd », « bell », « test » (voir CLIPS).
export function fx(name) {
  if (!clips[name]) return;
  playClip(name, false).catch((e) => { lastError = e.name || e.message || 'erreur'; });
}

// ---------- Voix du coach (synthèse vocale du téléphone, en français) ----------
const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
let voice = null;
function frenchVoices() { return synth ? synth.getVoices().filter((v) => /^fr/i.test(v.lang)) : []; }
function frenchVoice() {
  const vs = frenchVoices();
  return vs.find((v) => /^fr[-_]FR/i.test(v.lang) && /amélie|audrey|thomas|google|premium|enhanced/i.test(v.name))
    || vs.find((v) => /^fr[-_]FR/i.test(v.lang)) || vs[0] || null;
}
if (synth && synth.addEventListener) synth.addEventListener('voiceschanged', () => { voice = null; });

export function primeVoice() {
  if (!synth) return;
  const u = new SpeechSynthesisUtterance(' '); u.volume = 0; synth.speak(u);
}
function utter(text) {
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'fr-FR'; voice = voice || frenchVoice(); if (voice) u.voice = voice;
  u.rate = /^\d$/.test(text) ? 1.2 : 1.05; u.volume = 1;
  return u;
}
export function say(text, urgent = false) {
  if (!synth || !text) return;
  if (urgent || synth.pending) synth.cancel(); // une phrase en retard ne veut plus rien dire
  synth.speak(utter(text));
}
export function hush() { if (synth) synth.cancel(); }

// ---------- Test du son, avec un compte rendu lisible ----------
export async function selfTest() {
  const r = { fx: '', music: '', voice: '', voices: frenchVoices().length, mix: canMix(), standalone: !!(navigator.standalone || matchMedia('(display-mode: standalone)').matches) };
  try { await prepareSounds(); } catch (e) { r.fx = r.music = `fabrication impossible (${e.name || e})`; }
  if (!r.fx) {
    try { await playClip('test', false); r.fx = 'ok'; } catch (e) { r.fx = e.name || e.message || 'erreur'; }
    try { musicWanted = true; musicCur = 'work'; await playClip('m-work', true); r.music = 'ok'; } catch (e) { r.music = e.name || e.message || 'erreur'; }
  }
  r.voice = await new Promise((res) => {
    if (!synth) { res('indisponible sur ce téléphone'); return; }
    const u = utter('Le son fonctionne. Bonne séance !');
    let done = false; const end = (x) => { if (!done) { done = true; res(x); } };
    u.onstart = () => end('ok'); u.onerror = (e) => end(`erreur ${e.error || ''}`);
    synth.cancel(); synth.speak(u);
    setTimeout(() => end('n’a pas démarré'), 3000);
  });
  return r;
}
