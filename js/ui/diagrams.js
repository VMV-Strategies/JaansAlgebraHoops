// diagrams.js — small inline SVG pictures, one per problem type.
// Pure SVG + CSS classes, so they work offline and follow light/dark mode.
// Before Jaan writes his Let statements the unknowns show as "?".
import { esc } from './dom.js';

const svg = (label, body, h = 132) => `<svg class="dg" viewBox="0 0 320 ${h}" role="img" aria-label="${esc(label)}">${body}</svg>`;
const T = (x, y, s, c = 'dg-cap', anchor = 'middle') => `<text x="${x}" y="${y}" class="${c}" text-anchor="${anchor}">${esc(s)}</text>`;
const sym = (x, y, s) => `<text x="${x}" y="${y}" class="dg-sym" text-anchor="middle">${esc(s)}</text>`;
const tile = (x, y, w, h, c = 'dg-tile') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" class="${c}"/>`;
const arrow = (x1, y1, x2, y2, c = 'dg-line') => {
  const a = Math.atan2(y2 - y1, x2 - x1), s = 7;
  const p = k => `${x2 - s * Math.cos(a + k)},${y2 - s * Math.sin(a + k)}`;
  return `<path d="M${x1} ${y1}L${x2} ${y2}" class="${c}"/><path d="M${p(0.5)}L${x2} ${y2}L${p(-0.5)}" class="${c}"/>`;
};

/** Two labelled boxes that combine into a result. */
function pair({ a, b, capA, capB, subA = '', subB = '', op = '+', result = '', label }) {
  return svg(label,
    tile(8, 14, 104, 70) + sym(60, 60, a) + T(60, 102, capA) + (subA ? T(60, 119, subA, 'dg-sub') : '') +
    T(126, 58, op, 'dg-op') +
    tile(140, 14, 104, 70) + sym(192, 60, b) + T(192, 102, capB) + (subB ? T(192, 119, subB, 'dg-sub') : '') +
    (result ? T(258, 58, '=', 'dg-op') + T(290, 56, result, 'dg-total') : ''));
}

function mix({ a, b, d }) {
  const beaker = (x, w, h, fill, lab, sub) => {
    const top = 96 - h;
    return `<path d="M${x} ${top}v${h - 6}a6 6 0 0 0 6 6h${w - 12}a6 6 0 0 0 6-6v-${h - 6}" class="dg-line"/>
      <rect x="${x + 3}" y="${96 - (h - 8) * fill}" width="${w - 6}" height="${(h - 8) * fill - 3}" rx="3" class="dg-fill"/>
      ${T(x + w / 2, 114, lab)}${T(x + w / 2, 129, sub, 'dg-sub')}`;
  };
  return svg(`Two solutions, ${d.c1} percent and ${d.c2} percent, poured together to make ${d.T} ${d.unit} at ${d.ct} percent`,
    beaker(14, 62, 70, d.c1 / 100, `${a} ${d.unit}`, `${d.c1}%`) + T(96, 60, '+', 'dg-op') +
    beaker(116, 62, 70, d.c2 / 100, `${b} ${d.unit}`, `${d.c2}%`) + arrow(190, 56, 218, 56) +
    beaker(230, 78, 84, d.ct / 100, `${d.T} ${d.unit}`, `${d.ct}%`), 134);
}

function trip({ a, b, d }) {
  const split = 28 + 264 * (d.v1 / (d.v1 + d.v2));
  return svg(`A ${d.D} kilometre trip in two parts, at ${d.v1} and ${d.v2} kilometres per hour`,
    `<path d="M28 62H292" class="dg-road"/><path d="M28 62H${split}" class="dg-road dg-road-a"/>
     <circle cx="28" cy="62" r="6" class="dg-dot"/><circle cx="${split}" cy="62" r="6" class="dg-dot"/><circle cx="292" cy="62" r="6" class="dg-dot"/>` +
    T((28 + split) / 2, 42, `${d.v1} km/h`) + T((split + 292) / 2, 42, `${d.v2} km/h`) +
    T((28 + split) / 2, 88, `${a} h`, 'dg-symsm') + T((split + 292) / 2, 88, `${b} h`, 'dg-symsm') +
    T(160, 118, `${d.D} km in ${d.T} h altogether`, 'dg-sub'), 126);
}

function windDg({ a, b, d, reveal }) {
  const craft = d.craft === 'boat'
    ? x => `<path d="M${x - 18} 0h36l-7 10h-22z" class="dg-solid"/><path d="M${x} -2v-16l11 14z" class="dg-solid"/>`
    : x => `<path d="M${x - 20} 0h30l8 4-8 4h-30l4-4z" class="dg-solid"/><path d="M${x - 6} 0l-8-12h6l12 12zM${x - 6} 8l-8 12h6l12-12z" class="dg-solid"/>`;
  const row = (y, against) => `<g transform="translate(0 ${y})">${craft(96)}</g>` +
    arrow(124, y + 4, 176, y + 4) + T(150, y - 6, a, 'dg-symsm') +
    (against ? arrow(292, y + 4, 240, y + 4, 'dg-line dg-warn') : arrow(240, y + 4, 292, y + 4, 'dg-line dg-good')) + T(266, y - 6, b, 'dg-symsm') +
    T(8, y + 9, against ? 'against' : 'with', 'dg-cap', 'start') +
    (reveal ? T(210, y + 30, against ? `speed = ${a} − ${b}` : `speed = ${a} + ${b}`, 'dg-sub') : '');
  return svg(`A ${d.craft} travelling against and then with the ${d.med}`, row(34, true) + row(98, false), 140);
}

/**
 * @param {object} prob  a built problem
 * @param {{p:string,q:string}|null} map  Jaan's letters, or null before the Let step
 * @param {boolean} reveal  show relationships that would otherwise give an equation away
 */
export function diagram(prob, map, reveal = false) {
  const a = map ? map.p : '?', b = map ? map.q : '?';
  const d = prob.diagram, P = prob.spec.params;
  const [q1, q2] = prob.q;
  switch (d.type) {
    case 'score':
      return pair({ a, b, capA: 'larger number', capB: 'smaller number', op: P.variant === 'sumdiff' ? '+' : '&', result: P.variant === 'sumdiff' ? String(P.S) : '', label: 'Two unknown numbers shown as scoreboard tiles' });
    case 'ages':
      return pair({ a, b, capA: `${d.n1}’s age`, capB: `${d.n2}’s age`, op: '&', label: `Two unknown ages: ${d.n1} and ${d.n2}` });
    case 'tickets':
      return pair({ a, b, capA: 'adult tickets', capB: 'student tickets', subA: `$${d.A} each`, subB: `$${d.B} each`, result: `$${d.R}`, label: 'Adult and student ticket stacks adding to the money collected' });
    case 'value':
      return pair({ a, b, capA: d.a, capB: d.b, subA: 'how many?', subB: 'how many?', result: d.total, label: `${d.a} and ${d.b} adding up to ${d.total}` });
    case 'invest':
      return pair({ a, b, capA: `at ${d.r1}%`, capB: `at ${d.r2}%`, subA: 'dollars', subB: 'dollars', result: `$${d.total}`, label: `$${d.total} split between ${d.r1} percent and ${d.r2} percent` });
    case 'mix': return mix({ a, b, d });
    case 'trip': return trip({ a, b, d });
    case 'wind': return windDg({ a, b, d, reveal });
    default: return pair({ a, b, capA: q1.short, capB: q2.short, label: 'The two unknowns' });
  }
}
