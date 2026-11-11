// Musique de fond et voix du coach pour la séance libre.
// La musique est synthétisée en direct (aucun fichier à télécharger, aucun droit d'auteur, marche hors ligne) :
// boucle électro à 124 BPM, calme en récupération, complète pendant l'effort, plus intense dans les 10 dernières secondes.
// Limite : comme les bips, elle s'arrête si l'écran se verrouille (d'où l'écran maintenu allumé).

const BPM = 124;
const SIXTEENTH = 60 / BPM / 4;
const CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]; // la mineur, fa, do, sol
const BASS = [45, 41, 36, 43];
const LEVEL = 0.2; // volume de la musique : les bips et la voix restent au-dessus
const CUTOFF = { rest: 900, work: 5000, final: 12000 };
const hz = (m) => 440 * 2 ** ((m - 69) / 12);

let ctx = null; let master = null; let filter = null; let noise = null;
let timer = null; let nextT = 0; let n16 = 0; let mode = 'work';

function noiseBuffer(c) {
  const b = c.createBuffer(1, c.sampleRate * 0.5, c.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}
function env(g, t, peak, dur, attack = 0.005) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
}
function tone(type, freq, t, dur, peak, attack) {
  const o = ctx.createOscillator(); const g = ctx.createGain();
  o.type = type; o.frequency.value = freq; env(g, t, peak, dur, attack);
  o.connect(g).connect(filter); o.start(t); o.stop(t + dur + 0.05);
}
function kick(t) {
  const o = ctx.createOscillator(); const g = ctx.createGain();
  o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
  env(g, t, 0.9, 0.28, 0.002);
  o.connect(g).connect(master); o.start(t); o.stop(t + 0.3); // la grosse caisse passe à côté du filtre
}
function hiss(t, dur, peak, type, freq) {
  const s = ctx.createBufferSource(); const f = ctx.createBiquadFilter(); const g = ctx.createGain();
  s.buffer = noise; f.type = type; f.frequency.value = freq; env(g, t, peak, dur, 0.002);
  s.connect(f).connect(g).connect(filter); s.start(t); s.stop(t + dur + 0.02);
}

function play16(t) {
  const s = n16 % 16; const bar = Math.floor(n16 / 16) % 4;
  const chord = CHORDS[bar]; const calm = mode === 'rest';
  if (s === 0) chord.forEach((m) => tone('triangle', hz(m), t, SIXTEENTH * 16, calm ? 0.05 : 0.035, 0.3)); // nappe
  if (!calm && s % 4 === 0) kick(t);
  if (!calm && (s === 4 || s === 12)) hiss(t, 0.14, 0.35, 'bandpass', 1800); // claquement
  if (mode === 'final' ? true : !calm && s % 4 === 2) hiss(t, 0.04, s % 4 === 2 ? 0.25 : 0.12, 'highpass', 7000); // charleston
  if (calm ? s === 0 : s % 2 === 0) tone('sawtooth', hz(BASS[bar] + (!calm && s % 4 === 2 ? 12 : 0)), t, calm ? SIXTEENTH * 14 : SIXTEENTH * 1.6, calm ? 0.12 : 0.18);
  if (calm ? s % 4 === 0 : s % 2 === 0) tone('square', hz(chord[(s / 2 | 0) % 3] + 12), t, SIXTEENTH * 1.4, calm ? 0.03 : 0.045);
  if (mode === 'final' && s % 2 === 1) tone('square', hz(chord[2] + 24), t, SIXTEENTH * 0.8, 0.025); // montée
}
function pump() {
  if (!ctx) return;
  // Le téléphone a pris du retard (appli en arrière-plan) : on repart de maintenant au lieu de tout rattraper.
  if (nextT < ctx.currentTime - 0.2) nextT = ctx.currentTime + 0.05;
  while (nextT < ctx.currentTime + 0.25) { play16(nextT); nextT += SIXTEENTH; n16++; }
}

export function musicStart(c, m = 'work') {
  if (!c) return;
  if (ctx === c && timer) { musicMode(m); return; }
  musicStop();
  ctx = c; mode = m;
  noise = noiseBuffer(c);
  master = c.createGain(); master.gain.value = 0.0001;
  master.gain.exponentialRampToValueAtTime(LEVEL, c.currentTime + 0.8); // arrivée en douceur
  filter = c.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = CUTOFF[m] || CUTOFF.work;
  filter.connect(master); master.connect(c.destination);
  nextT = c.currentTime + 0.1; n16 = 0;
  timer = setInterval(pump, 50); pump();
}
export function musicMode(m) {
  if (!ctx || !filter || m === mode) return;
  mode = m;
  filter.frequency.cancelScheduledValues(ctx.currentTime);
  filter.frequency.setTargetAtTime(CUTOFF[m] || CUTOFF.work, ctx.currentTime, 0.4);
}
export function musicStop() {
  clearInterval(timer); timer = null;
  if (ctx && master) {
    const m = master; const t = ctx.currentTime;
    try { m.gain.cancelScheduledValues(t); m.gain.setValueAtTime(m.gain.value, t); m.gain.linearRampToValueAtTime(0, t + 0.3); } catch { /* contexte fermé */ }
    setTimeout(() => { try { m.disconnect(); } catch { /* déjà fait */ } }, 400);
  }
  ctx = null; master = null; filter = null;
}
// La musique baisse pendant que le coach parle.
function duck(on) {
  if (!ctx || !master) return;
  master.gain.setTargetAtTime(on ? LEVEL * 0.35 : LEVEL, ctx.currentTime, 0.08);
}

// ---------- Voix du coach (synthèse vocale du téléphone, en français) ----------
const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
let voice = null;
function frenchVoice() {
  const vs = synth.getVoices();
  return vs.find((v) => /^fr[-_]FR/i.test(v.lang) && /amélie|audrey|thomas|google|premium|enhanced/i.test(v.name))
    || vs.find((v) => /^fr[-_]FR/i.test(v.lang)) || vs.find((v) => /^fr/i.test(v.lang)) || null;
}
if (synth && synth.addEventListener) synth.addEventListener('voiceschanged', () => { voice = null; });

// iPhone n'autorise la voix qu'après un premier essai lancé par un toucher : à appeler sur « Démarrer » / « Reprendre ».
export function primeVoice() {
  if (!synth) return;
  const u = new SpeechSynthesisUtterance(' '); u.volume = 0; synth.speak(u);
}
// `urgent` coupe ce qui est en cours (décompte) ; sinon la phrase passe après.
export function say(text, urgent = false) {
  if (!synth || !text) return;
  if (urgent || synth.pending) synth.cancel(); // pas d'empilement : une phrase en retard ne veut plus rien dire
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'fr-FR'; voice = voice || frenchVoice(); if (voice) u.voice = voice;
  u.rate = /^\d$/.test(text) ? 1.2 : 1.05;
  u.onstart = () => duck(true);
  u.onend = u.onerror = () => duck(false);
  synth.speak(u);
}
export function hush() { if (synth) synth.cancel(); duck(false); }
