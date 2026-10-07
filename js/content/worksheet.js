// ---------------------------------------------------------------------------
// worksheet.js — the nine problems from Jaan's class worksheet, plus the
// first-run tutorial problem.
//
// Each entry is just a category and its NUMBERS. The story text, equations,
// hints and solution all come from the same category builders that power the
// random generator, so nothing here is a hard-coded answer.
//
// `_ans` is the worksheet's answer key. It is used ONLY as a cross-check:
// the app solves the equations itself and the unit tests confirm the two agree.
//
// To change a worksheet problem, edit the numbers below, then run `npm test`.
// ---------------------------------------------------------------------------
export const WORKSHEET = [
  { n: 1, cat: 'numbers', params: { variant: 'sumdiff', S: 377, D: 107, _ans: [242, 135] }, key: '242 and 135' },
  { n: 2, cat: 'ages', params: { variant: 'older', n1: 'Lisa', n2: 'Ellen', S: 41, D: 7, ask: 'q', _ans: [24, 17] }, key: '17' },
  { n: 3, cat: 'tickets', params: { variant: 'relation', A: 5, B: 3.5, R: 2005, M: 3, K: 56, ask: 'p', event: 'a school play', _ans: [142, 370] }, key: '142 adult tickets' },
  { n: 4, cat: 'bills', params: { kind: 'bills', A: 5, B: 2, N: 128, V: 424, _ans: [56, 72] }, key: '56 five-dollar bills and 72 two-dollar bills' },
  { n: 5, cat: 'mixture', params: { c1: 60, c2: 40, ct: 51, T: 400, stuff: 'alcohol', ask: 'q', _ans: [220, 180] }, key: '180 kg of the 40% solution' },
  { n: 6, cat: 'investment', params: { P: 9000, r1: 9, r2: 8, I: 750, who: 'Priya', ask: 'p', _ans: [3000, 6000] }, key: '$3000 invested at 9%' },
  { n: 7, cat: 'distance', params: { v1: 50, v2: 80, T: 5, D: 310, trip: 'car', ask: 'p', _ans: [3, 2] }, key: '3 hours at 50 km/h' },
  { n: 8, cat: 'numbers', params: { variant: 'combo', A: 3, B: 4, T: 205, S: 59, _ans: [31, 28] }, key: '31 and 28' },
  { n: 9, cat: 'wind', params: { kind: 'plane', t1: 4, t2: 3, D: 960, _ans: [280, 40] }, key: 'plane 280 km/h, wind 40 km/h' },
];

export const worksheetSpec = n => {
  const w = WORKSHEET.find(x => x.n === n);
  return { cat: w.cat, params: w.params, ws: w.n };
};

/** The first-run tutorial: 2-point and 3-point baskets. */
export const tutorialSpec = name => ({
  cat: 'bills', tutorial: true,
  params: { kind: 'baskets', A: 2, B: 3, N: 8, V: 18, name, _ans: [6, 2] },
});
