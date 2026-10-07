// ---------------------------------------------------------------------------
// problem.js — the guided problem flow (the heart of the app).
//
//   READ → PLAYERS → LET → CLUE #1 → CLUE #2 → STRATEGY → SOLVE → CHECK → ANSWER
//
// One "session" object holds everything about the problem in progress. It is
// saved after every tap, so closing the app or refreshing never loses work,
// and changing the explanation level never restarts the problem.
//
// Modes:  learn    = coaching shown at every step
//         practice = coaching on request, hints available
//         game     = no hints, typed answers, three tries per step
// ---------------------------------------------------------------------------
import { store } from '../store/progress.js';
import { buildProblem, generate, categoryById } from '../content/categories.js';
import { WORKSHEET, worksheetSpec } from '../content/worksheet.js';
import { inst, fmtNum, tokenize, plain } from '../core/math.js';
import { buildPlan, LABELS } from '../core/solver.js';
import { checkLet, checkFill, checkConclusion, diagnoseEquation } from '../core/check.js';
import { STAGE_TEXT, STRATEGY_TEXT, ROUTINE, SKILL_LABELS, nod } from '../content/teaching.js';
import { ACHIEVEMENTS } from '../store/progress.js';
import { esc, rich, xy, icon, coach, feedback, shuffled, bar } from './dom.js';
import { eqInput, pushTok, popTok, tokSrc, keyToTok } from './eqinput.js';
import { diagram } from './diagrams.js';
import { paperHTML, letsFor } from './paper.js';

const FLOW = { full: ['read', 'players', 'lets', 'clue', 'strategy', 'solve', 'check', 'final', 'done'], let: ['read', 'players', 'lets', 'done'] };
const WEIGHTS = { identify: 10, lets: 20, equations: 30, algebra: 15, check: 10, final: 15 };
const TRIES = 3; // game mode: attempts before the answer is shown
const ID = { p: 'x', q: 'y' };

// ---- session ------------------------------------------------------------------
export function startProblem({ spec, mode = 'learn', scope = 'full' }) {
  const st = store();
  const prob = buildProblem(spec);
  const s = {
    id: Date.now(), spec, mode, scope, stage: 'read', fresh: true, started: Date.now(),
    letLevel: st.letLevel(mode, !!spec.tutorial),
    map: null, order: [], showDg: false,
    read: { hl: [], checked: mode === 'game', pick: null, done: false, wrong: 0, tried: [], fb: null },
    players: { sel: [], done: false, wrong: 0, fb: null },
    lets: { x: {}, y: {}, done: false, wrong: 0, fb: null },
    clue: newClue(mode),
    strat: { pick: null, done: false },
    solve: { i: 0, tok: [], num: '', wrong: 0, fb: null, why: false },
    check: { i: 0, num: '', wrong: 0, fb: null },
    final: { text: mode === 'game' ? '' : 'Therefore, ', wrong: 0, fb: null, ok: false },
    items: [], hints: 0, assists: 0, earned: [],
  };
  if (scope === 'full') st.markAttempt(prob.cat);
  st.setSession(s);
  // Already on the problem screen (e.g. “Next problem”)? Then just redraw it.
  if (location.hash === '#/play') window.dispatchEvent(new Event('jah:render')); else location.hash = '#/play';
}
const newClue = mode => ({ sub: mode === 'game' ? 'build' : 'sentence', eq: null, tok: [], wrong: 0, hints: 0, fb: null, sentWrong: 0, tried: [] });

let P = null, Pid = null, planCache = null, wordCache = null, lastFresh = false;
const S = () => store().getSession();
const save = () => store().setSession(S());
function prob() {
  const s = S();
  if (!P || Pid !== s.id) { P = buildProblem(s.spec); Pid = s.id; planCache = null; wordCache = null; }
  return P;
}
const M = () => S().map || ID;
const srcs = () => prob().eqs.map(e => inst(e.tpl, M()));
function plan() {
  const s = S(), key = `${s.id}|${s.strat.pick}|${M().p}`;
  if (!planCache || planCache.key !== key) planCache = { key, plan: buildPlan(srcs(), s.strat.pick) };
  return planCache.plan;
}
function words() {
  if (wordCache) return wordCache;
  const p = prob(), list = [], keys = [];
  p.parsed.forEach((ps, si) => {
    ps.keys.forEach((text, k) => keys.push({ id: `${si}:${k}`, text }));
    ps.words.forEach(w => list.push({ ...w, si, key: w.key === null ? null : `${si}:${w.key}` }));
  });
  return (wordCache = { list, keys });
}
const titleOf = (s, p) => (s.spec.tutorial ? 'Tutorial play' : s.spec.ws ? `Worksheet #${s.spec.ws}` : categoryById(p.cat).name);

// ---- scoring ------------------------------------------------------------------
function score(s, part, { wrong = 0, hint = 0, revealed = false, tag } = {}) {
  const pen = [0, 0.03, 0.06, 0.1, 0.25, 0.4][Math.min(hint, 5)];
  const pts = revealed ? 0 : Math.max(0.25, 1 - 0.2 * wrong - pen);
  s.items.push({ part, first: !revealed && wrong === 0 && hint < 4, pts, ...(tag ? { tag } : {}) });
}
export function totals(items) {
  const parts = {};
  items.forEach(it => { (parts[it.part] ||= []).push(it.pts); });
  let sum = 0, w = 0;
  const out = {};
  Object.entries(parts).forEach(([k, arr]) => {
    const v = arr.reduce((a, b) => a + b, 0) / arr.length;
    out[k] = Math.round(v * 100); sum += v * WEIGHTS[k]; w += WEIGHTS[k];
  });
  return { parts: out, total: w ? Math.round((100 * sum) / w) : 0 };
}
const fbOf = (tone, html) => ({ tone, html, flash: true });
const showFb = fb => { const h = feedback(fb); if (fb) fb.flash = false; return h; };
const gameOut = (s, wrong) => s.mode === 'game' && wrong >= TRIES;

function goto(stage) { const s = S(); s.stage = stage; s.fresh = true; }
function nextStage() { const s = S(), f = FLOW[s.scope]; goto(f[f.indexOf(s.stage) + 1]); }

function finish() {
  const s = S(), p = prob();
  const t = totals(s.items);
  s.total = t.total; s.parts = t.parts;
  const earned = store().recordProblem({
    spec: s.spec, mode: s.mode, scope: s.scope, cat: p.cat, items: s.items, hints: s.hints, assists: s.assists,
    total: t.total, map: s.map, strategy: s.strat.pick, title: titleOf(s, p), final: s.final.ok ? s.final.text.trim() : null,
  });
  s.earned = earned.map(a => a.id);
  if (s.spec.tutorial) store().setOnboarded();
  goto('done');
}

// ---- rendering: shared pieces ---------------------------------------------------
function routineStrip(s) {
  const at = { read: 0, players: 1, lets: 2, strategy: 5, solve: 5, check: 6, final: 7, done: 8 }[s.stage] ?? (['sentence', 'phrase'].includes(s.clue.sub) ? 3 : 4);
  const steps = s.scope === 'let' ? ROUTINE.slice(0, 3) : ROUTINE;
  return `<ol class="routine" aria-label="The routine">${steps.map((r, i) =>
    `<li class="${i < at ? 'done' : i === at ? 'now' : ''}"${i === at ? ' aria-current="step"' : ''}><span class="rt-dot">${i < at ? icon.check : i + 1}</span><span class="rt-lab">${r.label}</span></li>`).join('')}</ol>`;
}

function storyCard(s, p) {
  const W = words();
  let body;
  const tappable = s.stage === 'read' && !s.read.checked;
  if (s.stage === 'read' && s.mode !== 'game') {
    const hitKeys = new Set(W.list.filter((w, i) => w.key && s.read.hl.includes(i)).map(w => w.key));
    body = W.list.map((w, i) => {
      const on = s.read.hl.includes(i);
      if (tappable) return `<button type="button" class="w${on ? ' on' : ''}" data-a="hl" data-i="${i}" aria-pressed="${on}">${esc(w.w)}</button>${esc(w.tail || '')}`;
      const c = w.key ? (hitKeys.has(w.key) ? 'w key hit' : 'w key miss') : on ? 'w on extra' : 'w';
      return `<span class="${c}">${esc(w.w)}</span>${esc(w.tail || '')}`;
    }).join(' ');
  } else if (s.stage === 'clue' && s.clue.sub === 'sentence') {
    const used = new Set(s.order.flatMap(i => p.eqs[i].sent.slice(0, 1)));
    body = p.parsed.map((ps, si) => `<button type="button" class="sentbtn${used.has(si) ? ' used' : ''}" data-a="sent" data-i="${si}">${esc(ps.text)}</button>`).join(' ');
  } else {
    const hot = s.stage === 'clue' && s.clue.eq !== null ? p.eqs[s.clue.eq].sent : s.stage === 'final' ? [p.parsed.length - 1] : [];
    body = p.parsed.map((ps, si) => `<span class="sent${hot.includes(si) ? ' hot' : ''}">${esc(ps.text)}</span>`).join(' ');
  }
  const canDraw = s.stage !== 'read';
  return `<section class="story card" aria-label="The problem">
    <div class="story-top"><span class="eyebrow">The play</span>
      ${canDraw ? `<button type="button" class="linkbtn" data-a="dg" aria-expanded="${s.showDg}">${s.showDg ? 'Hide picture' : 'Picture it'}</button>` : ''}</div>
    <p class="story-text${tappable ? ' tapping' : ''}">${body}</p>
    ${canDraw && s.showDg ? `<div class="story-dg">${diagram(p, s.map, s.order.length === 2)}</div>` : ''}
  </section>`;
}

function notesCard(s, p) {
  if (!s.map) return '';
  const L = letsFor(p, s.map);
  const blocks = [{ k: 'text', s: `Let x = ${L.x}` }, { k: 'text', s: `Let y = ${L.y}` }];
  const eqs = [...s.order].sort();
  if (eqs.length) blocks.push({ k: 'gap' });
  const all = srcs();
  eqs.forEach(i => blocks.push({ k: 'line', src: all[i], tag: LABELS[i] }));
  if (s.stage === 'solve') {
    const pl = plan();
    const done = pl.steps.slice(0, s.solve.i).flatMap(st => [].concat(st.paper || []));
    if (done.length) blocks.push({ k: 'gap' }, ...done);
  } else if (['check', 'final'].includes(s.stage)) {
    const sol = plan().sol;
    blocks.push({ k: 'gap' }, { k: 'line', src: `x = ${fmtNum(sol.x)}` }, { k: 'line', src: `y = ${fmtNum(sol.y)}` });
  }
  return `<section class="notes paper" aria-label="Your work so far"><span class="eyebrow">On your paper</span>${paperHTML(blocks, s.map)}</section>`;
}

const head = (s, key, extra = '') => {
  const eli = store().settings.eli, t = STAGE_TEXT[key];
  return `<h2 class="stage-h">${t.title}${extra}</h2>${s.mode === 'game' ? '' : coach(rich(t[eli], M()))}`;
};
const nextBtn = label => `<button type="button" class="btn primary wide" data-a="next" data-primary>${esc(label)} ${icon.next}</button>`;
const mc = (choices, order, { pick, tried, done, correct, act }) => `<div class="choices" role="group">${order.map(i => {
  const state = done && i === correct ? ' right' : tried.includes(i) ? ' wrong' : '';
  return `<button type="button" class="choice${state}" data-a="${act}" data-i="${i}" ${done || tried.includes(i) ? 'disabled' : ''} aria-pressed="${pick === i}">${choices[i]}</button>`;
}).join('')}</div>`;

// ---- stage: READ ----------------------------------------------------------------
function stageRead(s, p) {
  const r = s.read;
  let h = head(s, 'read');
  if (!r.checked) {
    h += `<p class="ask">Tap the numbers and the key phrases in the story above.</p>
      <button type="button" class="btn primary wide" data-a="read-check" data-primary>Check my read</button>`;
    return h;
  }
  if (s.mode !== 'game') {
    const W = words();
    const hit = new Set(W.list.filter((w, i) => w.key && r.hl.includes(i)).map(w => w.key));
    const missed = W.keys.filter(k => !hit.has(k.id));
    const extra = r.hl.filter(i => !W.list[i].key).length;
    let msg = `You marked <strong>${hit.size} of ${W.keys.length}</strong> key facts.`;
    if (missed.length) msg += ` The ones outlined above are worth a second look: ${missed.slice(0, 3).map(k => `“${esc(k.text)}”`).join(', ')}${missed.length > 3 ? '…' : ''}.`;
    else msg += ' That is a complete read.';
    if (extra > W.list.length * 0.4) msg += ' Marking nearly everything is the same as marking nothing. Aim for numbers and relationship words.';
    h += coach(msg, missed.length ? 'info' : 'good');
  }
  const order = shuffled(p.find.choices.length, s.id);
  h += `<p class="ask">What are we trying to find?</p>
    ${mc(p.find.choices.map(c => esc(c[0])), order, { pick: r.pick, tried: r.tried, done: r.done, correct: p.find.correct, act: 'find' })}
    ${showFb(r.fb)}`;
  if (r.done) h += nextBtn('Define the players');
  return h;
}

// ---- stage: PLAYERS -------------------------------------------------------------
function stagePlayers(s, p) {
  const pl = s.players;
  const order = shuffled(p.unknowns.length, s.id + 7);
  let h = head(s, 'players') + `<p class="ask">Which two quantities does the story leave unknown?</p>
    <div class="choices" role="group">${order.map(i => {
      const on = pl.sel.includes(i);
      const state = pl.done && p.unknowns[i].ok ? ' right' : '';
      return `<button type="button" class="choice multi${on ? ' on' : ''}${state}" data-a="pl" data-i="${i}" aria-pressed="${on}" ${pl.done ? 'disabled' : ''}>${esc(p.unknowns[i].text)}</button>`;
    }).join('')}</div>${showFb(pl.fb)}`;
  h += pl.done ? nextBtn('Write the Let statements')
    : `<button type="button" class="btn primary wide" data-a="pl-check" data-primary ${pl.sel.length === 2 ? '' : 'disabled'}>Check</button>`;
  return h;
}

// ---- stage: LET STATEMENTS --------------------------------------------------------
const LEVEL_NAMES = ['', 'Choose from a list', 'Build it from phrases', 'Fill in the blank', 'Write it yourself'];
function letOptions(s, p) {
  const opts = [{ text: p.q[0].desc, which: 'p' }, { text: p.q[1].desc, which: 'q' }, ...p.letWrong.slice(0, 2).map(w => ({ ...w, which: null }))];
  return shuffled(opts.length, s.id + 13).map(i => opts[i]);
}
function letPools(s, p) {
  const m = shuffled(p.pools.m.length, s.id + 3).map(i => p.pools.m[i]);
  const t = shuffled(p.pools.t.length, s.id + 5).map(i => p.pools.t[i]);
  return { m: [...new Set(m)], t: [...new Set(t)] };
}
function stageLets(s, p) {
  const L = s.lets, lvl = s.letLevel;
  let h = head(s, 'lets', ` <span class="lvl">Level ${lvl} of 4 · ${LEVEL_NAMES[lvl]}</span>`);
  if (L.done) {
    return h + showFb(L.fb) + nextBtn(s.scope === 'let' ? 'Finish warm-up' : 'Find the first clue');
  }
  const row = v => {
    const st = L[v];
    const pre = `<span class="let-pre">Let <i class="v">${v}</i> =</span>`;
    if (lvl === 1) {
      return `<div class="letrow" role="group" aria-label="Let ${v} equal"><div class="let-head">${pre}</div><div class="choices">${letOptions(s, p).map((o, i) =>
        `<button type="button" class="choice small${st.pick === i ? ' on' : ''}" data-a="let-pick" data-v="${v}" data-i="${i}" aria-pressed="${st.pick === i}">${esc(o.text)}</button>`).join('')}</div></div>`;
    }
    if (lvl === 2) {
      const pools = letPools(s, p);
      const chips = (arr, key) => arr.map((t, i) => `<button type="button" class="chip${st[key] === t ? ' on' : ''}" data-a="let-part" data-v="${v}" data-k="${key}" data-i="${i}" aria-pressed="${st[key] === t}">${esc(t)}</button>`).join('');
      return `<div class="letrow" role="group" aria-label="Let ${v} equal"><div class="let-head">${pre} <span class="let-built">${esc(st.m || '_____')} ${esc(st.t || '_____')}</span></div>
        <div class="chips">${chips(pools.m, 'm')}</div><div class="chips">${chips(pools.t, 't')}</div></div>`;
    }
    if (lvl === 3) {
      return `<label class="letrow fill">${pre} <span>${esc(p.fill.pre)}</span><input type="text" class="inp blank" data-bind="lets.${v}.text" value="${esc(st.text || '')}" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Missing word for ${v}"><span>${esc(p.fill.suf)}</span></label>`;
    }
    return `<label class="letrow free">${pre}<input type="text" class="inp" data-bind="lets.${v}.text" value="${esc(st.text || '')}" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="what does ${v} stand for?" aria-label="Let ${v} equal"></label>`;
  };
  h += `<p class="ask">${lvl === 1 ? 'Choose what each letter stands for.' : lvl === 2 ? 'Build each statement: pick one phrase from each row.' : lvl === 3 ? 'Type the missing word in each statement.' : 'Write what each letter stands for. Be precise.'}</p>
    ${row('x')}${row('y')}${showFb(L.fb)}
    <button type="button" class="btn primary wide" data-a="let-check" data-primary>Check my Let statements</button>`;
  return h;
}
function judgeLet(s, p, v) {
  const st = s.lets[v], lvl = s.letLevel;
  if (lvl === 1) {
    if (st.pick == null) return { which: null, msg: `Choose what ${v} stands for.`, soft: true };
    const o = letOptions(s, p)[st.pick];
    return o.which ? { which: o.which } : { which: null, msg: o.why, code: /known|given/i.test(o.why) ? 'let-known' : 'let-measure' };
  }
  if (lvl === 2) {
    if (!st.m || !st.t) return { which: null, msg: `Pick one phrase from each row for ${v}.`, soft: true };
    const i = p.q.findIndex(q => q.parts[0] === st.m && q.parts[1] === st.t);
    if (i >= 0) return { which: i === 0 ? 'p' : 'q' };
    return { which: null, code: 'let-known', msg: `Read it back: “Let ${v} = ${st.m} ${st.t}”. Is that something the story leaves unknown? And is it what the question asks about?` };
  }
  if (lvl === 3) {
    if (!(st.text || '').trim()) return { which: null, msg: `Fill in the blank for ${v}.`, soft: true };
    const w = checkFill(st.text, p);
    return w ? { which: w } : { which: null, code: 'let-unknown', msg: `“${st.text.trim()}” does not match one of the two unknowns. ${p.letHelp}` };
  }
  const r = checkLet(st.text || '', p);
  if (r.code === 'empty') return { which: null, msg: `Write what ${v} stands for.`, soft: true };
  if (r.code === 'let-measure') return { which: null, code: r.code, msg: r.msg };
  return r.which ? { which: r.which } : { which: null, code: r.code, msg: r.msg + (s.lets.wrong >= 1 ? ` ${p.letHelp}` : '') };
}

// ---- stage: CLUES (translate + build) ----------------------------------------------
export function tilesFor(p) {
  const nums = new Set(), syms = new Set(['x', 'y', '+', '-', '*', '=']);
  const scan = tpl => (inst(tpl, ID).match(/\d+\.\d+|\d+|[()/]/g) || []).forEach(t => (/\d/.test(t) ? nums.add(t) : syms.add(t)));
  p.eqs.forEach(e => { scan(e.tpl); if (e.traps.some(t => t.tpl.includes('('))) { syms.add('('); syms.add(')'); } });
  (p.extraTiles || []).forEach(t => nums.add(t));
  const order = ['x', 'y', '+', '-', '*', '/', '(', ')', '='];
  return [...order.filter(o => syms.has(o)), ...[...nums].sort((a, b) => parseFloat(a) - parseFloat(b))];
}
function hintList(s, p, e) {
  const eli = store().settings.eli, c = s.clue, out = [];
  const sent = e.sent.map(i => p.parsed[i].text).join(' ');
  if (c.hints >= 1) out.push(['Question', rich(e.h1, M())]);
  if (c.hints >= 2) out.push(['Clue', `Look at this part of the story: <em>“${esc(sent)}”</em> Focus on <strong>${esc(e.phrase)}</strong>.`]);
  if (c.hints >= 3) out.push(['Explanation', rich(e.h3, M())]);
  if (c.hints >= 4) out.push(['Partial setup', rich(e.h4, M())]);
  if (c.hints >= 5) out.push(['Full explanation', `${rich(e.explain[eli], M())} <span class="hint-now">Now build it yourself.</span>`]);
  return out.length ? `<ol class="hints">${out.map(([k, v]) => `<li><span class="hint-k">${k}</span>${v}</li>`).join('')}</ol>` : '';
}
function stageClue(s, p) {
  const c = s.clue, n = s.order.length, eli = store().settings.eli;
  const num = c.sub === 'explain' ? n : n + 1;
  if (c.sub === 'sentence') {
    return head(s, 'clue', ` <span class="lvl">Clue #${num}</span>`) +
      `<p class="ask">${n === 0 ? 'Which sentence in the story gives a relationship you can turn into an equation? Tap it above.' : 'One equation is on the board. Tap the sentence that gives a second relationship.'}</p>${showFb(c.fb)}`;
  }
  const e = c.eq !== null ? p.eqs[c.eq] : null;
  if (c.sub === 'phrase') {
    const q = e.phraseQ;
    return `<h2 class="stage-h">Translate the story <span class="lvl">Clue #${num}</span></h2>
      <p class="ask">${rich(q.q, M())}</p>
      ${mc(q.choices.map(ch => rich(ch, M())), shuffled(q.choices.length, s.id + 17 + n), { pick: null, tried: c.tried, done: false, correct: q.correct, act: 'phrase' })}
      ${showFb(c.fb)}`;
  }
  if (c.sub === 'explain') {
    const src = srcs()[c.eq];
    return `<h2 class="stage-h">Build the equations <span class="lvl">Equation ${LABELS[c.eq]}</span></h2>
      <div class="eq-final">${xy(src)}</div>${showFb(c.fb)}
      <div class="why"><span class="eyebrow">Why this equation says the same thing as the sentence</span><p>${rich(e.explain[eli], M())}</p></div>
      ${nextBtn(n < 2 ? 'Find the second clue' : 'Choose a strategy')}`;
  }
  // build
  const L = letsFor(p, M());
  const game = s.mode === 'game';
  return `<h2 class="stage-h">Build the equations <span class="lvl">Equation #${num}</span></h2>
    ${game ? `<p class="ask">Write ${n === 0 ? 'an equation' : 'the second equation'} from the story.</p>` : `<p class="ask">Turn the highlighted sentence into an equation. Does each letter match your Let statements?</p>`}
    ${eqInput({ tokens: c.tok, tiles: tilesFor(p), keypad: game, label: 'Your equation' })}
    ${showFb(c.fb)}
    ${e && !game ? hintList(s, p, e) : ''}
    <div class="row">
      ${game ? '' : `<button type="button" class="btn ghost" data-a="hint" ${c.hints >= 5 ? 'disabled' : ''}>${icon.bulb} Hint ${Math.min(c.hints + 1, 5)} of 5</button>`}
      <button type="button" class="btn primary grow" data-a="eq-check" data-primary ${c.tok.length ? '' : 'disabled'}>Check equation</button>
    </div>
    <p class="fine">x = ${esc(L.x)} · y = ${esc(L.y)}</p>`;
}

// ---- stage: STRATEGY ---------------------------------------------------------------
function stageStrategy(s, p) {
  const eli = store().settings.eli, st = s.strat;
  const card = k => `<button type="button" class="strat${st.pick === k ? ' on' : ''}" data-a="strat" data-v="${k}" aria-pressed="${st.pick === k}">
      <span class="strat-name">${STRATEGY_TEXT[k].name}</span>${s.mode === 'game' ? '' : `<span class="strat-desc">${esc(STRATEGY_TEXT[k][eli])}</span>`}</button>`;
  let h = head(s, 'strategy') + `<p class="ask">Which method fits these two equations?</p><div class="strats">${card('substitution')}${card('elimination')}</div>`;
  if (st.pick) {
    if (s.mode !== 'game') {
      const best = p.strategy.best === st.pick;
      h += coach(best
        ? `<strong>Good call.</strong> ${rich(p.strategy.why, M())}`
        : `<strong>That will work.</strong> ${STRATEGY_TEXT[p.strategy.best].name} is usually quicker here: ${rich(p.strategy.why, M())} You can keep your choice or switch.`, best ? 'good' : 'info');
    }
    h += `<button type="button" class="btn primary wide" data-a="strat-go" data-primary>Run the play with ${STRATEGY_TEXT[st.pick].name.toLowerCase()} ${icon.next}</button>`;
  }
  return h;
}

// ---- stage: SOLVE --------------------------------------------------------------------
function stageSolve(s) {
  const pl = plan(), so = s.solve, step = pl.steps[so.i];
  let h = `<h2 class="stage-h">Run the play <span class="lvl">${STRATEGY_TEXT[pl.strategy].name}</span></h2>`;
  if (!step) {
    return h + showFb(so.fb) + `<div class="eq-final">${xy(`x = ${fmtNum(pl.sol.x)}`)}<span class="sep">,</span>${xy(`y = ${fmtNum(pl.sol.y)}`)}</div>` + nextBtn('Check the score');
  }
  h += `<p class="ask"><span class="stepno">Step ${so.i + 1} of ${pl.steps.length}</span> ${esc(step.prompt)}</p>`;
  if (s.mode === 'learn' || so.why) h += coach(esc(step.coach) + (step.show && s.mode === 'learn' ? ` Set-up: ${xy(step.show)}` : ''));
  if (step.kind === 'eq') h += eqInput({ tokens: so.tok, keypad: true, label: 'Your line', placeholder: 'Enter this line of working' });
  else h += `<label class="numrow"><span class="math"><i>${step.v}</i><span class="o">=</span></span><input type="text" inputmode="decimal" class="inp num" data-bind="solve.num" value="${esc(so.num)}" autocomplete="off" aria-label="Value of ${step.v}"></label>`;
  h += showFb(so.fb) + `<div class="row">
      ${s.mode === 'game' ? '' : `<button type="button" class="btn ghost" data-a="step-show">Show this step</button>`}
      ${s.mode === 'practice' && !so.why ? `<button type="button" class="btn ghost" data-a="step-why">Why?</button>` : ''}
      <button type="button" class="btn primary grow" data-a="step-check" data-primary>Check</button></div>`;
  return h;
}

// ---- stage: CHECK ----------------------------------------------------------------------
function checkItems() {
  const items = [];
  plan().checks.forEach((c, e) => ['L', 'R'].forEach(k => { if (c[k].hasVar && c[k].needsWork) items.push({ e, k, side: c[k] }); }));
  return items;
}
function stageCheck(s) {
  const pl = plan(), ck = s.check, items = checkItems();
  const cur = items[ck.i];
  const all = srcs();
  let h = head(s, 'check');
  h += pl.checks.map((c, e) => {
    const sideRow = k => {
      const sd = c[k], lab = k === 'L' ? 'L.S.' : 'R.S.';
      const idx = items.findIndex(it => it.e === e && it.k === k);
      if (idx === -1) return `<div class="ck-row"><span class="pp-ls">${lab} =</span> ${xy(sd.sub)}${sd.needsWork ? `<span class="o">=</span>${xy(fmtNum(sd.val))}` : ''}</div>`;
      if (idx < ck.i) return `<div class="ck-row"><span class="pp-ls">${lab} =</span> ${xy(sd.sub)}<span class="o">=</span>${xy(fmtNum(sd.val))}</div>`;
      if (idx === ck.i) return `<label class="ck-row now"><span class="pp-ls">${lab} =</span> ${xy(sd.sub)}<span class="o">=</span><input type="text" inputmode="decimal" class="inp num" data-bind="check.num" value="${esc(ck.num)}" autocomplete="off" aria-label="${lab} of equation ${e + 1}"></label>`;
      return `<div class="ck-row later"><span class="pp-ls">${lab} =</span> ${xy(sd.sub)}<span class="o">=</span> ?</div>`;
    };
    const done = !items.some((it, i) => it.e === e && i >= ck.i);
    return `<div class="ck card${done ? ' ok' : ''}"><div class="ck-head"><span>Equation ${LABELS[e]}</span>${xy(all[e])}${done ? `<span class="ck-ok">${icon.check} L.S. = R.S.</span>` : ''}</div>${sideRow('L')}${sideRow('R')}</div>`;
  }).join('');
  h += showFb(ck.fb);
  if (cur) h += `<button type="button" class="btn primary wide" data-a="chk-check" data-primary>Check</button>`;
  else h += coach('Both equations balance. One more check: do the values make sense in the story (positive, sensible sizes, whole numbers where things are counted)?', 'good') + nextBtn('Write the final answer');
  return h;
}

// ---- stage: FINAL ------------------------------------------------------------------------
function stageFinal(s, p) {
  const f = s.final;
  let h = head(s, 'final');
  if (f.ok || f.revealed) {
    return h + `<div class="paper"><div class="pp-text pp-final">${esc(f.ok ? f.text.trim() : p.conclusion.model)}</div></div>${showFb(f.fb)}
      <button type="button" class="btn primary wide" data-a="finish" data-primary>Finish ${icon.next}</button>`;
  }
  return h + `<p class="ask">Answer the question in a full sentence.</p>
    <textarea class="inp area" rows="3" data-bind="final.text" aria-label="Your concluding sentence" autocapitalize="sentences">${esc(f.text)}</textarea>
    ${showFb(f.fb)}
    <button type="button" class="btn primary wide" data-a="final-check" data-primary>Check my sentence</button>`;
}

// ---- stage: DONE --------------------------------------------------------------------------
function stageDone(s, p) {
  const name = store().name;
  if (s.scope === 'let') {
    const L = letsFor(p, s.map);
    return `<div class="finish"><p class="eyebrow">Warm-up complete</p><h2 class="big">Variables defined.</h2>
      <div class="paper">${paperHTML([{ k: 'text', s: `Let x = ${L.x}` }, { k: 'text', s: `Let y = ${L.y}` }])}</div>
      <p class="fine">That setup is the part most people rush. You did not.</p>
      <div class="col"><button type="button" class="btn primary wide" data-a="again">Another warm-up</button>
      <button type="button" class="btn ghost wide" data-a="solve-this">Solve this one fully</button>
      <a class="btn ghost wide" href="#/home">Home</a></div></div>`;
  }
  const rows = Object.keys(WEIGHTS).filter(k => s.parts[k] != null).map(k =>
    `<div class="box-row"><span>${SKILL_LABELS[k]}</span>${bar(s.parts[k], SKILL_LABELS[k])}<span class="box-n">${s.parts[k]}</span></div>`).join('');
  const earned = s.earned.map(id => ACHIEVEMENTS.find(a => a.id === id)).filter(Boolean);
  const mins = Math.max(1, Math.round((Date.now() - s.started) / 60000));
  return `<div class="finish">
    <p class="eyebrow">${s.spec.tutorial ? 'Tutorial complete' : 'Final buzzer'}</p>
    <h2 class="big">${s.spec.tutorial ? `That is the whole routine, ${esc(name)}.` : s.total >= 90 ? 'Clean game.' : s.total >= 70 ? 'Solid work.' : 'Good reps.'}</h2>
    <div class="scoreline"><span class="score-n">${s.total}</span><span class="score-l">process score<br><small>${s.hints} hint${s.hints === 1 ? '' : 's'} · about ${mins} min</small></span></div>
    <div class="boxscore card"><span class="eyebrow">Box score</span>${rows}
      <p class="fine">Scored on the whole process, not just the final number.</p></div>
    ${earned.length ? `<div class="earned">${earned.map(a => `<div class="badge got"><span class="badge-ic">🏀</span><div><strong>${esc(a.name)}</strong><span>${esc(a.desc)}</span></div></div>`).join('')}</div>` : ''}
    <div class="col">
      <a class="btn primary wide" href="#/teacher/0">${icon.paper} Show my teacher</a>
      ${s.spec.tutorial ? '' : `<button type="button" class="btn ghost wide" data-a="again">Next problem</button>`}
      <a class="btn ghost wide" href="#/home">Home</a>
    </div></div>`;
}

// ---- the view -----------------------------------------------------------------------------
function nextSpec(s) {
  const done = store().stats.worksheet;
  if (s.spec.ws) {
    const nxt = WORKSHEET.find(w => w.n > s.spec.ws && !done[w.n]) || WORKSHEET.find(w => !done[w.n]);
    if (nxt) return worksheetSpec(nxt.n);
  }
  return generate(prob().cat, Date.now());
}

export const playView = {
  nav: false,
  render() {
    const s = S();
    if (!s) return `<div class="page"><p class="empty">No problem in progress.</p><a class="btn primary" href="#/train">Pick a problem</a></div>`;
    const p = prob();
    const body = { read: stageRead, players: stagePlayers, lets: stageLets, clue: stageClue, strategy: stageStrategy, solve: stageSolve, check: stageCheck, final: stageFinal, done: stageDone }[s.stage](s, p);
    const eli = store().settings.eli;
    const fresh = s.fresh; s.fresh = false; lastFresh = fresh;
    return `<div class="play${fresh ? ' fresh' : ''}" data-stage="${s.stage}">
      <header class="playbar">
        <a class="iconbtn" href="#/home" aria-label="Save and exit to home">${icon.close}</a>
        <div class="playbar-title"><span class="modepill mode-${s.mode}">${s.mode}</span><span class="playbar-name">${esc(titleOf(s, p))}</span></div>
        <div class="seg seg-eli" role="group" aria-label="Explanation level">
          <span class="seg-lab" aria-hidden="true">ELI</span>
          ${[5, 10, 15].map(v => `<button type="button" data-a="eli" data-v="${v}" aria-pressed="${eli === v}" aria-label="Explain like I am ${v}">${v}</button>`).join('')}
        </div>
      </header>
      ${s.stage === 'done' ? '' : routineStrip(s)}
      <main class="playmain">
        ${s.stage === 'done' ? '' : storyCard(s, p) + notesCard(s, p)}
        <section class="stage" aria-live="off">${body}</section>
      </main></div>`;
  },

  after(root) {
    const wasFresh = lastFresh; lastFresh = false;
    if (wasFresh) window.scrollTo(0, 0);
    if (wasFresh && window.matchMedia('(pointer:fine)').matches) root.querySelector('.stage .inp')?.focus({ preventScroll: true });
  },

  input(el) {
    const s = S(); if (!s) return;
    const path = el.dataset.bind.split('.');
    let o = s; path.slice(0, -1).forEach(k => { o = o[k]; });
    o[path[path.length - 1]] = el.value;
    save();
  },

  key(ev) {
    const s = S(); if (!s) return false;
    const eqActive = (s.stage === 'clue' && s.clue.sub === 'build') || (s.stage === 'solve' && plan().steps[s.solve.i]?.kind === 'eq');
    if (!eqActive || /^(INPUT|TEXTAREA)$/.test(ev.target.tagName)) return false;
    const k = keyToTok(ev);
    if (!k || (k.act === 'enter')) return false;
    if (ev.target.tagName === 'BUTTON' && k.act) return false;
    ev.preventDefault();
    const toks = s.stage === 'clue' ? s.clue.tok : s.solve.tok;
    if (k.act === 'bksp') popTok(toks); else pushTok(toks, k.v, 'key');
    save(); return true;
  },

  actions: {
    eli(el) { store().setSetting('eli', Number(el.dataset.v)); },
    dg() { const s = S(); s.showDg = !s.showDg; save(); },
    next() { const s = S(); if (s.stage === 'clue') { if (s.order.length < 2) s.clue = newClue(s.mode); else nextStage(); s.fresh = true; } else if (s.stage === 'lets' && s.scope === 'let') finish(); else nextStage(); save(); },

    // READ
    hl(el) { const s = S(), i = Number(el.dataset.i), a = s.read.hl; const at = a.indexOf(i); if (at >= 0) a.splice(at, 1); else a.push(i); save(); },
    'read-check'() { S().read.checked = true; save(); },
    find(el) {
      const s = S(), p = prob(), r = s.read, i = Number(el.dataset.i);
      r.pick = i;
      if (i === p.find.correct) {
        r.done = true; r.fb = fbOf('good', esc(nod('read', store().name, s.id)));
        score(s, 'identify', { wrong: r.wrong });
      } else {
        r.wrong += 1; r.tried.push(i);
        if (s.mode === 'game') { r.done = true; r.fb = fbOf('show', `The question asks for: ${esc(p.find.choices[p.find.correct][0])}.`); score(s, 'identify', { revealed: true }); }
        else r.fb = fbOf('try', esc(p.find.choices[i][1] || 'Read the question sentence again. What does it ask for?'));
      }
      save();
    },

    // PLAYERS
    pl(el) { const s = S(), i = Number(el.dataset.i), a = s.players.sel; const at = a.indexOf(i); if (at >= 0) a.splice(at, 1); else if (a.length < 2) a.push(i); else { a.shift(); a.push(i); } s.players.fb = null; save(); },
    'pl-check'() {
      const s = S(), p = prob(), pl = s.players;
      const bad = pl.sel.find(i => !p.unknowns[i].ok);
      if (bad === undefined && pl.sel.length === 2) {
        pl.done = true; pl.fb = fbOf('good', esc(nod('players', store().name, s.id)) + esc(p.needBoth || ' Two unknowns, so you will need two equations.'));
        score(s, 'identify', { wrong: pl.wrong });
      } else {
        pl.wrong += 1; store().logMistake('let-known');
        if (gameOut(s, pl.wrong)) {
          pl.done = true; pl.sel = p.unknowns.map((u, i) => (u.ok ? i : -1)).filter(i => i >= 0);
          pl.fb = fbOf('show', 'The unknowns are highlighted.'); score(s, 'identify', { revealed: true });
        } else pl.fb = fbOf('try', esc(p.unknowns[bad].why) + ' Which quantities does the story NOT give a value for?');
      }
      save();
    },

    // LETS
    'let-pick'(el) { const s = S(); s.lets[el.dataset.v].pick = Number(el.dataset.i); s.lets.fb = null; save(); },
    'let-part'(el) { const s = S(), p = prob(), pools = letPools(s, p); s.lets[el.dataset.v][el.dataset.k] = pools[el.dataset.k][Number(el.dataset.i)]; s.lets.fb = null; save(); },
    'let-check'() {
      const s = S(), p = prob(), L = s.lets;
      const rx = judgeLet(s, p, 'x'), ry = judgeLet(s, p, 'y');
      const soft = [rx, ry].find(r => r.soft);
      if (soft) { L.fb = fbOf('info', esc(soft.msg)); save(); return; }
      let msg = null, code = null;
      if (!rx.which) { msg = `For x: ${rx.msg}`; code = rx.code; }
      else if (!ry.which) { msg = `For y: ${ry.msg}`; code = ry.code; }
      else if (rx.which === ry.which) { msg = 'x and y are describing the same quantity. Each unknown needs its own letter.'; code = 'let-ambiguous'; }
      if (!msg) {
        s.map = rx.which === 'p' ? { p: 'x', q: 'y' } : { p: 'y', q: 'x' };
        L.done = true; planCache = null;
        L.fb = fbOf('good', esc(nod('lets', store().name, s.id)) + ' Every equation you write from here has to match these two statements.');
        score(s, 'lets', { wrong: L.wrong });
      } else {
        L.wrong += 1; store().logMistake(code);
        if (gameOut(s, L.wrong)) {
          s.map = { ...ID }; L.done = true; planCache = null;
          L.fb = fbOf('show', `We will use: Let x = ${esc(p.q[0].desc)}, Let y = ${esc(p.q[1].desc)}.`); score(s, 'lets', { revealed: true });
        } else L.fb = fbOf('try', esc(msg));
      }
      save();
    },

    // CLUES
    sent(el) {
      const s = S(), p = prob(), c = s.clue, i = Number(el.dataset.i);
      const free = p.eqs.map((e, k) => k).filter(k => !s.order.includes(k));
      const hit = free.find(k => p.eqs[k].sent[0] === i) ?? free.find(k => p.eqs[k].sent.includes(i));
      if (hit !== undefined) {
        c.eq = hit; c.sub = s.mode === 'learn' ? 'phrase' : 'build'; c.fb = null; s.fresh = true;
      } else {
        c.sentWrong += 1;
        const usedIt = s.order.some(k => p.eqs[k].sent.includes(i));
        if (s.mode === 'learn' && c.sentWrong >= 2) {
          c.eq = free[0]; c.sub = 'phrase'; s.fresh = true;
          c.fb = fbOf('show', `It is this one: <em>“${esc(p.parsed[p.eqs[free[0]].sent[0]].text)}”</em> It ties the unknowns to a number.`);
        } else {
          c.fb = fbOf('try', usedIt ? 'You already used that clue. Find the sentence with a different relationship.' : 'That sentence sets the scene or asks the question. Look for one that connects the unknowns to a number.');
        }
      }
      save();
    },
    phrase(el) {
      const s = S(), p = prob(), c = s.clue, q = p.eqs[c.eq].phraseQ, i = Number(el.dataset.i);
      if (i === q.correct) { c.sub = 'build'; c.tried = []; c.fb = fbOf('good', `${rich(q.why, M())} Now build the whole equation.`); s.fresh = true; }
      else { c.tried.push(i); c.fb = fbOf('try', 'Think about what the phrase does to the quantity, then try again.'); }
      save();
    },
    tok(el) { const s = S(); pushTok(s.stage === 'clue' ? s.clue.tok : s.solve.tok, el.dataset.v, el.dataset.k); save(); },
    bksp() { const s = S(); popTok(s.stage === 'clue' ? s.clue.tok : s.solve.tok); save(); },
    clr() { const s = S(); (s.stage === 'clue' ? s.clue.tok : s.solve.tok).length = 0; save(); },
    hint() { const s = S(); if (s.clue.hints < 5) { s.clue.hints += 1; s.hints += 1; } save(); },
    'eq-check'() {
      const s = S(), p = prob(), c = s.clue, all = srcs(), src = tokSrc(c.tok);
      const free = p.eqs.map((e, k) => k).filter(k => !s.order.includes(k));
      const cands = c.eq !== null ? [c.eq] : free;
      const L = letsFor(p, M());
      const judge = k => diagnoseEquation(src, {
        target: all[k], others: c.eq !== null ? all.filter((_, j) => j !== k) : [],
        traps: p.eqs[k].traps.map(t => ({ ...t, src: inst(t.tpl, M()) })), swapMsg: p.eqs[k].swapMsg, lets: L, nudge: p.eqs[k].h1,
      });
      const results = cands.map(k => ({ k, d: judge(k) }));
      const win = results.find(r => r.d.ok);
      const accept = (k, revealed) => {
        const e = p.eqs[k];
        s.order.push(k); c.eq = k; c.sub = 'explain'; s.fresh = true;
        score(s, 'equations', { wrong: c.wrong, hint: c.hints, revealed, tag: e.tag });
        if (c.hints >= 4) s.assists += 1;
        const same = plain(tokenize(src)) === plain(tokenize(all[k]));
        c.fb = revealed ? fbOf('show', 'Study how each piece matches a phrase in the sentence.')
          : fbOf('good', esc(nod(s.order.length === 1 ? 'eq1' : 'eq2', store().name, s.id)) + (same ? '' : ` Yours says the same thing. We will carry it forward in this form.`));
      };
      if (win) accept(win.k, false);
      else {
        c.wrong += 1;
        const d = (results.find(r => !['structure', 'syntax'].includes(r.d.code)) || results[0]).d;
        store().logMistake(d.code);
        if (gameOut(s, c.wrong)) accept(cands[0], true);
        else c.fb = fbOf('try', rich(d.msg.replace(/^Not quite\. /, ''), M()));
      }
      save();
    },

    // STRATEGY
    strat(el) { const s = S(); s.strat.pick = el.dataset.v; planCache = null; save(); },
    'strat-go'() { const s = S(); s.strat.done = true; nextStage(); save(); },

    // SOLVE
    'step-why'() { S().solve.why = true; save(); },
    'step-check'() { stepResolve(false); },
    'step-show'() { stepResolve(true); },

    // CHECK
    'chk-check'() {
      const s = S(), ck = s.check, items = checkItems(), it = items[ck.i];
      const n = parseFloat(String(ck.num).replace(/[^0-9.\-]/g, ''));
      if (Number.isNaN(n)) { ck.fb = fbOf('info', 'Work out that side and enter the number.'); save(); return; }
      const ok = Math.abs(n - it.side.val) < 1e-6 * Math.max(1, Math.abs(it.side.val));
      if (ok || gameOut(s, ck.wrong + 1)) {
        score(s, 'check', { wrong: ck.wrong, revealed: !ok });
        ck.i += 1; ck.num = ''; ck.wrong = 0;
        const eqDone = !items.some((x, i) => x.e === it.e && i >= ck.i);
        ck.fb = ok ? (eqDone ? fbOf('good', esc(nod('check', store().name, ck.i))) : null) : fbOf('show', `That side works out to ${fmtNum(it.side.val)}.`);
      } else {
        ck.wrong += 1;
        ck.fb = fbOf('try', `Recalculate ${xy(it.side.sub)} carefully. Brackets first, then multiply, then add or subtract.`);
      }
      save();
    },

    // FINAL
    'final-check'() {
      const s = S(), p = prob(), f = s.final;
      const r = checkConclusion(f.text, p);
      if (r.ok) {
        f.ok = true; score(s, 'final', { wrong: f.wrong });
        f.fb = fbOf('good', esc(nod('final', store().name, s.id)) + (r.tip ? ` ${esc(r.tip)}` : ''));
      } else {
        f.wrong += 1; store().logMistake(r.code);
        if (gameOut(s, f.wrong)) { f.revealed = true; score(s, 'final', { revealed: true }); f.fb = fbOf('show', 'A sentence like this answers the question.'); }
        else f.fb = fbOf('try', esc(r.msg));
      }
      save();
    },
    finish() { finish(); save(); },

    // DONE
    again() { const s = S(); startProblem({ spec: s.scope === 'let' ? generate(nextCat(prob().cat), Date.now()) : nextSpec(s), mode: s.mode, scope: s.scope }); },
    'solve-this'() { const s = S(); startProblem({ spec: s.spec, mode: s.mode, scope: 'full' }); },
  },
};

function nextCat(cat) {
  const ids = ['numbers', 'ages', 'tickets', 'bills', 'mixture', 'investment', 'distance', 'wind'];
  return ids[(ids.indexOf(cat) + 1) % ids.length];
}

function stepResolve(show) {
  const s = S(), so = s.solve, pl = plan(), step = pl.steps[so.i];
  if (!step) return;
  let res;
  if (show) res = { ok: true };
  else if (step.kind === 'eq') {
    if (!so.tok.length) { so.fb = fbOf('info', 'Build the line first.'); save(); return; }
    res = step.expect(tokSrc(so.tok));
  } else {
    const n = parseFloat(String(so.num).replace(/[^0-9.\-]/g, ''));
    if (Number.isNaN(n)) { so.fb = fbOf('info', `Enter a number for ${step.v}.`); save(); return; }
    res = step.expect(n);
  }
  const forced = !res.ok && gameOut(s, so.wrong + 1);
  if (res.ok || forced) {
    const revealed = show || forced;
    score(s, 'algebra', { wrong: so.wrong, revealed });
    if (revealed) s.assists += 1;
    const typed = step.kind === 'eq' && !revealed ? plain(tokenize(tokSrc(so.tok))) : null;
    so.i += 1; so.tok = []; so.num = ''; so.wrong = 0; so.why = false;
    const last = so.i >= pl.steps.length;
    so.fb = revealed ? fbOf('show', `${xy(step.model)} is now on your paper. Read it and make sure you see where it came from.`)
      : fbOf('good', (typed && typed !== step.model ? `Accepted. On your paper it is written as ${xy(step.model)}. ` : '') + (last ? 'Both values found.' : esc(nod('solve', store().name, so.i))));
  } else {
    so.wrong += 1;
    so.fb = fbOf('try', esc(res.msg.replace(/^Not quite\. /, '')));
  }
  save();
}

/** Is there an unfinished problem to resume? */
export const hasLiveSession = () => { const s = S(); return !!s && s.stage !== 'done'; };
export function describeSession() {
  const s = S(); if (!s) return '';
  try { return `${titleOf(s, prob())} · ${s.mode}`; } catch { return ''; }
}
