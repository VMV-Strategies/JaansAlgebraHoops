// ---------------------------------------------------------------------------
// solver.js — turns two equations into a STEP-BY-STEP plan.
//
// buildPlan() returns
//   steps : what Jaan is asked to enter, each with a checker and a model answer
//   paper : the lines he would write on paper ("Show My Teacher")
// The same plan drives the Solve screen and the teacher view, so the two can
// never disagree.
// ---------------------------------------------------------------------------
import {
  parseEquation, MathError, fmtLin, fmtStd, fmtNum, equivalent, solve2, holdsAt,
  subst, z, isInt, gcd, clean, parseExpr, evalLin,
} from './math.js';

export const LABELS = ['①', '②', '③', '④'];
const other = v => (v === 'x' ? 'y' : 'x');
const coef = (e, v) => (v === 'x' ? e.a : e.b);
const scaleEq = (e, k) => ({ a: clean(e.a * k), b: clean(e.b * k), c: clean(e.c * k) });
const tight = s => s.replace(/\s+/g, '');

/** Friendly wording for parser errors. */
export function syntaxMessage(err) {
  if (!(err instanceof MathError)) return 'I could not read that. Check it and try again.';
  switch (err.code) {
    case 'no-equals': return 'An equation needs an equals sign. What is equal to what?';
    case 'many-equals': return 'Use just one equals sign per equation.';
    case 'empty-side': return 'One side of the equals sign is empty. What goes there?';
    case 'two-numbers': return `Two numbers are sitting side by side (${err.detail}). Put an operation between them.`;
    case 'nonlinear': return 'That multiplies or divides the two unknowns by each other. Does the story do that?';
    case 'paren': return 'Check the brackets: every ( needs a matching ).';
    case 'incomplete': return 'That looks unfinished. Something is missing after an operation.';
    case 'bad-char': return `I only understand x, y, numbers and + − × ÷ ( ) =. I got stuck on “${err.detail}”.`;
    case 'div-zero': return 'That divides by zero.';
    default: return 'Something is out of order. Read it aloud piece by piece.';
  }
}

function describe(src) {
  const e = parseEquation(src);
  const rhs = src.split('=')[1];
  const vars = (src.match(/[xy]/g) || []);
  const isStd = z(e.L.c) && z(e.R.x) && z(e.R.y) && !/[()]/.test(src) &&
    /^\s*-?[\d.,]+\s*$/.test(rhs) && vars.filter(v => v === 'x').length <= 1 && vars.filter(v => v === 'y').length <= 1;
  let std = { a: e.a, b: e.b, c: e.c };
  if (!isStd) {
    if ([std.a, std.b, std.c].every(isInt)) {
      const g = gcd(gcd(std.a, std.b), std.c);
      if (g > 1) std = scaleEq(std, 1 / g);
    }
    if (std.a < 0 || (z(std.a) && std.b < 0)) std = scaleEq(std, -1);
  }
  return { src, e, isStd, std };
}

const numStep = (v, val, prompt, coach, paper) => ({
  kind: 'num', v, value: val, prompt, coach, model: `${v} = ${fmtNum(val)}`, paper,
  expect(n) {
    if (Number.isNaN(n)) return { ok: false, msg: 'Enter a number.' };
    if (Math.abs(n - val) < 1e-6 * Math.max(1, Math.abs(val))) return { ok: true };
    return { ok: false, msg: `Not quite. Redo the arithmetic for ${v} one line at a time.` };
  },
});

/** Checker for "an equation with only one variable that is true for the real answer". */
function oneVarChecker(keep, sol, wrongVarMsg) {
  const gone = other(keep);
  return input => {
    let e;
    try { e = parseEquation(input); } catch (err) { return { ok: false, msg: syntaxMessage(err) }; }
    if (!z(coef(e, gone))) {
      if (z(coef(e, keep))) return { ok: false, msg: wrongVarMsg || `This plan keeps ${keep}. Your equation should have ${keep} in it and no ${gone}.` };
      return { ok: false, msg: `There is still a ${gone} in there. After this step only ${keep} should be left.` };
    }
    if (z(coef(e, keep))) return { ok: false, msg: `Both variables disappeared. One ${keep}-term should survive.` };
    if (!holdsAt(e, sol)) return { ok: false, msg: 'The idea is right but a number is off. Recheck each term, especially the signs.' };
    return { ok: true };
  };
}

/** "Tidy this equation into ax + by = c" — shared by both methods. */
function rewriteStep(s, label) {
  const model = fmtStd(s.std);
  return {
    kind: 'eq', model,
    prompt: `Rewrite equation ${label} in the form ax + by = c (variables on the left, number on the right, as simple as possible).`,
    coach: 'Expand or divide out any brackets, then line the equation up so the x-terms, y-terms and numbers sit in columns.',
    paper: { k: 'line', src: model, tag: label, note: 'simplified' },
    expect(input) {
      let e;
      try { e = parseEquation(input); } catch (err) { return { ok: false, msg: syntaxMessage(err) }; }
      if (!equivalent(e, s.e)) return { ok: false, msg: `That is no longer the same equation as ${label}. Do the same thing to both sides.` };
      if (!z(e.L.c) || !z(e.R.x) || !z(e.R.y) || /[()]/.test(input)) return { ok: false, msg: 'Same equation, but not tidied yet. Remove the brackets, put the variable terms on the left and the plain number on the right.' };
      const m = s.std;
      if ([m.a, m.b, m.c].every(isInt) && !(z(Math.abs(e.a) - Math.abs(m.a)) && z(Math.abs(e.b) - Math.abs(m.b)))) {
        return { ok: false, msg: 'Correct so far. Every term shares a common factor, so divide it out to make the equation as simple as possible.' };
      }
      return { ok: true };
    },
  };
}

// ---- ELIMINATION --------------------------------------------------------------
function planElimination(S, sol) {
  const steps = [], paper = [];
  const lab = [LABELS[0], LABELS[1]];
  const E = [S[0].std, S[1].std];

  // 1) Line the equations up as ax + by = c.
  S.forEach((s, i) => { if (!s.isStd) steps.push(rewriteStep(s, lab[i])); });

  // 2) Decide which variable is cheapest to eliminate.
  const cands = ['x', 'y'].map(v => {
    const k1 = Math.abs(coef(E[0], v)), k2 = Math.abs(coef(E[1], v));
    if (z(k1) || z(k2)) return null;
    const opposite = coef(E[0], v) * coef(E[1], v) < 0;
    if (z(k1 - k2)) return { v, cost: 0, m: [1, 1], opposite };
    if (z(k1 - 1)) return { v, cost: 1, m: [k2, 1], opposite };
    if (z(k2 - 1)) return { v, cost: 1, m: [1, k1], opposite };
    if (isInt(k2 / k1)) return { v, cost: 1, m: [k2 / k1, 1], opposite };
    if (isInt(k1 / k2)) return { v, cost: 1, m: [1, k1 / k2], opposite };
    let m1 = k2, m2 = k1;
    if (isInt(m1) && isInt(m2)) { const g = gcd(m1, m2); m1 /= g; m2 /= g; }
    return { v, cost: 2, m: [m1, m2], opposite };
  }).filter(Boolean);
  if (!cands.length) return null;
  const big = c => Math.max(...c.m);
  cands.sort((a, b) => a.cost - b.cost || (b.opposite - a.opposite) || (big(a) - big(b)) || (a.v === 'y' ? -1 : 1));
  const { v, m } = cands[0];
  const u = other(v);

  // 3) Multiply so the v-terms match.
  const F = [E[0], E[1]], flab = [...lab];
  let next = 2;
  m.forEach((k, i) => {
    if (z(k - 1)) return;
    const scaled = scaleEq(E[i], k);
    const model = fmtStd(scaled);
    const target = Math.abs(coef(scaled, v));
    const newLab = LABELS[next++];
    const from = lab[i];
    steps.push({
      kind: 'eq', model,
      prompt: `Multiply every term of equation ${from} by ${fmtNum(k)} so the ${v}-terms match.`,
      coach: `We want the ${v}-terms to have the same size in both equations so they cancel.`,
      paper: { k: 'line', src: model, tag: newLab, note: `${from} × ${fmtNum(k)}` },
      expect(input) {
        let e;
        try { e = parseEquation(input); } catch (err) { return { ok: false, msg: syntaxMessage(err) }; }
        if (!equivalent(e, E[i])) return { ok: false, msg: `Every term gets multiplied by ${fmtNum(k)}, including the number on the right. Check each one.` };
        if (!z(e.L.c) || !z(e.R.x) || !z(e.R.y)) return { ok: false, msg: 'Keep it in the form ax + by = c so it stacks neatly.' };
        if (!z(Math.abs(coef(e, v)) - target)) return { ok: false, msg: `It is still the same equation, but the ${v}-term should become ${fmtNum(target)}${v}. Multiply by ${fmtNum(k)}.` };
        return { ok: true };
      },
    });
    F[i] = scaled; flab[i] = newLab;
  });

  // 4) Add or subtract.
  const adding = coef(F[0], v) * coef(F[1], v) < 0;
  let top = 0, bot = 1;
  let comb = adding ? scaleEq({ a: F[0].a + F[1].a, b: F[0].b + F[1].b, c: F[0].c + F[1].c }, 1)
                    : scaleEq({ a: F[0].a - F[1].a, b: F[0].b - F[1].b, c: F[0].c - F[1].c }, 1);
  if (!adding && coef(comb, u) < 0) { top = 1; bot = 0; comb = scaleEq(comb, -1); }
  if (z(coef(comb, u))) return null;
  const opText = `${flab[top]} ${adding ? '+' : '−'} ${flab[bot]}`;
  const combModel = fmtStd(comb);
  steps.push({
    kind: 'eq', model: combModel,
    prompt: `${adding ? 'Add' : 'Subtract'} the equations (${opText}) to eliminate ${v}. Write the equation you get.`,
    coach: adding
      ? `The ${v}-terms are opposites, so adding the two equations makes them cancel.`
      : `The ${v}-terms are identical, so subtracting one equation from the other makes them cancel.`,
    paper: {
      k: 'stack', op: opText, result: combModel,
      rows: [{ src: fmtStd(F[top]), tag: flab[top] }, { src: fmtStd(F[bot]), tag: flab[bot] }],
    },
    expect: oneVarChecker(u, sol, `That is valid algebra, but it eliminates ${u}. This plan eliminates ${v}, so ${u} should be what is left.`),
  });

  // 5) Solve for u.
  const k = coef(comb, u);
  if (!z(k - 1)) {
    steps.push(numStep(u, sol[u], `Solve for ${u}.`, `Divide both sides by ${fmtNum(k)}.`,
      { k: 'line', src: `${u} = ${fmtNum(sol[u])}` }));
  }

  // 6) Substitute back.
  const bi = z(Math.abs(coef(E[0], v)) - 1) ? 0 : z(Math.abs(coef(E[1], v)) - 1) ? 1 : 0;
  const backSrc = subst(fmtStd(E[bi]), { [u]: fmtNum(sol[u]) });
  const backPaper = [{ k: 'text', s: `Substitute ${u} = ${fmtNum(sol[u])} into ${lab[bi]}:` }, { k: 'line', src: backSrc }];
  const kv = coef(E[bi], v), rest = clean(E[bi].c - coef(E[bi], u) * sol[u]);
  const mid = `${fmtLin({ [v]: kv })} = ${fmtNum(rest)}`;
  if (tight(mid) !== tight(backSrc) && !z(kv - 1)) backPaper.push({ k: 'line', src: mid });
  backPaper.push({ k: 'line', src: `${v} = ${fmtNum(sol[v])}` });
  steps.push({
    ...numStep(v, sol[v], `Substitute ${u} = ${fmtNum(sol[u])} into equation ${lab[bi]} and solve for ${v}.`,
      `Put ${fmtNum(sol[u])} wherever ${u} appears, then solve what is left.`, backPaper),
    show: backSrc,
  });

  return { strategy: 'elimination', eliminated: v, steps };
}

// ---- SUBSTITUTION -------------------------------------------------------------
function planSubstitution(S, sol) {
  const steps = [];
  const lab = [LABELS[0], LABELS[1]];

  // Is a variable already alone on one side?
  let iso = null;
  S.forEach((s, i) => {
    if (iso) return;
    const [l, r] = s.src.split('=').map(t => t.trim());
    for (const [side, rest] of [[l, r], [r, l]]) {
      if (/^[xy]$/.test(side) && !rest.includes(side)) { iso = { i, w: side, expr: rest, given: true }; return; }
    }
  });

  // Working copies of the equations (tidied first if they have brackets around variables).
  const W = S.map(s => s.src);
  if (!iso) {
    S.forEach((s, i) => {
      if (!/\([^)]*[xy]/.test(s.src)) return;
      steps.push(rewriteStep(s, lab[i]));
      W[i] = fmtStd(s.std);
    });
  }

  if (!iso) {
    // Otherwise isolate whichever variable has a coefficient of 1 (least work).
    const opts = [];
    S.forEach((s, i) => ['x', 'y'].forEach(w => {
      const k = coef(s.std, w);
      if (z(k)) return;
      let score = 0;
      if (z(k - 1)) score += 4; else if (z(k + 1)) score += 2;
      if ([s.std.a, s.std.b, s.std.c].every(isInt)) score += 1;
      if (w === 'y') score += 0.5;
      opts.push({ i, w, score });
    }));
    opts.sort((a, b) => b.score - a.score);
    const { i, w } = opts[0];
    const o = other(w), e = S[i].std, k = coef(e, w);
    const exprLin = { [o]: clean(-coef(e, o) / k), c: clean(e.c / k) };
    const expr = fmtLin(exprLin);
    iso = { i, w, expr, given: false };
    const model = `${w} = ${expr}`;
    steps.push({
      kind: 'eq', model,
      prompt: `Isolate ${w} in equation ${lab[i]} (get ${w} alone on the left).`,
      coach: `${w} is the easiest variable to get alone here. Once you know what ${w} equals, you can swap it into the other equation.`,
      paper: { k: 'line', src: model, note: `from ${lab[i]}` },
      expect(input) {
        let p;
        try { p = parseEquation(input); } catch (err) { return { ok: false, msg: syntaxMessage(err) }; }
        const leftIsW = z(coef({ a: p.L.x, b: p.L.y }, w) - 1) && z(coef({ a: p.L.x, b: p.L.y }, o)) && z(p.L.c);
        if (!equivalent(p, S[i].e)) {
          if (equivalent(p, S[1 - i].e)) return { ok: false, msg: `That rearranges equation ${lab[1 - i]}. For this plan, work with ${lab[i]}.` };
          return { ok: false, msg: `That is not the same equation as ${lab[i]} any more. Whatever you do to one side, do to the other.` };
        }
        if (!leftIsW || !z(coef({ a: p.R.x, b: p.R.y }, w))) return { ok: false, msg: `Correct equation, but ${w} is not alone yet. Write it as ${w} = …` };
        return { ok: true };
      },
    });
  }

  const { i, w, expr } = iso;
  const j = 1 - i, o = other(w);
  const subSrc = subst(W[j], { [w]: expr });
  const es = parseEquation(subSrc);

  const subPaper = [{ k: 'text', s: `Substitute ${w} = ${expr.replace(/-/g, '−')} into ${lab[j]}:` }, { k: 'line', src: subSrc }];
  const lineA = `${fmtLin(es.L)} = ${fmtLin(es.R)}`;
  if (tight(lineA) !== tight(subSrc)) subPaper.push({ k: 'line', src: lineA });
  let ko = coef(es, o), co = es.c;
  if (ko < 0) { ko = -ko; co = -co; }
  const lineB = `${fmtLin({ [o]: ko })} = ${fmtNum(co)}`;
  if (tight(lineB) !== tight(lineA) && !z(ko - 1)) subPaper.push({ k: 'line', src: lineB });

  steps.push({
    kind: 'eq', model: subSrc,
    prompt: `In equation ${lab[j]}, replace ${w} with (${expr.replace(/-/g, '−')}). Write the equation you get.`,
    coach: `${w} and (${expr.replace(/-/g, '−')}) are the same amount, so one can stand in for the other. Keep the brackets so the whole expression gets multiplied.`,
    paper: subPaper,
    expect: oneVarChecker(o, sol, `After substituting for ${w}, the only letter left should be ${o}.`),
  });
  steps.push(numStep(o, sol[o], `Simplify and solve for ${o}.`, 'Expand any brackets, collect like terms, then divide.',
    { k: 'line', src: `${o} = ${fmtNum(sol[o])}` }));

  const backSrc = `${w} = ${subst(expr, { [o]: fmtNum(sol[o]) })}`;
  const backPaper = [];
  if (tight(backSrc) !== tight(`${w} = ${fmtNum(sol[w])}`)) backPaper.push({ k: 'line', src: backSrc });
  backPaper.push({ k: 'line', src: `${w} = ${fmtNum(sol[w])}` });
  steps.push({
    ...numStep(w, sol[w], `Use ${w} = ${expr.replace(/-/g, '−')} with ${o} = ${fmtNum(sol[o])} to find ${w}.`,
      `Put ${fmtNum(sol[o])} in place of ${o}.`, backPaper),
    show: backSrc,
  });

  return { strategy: 'substitution', isolated: iso, steps };
}

/** The L.S. / R.S. check for one equation. */
export function checkSides(src, sol) {
  const vals = { x: fmtNum(sol.x), y: fmtNum(sol.y) };
  const side = s => {
    const text = s.trim();
    const hasVar = /[xy]/.test(text);
    const val = evalLin(parseExpr(text), sol);
    const sub = hasVar ? subst(text, vals) : text;
    return { src: text, sub, val, hasVar, needsWork: tight(sub) !== fmtNum(val) };
  };
  const [l, r] = src.split('=');
  return { L: side(l), R: side(r) };
}

/**
 * Build the full plan for a system.
 * @param {string[]} srcs  two equations written with x and y
 * @param {'elimination'|'substitution'} strategy
 */
export function buildPlan(srcs, strategy) {
  const S = srcs.map(describe);
  const sol = solve2(S[0].e, S[1].e);
  if (!sol) throw new Error('System has no unique solution: ' + srcs.join(' ; '));
  let plan = strategy === 'elimination' ? planElimination(S, sol) : planSubstitution(S, sol);
  if (!plan) plan = planSubstitution(S, sol);
  const paper = [];
  plan.steps.forEach(st => { if (st.paper) paper.push(...[].concat(st.paper)); });
  return { ...plan, sol, srcs, paper, checks: srcs.map(s => checkSides(s, sol)) };
}

/** Which method suits this system best? Used to sanity-check the authored advice. */
export function suggestStrategy(srcs) {
  const isolated = srcs.some(s => { const [l, r] = s.split('=').map(t => t.trim()); return /^[xy]$/.test(l) || /^[xy]$/.test(r); });
  return isolated ? 'substitution' : 'elimination';
}
