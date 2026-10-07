// paper.js — the "Show My Teacher" solution.
// Produces the lines Jaan would actually write on paper, and (optionally) the
// learning notes that explain each part. The two are kept visibly separate.
import { inst } from '../core/math.js';
import { buildPlan, LABELS } from '../core/solver.js';
import { STAGE_TEXT, STRATEGY_TEXT } from '../content/teaching.js';
import { esc, rich, xy } from './dom.js';
import { fmtNum } from '../core/math.js';

export const letsFor = (prob, map) => ({ [map.p]: prob.q[0].desc, [map.q]: prob.q[1].desc });

/**
 * @returns {object[]} blocks: {k:'text'|'line'|'stack'|'gap'|'why'|'ls', ...}
 */
export function solutionBlocks(prob, map, strategy, { notes = false, eli = 10, final = null } = {}) {
  const srcs = prob.eqs.map(e => inst(e.tpl, map));
  const plan = buildPlan(srcs, strategy);
  const lets = letsFor(prob, map);
  const why = s => (notes ? [{ k: 'why', s }] : []);
  const out = [
    { k: 'text', s: `Let x = ${lets.x}` }, { k: 'text', s: `Let y = ${lets.y}` },
    ...why(STAGE_TEXT.lets[eli]), { k: 'gap' },
  ];
  srcs.forEach((src, i) => { out.push({ k: 'line', src, tag: LABELS[i] }); out.push(...why(prob.eqs[i].explain[eli])); });
  out.push({ k: 'gap' });
  out.push(...why(`${STRATEGY_TEXT[plan.strategy].name}: ${prob.strategy.best === plan.strategy ? prob.strategy.why : STRATEGY_TEXT[plan.strategy][eli]}`));
  out.push(...plan.paper, { k: 'gap' });
  plan.checks.forEach((c, i) => {
    out.push({ k: 'text', s: `Check in ${LABELS[i]}:` });
    out.push({ k: 'ls', label: 'L.S.', side: c.L }, { k: 'ls', label: 'R.S.', side: c.R }, { k: 'text', s: 'L.S. = R.S. ✓' });
  });
  out.push(...why(STAGE_TEXT.check[eli]), { k: 'gap' });
  out.push({ k: 'text', s: final || prob.conclusion.model, cls: 'final' });
  out.push(...why(STAGE_TEXT.final[eli]));
  return out;
}

const side = s => {
  const parts = [];
  if (s.hasVar) parts.push(xy(s.src));
  if (s.sub !== s.src || !s.hasVar) parts.push(xy(s.sub));
  const val = fmtNum(s.val);
  if (s.sub.replace(/\s/g, '') !== val) parts.push(xy(val));
  return parts.join('<span class="o">=</span>');
};

export function paperHTML(blocks, map = { p: 'x', q: 'y' }) {
  return blocks.map(b => {
    switch (b.k) {
      case 'gap': return '<div class="pp-gap"></div>';
      case 'text': return `<div class="pp-text${b.cls ? ' pp-' + b.cls : ''}">${esc(b.s).replace(/\b([xy])\b(?= =)/g, '<i class="v">$1</i>')}</div>`;
      case 'why': return `<div class="pp-why">${rich(b.s, map)}</div>`;
      case 'line': return `<div class="pp-line"><span>${xy(b.src)}</span>${b.tag || b.note ? `<span class="pp-tag">${esc([b.tag, b.note && `(${b.note})`].filter(Boolean).join(' '))}</span>` : ''}</div>`;
      case 'ls': return `<div class="pp-line"><span><span class="pp-ls">${b.label} =</span> ${side(b.side)}</span></div>`;
      case 'stack': return `<div class="pp-stack">
          ${b.rows.map(r => `<div class="pp-line"><span>${xy(r.src)}</span><span class="pp-tag">${esc(r.tag)}</span></div>`).join('')}
          <div class="pp-rule"></div>
          <div class="pp-line"><span>${xy(b.result)}</span><span class="pp-tag">${esc(b.op)}</span></div></div>`;
      default: return '';
    }
  }).join('');
}
