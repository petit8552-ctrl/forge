// Musique de fond, bips et voix du coach pour la séance libre.
//
// Pourquoi des fichiers audio : sur iPhone (surtout l'appli lancée depuis l'écran d'accueil), le son
// fabriqué en direct par la page (Web Audio) est souvent muet, en particulier en mode silencieux.
// Un vrai fichier lu par un lecteur <audio> passe, lui, comme une musique. On fabrique donc la musique
// et les bips une fois, sur le téléphone, en petits fichiers WAV (aucun téléchargement, aucun droit
// d'auteur, marche hors ligne), puis on les lit avec deux lecteurs <audio> débloqués par un toucher.

const RATE = 22050;
const BPM = 124;
const SIXTEENTH = 60 / BPM / 4;
const CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]; // la mineur, fa, do, sol
const BASS = [45, 41, 36, 43];
const CUTOFF = { rest: 900, work: 5000, final: 10000 };
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
function render(secs, draw) {
  const OC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const c = new OC(1, Math.ceil(RATE * secs), RATE);
  draw(c, out(c));
  return new Promise((res, rej) => {
    c.oncomplete = (e) => res(e.renderedBuffer); // anciens Safari : pas de promesse
    const p = c.startRendering(); if (p && p.then) p.then(res, rej);
  }).then(toWav);
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

function drawLoop(c, dest, mode) {
  const filter = c.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = CUTOFF[mode];
  const mix = c.createGain(); mix.gain.value = 0.55; filter.connect(mix).connect(dest);
  const noise = c.createBuffer(1, RATE / 2, RATE); const nd = noise.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  const hiss = (t, dur, peak, type, freq) => {
    const s = c.createBufferSource(); const f = c.createBiquadFilter(); const g = c.createGain();
    s.buffer = noise; f.type = type; f.frequency.value = freq; env(g, t, peak, dur, 0.002);
    s.connect(f).connect(g).connect(filter); s.start(t); s.stop(t + dur + 0.02);
  };
  const kick = (t) => {
    const o = c.createOscillator(); const g = c.createGain();
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    env(g, t, 0.8, 0.28, 0.002); o.connect(g).connect(mix); o.start(t); o.stop(t + 0.3);
  };
  const calm = mode === 'rest';
  for (let n = 0; n < 64; n++) {
    const t = n * SIXTEENTH; const s = n % 16; const bar = Math.floor(n / 16);
    const chord = CHORDS[bar];
    if (s === 0) chord.forEach((m) => tone(c, filter, 'triangle', hz(m), t, SIXTEENTH * 16, calm ? 0.08 : 0.05, 0.3));
    if (!calm && s % 4 === 0) kick(t);
    if (!calm && (s === 4 || s === 12)) hiss(t, 0.14, 0.35, 'bandpass', 1800);
    if (mode === 'final' || (!calm && s % 4 === 2)) hiss(t, 0.04, s % 4 === 2 ? 0.25 : 0.12, 'highpass', 6000);
    if (calm ? s === 0 : s % 2 === 0) tone(c, filter, 'sawtooth', hz(BASS[bar] + (!calm && s % 4 === 2 ? 12 : 0)), t, calm ? SIXTEENTH * 14 : SIXTEENTH * 1.6, calm ? 0.16 : 0.22);
    if (calm ? s % 4 === 0 : s % 2 === 0) tone(c, filter, 'square', hz(chord[(s / 2 | 0) % 3] + 12), t, SIXTEENTH * 1.4, calm ? 0.05 : 0.06);
    if (mode === 'final' && s % 2 === 1) tone(c, filter, 'square', hz(chord[2] + 24), t, SIXTEENTH * 0.8, 0.04);
  }
}
const beeps = (list) => (c, dest) => list.forEach(([t, f, d]) => tone(c, dest, 'sine', f, t, d, 0.9, 0.01));
const CLIPS = {
  count: [3.6, beeps([[0, 660, 0.15], [1, 660, 0.15], [2, 660, 0.15], [3, 1040, 0.4]])], // 3, 2, 1, top départ
  rest: [0.6, beeps([[0, 440, 0.45]])],
  end: [1.3, beeps([[0, 1040, 0.2], [0.25, 1040, 0.2], [0.5, 1040, 0.2], [0.75, 1320, 0.4]])],
  test: [0.8, beeps([[0, 660, 0.15], [0.2, 880, 0.15], [0.4, 1040, 0.25]])],
};

const clips = {};
let preparing = null;
// Fabrique les fichiers (moins d'une seconde) ; appelé dès l'ouverture de l'onglet Libre.
export function prepareSounds() {
  if (!preparing) {
    preparing = (async () => {
      for (const [k, [secs, draw]] of Object.entries(CLIPS)) clips[k] = await render(secs, draw);
      for (const m of ['work', 'rest', 'final']) clips[`m-${m}`] = await render(64 * SIXTEENTH, (c, d) => drawLoop(c, d, m));
    })().catch((e) => { preparing = null; throw e; });
  }
  return preparing;
}

// ---------- Lecteurs ----------
let musicEl = null; let fxEl = null; let silent = null;
let musicWanted = false; let musicCur = null;
export let lastError = '';
function player() { const a = document.createElement('audio'); a.setAttribute('playsinline', ''); a.preload = 'auto'; return a; }
function silentUrl() {
  if (!silent) silent = toWav({ getChannelData: () => new Float32Array(2205), sampleRate: RATE }); // 0,1 s de silence
  return silent;
}
// À appeler PENDANT un toucher (Démarrer, Reprendre, Tester le son) : iPhone n'autorise ensuite ces
// deux lecteurs à jouer tout seuls (changement de piste, bips) que s'ils ont déjà joué sur un toucher.
export function unlockAudio() {
  if (navigator.audioSession) { try { navigator.audioSession.type = 'playback'; } catch { /* ancien Safari */ } }
  musicEl = musicEl || player(); fxEl = fxEl || player();
  for (const a of [musicEl, fxEl]) {
    if (!a.paused) continue;
    a.loop = false; a.src = silentUrl();
    const p = a.play();
    if (p && p.then) p.then(() => { if (a.src === silentUrl()) a.pause(); }).catch((e) => { lastError = e.name || 'erreur'; });
  }
}
export function releaseAudio() {
  musicStop();
  if (navigator.audioSession) { try { navigator.audioSession.type = 'transient'; } catch { /* rien */ } }
}
async function play(a, src, loop) {
  a.loop = loop; if (a.src !== src) a.src = src;
  try { a.currentTime = 0; } catch { /* pas encore chargé */ }
  await a.play();
}

export async function musicStart(mode = 'work') {
  musicWanted = true;
  try { await prepareSounds(); } catch { return; }
  if (!musicWanted || !musicEl) return;
  musicCur = null; musicMode(mode);
}
export function musicMode(mode) {
  if (!musicWanted || !musicEl || mode === musicCur || !clips[`m-${mode}`]) return;
  musicCur = mode;
  play(musicEl, clips[`m-${mode}`], true).catch((e) => { lastError = e.name || 'erreur'; });
}
export function musicStop() {
  musicWanted = false; musicCur = null;
  if (musicEl) musicEl.pause();
}
// Bips : « count » (3-2-1 puis top), « rest », « end », « test ».
export function fx(name) {
  if (!fxEl || !clips[name]) return;
  play(fxEl, clips[name], false).catch((e) => { lastError = e.name || 'erreur'; });
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
  const r = { fx: '', music: '', voice: '', voices: frenchVoices().length, standalone: !!(navigator.standalone || matchMedia('(display-mode: standalone)').matches) };
  try { await prepareSounds(); } catch (e) { r.fx = r.music = `fabrication impossible (${e.name || e})`; }
  if (!r.fx) {
    try { await play(fxEl, clips.test, false); r.fx = 'ok'; } catch (e) { r.fx = e.name || 'erreur'; }
    try { musicWanted = true; musicCur = 'work'; await play(musicEl, clips['m-work'], true); r.music = 'ok'; } catch (e) { r.music = e.name || 'erreur'; }
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
