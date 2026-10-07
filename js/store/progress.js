// ---------------------------------------------------------------------------
// progress.js — everything the app remembers.
//
// All data lives in ONE localStorage entry on this device ("jah.v1").
// Nothing is ever sent anywhere. Clearing it (Settings → Reset progress)
// returns the app to a fresh install.
//
// createStore(storage) takes any object with getItem / setItem / removeItem,
// which lets the unit tests run it without a browser.
// ---------------------------------------------------------------------------
import { CATEGORIES } from '../content/categories.js';

export const STORAGE_KEY = 'jah.v1';
const SKILLS = ['identify', 'lets', 'equations', 'algebra', 'check', 'final'];

export const ACHIEVEMENTS = [
  { id: 'first-bucket', name: 'First Bucket', desc: 'Solve your first complete problem.', test: s => s.completed >= 1 },
  { id: 'playmaker', name: 'Playmaker', desc: 'Write 10 correct Let statements.', test: s => s.letsOk >= 10, progress: s => [s.letsOk, 10] },
  { id: 'translator', name: 'Translator', desc: 'Build 10 equations correctly.', test: s => s.eqsOk >= 10, progress: s => [s.eqsOk, 10] },
  { id: 'no-look', name: 'No-Look Pass', desc: 'Solve a complete problem without hints.', test: s => s.noHint >= 1 },
  { id: 'double-double', name: 'Double-Double', desc: 'Solve 10 problems in each of two categories.', test: s => Object.values(s.cats).filter(c => c.done >= 10).length >= 2, progress: s => [Object.values(s.cats).filter(c => c.done >= 10).length, 2] },
  { id: 'clutch', name: 'Clutch', desc: 'Score 85 or better on five Game Mode problems.', test: s => s.gameClean >= 5, progress: s => [s.gameClean, 5] },
  { id: 'full-court', name: 'Full Court', desc: 'Solve a problem in every category.', test: s => CATEGORIES.every(c => (s.cats[c.id]?.done || 0) >= 1), progress: s => [CATEGORIES.filter(c => (s.cats[c.id]?.done || 0) >= 1).length, CATEGORIES.length] },
  { id: 'homework', name: 'Homework Hero', desc: 'Finish all nine worksheet problems.', test: s => Object.keys(s.worksheet).length >= 9, progress: s => [Object.keys(s.worksheet).length, 9] },
  { id: 'lab-rat', name: 'Film Room', desc: 'Get 25 Translation Lab reps right first try.', test: s => Object.values(s.lab).reduce((a, v) => a + v[0], 0) >= 25, progress: s => [Object.values(s.lab).reduce((a, v) => a + v[0], 0), 25] },
];

const freshStats = () => ({
  attempted: 0, completed: 0, days: {},
  skills: Object.fromEntries(SKILLS.map(k => [k, [0, 0]])),
  tags: {}, cats: {}, modes: { learn: 0, practice: 0, game: 0 },
  hintsTotal: 0, hintProblems: 0, mistakes: {}, lab: {},
  letsOk: 0, eqsOk: 0, noHint: 0, gameClean: 0, worksheet: {},
});
const fresh = () => ({
  v: 1, name: 'Jaan', onboarded: false,
  settings: { eli: 10, theme: 'auto', letLevel: 'auto' },
  stats: freshStats(), achievements: {}, history: [], session: null,
});

export const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function createStore(storage, now = () => new Date()) {
  let state = fresh();
  let memoryOnly = false;

  function load() {
    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        const base = fresh();
        state = { ...base, ...saved, settings: { ...base.settings, ...saved.settings }, stats: { ...base.stats, ...saved.stats, skills: { ...base.stats.skills, ...(saved.stats || {}).skills } } };
      }
    } catch { memoryOnly = true; }
    return api;
  }
  function save() {
    if (memoryOnly) return;
    try { storage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { memoryOnly = true; }
  }
  const touchDay = () => { state.stats.days[dayKey(now())] = (state.stats.days[dayKey(now())] || 0) + 1; };
  const bump = (pair, ok) => { pair[1] += 1; if (ok) pair[0] += 1; };

  function award() {
    const earned = [];
    ACHIEVEMENTS.forEach(a => {
      if (!state.achievements[a.id] && a.test(state.stats)) { state.achievements[a.id] = dayKey(now()); earned.push(a); }
    });
    return earned;
  }

  const api = {
    load, save,
    get state() { return state; },
    get stats() { return state.stats; },
    get settings() { return state.settings; },
    get name() { return state.name; },
    get memoryOnly() { return memoryOnly; },

    setSetting(key, value) { state.settings[key] = value; save(); },
    setName(n) { state.name = (n || '').trim().slice(0, 20) || 'Jaan'; save(); },
    setOnboarded() { state.onboarded = true; save(); },

    getSession() { return state.session; },
    setSession(s) { state.session = s; save(); },
    clearSession() { state.session = null; save(); },

    markAttempt(cat) {
      state.stats.attempted += 1;
      const c = (state.stats.cats[cat] ||= { attempted: 0, done: 0, scores: [] });
      c.attempted += 1;
      touchDay(); save();
    },
    logMistake(code) {
      if (!code || code === 'syntax') return;
      state.stats.mistakes[code] = (state.stats.mistakes[code] || 0) + 1;
      save();
    },
    /** One Translation Lab rep. */
    recordLab(skill, firstTry) {
      bump((state.stats.lab[skill] ||= [0, 0]), firstTry);
      touchDay();
      const earned = award(); save();
      return earned;
    },
    /**
     * A finished problem (or a finished Let-statement warm-up).
     * items: [{ part, first:boolean, pts:0..1, tag? }]
     */
    recordProblem(r) {
      const S = state.stats;
      r.items.forEach(it => {
        bump(S.skills[it.part], it.first);
        if (it.tag) bump((S.tags[it.tag] ||= [0, 0]), it.first);
        if (it.part === 'lets' && it.first) S.letsOk += 1;
        if (it.part === 'equations' && it.pts >= 0.5) S.eqsOk += 1;
      });
      touchDay();
      if (r.scope === 'full') {
        S.completed += 1;
        S.modes[r.mode] = (S.modes[r.mode] || 0) + 1;
        const c = (S.cats[r.cat] ||= { attempted: 0, done: 0, scores: [] });
        c.done += 1;
        c.scores = [...c.scores, r.total].slice(-5);
        S.hintsTotal += r.hints; S.hintProblems += 1;
        if (r.hints === 0 && r.assists === 0) S.noHint += 1;
        if (r.mode === 'game' && r.total >= 85) S.gameClean += 1;
        if (r.spec.ws) S.worksheet[r.spec.ws] = true;
        state.history = [{ spec: r.spec, map: r.map, strategy: r.strategy, total: r.total, mode: r.mode, date: now().toISOString(), title: r.title, hints: r.hints, final: r.final }, ...state.history].slice(0, 30);
      }
      const earned = award(); save();
      return earned;
    },

    /** Days in a row with any practice, counting back from today (or yesterday). */
    streak() {
      const days = state.stats.days;
      const d = now();
      if (!days[dayKey(d)]) d.setDate(d.getDate() - 1);
      let n = 0;
      while (days[dayKey(d)]) { n += 1; d.setDate(d.getDate() - 1); }
      return n;
    },
    lastActive() {
      const keys = Object.keys(state.stats.days).sort();
      return keys.length ? keys[keys.length - 1] : null;
    },
    /** Equation-building + lab reps, first-try percentage. */
    translationAccuracy() {
      const [a, n] = state.stats.skills.equations;
      const lab = Object.values(state.stats.lab).reduce((acc, v) => [acc[0] + v[0], acc[1] + v[1]], [0, 0]);
      const tot = n + lab[1];
      return tot ? Math.round((100 * (a + lab[0])) / tot) : null;
    },
    /** Which Let-statement level should Jaan be on? 1 = choose … 4 = write it himself. */
    letLevel(mode, tutorial = false) {
      if (tutorial) return 1;
      if (mode === 'game') return 4;
      const pref = state.settings.letLevel;
      const k = state.stats.letsOk;
      const auto = k < 2 ? 1 : k < 5 ? 2 : k < 9 ? 3 : 4;
      const lvl = pref === 'auto' ? auto : Number(pref);
      return mode === 'practice' ? Math.max(2, lvl) : lvl;
    },
    reset() {
      const keep = { name: state.name, settings: state.settings };
      state = { ...fresh(), ...keep, onboarded: true };
      try { storage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
      save();
    },
    wipe() { state = fresh(); try { storage.removeItem(STORAGE_KEY); } catch { /* ignore */ } },
  };
  return api;
}

/** In-memory storage, used when localStorage is unavailable and in tests. */
export function memoryStorage() {
  const m = new Map();
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) };
}

let singleton = null;
export function store() {
  if (!singleton) {
    let storage;
    try { storage = window.localStorage; storage.getItem(STORAGE_KEY); } catch { storage = memoryStorage(); }
    singleton = createStore(storage).load();
  }
  return singleton;
}
