// ---------------------------------------------------------------------------
// teaching.js — the coach's voice.
//
//   ROUTINE     the eight-step routine shown at the top of every problem
//   STAGE_TEXT  what the coach says at each step, at three explanation levels
//               (5 = very concrete, 10 = vocabulary explained, 15 = concise)
//   MISTAKES    what each diagnosed mistake means + a tip for the parent view
//   insights()  turns raw stats into "strongest / biggest opportunity"
// ---------------------------------------------------------------------------
import { TAGS, CATEGORIES } from './categories.js';

export const ROUTINE = [
  { id: 'read', label: 'Read', long: 'Read the play' },
  { id: 'players', label: 'Players', long: 'Define the players' },
  { id: 'lets', label: 'Let', long: 'Write the Let statements' },
  { id: 'translate', label: 'Translate', long: 'Translate the story' },
  { id: 'build', label: 'Build', long: 'Build the equations' },
  { id: 'run', label: 'Run', long: 'Run the play' },
  { id: 'check', label: 'Check', long: 'Check the score' },
  { id: 'answer', label: 'Answer', long: 'Write the final answer' },
];

export const STAGE_TEXT = {
  read: {
    title: 'Read the play',
    5: 'A word problem is a play drawn up in words. Read it once all the way through. Then go back and tap every number and every phrase that says what happens to a number.',
    10: 'Read the whole problem first. On the second read, mark the given numbers and the relationship words (sum, more than, times, total). Then find the question. It tells you what the unknowns are.',
    15: 'Read twice. Mark the given values and the relationship phrases, then pin down exactly what the question asks for.',
  },
  players: {
    title: 'Define the players',
    5: 'The players are the amounts nobody has told you yet. If the story gives a number for something, it is already on the scoreboard, so it is not a player.',
    10: 'Unknowns are quantities the story gives no value for. Prices, totals and rates that are stated are “givens”. Two unknowns means you will need two equations.',
    15: 'Identify the two unknown quantities. Everything else is given.',
  },
  lets: {
    title: 'Write the Let statements',
    5: 'Give each unknown a jersey: x for one and y for the other. Then write down exactly what each letter means, like “the number of adult tickets”. If the meaning is fuzzy, the equations will be too.',
    10: 'A Let statement says precisely what each variable stands for, including what is being counted or measured: “Let x = the number of …”. Your teacher looks for these first.',
    15: 'Define each variable with a precise Let statement: the quantity, and its unit where there is one.',
  },
  clue: {
    title: 'Translate the story',
    5: 'Each sentence with numbers in it is a clue. Take one clue and say it again slowly, using x and y in place of the unknowns. Words like “sum” and “times” tell you which math symbol to use.',
    10: 'Translate one sentence at a time. Find the relationship phrase, decide what operation it means in this context, and write it with your variables. “Is” usually becomes “=”.',
    15: 'Translate each relationship sentence into an equation in x and y, and check it against your Let statements.',
  },
  strategy: {
    title: 'Choose a strategy',
    5: 'Two equations, two unknowns. You need to get down to ONE equation with ONE letter. Substitution swaps a letter out for what it equals. Elimination makes a letter cancel.',
    10: 'Substitution: if one equation says “y = …”, put that in place of y in the other equation. Elimination: line the equations up and add or subtract them so one variable cancels.',
    15: 'Use substitution when a variable is already (or easily) isolated. Use elimination when coefficients match or are easy to match.',
  },
  solve: {
    title: 'Run the play',
    5: 'Make one move at a time. Write each new line under the last one so you can see exactly what changed.',
    10: 'Show each step on its own line: the substitution or the combined equations, the simplified equation, then the value.',
    15: 'Solve the system, showing each step.',
  },
  check: {
    title: 'Check the score',
    5: 'Put your two answers back into BOTH equations. Work out the left side, then the right side. If they come out the same, the scoreboard agrees with you.',
    10: 'Substitute both values into each original equation. Work out the left side (L.S.) and the right side (R.S.) separately. They must match.',
    15: 'Verify that L.S. = R.S. in both original equations.',
  },
  final: {
    title: 'Write the final answer',
    5: 'x and y are your own shorthand. The question was asked in words, so answer in words: say what the numbers are, with units.',
    10: 'Finish with a sentence that answers the question that was asked, with units. Usually it starts “Therefore, …”. Make sure it is the quantity the question wanted.',
    15: 'State the answer in a concluding sentence, with units.',
  },
};

export const STRATEGY_TEXT = {
  substitution: {
    name: 'Substitution',
    5: 'One equation tells you what a letter is worth in terms of the other. Swap that in, like subbing one player for another, and only one letter is left.',
    10: 'Get one variable alone (y = …), then replace that variable in the other equation with what it equals.',
    15: 'Isolate one variable, substitute into the other equation, solve, then back-substitute.',
  },
  elimination: {
    name: 'Elimination',
    5: 'Stack the two equations. If one has +y and the other has −y, adding them makes y vanish, and only x is left.',
    10: 'Line the equations up in columns. Multiply if needed so one variable has matching coefficients, then add or subtract so it cancels.',
    15: 'Match coefficients, add or subtract to eliminate one variable, solve, then back-substitute.',
  },
};

/** Short, grown-up acknowledgements. No confetti. */
export const NODS = {
  read: ['Nice read, {name}.', 'Good eyes.', 'That is the question.'],
  players: ['You found the unknowns.', 'Those are the players.'],
  lets: ['Good setup.', 'Clear Let statements.', 'That is how your teacher wants it.'],
  eq1: ['That is one equation. Now find the second clue.', 'Clean translation. One more clue to go.'],
  eq2: ['Both equations are on the board.', 'Great. Now run the algebra.'],
  solve: ['Good.', 'Next line.', 'Right.'],
  check: ['Left side equals right side.', 'It checks out.'],
  final: ['That answers the question.', 'Final answer, in a sentence, with context.'],
};
export const nod = (key, name, n = 0) => NODS[key][n % NODS[key].length].replace('{name}', name);

// ---- mistake catalogue -------------------------------------------------------
export const MISTAKES = {
  swap: ['Reversing x and y', 'Before building each equation, have him read his Let statements out loud.'],
  'less-than': ['“Less than / decreased by” order', 'Practise “less than” phrases in the Translation Lab. The subtraction comes after the quantity.'],
  brackets: ['Missing or misplaced brackets', 'Ask: “What exactly is being multiplied?” If it is a whole quantity, it needs brackets.'],
  'value-vs-count': ['Mixing up a count with a value', 'Ask what each side of the equation is measured in: items, or dollars?'],
  'percent-decimal': ['Using 9 instead of 0.09 for a percent', 'Review percent to decimal: divide by 100.'],
  'percent-total': ['Percent of the wrong total', 'In mixtures, track only the pure ingredient: percent × amount on both sides.'],
  'percent-missing': ['Leaving the percent out', 'Each amount must be multiplied by its rate or strength.'],
  'drt-add': ['Adding speed and time', 'Rehearse distance = speed × time with units: km/h × h = km.'],
  'drt-missing-time': ['Setting a speed equal to a distance', 'Have him label the units on each side of the equation.'],
  units: ['Mixing units across the equals sign', 'Both sides of an equation must measure the same thing.'],
  'wind-direction': ['With vs. against the wind', 'With = add the speeds. Against = subtract.'],
  'future-age': ['“In N years” applied to only one person', 'Write both future ages before comparing them.'],
  operation: ['Choosing the wrong operation for a phrase', 'Use the Keywords & Phrases page in the Playbook.'],
  'times-vs-plus': ['Adding when the phrase means multiply', '“Times” and “twice” multiply. “More than” adds.'],
  'comparison-side': ['Putting the extra amount on the wrong side', 'Ask which quantity is bigger, then make the smaller side catch up.'],
  coefficient: ['Dropping a multiplier', 'Translate chunk by chunk so nothing gets skipped.'],
  'other-clue': ['Writing the equation for a different sentence', 'One sentence, one equation. Cover the other sentences with a hand.'],
  constant: ['Right variables, wrong number', 'Re-read the sentence for the number it actually gives.'],
  'one-variable': ['Using only one unknown in a two-unknown sentence', 'Ask which quantities the sentence connects.'],
  'let-known': ['Using a known value as a variable', 'Sort the story into “given” and “not given” before choosing variables.'],
  'let-measure': ['Vague Let statements (missing “the number of…” or units)', 'A variable is a number. Insist on “the number of…”, “the amount of…”, “the speed of…”.'],
  'let-ambiguous': ['One variable for two things', 'Each unknown gets its own letter.'],
  'final-bare': ['Ending with “x = …” instead of a sentence', 'Have him answer in the words of the question.'],
  'final-context': ['Final sentence without context', 'The sentence should make sense to someone who never saw the algebra.'],
  'final-units': ['Forgetting units in the final answer', 'Circle the unit in the question before writing the conclusion.'],
  'final-wrong-quantity': ['Solving correctly but answering a different question', 'Re-read the last sentence of the problem before writing the conclusion.'],
  'final-missing': ['Leaving part of the answer out', 'Check how many things the question asks for.'],
};

const SKILL_NAMES = {
  identify: 'reading the question and spotting the unknowns',
  lets: 'writing Let statements',
  equations: 'turning sentences into equations',
  algebra: 'the algebra',
  check: 'checking answers',
  final: 'writing the concluding sentence',
};
export const SKILL_LABELS = {
  identify: 'Reading & unknowns', lets: 'Let statements', equations: 'Equation building',
  algebra: 'Algebra', check: 'Checking', final: 'Final statement',
};

const pct = ([ok, n]) => (n ? Math.round((100 * ok) / n) : null);

/**
 * Turn stats into plain-language findings.
 * @returns {{ready:boolean, headline:string, strongest?:string, weakest?:string, recs:string[], weakTag?:string, weakCat?:string, strongCat?:string}}
 */
export function insights(stats, name = 'Jaan') {
  const skills = Object.entries(stats.skills).map(([k, v]) => ({ k, p: pct(v), n: v[1] })).filter(s => s.n >= 3);
  const recs = [];
  const out = { ready: skills.length >= 2, recs, headline: '' };

  const cats = CATEGORIES.map(c => ({ c, m: masteryOf(stats, c.id), n: (stats.cats[c.id]?.scores || []).length })).filter(x => x.n > 0);
  if (cats.length) {
    cats.sort((a, b) => b.m - a.m);
    out.strongCat = cats[0].c.name;
    if (cats.length > 1 && cats[cats.length - 1].m < 80) out.weakCat = cats[cats.length - 1].c.name;
  }
  const tags = Object.entries(stats.tags).map(([k, v]) => ({ k, p: pct(v), n: v[1] })).filter(t => t.n >= 3).sort((a, b) => a.p - b.p);
  if (tags.length && tags[0].p < 75) out.weakTag = TAGS[tags[0].k];

  if (!out.ready) {
    out.headline = stats.completed
      ? `Good start, ${name}. A few more problems and this page will show where your game is strongest.`
      : `No reps logged yet. Run a problem and your stats will show up here.`;
    return out;
  }
  skills.sort((a, b) => b.p - a.p);
  const best = skills[0], worst = skills[skills.length - 1];
  out.strongest = best.k; out.weakest = worst.k;
  if (worst.p >= 85) {
    out.headline = `${name}, every part of your routine is solid right now. Push into Game Mode or a category you have not tried.`;
  } else {
    const focus = worst.k === 'equations' && out.weakTag ? `translating ${out.weakTag} into equations` : SKILL_NAMES[worst.k];
    out.headline = `${name}, ${best.k === 'algebra' ? 'your algebra is strong' : `you are strong at ${SKILL_NAMES[best.k]}`}. Your biggest opportunity right now is ${focus}.`;
  }

  // Practical recommendations (parent view).
  const top = Object.entries(stats.mistakes).filter(([k, n]) => MISTAKES[k] && n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 3);
  top.forEach(([k]) => recs.push(`${MISTAKES[k][0]}: ${MISTAKES[k][1]}`));
  if (out.weakTag) recs.push(`Practise ${out.weakTag} in the Translation Lab.`);
  if (out.weakCat) recs.push(`${out.weakCat} need more work. Start in Learn mode, then Practice.`);
  const alg = pct(stats.skills.algebra), lets = pct(stats.skills.lets), eqs = pct(stats.skills.equations);
  if (alg !== null && alg >= 80 && lets !== null && lets < 70) recs.push(`${name} handles the solving but is struggling to define variables. Use the Let Statement warm-up.`);
  if (alg !== null && alg >= 80 && eqs !== null && eqs < 70) recs.push(`The algebra is fine once equations exist. The gap is translation, so spend time in the Translation Lab.`);
  if (stats.hintProblems >= 3 && stats.hintsTotal / stats.hintProblems > 4) recs.push('Hints are being used a lot. That is fine while learning. Try one problem a day in Practice mode with a two-hint limit.');
  if (!recs.length) recs.push('No clear weak spot yet. Keep a steady rhythm: one or two full problems a day beats a long session once a week.');
  return out;
}

/** Mastery for a category = average of the last five scores (0–100). */
export function masteryOf(stats, catId) {
  const s = stats.cats[catId]?.scores || [];
  if (!s.length) return 0;
  return Math.round(s.reduce((a, b) => a + b, 0) / s.length);
}
export const accuracy = pair => pct(pair);
