// ---------------------------------------------------------------------------
// screens.js — every screen except the problem flow and the Translation Lab:
// Home, Train, Playbook, Progress, Coach (parent view), Settings, Welcome and
// the "Show My Teacher" page.
// Each screen is an object: { render(arg) -> html, actions: {name(el){...}} }
// ---------------------------------------------------------------------------
import { store, ACHIEVEMENTS } from '../store/progress.js';
import { CATEGORIES, TAGS, buildProblem, generate, categoryById } from '../content/categories.js';
import { WORKSHEET, worksheetSpec, tutorialSpec } from '../content/worksheet.js';
import { PLAYBOOK, articleById } from '../content/playbook.js';
import { insights, masteryOf, accuracy, SKILL_LABELS, MISTAKES, ROUTINE } from '../content/teaching.js';
import { esc, rich, icon, bar, ballSVG, courtSVG, confirmDialog, coach } from './dom.js';
import { startProblem, hasLiveSession, describeSession } from './problem.js';
import { solutionBlocks, paperHTML } from './paper.js';
import { diagram } from './diagrams.js';
import { buildPlan } from '../core/solver.js';
import { inst } from '../core/math.js';

export const APP_VERSION = '1.1.0';
const MODES = {
  learn: ['Learn', 'Coaching at every step. Start here.'],
  practice: ['Practice', 'You drive. Hints when you ask.'],
  game: ['Game', 'No hints. Typed answers. Scored on the whole process.'],
};
const mode = () => store().settings.mode || 'learn';
const pageHead = (title, sub = '', right = '') => `<header class="pagehead"><div><h1>${esc(title)}</h1>${sub ? `<p>${esc(sub)}</p>` : ''}</div>${right}</header>`;
const niceDate = iso => { try { return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); } catch { return ''; } };

/** What should "Continue training" open? */
function recommend() {
  const st = store(), S = st.stats;
  if (hasLiveSession()) return { resume: true, label: `Resume: ${describeSession()}` };
  if (!st.state.onboarded) return { spec: tutorialSpec(st.name), mode: 'learn', label: 'Start with the tutorial play' };
  const nextWs = WORKSHEET.find(w => !S.worksheet[w.n]);
  if (nextWs) return { spec: worksheetSpec(nextWs.n), mode: S.worksheet[1] ? mode() : 'learn', label: `Worksheet #${nextWs.n} · ${categoryById(nextWs.cat).name}` };
  const ranked = CATEGORIES.map(c => ({ c, m: masteryOf(S, c.id), n: S.cats[c.id]?.done || 0 })).sort((a, b) => a.m - b.m || a.n - b.n);
  return { spec: generate(ranked[0].c.id, Date.now()), mode: mode() === 'learn' ? 'practice' : mode(), label: `New problem · ${ranked[0].c.name}` };
}
function weakestCat() {
  const S = store().stats;
  return CATEGORIES.map(c => ({ c, m: masteryOf(S, c.id), n: S.cats[c.id]?.done || 0 })).sort((a, b) => a.m - b.m || a.n - b.n)[0].c.id;
}

// ---- HOME -------------------------------------------------------------------------
export const homeView = {
  render() {
    const st = store(), S = st.stats, name = st.name;
    const streak = st.streak(), acc = st.translationAccuracy(), rec = recommend(), ins = insights(S, name);
    const stat = (n, l) => `<div class="stat"><span class="stat-n">${n}</span><span class="stat-l">${l}</span></div>`;
    const drill = (a, title, sub, tag) => `<button type="button" class="workout" data-a="${a}">
        <span class="workout-tag">${tag}</span><span class="workout-t">${title}</span><span class="workout-s">${sub}</span>${icon.next}</button>`;
    return `<div class="page home">
      <header class="hero">${courtSVG}
        <div class="hero-top">
          <div class="brand">${ballSVG(26)}<span>${esc(name)}’s Algebra Hoops</span></div>
          <nav class="hero-links" aria-label="More">
            <a class="iconbtn" href="#/coach" aria-label="Parent and coach view">${icon.coach}</a>
            <a class="iconbtn" href="#/settings" aria-label="Settings">${icon.gear}</a>
          </nav>
        </div>
        <p class="hey">${S.completed ? 'Welcome back' : 'Hey'}, ${esc(name)} 👋</p>
        <h1 class="hero-h">Ready to run<br>some plays?</h1>
        <div class="stats3">
          ${stat(streak ? streak : '–', streak === 1 ? 'day streak' : 'day streak')}
          ${stat(S.completed, 'problems solved')}
          ${stat(acc === null ? '–' : acc + '<small>%</small>', 'translation accuracy')}
        </div>
        <button type="button" class="btn primary big wide" data-a="continue">${rec.resume ? 'Continue training' : S.completed ? 'Continue training' : 'Start training'} ${icon.next}</button>
        <p class="hero-sub">${esc(rec.label)}</p>
      </header>

      <section class="block">
        <h2 class="block-h">Today’s workout</h2>
        <div class="workouts">
          ${drill('warmup', 'Warm-up', 'Identify the unknowns and write the Let statements', '01')}
          ${drill('lab', 'Translation drill', 'Turn words into equations, eight quick reps', '02')}
          ${drill('game-sit', 'Game situation', 'Solve a complete word problem', '03')}
          ${drill('free', 'Free practice', 'Choose a problem type', '04')}
        </div>
      </section>

      <section class="block">
        <h2 class="block-h">Scouting report</h2>
        ${coach(esc(ins.headline))}
      </section>
      <p class="tagline">Read the play. Build the equation. Solve the game.</p>
    </div>`;
  },
  actions: {
    continue() { const r = recommend(); if (r.resume) location.hash = '#/play'; else startProblem({ spec: r.spec, mode: r.mode }); return false; },
    warmup() { startProblem({ spec: generate(weakestCat(), Date.now()), mode: mode() === 'game' ? 'practice' : mode(), scope: 'let' }); return false; },
    lab() { location.hash = '#/lab/drill'; return false; },
    'game-sit'() { const r = recommend(); if (r.resume) location.hash = '#/play'; else startProblem({ spec: r.spec, mode: r.mode }); return false; },
    free() { location.hash = '#/train'; return false; },
  },
};

// ---- TRAIN ------------------------------------------------------------------------
export const trainView = {
  render() {
    const st = store(), S = st.stats, m = mode();
    const wsTitle = w => { try { return buildProblem(worksheetSpec(w.n)).title; } catch { return ''; } };
    return `<div class="page">
      ${pageHead('Train', 'Pick how much help you want, then pick a play.')}
      <div class="seg seg-wide" role="group" aria-label="Training mode">
        ${Object.entries(MODES).map(([k, [n]]) => `<button type="button" data-a="mode" data-v="${k}" aria-pressed="${m === k}">${n}</button>`).join('')}
      </div>
      <p class="modehint">${MODES[m][1]}</p>
      ${hasLiveSession() ? `<a class="resume card" href="#/play"><span><span class="eyebrow">In progress</span>${esc(describeSession())}</span>${icon.next}</a>` : ''}

      <section class="block">
        <h2 class="block-h">Class worksheet</h2>
        <div class="list">
          ${WORKSHEET.map(w => `<button type="button" class="rowbtn" data-a="ws" data-v="${w.n}">
              <span class="rownum${S.worksheet[w.n] ? ' done' : ''}">${S.worksheet[w.n] ? icon.check : w.n}</span>
              <span class="rowmain"><strong>${esc(wsTitle(w))}</strong><small>${categoryById(w.cat).icon} ${esc(categoryById(w.cat).name)}</small></span>${icon.next}</button>`).join('')}
        </div>
      </section>

      <section class="block">
        <h2 class="block-h">Free practice</h2>
        <p class="fine">A new problem every time, with different numbers and wording.</p>
        <div class="cats">
          ${CATEGORIES.map(c => { const ms = masteryOf(S, c.id), n = S.cats[c.id]?.done || 0; return `<button type="button" class="cat" data-a="cat" data-v="${c.id}">
              <span class="cat-ic" aria-hidden="true">${c.icon}</span><span class="cat-n">${esc(c.name)}</span><span class="cat-b">${esc(c.blurb)}</span>
              ${bar(ms, c.name + ' mastery')}<span class="cat-m">${n ? `${ms}% · ${n} solved` : 'Not tried yet'}</span></button>`; }).join('')}
        </div>
      </section>
      <button type="button" class="btn ghost wide" data-a="tutorial">Replay the tutorial play</button>
    </div>`;
  },
  actions: {
    mode(el) { store().setSetting('mode', el.dataset.v); },
    ws(el) { startProblem({ spec: worksheetSpec(Number(el.dataset.v)), mode: mode() }); return false; },
    cat(el) { startProblem({ spec: generate(el.dataset.v, Date.now()), mode: mode() }); return false; },
    tutorial() { startProblem({ spec: tutorialSpec(store().name), mode: 'learn' }); return false; },
  },
};

// ---- PLAYBOOK ---------------------------------------------------------------------
function paperLines(lines) {
  return `<div class="paper">${lines.map(l => (l === '' ? '<div class="pp-gap"></div>' : `<div class="pp-text">${rich(l)}</div>`)).join('')}</div>`;
}
export const playbookView = {
  render(id) {
    const eli = store().settings.eli;
    if (!id) {
      return `<div class="page">${pageHead('Playbook', 'Short reference pages for the moves you use most.')}
        <div class="list">${PLAYBOOK.map(a => `<a class="rowbtn" href="#/playbook/${a.id}"><span class="rownum plain" aria-hidden="true">${a.icon}</span>
          <span class="rowmain"><strong>${esc(a.title)}</strong><small>${esc(a.blurb)}</small></span>${icon.next}</a>`).join('')}</div></div>`;
    }
    const a = articleById(id);
    if (!a) return `<div class="page"><p class="empty">That page does not exist.</p><a class="btn" href="#/playbook">Back to the Playbook</a></div>`;
    return `<div class="page article">
      <a class="backlink" href="#/playbook">${icon.back} Playbook</a>
      ${pageHead(a.title, a.blurb, eliSeg(eli))}
      ${a.sections.map(s => `<section class="block"><h2 class="block-h">${esc(s.h)}</h2>
        ${s.body ? `<p>${rich(typeof s.body === 'string' ? s.body : s.body[eli])}</p>` : ''}
        ${s.list ? `<ul class="ticks">${s.list.map(i => `<li>${rich(i)}</li>`).join('')}</ul>` : ''}
        ${s.paper ? paperLines(s.paper) : ''}
        ${s.compare ? `<div class="compare">${s.compare.map(([bad, good]) => `<div class="cmp"><span class="cmp-bad">${esc(bad)}</span><span class="cmp-good">${esc(good)}</span></div>`).join('')}</div>` : ''}
      </section>`).join('')}
      ${a.link ? `<a class="btn ghost wide" href="${a.link[0]}">${esc(a.link[1])}</a>` : ''}
    </div>`;
  },
  actions: { eli(el) { store().setSetting('eli', Number(el.dataset.v)); } },
};
export const eliSeg = eli => `<div class="seg seg-eli" role="group" aria-label="Explanation level"><span class="seg-lab" aria-hidden="true">ELI</span>
  ${[5, 10, 15].map(v => `<button type="button" data-a="eli" data-v="${v}" aria-pressed="${eli === v}" aria-label="Explain like I am ${v}">${v}</button>`).join('')}</div>`;

// ---- PROGRESS ---------------------------------------------------------------------
const pctText = pair => { const a = accuracy(pair); return a === null ? '–' : a + '%'; };
function skillRows(S) {
  return Object.keys(SKILL_LABELS).map(k => { const a = accuracy(S.skills[k]); return `<div class="box-row"><span>${SKILL_LABELS[k]}</span>${bar(a ?? 0, SKILL_LABELS[k])}<span class="box-n">${a === null ? '–' : a + '%'}</span></div>`; }).join('');
}
function catRows(S) {
  return CATEGORIES.map(c => { const m = masteryOf(S, c.id), n = S.cats[c.id]?.done || 0; return `<div class="box-row"><span>${c.icon} ${esc(c.name)}</span>${bar(m, c.name)}<span class="box-n">${n ? m + '%' : '–'}</span></div>`; }).join('');
}
function historyList(limit = 8) {
  const h = store().state.history.slice(0, limit);
  if (!h.length) return '<p class="empty">Solved problems will be listed here, each with its paper-ready solution.</p>';
  return `<div class="list">${h.map((x, i) => `<a class="rowbtn" href="#/teacher/${i}"><span class="rownum plain">${x.total}</span>
    <span class="rowmain"><strong>${esc(x.title)}</strong><small>${niceDate(x.date)} · ${esc(x.mode)} · ${x.hints} hint${x.hints === 1 ? '' : 's'}</small></span>${icon.paper}</a>`).join('')}</div>`;
}
export const progressView = {
  render() {
    const st = store(), S = st.stats, ins = insights(S, st.name), acc = st.translationAccuracy();
    const avgH = S.hintProblems ? (S.hintsTotal / S.hintProblems).toFixed(1) : '–';
    const stat = (n, l) => `<div class="stat"><span class="stat-n">${n}</span><span class="stat-l">${l}</span></div>`;
    return `<div class="page">
      ${pageHead('Progress', 'Stored on this device only.', `<a class="iconbtn" href="#/coach" aria-label="Parent and coach view">${icon.coach}</a>`)}
      <div class="stats4">${stat(S.attempted, 'attempted')}${stat(S.completed, 'completed')}${stat(st.streak() || '–', 'day streak')}${stat(avgH, 'avg hints')}</div>
      ${coach(esc(ins.headline))}
      <section class="block"><h2 class="block-h">The routine, first-try accuracy</h2>
        <div class="boxscore card">${skillRows(S)}<p class="fine">Translation accuracy overall: <strong>${acc === null ? '–' : acc + '%'}</strong> (equations and Translation Lab reps).</p></div></section>
      <section class="block"><h2 class="block-h">Mastery by category</h2><div class="boxscore card">${catRows(S)}<p class="fine">Average process score over your last five problems in each category.</p></div></section>
      <section class="block"><h2 class="block-h">Achievements</h2>
        <div class="badges">${ACHIEVEMENTS.map(a => { const got = st.state.achievements[a.id]; const pr = !got && a.progress ? a.progress(S) : null; return `<div class="badge${got ? ' got' : ''}"><span class="badge-ic" aria-hidden="true">${got ? '🏀' : icon.lock}</span><div><strong>${esc(a.name)}</strong><span>${esc(a.desc)}</span>${pr ? `<span class="badge-p">${Math.min(pr[0], pr[1])} / ${pr[1]}</span>` : ''}</div></div>`; }).join('')}</div></section>
      <section class="block"><h2 class="block-h">Recent problems</h2>${historyList()}</section>
    </div>`;
  },
  actions: {},
};

// ---- COACH (parent view) ------------------------------------------------------------
export const coachView = {
  render() {
    const st = store(), S = st.stats, name = st.name, ins = insights(S, name);
    const last7 = [...Array(7)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; return { d, on: !!S.days[k] }; });
    const mistakes = Object.entries(S.mistakes).filter(([k]) => MISTAKES[k]).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const tags = Object.entries(S.tags).filter(([, v]) => v[1] > 0);
    const labN = Object.values(S.lab).reduce((a, v) => a + v[1], 0);
    const avgH = S.hintProblems ? (S.hintsTotal / S.hintProblems).toFixed(1) : '–';
    return `<div class="page">
      <a class="backlink" href="#/home">${icon.back} Home</a>
      ${pageHead('Parent / Coach view', `How ${name} is doing, and what to work on next.`)}
      <p class="privacy">${icon.lock} Everything here is stored only on this device. Nothing is collected or sent anywhere.</p>

      <section class="block"><h2 class="block-h">This week</h2>
        <div class="week" role="img" aria-label="Practice days in the last week">${last7.map(x => `<span class="day${x.on ? ' on' : ''}"><i></i>${x.d.toLocaleDateString(undefined, { weekday: 'narrow' })}</span>`).join('')}</div>
        <div class="kv card">
          <div><span>Problems started</span><strong>${S.attempted}</strong></div>
          <div><span>Problems completed</span><strong>${S.completed}</strong></div>
          <div><span>Learn / Practice / Game</span><strong>${S.modes.learn || 0} / ${S.modes.practice || 0} / ${S.modes.game || 0}</strong></div>
          <div><span>Translation Lab reps</span><strong>${labN}</strong></div>
          <div><span>Average hints per problem</span><strong>${avgH}</strong></div>
          <div><span>Solved with no hints</span><strong>${S.noHint}</strong></div>
        </div></section>

      <section class="block"><h2 class="block-h">Summary</h2>${coach(esc(ins.headline))}
        <div class="kv card">
          <div><span>Strongest category</span><strong>${esc(ins.strongCat || '–')}</strong></div>
          <div><span>Needs the most work</span><strong>${esc(ins.weakCat || '–')}</strong></div>
        </div></section>

      <section class="block"><h2 class="block-h">Skills (correct on the first try)</h2>
        <div class="kv card">
          <div><span>Translation accuracy</span><strong>${st.translationAccuracy() === null ? '–' : st.translationAccuracy() + '%'}</strong></div>
          <div><span>Reading &amp; finding unknowns</span><strong>${pctText(S.skills.identify)}</strong></div>
          <div><span>Let statements</span><strong>${pctText(S.skills.lets)}</strong></div>
          <div><span>Equation building</span><strong>${pctText(S.skills.equations)}</strong></div>
          <div><span>Algebra</span><strong>${pctText(S.skills.algebra)}</strong></div>
          <div><span>Checking</span><strong>${pctText(S.skills.check)}</strong></div>
          <div><span>Concluding statement</span><strong>${pctText(S.skills.final)}</strong></div>
        </div></section>

      <section class="block"><h2 class="block-h">By category</h2><div class="boxscore card">${catRows(S)}</div></section>

      ${tags.length ? `<section class="block"><h2 class="block-h">Which sentences are hardest to translate</h2><div class="kv card">${tags.map(([k, v]) => `<div><span>${esc(TAGS[k] || k)}</span><strong>${pctText(v)} <small>of ${v[1]}</small></strong></div>`).join('')}</div></section>` : ''}

      <section class="block"><h2 class="block-h">Mistakes that keep coming up</h2>
        ${mistakes.length ? `<div class="kv card">${mistakes.map(([k, n]) => `<div><span>${esc(MISTAKES[k][0])}</span><strong>${n}×</strong></div>`).join('')}</div>` : '<p class="empty">No repeated mistakes logged yet.</p>'}</section>

      <section class="block"><h2 class="block-h">What to do next</h2><ul class="ticks">${ins.recs.map(r => `<li>${esc(r)}</li>`).join('')}</ul></section>

      <section class="block"><h2 class="block-h">What ${esc(name)} practised</h2>${historyList(15)}</section>
    </div>`;
  },
  actions: {},
};

// ---- SETTINGS ---------------------------------------------------------------------
export const settingsView = {
  render() {
    const st = store(), s = st.settings;
    const seg = (key, opts, cur) => `<div class="seg seg-wide" role="group">${opts.map(([v, l]) => `<button type="button" data-a="set" data-k="${key}" data-v="${v}" aria-pressed="${String(cur) === String(v)}">${l}</button>`).join('')}</div>`;
    return `<div class="page">
      <a class="backlink" href="#/home">${icon.back} Home</a>
      ${pageHead('Settings')}
      ${st.memoryOnly ? coach('This browser is blocking storage (private browsing?). The app works, but progress will not be saved after you close it.', 'try') : ''}
      <section class="block"><h2 class="block-h">Player name</h2>
        <label class="field"><span class="fine">Shown in the app. Stored only on this device.</span>
        <input class="inp" type="text" maxlength="20" data-bind="name" value="${esc(st.name)}" autocomplete="off" aria-label="Player name"></label></section>
      <section class="block"><h2 class="block-h">Explanation level</h2>
        <p class="fine">ELI5 is the most concrete. ELI15 is how a teacher would write it. You can change it at any time, even mid-problem.</p>
        ${seg('eli', [[5, 'ELI5'], [10, 'ELI10'], [15, 'ELI15']], s.eli)}</section>
      <section class="block"><h2 class="block-h">Let statement level</h2>
        <p class="fine">Auto moves from choosing, to building, to filling blanks, to writing them out as accuracy improves.</p>
        ${seg('letLevel', [['auto', 'Auto'], [1, 'Choose'], [2, 'Build'], [3, 'Blank'], [4, 'Write']], s.letLevel)}</section>
      <section class="block"><h2 class="block-h">Appearance</h2>${seg('theme', [['auto', 'Match device'], ['light', 'Light'], ['dark', 'Dark']], s.theme)}</section>
      <section class="block"><h2 class="block-h">Add to Home Screen (iPhone)</h2>
        <ol class="steps"><li>Open this page in Safari.</li><li>Tap the Share button.</li><li>Tap “Add to Home Screen”.</li><li>Tap Add, then open the app from its icon.</li></ol></section>
      <section class="block"><h2 class="block-h">Data</h2>
        <p class="fine">Progress is saved in this browser on this device. There is no account, no tracking, and nothing is uploaded. Clearing Safari’s website data also clears it.</p>
        <div class="col"><button type="button" class="btn ghost wide" data-a="tutorial">Replay the tutorial</button>
        <button type="button" class="btn danger wide" data-a="reset">Reset progress</button></div></section>
      <p class="fine center">Version ${APP_VERSION} · works offline after the first visit</p>
    </div>`;
  },
  input(el) { if (el.dataset.bind === 'name') store().setName(el.value); },
  actions: {
    set(el) { const k = el.dataset.k, v = el.dataset.v; store().setSetting(k, k === 'eli' ? Number(v) : v); applyTheme(); },
    tutorial() { startProblem({ spec: tutorialSpec(store().name), mode: 'learn' }); return false; },
    async reset() {
      const ok = await confirmDialog({ title: 'Reset all progress?', body: 'This clears every stat, streak, achievement and saved problem on this device. It cannot be undone.', ok: 'Reset progress', danger: true });
      if (ok) { store().reset(); location.hash = '#/home'; }
      return ok ? undefined : false;
    },
  },
};
export function applyTheme() {
  const t = store().settings.theme;
  if (t === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', t);
  const dark = t === 'dark' || (t === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0c0d10' : '#f5f1e8');
}

// ---- WELCOME (first run) --------------------------------------------------------------
let slide = 0;
export const welcomeView = {
  nav: false,
  render() {
    const name = store().name;
    const slides = [
      `<div class="wl-ball">${ballSVG(96)}</div><p class="eyebrow">Welcome to</p><h1 class="hero-h">${esc(name)}’s<br>Algebra Hoops</h1><p class="lead">Read the play. Build the equation. Solve the game.</p>`,
      `<p class="eyebrow">The idea</p><h1 class="hero-h small">Word problems are plays.</h1>
       <p class="lead">Word problems are not really about reading a giant paragraph.</p><p class="lead">They are about finding the mathematical plays hidden inside it.</p>
       <p class="lead">You already know how to solve the equations. This app trains the part before that: turning the story into the equations.</p>`,
      `<p class="eyebrow">One routine</p><h1 class="hero-h small">Six words to remember.</h1>
       <ol class="wl-routine">${['Read', 'Let', 'Translate', 'Solve', 'Check', 'Answer'].map((w, i) => `<li><span>${i + 1}</span>${w}</li>`).join('')}</ol>
       <p class="lead">Same order, every problem. Let’s run one easy play together.</p>`,
    ];
    const last = slide === slides.length - 1;
    return `<div class="welcome">${courtSVG}<div class="wl-body fresh">${slides[slide]}</div>
      <div class="wl-foot"><div class="dots" aria-hidden="true">${slides.map((_, i) => `<i class="${i === slide ? 'on' : ''}"></i>`).join('')}</div>
        <button type="button" class="btn primary big wide" data-a="${last ? 'go' : 'more'}">${last ? 'Run the tutorial play' : 'Next'} ${icon.next}</button>
        <button type="button" class="linkbtn" data-a="skip">Skip the tutorial</button></div></div>`;
  },
  actions: {
    more() { slide += 1; },
    go() { slide = 0; startProblem({ spec: tutorialSpec(store().name), mode: 'learn' }); return false; },
    skip() { slide = 0; store().setOnboarded(); location.hash = '#/home'; return false; },
  },
};

// ---- SHOW MY TEACHER ---------------------------------------------------------------------
let teacherTab = 'paper';
export const teacherView = {
  nav: false,
  render(arg) {
    const h = store().state.history[Number(arg) || 0];
    if (!h) return `<div class="page"><p class="empty">Solve a problem first, then its paper-ready solution appears here.</p><a class="btn primary" href="#/train">Pick a problem</a></div>`;
    const prob = buildProblem(h.spec), eli = store().settings.eli;
    const map = h.map || { p: 'x', q: 'y' }, strat = h.strategy || prob.strategy.best;
    const notes = teacherTab === 'notes';
    const blocks = solutionBlocks(prob, map, strat, { notes, eli, final: h.final });
    const solved = buildPlan(prob.eqs.map(e => inst(e.tpl, map)), strat).sol;
    const picture = diagram(prob, { map, eqs: [true, true], sol: { p: solved[map.p], q: solved[map.q] } });
    return `<div class="page teacher">
      <a class="backlink noprint" href="#/progress">${icon.back} Progress</a>
      ${pageHead('Show my teacher', h.title, `<button type="button" class="iconbtn noprint" data-a="print" aria-label="Print this solution">${icon.print}</button>`)}
      <div class="seg seg-wide noprint" role="group" aria-label="View">
        <button type="button" data-a="tab" data-v="paper" aria-pressed="${!notes}">What I’d write on my paper</button>
        <button type="button" data-a="tab" data-v="notes" aria-pressed="${notes}">Learning explanation</button>
      </div>
      <p class="fine noprint">${notes ? 'The same solution with the reasoning added in the shaded notes. The notes are for understanding. They do not go on your paper.' : 'Only the work a teacher expects to see. Copy it line by line.'}</p>
      ${notes ? `<div class="noprint right">${eliSeg(eli)}</div>` : ''}
      <article class="paper sheet${notes ? ' with-notes' : ''}">
        <p class="pp-problem">${esc(prob.text)}</p>
        ${notes ? `<div class="pp-picture">${picture}</div>` : ''}
        ${paperHTML(blocks, map)}
      </article>
      <div class="col noprint"><a class="btn primary wide" href="#/train">Another problem</a><a class="btn ghost wide" href="#/home">Home</a></div>
    </div>`;
  },
  actions: {
    tab(el) { teacherTab = el.dataset.v; },
    eli(el) { store().setSetting('eli', Number(el.dataset.v)); },
    print() { window.print(); return false; },
  },
};

export { ROUTINE };
