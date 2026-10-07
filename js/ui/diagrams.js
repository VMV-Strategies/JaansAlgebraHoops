// ---------------------------------------------------------------------------
// diagrams.js — a picture for every problem.
//
// The picture GROWS as Jaan works, so it helps him see the problem without
// handing him the answer:
//   1. while reading        the facts from the story, unknowns shown as "?"
//   2. after Let statements  the unknowns are labelled x and y
//   3. after each equation   the relationship he just built appears
//   4. after solving         real values, drawn to scale
//
// Three kinds of picture are used, the same ones math teachers draw:
//   • bar models   (number and age problems)
//   • a chart      (tickets, bills, mixtures, interest, distance: the classic
//                   "how many × value of each = total" table)
//   • a sketch     (beakers, a road, a plane in the wind)
//
// Everything is inline SVG/HTML, so it works offline and in light or dark mode.
// ---------------------------------------------------------------------------
import { esc, xy } from './dom.js';
import { fmtNum } from '../core/math.js';

const TIMES = { 2: 'twice', 3: '3 times', 4: '4 times', 5: '5 times', 6: '6 times' };
const money = n => (Number.isInteger(n) ? String(n) : Number(n).toFixed(2));
const dec = pct => (pct / 100).toFixed(2);

const svg = (label, body, h) => `<svg class="dg" viewBox="0 0 320 ${h}" role="img" aria-label="${esc(label)}">${body}</svg>`;
const T = (x, y, s, c = 'dg-cap', anchor = 'middle') => `<text x="${x}" y="${y}" class="${c}" text-anchor="${anchor}">${esc(s)}</text>`;
const arrow = (x1, y1, x2, y2, c = 'dg-line') => {
  const a = Math.atan2(y2 - y1, x2 - x1), s = 7;
  const p = k => `${(x2 - s * Math.cos(a + k)).toFixed(1)},${(y2 - s * Math.sin(a + k)).toFixed(1)}`;
  return `<path d="M${x1} ${y1}L${x2} ${y2}" class="${c}"/><path d="M${p(0.5)}L${x2} ${y2}L${p(-0.5)}" class="${c}"/>`;
};

/** Work out what the picture is allowed to show at this point. */
function view(prob, st = {}) {
  const map = st.map || null;
  const sol = st.sol || null;
  const built = tag => prob.eqs.some((e, i) => e.tag === tag && st.eqs && st.eqs[i]);
  const sym = i => (map ? (i === 0 ? map.p : map.q) : '?');
  const val = i => (sol ? (i === 0 ? sol.p : sol.q) : null);
  /** "x", or "x = 142" once solved */
  const lab = i => (sol ? `${sym(i)} = ${fmtNum(val(i))}` : sym(i));
  return { map, sol, built, sym, val, lab };
}

// ---- BAR MODELS (numbers, ages) --------------------------------------------------
function bars(prob, v) {
  const P = prob.spec.params, X0 = 10, MAX = 190, Y1 = 24, Y2 = 96, H = 32;
  const cap = prob.cat === 'ages' ? [`${P.n1}’s age`, `${P.n2}’s age`] : ['larger number', 'smaller number'];
  const variant = P.variant;
  const unit = prob.cat === 'ages' ? ' years' : '';
  let w1 = MAX, w2 = 124, body = '', foot = '', seg = null, plus = null;

  if (v.sol) { const sc = MAX / Math.max(v.sol.p, v.sol.q); w1 = Math.max(34, v.sol.p * sc); w2 = Math.max(34, v.sol.q * sc); }

  // "M times the other, plus or minus K": draw the first bar as M copies of the second.
  const M = P.M, K = P.K;
  const copies = ['more', 'less', 'times'].includes(variant);
  if (copies) {
    const less = variant === 'less';
    if (v.sol) { const sc = MAX / v.sol.p; w2 = v.sol.q * sc; w1 = MAX; seg = { u: w2, k: K * sc, less }; }
    else { const u = 44, k = less ? 12 : 22; w2 = u; seg = { u, k, less }; w1 = less ? M * u - k : M * u + k; }
  }
  if (variant === 'future') plus = { n: P.N, w: v.sol ? Math.max(12, P.N * (MAX / (v.sol.p + P.N))) : 26 };
  if (plus && v.sol) { const sc = MAX / (v.sol.p + P.N); w1 = v.sol.p * sc; w2 = Math.max(26, v.sol.q * sc); }

  // The label sits inside the bar when it fits; otherwise it joins the caption above.
  const bar = (y, w, cls, text, caption, room = w) => {
    const fits = text && text.length * 10 + 10 <= room;
    return `<rect x="${X0}" y="${y}" width="${w.toFixed(1)}" height="${H}" rx="7" class="dg-bar ${cls}"/>` +
      T(X0, y - 7, fits || !text ? caption : `${caption}:  ${text}`, 'dg-cap', 'start') + (fits ? T(X0 + room / 2, y + 22, text, 'dg-symsm') : '');
  };
  const shaded = ['sumdiff', 'older', 'future'].includes(variant);
  body += (seg ? bar(Y1, w1, 'dg-bar-a', '', `${cap[0]}:  ${v.lab(0)}`) : bar(Y1, w1, 'dg-bar-a', v.lab(0), cap[0], shaded ? w2 : w1)) + bar(Y2, w2, 'dg-bar-b', v.lab(1), cap[1]);

  if (seg) {
    // dividers showing M copies of the smaller bar inside the larger one
    for (let k = 1; k <= M; k++) {
      const x = X0 + k * seg.u;
      if (k < M || !seg.less) body += `<path d="M${x.toFixed(1)} ${Y1}v${H}" class="dg-div"/>`;
      if (seg.u >= 20 && !(seg.less && k === M && seg.u - seg.k < 26)) body += T(X0 + (k - 0.5) * seg.u, Y1 + 21, v.sym(1), 'dg-symxs');
    }
    const kx = seg.less ? X0 + M * seg.u - seg.k : X0 + M * seg.u;
    body += `<rect x="${kx.toFixed(1)}" y="${Y1}" width="${Math.max(6, seg.k).toFixed(1)}" height="${H}" rx="4" class="${seg.less ? 'dg-gap' : 'dg-extra'}"/>`;
    body += T(X0, Y1 + H + 15, `${TIMES[M] || M + ' times'} the ${prob.cat === 'ages' ? 'other age' : 'smaller'}${seg.less ? ', less ' + K : ', plus ' + K}`, 'dg-sub', 'start');
  }

  // "D more than": shade the part of the long bar that sticks out past the short one
  const D = variant === 'sumdiff' || variant === 'older' || variant === 'future' ? P.D : null;
  if (D != null) {
    const x = X0 + w2, w = Math.max(8, w1 - w2);
    body += `<rect x="${x.toFixed(1)}" y="${Y1}" width="${w.toFixed(1)}" height="${H}" rx="5" class="dg-extra"/>` +
      `<path d="M${x.toFixed(1)} ${Y1 + H}V${Y2}" class="dg-guide"/>` +
      T(x + w / 2, Y1 + H + 15, `${D}${unit} ${prob.cat === 'ages' ? 'older' : 'more'}`, 'dg-note');
  }
  if (plus) {
    [[Y1, w1], [Y2, w2]].forEach(([y, w]) => {
      body += `<rect x="${(X0 + w + 3).toFixed(1)}" y="${y}" width="${plus.w.toFixed(1)}" height="${H}" rx="5" class="dg-gap"/>` + T(X0 + w + 3 + plus.w / 2, y + 21, `+${plus.n}`, 'dg-note');
    });
    foot = `In ${P.N} years: ${P.n1}’s bar = ${P.M} × ${P.n2}’s bar`;
  }
  if (variant === 'combo') foot = `${P.A} of the larger + ${P.B} of the smaller = ${P.T}`;

  // "together they make S": a bracket down the right-hand side
  const S = ['sumdiff', 'older', 'times', 'more', 'less', 'combo'].includes(variant) ? P.S : null;
  if (S != null) {
    const bx = 262;
    body += `<path d="M${bx - 6} ${Y1}h6V${Y2 + H}h-6" class="dg-line"/>` + T(bx + 6, (Y1 + Y2 + H) / 2 - 3, 'together', 'dg-sub', 'start') + T(bx + 6, (Y1 + Y2 + H) / 2 + 14, `${S}`, 'dg-total', 'start');
  }
  if (foot) body += T(X0, Y2 + H + 22, foot, 'dg-sub', 'start');
  return svg(`Bar model: ${cap[0]} and ${cap[1]}`, body, foot ? Y2 + H + 30 : Y2 + H + 8);
}

// ---- CHART: how many × value of each = total ----------------------------------------
const Q = '<span class="chart-q">?</span>';
function chart(caption, head, rows, total) {
  const tr = (cells, cls = '') => `<tr${cls ? ` class="${cls}"` : ''}><th scope="row">${cells[0]}</th>${cells.slice(1).map(c => `<td>${c}</td>`).join('')}</tr>`;
  return `<table class="chart"><caption>${esc(caption)}</caption>
    <thead><tr><td></td>${head.map(h => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(r => tr(r)).join('')}${total ? tr(total, 'chart-total') : ''}</tbody></table>`;
}
/** "5x", then "5x = 710" once solved; "?" until that equation has been built. */
function product(v, i, coef, shown, unit = '') {
  if (!shown) return Q;
  const base = xy(`${coef}${v.sym(i)}`);
  if (!v.sol) return base;
  const n = Number(coef) * v.val(i);
  return `${base}<small>= ${unit === '$' ? '$' : ''}${fmtNum(n)}${unit && unit !== '$' ? ' ' + unit : ''}</small>`;
}
const count = (v, i, unit = '') => (v.map ? `${xy(v.sol ? `${v.sym(i)} = ${fmtNum(v.val(i))}` : v.sym(i))}${v.sol && unit ? `<small>${esc(unit)}</small>` : ''}` : Q);

function valueChart(prob, v) {
  const P = prob.spec.params;
  if (prob.cat === 'tickets') {
    const A = money(P.A), B = money(P.B);
    return chart('Tickets: how many × price = money', ['How many', 'Price each', 'Money in'], [
      ['Adult', count(v, 0), `$${A}`, product(v, 0, A, v.built('value'), '$')],
      ['Student', count(v, 1), `$${B}`, product(v, 1, B, v.built('value'), '$')],
    ], ['Together', P.N != null ? `${P.N}` : '<span class="chart-na">not given</span>', '', `$${money(P.R)}`]);
  }
  if (prob.cat === 'investment') {
    return chart('Interest = rate × amount', ['Amount', 'Rate', 'Interest'], [
      [`At ${P.r1}%`, count(v, 0), `${P.r1}% = ${dec(P.r1)}`, product(v, 0, dec(P.r1), v.built('percent'), '$')],
      [`At ${P.r2}%`, count(v, 1), `${P.r2}% = ${dec(P.r2)}`, product(v, 1, dec(P.r2), v.built('percent'), '$')],
    ], ['Together', `$${P.P}`, '', `$${P.I}`]);
  }
  // bills, coins, baskets
  const d = prob.diagram, pts = P.kind === 'baskets';
  const worth = n => (pts ? `${n} pts` : `$${money(n)}`);
  return chart(pts ? 'Baskets: how many × points each = points' : 'How many × value of each = total value', ['How many', pts ? 'Points each' : 'Worth each', pts ? 'Points' : 'Value'], [
    [esc(d.a), count(v, 0), worth(P.A), product(v, 0, money(P.A), v.built('value'), pts ? 'pts' : '$')],
    [esc(d.b), count(v, 1), worth(P.B), product(v, 1, money(P.B), v.built('value'), pts ? 'pts' : '$')],
  ], ['Together', `${P.N}`, '', pts ? `${P.V} pts` : `$${money(P.V)}`]);
}

// ---- SKETCHES -------------------------------------------------------------------------
function mixSketch(prob, v) {
  const d = prob.diagram;
  const amt = i => (v.sol ? `${fmtNum(v.val(i))} ${d.unit}` : `${v.sym(i)} ${d.unit}`);
  const beaker = (x, w, h, fill, lab, sub) => {
    const top = 92 - h;
    return `<rect x="${x + 3}" y="${(92 - (h - 8) * fill).toFixed(1)}" width="${w - 6}" height="${((h - 8) * fill - 3).toFixed(1)}" rx="3" class="dg-fill"/>
      <path d="M${x} ${top}v${h - 6}a6 6 0 0 0 6 6h${w - 12}a6 6 0 0 0 6-6v-${h - 6}" class="dg-line"/>
      ${T(x + w / 2, top - 6, sub, 'dg-cap')}${T(x + w / 2, 112, lab, 'dg-symxs')}`;
  };
  // once solved, beaker heights show the real proportions
  const h = i => (v.sol ? 36 + 44 * (v.val(i) / d.T) : 62);
  return svg(`Two solutions, ${d.c1} percent and ${d.c2} percent, poured together to make ${d.T} ${d.unit} at ${d.ct} percent`,
    beaker(12, 64, h(0), d.c1 / 100, amt(0), `${d.c1}%`) + T(96, 62, '+', 'dg-op') +
    beaker(116, 64, h(1), d.c2 / 100, amt(1), `${d.c2}%`) + arrow(192, 58, 220, 58) +
    beaker(232, 78, 80, d.ct / 100, `${d.T} ${d.unit}`, `${d.ct}%`), 120);
}
function mixChart(prob, v) {
  const P = prob.spec.params, d = prob.diagram, M = prob._M;
  const on = v.built('percent');
  return chart(`Pure ${M.stuff} = strength × amount`, [`Amount (${d.unit})`, 'Strength', `Pure ${M.stuff}`], [
    [`${P.c1}% solution`, count(v, 0), dec(P.c1), product(v, 0, dec(P.c1), on, d.unit)],
    [`${P.c2}% solution`, count(v, 1), dec(P.c2), product(v, 1, dec(P.c2), on, d.unit)],
  ], ['Mixture', `${P.T}`, dec(P.ct), on ? `${xy(`${dec(P.ct)}(${P.T})`)}${v.sol ? `<small>= ${fmtNum(P.ct * P.T / 100)} ${d.unit}</small>` : ''}` : Q]);
}

function tripSketch(prob, v) {
  const d = prob.diagram;
  // before solving: split the road evenly; after: split by the real distances
  const share = v.sol ? (d.v1 * v.val(0)) / d.D : 0.5;
  const split = 28 + 264 * Math.min(0.85, Math.max(0.15, share));
  const hours = i => (v.sol ? `${fmtNum(v.val(i))} h` : `${v.sym(i)} h`);
  const km = i => (v.sol ? `${fmtNum((i ? d.v2 : d.v1) * v.val(i))} km` : '');
  return svg(`A ${d.D} kilometre trip in two parts, at ${d.v1} and ${d.v2} kilometres per hour`,
    `<path d="M28 58H292" class="dg-road"/><path d="M28 58H${split.toFixed(1)}" class="dg-road dg-road-a"/>
     <circle cx="28" cy="58" r="6" class="dg-dot"/><circle cx="${split.toFixed(1)}" cy="58" r="6" class="dg-dot"/><circle cx="292" cy="58" r="6" class="dg-dot"/>` +
    T((28 + split) / 2, 38, `${d.v1} km/h`) + T((split + 292) / 2, 38, `${d.v2} km/h`) +
    T((28 + split) / 2, 84, hours(0), 'dg-symxs') + T((split + 292) / 2, 84, hours(1), 'dg-symxs') +
    (v.sol ? T((28 + split) / 2, 100, km(0), 'dg-sub') + T((split + 292) / 2, 100, km(1), 'dg-sub') : '') +
    `<path d="M28 ${v.sol ? 112 : 100}v6H292v-6" class="dg-line"/>` + T(160, v.sol ? 134 : 122, `${d.D} km in ${d.T} h altogether`, 'dg-sub'), v.sol ? 140 : 128);
}
function tripChart(prob, v) {
  const P = prob.spec.params, on = v.built('rate');
  return chart('distance = speed × time', ['Time (h)', 'Speed', 'Distance'], [
    ['First part', count(v, 0), `${P.v1} km/h`, product(v, 0, P.v1, on, 'km')],
    ['The rest', count(v, 1), `${P.v2} km/h`, product(v, 1, P.v2, on, 'km')],
  ], ['Whole trip', `${P.T}`, '', `${P.D} km`]);
}

function windSketch(prob, v) {
  const d = prob.diagram;
  const craft = d.craft === 'boat'
    ? x => `<path d="M${x - 18} 0h36l-7 10h-22z" class="dg-solid"/><path d="M${x} -2v-16l11 14z" class="dg-solid"/>`
    : x => `<path d="M${x - 20} 0h30l8 4-8 4h-30l4-4z" class="dg-solid"/><path d="M${x - 6} 0l-8-12h6l12 12zM${x - 6} 8l-8 12h6l12-12z" class="dg-solid"/>`;
  const speed = i => (v.sol ? `${fmtNum(v.val(i))}` : v.sym(i));
  const row = (y, against, shown) => {
    const net = v.sol ? fmtNum(against ? v.val(0) - v.val(1) : v.val(0) + v.val(1)) : null;
    return `<g transform="translate(0 ${y})">${craft(100)}</g>` +
      arrow(128, y + 4, 180, y + 4) + T(154, y - 6, speed(0), 'dg-symxs') +
      (against ? arrow(292, y + 4, 240, y + 4, 'dg-line dg-warn') : arrow(240, y + 4, 292, y + 4, 'dg-line dg-good')) + T(266, y - 6, speed(1), 'dg-symxs') +
      T(8, y + 9, against ? 'against' : 'with', 'dg-cap', 'start') +
      (shown ? T(210, y + 30, `actual speed = ${v.sym(0)} ${against ? '−' : '+'} ${v.sym(1)}${net ? ` = ${net} km/h` : ''}`, 'dg-sub') : T(210, y + 30, against ? `the ${d.med} pushes back` : `the ${d.med} helps`, 'dg-sub'));
  };
  const b = i => prob.eqs[i] && v.builtAt(i);
  return svg(`A ${d.craft} travelling against and then with the ${d.med}`, row(34, true, b(0)) + row(102, false, b(1)), 142);
}
function windChart(prob, v) {
  const P = prob.spec.params;
  const sp = (i, sign) => {
    if (!v.builtAt(i)) return Q;
    const e = xy(`${v.sym(0)} ${sign} ${v.sym(1)}`);
    return v.sol ? `${e}<small>= ${fmtNum(sign === '-' ? v.val(0) - v.val(1) : v.val(0) + v.val(1))} km/h</small>` : e;
  };
  return chart('distance = speed × time', ['Actual speed', 'Time', 'Distance'], [
    ['Against', sp(0, '-'), `${P.t1} h`, `${P.D} km`],
    ['With', sp(1, '+'), `${P.t2} h`, `${P.D} km`],
  ]);
}

/**
 * @param {object} prob  a built problem
 * @param {{map?:{p:string,q:string}|null, eqs?:boolean[], sol?:{p:number,q:number}|null}} st
 *        map  = Jaan's letters (after the Let step)
 *        eqs  = which equations he has built so far (same order as prob.eqs)
 *        sol  = the solved values, once he has found them
 */
export function diagram(prob, st = {}) {
  const v = view(prob, st);
  v.builtAt = i => !!(st.eqs && st.eqs[i]);
  let parts;
  switch (prob.cat) {
    case 'numbers': case 'ages': parts = [bars(prob, v)]; break;
    case 'mixture': parts = [mixSketch(prob, v), mixChart(prob, v)]; break;
    case 'distance': parts = [tripSketch(prob, v), tripChart(prob, v)]; break;
    case 'wind': parts = [windSketch(prob, v), windChart(prob, v)]; break;
    default: parts = [valueChart(prob, v)];
  }
  return `<div class="dgwrap">${parts.join('')}</div>`;
}

/** One line under the picture saying what it is showing right now. */
export function diagramCaption(prob, st = {}) {
  if (st.sol) return 'Solved: the picture now shows the real values.';
  const n = (st.eqs || []).filter(Boolean).length;
  if (n === 2) return 'Both relationships are on the picture. Now solve for the two unknowns.';
  if (n === 1) return 'One relationship is on the picture. Find the second.';
  if (st.map) return 'The unknowns now have their letters. What does the story say connects them?';
  return 'The facts from the story. A “?” marks what we do not know yet.';
}
