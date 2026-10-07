import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProblem } from '../js/content/categories.js';
import { worksheetSpec } from '../js/content/worksheet.js';
import { checkLet, checkConclusion, diagnoseEquation } from '../js/core/check.js';
import { inst } from '../js/core/math.js';
import { makeDrill, tilesFor, TEMPLATE_NAMES, SKILLS, PHRASES } from '../js/content/phrases.js';
import { judge } from '../js/ui/lab.js';
import { insights, MISTAKES } from '../js/content/teaching.js';
import { PLAYBOOK } from '../js/content/playbook.js';
import { tokenize } from '../js/core/math.js';

const ID = { p: 'x', q: 'y' };
const ctxFor = (prob, i, map = ID) => {
  const srcs = prob.eqs.map(e => inst(e.tpl, map));
  return { target: srcs[i], others: [srcs[1 - i]], traps: prob.eqs[i].traps.map(t => ({ ...t, src: inst(t.tpl, map) })), swapMsg: prob.eqs[i].swapMsg, lets: { x: 'x', y: 'y' }, nudge: prob.eqs[i].h1 };
};
const diag = (n, i, src) => diagnoseEquation(src, ctxFor(buildProblem(worksheetSpec(n)), i));

test('mistake coaching: the common errors each get a specific diagnosis', () => {
  assert.equal(diag(1, 1, 'y - x = 107').code, 'swap', 'wrong subtraction order / reversed variables');
  assert.equal(diag(3, 1, 'y = 56 - 3x').code, 'less-than', '"decreased by" written backwards');
  assert.equal(diag(3, 1, 'y = 3(x - 56)').code, 'brackets');
  assert.equal(diag(3, 1, 'x = 3y - 56').code, 'swap', 'equation does not match the Let statements');
  assert.equal(diag(3, 0, 'x + y = 2005').code, 'value-vs-count', 'known total used with a count');
  assert.equal(diag(4, 0, '5x + 2y = 424').code, 'other-clue', 'equation for the other sentence');
  assert.equal(diag(5, 1, '60x + 40y = 51').code, 'percent-total', 'mixing percentages incorrectly');
  assert.equal(diag(5, 1, '0.60x + 0.40y = 400').code, 'percent-total');
  assert.equal(diag(6, 1, '9x + 8y = 750').code, 'percent-decimal');
  assert.equal(diag(7, 1, '50 + x + 80 + y = 310').code, 'drt-add', 'distance + speed + time');
  assert.equal(diag(7, 1, 'x + y = 310').code, 'value-vs-count');
  assert.equal(diag(9, 0, '4(x + y) = 960').code, 'wind-direction');
  assert.equal(diag(9, 0, 'x - y = 960').code, 'drt-missing-time');
  assert.equal(diag(9, 0, '4x - y = 960').code, 'brackets');
  assert.equal(diag(1, 0, 'x = 377').code, 'one-variable', 'using only one unknown');
  assert.equal(diag(1, 0, 'x + y = 107').code, 'constant');
  assert.equal(diag(1, 0, 'x + y').code, 'syntax');
});

test('mistake coaching never just says "wrong"', () => {
  for (let n = 1; n <= 9; n++) for (const i of [0, 1]) {
    for (const src of ['x = 1', 'x + y = 1', 'y - x = 3', '2x + 9y = 4', 'x +', '3 = 3']) {
      const d = diag(n, i, src);
      if (d.ok) continue;
      assert.ok(d.msg.length > 25, `#${n} eq${i + 1} "${src}": "${d.msg}"`);
      assert.ok(!/^wrong\.?$/i.test(d.msg.trim()));
    }
  }
});

test('equivalent forms of a correct equation are accepted', () => {
  assert.ok(diag(2, 1, 'x - y = 7').ok);
  assert.ok(diag(2, 1, 'y + 7 = x').ok);
  assert.ok(diag(5, 1, '60x + 40y = 51(400)').ok);
  assert.ok(diag(9, 0, '4x - 4y = 960').ok);
  assert.ok(diag(9, 0, 'x - y = 240').ok);
  assert.ok(diag(6, 1, '9x + 8y = 75000').ok);
});

test('Let statements: precision is coached', () => {
  const tix = buildProblem(worksheetSpec(3));
  assert.equal(checkLet('the number of adult tickets sold', tix).which, 'p');
  assert.equal(checkLet('how many student tickets', tix).which, 'q');
  assert.equal(checkLet('adult tickets', tix).code, 'let-measure', 'forgetting "the number of"');
  assert.equal(checkLet('the price of a ticket', tix).code, 'let-known', 'using a known value as a variable');
  assert.equal(checkLet('the total money collected', tix).code, 'let-known');
  assert.equal(checkLet('number of adult and student tickets', tix).code, 'let-ambiguous');
  assert.equal(checkLet('', tix).code, 'empty');
  const ages = buildProblem(worksheetSpec(2));
  assert.equal(checkLet("Lisa's age", ages).which, 'p');
  assert.equal(checkLet('Lisa', ages).code, 'let-measure', 'a person is not a number');
  const mix = buildProblem(worksheetSpec(5));
  assert.equal(checkLet('kg of the 40% solution', mix).which, 'q');
  assert.equal(checkLet('the 60% solution', mix).code, 'let-measure', 'forgetting units');
  const wind = buildProblem(worksheetSpec(9));
  assert.equal(checkLet('speed of the wind', wind).which, 'q');
  assert.equal(checkLet('the speed of the plane in still air', wind).which, 'p');
});

test('concluding sentence: must answer the question asked', () => {
  const ages = buildProblem(worksheetSpec(2));
  assert.ok(checkConclusion('Therefore, Ellen is 17 years old.', ages).ok);
  assert.ok(checkConclusion('Ellen is 17 years old', ages).tip, 'suggests "Therefore"');
  assert.equal(checkConclusion('Therefore, Lisa is 24 years old.', ages).code, 'final-wrong-quantity', 'solved correctly but answered a different question');
  assert.equal(checkConclusion('x = 24, y = 17', ages).code, 'final-bare');
  assert.equal(checkConclusion('Therefore, Ellen is 17.', ages).code, 'final-units');
  assert.equal(checkConclusion('17', ages).code, 'final-short');
  const bills = buildProblem(worksheetSpec(4));
  assert.equal(checkConclusion('Therefore, 56 $5 bills were used.', bills).code, 'final-missing');
  assert.ok(checkConclusion('Therefore, 56 five-dollar bills and 72 two-dollar bills were used.', bills).ok);
  const inv = buildProblem(worksheetSpec(6));
  assert.ok(checkConclusion('Therefore, $3,000 was invested at 9%.', inv).ok);
});

test('Translation Lab: every drill template is sound', () => {
  const seen = new Set();
  for (let seed = 1; seed <= 60; seed++) {
    for (const skill of [null, ...Object.keys(SKILLS)]) {
      const items = makeDrill(seed * 101, { skill });
      assert.ok(items.length >= 6, `drill for ${skill} has ${items.length} items`);
      items.forEach(it => {
        seen.add(it.template);
        assert.ok(SKILLS[it.skill], `skill ${it.skill}`);
        if (it.type === 'mc') { assert.ok(it.choices[it.correct] && it.why); return; }
        assert.ok(judge(it, it.target).ok, `${it.template}: model answer "${it.target}" rejected`);
        const tiles = tilesFor(it);
        (it.target.match(/\d+\.\d+|\d+|[xy]|[-+*/()=]/g) || []).forEach(t => assert.ok(tiles.includes(t), `${it.template}: tile ${t} missing`));
        it.traps.forEach(t => { const r = judge(it, t.src); assert.ok(!r.ok && r.msg.length > 15, `${it.template}: trap "${t.src}" should be wrong with coaching`); });
        assert.ok(it.hint && it.why);
      });
    }
  }
  assert.deepEqual([...seen].sort(), [...TEMPLATE_NAMES].sort(), 'every template is reachable');
  assert.ok(PHRASES.length >= 13 && PHRASES.every(p => p.watch && p.ex.length === 2));
});

test('insights: weak spots are named in plain language', () => {
  const stats = { completed: 12, skills: { identify: [9, 12], lets: [5, 12], equations: [6, 24], algebra: [40, 42], check: [22, 24], final: [9, 12] }, tags: { comparison: [1, 8], sum: [7, 8] }, cats: { numbers: { done: 6, scores: [90, 95] }, mixture: { done: 3, scores: [40, 30] } }, mistakes: { 'less-than': 4, swap: 3 }, hintsTotal: 30, hintProblems: 12, lab: {}, days: {} };
  const out = insights(stats, 'Jaan');
  assert.match(out.headline, /Jaan, your algebra is strong/);
  assert.match(out.headline, /comparison sentences/);
  assert.equal(out.weakCat, 'Mixture Problems');
  assert.ok(out.recs.some(r => /less than/i.test(r)));
  assert.ok(insights({ ...stats, completed: 0, skills: { identify: [0, 0], lets: [0, 0], equations: [0, 0], algebra: [0, 0], check: [0, 0], final: [0, 0] }, tags: {}, cats: {}, mistakes: {} }).headline.length > 10);
  Object.values(MISTAKES).forEach(m => assert.equal(m.length, 2));
});

test('Playbook: all math in the reference pages typesets', () => {
  PLAYBOOK.forEach(a => a.sections.forEach(s => {
    const texts = [typeof s.body === 'string' ? s.body : Object.values(s.body || {}).join(' '), ...(s.list || []), ...(s.paper || [])].join(' ');
    (texts.match(/«(.*?)»/g) || []).forEach(m => assert.doesNotThrow(() => tokenize(m.slice(1, -1)), `${a.id}: ${m}`));
  }));
});

test('diagrams: every problem has a picture at every stage, with no broken values', async () => {
  const { diagram, diagramCaption } = await import('../js/ui/diagrams.js');
  const { generate, CATEGORIES } = await import('../js/content/categories.js');
  const specs = [...Array(9)].map((_, i) => worksheetSpec(i + 1));
  CATEGORIES.forEach(c => { for (let i = 0; i < 60; i++) specs.push(generate(c.id, 500 + i * 131)); });
  specs.forEach(spec => {
    const prob = buildProblem(spec);
    for (const map of [null, { p: 'x', q: 'y' }, { p: 'y', q: 'x' }]) {
      const stages = [{ map }, { map, eqs: [true, false] }, { map, eqs: [false, true] }, { map, eqs: [true, true] }];
      if (map) stages.push({ map, eqs: [true, true], sol: prob.solution });
      stages.forEach(st => {
        const html = diagram(prob, st);
        assert.ok(html.length > 200, `${prob.cat}: picture is empty`);
        assert.ok(!/undefined|NaN|Infinity|null/.test(html), `${prob.cat} ${JSON.stringify(spec.params)}: broken value in picture`);
        assert.ok(diagramCaption(prob, st).length > 10);
        // before the Let step the picture must not use x or y; before solving it must not reveal an answer
        if (!map) assert.ok(!/<i>[xy]<\/i>/.test(html), `${prob.cat}: letters shown before Let statements`);
      });
      const solvedHtml = map && diagram(prob, { map, eqs: [true, true], sol: prob.solution });
      if (map) assert.ok(solvedHtml.includes(String(prob.solution.p)), `${prob.cat}: solved picture shows the answer`);
    }
  });
});
