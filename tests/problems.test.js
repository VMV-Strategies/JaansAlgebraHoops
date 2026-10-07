import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProblem, validateProblem, generate, CATEGORIES, TAGS } from '../js/content/categories.js';
import { WORKSHEET, worksheetSpec, tutorialSpec } from '../js/content/worksheet.js';
import { parseEquation, equivalent, inst, holdsAt, tokenize } from '../js/core/math.js';
import { buildPlan } from '../js/core/solver.js';
import { checkLet, checkFill, checkConclusion, diagnoseEquation } from '../js/core/check.js';
import { tilesFor } from '../js/ui/problem.js';

const ID = { p: 'x', q: 'y' }, SWAP = { p: 'y', q: 'x' };
const near = (a, b) => Math.abs(a - b) < 1e-6;

/** Everything that must be true of any problem the app shows. */
function audit(spec, label) {
  const prob = buildProblem(spec);
  assert.deepEqual(validateProblem(prob), [], `${label}: validation`);

  for (const map of [ID, SWAP]) {
    const srcs = prob.eqs.map(e => inst(e.tpl, map));
    const sol = { [map.p]: prob.solution.p, [map.q]: prob.solution.q };
    const eqs = srcs.map(parseEquation);
    eqs.forEach((e, i) => assert.ok(holdsAt(e, sol), `${label}: equation ${i + 1} is true for the answer`));

    for (const strategy of ['substitution', 'elimination']) {
      const plan = buildPlan(srcs, strategy);
      assert.ok(near(plan.sol.x, sol.x) && near(plan.sol.y, sol.y), `${label}: ${strategy} solution`);
      assert.ok(plan.steps.length >= 2, `${label}: ${strategy} has steps`);
      plan.steps.forEach((st, k) => {
        // The model answer must be accepted by the step's own checker…
        const res = st.kind === 'eq' ? st.expect(st.model) : st.expect(st.value);
        assert.ok(res.ok, `${label}: ${strategy} step ${k + 1} rejects its own model answer "${st.model}" (${res.msg})`);
        // …and an obviously wrong answer must not be.
        const bad = st.kind === 'eq' ? st.expect('x + y = 987654') : st.expect(st.value + 1);
        assert.ok(!bad.ok, `${label}: ${strategy} step ${k + 1} accepts a wrong answer`);
      });
      // Every equation written on the "paper" must be true for the answer.
      plan.paper.forEach(b => {
        const lines = b.k === 'line' ? [b.src] : b.k === 'stack' ? [...b.rows.map(r => r.src), b.result] : [];
        lines.forEach(src => assert.ok(holdsAt(parseEquation(src), sol), `${label}: ${strategy} paper line "${src}" is false`));
      });
      // The check: L.S. = R.S. in both equations.
      plan.checks.forEach(c => assert.ok(near(c.L.val, c.R.val), `${label}: L.S. ≠ R.S.`));
    }

    // Diagnosis: right answers pass, the listed traps are genuinely wrong and get their own coaching.
    const lets = { [map.p]: prob.q[0].desc, [map.q]: prob.q[1].desc };
    prob.eqs.forEach((e, i) => {
      const ctx = { target: srcs[i], others: [srcs[1 - i]], traps: e.traps.map(t => ({ ...t, src: inst(t.tpl, map) })), swapMsg: e.swapMsg, lets, nudge: e.h1 };
      assert.ok(diagnoseEquation(srcs[i], ctx).ok, `${label}: correct equation ${i + 1} accepted`);
      assert.equal(diagnoseEquation(srcs[1 - i], ctx).code, 'other-clue', `${label}: other clue recognised`);
      e.traps.forEach(t => {
        const src = inst(t.tpl, map);
        let te; try { te = parseEquation(src); } catch { return; }
        assert.ok(!equivalent(te, eqs[i]), `${label}: trap "${src}" is actually correct`);
        assert.ok(t.msg.length > 20, `${label}: trap has coaching text`);
        const d = diagnoseEquation(src, ctx);
        assert.ok(!d.ok && d.msg, `${label}: trap "${src}" diagnosed`);
      });
    });
  }

  // Content completeness.
  assert.ok(prob.find.choices[prob.find.correct][0], `${label}: find question`);
  assert.equal(prob.unknowns.filter(u => u.ok).length, 2, `${label}: exactly two unknowns`);
  prob.unknowns.filter(u => !u.ok).forEach(u => assert.ok(u.why, `${label}: distractor has a reason`));
  prob.eqs.forEach((e, i) => {
    assert.ok(TAGS[e.tag], `${label}: eq ${i + 1} tag`);
    e.sent.forEach(s => assert.ok(s >= 0 && s < prob.sentences.length, `${label}: sentence index`));
    for (const k of ['h1', 'h3', 'h4']) assert.ok(e[k] && e[k].length > 15, `${label}: eq ${i + 1} ${k}`);
    for (const lvl of [5, 10, 15]) assert.ok(e.explain[lvl].includes('«'), `${label}: eq ${i + 1} ELI${lvl} shows the math`);
    assert.ok(e.phraseQ.choices[e.phraseQ.correct], `${label}: phrase question`);
    // every piece needed to build the equation is on a tile
    const tiles = tilesFor(prob);
    tokenize(inst(e.tpl, ID)).forEach(t => { const v = t.t === 'num' ? t.raw : t.v; assert.ok(tiles.includes(v), `${label}: tile "${v}" missing`); });
  });
  assert.ok(['substitution', 'elimination'].includes(prob.strategy.best) && prob.strategy.why, `${label}: strategy advice`);

  // Let statements: the model wording is accepted and identified; sloppy wording is coached.
  assert.equal(checkLet(`Let x = ${prob.q[0].desc}`, prob).which, 'p', `${label}: Let p`);
  assert.equal(checkLet(prob.q[1].desc, prob).which, 'q', `${label}: Let q`);
  assert.ok(!checkLet(prob.q[0].desc, prob).code, `${label}: model Let statement is not flagged`);
  assert.equal(checkFill(prob.q[0].fill[0], prob), 'p', `${label}: fill p`);
  assert.equal(checkFill(prob.q[1].fill[0], prob), 'q', `${label}: fill q`);
  assert.equal(checkLet('the total', prob).which, null, `${label}: "the total" is not an unknown`);
  prob.q.forEach((q, i) => {
    assert.ok(prob.pools.m.includes(q.parts[0]) && prob.pools.t.includes(q.parts[1]), `${label}: phrase chips for unknown ${i + 1}`);
  });
  assert.ok(prob.letWrong.length >= 2 && prob.letWrong.every(w => w.why), `${label}: Let distractors`);

  // Conclusion: the model sentence passes; a bare "x = …" does not.
  const C = checkConclusion(prob.conclusion.model, prob);
  assert.ok(C.ok, `${label}: model conclusion rejected: ${prob.conclusion.model} (${C.msg})`);
  assert.ok(!checkConclusion(`x = ${prob.solution.p} and y = ${prob.solution.q}`, prob).ok, `${label}: bare x/y conclusion accepted`);
  assert.ok(!checkConclusion('Therefore, the answer is 987654 things.', prob).ok, `${label}: wrong number accepted`);
  return prob;
}

test('worksheet: the app\'s own solutions match the answer key', () => {
  const key = { 1: [242, 135], 2: [24, 17], 3: [142, 370], 4: [56, 72], 5: [220, 180], 6: [3000, 6000], 7: [3, 2], 8: [31, 28], 9: [280, 40] };
  assert.equal(WORKSHEET.length, 9);
  WORKSHEET.forEach(w => {
    const prob = audit(worksheetSpec(w.n), `worksheet #${w.n}`);
    assert.ok(near(prob.solution.p, key[w.n][0]) && near(prob.solution.q, key[w.n][1]), `worksheet #${w.n} solves to ${prob.solution.p}, ${prob.solution.q}`);
  });
});

test('worksheet: concluding sentences state the keyed answer', () => {
  const expect = { 1: ['242', '135'], 2: ['17'], 3: ['142 adult'], 4: ['56', '72'], 5: ['180 kg', '40%'], 6: ['$3000', '9%'], 7: ['3 hours', '50 km/h'], 8: ['31', '28'], 9: ['280 km/h', '40 km/h'] };
  WORKSHEET.forEach(w => {
    const model = buildProblem(worksheetSpec(w.n)).conclusion.model;
    expect[w.n].forEach(bit => assert.ok(model.includes(bit), `#${w.n}: "${model}" should mention ${bit}`));
  });
});

test('tutorial problem: 6 two-pointers and 2 three-pointers', () => {
  const prob = audit(tutorialSpec('Jaan'), 'tutorial');
  assert.deepEqual(prob.solution, { p: 6, q: 2 });
  assert.match(prob.text, /Jaan scored 18 points/);
});

for (const cat of CATEGORIES) {
  test(`generator: ${cat.name} — 250 random problems are all valid`, () => {
    const seen = new Set();
    for (let i = 0; i < 250; i++) {
      const spec = generate(cat.id, 12345 + i * 7919);
      const prob = audit(spec, `${cat.id}#${i}`);
      seen.add(prob.text);
      const { p, q } = prob.solution;
      assert.ok(p > 0 && q > 0, 'positive answers');
      if (cat.id !== 'investment') assert.ok(Number.isInteger(p) && Number.isInteger(q), 'whole-number answers');
    }
    assert.ok(seen.size > 140, `${cat.id}: enough variety (${seen.size} distinct problems)`);
  });
}

test('generator rejects impossible problems', () => {
  assert.ok(validateProblem(buildProblem({ cat: 'ages', params: { variant: 'older', n1: 'A', n2: 'B', S: 10, D: 30 } })).length > 0, 'negative age');
  assert.ok(validateProblem(buildProblem({ cat: 'tickets', params: { variant: 'count', A: 5, B: 2, N: 11, R: 30 } })).length > 0, 'fractional tickets');
  assert.ok(validateProblem(buildProblem({ cat: 'mixture', params: { c1: 60, c2: 40, ct: 70, T: 400 } })).length > 0, 'impossible concentration');
  assert.throws(() => buildProblem({ cat: 'nope', params: {} }));
});
