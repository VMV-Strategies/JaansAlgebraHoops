// ---------------------------------------------------------------------------
// lab.js — the Translation Lab: short reps that turn English into algebra,
// plus the phrase reference list.
// ---------------------------------------------------------------------------
import { store } from '../store/progress.js';
import { PHRASES, SKILLS, makeDrill, tilesFor } from '../content/phrases.js';
import { generate } from '../content/categories.js';
import { parseExpr, sameExpr } from '../core/math.js';
import { diagnoseEquation } from '../core/check.js';
import { syntaxMessage } from '../core/solver.js';
import { accuracy } from '../content/teaching.js';
import { esc, rich, xy, icon, coach, feedback, bar, toast } from './dom.js';
import { eqInput, pushTok, popTok, tokSrc, keyToTok } from './eqinput.js';
import { startProblem } from './problem.js';

let D = null; // the drill in progress (kept in memory only; drills are short)

function newDrill(skill = null) {
  D = { skill, items: makeDrill(Date.now(), { skill, n: 8 }), i: 0, tok: [], wrong: 0, hint: 0, fb: null, done: false, tried: [], right: 0, fresh: true };
}

/** Judge a built answer. Exported for the unit tests. */
export function judge(item, src) {
  if (item.mode === 'eq') {
    return diagnoseEquation(src, { target: item.target, traps: item.traps, lets: { x: item.lets[0][1], y: item.lets[1]?.[1] || '' }, nudge: item.hint });
  }
  if (src.includes('=')) return { ok: false, code: 'expr-eq', msg: 'This phrase is an expression, not an equation. It has no “is” or “equals”, so it needs no equals sign.' };
  try {
    const e = parseExpr(src);
    if (sameExpr(e, parseExpr(item.target))) return { ok: true };
    for (const t of item.traps) { try { if (sameExpr(e, parseExpr(t.src))) return { ok: false, code: 'trap', msg: t.msg }; } catch { /* skip */ } }
    return { ok: false, code: 'structure', msg: item.hint };
  } catch (err) { return { ok: false, code: 'syntax', msg: syntaxMessage(err).replace('An equation needs an equals sign. What is equal to what?', 'Build the expression from the pieces.') }; }
}

function resolve(ok, revealed = false) {
  const item = D.items[D.i];
  const first = ok && D.wrong === 0 && D.hint < 2 && !revealed;
  if (first) D.right += 1;
  const earned = store().recordLab(item.skill, first);
  earned.forEach(a => toast(`🏀 <strong>${esc(a.name)}</strong> ${esc(a.desc)}`));
  D.done = true;
  D.fb = { tone: revealed ? 'show' : 'good', html: (revealed ? `The answer is ${item.type === 'mc' ? `“${esc(item.choices[item.correct])}”` : xy(item.target)}. ` : '') + esc(item.why), flash: true };
}

const fbHtml = () => { const h = feedback(D.fb); if (D.fb) D.fb.flash = false; return h; };

export const labView = {
  render() {
    const S = store().stats;
    return `<div class="page">
      <header class="pagehead"><div><h1>Translation Lab</h1><p>Words in, algebra out. This is the skill that unlocks word problems.</p></div></header>
      <button type="button" class="btn primary big wide" data-a="drill">Start a mixed drill ${icon.next}</button>
      <p class="fine center">Eight quick reps, about three minutes.</p>

      <section class="block"><h2 class="block-h">Drill one skill</h2>
        <div class="list">${Object.entries(SKILLS).map(([k, name]) => { const a = accuracy(S.lab[k] || [0, 0]); return `<button type="button" class="rowbtn" data-a="drill" data-v="${k}">
          <span class="rowmain"><strong>${esc(name)}</strong>${bar(a ?? 0, name)}</span><span class="rowpct">${a === null ? 'new' : a + '%'}</span>${icon.next}</button>`; }).join('')}</div></section>

      <section class="block"><h2 class="block-h">Let statement warm-up</h2>
        <p class="fine">Read a problem, find the unknowns, define x and y. No solving.</p>
        <button type="button" class="btn ghost wide" data-a="lets">Start a warm-up</button></section>

      <a class="rowbtn" href="#/lab/phrases"><span class="rownum plain" aria-hidden="true">🔄</span><span class="rowmain"><strong>Phrase list</strong><small>What each phrase usually means, and when it does not</small></span>${icon.next}</a>
    </div>`;
  },
  actions: {
    drill(el) { newDrill(el.dataset.v || null); location.hash = '#/lab/drill'; return false; },
    lets() {
      const ids = ['tickets', 'numbers', 'ages', 'bills', 'mixture', 'investment', 'distance', 'wind'];
      startProblem({ spec: generate(ids[Math.floor(Math.random() * ids.length)], Date.now()), mode: 'practice', scope: 'let' }); return false;
    },
  },
};

export const drillView = {
  nav: false,
  render() {
    if (!D) newDrill();
    const fresh = D.fresh; D.fresh = false;
    if (D.i >= D.items.length) {
      const n = D.items.length;
      return `<div class="page finish"><p class="eyebrow">Drill complete</p><h2 class="big">${D.right} of ${n} first try.</h2>
        <p class="lead">${D.right === n ? 'Perfect reps.' : D.right >= n - 2 ? 'Sharp. The misses are the ones worth a second look.' : 'Good work. The phrases you missed are the ones to drill again.'}</p>
        <div class="col"><button type="button" class="btn primary wide" data-a="again">Another drill</button><a class="btn ghost wide" href="#/lab">Back to the Lab</a><a class="btn ghost wide" href="#/home">Home</a></div></div>`;
    }
    const item = D.items[D.i];
    const dots = D.items.map((_, i) => `<i class="${i < D.i ? 'done' : i === D.i ? 'on' : ''}"></i>`).join('');
    let body;
    if (item.type === 'mc') {
      body = `<div class="choices" role="group">${item.choices.map((c, i) => {
        const state = D.done && i === item.correct ? ' right' : D.tried.includes(i) ? ' wrong' : '';
        return `<button type="button" class="choice${state}" data-a="pick" data-i="${i}" ${D.done || D.tried.includes(i) ? 'disabled' : ''}>${esc(c)}</button>`;
      }).join('')}</div>${fbHtml()}`;
    } else {
      body = `<div class="paper lets">${item.lets.map(([v, d]) => `<div class="pp-text">Let <i class="v">${v}</i> = ${esc(d)}</div>`).join('')}</div>
        <p class="ask">${item.mode === 'eq' ? 'Build the equation.' : 'Build the expression (no equals sign needed).'}</p>
        ${D.done ? `<div class="eq-final">${xy(item.target)}</div>` : eqInput({ tokens: D.tok, tiles: tilesFor(item), label: 'Your answer' })}
        ${fbHtml()}
        ${D.hint >= 1 && !D.done ? coach(esc(item.hint)) : ''}
        ${D.done ? '' : `<div class="row"><button type="button" class="btn ghost" data-a="hint">${icon.bulb} ${D.hint === 0 ? 'Hint' : 'Show answer'}</button>
          <button type="button" class="btn primary grow" data-a="check" data-primary ${D.tok.length ? '' : 'disabled'}>Check</button></div>`}`;
    }
    return `<div class="play${fresh ? ' fresh' : ''}">
      <header class="playbar"><a class="iconbtn" href="#/lab" aria-label="Leave the drill">${icon.close}</a>
        <div class="playbar-title"><span class="modepill">Lab</span><span class="playbar-name">${esc(D.skill ? SKILLS[D.skill] : 'Mixed drill')}</span></div>
        <div class="dots" aria-label="Question ${D.i + 1} of ${D.items.length}">${dots}</div></header>
      <main class="playmain">
        <section class="story card"><span class="eyebrow">Translate</span><p class="story-text lg">${rich(item.prompt)}</p></section>
        <section class="stage">${body}
          ${D.done ? `<button type="button" class="btn primary wide" data-a="next" data-primary>${D.i === D.items.length - 1 ? 'Finish' : 'Next rep'} ${icon.next}</button>` : ''}</section>
      </main></div>`;
  },
  key(ev) {
    const item = D && D.items[D.i];
    if (!item || item.type !== 'build' || D.done || /^(INPUT|TEXTAREA)$/.test(ev.target.tagName)) return false;
    const k = keyToTok(ev);
    if (!k || k.act === 'enter' || (ev.target.tagName === 'BUTTON' && k.act)) return false;
    ev.preventDefault();
    if (k.act === 'bksp') popTok(D.tok); else pushTok(D.tok, k.v, 'key');
    return true;
  },
  actions: {
    tok(el) { pushTok(D.tok, el.dataset.v, el.dataset.k); },
    bksp() { popTok(D.tok); },
    clr() { D.tok.length = 0; },
    hint() { if (D.hint === 0) D.hint = 1; else { D.hint = 2; resolve(false, true); } },
    pick(el) {
      const item = D.items[D.i], i = Number(el.dataset.i);
      if (i === item.correct) resolve(true);
      else { D.wrong += 1; D.tried.push(i); D.fb = { tone: 'try', html: 'Read the phrase again. What is actually happening to the quantity?', flash: true }; }
    },
    check() {
      const item = D.items[D.i];
      const r = judge(item, tokSrc(D.tok));
      if (r.ok) resolve(true);
      else { D.wrong += 1; store().logMistake(r.code === 'trap' ? null : r.code); D.fb = { tone: 'try', html: esc(r.msg.replace(/^Not quite\. /, '')), flash: true }; }
    },
    next() { D.i += 1; D.tok = []; D.wrong = 0; D.hint = 0; D.fb = null; D.done = false; D.tried = []; D.fresh = true; window.scrollTo(0, 0); },
    again() { newDrill(D.skill); },
  },
};

export const phrasesView = {
  render() {
    return `<div class="page"><a class="backlink" href="#/lab">${icon.back} Translation Lab</a>
      <header class="pagehead"><div><h1>Phrase list</h1><p>Keywords are clues, not rules. Always check the context.</p></div></header>
      <div class="phrases">${PHRASES.map(p => `<article class="phrase card">
        <h2>“${esc(p.phrase)}”</h2><p class="ph-means">${esc(p.means)}</p>
        <p class="ph-ex"><span>${esc(p.ex[0])}</span>${icon.next}<span class="math">${esc(p.ex[1]).replace(/\b([xy])\b/g, '<i>$1</i>')}</span></p>
        <p class="ph-watch"><strong>Watch out:</strong> ${esc(p.watch)}</p></article>`).join('')}</div></div>`;
  },
  actions: {},
};

/** For automated tests only. */
export const currentDrill = () => D;
