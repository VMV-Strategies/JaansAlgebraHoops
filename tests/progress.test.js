import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore, memoryStorage, STORAGE_KEY, ACHIEVEMENTS } from '../js/store/progress.js';
import { totals } from '../js/ui/problem.js';

const clean = (part, tag) => ({ part, first: true, pts: 1, ...(tag ? { tag } : {}) });
const result = (over = {}) => ({
  spec: { cat: 'numbers', params: {} }, mode: 'practice', scope: 'full', cat: 'numbers', hints: 0, assists: 0, total: 100, map: { p: 'x', q: 'y' }, strategy: 'elimination', title: 'Test', final: null,
  items: [clean('identify'), clean('identify'), clean('lets'), clean('equations', 'sum'), clean('equations', 'difference'), clean('algebra'), clean('check'), clean('final')], ...over,
});

test('progress is saved, reloaded and can be reset', () => {
  const storage = memoryStorage();
  const a = createStore(storage).load();
  a.markAttempt('numbers');
  const earned = a.recordProblem(result());
  assert.deepEqual(earned.map(e => e.id).sort(), ['first-bucket', 'no-look']);
  assert.ok(storage.getItem(STORAGE_KEY));
  const b = createStore(storage).load();
  assert.equal(b.stats.completed, 1);
  assert.equal(b.stats.attempted, 1);
  assert.deepEqual(b.stats.skills.equations, [2, 2]);
  assert.equal(b.translationAccuracy(), 100);
  assert.equal(b.state.history.length, 1);
  b.setName('  Jaan K  '); b.setSetting('eli', 5);
  b.reset();
  const c = createStore(storage).load();
  assert.equal(c.stats.completed, 0);
  assert.equal(c.state.history.length, 0);
  assert.equal(c.name, 'Jaan K', 'name survives a reset');
  assert.equal(c.settings.eli, 5);
});

test('streak counts consecutive days and never goes negative', () => {
  let today = new Date(2026, 9, 7, 12);
  const s = createStore(memoryStorage(), () => new Date(today)).load();
  assert.equal(s.streak(), 0);
  s.recordLab('sum', true); assert.equal(s.streak(), 1);
  today = new Date(2026, 9, 8, 12); assert.equal(s.streak(), 1, 'yesterday still counts until today is missed');
  s.recordLab('sum', true); assert.equal(s.streak(), 2);
  today = new Date(2026, 9, 11, 12); assert.equal(s.streak(), 0);
});

test('accuracy only counts first-try answers; hints are not punished harshly', () => {
  const s = createStore(memoryStorage()).load();
  s.recordProblem(result({ hints: 3, items: [{ part: 'equations', first: true, pts: 0.9, tag: 'sum' }, { part: 'equations', first: false, pts: 0.6, tag: 'comparison' }, { part: 'lets', first: false, pts: 0.8 }] }));
  assert.deepEqual(s.stats.skills.equations, [1, 2]);
  assert.deepEqual(s.stats.tags.comparison, [0, 1]);
  assert.equal(s.stats.letsOk, 0);
  assert.equal(s.stats.eqsOk, 2, 'both equations were built in the end');
  assert.equal(s.stats.noHint, 0);
  const t = totals([{ part: 'equations', pts: 0.9 }, { part: 'equations', pts: 0.6 }, { part: 'lets', pts: 0.8 }, { part: 'final', pts: 1 }]);
  assert.equal(t.parts.equations, 75);
  assert.ok(t.total > 70 && t.total < 90);
});

test('Let-statement scaffolding moves from choosing to writing', () => {
  const s = createStore(memoryStorage()).load();
  assert.equal(s.letLevel('learn'), 1);
  assert.equal(s.letLevel('practice'), 2);
  assert.equal(s.letLevel('game'), 4);
  assert.equal(s.letLevel('learn', true), 1);
  s.stats.letsOk = 3; assert.equal(s.letLevel('learn'), 2);
  s.stats.letsOk = 6; assert.equal(s.letLevel('learn'), 3);
  s.stats.letsOk = 12; assert.equal(s.letLevel('learn'), 4);
  s.setSetting('letLevel', '1'); assert.equal(s.letLevel('learn'), 1);
});

test('achievements unlock at the stated thresholds', () => {
  const s = createStore(memoryStorage()).load();
  for (let i = 0; i < 10; i++) s.recordProblem(result({ cat: 'numbers' }));
  for (let i = 0; i < 9; i++) s.recordProblem(result({ cat: 'ages' }));
  assert.ok(!s.state.achievements['double-double']);
  s.recordProblem(result({ cat: 'ages' }));
  assert.ok(s.state.achievements['double-double']);
  assert.ok(s.state.achievements.playmaker && s.state.achievements.translator);
  for (let i = 0; i < 5; i++) s.recordProblem(result({ mode: 'game', total: 90 }));
  assert.ok(s.state.achievements.clutch);
  assert.ok(s.state.history.length <= 30);
  assert.equal(new Set(ACHIEVEMENTS.map(a => a.id)).size, ACHIEVEMENTS.length);
});

test('works when storage is unavailable (private browsing)', () => {
  const broken = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); }, removeItem() {} };
  const s = createStore(broken).load();
  assert.ok(s.memoryOnly);
  s.recordProblem(result());
  assert.equal(s.stats.completed, 1);
});
