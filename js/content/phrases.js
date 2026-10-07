// ---------------------------------------------------------------------------
// phrases.js — the Translation Lab.
//
//   PHRASES      a reference list: English phrase -> what it usually means,
//                with a "watch out" note, because context beats keywords.
//   makeDrill()  builds a set of short translation reps.
//
// Drill items come in two shapes:
//   { type:'mc',    prompt, choices, correct, why }
//   { type:'build', prompt, lets, mode:'expr'|'eq', target, traps, hint, why }
// ---------------------------------------------------------------------------
import { makeRng } from './categories.js';

const ri = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
const pick = (r, a) => a[Math.floor(r() * a.length)];
const TIMES = { 2: 'twice', 3: 'three times', 4: 'four times', 5: 'five times', 6: 'six times' };
const cap = s => s[0].toUpperCase() + s.slice(1);

export const SKILLS = {
  sum: 'Sum and total',
  difference: 'Difference',
  times: 'Times, twice, half',
  more: 'More than, increased by',
  less: 'Less than, decreased by',
  comparison: 'Comparing two unknowns',
  value: 'Value = price × count',
  percent: 'Percent of',
  rate: 'Rates and “per”',
  context: 'Context checks',
};

export const PHRASES = [
  { phrase: 'the sum of', means: 'add', ex: ['the sum of x and y', 'x + y'], watch: 'A sum is the answer to an addition. “The sum is 50” gives you the right-hand side.' },
  { phrase: 'the difference between', means: 'subtract', ex: ['the difference between x and y', 'x − y'], watch: 'Order matters. Larger minus smaller keeps the difference positive.' },
  { phrase: 'twice / double', means: 'multiply by 2', ex: ['twice a number', '2x'], watch: '“Twice as old as Noah” multiplies Noah’s age, not the speaker’s.' },
  { phrase: 'three times', means: 'multiply by 3', ex: ['three times the smaller number', '3y'], watch: 'Check WHICH quantity is being multiplied.' },
  { phrase: 'four more than', means: 'add 4', ex: ['four more than a number', 'x + 4'], watch: '“More than” can also be a comparison: “x is more than y” is not an equation at all.' },
  { phrase: 'four less than', means: 'subtract 4 (reversed order!)', ex: ['four less than a number', 'x − 4'], watch: 'The words come backwards. “4 less than x” is x − 4, never 4 − x.' },
  { phrase: 'increased by', means: 'add', ex: ['a number increased by 7', 'x + 7'], watch: 'Reads in the same order as the math.' },
  { phrase: 'decreased by', means: 'subtract', ex: ['a number decreased by 7', 'x − 7'], watch: 'Reads in the same order as the math, unlike “less than”.' },
  { phrase: 'total / altogether / in all', means: 'often add', ex: ['128 bills in total', 'x + y = 128'], watch: 'Ask “total of WHAT?” A total number of bills and a total value in dollars are different equations.' },
  { phrase: 'remaining / the rest / the remainder', means: 'subtract from the whole', ex: ['the remainder of $9000 after x', '9000 − x'], watch: 'Or simply give it its own letter: x + y = 9000 says the same thing.' },
  { phrase: 'per / each / every', means: 'a rate: multiply by how many', ex: ['$5 per ticket, x tickets', '5x'], watch: '“Per” gives the value of ONE. Multiply by the count to get the total.' },
  { phrase: 'of (with a percent or fraction)', means: 'multiply', ex: ['60% of x', '0.60x'], watch: '“Of” only means multiply after a percent or fraction. In “the sum of two numbers” it does not.' },
  { phrase: 'is / was / will be / equals', means: 'equals sign', ex: ['the sum is 50', 'x + y = 50'], watch: '“Is” can also just describe: “Lisa is older” has no equals sign until you say by how much.' },
  { phrase: 'product of', means: 'multiply', ex: ['the product of 3 and a number', '3x'], watch: 'Product is to multiplying what sum is to adding.' },
  { phrase: 'quotient of / half of', means: 'divide', ex: ['half of a number', 'x ÷ 2'], watch: 'Half of x is x ÷ 2, which is the same as 0.5x.' },
  { phrase: 'older than / younger than', means: 'add / subtract years', ex: ['Lisa is 7 years older than Ellen', 'x = y + 7'], watch: 'The extra years go with the YOUNGER person’s age so both sides balance.' },
  { phrase: 'with the wind / against the wind', means: 'add / subtract speeds', ex: ['plane x, wind y, against the wind', 'x − y'], watch: 'Then distance = speed × time, with the whole speed in brackets.' },
];

// ---- drill templates ---------------------------------------------------------
const LET_NUM = [['x', 'a number']];
const LET_TWO = [['x', 'the larger number'], ['y', 'the smaller number']];

const T = {
  // --- phrase -> operation (multiple choice) ---
  mcOps: r => {
    const bank = [
      ['the sum of two amounts', 0, 'A sum is the result of adding.'],
      ['the difference between two amounts', 1, 'A difference is the result of subtracting.'],
      ['a number increased by 12', 0, '“Increased by” makes it bigger: add.'],
      ['a number decreased by 12', 1, '“Decreased by” makes it smaller: subtract.'],
      ['twice a number', 2, '“Twice” means two times.'],
      ['the product of 5 and a number', 2, 'A product is the result of multiplying.'],
      ['half of a number', 3, 'Half means divide by 2.'],
      ['$4 per ticket for x tickets', 2, '“Per” gives the value of one. Multiply by how many.'],
      ['35% of an amount', 2, '“Percent of” means multiply by the decimal.'],
      ['the remainder after x is taken from 9000', 1, 'What is left over comes from subtracting.'],
    ];
    const [phrase, correct, why] = pick(r, bank);
    return { type: 'mc', skill: correct === 0 ? 'sum' : correct === 1 ? 'less' : 'times', prompt: `Which operation does this describe?\n“${phrase}”`, choices: ['Addition', 'Subtraction', 'Multiplication', 'Division'], correct, why };
  },

  // --- context beats keywords ---
  mcContext: r => pick(r, [
    { type: 'mc', skill: 'context', prompt: 'In which phrase does “of” mean multiply?', choices: ['the sum of two numbers', '40% of the solution', 'the speed of the wind', 'the number of tickets'], correct: 1, why: '“Of” means multiply only after a percent or a fraction. In the others it just connects words.' },
    { type: 'mc', skill: 'context', prompt: '“128 bills were used in total.”\nx = number of $5 bills, y = number of $2 bills.\nWhat does “total” describe here?', choices: ['The total value in dollars', 'The total count of bills', 'The total of the prices', 'Nothing useful'], correct: 1, why: '128 is a number of bills, so this total is a count: x + y = 128. The value total would be in dollars.' },
    { type: 'mc', skill: 'context', prompt: 'Which sentence can be turned into an equation?', choices: ['Lisa is older than Ellen.', 'Lisa is 7 years older than Ellen.', 'Lisa and Ellen are sisters.', 'Lisa is the oldest.'], correct: 1, why: 'An equation needs an exact relationship. “7 years older” gives one: x = y + 7.' },
    { type: 'mc', skill: 'context', prompt: '“Four less than a number” and “four is less than a number”. Which one is x − 4?', choices: ['The first', 'The second', 'Both', 'Neither'], correct: 0, why: '“Four less than a number” is the expression x − 4. “Four is less than a number” is a comparison, 4 < x.' },
    { type: 'mc', skill: 'context', prompt: 'A problem says “the total interest was $750”.\nx and y are the amounts invested.\nWhy is x + y = 750 wrong?', choices: ['Because 750 is too small', 'Because x + y is money invested, but 750 is interest earned', 'Because totals never mean addition', 'It is not wrong'], correct: 1, why: 'Both sides of an equation must measure the same thing. The interest is rate × amount for each part.' },
    { type: 'mc', skill: 'context', prompt: '“A car travels x hours at 50 km/h.” What does 50x measure?', choices: ['Hours', 'Speed', 'Distance in km', 'Nothing'], correct: 2, why: 'distance = speed × time. km/h × h gives km.' },
    { type: 'mc', skill: 'context', prompt: '“The remainder is invested at 8%.” The total is $9000 and x is the first part. The remainder is:', choices: ['x − 9000', '9000 − x', '9000x', '0.08x'], correct: 1, why: 'The remainder is what is left of the whole after x is taken out: 9000 − x.' },
  ]),

  // --- expressions with one variable ---
  moreThan: r => { const k = ri(r, 2, 15); return build('more', `${k} more than a number`, LET_NUM, 'expr', `x + ${k}`, [[`${k}x`, `“More than” adds ${k}. It does not multiply.`]], `“More than” means add on.`, `${k} more than x is x + ${k}.`); },
  lessThan: r => { const k = ri(r, 2, 15); return build('less', `${k} less than a number`, LET_NUM, 'expr', `x - ${k}`, [[`${k} - x`, `The classic trap. You are taking ${k} away FROM the number, so the number comes first.`]], `Start with the number. What happens to it?`, `${k} less than x is x − ${k}. The words are in the opposite order to the math.`); },
  decreased: r => { const k = ri(r, 2, 20); return build('less', `a number decreased by ${k}`, LET_NUM, 'expr', `x - ${k}`, [[`${k} - x`, `It is the number that gets decreased, so it comes first.`], [`x + ${k}`, '“Decreased” makes it smaller.']], 'Which operation makes something smaller?', `A number decreased by ${k} is x − ${k}.`); },
  timesExpr: r => { const m = ri(r, 2, 6); return build('times', `${TIMES[m]} a number`, LET_NUM, 'expr', `${m}x`, [[`x + ${m}`, `“${cap(TIMES[m])}” means multiply by ${m}, not add ${m}.`]], `“${cap(TIMES[m])}” is which operation?`, `${cap(TIMES[m])} a number is ${m}x.`); },
  timesPlus: r => { const m = ri(r, 2, 5); let k = ri(r, 2, 12); if (k === m) k += 5; return build('more', `${TIMES[m]} a number, increased by ${k}`, LET_NUM, 'expr', `${m}x + ${k}`, [[`${m}(x + ${k})`, `Those brackets add ${k} before multiplying. The phrase multiplies first.`], [`${k}x + ${m}`, 'Check which number multiplies and which one is added.']], `Do “${TIMES[m]} a number” first, then “increased by ${k}”.`, `${m}x, then add ${k}: ${m}x + ${k}.`); },
  lessThanTimes: r => { const m = ri(r, 2, 5), k = ri(r, 2, 12); return build('less', `${k} less than ${TIMES[m]} a number`, LET_NUM, 'expr', `${m}x - ${k}`, [[`${k} - ${m}x`, `You are taking ${k} away from ${TIMES[m]} the number. Which comes first?`], [`${m}(x - ${k})`, `The ${k} comes off after multiplying, so no brackets.`]], `What is “${TIMES[m]} a number”? Then take ${k} away from that.`, `${TIMES[m]} the number is ${m}x. ${k} less than that is ${m}x − ${k}.`); },
  half: () => build('times', 'half of a number', LET_NUM, 'expr', 'x / 2', [['2x', 'Half makes it smaller. 2x doubles it.'], ['x - 2', 'Half means divide by 2, not subtract 2.']], 'Half means splitting into how many equal parts?', 'Half of x is x ÷ 2.', ['/', '2', '*']),

  // --- equations with two variables ---
  sumEq: r => { const s = ri(r, 20, 400); return build('sum', `The sum of two numbers is ${s}.`, LET_TWO, 'eq', `x + y = ${s}`, [[`x - y = ${s}`, 'A sum comes from adding.']], '“Sum” means which operation? “Is” means which symbol?', `Sum means add, is means equals: x + y = ${s}.`); },
  diffEq: r => { const d = ri(r, 3, 150); return build('difference', `The difference between the larger number and the smaller number is ${d}.`, LET_TWO, 'eq', `x - y = ${d}`, [[`y - x = ${d}`, `The difference is positive, so the larger number comes first. Which letter is the larger number?`], [`x + y = ${d}`, 'A difference comes from subtracting.']], 'Which operation gives a difference? Which number goes first?', `Larger minus smaller: x − y = ${d}.`); },
  comboEq: r => { const a = ri(r, 2, 5); let b = ri(r, 2, 5); if (b === a) b = a === 5 ? 2 : a + 1; const t = ri(r, 60, 400); return build('comparison', `${cap(TIMES[a])} the larger number increased by ${TIMES[b]} the smaller number is ${t}.`, LET_TWO, 'eq', `${a}x + ${b}y = ${t}`, [[`${b}x + ${a}y = ${t}`, `Check which number is multiplied by ${a}. It is the larger one.`], [`x + y = ${t}`, `Where did “${TIMES[a]}” and “${TIMES[b]}” go?`]], `Split at “increased by”. Translate each chunk, then join them.`, `${a}x for the first chunk, + for “increased by”, ${b}y for the second chunk, = ${t}.`); },
  moreEq: r => { const m = ri(r, 2, 4), k = ri(r, 2, 12); return build('comparison', `The larger number is ${k} more than ${TIMES[m]} the smaller number.`, LET_TWO, 'eq', `x = ${m}y + ${k}`, [[`y = ${m}x + ${k}`, 'The sentence describes the LARGER number. Which letter is that?'], [`x = ${m}(y + ${k})`, `The ${k} is added after multiplying.`], [`x + ${k} = ${m}y`, `The larger number already has the extra ${k}. It belongs with ${m}y.`]], `“The larger number is…” starts the equation. What is ${TIMES[m]} the smaller number?`, `x = ${m}y + ${k}.`); },
  lessEq: r => { const k = ri(r, 2, 30); return build('comparison', `The smaller number is ${k} less than the larger number.`, LET_TWO, 'eq', `y = x - ${k}`, [[`y = ${k} - x`, `You are taking ${k} away from the larger number, so the larger number comes first.`], [`x = y - ${k}`, `That makes the larger number the smaller one. Which number is ${k} less?`]], `Which number is being described? What is ${k} less than the larger number?`, `The smaller number equals the larger number minus ${k}: y = x − ${k}.`); },
  olderEq: r => { const k = ri(r, 2, 12); return build('comparison', `Lisa is ${k} years older than Ellen.`, [['x', 'Lisa’s age'], ['y', 'Ellen’s age']], 'eq', `x = y + ${k}`, [[`y = x + ${k}`, 'Who is older? The older person’s age must be the bigger number.'], [`x = ${k}y`, `“${k} years older” adds ${k} years. It does not multiply.`]], 'Who has the bigger age? How much bigger?', `Lisa’s age is Ellen’s age plus ${k}: x = y + ${k}.`); },

  // --- value / rate / percent ---
  valueEq: r => { const a = pick(r, [5, 6, 8, 10]), b = pick(r, [2, 3, 4]), t = ri(r, 40, 300) * 5; return build('value', `Adult tickets cost $${a} and student tickets cost $${b}. Ticket sales totalled $${t}.`, [['x', 'the number of adult tickets'], ['y', 'the number of student tickets']], 'eq', `${a}x + ${b}y = ${t}`, [[`x + y = ${t}`, `x + y counts tickets, but ${t} is dollars. What turns a number of tickets into dollars?`], [`${b}x + ${a}y = ${t}`, 'Match each price to the right kind of ticket.']], 'How much money do x adult tickets bring in?', `Money = price × how many: ${a}x + ${b}y = ${t}.`); },
  countEq: r => { const n = ri(r, 30, 200), v = n * 3; return build('value', `${n} bills were used altogether, some $5 bills and some $2 bills.`, [['x', 'the number of $5 bills'], ['y', 'the number of $2 bills']], 'eq', `x + y = ${n}`, [[`5x + 2y = ${n}`, `5x + 2y is a number of dollars. ${n} is a number of bills. This sentence only counts bills.`]], `Is ${n} a number of bills or a number of dollars?`, `This sentence counts bills, so x + y = ${n}. The values 5 and 2 belong in the OTHER equation.`, ['5', '2']); },
  percentExpr: r => { const c = pick(r, [5, 8, 12, 15, 25, 40, 60]); const d = (c / 100).toFixed(2); return build('percent', `the amount of pure acid in x litres of a ${c}% acid solution`, [['x', 'the number of litres of solution']], 'expr', `${d}x`, [[`${c}x`, `${c}% as a multiplier is ${d}, not ${c}. ${c}x would be more acid than there is liquid.`], [`x + ${d}`, '“Percent of” means multiply.']], `${c}% of x. What is ${c}% as a decimal?`, `${c}% = ${d}, and “of” means multiply: ${d}x.`, [String(c)]); },
  interestExpr: r => { const c = ri(r, 3, 12); const d = (c / 100).toFixed(2); return build('percent', `the interest earned in one year on x dollars at ${c}%`, [['x', 'the amount invested']], 'expr', `${d}x`, [[`${c}x`, `${c}% means ${c} per 100. As a decimal that is ${d}.`]], 'Interest = rate × amount. What is the rate as a decimal?', `Interest = ${d} × x = ${d}x.`, [String(c)]); },
  rateExpr: r => { const v = pick(r, [40, 50, 60, 80, 90, 100]); return build('rate', `the distance travelled in x hours at ${v} km/h`, [['x', 'the number of hours']], 'expr', `${v}x`, [[`${v} + x`, 'Speed and time are multiplied to get distance.'], [`x / ${v}`, 'That would be hours ÷ speed. distance = speed × time.']], 'distance = speed × time.', `${v} km every hour, for x hours: ${v}x km.`, ['/']); },
  windExpr: r => { const against = r() < 0.5; return build('rate', `the actual speed of a plane flying ${against ? 'against' : 'with'} the wind`, [['x', 'the plane’s speed in still air'], ['y', 'the speed of the wind']], 'expr', against ? 'x - y' : 'x + y', [[against ? 'x + y' : 'x - y', `Flying ${against ? 'against the wind slows the plane down' : 'with the wind speeds the plane up'}.`], ['y - x', 'The plane is faster than the wind, so its speed comes first.']], `Does the wind help or hurt here?`, against ? 'Against the wind: x − y.' : 'With the wind: x + y.'); },
  futureExpr: r => { const n = ri(r, 2, 9), ago = r() < 0.4; return build(ago ? 'less' : 'more', ago ? `Sam’s age ${n} years ago` : `Sam’s age ${n} years from now`, [['x', 'Sam’s age now']], 'expr', `x ${ago ? '-' : '+'} ${n}`, [[`${n}x`, 'Years are added or taken away, not multiplied.'], [`x ${ago ? '+' : '-'} ${n}`, ago ? 'In the past Sam was younger.' : 'In the future Sam is older.']], ago ? 'Was Sam older or younger back then?' : 'Will Sam be older or younger?', `x ${ago ? '−' : '+'} ${n}.`); },
  remainderExpr: r => { const p = ri(r, 4, 20) * 1000; return build('less', `the remainder of $${p} after x dollars are invested`, [['x', 'the amount invested first']], 'expr', `${p} - x`, [[`x - ${p}`, `The remainder is what is left of the $${p}. Start with the whole.`]], 'What is left of the whole after x is removed?', `${p} − x.`); },
};

function build(skill, prompt, lets, mode, target, traps, hint, why, extra = []) {
  return { type: 'build', skill, prompt, lets, mode, target, traps: traps.map(([src, msg]) => ({ src, msg })), hint, why, extra };
}

const BY_SKILL = {
  sum: ['sumEq', 'mcOps'],
  difference: ['diffEq'],
  times: ['timesExpr', 'half', 'mcOps'],
  more: ['moreThan', 'timesPlus', 'futureExpr'],
  less: ['lessThan', 'decreased', 'lessThanTimes', 'remainderExpr'],
  comparison: ['comboEq', 'moreEq', 'lessEq', 'olderEq'],
  value: ['valueEq', 'countEq'],
  percent: ['percentExpr', 'interestExpr'],
  rate: ['rateExpr', 'windExpr'],
  context: ['mcContext'],
};
export const TEMPLATE_NAMES = Object.keys(T);

/**
 * Build a drill.
 * @param {number} seed
 * @param {{skill?:string, n?:number}} opts  skill = one of SKILLS, or omit for a mix
 */
export function makeDrill(seed, { skill = null, n = 8 } = {}) {
  const r = makeRng(seed);
  const items = [];
  const pool = skill ? BY_SKILL[skill] : null;
  // A balanced mix: start easy, end with full sentences.
  const mix = ['mcOps', 'moreThan', 'lessThan', 'sumEq', 'mcContext', 'lessThanTimes', 'valueEq', 'diffEq', 'percentExpr', 'moreEq', 'rateExpr', 'comboEq', 'lessEq', 'windExpr', 'countEq', 'olderEq', 'timesPlus', 'decreased', 'remainderExpr', 'futureExpr', 'interestExpr', 'timesExpr', 'half'];
  const offset = Math.floor(r() * mix.length);
  let guard = 0;
  while (items.length < n && guard++ < 200) {
    const name = pool ? pool[(guard + offset) % pool.length] : mix[(guard * 3 + offset) % mix.length];
    const item = T[name](r);
    if (items.some(i => i.prompt === item.prompt)) continue;
    items.push({ ...item, template: name });
  }
  return items;
}

/** Tiles offered for a build item: the pieces needed plus some believable extras. */
export function tilesFor(item) {
  const need = item.target.match(/\d+\.\d+|\d+|[xy]|[-+*/()=]/g) || [];
  const set = new Set(['x', ...(item.lets.length > 1 ? ['y'] : []), '+', '-', '*', ...need, ...(item.extra || [])]);
  if (item.mode === 'eq') set.add('=');
  if ((item.traps || []).some(t => t.src.includes('('))) { set.add('('); set.add(')'); }
  const order = ['x', 'y', '+', '-', '*', '/', '(', ')', '='];
  const syms = order.filter(s => set.has(s));
  const nums = [...set].filter(s => /\d/.test(s)).sort((a, b) => parseFloat(a) - parseFloat(b));
  return [...syms, ...nums];
}
