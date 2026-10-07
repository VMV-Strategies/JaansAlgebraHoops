import test from 'node:test';
import assert from 'node:assert/strict';
import { parseEquation, parseExpr, equivalent, solve2, MathError, fmtLin, fmtStd, subst, mathHTML, swapXY, holdsAt } from '../js/core/math.js';

const eq = parseEquation;
const code = src => { try { eq(src); return null; } catch (e) { return e instanceof MathError ? e.code : 'other'; } };

test('parses linear equations into a·x + b·y = c', () => {
  assert.deepEqual((({ a, b, c }) => ({ a, b, c }))(eq('3x + 4y = 205')), { a: 3, b: 4, c: 205 });
  assert.deepEqual((({ a, b, c }) => ({ a, b, c }))(eq('y = 3x - 56')), { a: -3, b: 1, c: -56 });
  assert.deepEqual((({ a, b, c }) => ({ a, b, c }))(eq('4(x - y) = 960')), { a: 4, b: -4, c: 960 });
  assert.deepEqual((({ a, b, c }) => ({ a, b, c }))(eq('0.60x + 0.40y = 0.51(400)')), { a: 0.6, b: 0.4, c: 204 });
  assert.deepEqual((({ a, b, c }) => ({ a, b, c }))(eq('x + 4 = 2(y + 4)')), { a: 1, b: -2, c: 4 });
});

test('understands the symbols a student might type', () => {
  assert.ok(equivalent(eq('3×x − y = 2,005'), eq('3x - y = 2005')));
  assert.ok(equivalent(eq('60%x + 40%y = 204'), eq('0.6x + 0.4y = 204')));
  assert.ok(equivalent(eq('x ÷ 2 = y'), eq('x = 2y')));
  assert.ok(equivalent(eq('$5x + $2y = $424'), eq('5x + 2y = 424')));
});

test('equivalent() ignores form but not meaning', () => {
  assert.ok(equivalent(eq('x + y = 5'), eq('2y + 2x = 10')));
  assert.ok(equivalent(eq('x = y + 7'), eq('x - y = 7')));
  assert.ok(!equivalent(eq('x - y = 7'), eq('y - x = 7')));
  assert.ok(!equivalent(eq('x + y = 5'), eq('x + y = 6')));
  assert.ok(!equivalent(eq('5 = 5'), eq('10 = 10')), 'equations without variables never count');
  assert.ok(equivalent(swapXY(eq('x - y = 7')), eq('y - x = 7')));
});

test('reports helpful error codes', () => {
  assert.equal(code('x + y'), 'no-equals');
  assert.equal(code('x = y = 3'), 'many-equals');
  assert.equal(code('x + y ='), 'empty-side');
  assert.equal(code('3 56 = x'), 'two-numbers');
  assert.equal(code('x y = 12'), 'nonlinear');
  assert.equal(code('4(x - y = 3'), 'paren');
  assert.equal(code('x + = 3'), 'incomplete');
  assert.equal(code('x * / 3 = 2'), 'syntax');
  assert.equal(code('x + z = 3'), 'bad-char');
  assert.throws(() => parseExpr('x = 3'), MathError);
});

test('solves 2×2 systems and rejects degenerate ones', () => {
  assert.deepEqual(solve2(eq('x + y = 377'), eq('x - y = 107')), { x: 242, y: 135 });
  assert.equal(solve2(eq('x + y = 5'), eq('2x + 2y = 10')), null);
  assert.equal(solve2(eq('x + y = 5'), eq('x + y = 6')), null);
  assert.ok(holdsAt(eq('0.09x + 0.08y = 750'), { x: 3000, y: 6000 }));
});

test('writes math back out the way it is written on paper', () => {
  assert.equal(fmtLin({ x: 3, c: -56 }), '3x - 56');
  assert.equal(fmtLin({ x: -1, c: 128 }), '128 - x');
  assert.equal(fmtLin({ x: 1, y: -1 }), 'x - y');
  assert.equal(fmtStd({ a: 15.5, b: 0, c: 2201 }), '15.5x = 2201');
  assert.equal(subst('5x + 2y = 424', { x: '56' }), '5(56) + 2y = 424');
  assert.equal(subst('x + y = 400', { y: '400 - x' }), 'x + (400 - x) = 400');
  assert.equal(subst('x + y = 377', { x: '242', y: '135' }), '242 + 135 = 377');
  assert.match(mathHTML('x - 3'), /<i>x<\/i>.*−/);
});
