import {
  bodyMetrics, coachAdvice, splitFor, buildSession, currentWeek, dateFor, todayIndex, phaseOf, blockOf,
  PHASES, DAY_NAMES, DEFAULT_DAYS, poolFor, weeklyVolume, e1rm, mondayOf, readiness, fmtH,
} from './engine.js';
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';
import { BY_ID, PATTERN_LABEL } from './exercises.js';
import { photos, videoUrl } from './media.js';
import * as Sync from './sync.js';

// ---------- État persistant ----------
const KEY = 'forge.v1';
function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}
const state = Object.assign({ profile: null, history: [], weights: [], drafts: {}, deleted: [], health: [] }, load());
function saveLocal() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* stockage indisponible */ } }
function save() { saveLocal(); Sync.schedule(); }
const touchProfile = () => { if (state.profile) state.profile.updatedAt = new Date().toISOString(); };

const $app = document.getElementById('app');
const $tab = document.getElementById('tabbar');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDate = (d) => d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
const kg = (x) => (x == null ? '—' : `${String(x).replace('.', ',')} kg`);
const isDone = (w, d) => state.history.some((h) => h.week === w && h.dayIndex === d);
// La forme du jour (données de la montre) n'ajuste que la séance prévue aujourd'hui.
const sessionFor = (w, d) => {
  const isToday = dateFor(state.profile, w, d).toDateString() === new Date().toDateString();
  return buildSession(state.profile, w, d, state.history, isToday ? readiness(state.health) : null);
};
const SHORTCUT_NAME = 'Forge Santé';
const shortcutUrl = `shortcuts://run-shortcut?name=${encodeURIComponent(SHORTCUT_NAME)}`;

const GOALS = {
  masse: ['Prise de muscle', 'Hypertrophie'], seche: ['Sèche', 'Perdre du gras'],
  force: ['Force', 'Charges lourdes'], forme: ['Forme & santé', 'Global, cardio'],
};
const LEVELS = { debutant: ['Débutant', '< 6 mois'], intermediaire: ['Intermédiaire', '6 mois – 2 ans'], avance: ['Avancé', '> 2 ans'] };
const ROLE = { main: 'Principal', sec: 'Secondaire', acc: 'Accessoire' };

// ---------- Retour d'un lien reçu par email (confirmation, mot de passe oublié) ----------
// Lu au chargement, avant que Supabase ne nettoie l'adresse.
const hashParams = new URLSearchParams(location.hash.replace(/^#\/?/, ''));
let recoveryPending = hashParams.get('type') === 'recovery';
let authLinkError = hashParams.get('error_description')
  ? (/expired|invalid/i.test(hashParams.get('error_description') + hashParams.get('error_code'))
    ? 'Ce lien a expiré ou a déjà servi. Redemande un email « Mot de passe oublié ».'
    : hashParams.get('error_description'))
  : null;
const isAuthCallback = () => /access_token=/.test(location.hash);
if (authLinkError) history.replaceState(null, '', location.pathname + '#/login');

// ---------- Routage ----------
function route() {
  if (isAuthCallback()) return renderRestoring('Connexion à ton compte…');
  const [, page = 'today', a, b] = location.hash.split('/');
  if (page === 'login') return renderLogin();
  if (page === 'password') return renderNewPassword();
  if (page === 'sante' && state.profile) { $tab.hidden = false; return renderHealthGuide(); }
  if (!state.profile) {
    // Compte connecté sur ce téléphone mais programme pas encore chargé : on attend le compte
    // au lieu de reposer les questions.
    if (Sync.hasStoredSession() && !Sync.getStatus().settled) return renderRestoring();
    return renderOnboarding();
  }
  $tab.hidden = false;
  $tab.querySelectorAll('a').forEach((x) => x.classList.toggle('on', x.dataset.tab === (page === 'session' ? 'program' : page)));
  window.scrollTo(0, 0);
  if (page === 'program') return renderProgram(a ? +a : currentWeek(state.profile));
  if (page === 'session') return renderSession(+a, +b);
  if (page === 'progress') return renderProgress();
  if (page === 'profile') return renderProfile();
  return renderToday();
}
window.addEventListener('hashchange', route);

// ---------- Onboarding ----------
function renderOnboarding(existing) {
  $tab.hidden = true;
  const p = existing || { name: '', sex: 'h', age: 28, height: 175, weight: 75, level: 'debutant', goal: 'masse', days: DEFAULT_DAYS[3], duration: 60, dailyActivity: 'modere' };
  const draft = { ...p, days: [...p.days] };
  const steps = existing ? 1 : 4;
  let step = 0;

  const chips = (name, opts, val) => `<div class="chips" data-name="${name}">${Object.entries(opts).map(([k, [l, s]]) =>
    `<button type="button" class="chip ${String(val) === String(k) ? 'on' : ''}" data-val="${k}">${l}${s ? `<small>${s}</small>` : ''}</button>`).join('')}</div>`;

  const s1 = `
    <label class="field"><span>Prénom</span><input type="text" name="name" value="${esc(draft.name)}" placeholder="Ton prénom" autocomplete="given-name"></label>
    <label class="field"><span>Sexe</span>${chips('sex', { h: ['Homme'], f: ['Femme'] }, draft.sex)}</label>
    <div class="grid3">
      <label class="field"><span>Âge</span><input type="number" name="age" inputmode="numeric" min="14" max="90" value="${draft.age}"></label>
      <label class="field"><span>Taille (cm)</span><input type="number" name="height" inputmode="numeric" min="130" max="230" value="${draft.height}"></label>
      <label class="field"><span>Poids (kg)</span><input type="number" name="weight" inputmode="decimal" step="0.1" min="35" max="250" value="${draft.weight}"></label>
    </div>`;
  const s2 = `
    <label class="field"><span>Objectif principal</span>${chips('goal', GOALS, draft.goal)}</label>
    <label class="field"><span>Niveau en musculation</span>${chips('level', LEVELS, draft.level)}</label>
    <label class="field"><span>Activité hors salle</span>${chips('dailyActivity', { sedentaire: ['Sédentaire', 'Bureau'], modere: ['Modérée', 'Marche'], actif: ['Active', 'Métier physique'] }, draft.dailyActivity)}</label>`;
  const s3 = `
    <label class="field"><span>Séances par semaine</span>${chips('count', { 2: ['2'], 3: ['3'], 4: ['4'], 5: ['5'], 6: ['6'] }, draft.days.length)}</label>
    <label class="field"><span>Jours à la salle</span><div class="chips days" data-name="days">${DAY_NAMES.map((d, i) =>
      `<button type="button" class="chip ${draft.days.includes(i) ? 'on' : ''}" data-val="${i}">${d}</button>`).join('')}</div></label>
    <label class="field"><span>Durée d’une séance</span>${chips('duration', { 45: ['45 min'], 60: ['1 h'], 75: ['1 h 15'], 90: ['1 h 30'] }, draft.duration)}</label>
    <p class="small muted" id="splitInfo"></p>`;

  const stepsHtml = existing ? [s1 + s2 + s3] : [s1, s2, s3, '<div id="summary"></div>'];
  $app.innerHTML = `
    <div class="onb">
      ${existing ? '<div class="eyebrow">Profil</div><h1>Modifier mes infos</h1>' : `<div class="eyebrow">Forge</div><h1>Ton coach muscu personnel</h1><p class="muted">4 questions pour construire un programme qui te ressemble et se renouvelle chaque semaine.</p>${Sync.getStatus().configured ? '<a class="btn ghost block" href="#/login" style="margin:6px 0 4px;border-color:var(--accent);color:var(--accent)">☁ J’ai déjà un compte : me connecter</a><p class="small muted center" style="margin:0 0 6px">Sinon, réponds aux 4 questions ci-dessous.</p>' : ''}`}
      ${existing ? '' : `<div class="progress-dots">${stepsHtml.map(() => '<i></i>').join('')}</div>`}
      <form id="onb">${stepsHtml.map((h, i) => `<section class="onb-step" data-step="${i}">${h}</section>`).join('')}
        <div class="sticky-actions row">
          ${existing ? '<a class="btn ghost" href="#/profile">Annuler</a>' : '<button type="button" class="btn ghost" id="back">Retour</button>'}
          <button type="submit" class="btn primary" style="flex:1" id="next"></button>
        </div>
      </form>
    </div>`;

  const form = $app.querySelector('#onb');
  const readInputs = () => {
    form.querySelectorAll('input[name]').forEach((i) => { draft[i.name] = i.type === 'number' ? parseFloat(i.value) : i.value.trim(); });
  };
  const refreshSplit = () => {
    const el = form.querySelector('#splitInfo');
    if (el) el.textContent = draft.days.length >= 2 ? `Programme : ${splitFor(draft.days.length).name}.` : 'Choisis au moins 2 jours.';
  };
  const show = () => {
    form.querySelectorAll('.onb-step').forEach((s) => s.classList.toggle('on', +s.dataset.step === step || !!existing));
    $app.querySelectorAll('.progress-dots i').forEach((d, i) => d.classList.toggle('on', i <= step));
    const back = form.querySelector('#back'); if (back) back.style.visibility = step ? 'visible' : 'hidden';
    form.querySelector('#next').textContent = existing ? 'Enregistrer' : step === steps - 1 ? 'Lancer mon programme' : 'Continuer';
    if (!existing && step === 3) renderSummary();
    refreshSplit();
  };
  const renderSummary = () => {
    const m = bodyMetrics(draft);
    const split = splitFor(draft.days.length);
    form.querySelector('#summary').innerHTML = `
      <div class="card hero">
        <div class="eyebrow">Ton bilan</div>
        <h2 style="margin-top:6px">${esc(draft.name) || 'Ton'} programme : ${split.name}</h2>
        <div class="grid2" style="margin-top:12px">
          <div class="stat"><b>${m.bmi.toFixed(1).replace('.', ',')}</b><span>IMC · ${m.bmiLabel}</span></div>
          <div class="stat"><b>${m.kcal}</b><span>kcal / jour</span></div>
          <div class="stat"><b>${m.protein} g</b><span>protéines / jour</span></div>
          <div class="stat"><b>${String(m.water).replace('.', ',')} L</b><span>eau / jour</span></div>
        </div>
      </div>
      <div class="card"><h3>Comment ça marche</h3>
        <div class="tip">Cycles de 4 semaines : accumulation, progression, intensification, puis récupération.</div>
        <div class="tip">Les exercices principaux changent à chaque cycle, les accessoires chaque semaine.</div>
        <div class="tip">Les charges sont proposées à partir de ton poids, puis ajustées selon ce que tu notes.</div>
      </div>`;
  };

  form.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip'); if (!chip) return;
    const group = chip.parentElement.dataset.name; const val = chip.dataset.val;
    if (group === 'days') {
      const i = +val;
      draft.days = draft.days.includes(i) ? draft.days.filter((x) => x !== i) : [...draft.days, i].sort();
      if (draft.days.length > 6) draft.days = draft.days.filter((x) => x !== i);
      chip.classList.toggle('on', draft.days.includes(i));
      form.querySelectorAll('[data-name=count] .chip').forEach((c) => c.classList.toggle('on', +c.dataset.val === draft.days.length));
    } else if (group === 'count') {
      draft.days = [...DEFAULT_DAYS[+val]];
      chip.parentElement.querySelectorAll('.chip').forEach((c) => c.classList.toggle('on', c === chip));
      form.querySelectorAll('[data-name=days] .chip').forEach((c) => c.classList.toggle('on', draft.days.includes(+c.dataset.val)));
    } else {
      draft[group] = group === 'duration' ? +val : val;
      chip.parentElement.querySelectorAll('.chip').forEach((c) => c.classList.toggle('on', c === chip));
    }
    refreshSplit();
  });
  form.querySelector('#back')?.addEventListener('click', () => { readInputs(); step = Math.max(0, step - 1); show(); });
  form.addEventListener('submit', (e) => {
    e.preventDefault(); readInputs();
    if (!(draft.age > 0 && draft.height > 100 && draft.weight > 30)) return alert('Vérifie l’âge, la taille et le poids.');
    if (draft.days.length < 2) return alert('Choisis au moins 2 jours d’entraînement.');
    if (!existing && step < steps - 1) { step++; show(); return; }
    if (existing) {
      // Changer de split invalide les variantes choisies à la main.
      if (existing.days.length !== draft.days.length) draft.swaps = {};
      if (existing.weight !== draft.weight) state.weights.push({ date: new Date().toISOString(), kg: draft.weight });
      state.profile = draft;
    } else {
      state.profile = { ...draft, startDate: new Date().toISOString(), swaps: {} };
      state.weights.push({ date: new Date().toISOString(), kg: draft.weight });
    }
    touchProfile(); save(); location.hash = existing ? '#/profile' : '#/today'; route();
  });
  show();
}

// ---------- Aujourd'hui ----------
function renderToday() {
  const p = state.profile;
  const week = currentWeek(p);
  const phase = phaseOf(week);
  const ti = todayIndex(p);
  const split = splitFor(p.days.length);
  const doneThisWeek = p.days.filter((_, d) => isDone(week, d)).length;
  const wd = (new Date().getDay() + 6) % 7;
  const nextIdx = p.days.findIndex((day, d) => day > wd && !isDone(week, d));
  const m = bodyMetrics(p, state.health);
  const hello = new Date().getHours() < 18 ? 'Salut' : 'Bonsoir';

  let main;
  if (ti >= 0) {
    const s = sessionFor(week, ti);
    main = sessionCard(s, isDone(week, ti) ? 'Séance terminée, bravo !' : 'Séance du jour', true);
  } else {
    const s = nextIdx >= 0 ? sessionFor(week, nextIdx) : null;
    main = `<div class="card"><div class="eyebrow">Jour de repos</div><h2 style="margin:6px 0">Récupère, ça fait partie du programme</h2>
      <p class="muted small">Marche 30 min, étire-toi 10 min, dors bien. ${s ? `Prochaine séance : <b>${s.name}</b>, ${fmtDate(dateFor(p, week, nextIdx))}.` : 'Semaine bouclée, la suivante est déjà prête.'}</p>
      ${s ? `<a class="btn ghost sm" href="#/session/${week}/${nextIdx}">Voir la prochaine séance</a>` : ''}</div>`;
  }

  $app.innerHTML = `
    <div class="eyebrow">${fmtDate(new Date())}</div>
    <h1>${hello}${p.name ? ' ' + esc(p.name) : ''} 👋</h1>
    <div class="row wrap" style="margin:8px 0 14px">
      <span class="pill accent">Semaine ${week} · ${phase.name}</span>
      <span class="pill">Cycle ${blockOf(week) + 1}</span>
      <span class="pill">${doneThisWeek}/${p.days.length} séances</span>
    </div>
    ${Sync.getStatus().configured && !Sync.getStatus().connected ? `<a class="card row between" href="#/profile" style="border-color:rgba(124,196,255,.35)">
      <div><h3>☁ Sauvegarde ton programme</h3><div class="small muted">Crée ton compte pour ne jamais perdre tes séances.</div></div><span class="chev">›</span></a>` : ''}
    ${formeCard()}
    ${main}
    <h2>Ta journée</h2>
    ${m.measured ? `<p class="small muted">Calories ajustées sur ta dépense réelle : ${m.active} kcal d’énergie active par jour en moyenne (montre).</p>` : ''}
    <div class="grid2">
      <div class="stat"><b>${m.kcal}</b><span>kcal ${p.goal === 'seche' ? '(déficit)' : p.goal === 'masse' ? '(surplus)' : ''}</span></div>
      <div class="stat"><b>${m.protein} g</b><span>protéines</span></div>
      <div class="stat"><b>${m.carbs} g</b><span>glucides</span></div>
      <div class="stat"><b>${String(m.water).replace('.', ',')} L</b><span>eau</span></div>
    </div>
    <h2>Cette semaine · ${split.name}</h2>
    <p class="muted small">${phase.desc}</p>
    ${weekList(week)}
    <h2>Conseils du coach</h2>
    <div class="card">${coachAdvice(p).map((t) => `<div class="tip">${esc(t)}</div>`).join('')}</div>`;
}

function sessionCard(s, label, big) {
  const done = isDone(s.week, s.dayIndex);
  return `<div class="card ${big ? 'hero' : ''}">
    <div class="row between"><div class="eyebrow">${label}</div>${done ? '<span class="pill ok">✓ Faite</span>' : `<span class="pill">≈ ${s.minutes} min</span>`}</div>
    <h2 style="margin:6px 0 2px">${s.name}</h2>
    <p class="muted small">${s.focus}</p>
    <ul class="clean small" style="margin:10px 0 12px">${s.exercises.map((e) => `<li>${esc(e.name)} <span class="muted">· ${e.sets}×${e.repsMin === e.repsMax ? e.repsMin : e.repsMin + '–' + e.repsMax}</span></li>`).join('')}</ul>
    <div class="row wrap" style="margin-bottom:12px">
      ${s.technique ? `<span class="pill warn">⚡ ${s.technique.name}</span>` : ''}
      ${s.cardio ? `<span class="pill blue">♥ ${s.cardio.name}</span>` : ''}
    </div>
    <a class="btn ${done ? 'ghost' : 'primary'} block" href="#/session/${s.week}/${s.dayIndex}">${done ? 'Revoir la séance' : 'Commencer'}</a>
  </div>`;
}

function weekList(week) {
  const p = state.profile;
  const todayKey = new Date().toDateString();
  return p.days.map((_, d) => {
    const s = sessionFor(week, d);
    const date = dateFor(p, week, d);
    const done = isDone(week, d);
    return `<a class="card day ${date.toDateString() === todayKey ? 'today' : ''}" href="#/session/${week}/${d}">
      <div class="date"><span>${DAY_NAMES[p.days[d]]}</span><b>${date.getDate()}</b></div>
      <div class="grow"><h3>${s.name}</h3><div class="small muted">${s.focus} · ${s.exercises.length} exercices · ≈ ${s.minutes} min</div></div>
      ${done ? '<span class="pill ok">✓</span>' : '<span class="chev">›</span>'}
    </a>`;
  }).join('');
}

// ---------- Programme ----------
function renderProgram(week) {
  const p = state.profile;
  const cur = currentWeek(p);
  const phase = phaseOf(week);
  const pi = (week - 1) % 4;
  const vol = weeklyVolume(p, week);
  const monday = mondayOf(p.startDate); monday.setDate(monday.getDate() + (week - 1) * 7);
  const muscles = ['pectoraux', 'dos', 'épaules', 'quadriceps', 'ischios', 'fessiers', 'biceps', 'triceps', 'mollets', 'abdos'];
  const maxV = Math.max(...muscles.map((x) => vol[x] || 0), 1);

  $app.innerHTML = `
    <div class="eyebrow">Programme · ${splitFor(p.days.length).name}</div>
    <div class="weeknav">
      <button id="prev" ${week <= 1 ? 'disabled' : ''} aria-label="Semaine précédente">‹</button>
      <div class="center"><h1 style="margin:0">Semaine ${week}</h1><div class="small muted">du ${monday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} ${week === cur ? '· en cours' : ''}</div></div>
      <button id="nextw" aria-label="Semaine suivante">›</button>
    </div>
    <div class="card">
      <div class="row between"><h3>Cycle ${blockOf(week) + 1} · ${phase.name}</h3><span class="pill accent">${phase.short}</span></div>
      <div class="phasebar">${PHASES.map((_, i) => `<i class="${i === pi ? 'on' : i < pi ? 'past' : ''}"></i>`).join('')}</div>
      <p class="small muted" style="margin-top:8px">${phase.desc}</p>
    </div>
    ${weekList(week)}
    <h2>Volume de la semaine</h2>
    <div class="card">
      <p class="small muted">Séries directes par muscle (une série sur un muscle secondaire compte pour ½). Repère scientifique : 10 à 20 séries par muscle et par semaine.</p>
      ${muscles.map((x) => {
        const v = vol[x] || 0;
        return `<div class="vol"><span>${x[0].toUpperCase() + x.slice(1)}</span><div class="bar"><i class="${v < 8 && phase.key !== 'deload' ? 'low' : ''}" style="width:${(v / maxV) * 100}%"></i></div><b>${Math.round(v)}</b></div>`;
      }).join('')}
    </div>`;
  $app.querySelector('#prev').onclick = () => { location.hash = `#/program/${week - 1}`; };
  $app.querySelector('#nextw').onclick = () => { location.hash = `#/program/${week + 1}`; };
}

// ---------- Séance ----------
function draftFor(s) {
  const key = `${s.week}|${s.dayIndex}`;
  const logged = state.history.find((h) => h.week === s.week && h.dayIndex === s.dayIndex);
  if (logged) return { key, data: logged, locked: true };
  let d = state.drafts[key];
  if (!d) d = state.drafts[key] = { exercises: {} };
  for (const e of s.exercises) {
    const cur = d.exercises[e.slot];
    if (!cur || cur.id !== e.id) {
      d.exercises[e.slot] = { id: e.id, sets: Array.from({ length: e.sets }, () => ({ w: e.load ?? '', r: '', done: false })) };
    } else if (cur.sets.length !== e.sets) {
      cur.sets = Array.from({ length: e.sets }, (_, i) => cur.sets[i] || { w: e.load ?? '', r: '', done: false });
    }
  }
  return { key, data: d, locked: false };
}

function renderSession(week, dayIndex) {
  const p = state.profile;
  if (!(week >= 1) || !(dayIndex >= 0 && dayIndex < p.days.length)) { location.hash = '#/today'; return; }
  const s = sessionFor(week, dayIndex);
  const { key, data, locked } = draftFor(s);
  const exData = (slot) => (locked ? data.exercises.find((x) => x.slot === slot) : data.exercises[slot]);
  const date = dateFor(p, week, dayIndex);

  $app.innerHTML = `
    <a class="small muted" href="#/program/${week}">‹ Semaine ${week}</a>
    <div class="eyebrow" style="margin-top:10px">${fmtDate(date)} · ${s.phase.name}</div>
    <h1>${s.name}</h1>
    <div class="row wrap" style="margin:8px 0 14px">
      <span class="pill">≈ ${s.minutes} min</span><span class="pill">${s.exercises.length} exercices</span>
      ${locked ? '<span class="pill ok">✓ Séance enregistrée</span>' : ''}
    </div>
    ${s.adjust ? `<div class="card" style="border-color:${s.adjust.level === 'basse' ? 'var(--danger)' : 'rgba(255,179,71,.5)'}"><h3>${s.adjust.level === 'basse' ? '🔋 Séance allégée' : '🔋 Séance modérée'}</h3><p class="small muted" style="margin:6px 0 0">${esc(s.adjust.text)}</p></div>` : ''}
    ${s.technique ? `<div class="card" style="border-color:rgba(255,179,71,.35)"><div class="row between"><h3>⚡ Technique de la semaine : ${s.technique.name}</h3></div><p class="small muted" style="margin:6px 0 0">${s.technique.detail}</p></div>` : ''}
    <div class="card"><h3>Échauffement · 8 min</h3><ul class="clean small muted" style="margin-top:8px">${s.warmup.map((w) => `<li>${esc(w)}</li>`).join('')}</ul></div>
    ${s.exercises.map((e, i) => exerciseCard(e, i, exData(e.slot), locked)).join('')}
    ${s.cardio ? `<div class="card" style="border-color:rgba(124,196,255,.35)"><h3>♥ Finisher cardio : ${s.cardio.name}</h3><p class="small muted" style="margin:6px 0 0">${s.cardio.detail}</p></div>` : ''}
    <div class="card"><h3>Retour au calme · 5 min</h3><p class="small muted" style="margin:6px 0 0">Étirements légers des muscles travaillés, respiration lente. Bois de l’eau et prends un repas avec ${Math.round(p.weight * 0.4)} g de protéines dans les 2 h.</p></div>
    ${locked ? `<button class="btn ghost block" id="reopen">Modifier la séance</button>`
      : `<div class="sticky-actions"><button class="btn primary block" id="finish">Terminer la séance</button></div>`}`;

  if (locked) {
    $app.querySelector('#reopen').onclick = () => {
      state.history = state.history.filter((h) => h !== data);
      state.deleted = [...(state.deleted || []), data.date];
      state.drafts[key] = { exercises: Object.fromEntries(data.exercises.map((x) => [x.slot, { id: x.id, sets: x.sets }])) };
      save(); route();
    };
    return;
  }

  $app.querySelectorAll('.set input').forEach((inp) => {
    inp.addEventListener('input', () => {
      const { slot, set, field } = inp.dataset;
      data.exercises[slot].sets[set][field] = inp.value === '' ? '' : parseFloat(inp.value.replace(',', '.'));
      save();
    });
  });
  $app.querySelectorAll('.set .check').forEach((btn) => {
    btn.onclick = () => {
      const { slot, set } = btn.dataset;
      const ex = s.exercises.find((x) => x.slot === +slot);
      const st = data.exercises[slot].sets[set];
      // Pas de valeur inventée : une série validée sans reps notées ferait croire au moteur
      // que le haut de la fourchette est atteint, et la charge monterait à tort.
      if (!st.done && !(st.r > 0)) {
        const inp = btn.closest('.set').querySelector('[data-field=r]');
        inp.classList.add('need'); inp.focus();
        inp.addEventListener('input', () => inp.classList.remove('need'), { once: true });
        return;
      }
      st.done = !st.done;
      btn.closest('.set').classList.toggle('done', st.done);
      save();
      if (st.done) startTimer(ex.rest, ex.name);
    };
  });
  $app.querySelectorAll('[data-swap]').forEach((btn) => {
    btn.onclick = () => {
      const slot = +btn.dataset.swap;
      const ex = s.exercises.find((x) => x.slot === slot);
      const used = new Set(s.exercises.map((x) => x.id));
      const pool = poolFor(ex.pattern, p, ex.role);
      const start = pool.findIndex((x) => x.id === ex.id);
      let next = pool[(start + 1) % pool.length];
      for (let k = 1; k <= pool.length; k++) {
        const c = pool[(start + k) % pool.length];
        if (!used.has(c.id)) { next = c; break; }
      }
      p.swaps = p.swaps || {};
      p.swaps[`${week}|${dayIndex}|${slot}`] = next.id;
      delete data.exercises[slot];
      touchProfile(); save(); route();
    };
  });
  $app.querySelector('#finish').onclick = () => {
    const exercises = s.exercises.map((e) => ({
      slot: e.slot, id: e.id, name: e.name,
      sets: data.exercises[e.slot].sets.map((x) => ({ w: +x.w || 0, r: +x.r || 0, done: !!x.done })),
    }));
    const doneSets = exercises.reduce((n, e) => n + e.sets.filter((x) => x.done).length, 0);
    if (!doneSets && !confirm('Aucune série cochée. Enregistrer quand même ?')) return;
    state.history.push({ week, dayIndex, name: s.name, date: new Date().toISOString(), exercises });
    delete state.drafts[key];
    stopTimer(); save();
    location.hash = '#/today';
  };
}

function exerciseCard(e, i, d, locked) {
  const range = e.repsMin === e.repsMax ? `${e.repsMin}` : `${e.repsMin}–${e.repsMax}`;
  const unit = e.timed ? 's' : 'reps';
  const sets = d ? d.sets : [];
  return `<div class="card ex ${e.role === 'main' ? 'main' : ''}">
    <div class="ex-head">
      <div class="row" style="align-items:flex-start"><div class="ex-num">${i + 1}</div>
        <div><h3>${esc(e.name)}</h3><div class="small muted">${ROLE[e.role]} · ${PATTERN_LABEL[e.pattern]}</div></div></div>
      ${!locked && e.poolSize > 1 ? `<button class="btn ghost sm" data-swap="${e.slot}" title="Remplacer par un exercice équivalent">⇄ Variante</button>` : ''}
    </div>
    <div class="ex-meta">
      <span class="pill accent">${e.sets} × ${range} ${unit}</span>
      <span class="pill">RIR ${e.rir}</span>
      <span class="pill">Repos ${e.rest >= 120 ? (e.rest / 60).toString().replace('.', ',') + ' min' : e.rest + ' s'}</span>
      ${e.load ? `<span class="pill">${e.assisted ? 'Assistance ' : ''}${kg(e.load)}${e.unit === 'halteres' ? ' / haltère' : ''}</span>` : ''}
    </div>
    ${mediaBlock(e)}
    <div class="ex-cue">${esc(e.cue)}${e.loadNote ? `<br><span style="color:var(--text)">${esc(e.loadNote)}</span>` : ''}</div>
    <div class="sets">
      <div class="set-head"><span>#</span><span>kg</span><span>${unit}</span><span></span></div>
      ${sets.map((st, k) => `<div class="set ${st.done ? 'done' : ''}">
        <span class="n">${k + 1}</span>
        <input type="number" inputmode="decimal" step="0.5" placeholder="${e.load ?? '—'}" value="${st.w ?? ''}" data-slot="${e.slot}" data-set="${k}" data-field="w" ${locked ? 'disabled' : ''} aria-label="Charge série ${k + 1}">
        <input type="number" inputmode="numeric" placeholder="${range}" value="${st.r ?? ''}" data-slot="${e.slot}" data-set="${k}" data-field="r" ${locked ? 'disabled' : ''} aria-label="Répétitions série ${k + 1}">
        <button class="check" data-slot="${e.slot}" data-set="${k}" ${locked ? 'disabled' : ''} aria-label="Valider la série">✓</button>
      </div>`).join('')}
    </div>
  </div>`;
}

// Photos départ / arrivée en fondu alterné : on voit le mouvement et la machine.
function mediaBlock(e) {
  const ph = photos(e.id);
  const video = `<a class="btn ghost sm" href="${videoUrl(e.name)}" target="_blank" rel="noopener">▶ Vidéo</a>`;
  if (!ph) return `<div class="ex-media-actions">${video}</div>`;
  return `<figure class="ex-media" data-media>
      <img src="${ph.start}" alt="${esc(e.name)}, position de départ" loading="lazy" decoding="async">
      <img src="${ph.end}" alt="${esc(e.name)}, position d’arrivée" loading="lazy" decoding="async" class="end">
      <figcaption><span class="lbl">Départ ⇄ arrivée</span>${video}</figcaption>
    </figure>${ph.note ? `<p class="small muted" style="margin:6px 0 0">${esc(ph.note)}</p>` : ''}`;
}
// Toucher la photo met l'animation en pause sur la position affichée.
document.addEventListener('click', (ev) => {
  const fig = ev.target.closest('[data-media]');
  if (fig && !ev.target.closest('a')) fig.classList.toggle('paused');
});

// ---------- Minuteur de repos ----------
const $timer = document.getElementById('timer');
let timerId = null;

// Son de fin de repos. Les bips sont programmés dans le moteur audio dès le départ du minuteur
// (au moment du toucher, seul moment où iPhone autorise le son), puis annulés si on passe ou ajoute 30 s.
// Limite : écran verrouillé ou appli en arrière-plan = pas de son. D'où le maintien de l'écran allumé.
const SOUND_KEY = 'forge.sound';
const soundOn = () => { try { return localStorage.getItem(SOUND_KEY) !== 'off'; } catch { return true; } };
let audioCtx = null;
let scheduled = [];
function audio() {
  try {
    // « transient » : son court qui baisse la musique en cours au lieu de la couper (Safari récent).
    if (navigator.audioSession) navigator.audioSession.type = 'transient';
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  } catch { return null; }
}
function beep(ctx, at, freq, dur) {
  const osc = ctx.createOscillator(); const gain = ctx.createGain();
  osc.type = 'sine'; osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(0.6, at + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(at); osc.stop(at + dur + 0.05);
  scheduled.push(osc);
}
function scheduleEndSound(seconds) {
  cancelSound();
  if (!soundOn()) return;
  const ctx = audio(); if (!ctx) return;
  const end = ctx.currentTime + seconds;
  // 3 tops courts avant la fin, puis 3 bips aigus : « c'est reparti ».
  for (const s of [3, 2, 1]) if (seconds > s) beep(ctx, end - s, 660, 0.12);
  for (const s of [0, 0.25, 0.5]) beep(ctx, end + s, 1040, 0.2);
}
function cancelSound() {
  for (const o of scheduled) { try { o.stop(0); o.disconnect(); } catch { /* déjà terminé */ } }
  scheduled = [];
}
// Garde l'écran allumé pendant le repos, sinon le téléphone se met en veille et le son ne part pas.
let wakeLock = null;
async function keepAwake(on) {
  try {
    if (on && !wakeLock && navigator.wakeLock) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    } else if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
  } catch { /* non pris en charge ou refusé */ }
}

function startTimer(seconds, label) {
  stopTimer();
  let left = seconds;
  const end = Date.now() + seconds * 1000;
  $timer.hidden = false;
  scheduleEndSound(seconds);
  keepAwake(true);
  const paint = () => {
    const m = Math.floor(left / 60); const sec = String(left % 60).padStart(2, '0');
    $timer.innerHTML = `<div class="t">${m}:${sec}</div><div class="grow small"><b>Repos</b><div class="muted">${esc(label)}</div></div>
      <button class="btn sm ghost" id="tsound" aria-label="${soundOn() ? 'Couper le son' : 'Activer le son'}">${soundOn() ? '🔔' : '🔕'}</button>
      <button class="btn sm ghost" id="tplus">+30 s</button><button class="btn sm primary" id="tskip">Passer</button>`;
    $timer.querySelector('#tplus').onclick = () => { startTimer(left + 30, label); };
    $timer.querySelector('#tskip').onclick = stopTimer;
    $timer.querySelector('#tsound').onclick = () => {
      try { localStorage.setItem(SOUND_KEY, soundOn() ? 'off' : 'on'); } catch { /* rien */ }
      scheduleEndSound(left); paint();
    };
  };
  paint();
  timerId = setInterval(() => {
    left = Math.max(0, Math.round((end - Date.now()) / 1000));
    if (left <= 0) {
      clearInterval(timerId); timerId = null;
      if (navigator.vibrate) navigator.vibrate([300, 100, 300, 100, 300]);
      // Le bandeau reste 2 s en « C'est reparti » pour ceux qui ont coupé le son.
      $timer.innerHTML = '<div class="t">0:00</div><div class="grow"><b>C’est reparti 💪</b><div class="small muted">Série suivante</div></div>';
      $timer.classList.add('go');
      setTimeout(() => { if (!timerId) stopTimer(); }, 2500);
      return;
    }
    paint();
  }, 1000);
}
function stopTimer() {
  clearInterval(timerId); timerId = null; $timer.hidden = true; $timer.classList.remove('go');
  cancelSound(); keepAwake(false);
}

// ---------- Progrès ----------
function renderProgress() {
  const p = state.profile;
  const week = currentWeek(p);
  const total = state.history.length;
  const tonnage = state.history.reduce((t, h) => t + h.exercises.reduce((a, e) => a + e.sets.filter((s) => s.done).reduce((b, s) => b + s.w * s.r, 0), 0), 0);
  // Régularité : semaines consécutives (jusqu'à la semaine en cours) avec au moins une séance.
  let streak = 0;
  for (let w = week; w >= 1; w--) {
    if (state.history.some((h) => h.week === w)) streak++;
    else if (w !== week) break;
  }
  const records = {};
  for (const h of state.history) for (const e of h.exercises) for (const s of e.sets) {
    if (!s.done || !s.w || !s.r) continue;
    const v = e1rm(s.w, s.r);
    if (!records[e.id] || v > records[e.id].v) records[e.id] = { v, w: s.w, r: s.r, name: e.name };
  }
  const top = Object.values(records).sort((a, b) => b.v - a.v).slice(0, 8);
  const m = bodyMetrics(p, state.health);

  $app.innerHTML = `
    <div class="eyebrow">Progrès</div><h1>Ton évolution</h1>
    <div class="grid3" style="margin:14px 0">
      <div class="stat"><b>${total}</b><span>séances</span></div>
      <div class="stat"><b>${streak}</b><span>sem. d’affilée</span></div>
      <div class="stat"><b>${(tonnage / 1000).toFixed(1).replace('.', ',')} t</b><span>soulevées</span></div>
    </div>
    <h2>Poids de corps</h2>
    <div class="card">
      ${weightChart()}
      <form id="wform" class="row" style="margin-top:12px">
        <input type="number" name="kg" step="0.1" inputmode="decimal" placeholder="Poids du jour (kg)" required style="flex:1">
        <button class="btn primary">Ajouter</button>
      </form>
      <p class="small muted" style="margin:10px 0 0">IMC actuel ${m.bmi.toFixed(1).replace('.', ',')} · ${m.bmiLabel}. Pèse-toi le matin à jeun, 1 à 2 fois par semaine.</p>
    </div>
    <h2>Records estimés (1RM)</h2>
    <div class="card">${top.length ? top.map((r) => `<div class="row between tip"><span>${esc(r.name)}</span><span><b>${Math.round(r.v)} kg</b> <span class="muted small">(${r.w} × ${r.r})</span></span></div>`).join('')
      : '<p class="muted small" style="margin:0">Tes records apparaîtront après tes premières séances enregistrées.</p>'}</div>
    <h2>Historique</h2>
    ${state.history.slice().reverse().slice(0, 12).map((h) => `<a class="card row between" href="#/session/${h.week}/${h.dayIndex}">
      <div><h3>${esc(h.name)}</h3><div class="small muted">${new Date(h.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} · semaine ${h.week} · ${h.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0)} séries</div></div><span class="chev">›</span></a>`).join('')
      || '<p class="muted small">Aucune séance enregistrée pour l’instant.</p>'}`;

  $app.querySelector('#wform').onsubmit = (e) => {
    e.preventDefault();
    const v = parseFloat(e.target.kg.value.replace(',', '.'));
    if (!(v > 30 && v < 300)) return;
    state.weights.push({ date: new Date().toISOString(), kg: v });
    state.profile.weight = v; // le bilan nutritionnel et les charges de départ suivent le poids
    touchProfile(); save(); route();
  };
}

function weightChart() {
  const pts = state.weights.slice(-20);
  if (pts.length < 2) return `<p class="muted small" style="margin:0">Ajoute au moins deux pesées pour voir la courbe. Dernière : <b>${kg(pts.at(-1)?.kg)}</b>.</p>`;
  const W = 320; const H = 150; const pad = 24;
  const vals = pts.map((x) => x.kg); const min = Math.min(...vals) - 1; const max = Math.max(...vals) + 1;
  const x = (i) => pad + (i * (W - pad * 2)) / (pts.length - 1);
  const y = (v) => H - pad - ((v - min) / (max - min)) * (H - pad * 2);
  const d = pts.map((pt, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(pt.kg).toFixed(1)}`).join(' ');
  const diff = vals.at(-1) - vals[0];
  return `<div class="row between small"><span class="muted">${pts.length} pesées</span><b>${kg(vals.at(-1))} <span class="muted">(${diff >= 0 ? '+' : ''}${diff.toFixed(1).replace('.', ',')})</span></b></div>
    <svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Courbe du poids">
      <line class="grid" x1="${pad}" x2="${W - pad}" y1="${y(max - 1)}" y2="${y(max - 1)}"/><line class="grid" x1="${pad}" x2="${W - pad}" y1="${y(min + 1)}" y2="${y(min + 1)}"/>
      <text x="2" y="${y(max - 1) + 3}">${Math.round(max - 1)}</text><text x="2" y="${y(min + 1) + 3}">${Math.round(min + 1)}</text>
      <path class="line" d="${d}"/>${pts.map((pt, i) => `<circle class="dot" cx="${x(i)}" cy="${y(pt.kg)}" r="3"/>`).join('')}
    </svg>`;
}

// ---------- Profil ----------
function renderProfile() {
  const p = state.profile;
  if (location.hash === '#/profile/edit') return renderOnboarding(p);
  const m = bodyMetrics(p, state.health);
  $app.innerHTML = `
    <div class="eyebrow">Profil</div><h1>${esc(p.name) || 'Mon profil'}</h1>
    <div class="card">
      <div class="grid2">
        <div class="stat"><b>${p.weight} kg</b><span>poids</span></div>
        <div class="stat"><b>${p.height} cm</b><span>taille</span></div>
        <div class="stat"><b>${GOALS[p.goal][0]}</b><span>objectif</span></div>
        <div class="stat"><b>${LEVELS[p.level][0]}</b><span>niveau</span></div>
      </div>
      <p class="small muted" style="margin:12px 0">${p.days.length} séances : ${p.days.map((d) => DAY_NAMES[d]).join(', ')} · ${p.duration} min · ${splitFor(p.days.length).name}</p>
      <a class="btn ghost block" href="#/profile/edit">Modifier mes infos</a>
    </div>
    <h2>Bilan énergétique</h2>
    <div class="card">
      <div class="tip">Métabolisme de base : <b>${m.bmr} kcal</b></div>
      <div class="tip">Dépense totale estimée : <b>${m.tdee} kcal</b></div>
      <div class="tip">Cible pour ton objectif : <b>${m.kcal} kcal</b></div>
      <div class="tip">Répartition : <b>${m.protein} g</b> protéines · <b>${m.carbs} g</b> glucides · <b>${m.fat} g</b> lipides</div>
      <p class="small muted" style="margin:8px 0 0">Estimations (formule de Mifflin-St Jeor). Ajuste de 150 kcal si ton poids ne suit pas l’objectif après 2 semaines.</p>
    </div>
    <h2>Compte et sauvegarde</h2>
    ${accountCard()}
    <h2>Apple Santé</h2>
    <a class="card row between" href="#/sante"><div><h3>❤ Montre et Apple Santé</h3><div class="small muted">${state.health.length ? `Dernières données reçues le ${new Date(state.health.at(-1).day).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}` : 'Relie ton bracelet via l’app Raccourcis'}</div></div><span class="chev">›</span></a>
    <h2>Données</h2>
    <div class="card">
      <p class="small muted">${Sync.getStatus().connected ? 'Effacer ne touche que ce téléphone : tes données restent dans ton compte.' : 'Sans compte, tout est enregistré uniquement sur ce téléphone.'}</p>
      <div class="row"><button class="btn ghost" id="export" style="flex:1">Exporter</button><button class="btn danger" id="reset" style="flex:1">Effacer ce téléphone</button></div>
    </div>
    <p class="small muted center">Photos des exercices : Free Exercise DB (domaine public).</p>
    <p class="small muted center">Forge ne remplace pas un avis médical. En cas de douleur ou de pathologie, consulte un professionnel.</p>`;
  $app.querySelector('#reset').onclick = async () => {
    if (!confirm('Effacer le profil, l’historique et les pesées de ce téléphone ?')) return;
    await Sync.signOut().catch(() => {});
    try { localStorage.removeItem(KEY); } catch { /* rien */ }
    Object.assign(state, { profile: null, history: [], weights: [], drafts: {}, deleted: [], health: [], healthToken: null });
    location.hash = ''; route();
  };
  bindAccount();
  $app.querySelector('#export').onclick = () => {
    // Le code Apple Santé est un secret : il ne part pas dans un fichier qu'on peut partager.
    const { healthToken, ...exported } = state;
    const blob = new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'forge-sauvegarde.json'; a.click();
  };
}

// ---------- Apple Santé ----------
// Une pesée reçue de la balance (via Apple Santé) alimente la courbe et le profil, sans saisie.
function applyHealthWeight() {
  const row = [...state.health].reverse().find((r) => r.weight);
  if (!row || !state.profile) return;
  if (state.weights.some((w) => w.date.slice(0, 10) === row.day)) return;
  const kgv = Math.round(Number(row.weight) * 10) / 10;
  state.weights.push({ date: `${row.day}T06:00:00.000Z`, kg: kgv });
  state.weights.sort((a, b) => a.date.localeCompare(b.date));
  if (state.weights.at(-1).kg === kgv) { state.profile.weight = kgv; touchProfile(); }
  save();
}

function formeCard() {
  if (!Sync.getStatus().connected) return '';
  if (!state.health.length) {
    return `<a class="card row between" href="#/sante" style="border-color:rgba(248,113,113,.35)"><div><h3>❤ Relie ta montre</h3><div class="small muted">Forge adaptera tes séances à ton sommeil et à ta récupération.</div></div><span class="chev">›</span></a>`;
  }
  const r = readiness(state.health);
  const refresh = `<a class="btn ghost sm" href="${shortcutUrl}">↻ Mettre à jour</a>`;
  if (!r) {
    return `<div class="card"><div class="row between"><h3>❤ Forme du jour</h3>${refresh}</div><p class="small muted" style="margin:8px 0 0">Pas encore de données aujourd’hui. Le raccourci les envoie chaque matin ; touche « Mettre à jour » pour l’envoyer maintenant.</p></div>`;
  }
  const L = r.last;
  const pill = { bonne: '<span class="pill ok">Bonne forme</span>', moyenne: '<span class="pill warn">Forme moyenne</span>', basse: '<span class="pill" style="color:var(--danger);border-color:rgba(248,113,113,.4)">Récupération basse</span>' }[r.level] || '';
  const msg = r.level === 'bonne' ? 'Feu vert : séance complète, vise le haut de tes fourchettes.'
    : r.level === 'moyenne' ? 'Séance maintenue, avec un peu plus de marge sur les exercices principaux.'
      : r.level === 'basse' ? 'Séance du jour allégée automatiquement. Dors tôt ce soir.'
        : 'Ajoute le bracelet (sommeil, cœur) pour obtenir ta note de forme.';
  const stat = (v, label) => `<div class="stat"><b>${v}</b><span>${label}</span></div>`;
  return `<div class="card">
    <div class="row between"><h3>❤ Forme du jour</h3>${pill || refresh}</div>
    <div class="grid2" style="margin:10px 0">
      ${stat(L.sleep_min ? fmtH(L.sleep_min) : '—', 'sommeil')}
      ${stat(L.resting_hr ? `${Math.round(L.resting_hr)} bpm` : '—', 'cœur au repos')}
      ${stat(L.hrv ? `${Math.round(L.hrv)} ms` : '—', 'variabilité (VFC)')}
      ${stat(L.steps ? L.steps.toLocaleString('fr-FR') : '—', 'pas (24 h)')}
    </div>
    <p class="small muted" style="margin:0">${esc(msg)}${r.reasons.length ? ` <span style="color:var(--text)">${esc(r.reasons.join(', '))}.</span>` : ''}</p>
    ${pill ? `<div style="margin-top:10px">${refresh}</div>` : ''}
  </div>`;
}

function renderHealthGuide() {
  const st = Sync.getStatus();
  const endpoint = `${SUPABASE_URL}/rest/v1/rpc/import_health`;
  const copyRow = (label, value, id) => `<div style="margin:8px 0"><div class="small muted">${label}</div>
    <div class="row"><code id="${id}" style="flex:1;min-width:0;overflow-wrap:anywhere;background:var(--surface-2);border-radius:10px;padding:8px 10px;font-size:12px">${esc(value)}</code>
    <button class="btn ghost sm" data-copy="${id}">Copier</button></div></div>`;
  const step = (n, title, body) => `<div class="card"><div class="row" style="align-items:flex-start"><div class="ex-num">${n}</div><div style="min-width:0;flex:1"><h3>${title}</h3><div class="small muted" style="margin-top:6px">${body}</div></div></div></div>`;
  const find = (type, how) => `<b>Rechercher des échantillons de santé</b> : type <b>${type}</b>, filtre <i>Date de début</i> · <i>dans les derniers</i> · <b>1 jour</b>${how}`;

  $app.innerHTML = `<a class="small muted" href="#/profile">‹ Profil</a>
    <div class="eyebrow" style="margin-top:10px">Apple Santé</div><h1>Relier ta montre à Forge</h1>
    <p class="muted small">Chaque matin, un raccourci de ton iPhone lit Apple Santé (où Mi Fitness envoie les données du bracelet) et les transmet à Forge. Configuration unique, environ 10 minutes.</p>
    ${!st.connected ? '<div class="card"><p class="small" style="margin:0">Connecte-toi d’abord à ton compte Forge (Profil › Compte et sauvegarde).</p></div>' : `
    ${step(1, 'Ton code Forge', `Ce code relie le raccourci à ton compte. Garde-le pour toi.
      <div id="tokbox" style="margin-top:8px">${state.healthToken ? copyRow('Code Forge', state.healthToken, 'tok') : '<button class="btn primary sm" id="mktoken">Générer mon code</button>'}</div>`)}
    ${step(2, 'Prépare Mi Fitness', 'Dans Mi Fitness : <b>Profil › Données tierces › Santé</b>, active le partage. Puis dans l’app <b>Santé</b> de l’iPhone : <b>Profil › Apps › Mi Fitness</b>, autorise tout. (Sans bracelet, l’iPhone envoie déjà pas et calories.)')}
    ${step(3, 'Crée le raccourci « Forge Santé »', `Ouvre l’app <b>Raccourcis</b> › <b>+</b> › nomme-le <b>Forge Santé</b>. Ajoute ces actions dans l’ordre (cherche-les par leur nom) :
      <ol style="padding-left:18px;margin:8px 0 0">
        <li>${find('Pas', '')}, puis <b>Calculer des statistiques</b> : <b>Somme</b>, puis <b>Définir la variable</b> <b>Pas</b>.</li>
        <li>${find('Énergie active', '')}, puis <b>Calculer des statistiques</b> : <b>Somme</b>, puis <b>Définir la variable</b> <b>Calories</b>.</li>
        <li>${find('Fréquence cardiaque au repos', ', trier par <i>Date de début</i>, <i>le plus récent d’abord</i>, limite <b>1</b>')}, puis <b>Obtenir les détails des échantillons de santé</b> : <b>Valeur</b>, puis <b>Définir la variable</b> <b>Coeur</b>.</li>
        <li>Même chose avec le type <b>Variabilité de la fréquence cardiaque</b> › variable <b>VFC</b>.</li>
        <li>${find('Analyse du sommeil', ', ajoute le filtre <i>Valeur</i> · <i>n’est pas</i> · <b>Au lit</b>, et un autre <i>n’est pas</i> · <b>Éveillé</b>')}, puis <b>Obtenir les détails des échantillons de santé</b> : <b>Durée</b>, puis <b>Calculer des statistiques</b> : <b>Somme</b>, puis <b>Définir la variable</b> <b>Sommeil</b>.</li>
        <li>Même chose qu’au 3 avec le type <b>Poids</b> (masse corporelle) › variable <b>Poids</b>.</li>
        <li><b>Obtenir le contenu de l’URL</b> avec l’adresse ci-dessous. Touche <i>Afficher plus</i> : méthode <b>POST</b> ; en-têtes <b>apikey</b> (valeur ci-dessous) et <b>Content-Type</b> = <b>application/json</b> ; corps de la requête <b>JSON</b> avec ces champs de type <i>Texte</i> : <b>p_token</b> = ton code Forge, <b>p_steps</b> = Pas, <b>p_active_kcal</b> = Calories, <b>p_resting_hr</b> = Coeur, <b>p_hrv</b> = VFC, <b>p_sleep</b> = Sommeil, <b>p_weight</b> = Poids.</li>
        <li><b>Afficher le résultat</b> (pour le premier essai : il doit afficher « OK »).</li>
      </ol>
      ${copyRow('Adresse (URL)', endpoint, 'url')}
      ${copyRow('Valeur de l’en-tête apikey', SUPABASE_KEY, 'key')}
      <p style="margin:8px 0 0">Avant d’avoir le bracelet, les blocs 3 à 5 ne trouvent rien : c’est normal, Forge ignore les valeurs vides.</p>`)}
    ${step(4, 'Teste-le', `Lance le raccourci une fois : l’iPhone demande l’accès à Santé, accepte tout. Il doit afficher « OK ».
      <div style="margin-top:8px"><a class="btn primary sm" href="${shortcutUrl}">▶ Lancer Forge Santé</a></div>`)}
    ${step(5, 'Automatise-le chaque matin', 'Raccourcis › <b>Automatisation</b> › <b>+</b> › <b>Heure de la journée</b> : <b>7:00</b>, chaque jour › choisis <b>Exécuter immédiatement</b> › raccourci <b>Forge Santé</b>. Supprime ensuite l’action « Afficher le résultat » pour qu’il tourne en silence.')}
    ${step(6, 'C’est en place', `Ouvre Forge : la carte <b>Forme du jour</b> apparaît sur l’accueil. ${state.health.length ? `Dernières données reçues le <b>${new Date(state.health.at(-1).day).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</b>.` : 'Aucune donnée reçue pour l’instant.'}`)}`}`;

  $app.querySelector('#mktoken')?.addEventListener('click', async (e) => {
    e.target.disabled = true;
    try {
      state.healthToken = await Sync.createHealthToken(); saveLocal(); renderHealthGuide();
    } catch (err) { e.target.disabled = false; alert(err.message); }
  });
  $app.querySelectorAll('[data-copy]').forEach((b) => b.addEventListener('click', async () => {
    const text = $app.querySelector('#' + b.dataset.copy).textContent;
    try { await navigator.clipboard.writeText(text); b.textContent = 'Copié ✓'; } catch { b.textContent = 'Sélectionne le texte'; }
    setTimeout(() => { b.textContent = 'Copier'; }, 2000);
  }));
}

// ---------- Compte ----------
let restoring = false;
function renderRestoring(title = 'Récupération de ton programme…') {
  restoring = true;
  $tab.hidden = true;
  $app.innerHTML = `<div class="center" style="padding-top:30vh">
    <div class="eyebrow">Forge</div><h1>${esc(title)}</h1>
    <p class="muted small">Connexion à ton compte.</p></div>`;
}

const INPUT_STYLE = 'width:100%;background:var(--surface-2);border:1px solid var(--line);color:var(--text);border-radius:12px;padding:12px;font:inherit';
// Champ mot de passe avec bouton Afficher : sur téléphone, une faute de frappe invisible bloque le compte.
const passwordField = (label, name, autocomplete) => `<label class="field"><span>${label}</span>
  <div class="row"><input type="password" name="${name}" autocomplete="${autocomplete}" required style="${INPUT_STYLE};flex:1">
  <button type="button" class="btn ghost sm" data-reveal="${name}">Afficher</button></div></label>`;
function bindReveal(root) {
  root.querySelectorAll('[data-reveal]').forEach((b) => b.addEventListener('click', () => {
    const inp = root.querySelector(`input[name="${b.dataset.reveal}"]`);
    const show = inp.type === 'password';
    inp.type = show ? 'text' : 'password';
    b.textContent = show ? 'Masquer' : 'Afficher';
  }));
}
function passwordProblem(pw) {
  if (pw.length < Sync.MIN_PASSWORD) return `Mot de passe trop court : ${Sync.MIN_PASSWORD} caractères minimum.`;
  if (!/[a-zA-Z]/.test(pw) || !/[0-9]/.test(pw)) return 'Mélange au moins des lettres et des chiffres.';
  return null;
}

function accountCard() {
  const st = Sync.getStatus();
  if (!st.configured) return '<div class="card"><p class="small muted" style="margin:0">La sauvegarde en ligne n’est pas encore activée.</p></div>';
  if (st.connected) {
    const when = st.lastSync ? `Dernière sauvegarde : ${st.lastSync.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : 'Synchronisation…';
    return `<div class="card">
      <div class="row between"><div><h3>☁ ${esc(st.email)}</h3><div class="small muted">${st.pending ? 'Envoi en attente…' : when}</div></div><span class="pill ok">Connecté</span></div>
      ${st.error ? `<p class="small" style="color:var(--warn);margin:10px 0 0">${esc(st.error)}</p>` : ''}
      <p class="small muted" style="margin:10px 0">Profil, séances, charges et pesées sont sauvegardés dans ton compte. Sur un nouveau téléphone, connecte-toi pour tout retrouver.</p>
      <div class="row"><button class="btn ghost" id="syncnow" style="flex:1">Synchroniser</button><button class="btn ghost" id="logout" style="flex:1">Se déconnecter</button></div>
    </div>`;
  }
  return `<div class="card">${authForm('Crée ton compte pour sauvegarder ton programme et le retrouver sur n’importe quel téléphone.')}</div>`;
}

function authForm(intro) {
  return `<p class="small muted">${intro}</p>
    <form id="auth">
      <label class="field"><span>Email</span><input type="email" name="email" autocomplete="email" required style="${INPUT_STYLE}"></label>
      ${passwordField('Mot de passe', 'password', 'current-password')}
      <p class="small muted" style="margin:-4px 0 6px">Nouveau compte : ${Sync.MIN_PASSWORD} caractères minimum, lettres et chiffres.</p>
      <p class="small" id="authmsg" style="min-height:1em"></p>
      <div class="row"><button class="btn primary" data-act="signin" style="flex:1">Se connecter</button><button class="btn ghost" data-act="signup" style="flex:1">Créer mon compte</button></div>
      <p class="small center" style="margin-top:12px"><a href="#" id="forgot" class="muted">Mot de passe oublié ?</a></p>
    </form>`;
}

function bindAccount(after) {
  $app.querySelector('#syncnow')?.addEventListener('click', () => Sync.syncNow());
  $app.querySelector('#logout')?.addEventListener('click', async () => { await Sync.signOut(); route(); });
  const form = $app.querySelector('#auth'); if (!form) return;
  const msg = form.querySelector('#authmsg');
  const say = (t, ok) => { msg.textContent = t; msg.style.color = ok ? 'var(--ok)' : 'var(--warn)'; };
  bindReveal(form);
  if (authLinkError) { say(authLinkError); authLinkError = null; }
  let act = 'signin';
  form.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => { act = b.dataset.act; }));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = form.email.value.trim(); const pw = form.password.value;
    // La règle de longueur ne s'applique qu'à la création : les comptes existants gardent leur mot de passe.
    if (act === 'signup' && passwordProblem(pw)) return say(passwordProblem(pw));
    form.querySelectorAll('button').forEach((b) => { b.disabled = true; });
    try {
      if (act === 'signup') {
        const r = await Sync.signUp(email, pw);
        if (r.needsConfirmation) { say('Compte créé. Ouvre l’email de confirmation, clique sur le lien, puis reviens te connecter ici.', true); return; }
      } else {
        await Sync.signIn(email, pw);
      }
      if (after) after(); else route();
    } catch (err) { say(err.message); } finally { form.querySelectorAll('button').forEach((b) => { b.disabled = false; }); }
  });
  form.querySelector('#forgot').addEventListener('click', async (e) => {
    e.preventDefault();
    const email = form.email.value.trim();
    if (!email) return say('Saisis d’abord ton email.');
    try { await Sync.resetPassword(email); say('Email envoyé : suis le lien pour choisir un nouveau mot de passe.', true); } catch (err) { say(err.message); }
  });
}

function renderLogin() {
  $tab.hidden = true;
  if (Sync.getStatus().connected) { location.hash = '#/today'; return; }
  $app.innerHTML = `<a class="small muted" href="#/">‹ Retour</a>
    <div class="eyebrow" style="margin-top:10px">Forge</div><h1>Retrouver mon programme</h1>
    <div class="card" style="margin-top:14px">${authForm('Connecte-toi avec le compte créé sur ton autre téléphone ou avant une réinstallation.')}</div>`;
  bindAccount(() => { location.hash = state.profile ? '#/today' : '#/'; route(); });
}

function renderNewPassword() {
  $tab.hidden = true;
  const st = Sync.getStatus();
  if (!st.settled) return renderRestoring('Vérification du lien…');
  if (!st.connected) {
    $app.innerHTML = `<div class="eyebrow">Compte</div><h1>Nouveau mot de passe</h1>
      <div class="card" style="margin-top:14px"><p class="small" style="margin:0 0 12px">Ce lien a expiré ou a déjà servi. Redemande un email depuis l’écran de connexion (« Mot de passe oublié ? »).</p>
      <a class="btn primary block" href="#/login">Aller à la connexion</a></div>`;
    return;
  }
  $app.innerHTML = `<div class="eyebrow">Compte · ${esc(st.email)}</div><h1>Nouveau mot de passe</h1>
    <form id="np" class="card" style="margin-top:14px">
      ${passwordField('Nouveau mot de passe', 'pw', 'new-password')}
      ${passwordField('Confirme-le', 'pw2', 'new-password')}
      <p class="small muted" style="margin:-4px 0 6px">${Sync.MIN_PASSWORD} caractères minimum, lettres et chiffres.</p>
      <p class="small" id="npmsg" style="min-height:1em;color:var(--warn)"></p><button class="btn primary block">Enregistrer</button></form>`;
  const form = $app.querySelector('#np');
  const msg = form.querySelector('#npmsg');
  bindReveal(form);
  form.onsubmit = async (e) => {
    e.preventDefault();
    const pw = form.pw.value;
    if (pw !== form.pw2.value) { msg.textContent = 'Les deux mots de passe ne sont pas identiques.'; return; }
    if (passwordProblem(pw)) { msg.textContent = passwordProblem(pw); return; }
    const btn = form.querySelector('.btn.primary'); btn.disabled = true;
    try {
      await Sync.updatePassword(pw);
      $app.innerHTML = `<div class="eyebrow">Compte</div><h1>Mot de passe changé ✓</h1>
        <div class="card" style="margin-top:14px"><p class="small" style="margin:0 0 12px">Utilise-le désormais pour te connecter sur tes autres téléphones.</p>
        <a class="btn primary block" href="#/today">Continuer</a></div>`;
    } catch (err) { msg.textContent = err.message; btn.disabled = false; }
  };
}

route();
// Demande à l'iPhone de ne pas effacer les données de l'appli pour libérer de la place.
try { navigator.storage?.persist?.(); } catch { /* non pris en charge */ }

// Le compte se branche après le premier affichage : l'appli reste utilisable hors ligne.
Sync.init({
  get: () => state,
  set: (merged) => { Object.assign(state, merged); saveLocal(); },
  setHealth: (rows) => { state.health = rows; applyHealthWeight(); saveLocal(); },
  // Retour du lien « mot de passe oublié » : on ouvre directement l'écran du nouveau mot de passe.
  recovery: () => { recoveryPending = false; restoring = false; location.hash = '#/password'; },
  changed: () => {
    if (recoveryPending && Sync.getStatus().connected) { recoveryPending = false; restoring = false; location.hash = '#/password'; return; }
    if (restoring) { restoring = false; route(); return; }
    const [, page = 'today', sub] = location.hash.split('/');
    // On ne redessine jamais un écran en cours de saisie (questionnaire, séance, connexion, champ actif).
    if (!state.profile || ['session', 'login', 'password'].includes(page) || sub === 'edit') return;
    if (document.activeElement && document.activeElement.matches('input')) return;
    route();
  },
});
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
