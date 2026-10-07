// ---------------------------------------------------------------------------
// check.js — judges the three things Jaan WRITES:
//   1. Let statements      (does this describe one of the unknowns, precisely?)
//   2. Equations           (and if not, WHY not — the mistake diagnosis)
//   3. The concluding sentence
// Feedback is phrased as a coaching question, never just "wrong".
// ---------------------------------------------------------------------------
import { parseEquation, equivalent, swapXY, inst, z } from './math.js';
import { syntaxMessage } from './solver.js';

const norm = s => String(s).toLowerCase().replace(/[’‘]/g, "'").replace(/(\d),(?=\d{3})/g, '$1').replace(/\s+/g, ' ').trim();
const numbersIn = s => (norm(s).match(/\d+(?:\.\d+)?/g) || []).map(Number);

function hasKey(text, nums, key) {
  if (/^\d+(\.\d+)?$/.test(key)) return nums.includes(parseFloat(key));
  return text.includes(key);
}
const hitsAll = (text, nums, groups) => groups.every(g => g.some(k => hasKey(text, nums, k)));

/**
 * Which unknown does a typed Let statement describe?
 * @returns {{which:'p'|'q'|null, code?:string, msg?:string}}
 */
export function checkLet(raw, prob) {
  let text = norm(raw).replace(/^let\s+[xy]\s*(=|be|represent|represents|stand for)?\s*/, '');
  if (!text) return { which: null, code: 'empty', msg: 'Write what the variable stands for.' };
  const nums = numbersIn(text);
  const mp = hitsAll(text, nums, prob.q[0].keys);
  const mq = hitsAll(text, nums, prob.q[1].keys);
  if (mp && mq) {
    return { which: null, code: 'let-ambiguous', msg: 'That mentions both unknowns. One variable stands for exactly one quantity. Which one is this?' };
  }
  if (!mp && !mq) {
    const trap = (prob.letTraps || []).find(t => t.keys.some(k => hasKey(text, nums, k)));
    if (trap) return { which: null, code: 'let-known', msg: trap.msg };
    return { which: null, code: 'let-unknown', msg: 'I cannot match that to something the story leaves unknown. Name one quantity we still have to find.' };
  }
  const which = mp ? 'p' : 'q';
  const q = prob.q[mp ? 0 : 1];
  if (q.measure && !q.measure.some(k => text.includes(k))) {
    return { which, code: 'let-measure', msg: q.measureMsg || 'Close. A variable must stand for a number, so say what is being counted or measured.' };
  }
  return { which };
}

/** Does a fill-in-the-blank word match one of the unknowns? */
export function checkFill(raw, prob) {
  const text = norm(raw).replace(/[%$]/g, '');
  if (!text) return null;
  const nums = numbersIn(text);
  const hit = q => q.fill.some(k => hasKey(text, nums, k));
  const mp = hit(prob.q[0]), mq = hit(prob.q[1]);
  if (mp === mq) return null;
  return mp ? 'p' : 'q';
}

/**
 * Check the concluding sentence.
 * @returns {{ok:boolean, msg?:string, code?:string, tip?:string}}
 */
export function checkConclusion(raw, prob) {
  const text = norm(raw);
  const C = prob.conclusion;
  if (text.split(' ').filter(Boolean).length < 3) {
    return { ok: false, code: 'final-short', msg: 'Write a full sentence that answers the question the story asked.' };
  }
  const nums = numbersIn(text);
  const missing = C.needs.filter(n => !nums.some(v => Math.abs(v - n.value) < 1e-6));
  if (missing.length) {
    const other = (C.others || []).filter(o => nums.some(v => Math.abs(v - o.value) < 1e-6));
    if (other.length && missing.length === C.needs.length) {
      return { ok: false, code: 'final-wrong-quantity', msg: `You found ${other[0].what} correctly, but reread the question. What exactly is it asking for?` };
    }
    return { ok: false, code: 'final-missing', msg: C.needs.length > 1 ? 'The question asks for more than one thing. Does your sentence give every answer?' : 'Your sentence does not include the value the question asks for. Check which unknown it wants.' };
  }
  const bare = /\b[xy]\s*=/.test(text);
  const noWords = C.needs.some(n => n.words && !n.words.some(k => hasKey(text, nums, k)));
  if (bare && noWords) {
    return { ok: false, code: 'final-bare', msg: 'x and y only mean something in your own working. Say what the numbers are in the words of the story.' };
  }
  if (noWords) {
    return { ok: false, code: 'final-context', msg: 'The number is right. Now make the sentence say what that number is, so it answers the question on its own.' };
  }
  if (C.units && !C.units.some(u => text.includes(u))) {
    return { ok: false, code: 'final-units', msg: `Right value, but it needs its unit. ${C.unitHint || 'What is it measured in?'}` };
  }
  const tip = /^(therefore|so|thus|hence|∴)/.test(text) ? '' : 'Tip: starting with “Therefore,” signals to your teacher that this is your final answer.';
  return { ok: true, tip };
}

/**
 * Diagnose a built equation.
 * @param {string} src            what Jaan built (x / y)
 * @param {object} ctx
 *   target   {string} the correct equation (x / y)
 *   others   {string[]} other correct equations in this problem
 *   traps    {{src,msg,code}[]} known wrong versions, each with its own coaching
 *   swapMsg  {string?} special wording when x and y are reversed
 *   lets     {{x:string,y:string}} what each letter stands for
 *   nudge    {string} fallback guiding question
 */
export function diagnoseEquation(src, ctx) {
  let e;
  try { e = parseEquation(src); } catch (err) { return { ok: false, code: 'syntax', msg: syntaxMessage(err) }; }
  const T = parseEquation(ctx.target);
  if (equivalent(e, T)) return { ok: true };

  if (z(e.a) && z(e.b)) {
    return { ok: false, code: 'no-variables', msg: 'There are no unknowns in that equation, so it cannot tell us anything about x or y. Which quantities does this sentence connect?' };
  }
  for (const o of ctx.others || []) {
    if (equivalent(e, parseEquation(o))) {
      return { ok: false, code: 'other-clue', msg: 'That equation is true, but it comes from a different sentence. What does THIS sentence say?' };
    }
  }
  for (const t of ctx.traps || []) {
    let te;
    try { te = parseEquation(t.src); } catch { continue; }
    if (equivalent(e, te)) return { ok: false, code: t.code || 'trap', msg: t.msg };
  }
  const sw = swapXY(T);
  if (!equivalent(sw, T) && equivalent(e, sw)) {
    return {
      ok: false, code: 'swap',
      msg: ctx.swapMsg || `This would be right if x and y traded places. Look at your Let statements: x is ${ctx.lets.x} and y is ${ctx.lets.y}. Does each letter sit where its quantity belongs?`,
    };
  }
  const needsBoth = !z(T.a) && !z(T.b);
  if (needsBoth && (z(e.a) || z(e.b))) {
    return { ok: false, code: 'one-variable', msg: 'This sentence connects both unknowns, but your equation only uses one of them. Where does the other one belong?' };
  }
  // Same variable side, different number?
  const sameVars = Math.abs(e.a * T.b - e.b * T.a) < 1e-7 * Math.max(1, Math.abs(e.a * T.b));
  if (sameVars && e.a * T.a >= 0 && e.b * T.b >= 0) {
    return { ok: false, code: 'constant', msg: 'The variable part looks right. Now check the number it equals. Which number does this sentence actually give?' };
  }
  if (z(Math.abs(e.a) - Math.abs(T.a)) && z(Math.abs(e.b) - Math.abs(T.b)) && z(Math.abs(e.c) - Math.abs(T.c))) {
    return { ok: false, code: 'sign', msg: 'The pieces are right but an operation is off. Is the sentence combining amounts, or comparing them?' };
  }
  return { ok: false, code: 'structure', msg: `Not quite. ${ctx.nudge || 'Read the sentence in chunks and translate one chunk at a time.'}` };
}

/** Diagnose a built expression (no equals sign) for Translation Lab drills. */
export function instTraps(traps, map) {
  return (traps || []).map(t => ({ ...t, src: inst(t.tpl, map) }));
}
