// ---------------------------------------------------------------------------
// categories.js — the eight problem types.
//
// Each category has
//   build(params)  -> a complete problem: story, unknowns, Let statements,
//                     equations, hints, common-mistake traps, conclusion
//   random(rng)    -> fresh params. The ANSWER is chosen first and the story
//                     numbers are derived from it, so every generated problem
//                     is guaranteed to have a sensible solution.
//
// Equations are written with the letters p and q (first and second unknown).
// When Jaan writes his Let statements he decides which one is x and which is
// y, and the app swaps the letters in everywhere.
//
// In text:  [[...]] marks key information in the story
//           «...»   marks math to be typeset (p/q are replaced by x/y)
// ---------------------------------------------------------------------------
import { parseEquation, solve2, inst, isInt, z } from '../core/math.js';

// ---- small helpers ----------------------------------------------------------
export function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const ri = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
const money = n => (Number.isInteger(n) ? String(n) : n.toFixed(2));
const dec = pct => (pct / 100).toFixed(2);
const TIMES = { 2: 'twice', 3: 'three times', 4: 'four times', 5: 'five times', 6: 'six times' };
const cap = s => s[0].toUpperCase() + s.slice(1);
const COUNT_WORDS = ['number', 'how many', 'amount', 'count', 'quantity', '#'];
const GENERIC_FIND_WHY = 'The story already tells you that. Read the question sentence again: what does it ask for?';

export const CATEGORIES = [
  { id: 'numbers', name: 'Number Problems', icon: '🏀', blurb: 'Sums, differences and “times as many”.' },
  { id: 'ages', name: 'Age Problems', icon: '🎂', blurb: 'Older than, younger than, in a few years.' },
  { id: 'tickets', name: 'Tickets & Money', icon: '🎟', blurb: 'How many were sold, and what they earned.' },
  { id: 'bills', name: 'Bills, Quantity & Value', icon: '💵', blurb: 'Counting items vs. what they are worth.' },
  { id: 'mixture', name: 'Mixture Problems', icon: '🧪', blurb: 'Blending two strengths into one.' },
  { id: 'investment', name: 'Investment Problems', icon: '💰', blurb: 'Money split between two interest rates.' },
  { id: 'distance', name: 'Distance, Speed & Time', icon: '🚗', blurb: 'distance = speed × time.' },
  { id: 'wind', name: 'Wind & Current', icon: '✈️', blurb: 'With it you gain speed, against it you lose.' },
];

export const TAGS = {
  sum: '“sum / total” sentences',
  difference: '“difference” sentences',
  comparison: 'comparison sentences (more than, less than, times as many)',
  value: 'value sentences (price × quantity)',
  percent: 'percent sentences',
  rate: 'distance = speed × time sentences',
  wind: 'with / against sentences',
  future: '“in a few years” sentences',
};

// ---- reusable equation blocks -------------------------------------------------
/** "two things add up to a total" */
function totalEq({ total, sent, phrase, things, unit = '', word = 'total', tag = 'sum', trap }) {
  const u = unit ? ` ${unit}` : '';
  return {
    tag, sent, phrase, tpl: `p + q = ${total}`,
    phraseQ: { q: `What does “${word}” tell you to do with the two unknowns here?`, choices: ['Add them', 'Subtract them', 'Multiply them', 'Divide them'], correct: 0, why: `Here “${word}” describes two amounts being combined, which is addition.` },
    h1: `Which two amounts are being combined here, and what do they make together?`,
    h3: `“${cap(word)}” is describing ${things} put together. Putting amounts together is addition, and the result is ${total}${u}.`,
    h4: 'Start with «p + q» on the left. What does that equal?',
    explain: {
      5: `Take ${things} and put them in one pile. The story says the pile is ${total}${u}. One amount plus the other amount makes ${total}: «p + q = ${total}».`,
      10: `The word “${word}” signals addition, and the story gives the result, ${total}${u}. The two amounts are «p» and «q», so «p + q = ${total}».`,
      15: `${cap(things)} together make ${total}${u}: «p + q = ${total}».`,
    },
    traps: [
      { tpl: `p - q = ${total}`, code: 'operation', msg: `You subtracted, but this sentence puts two amounts together to reach ${total}. Which operation combines amounts?` },
      ...(trap ? [trap] : []),
    ],
  };
}

/** "count × value of each, added up" (tickets, bills, coins, baskets, distances) */
function valueEq({ a, b, total, sent, phrase, each, totalWhat, unitIn, unitOut, tag = 'value', countTotal }) {
  const A = money(a), B = money(b);
  return {
    tag, sent, phrase, tpl: `${A}p + ${B}q = ${money(total)}`,
    phraseQ: { q: `${each[0]} How do you get the ${unitOut} from «p» of them?`, choices: [`Add ${A} to «p»`, `Multiply ${A} by «p»`, `Divide «p» by ${A}`, `Subtract ${A} from «p»`], correct: 1, why: `Each one contributes ${A}, and there are «p» of them, so that is «${A}p».` },
    h1: `«p» and «q» count ${unitIn}, but ${money(total)} is in ${unitOut}. How do you turn a count into ${unitOut}?`,
    h3: `${each[0]} ${each[1]} So «p» of the first kind give «${A}p» ${unitOut}, and «q» of the second give «${B}q» ${unitOut}.`,
    h4: `The left side is «${A}p + ${B}q». It is measured in ${unitOut}. What ${unitOut} total does the story give?`,
    explain: {
      5: `${each[0]} So «p» of them make ${A}, «p» times over: «${A}p». ${each[1]} So «q» of them make «${B}q». Add the two piles and you get ${totalWhat}: «${A}p + ${B}q = ${money(total)}».`,
      10: `Value = (value of one) × (how many). The first group is worth «${A}p» and the second is worth «${B}q». Together they are ${totalWhat}, so «${A}p + ${B}q = ${money(total)}».`,
      15: `Total ${unitOut}: «${A}p + ${B}q = ${money(total)}».`,
    },
    traps: [
      { tpl: `p + q = ${money(total)}`, code: 'value-vs-count', msg: `«p + q» only counts ${unitIn}. But ${money(total)} is ${unitOut}. What do you multiply each count by to turn it into ${unitOut}?` },
      ...(countTotal != null ? [{ tpl: `${A}p + ${B}q = ${countTotal}`, code: 'value-vs-count', msg: `Your left side is in ${unitOut}, so the right side must be the ${unitOut} total. ${countTotal} is a count of ${unitIn}.` }] : []),
    ],
  };
}

// ---- 1. NUMBER PROBLEMS -------------------------------------------------------
function numbers(P) {
  const q = [
    { desc: 'the larger number', short: 'larger number', parts: ['the larger', 'number'], keys: [['larger', 'bigger', 'greater', 'largest', 'biggest']], fill: ['larger', 'bigger', 'greater'] },
    { desc: 'the smaller number', short: 'smaller number', parts: ['the smaller', 'number'], keys: [['smaller', 'lesser', 'smallest', 'lower']], fill: ['smaller', 'lesser'] },
  ];
  const base = {
    cat: 'numbers', q, ask: 'both',
    fill: { pre: 'the ', suf: ' number' },
    pools: { m: ['the larger', 'the smaller', 'the sum of the', 'the difference of the'], t: ['number', 'numbers'] },
    letWrong: [
      { text: 'the sum of the two numbers', why: 'The story tells you the sum. It is already known, so it does not need a letter.' },
      { text: 'both numbers', why: 'One letter can only stand for one number. Each unknown needs its own variable.' },
    ],
    letTraps: [{ keys: ['sum', 'total', 'difference'], msg: 'The story already gives that value. A variable is for something we do NOT know yet.' }],
    letHelp: 'The story has a larger number and a smaller number. Say which one this letter is.',
    find: { choices: [['The two numbers', ''], ['The sum of the two numbers', GENERIC_FIND_WHY], ['Which operation to use', 'That is something you work out along the way. The question asks for values.'], ['Only the larger number', 'Reread the last sentence. It asks for both.']], correct: 0 },
    conclusion: { units: null },
    diagram: { type: 'score' },
  };
  if (P.variant === 'sumdiff') {
    const { S, D } = P;
    const e1 = totalEq({ total: S, sent: [0], phrase: 'sum', things: 'the two numbers', word: 'sum' });
    const e2 = {
      tag: 'difference', sent: [1], phrase: 'difference', tpl: `p - q = ${D}`,
      phraseQ: { q: 'What operation does “difference” describe?', choices: ['Addition', 'Subtraction', 'Multiplication', 'Division'], correct: 1, why: 'A difference is the result of subtracting.' },
      h1: 'A difference comes from which operation? And which number should come first so the answer is positive?',
      h3: `“Difference” means subtract. The difference is a positive ${D}, so the larger number goes first.`,
      h4: 'Start with «p − q» on the left. What does the story say that equals?',
      explain: {
        5: `The difference is how far apart the two numbers are. Start at the larger number, take away the smaller one, and ${D} is left: «p - q = ${D}».`,
        10: `“Difference” means subtraction. Larger minus smaller gives a positive answer, so «p - q = ${D}».`,
        15: `“Their difference is ${D}” translates to «p - q = ${D}».`,
      },
      swapMsg: `Subtraction cares about order. The difference is positive, so the LARGER number must come first. Which of your letters is the larger number?`,
      traps: [{ tpl: `p + q = ${D}`, code: 'operation', msg: 'You added, but this sentence is about the difference. Which operation gives a difference?' }],
    };
    return {
      ...base, title: 'Sum and difference',
      sentences: [`The [[sum]] of two numbers is [[${S}]].`, `Their [[difference]] is [[${D}]].`, `[[Find the two numbers]].`],
      unknowns: [
        { text: 'the larger number', ok: true }, { text: 'the smaller number', ok: true },
        { text: `the sum (${S})`, ok: false, why: 'The story tells you the sum. It is a fact you get to use, not something to find.' },
        { text: `the difference (${D})`, ok: false, why: 'The difference is given. Known values become the numbers in your equations.' },
      ],
      eqs: [e1, e2],
      strategy: { best: 'elimination', why: 'One equation has «+q» and the other has «-q». Add the equations and the «q»-terms cancel in one move.' },
      numbers: [S, D],
    };
  }

  if (P.variant === 'combo') {
    const { A, B, T, S } = P;
    const e1 = {
      tag: 'comparison', sent: [0], phrase: `${TIMES[A]} … increased by ${TIMES[B]}`, tpl: `${A}p + ${B}q = ${T}`,
      phraseQ: { q: `What does “${TIMES[A]} the larger number” look like in symbols?`, choices: [`«${A} + p»`, `«${A}p»`, `«p - ${A}»`, `«p + p»`], correct: 1, why: `“${cap(TIMES[A])}” means multiply by ${A}.` },
      h1: `Split the sentence at “increased by”. What is “${TIMES[A]} the larger number” in symbols? What about “${TIMES[B]} the smaller number”?`,
      h3: `“${cap(TIMES[A])}” means multiply by ${A}. “Increased by” means add. “Is” means equals.`,
      h4: `The first chunk is «${A}p». Then “increased by” adds the second chunk. The whole thing is ${T}.`,
      explain: {
        5: `Take the larger number ${A} times: «${A}p». Take the smaller number ${B} times: «${B}q». “Increased by” means put them together, and the story says that makes ${T}: «${A}p + ${B}q = ${T}».`,
        10: `“${cap(TIMES[A])} the larger number” is «${A}p». “Increased by” means add. “${cap(TIMES[B])} the smaller number” is «${B}q». “Is ${T}” means equals ${T}. So «${A}p + ${B}q = ${T}».`,
        15: `Translate chunk by chunk: «${A}p + ${B}q = ${T}».`,
      },
      swapMsg: `Check which number gets multiplied by ${A}. The sentence says ${TIMES[A]} the LARGER number. Which letter is the larger number?`,
      traps: [
        { tpl: `p + q = ${T}`, code: 'coefficient', msg: `You have the two numbers adding to ${T}, but the sentence says ${TIMES[A]} one and ${TIMES[B]} the other. Where do the ${A} and the ${B} go?` },
        { tpl: `${A}p - ${B}q = ${T}`, code: 'operation', msg: '“Increased by” makes something bigger. Which operation does that?' },
        { tpl: `${A} + p + ${B} + q = ${T}`, code: 'times-vs-plus', msg: `“${cap(TIMES[A])}” means multiply by ${A}, not add ${A}.` },
      ],
    };
    const e2 = totalEq({ total: S, sent: [1], phrase: 'sum', things: 'the two numbers', word: 'sum' });
    return {
      ...base, title: 'Times and sum',
      sentences: [`[[${cap(TIMES[A])}]] the larger number [[increased by]] [[${TIMES[B]}]] the smaller number is [[${T}]].`, `The [[sum]] of the two numbers is [[${S}]].`, `[[Find the two numbers]].`],
      unknowns: [
        { text: 'the larger number', ok: true }, { text: 'the smaller number', ok: true },
        { text: `the sum (${S})`, ok: false, why: 'The sum is given in the story.' },
        { text: `the result ${T}`, ok: false, why: `${T} is given. It will be a number in your equation, not a variable.` },
      ],
      eqs: [e1, e2],
      strategy: { best: 'elimination', why: `Multiply «p + q = ${S}» by ${Math.min(A, B)} so one pair of terms matches, then subtract. Substitution also works well because the sum equation is easy to rearrange.` },
      numbers: [A, B, T, S],
    };
  }

  // 'more' and 'less':  larger = M × smaller ± K, plus the sum
  const { M, K, S } = P;
  const less = P.variant === 'less';
  const sign = less ? '-' : '+';
  const phrase = `${K} ${less ? 'less' : 'more'} than ${TIMES[M]}`;
  const e1 = {
    tag: 'comparison', sent: [0], phrase, tpl: `p = ${M}q ${sign} ${K}`,
    phraseQ: less
      ? { q: `Which expression means “${K} less than ${TIMES[M]} the smaller number”?`, choices: [`«${K} - ${M}q»`, `«${M}q - ${K}»`, `«${M}(q - ${K})»`, `«${M}q + ${K}»`], correct: 1, why: `“${K} less than something” starts with the something and takes ${K} away.` }
      : { q: `Which expression means “${K} more than ${TIMES[M]} the smaller number”?`, choices: [`«${M}q + ${K}»`, `«${M}(q + ${K})»`, `«${K}q + ${M}»`, `«${M}q - ${K}»`], correct: 0, why: `Work out ${TIMES[M]} the smaller number first, then add ${K}.` },
    h1: `What is “${TIMES[M]} the smaller number” in symbols? Then what does “${K} ${less ? 'less' : 'more'} than” do to it?`,
    h3: less
      ? `“${K} less than something” means start with the something and take ${K} away. The words come in the opposite order to the math.`
      : `“${K} more than something” means the something plus ${K}. “${cap(TIMES[M])}” means multiply by ${M}.`,
    h4: `The sentence starts “The larger number is…”, so begin «p =». Then write ${TIMES[M]} the smaller number, and adjust by ${K}.`,
    explain: {
      5: `First take the smaller number ${M} times: «${M}q». Then ${less ? `take ${K} away` : `add ${K} more`}. The story says that lands exactly on the larger number: «p = ${M}q ${sign} ${K}».`,
      10: `“Is” means equals, so the larger number equals what follows. “${cap(TIMES[M])} the smaller number” is «${M}q». “${K} ${less ? 'less' : 'more'} than” that is «${M}q ${sign} ${K}». So «p = ${M}q ${sign} ${K}».`,
      15: `“The larger number is ${phrase} the smaller number” translates to «p = ${M}q ${sign} ${K}».`,
    },
    swapMsg: 'Read who the sentence is describing: “The LARGER number is …”. Which of your letters is the larger number? That one stands alone.',
    traps: [
      ...(less ? [{ tpl: `p = ${K} - ${M}q`, code: 'less-than', msg: `Classic “less than” trap. “${K} less than ${TIMES[M]} the number” does not start with ${K}. What are you taking ${K} away FROM?` }] : []),
      { tpl: `p = ${M}(q ${sign} ${K})`, code: 'brackets', msg: `Those brackets change the meaning: they ${less ? 'subtract' : 'add'} the ${K} before multiplying. The sentence multiplies first, then adjusts by ${K}.` },
      { tpl: `p ${sign} ${K} = ${M}q`, code: 'comparison-side', msg: `Think about which side is bigger. ${less ? `The larger number is ${K} short of ${TIMES[M]} the smaller` : `The larger number already includes the extra ${K}`}, so the ${K} belongs with «${M}q».` },
      { tpl: `p = ${M}q ${less ? '+' : '-'} ${K}`, code: 'operation', msg: `Check the direction: is it ${K} MORE than, or ${K} LESS than?` },
    ],
  };
  const e2 = totalEq({ total: S, sent: [1], phrase: 'sum', things: 'the two numbers', word: 'sum' });
  return {
    ...base, title: less ? '“Less than” comparison' : '“More than” comparison',
    sentences: [`The larger number is [[${K} ${less ? 'less' : 'more'} than]] [[${TIMES[M]}]] the smaller number.`, `The [[sum]] of the two numbers is [[${S}]].`, `[[Find the two numbers]].`],
    unknowns: [
      { text: 'the larger number', ok: true }, { text: 'the smaller number', ok: true },
      { text: `the sum (${S})`, ok: false, why: 'The sum is given in the story.' },
      { text: `the number ${K}`, ok: false, why: `${K} is given. It becomes a number in an equation.` },
    ],
    eqs: [e1, e2],
    strategy: { best: 'substitution', why: `The first equation already says what «p» equals, so you can drop that expression straight into the other equation.` },
    numbers: [M, K, S],
  };
}
numbers.random = r => {
  const variant = pick(r, ['sumdiff', 'combo', 'more', 'less', 'sumdiff', 'less']);
  if (variant === 'sumdiff') { const q = ri(r, 8, 160), p = q + ri(r, 3, 120); return { variant, S: p + q, D: p - q, _ans: [p, q] }; }
  if (variant === 'combo') {
    const q = ri(r, 4, 40), p = q + ri(r, 2, 30);
    let A = ri(r, 2, 5), B = ri(r, 2, 5); if (A === B) B = A === 5 ? 2 : A + 1;
    return { variant, A, B, T: A * p + B * q, S: p + q, _ans: [p, q] };
  }
  const M = ri(r, 2, 4), q = ri(r, 6, 40);
  if (variant === 'more') { const K = ri(r, 1, 15), p = M * q + K; return { variant, M, K, S: p + q, _ans: [p, q] }; }
  const K = ri(r, 1, Math.min(15, (M - 1) * q - 1)), p = M * q - K;
  return { variant, M, K, S: p + q, _ans: [p, q] };
};

// ---- 2. AGE PROBLEMS -----------------------------------------------------------
const NAME_PAIRS = [['Lisa', 'Ellen'], ['Maya', 'Noah'], ['Arjun', 'Kiran'], ['Sofia', 'Liam'], ['Devon', 'Tasha'], ['Omar', 'Priya'], ['Grace', 'Ethan'], ['Simran', 'Jordan']];
function ages(P) {
  const { n1, n2 } = P;
  const person = n => ({
    desc: `${n}’s age`, short: `${n}’s age`, parts: [`${n}’s`, 'age'], keys: [[n.toLowerCase()]], fill: [n.toLowerCase()],
    measure: ['age', 'old', 'year'], measureMsg: `${n} is a person, and a variable has to be a number. What number about ${n} are we looking for?`,
  });
  const q = [person(n1), person(n2)];
  const ask = P.ask || 'both';
  const asked = ask === 'both' ? `${n1}’s age and ${n2}’s age` : `${ask === 'p' ? n1 : n2}’s age`;
  const base = {
    cat: 'ages', q, ask,
    fill: { pre: '', suf: '’s age' },
    pools: { m: [`${n1}’s`, `${n2}’s`, 'the sum of their'], t: ['age', 'ages', 'name'] },
    letWrong: [
      { text: n1, why: `${n1} is a person. A variable stands for a number, like ${n1}’s age.` },
      { text: 'the sum of their ages', why: 'If the story gives it, it is known. If not, it is not what we are solving for.' },
    ],
    letTraps: [{ keys: ['sum', 'total', 'difference'], msg: 'That combines two ages. Each variable should stand for one person’s age.' }],
    letHelp: `There are two people. Say whose age this letter stands for.`,
    find: { choices: [[cap(asked), ''], ['The sum of their ages', GENERIC_FIND_WHY], ['Who is older', 'The story already tells you who is older. The question wants a number.'], ['How many years apart they are', GENERIC_FIND_WHY]], correct: 0 },
    conclusion: { units: ['year', 'old', 'age'], unitHint: 'Ages are in years.' },
    diagram: { type: 'ages', n1, n2 },
  };
  const question = ask === 'both' ? `[[How old is each person]]?` : `[[How old is ${ask === 'p' ? n1 : n2}]]?`;
  const unknowns = extra => [
    { text: `${n1}’s age`, ok: true }, { text: `${n2}’s age`, ok: true }, ...extra,
  ];
  const needBoth = ask === 'both' ? '' : ` The question only asks for one age, but the story leaves two ages unknown, so we still need two variables.`;

  if (P.variant === 'future') {
    const { D, N, M } = P;
    const e1 = olderEq(n1, n2, D, [0]);
    const e2 = {
      tag: 'future', sent: [1], phrase: `In ${N} years … ${TIMES[M]} as old`, tpl: `p + ${N} = ${M}(q + ${N})`,
      phraseQ: { q: `${n2} is «q» years old now. How old will ${n2} be in ${N} years?`, choices: [`«q»`, `«q + ${N}»`, `«${N}q»`, `«q - ${N}»`], correct: 1, why: `Everyone gets ${N} years older, so add ${N}.` },
      h1: `In ${N} years, how old will ${n1} be? How old will ${n2} be? Write both ages before comparing them.`,
      h3: `“In ${N} years” adds ${N} to BOTH ages. “${cap(TIMES[M])} as old as” means the first future age equals ${M} × the second future age.`,
      h4: `${n1}’s future age is «p + ${N}». ${n2}’s future age is «(q + ${N})». Now say the first is ${TIMES[M]} the second.`,
      explain: {
        5: `Jump ${N} years ahead. ${n1} will be «p + ${N}» and ${n2} will be «q + ${N}». On that day ${n1}’s age is ${M} lots of ${n2}’s age: «p + ${N} = ${M}(q + ${N})». The brackets keep ${n2}’s whole future age together.`,
        10: `Both ages go up by ${N}: «p + ${N}» and «q + ${N}». “${cap(TIMES[M])} as old” means multiply ${n2}’s future age by ${M}, and brackets are needed so the whole age is multiplied: «p + ${N} = ${M}(q + ${N})».`,
        15: `Future ages are «p + ${N}» and «q + ${N}», so «p + ${N} = ${M}(q + ${N})».`,
      },
      swapMsg: `Who will be ${TIMES[M]} as old? The older person’s future age stands alone, and the younger person’s gets multiplied.`,
      traps: [
        { tpl: `p = ${M}q`, code: 'future-age', msg: `That compares their ages today. The sentence is about ${N} years from now. What will each age be then?` },
        { tpl: `p + ${N} = ${M}q`, code: 'future-age', msg: `${n1} got ${N} years older in your equation, but ${n2} did not. Time passes for both of them.` },
        { tpl: `p + ${N} = ${M}q + ${N}`, code: 'brackets', msg: `Very close. ${n2}’s future age is the whole of «(q + ${N})», and “${TIMES[M]}” multiplies that whole age. What is missing?` },
        { tpl: `p = ${M}(q + ${N})`, code: 'future-age', msg: `${n2}’s future age is right. What about ${n1}’s age ${N} years from now?` },
      ],
    };
    return {
      ...base, title: 'Ages in the future',
      sentences: [`${n1} is [[${D} years older than]] ${n2}.`, `[[In ${N} years]], ${n1} will be [[${TIMES[M]} as old as]] ${n2}.`, question],
      unknowns: unknowns([
        { text: `how many years from now (${N})`, ok: false, why: `The story says ${N} years. That is known.` },
        { text: `the age gap (${D} years)`, ok: false, why: `The gap is given: ${D} years.` },
      ]),
      eqs: [e1, e2],
      strategy: { best: 'substitution', why: `The first equation already gives «p» in terms of «q». Substitute it into the “in ${N} years” equation.` },
      numbers: [D, N, M],
      needBoth,
    };
  }

  if (P.variant === 'times') {
    const { S, M, K } = P;
    const e1 = totalEq({ total: S, sent: [0], phrase: 'sum', things: 'the two ages', word: 'sum', unit: 'years' });
    const e2 = {
      tag: 'comparison', sent: [1], phrase: `${K} more than ${TIMES[M]}`, tpl: `p = ${M}q + ${K}`,
      phraseQ: { q: `Which expression means “${K} more than ${TIMES[M]} ${n2}’s age”?`, choices: [`«${M}q + ${K}»`, `«${M}(q + ${K})»`, `«${K}q + ${M}»`, `«q + ${K}»`], correct: 0, why: `Find ${TIMES[M]} the age first, then add ${K}.` },
      h1: `What is “${TIMES[M]} ${n2}’s age” in symbols? Then what does “${K} more than” do?`,
      h3: `“${cap(TIMES[M])}” means multiply by ${M}. “${K} more than” adds ${K} afterwards. “Is” means equals.`,
      h4: `The sentence describes ${n1}’s age, so begin «p =». Then ${TIMES[M]} ${n2}’s age, plus ${K}.`,
      explain: {
        5: `Take ${n2}’s age ${M} times: «${M}q». Add ${K} more years. That lands on ${n1}’s age: «p = ${M}q + ${K}».`,
        10: `“${n1}’s age is” starts the equation: «p =». “${cap(TIMES[M])} ${n2}’s age” is «${M}q», and “${K} more than” that is «${M}q + ${K}».`,
        15: `“${n1}’s age is ${K} more than ${TIMES[M]} ${n2}’s age” translates to «p = ${M}q + ${K}».`,
      },
      swapMsg: `Whose age is being described? “${n1}’s age is …” so ${n1}’s letter stands alone on one side.`,
      traps: [
        { tpl: `p = ${M}(q + ${K})`, code: 'brackets', msg: `Those brackets add the ${K} before multiplying. The sentence multiplies first and then adds ${K}.` },
        { tpl: `p + ${K} = ${M}q`, code: 'comparison-side', msg: `${n1} is the one with the extra ${K} years already. Which side should the ${K} be on so both sides balance?` },
      ],
    };
    return {
      ...base, title: 'Ages: times and more',
      sentences: [`The [[sum]] of ${n1}’s age and ${n2}’s age is [[${S}]].`, `${n1}’s age is [[${K} more than]] [[${TIMES[M]}]] ${n2}’s age.`, question],
      unknowns: unknowns([{ text: `the sum of their ages (${S})`, ok: false, why: 'The sum is given in the story.' }, { text: `the number ${K}`, ok: false, why: 'That is a given number.' }]),
      eqs: [e1, e2],
      strategy: { best: 'substitution', why: `One equation already says what «p» equals. Substitute it into the sum equation.` },
      numbers: [S, M, K], needBoth,
    };
  }

  const { S, D } = P;
  const e1 = totalEq({ total: S, sent: [0], phrase: 'sum', things: 'the two ages', word: 'sum', unit: 'years' });
  const e2 = olderEq(n1, n2, D, [1]);
  return {
    ...base, title: 'Ages: sum and older than',
    sentences: [`The [[sum]] of ${n1}’s age and ${n2}’s age is [[${S}]].`, `${n1} is [[${D} years older than]] ${n2}.`, question],
    unknowns: unknowns([{ text: `the sum of their ages (${S})`, ok: false, why: 'The sum is given in the story.' }, { text: `the age gap (${D} years)`, ok: false, why: `The gap is given: ${D} years.` }]),
    eqs: [e1, e2],
    strategy: { best: 'substitution', why: `The comparison already says what «p» equals, so substitute it into the sum equation. (Rearranged as «p - q = ${D}», elimination is just as quick.)` },
    numbers: [S, D], needBoth,
  };
}
function olderEq(n1, n2, D, sent) {
  return {
    tag: 'comparison', sent, phrase: `${D} years older than`, tpl: `p = q + ${D}`,
    phraseQ: { q: `${n1} is ${D} years older than ${n2}. Whose age is the bigger number?`, choices: [`${n1}’s`, `${n2}’s`, 'They are equal', 'Cannot tell'], correct: 0, why: `Older means a bigger age, so ${n1}’s age is ${n2}’s age plus ${D}.` },
    h1: `Who is older? If you know ${n2}’s age, how would you work out ${n1}’s?`,
    h3: `“${D} years older than” means: take the other person’s age and add ${D}.`,
    h4: `The sentence describes ${n1}, so begin «p =». Then ${n2}’s age, adjusted by ${D}.`,
    explain: {
      5: `${n1} has had ${D} more birthdays than ${n2}. So start with ${n2}’s age and add ${D} to reach ${n1}’s age: «p = q + ${D}».`,
      10: `“Older than” means a bigger number. ${n1}’s age equals ${n2}’s age plus ${D}: «p = q + ${D}».`,
      15: `“${n1} is ${D} years older than ${n2}” translates to «p = q + ${D}» (or «p - q = ${D}»).`,
    },
    swapMsg: `Check who is older. In your equation the extra ${D} years went to the wrong person. Whose age should be the bigger number?`,
    traps: [
      { tpl: `p = ${D}q`, code: 'times-vs-plus', msg: `“${D} years older” adds ${D} years. It does not multiply the age by ${D}.` },
      { tpl: `p + q = ${D}`, code: 'operation', msg: `That says their ages add up to ${D}. The sentence compares the ages: one is ${D} more than the other.` },
    ],
  };
}
ages.random = r => {
  const [a, b] = pick(r, NAME_PAIRS);
  const [n1, n2] = r() < 0.5 ? [a, b] : [b, a];
  const variant = pick(r, ['older', 'times', 'future']);
  const ask = pick(r, ['both', 'both', 'p', 'q']);
  if (variant === 'older') { const q = ri(r, 6, 40), D = ri(r, 2, 12); return { variant, n1, n2, S: 2 * q + D, D, ask, _ans: [q + D, q] }; }
  if (variant === 'times') { const q = ri(r, 4, 16), M = ri(r, 2, 3), K = ri(r, 1, 9), p = M * q + K; return { variant, n1, n2, S: p + q, M, K, ask, _ans: [p, q] }; }
  const M = ri(r, 2, 3), N = ri(r, 2, 6), q = ri(r, 3, 14), D = (M - 1) * (q + N);
  return { variant, n1, n2, D, N, M, ask, _ans: [q + D, q] };
};

// ---- 3. TICKETS & MONEY ----------------------------------------------------------
const EVENTS = ['a school play', 'the senior basketball final', 'a charity concert', 'the spring musical', 'a community movie night'];
function tickets(P) {
  const { A, B, R } = P;
  const event = P.event || 'a school play';
  const ask = P.ask || 'both';
  const kind = k => ({
    desc: `the number of ${k} tickets sold`, short: `${k} tickets`, parts: ['the number of', `${k} tickets`], keys: [[k]], fill: [k],
    measure: COUNT_WORDS, measureMsg: `“${cap(k)} tickets” is a thing, not a number. Is x the price of them? The number of them? Say which.`,
  });
  const q = [kind('adult'), kind('student')];
  const askText = ask === 'both' ? 'How many of each type of ticket' : `How many ${ask === 'p' ? 'adult' : 'student'} tickets`;
  const base = {
    cat: 'tickets', q, ask,
    fill: { pre: 'the number of ', suf: ' tickets sold' },
    pools: { m: ['the number of', 'the price of', 'the money from'], t: ['adult tickets', 'student tickets', 'all tickets'] },
    letWrong: [
      { text: 'the price of an adult ticket', why: `The price is given in the story ($${money(A)}). Known values do not need a variable.` },
      { text: 'adult tickets', why: 'Almost. Be precise: a variable is a number. Is it the price of adult tickets, or the number of them?' },
      { text: 'the total money collected', why: `That is given: $${money(R)}.` },
    ],
    letTraps: [{ keys: ['price', 'cost', 'money', 'collected', 'dollar', 'revenue'], msg: 'Prices and the money collected are given in the story. Which quantities are NOT given?' }],
    letHelp: 'Two kinds of tickets were sold. Say which kind this letter counts.',
    find: { choices: [[ask === 'both' ? 'The number of adult tickets and student tickets sold' : `The number of ${ask === 'p' ? 'adult' : 'student'} tickets sold`, ''], ['The price of each ticket', 'The prices are given in the story.'], ['The amount of money collected', 'The story tells you how much was collected.'], ['The number of seats in the building', 'The story never mentions seats.']], correct: 0 },
    conclusion: { units: ['ticket'], unitHint: 'What was sold?' },
    diagram: { type: 'tickets', A: money(A), B: money(B), R: money(R) },
    needBoth: ask === 'both' ? '' : ' The question asks about one kind, but both ticket counts are unknown, so we need a variable for each.',
  };
  const valEq = sent => valueEq({
    a: A, b: B, total: R, sent, phrase: `$${money(R)}`, unitIn: 'tickets', unitOut: 'dollars', totalWhat: `the $${money(R)} collected`,
    each: [`Each adult ticket brings in $${money(A)}.`, `Each student ticket brings in $${money(B)}.`], countTotal: P.N ?? null,
  });
  const known = [
    { text: `the price of an adult ticket ($${money(A)})`, ok: false, why: 'The price is stated in the story.' },
    { text: `the total collected ($${money(R)})`, ok: false, why: 'The total is stated in the story.' },
  ];

  if (P.variant === 'relation') {
    const { M, K } = P;
    const e2 = {
      tag: 'comparison', sent: [3], phrase: `${TIMES[M]} … decreased by ${K}`, tpl: `q = ${M}p - ${K}`,
      phraseQ: { q: `If «p» is the number of adult tickets, what is “${TIMES[M]} the number of adult tickets decreased by ${K}”?`, choices: [`«${K} - ${M}p»`, `«${M}p - ${K}»`, `«${M}(p - ${K})»`, `«${M}p + ${K}»`], correct: 1, why: `Multiply by ${M} first, then “decreased by ${K}” takes ${K} away.` },
      h1: `Look at “${TIMES[M]} the number of adult tickets”. Which letter is adult tickets, and what does ${TIMES[M]} that look like?`,
      h3: `“${cap(TIMES[M])}” means multiply by ${M}. “Decreased by ${K}” means subtract ${K} from that. “Was equal to” is the equals sign.`,
      h4: `The sentence describes the student tickets, so begin «q =». Then ${TIMES[M]} the adult tickets, then decrease by ${K}.`,
      explain: {
        5: `Count the adult tickets and take that ${M} times: «${M}p». Then take ${K} off: «${M}p - ${K}». The story says that is exactly how many student tickets there were: «q = ${M}p - ${K}».`,
        10: `“The number of student tickets was equal to” gives «q =». “${cap(TIMES[M])} the number of adult tickets” is «${M}p». “Decreased by ${K}” subtracts ${K}. So «q = ${M}p - ${K}».`,
        15: `“Student tickets = ${TIMES[M]} adult tickets, decreased by ${K}” translates to «q = ${M}p - ${K}».`,
      },
      swapMsg: `Read who equals what: the number of STUDENT tickets equals ${TIMES[M]} the number of ADULT tickets, decreased by ${K}. Which of your letters is which?`,
      traps: [
        { tpl: `q = ${K} - ${M}p`, code: 'less-than', msg: `Order matters in subtraction. “Decreased by ${K}” takes ${K} away from ${TIMES[M]} the adult tickets. Which comes first?` },
        { tpl: `q = ${M}(p - ${K})`, code: 'brackets', msg: `With those brackets, ${K} is removed before multiplying. The sentence multiplies first, then decreases by ${K}.` },
        { tpl: `q = ${M}p + ${K}`, code: 'operation', msg: '“Decreased by” makes something smaller. Which operation does that?' },
        { tpl: `q + p = ${M}p - ${K}`, code: 'structure', msg: 'Only the student tickets are on the “equal to” side of the sentence.' },
      ],
    };
    return {
      ...base, title: 'Tickets: revenue and a comparison',
      sentences: [`Adult and student tickets were sold for ${event}.`, `Adult tickets cost [[$${money(A)}]] each and student tickets cost [[$${money(B)}]] each.`, `A total of [[$${money(R)}]] was collected.`, `The number of student tickets was equal to [[${TIMES[M]}]] the number of adult tickets [[decreased by ${K}]].`, `[[${askText}]] were sold?`],
      unknowns: [{ text: 'the number of adult tickets sold', ok: true }, { text: 'the number of student tickets sold', ok: true }, ...known],
      eqs: [valEq([2, 1]), e2],
      strategy: { best: 'substitution', why: `The comparison already says what «q» equals. Put that expression in place of «q» in the money equation.` },
      numbers: [A, B, R, M, K],
    };
  }

  const { N } = P;
  const e1 = totalEq({ total: N, sent: [2], phrase: `${N} tickets`, things: 'the adult tickets and the student tickets', word: 'in total', unit: 'tickets', trap: { tpl: `p + q = ${money(R)}`, code: 'value-vs-count', msg: `«p + q» counts tickets, but ${money(R)} is dollars. What number in the story is a count of tickets?` } });
  return {
    ...base, title: 'Tickets: count and revenue',
    sentences: [`Tickets were sold for ${event}.`, `Adult tickets cost [[$${money(A)}]] each and student tickets cost [[$${money(B)}]] each.`, `In total, [[${N} tickets]] were sold.`, `The ticket sales brought in [[$${money(R)}]].`, `[[${askText}]] were sold?`],
    unknowns: [{ text: 'the number of adult tickets sold', ok: true }, { text: 'the number of student tickets sold', ok: true }, ...known, { text: `the total number of tickets (${N})`, ok: false, why: 'The total count is given.' }],
    eqs: [e1, valEq([3, 1])],
    strategy: { best: 'elimination', why: `Multiply «p + q = ${N}» by ${money(B)} so the «q»-terms match the money equation, then subtract.` },
    numbers: [A, B, N, R],
  };
}
tickets.random = r => {
  const A = pick(r, [5, 6, 8, 10, 12]);
  const B = pick(r, [2, 3, 3.5, 4, 4.5, 5].filter(b => b < A));
  const event = pick(r, EVENTS), ask = pick(r, ['both', 'both', 'p', 'q']);
  if (r() < 0.5) {
    const M = ri(r, 2, 4), p = ri(r, 12, 80) * 2, K = ri(r, 2, 18) * 2, q = M * p - K;
    return { variant: 'relation', A, B, R: A * p + B * q, M, K, event, ask, _ans: [p, q] };
  }
  const p = ri(r, 10, 110) * 2, q = ri(r, 10, 150) * 2;
  return { variant: 'count', A, B, N: p + q, R: A * p + B * q, event, ask, _ans: [p, q] };
};

// ---- 4. BILLS / QUANTITY & VALUE ----------------------------------------------------
function bills(P) {
  const { A, B, N, V, kind } = P;
  const conf = {
    bills: {
      thing: v => `$${v} bills`, word: 'bills', title: 'Bills: quantity and value', unitOut: 'dollars',
      keys: v => [[String(v), { 2: 'two', 5: 'five', 10: 'ten', 20: 'twenty', 50: 'fifty' }[v] || String(v)]],
      story: [`A [[$${V}]] bill was paid using only [[$${A}]] bills and [[$${B}]] bills.`, `[[${N} bills]] were used altogether.`, `[[How many of each]] type of bill were used?`],
      eachA: `Each $${A} bill is worth ${A} dollars.`, eachB: `Each $${B} bill is worth ${B} dollars.`,
      total: `the $${V} that was paid`, fill: { pre: 'the number of $', suf: ' bills' }, sentV: [0], sentN: [1],
      model: (p, q) => `Therefore, ${p} $${A} bills and ${q} $${B} bills were used.`, units: ['bill'],
    },
    coins: {
      thing: v => (v === 0.25 ? 'quarters' : v === 0.1 ? 'dimes' : 'nickels'), word: 'coins', title: 'Coins: quantity and value', unitOut: 'dollars',
      keys: v => [[v === 0.25 ? 'quarter' : v === 0.1 ? 'dime' : 'nickel']],
      story: [`A jar holds only ${P.A === 0.25 ? 'quarters' : 'dimes'} and ${P.B === 0.1 ? 'dimes' : 'nickels'}.`, `There are [[${N} coins]] in the jar altogether.`, `Together they are worth [[$${money(V)}]].`, `[[How many of each]] coin are in the jar?`],
      eachA: `Each ${A === 0.25 ? 'quarter' : 'dime'} is worth $${money(A)}.`, eachB: `Each ${B === 0.1 ? 'dime' : 'nickel'} is worth $${money(B)}.`,
      total: `the $${money(V)} in the jar`, fill: { pre: 'the number of ', suf: '' }, sentV: [2], sentN: [1],
      model: (p, q) => `Therefore, there are ${p} ${A === 0.25 ? 'quarters' : 'dimes'} and ${q} ${B === 0.1 ? 'dimes' : 'nickels'} in the jar.`, units: null,
    },
    baskets: {
      thing: v => `${v}-point baskets`, word: 'baskets', title: 'Warm-up: baskets and points', unitOut: 'points',
      keys: v => [[String(v), v === 2 ? 'two' : 'three']],
      story: [`${P.name || 'Jaan'} scored [[${V} points]] in a game using only [[2-point]] and [[3-point]] baskets.`, `He made [[${N} baskets]] in total.`, `[[How many of each]] did he make?`],
      eachA: `Each 2-point basket is worth 2 points.`, eachB: `Each 3-point basket is worth 3 points.`,
      total: `the ${V} points he scored`, fill: { pre: 'the number of ', suf: '-point baskets' }, sentV: [0], sentN: [1],
      model: (p, q) => `Therefore, he made ${p} two-point baskets and ${q} three-point baskets.`, units: ['basket'],
    },
  }[kind];
  const mk = v => ({
    desc: `the number of ${conf.thing(v)}`, short: conf.thing(v), parts: ['the number of', conf.thing(v)], keys: conf.keys(v),
    fill: conf.keys(v)[0], measure: COUNT_WORDS,
    measureMsg: `“${cap(conf.thing(v))}” names the thing. The variable is a number: how many of them? Say that.`,
  });
  const q = [mk(A), mk(B)];
  const totalWord = kind === 'baskets' ? `the total points (${V})` : `the total value ($${money(V)})`;
  return {
    cat: 'bills', kind, q, ask: 'both', title: conf.title,
    sentences: conf.story,
    fill: conf.fill,
    pools: { m: ['the number of', 'the value of', 'the total of'], t: [conf.thing(A), conf.thing(B), `all the ${conf.word}`] },
    letWrong: [
      { text: `the value of the ${conf.thing(A)}`, why: 'You could work that out later, but the question asks how many. Let the variable be the count.' },
      { text: conf.thing(A), why: 'Almost. Be precise: the variable is a number. The number of them.' },
      { text: totalWord, why: 'That total is given in the story.' },
    ],
    letTraps: [{ keys: ['value', 'worth', 'total', 'points scored', 'paid'], msg: 'Totals are given in the story. Which quantities does the question ask you to find?' }],
    letHelp: `There are two kinds of ${conf.word}. Say which kind this letter counts.`,
    find: { choices: [[`How many ${conf.thing(A)} and how many ${conf.thing(B)}`, ''], [kind === 'baskets' ? 'How many points were scored' : 'How much money there is in total', GENERIC_FIND_WHY], [`How many ${conf.word} there are altogether`, GENERIC_FIND_WHY], [kind === 'baskets' ? 'How many points each basket is worth' : `What each of the ${conf.word} is worth`, 'Those values are given.']], correct: 0 },
    unknowns: [
      { text: `the number of ${conf.thing(A)}`, ok: true }, { text: `the number of ${conf.thing(B)}`, ok: true },
      { text: totalWord, ok: false, why: 'That total is given in the story.' },
      { text: `the total number of ${conf.word} (${N})`, ok: false, why: 'The story tells you how many there are altogether.' },
    ],
    eqs: [
      totalEq({ total: N, sent: conf.sentN, phrase: `${N} ${conf.word}`, things: `the two kinds of ${conf.word}`, word: kind === 'baskets' ? 'in total' : 'altogether', unit: conf.word, trap: { tpl: `p + q = ${money(V)}`, code: 'value-vs-count', msg: `«p + q» counts ${conf.word}. ${money(V)} is ${conf.unitOut}, not a count. Which number in the story counts ${conf.word}?` } }),
      valueEq({ a: A, b: B, total: V, sent: conf.sentV, phrase: kind === 'baskets' ? `${V} points` : `$${money(V)}`, unitIn: conf.word, unitOut: conf.unitOut, totalWhat: conf.total, each: [conf.eachA, conf.eachB], countTotal: N }),
    ],
    strategy: { best: 'elimination', why: `Multiply «p + q = ${N}» by ${money(Math.min(A, B))} so one pair of terms matches the value equation, then subtract. Substitution works too, since «p + q = ${N}» is easy to rearrange.` },
    conclusion: { units: conf.units, model: conf.model, unitHint: `Say what the numbers count.` },
    diagram: { type: 'value', a: conf.thing(A), b: conf.thing(B), total: kind === 'baskets' ? `${V} pts` : `$${money(V)}`, count: `${N} ${conf.word}` },
    numbers: [A, B, N, V],
  };
}
bills.random = r => {
  if (r() < 0.3) {
    const [A, B] = pick(r, [[0.25, 0.1], [0.25, 0.05], [0.1, 0.05]]);
    const p = ri(r, 4, 40), q = ri(r, 4, 40);
    return { kind: 'coins', A, B, N: p + q, V: Math.round((A * p + B * q) * 100) / 100, _ans: [p, q] };
  }
  const [A, B] = pick(r, [[5, 2], [10, 5], [20, 5], [20, 10], [10, 2], [50, 20]]);
  const p = ri(r, 5, 90), q = ri(r, 5, 90);
  return { kind: 'bills', A, B, N: p + q, V: A * p + B * q, _ans: [p, q] };
};

// ---- 5. MIXTURES ---------------------------------------------------------------
const MIXES = [
  { stuff: 'alcohol', noun: 'alcohol solution', who: 'A chemist', unit: 'kg', unitLong: 'kilograms' },
  { stuff: 'acid', noun: 'acid solution', who: 'A lab technician', unit: 'L', unitLong: 'litres' },
  { stuff: 'salt', noun: 'salt solution', who: 'A science teacher', unit: 'L', unitLong: 'litres' },
  { stuff: 'real juice', noun: 'juice drink', who: 'A café owner', unit: 'L', unitLong: 'litres' },
];
function mixture(P) {
  const { c1, c2, ct, T } = P;
  const M = MIXES.find(m => m.stuff === (P.stuff || 'alcohol')) || MIXES[0];
  const ask = P.ask || 'both';
  const sol = c => ({
    desc: `the number of ${M.unitLong} of the ${c}% ${M.noun}`, short: `${c}% solution`, parts: [`the ${M.unitLong} of`, `the ${c}% ${M.noun}`],
    keys: [[String(c)]], fill: [String(c)],
    measure: [M.unit.toLowerCase() === 'kg' ? 'kg' : 'litre', 'kilogram', 'liter', 'litre', 'mass', 'amount', 'volume', 'quantity', 'number of', 'how much', 'weight', ' l '],
    measureMsg: `“The ${c}% solution” names the liquid. The variable must be a number: how MUCH of it? Include the unit.`,
  });
  const q = [sol(c1), sol(c2)];
  const d1 = dec(c1), d2 = dec(c2), dt = dec(ct);
  const askText = ask === 'both' ? `How many ${M.unitLong} of each` : `How many ${M.unitLong} of the ${ask === 'p' ? c1 : c2}% ${M.noun}`;
  const e1 = totalEq({
    total: T, sent: [1], phrase: `${T} ${M.unit}`, things: 'the two amounts being poured in', word: 'combines', unit: M.unit,
    trap: { tpl: `${d1}p + ${d2}q = ${T}`, code: 'percent-total', msg: `«${d1}p + ${d2}q» measures only the pure ${M.stuff}. The ${T} ${M.unit} is the whole mixture. Which simpler equation describes the total amount?` },
  });
  e1.phraseQ = { q: `You pour «p» ${M.unit} of one solution and «q» ${M.unit} of the other into the same container. How much is in the container?`, choices: ['«p + q»', '«p - q»', '«pq»', `«${d1}p»`], correct: 0, why: 'Amounts poured together add.' };
  e1.h1 = `If you pour the two solutions into one container, how much liquid do you end up with? What does the story say that total is?`;
  const e2 = {
    tag: 'percent', sent: [1, 0], phrase: `${c1}% … ${c2}% … ${ct}%`, tpl: `${d1}p + ${d2}q = ${dt}(${T})`,
    phraseQ: { q: `How much pure ${M.stuff} is in «p» ${M.unit} of a ${c1}% solution?`, choices: [`«${c1}p»`, `«${d1}p»`, `«p + ${d1}»`, `«p»`], correct: 1, why: `${c1}% means ${c1} out of 100, which is ${d1} as a decimal. ${c1}% of «p» is «${d1}p».` },
    h1: `Think only about the pure ${M.stuff}. How much pure ${M.stuff} is inside «p» ${M.unit} of the ${c1}% solution?`,
    h3: `${c1}% of an amount means ${d1} × that amount. The pure ${M.stuff} from both solutions must add up to the pure ${M.stuff} in the mixture, which is ${ct}% of ${T} ${M.unit}.`,
    h4: `Left side: «${d1}p + ${d2}q» (pure ${M.stuff} going in). Right side: ${ct}% of the ${T} ${M.unit} mixture.`,
    explain: {
      5: `Only part of each solution is pure ${M.stuff}. In the ${c1}% one, ${c1} out of every 100 parts is ${M.stuff}, so «p» ${M.unit} holds «${d1}p» of pure ${M.stuff}. The other holds «${d2}q». None of it disappears when you mix, so together it equals the ${M.stuff} in the final ${T} ${M.unit}, which is ${dt} × ${T}: «${d1}p + ${d2}q = ${dt}(${T})».`,
      10: `Track the pure ${M.stuff}. “Percent of” means multiply by the decimal: «${d1}p» from the first solution and «${d2}q» from the second. The mixture is ${ct}% of ${T} ${M.unit}, which is «${dt}(${T})». Pure ${M.stuff} in = pure ${M.stuff} out, so «${d1}p + ${d2}q = ${dt}(${T})».`,
      15: `Pure ${M.stuff} is conserved: «${d1}p + ${d2}q = ${dt}(${T})».`,
    },
    traps: [
      { tpl: `${d1}p + ${d2}q = ${dt}`, code: 'percent-total', msg: `The left side is ${M.unit} of pure ${M.stuff}. The right side has to be ${M.unit} of pure ${M.stuff} too: ${ct}% OF the ${T} ${M.unit} mixture, not just ${dt}.` },
      { tpl: `${d1}p + ${d2}q = ${T}`, code: 'percent-total', msg: `That would make the mixture 100% ${M.stuff}. Only ${ct}% of the ${T} ${M.unit} is pure ${M.stuff}. How do you write ${ct}% of ${T}?` },
      { tpl: `${c1}p + ${c2}q = ${dt}(${T})`, code: 'percent-decimal', msg: `One side uses whole-number percents and the other uses a decimal. ${c1}% as a multiplier is ${d1}. Keep both sides in the same form.` },
      { tpl: `${c1}p + ${c2}q = ${ct}`, code: 'percent-total', msg: `Percentages cannot simply be added like that. ${ct}% applies to the whole ${T} ${M.unit} mixture. What is ${ct}% of ${T}?` },
      { tpl: `p + q = ${dt}(${T})`, code: 'percent-missing', msg: `«p + q» is the total liquid. To count only the pure ${M.stuff}, each amount needs to be multiplied by its strength.` },
    ],
  };
  return {
    cat: 'mixture', q, ask, title: `Mixing ${M.noun}s`,
    sentences: [`${M.who} combines a [[${c1}%]] ${M.noun} with a [[${c2}%]] ${M.noun}.`, `The goal is [[${T} ${M.unit}]] of a [[${ct}%]] ${M.noun}.`, `[[${askText}]] ${ask === 'both' ? 'solution are' : 'is'} needed?`],
    fill: { pre: `the number of ${M.unitLong} of the `, suf: `% ${M.noun}` },
    pools: { m: [`the ${M.unitLong} of`, 'the percent strength of', `the pure ${M.stuff} in`], t: [`the ${c1}% ${M.noun}`, `the ${c2}% ${M.noun}`, `the ${ct}% mixture`] },
    letWrong: [
      { text: `the percent of ${M.stuff} in the mixture`, why: `That is given: ${ct}%.` },
      { text: `the ${c1}% ${M.noun}`, why: 'Almost. Be precise: how MUCH of it? The variable is a number with a unit.' },
      { text: `the total amount of mixture`, why: `That is given: ${T} ${M.unit}.` },
    ],
    letTraps: [{ keys: ['percent of', 'strength', 'concentration', 'total', 'mixture', String(ct)], msg: 'The percentages and the total amount are given. What does the story NOT tell you?' }],
    letHelp: 'Two solutions are poured in. Say which one this letter measures, and in what unit.',
    find: { choices: [[ask === 'both' ? `How much of each solution to use` : `How much of the ${ask === 'p' ? c1 : c2}% solution to use`, ''], [`The percent of ${M.stuff} in the mixture`, 'The story gives the target strength.'], ['The total amount of mixture', `The story gives the total: ${T} ${M.unit}.`], [`How much pure ${M.stuff} is in the mixture`, 'You could calculate that, but it is not what the question asks.']], correct: 0 },
    unknowns: [
      { text: `the amount of the ${c1}% solution`, ok: true }, { text: `the amount of the ${c2}% solution`, ok: true },
      { text: `the strength of the mixture (${ct}%)`, ok: false, why: 'The target strength is given.' },
      { text: `the total amount of mixture (${T} ${M.unit})`, ok: false, why: 'The total amount is given.' },
    ],
    eqs: [e1, e2],
    strategy: { best: 'substitution', why: `«p + q = ${T}» rearranges easily (for example «q = ${T} - p»). Substitute that into the percent equation. Elimination also works if you multiply «p + q = ${T}» by ${d2}.` },
    conclusion: { units: [M.unit.toLowerCase(), M.unitLong, M.unitLong.replace('re', 'er')], unitHint: `Amounts here are in ${M.unitLong}.` },
    diagram: { type: 'mix', c1, c2, ct, T, unit: M.unit },
    numbers: [c1, c2, ct, T], extraTiles: [String(c1), String(c2), String(ct), '100'],
    needBoth: ask === 'both' ? '' : ' The question asks about one solution, but neither amount is known, so each needs a variable.',
    _M: M,
  };
}
mixture.random = r => {
  for (let i = 0; i < 400; i++) {
    const c2 = ri(r, 1, 10) * 5, c1 = c2 + ri(r, 2, 10) * 5;
    if (c1 > 95) continue;
    const p = ri(r, 2, 40) * 10, q = ri(r, 2, 40) * 10, T = p + q;
    const ct = (c1 * p + c2 * q) / T;
    if (!Number.isInteger(ct)) continue;
    const M = pick(r, MIXES);
    return { c1, c2, ct, T, stuff: M.stuff, ask: pick(r, ['both', 'both', 'p', 'q']), _ans: [p, q] };
  }
  return { c1: 60, c2: 40, ct: 51, T: 400, stuff: 'alcohol', ask: 'both', _ans: [220, 180] };
};

// ---- 6. INVESTMENTS --------------------------------------------------------------
const INVESTORS = ['Priya', 'Marcus', 'Elena', 'Jordan', 'Amara', 'Daniel'];
function investment(P) {
  const { P: total, r1, r2, I } = P;
  const who = P.who || 'Priya';
  const ask = P.ask || 'both';
  const acct = rate => ({
    desc: `the amount of money invested at ${rate}%`, short: `amount at ${rate}%`, parts: ['the amount invested at', `${rate}%`], keys: [[String(rate)]], fill: [String(rate)],
    measure: ['amount', 'money', 'dollar', '$', 'how much', 'principal', 'invested', 'investment'],
    measureMsg: `Say what is being measured at ${rate}%: the amount of money invested.`,
  });
  const q = [acct(r1), acct(r2)];
  const d1 = dec(r1), d2 = dec(r2);
  const askText = ask === 'both' ? 'How much was invested at each rate' : `How much was invested at ${ask === 'p' ? r1 : r2}%`;
  const e1 = totalEq({
    total, sent: [0, 1], phrase: `$${total} … the remainder`, things: 'the two parts of the investment', word: 'part … and the remainder', unit: 'dollars',
    trap: { tpl: `${d1}p + ${d2}q = ${total}`, code: 'percent-total', msg: `«${d1}p + ${d2}q» is the interest earned, which is small. $${total} is all the money that was invested. Which simpler equation says the two parts make $${total}?` },
  });
  e1.phraseQ = { q: `“Part … and the remainder” of $${total}. What do the two parts add up to?`, choices: [`$${total}`, `$${I}`, `${r1 + r2}%`, 'It is not given'], correct: 0, why: 'A part and the remainder together make the whole amount.' };
  e1.h1 = `The $${total} was split into two parts. What must the two parts add up to?`;
  const e2 = {
    tag: 'percent', sent: [2, 1], phrase: `${r1}% … ${r2}% … $${I}`, tpl: `${d1}p + ${d2}q = ${I}`,
    phraseQ: { q: `How much interest does «p» dollars earn in one year at ${r1}%?`, choices: [`«${r1}p»`, `«${d1}p»`, `«p + ${d1}»`, `«${d1} + p»`], correct: 1, why: `${r1}% as a decimal is ${d1}. Interest = rate × amount = «${d1}p».` },
    h1: `If «p» dollars earn ${r1}% in a year, how many dollars of interest is that?`,
    h3: `Interest for one year = rate × amount. ${r1}% is ${d1} as a decimal and ${r2}% is ${d2}. The two interest amounts add to $${I}.`,
    h4: `Interest from the first part is «${d1}p». Interest from the second is «${d2}q». Together they equal the total interest.`,
    explain: {
      5: `Each dollar at ${r1}% earns ${r1} cents in a year, which is $${d1}. So «p» dollars earn «${d1}p». Each dollar at ${r2}% earns $${d2}, so «q» dollars earn «${d2}q». Add both lots of interest and you get $${I}: «${d1}p + ${d2}q = ${I}».`,
      10: `Interest = rate × amount, with the rate written as a decimal. That gives «${d1}p» and «${d2}q». The story says the total interest is $${I}, so «${d1}p + ${d2}q = ${I}».`,
      15: `Total annual interest: «${d1}p + ${d2}q = ${I}».`,
    },
    traps: [
      { tpl: `${r1}p + ${r2}q = ${I}`, code: 'percent-decimal', msg: `${r1}% as a multiplier is ${d1}, not ${r1}. Multiplying by ${r1} would give ${r1} times the money back as interest every year.` },
      { tpl: `${(r1 / 10).toFixed(1)}p + ${(r2 / 10).toFixed(1)}q = ${I}`, code: 'percent-decimal', msg: `Check the decimal. ${r1}% means ${r1} ÷ 100. What is that?` },
      { tpl: `p + q = ${I}`, code: 'percent-missing', msg: `«p + q» is the money invested. $${I} is only the interest. What turns an amount into the interest it earns?` },
    ],
  };
  return {
    cat: 'investment', q, ask, title: 'Two interest rates',
    sentences: [`${who} invested [[$${total}]].`, `Part of it earns [[${r1}%]] interest per year and [[the remainder]] earns [[${r2}%]] per year.`, `After one year, the total interest earned is [[$${I}]].`, `[[${askText}]]?`],
    fill: { pre: 'the amount of money invested at ', suf: '%' },
    pools: { m: ['the amount invested at', 'the interest earned at', 'the number of years at'], t: [`${r1}%`, `${r2}%`, `$${total}`] },
    letWrong: [
      { text: 'the interest rate', why: `Both rates are given: ${r1}% and ${r2}%.` },
      { text: 'the total interest earned', why: `That is given: $${I}.` },
      { text: `${r1}%`, why: `${r1}% is a known rate. The unknown is how much money was invested at that rate.` },
    ],
    letTraps: [{ keys: ['rate', 'total interest', 'interest earned', 'total'], msg: 'The rates and the total interest are given. What is the story NOT telling you about the two parts?' }],
    letHelp: 'The money was split into two parts. Say which part this letter is: the amount invested at which rate?',
    find: { choices: [[ask === 'both' ? 'How much money was invested at each rate' : `How much money was invested at ${ask === 'p' ? r1 : r2}%`, ''], ['The interest rates', 'The rates are given.'], ['The total interest earned', `The story gives it: $${I}.`], ['How much money was invested altogether', `The story gives it: $${total}.`]], correct: 0 },
    unknowns: [
      { text: `the amount invested at ${r1}%`, ok: true }, { text: `the amount invested at ${r2}%`, ok: true },
      { text: `the total invested ($${total})`, ok: false, why: 'The total is given.' },
      { text: `the total interest ($${I})`, ok: false, why: 'The total interest is given.' },
    ],
    eqs: [e1, e2],
    strategy: { best: 'substitution', why: `«p + q = ${total}» rearranges easily (for example «q = ${total} - p», which is exactly “the remainder”). Substitute that into the interest equation.` },
    conclusion: { units: ['$', 'dollar'], unitHint: 'These are amounts of money.' },
    diagram: { type: 'invest', total, r1, r2, I },
    numbers: [total, r1, r2, I], extraTiles: [String(r1), String(r2)],
    needBoth: ask === 'both' ? '' : ' The question asks about one part, but both parts are unknown, so each needs a variable.',
  };
}
investment.random = r => {
  const total = ri(r, 4, 24) * 1000;
  let r1 = ri(r, 3, 12), r2 = ri(r, 2, 11); if (r1 === r2) r2 = r1 === 2 ? 3 : r1 - 1;
  const p = ri(r, 1, total / 500 - 1) * 500, q = total - p;
  return { P: total, r1, r2, I: (r1 * p + r2 * q) / 100, who: pick(r, INVESTORS), ask: pick(r, ['both', 'both', 'p', 'q']), _ans: [p, q] };
};

// ---- 7. DISTANCE / SPEED / TIME -----------------------------------------------------
const TRIPS = [
  { key: 'car', who: 'A car', verb: 'drove', speeds: [40, 50, 60, 70, 80, 90, 100, 110], legs: ['through towns', 'on the highway'] },
  { key: 'bike', who: 'Aaliyah', verb: 'travelled', speeds: [4, 5, 6, 15, 18, 20, 24], legs: ['on foot', 'by bike'] },
  { key: 'bus', who: 'A team bus', verb: 'travelled', speeds: [45, 55, 60, 75, 85, 95], legs: ['in the city', 'on the open road'] },
];
function distance(P) {
  const { v1, v2, T, D } = P;
  const trip = TRIPS.find(t => t.key === (P.trip || 'car')) || TRIPS[0];
  const ask = P.ask || 'both';
  const leg = v => ({
    desc: `the number of hours travelled at ${v} km/h`, short: `time at ${v} km/h`, parts: ['the hours travelled at', `${v} km/h`], keys: [[String(v)]], fill: [String(v)],
    measure: ['time', 'hour', 'long', 'duration'],
    measureMsg: `Say what is being measured at ${v} km/h. The question asks how LONG, so the variable should be a time.`,
  });
  const q = [leg(v1), leg(v2)];
  const askText = ask === 'both' ? 'How long was each part of the trip' : `How long did the trip last at ${ask === 'p' ? v1 : v2} km/h`;
  const e1 = totalEq({
    total: T, sent: [0], phrase: `${T} hours`, things: 'the time for each part of the trip', word: 'total', unit: 'hours',
    trap: { tpl: `p + q = ${D}`, code: 'units', msg: `«p + q» is a number of hours, but ${D} is kilometres. Which number in the story is a total TIME?` },
  });
  const e2 = valueEq({
    a: v1, b: v2, total: D, sent: [0, 1], phrase: `${D} km`, unitIn: 'hours', unitOut: 'kilometres', totalWhat: `the whole ${D} km trip`, tag: 'rate', countTotal: T,
    each: [`Every hour at ${v1} km/h covers ${v1} km.`, `Every hour at ${v2} km/h covers ${v2} km.`],
  });
  e2.phraseQ = { q: `How far do you go in «p» hours at ${v1} km/h?`, choices: [`«${v1} + p»`, `«${v1}p»`, `«p - ${v1}»`, `«p»`], correct: 1, why: 'distance = speed × time.' };
  e2.h1 = `distance = speed × time. How far does ${trip.who.toLowerCase()} go in «p» hours at ${v1} km/h?`;
  e2.traps.push({ tpl: `${v1} + p + ${v2} + q = ${D}`, code: 'drt-add', msg: 'Speed and time are multiplied to get distance, never added. distance = speed × time.' });
  e2.explain[10] = `distance = speed × time. The first part covers «${v1}p» km and the second covers «${v2}q» km. Together they are the whole ${D} km, so «${v1}p + ${v2}q = ${D}».`;
  return {
    cat: 'distance', q, ask, title: 'A trip in two parts',
    sentences: [`${trip.who} ${trip.verb} [[${D} km]] in a total of [[${T} hours]].`, `The first part of the trip, ${trip.legs[0]}, was at [[${v1} km/h]], and the rest, ${trip.legs[1]}, was at [[${v2} km/h]].`, `[[${askText}]]?`],
    fill: { pre: 'the number of hours travelled at ', suf: ' km/h' },
    pools: { m: ['the hours travelled at', 'the kilometres per hour of', 'the price of'], t: [`${v1} km/h`, `${v2} km/h`, 'the whole trip'] },
    letWrong: [
      { text: 'the total distance', why: `That is given: ${D} km.` },
      { text: `${v1} km/h`, why: `${v1} km/h is a known speed. The unknown is how long that speed was kept up.` },
      { text: 'the speed of the trip', why: 'Both speeds are given in the story.' },
    ],
    letTraps: [{ keys: ['speed', 'total', 'fast', 'whole trip'], msg: 'The speeds and totals are given. The question asks how long each part took.' }],
    letHelp: 'The trip has two parts at two speeds. Say which part this letter times.',
    find: { choices: [[ask === 'both' ? 'How long each part of the trip took' : `How long the ${ask === 'p' ? v1 : v2} km/h part took`, ''], ['How fast the trip was', 'Both speeds are given.'], ['How far the trip was', `The distance is given: ${D} km.`], ['How long the whole trip took', `The story gives it: ${T} hours.`]], correct: 0 },
    unknowns: [
      { text: `the time spent at ${v1} km/h`, ok: true }, { text: `the time spent at ${v2} km/h`, ok: true },
      { text: `the total distance (${D} km)`, ok: false, why: 'The distance is given.' },
      { text: `the total time (${T} h)`, ok: false, why: 'The total time is given.' },
    ],
    eqs: [e1, e2],
    strategy: { best: 'substitution', why: `«p + q = ${T}» rearranges easily (for example «q = ${T} - p»). Substitute into the distance equation. Elimination is also quick: multiply the time equation by ${Math.min(v1, v2)}.` },
    conclusion: { units: ['hour', 'hr', ' h'], unitHint: 'Time here is in hours.' },
    diagram: { type: 'trip', v1, v2, D, T },
    numbers: [v1, v2, T, D],
    needBoth: ask === 'both' ? '' : ' The question asks about one part, but neither time is known, so each needs a variable.',
  };
}
distance.random = r => {
  const trip = pick(r, TRIPS);
  let v1 = pick(r, trip.speeds), v2 = pick(r, trip.speeds);
  if (trip.key === 'bike') { v1 = pick(r, [4, 5, 6]); v2 = pick(r, [15, 18, 20, 24]); }
  while (v2 === v1) v2 = pick(r, trip.speeds);
  const p = ri(r, 1, 6), q = ri(r, 1, 6);
  return { v1, v2, T: p + q, D: v1 * p + v2 * q, trip: trip.key, ask: pick(r, ['both', 'both', 'p', 'q']), _ans: [p, q] };
};

// ---- 8. WIND / CURRENT ---------------------------------------------------------------
function wind(P) {
  const { t1, t2, D, kind } = P;
  const C = kind === 'boat'
    ? { craft: 'boat', med: 'current', still: 'in still water', against: 'upstream, against the current', withIt: 'downstream, with the current', verb: 'travels', keysP: [['boat', 'still water']], keysQ: [['current', 'river', 'stream']] }
    : { craft: 'plane', med: 'wind', still: 'in still air', against: 'against the wind', withIt: 'with the wind', verb: 'flies', keysP: [['plane', 'aircraft', 'jet', 'still air']], keysQ: [['wind']] };
  const SPEED = ['speed', 'km/h', 'rate', 'fast', 'velocity'];
  const q = [
    { desc: `the speed of the ${C.craft} ${C.still} (km/h)`, short: `${C.craft} speed`, parts: ['the speed of', `the ${C.craft} ${C.still}`], keys: C.keysP, fill: [C.craft], measure: SPEED, measureMsg: `The ${C.craft} is an object. The variable is a number: its speed.` },
    { desc: `the speed of the ${C.med} (km/h)`, short: `${C.med} speed`, parts: ['the speed of', `the ${C.med}`], keys: C.keysQ, fill: [C.med], measure: SPEED, measureMsg: `The ${C.med} is not a number. What about the ${C.med} are we finding?` },
  ];
  const mk = (t, sign, sent, againstIt) => {
    const dir = againstIt ? C.against : C.withIt;
    const eff = againstIt ? 'slower' : 'faster';
    return {
      tag: 'wind', sent, phrase: againstIt ? `against the ${C.med}` : `with the ${C.med}`, tpl: `${t}(p ${sign} q) = ${D}`,
      phraseQ: { q: `Going ${dir}, what is the ${C.craft}’s actual speed?`, choices: ['«p + q»', '«p - q»', '«p»', '«pq»'], correct: againstIt ? 1 : 0, why: againstIt ? `The ${C.med} pushes back, so it takes speed away.` : `The ${C.med} pushes the ${C.craft} along, so the speeds add.` },
      h1: `Going ${dir}, is the ${C.craft} ${eff} or ${againstIt ? 'faster' : 'slower'} than in still conditions? What is its actual speed in terms of «p» and «q»?`,
      h3: `${againstIt ? 'Against' : 'With'} the ${C.med}, the actual speed is the ${C.craft}’s speed ${againstIt ? 'minus' : 'plus'} the ${C.med} speed. Then distance = speed × time.`,
      h4: `The actual speed is «(p ${sign} q)». It was kept up for ${t} hours and covered ${D} km. distance = speed × time.`,
      explain: {
        5: `The ${C.med} ${againstIt ? 'pushes against the ' + C.craft + ' and slows it down' : 'pushes the ' + C.craft + ' along and speeds it up'}. So its real speed is «p ${sign} q». Keep that speed for ${t} hours and you cover ${D} km: «${t}(p ${sign} q) = ${D}». The brackets keep the real speed together.`,
        10: `${againstIt ? 'Against' : 'With'} the ${C.med}, speed = «p ${sign} q». distance = speed × time, so ${t} hours at that speed gives «${t}(p ${sign} q)», which equals ${D} km.`,
        15: `Ground speed ${againstIt ? 'against' : 'with'} the ${C.med} is «p ${sign} q», so «${t}(p ${sign} q) = ${D}».`,
      },
      swapMsg: `The ${C.craft} is faster than the ${C.med}, so the ${C.craft}’s speed comes first. Which of your letters is the ${C.craft}’s speed?`,
      traps: [
        { tpl: `${t}(p ${againstIt ? '+' : '-'} q) = ${D}`, code: 'wind-direction', msg: `Going ${dir} makes the ${C.craft} ${eff}. Does the ${C.med} add to its speed or take away from it?` },
        { tpl: `${t}p ${sign} q = ${D}`, code: 'brackets', msg: `The whole actual speed «(p ${sign} q)» is kept up for ${t} hours, so the ${t} must multiply all of it. What is missing?` },
        { tpl: `p ${sign} q = ${D}`, code: 'drt-missing-time', msg: `«p ${sign} q» is a speed in km/h, but ${D} is a distance in km. distance = speed × time. Where does the ${t} hours go?` },
        { tpl: `p ${sign} q + ${t} = ${D}`, code: 'drt-add', msg: 'Speed and time are multiplied to get distance, not added.' },
      ],
    };
  };
  return {
    cat: 'wind', kind, q, ask: 'both', title: kind === 'boat' ? 'Upstream and downstream' : 'Headwind and tailwind',
    sentences: [`A ${C.craft} ${C.verb} [[${D} km]] [[${C.against}]] in [[${t1} hours]].`, `The return trip, [[${C.withIt}]], takes only [[${t2} hours]].`, `Find [[the speed of the ${C.craft} ${C.still}]] and [[the speed of the ${C.med}]].`],
    fill: { pre: 'the speed of the ', suf: '' },
    pools: { m: ['the speed of', 'the distance covered by', 'the time taken by'], t: [`the ${C.craft} ${C.still}`, `the ${C.med}`, 'the return trip'] },
    letWrong: [
      { text: `the speed of the ${C.craft} going against the ${C.med}`, why: `That speed is a combination: ${C.craft} speed minus ${C.med} speed. Pick the two basic speeds the question asks for.` },
      { text: 'the distance travelled', why: `That is given: ${D} km.` },
      { text: `the ${C.craft}`, why: `The ${C.craft} is an object. A variable is a number, like its speed.` },
    ],
    letTraps: [{ keys: ['distance', 'time', 'hours', 'trip'], msg: 'The distance and the times are given. The question asks for two speeds.' }],
    letHelp: `The question asks for two speeds. Say whose speed this letter is: the ${C.craft}’s or the ${C.med}’s.`,
    find: { choices: [[`The speed of the ${C.craft} ${C.still} and the speed of the ${C.med}`, ''], ['How far the trip is', `The distance is given: ${D} km.`], ['How long each trip takes', 'Both times are given.'], [`Only the speed going against the ${C.med}`, 'That is a step along the way, not what the question asks.']], correct: 0 },
    unknowns: [
      { text: `the ${C.craft}’s speed ${C.still}`, ok: true }, { text: `the speed of the ${C.med}`, ok: true },
      { text: `the distance (${D} km)`, ok: false, why: 'The distance is given.' },
      { text: `the time for each trip (${t1} h and ${t2} h)`, ok: false, why: 'Both times are given.' },
    ],
    eqs: [mk(t1, '-', [0], true), mk(t2, '+', [1], false)],
    strategy: { best: 'elimination', why: `Divide each equation by its time first. You get «p - q = ${D / t1}» and «p + q = ${D / t2}». Adding them cancels «q» immediately.` },
    conclusion: { units: ['km/h', 'kph', 'kilometres per hour', 'kilometers per hour', 'km per hour'], unitHint: 'Speeds are in km/h.' },
    diagram: { type: 'wind', craft: C.craft, med: C.med },
    numbers: [t1, t2, D], _C: C,
  };
}
wind.random = r => {
  const kind = r() < 0.55 ? 'plane' : 'boat';
  for (let i = 0; i < 400; i++) {
    const t2 = ri(r, 2, 6), t1 = t2 + ri(r, 1, 3);
    const k = kind === 'plane' ? ri(r, 8, 44) * 5 : ri(r, 1, 12);
    const v = k * (t1 + t2) / 2, w = k * (t1 - t2) / 2;
    if (!Number.isInteger(v) || !Number.isInteger(w)) continue;
    if (kind === 'plane' && (v < 150 || v > 900 || w < 15 || w > 120)) continue;
    if (kind === 'boat' && (v < 8 || v > 45 || w < 1 || w > 10)) continue;
    return { kind, t1, t2, D: t1 * (v - w), _ans: [v, w] };
  }
  return { kind: 'plane', t1: 4, t2: 3, D: 960, _ans: [280, 40] };
};

// ---- registry -------------------------------------------------------------------
const BUILDERS = { numbers, ages, tickets, bills, mixture, investment, distance, wind };

/** Split "[[key]] words" markup into tappable words. */
export function parseSentence(s) {
  const words = [], keys = [];
  s.split(/(\[\[.*?\]\])/).forEach(chunk => {
    if (!chunk) return;
    const m = /^\[\[(.*)\]\]$/.exec(chunk);
    const text = m ? m[1] : chunk;
    const key = m ? keys.push(text) - 1 : null;
    const glued = !m && !/^\s/.test(chunk) && words.length;
    text.split(/\s+/).filter(Boolean).forEach((w, i) => {
      // punctuation right after a key phrase sticks to the previous word
      if (glued && i === 0 && /^[^\w$]+$/.test(w)) { words[words.length - 1].tail = w; return; }
      words.push({ w, key });
    });
  });
  return { words, keys, text: s.replace(/\[\[|\]\]/g, '') };
}

/**
 * Build a full problem from a spec { cat, params }.
 * Solves the equations (it does NOT trust the answer key) and attaches the result.
 */
export function buildProblem(spec) {
  const B = BUILDERS[spec.cat];
  if (!B) throw new Error('Unknown category ' + spec.cat);
  const prob = B(spec.params);
  prob.spec = spec;
  prob.parsed = prob.sentences.map(parseSentence);
  prob.text = prob.parsed.map(p => p.text).join(' ');
  const id = { p: 'x', q: 'y' };
  const [e1, e2] = prob.eqs.map(e => parseEquation(inst(e.tpl, id)));
  const s = solve2(e1, e2);
  if (!s) throw new Error('No unique solution for ' + JSON.stringify(spec));
  prob.solution = { p: s.x, q: s.y };

  // Concluding sentence + what must appear in it.
  const { p, q } = prob.solution;
  const C = prob.conclusion;
  const fmt = n => (Number.isInteger(n) ? String(n) : String(parseFloat(n.toFixed(4))));
  const need = (val, i) => ({ value: val, words: needWords(prob, i), what: prob.q[i].desc });
  const all = [need(p, 0), need(q, 1)];
  C.needs = prob.ask === 'both' ? all : [all[prob.ask === 'p' ? 0 : 1]];
  C.others = prob.ask === 'both' ? [] : [all[prob.ask === 'p' ? 1 : 0]];
  if (typeof C.model === 'function') C.model = C.model(fmt(p), fmt(q));
  else C.model = defaultConclusion(prob, fmt(p), fmt(q));
  return prob;
}

function needWords(prob, i) {
  if (prob.cat === 'numbers') return ['number'];
  return prob.q[i].keys[0];
}
function defaultConclusion(prob, p, q) {
  const a = prob.ask, P = prob.spec.params;
  switch (prob.cat) {
    case 'numbers': return `Therefore, the two numbers are ${p} and ${q}.`;
    case 'ages':
      if (a === 'both') return `Therefore, ${P.n1} is ${p} years old and ${P.n2} is ${q} years old.`;
      return `Therefore, ${a === 'p' ? P.n1 : P.n2} is ${a === 'p' ? p : q} years old.`;
    case 'tickets':
      if (a === 'both') return `Therefore, ${p} adult tickets and ${q} student tickets were sold.`;
      return `Therefore, ${a === 'p' ? p : q} ${a === 'p' ? 'adult' : 'student'} tickets were sold.`;
    case 'mixture': {
      const M = prob._M;
      if (a === 'both') return `Therefore, ${p} ${M.unit} of the ${P.c1}% solution and ${q} ${M.unit} of the ${P.c2}% solution are needed.`;
      return `Therefore, ${a === 'p' ? p : q} ${M.unit} of the ${a === 'p' ? P.c1 : P.c2}% solution is needed.`;
    }
    case 'investment':
      if (a === 'both') return `Therefore, $${p} was invested at ${P.r1}% and $${q} was invested at ${P.r2}%.`;
      return `Therefore, $${a === 'p' ? p : q} was invested at ${a === 'p' ? P.r1 : P.r2}%.`;
    case 'distance':
      if (a === 'both') return `Therefore, the trip was ${p} hours at ${P.v1} km/h and ${q} hours at ${P.v2} km/h.`;
      return `Therefore, the trip was ${a === 'p' ? p : q} hours at ${a === 'p' ? P.v1 : P.v2} km/h.`;
    case 'wind': {
      const C = prob._C;
      return `Therefore, the speed of the ${C.craft} ${C.still} is ${p} km/h and the speed of the ${C.med} is ${q} km/h.`;
    }
    default: return `Therefore, the answers are ${p} and ${q}.`;
  }
}

/** Is this problem sensible? Returns a list of complaints (empty = valid). */
export function validateProblem(prob) {
  const out = [];
  const { p, q } = prob.solution;
  const P = prob.spec.params;
  if (!(p > 0 && q > 0)) out.push('answers must be positive');
  const needInt = !(prob.cat === 'investment');
  if (needInt && !(isInt(p) && isInt(q))) out.push('answers must be whole numbers');
  if (prob.cat === 'investment' && !(isInt(p * 100) && isInt(q * 100))) out.push('money must be whole cents');
  if (P._ans && !(z(P._ans[0] - p) && z(P._ans[1] - q))) out.push(`expected ${P._ans} but equations give ${p}, ${q}`);
  if (prob.cat === 'numbers' && !(p > q)) out.push('larger number must be larger');
  if (prob.cat === 'ages' && (p > 110 || q > 110)) out.push('unrealistic age');
  if (prob.cat === 'mixture') {
    const lo = Math.min(P.c1, P.c2), hi = Math.max(P.c1, P.c2);
    if (!(P.ct > lo && P.ct < hi && hi <= 100 && lo >= 0)) out.push('mixture strength must sit between the two solutions');
  }
  if (prob.cat === 'wind' && !(p > q)) out.push('craft must be faster than the wind/current');
  if (prob.cat === 'distance' && (P.v1 <= 0 || P.v2 <= 0 || P.v1 > 130 || P.v2 > 130)) out.push('unrealistic speed');
  if (prob.cat === 'wind' && P.kind === 'plane' && (p > 1000 || q > 150)) out.push('unrealistic speed');
  if (prob.eqs.some(e => !e.sent.length)) out.push('equation has no source sentence');
  if (prob.eqs[0].tpl === prob.eqs[1].tpl) out.push('equations are identical');
  return out;
}

/** Generate a fresh, validated problem spec for a category. */
export function generate(cat, seed = Date.now()) {
  const r = makeRng(seed);
  for (let i = 0; i < 300; i++) {
    const spec = { cat, params: BUILDERS[cat].random(r) };
    try {
      if (!validateProblem(buildProblem(spec)).length) return spec;
    } catch { /* try again */ }
  }
  throw new Error('Could not generate a valid ' + cat + ' problem');
}

export const categoryById = id => CATEGORIES.find(c => c.id === id);
