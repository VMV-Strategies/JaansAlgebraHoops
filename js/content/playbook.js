// ---------------------------------------------------------------------------
// playbook.js — short reference pages. Each section can give different text
// for the three explanation levels (5 / 10 / 15), or one string for all.
// «...» marks math to typeset.  Lines starting with "| " are worked-solution
// lines shown the way they would be written on paper.
// ---------------------------------------------------------------------------
export const PLAYBOOK = [
  {
    id: 'routine', title: 'The Routine', icon: '🏀', blurb: 'The eight steps, every time.',
    sections: [
      { h: 'Why a routine?', body: {
        5: 'Free-throw shooters do the same thing every single time: same bounces, same breath, same release. Word problems work the same way. Do the same eight steps in the same order and the paragraph stops being scary.',
        10: 'Most mistakes in word problems happen before any algebra starts. A fixed routine makes sure you define your variables and translate carefully before you calculate.',
        15: 'A consistent routine separates translation from calculation, which is where most errors come from.' } },
      { h: 'The eight steps', list: [
        'READ THE PLAY: read twice, mark numbers and relationship words, find the question.',
        'DEFINE THE PLAYERS: which two quantities are unknown?',
        'WRITE THE LET STATEMENTS: Let x = …, Let y = …, precisely.',
        'TRANSLATE THE STORY: one sentence at a time, phrase by phrase.',
        'BUILD THE EQUATIONS: two unknowns need two equations.',
        'RUN THE PLAY: substitution or elimination, one line per step.',
        'CHECK THE SCORE: L.S. = R.S. in both original equations.',
        'WRITE THE FINAL ANSWER: a sentence, with units, that answers the question.',
      ] },
      { h: 'What it looks like on paper', paper: [
        'Let x = the larger number', 'Let y = the smaller number', '',
        '«x + y = 377»  ①', '«x - y = 107»  ②', '',
        '① + ②:  «2x = 484»', '«x = 242»', '',
        'Substitute into ①:  «242 + y = 377»', '«y = 135»', '',
        'Therefore, the two numbers are 242 and 135.',
      ] },
    ],
  },
  {
    id: 'lets', title: 'Let Statements', icon: '📝', blurb: 'Say exactly what x and y mean.',
    sections: [
      { h: 'What a Let statement is', body: {
        5: 'A Let statement is a name tag for a letter. “Let x = the number of adult tickets” tells everyone, including you five minutes from now, what x is.',
        10: 'A Let statement defines a variable. It names the quantity precisely, including what is being counted or measured.',
        15: 'A Let statement defines each variable as a specific quantity, with units.' } },
      { h: 'Three rules', list: [
        'A variable is a NUMBER. Not “adult tickets” but “the number of adult tickets”. Not “Lisa” but “Lisa’s age”.',
        'Only unknowns get letters. If the story gives a value (a price, a total, a rate), use the number.',
        'One letter, one quantity. Two unknowns means two Let statements.',
      ] },
      { h: 'Good and not-yet-good', compare: [
        ['Let x = adult tickets', 'Let x = the number of adult tickets sold'],
        ['Let x = the 60% solution', 'Let x = the number of kilograms of the 60% solution'],
        ['Let x = the plane', 'Let x = the speed of the plane in still air (km/h)'],
        ['Let x = the money', 'Let x = the amount invested at 9%'],
      ] },
      { h: 'How to find the unknowns', body: 'Read the question sentence. It almost always names them: “How many adult tickets…”, “Find the two numbers”, “How much was invested at each rate”. If the question asks for only one thing but the story has two things you do not know, you still need two variables.' },
    ],
  },
  {
    id: 'phrases', title: 'Keywords & Phrases', icon: '🔄', blurb: 'English to algebra, with the traps.', link: ['#/lab/phrases', 'Open the full phrase list'],
    sections: [
      { h: 'Keywords are clues, not rules', body: {
        5: 'Words like “sum” and “times” are like a defender’s hips: they usually tell you where the play is going, but you still have to watch the whole court. Always ask what the sentence is actually saying.',
        10: 'A keyword suggests an operation, but the context decides. “Total” often means add, but a total number of bills and a total value in dollars lead to different equations.',
        15: 'Treat keywords as hints. Confirm the operation from the meaning and the units.' } },
      { h: 'The big five', list: [
        '“sum”, “total”, “altogether”, “increased by”, “more than”  →  add',
        '“difference”, “decreased by”, “less than”, “remaining”  →  subtract',
        '“times”, “twice”, “of” (after a percent), “per” × how many  →  multiply',
        '“half of”, “quotient”  →  divide',
        '“is”, “was”, “equals”, “will be”  →  =',
      ] },
      { h: 'The “less than” trap', body: '“4 less than a number” is «x - 4», not «4 - x». You are taking 4 away from the number, so the number comes first. “Decreased by” reads in normal order: “a number decreased by 4” is also «x - 4».' },
      { h: 'Translate in chunks', body: 'Take “Three times the larger number increased by four times the smaller number is 205.” Chunk it: [three times the larger number] [increased by] [four times the smaller number] [is] [205]. Each chunk becomes one piece: «3x», «+», «4y», «=», «205».' },
    ],
  },
  {
    id: 'substitution', title: 'Substitution', icon: '🔁', blurb: 'Swap a variable for what it equals.',
    sections: [
      { h: 'The idea', body: {
        5: 'If one equation tells you “y is the same as 3x − 56”, then anywhere you see y you can write 3x − 56 instead. Now the other equation only has x in it, and you know how to solve that.',
        10: 'Get one variable alone on one side. Replace that variable in the OTHER equation with the expression it equals. That leaves one equation with one variable.',
        15: 'Isolate a variable, substitute into the other equation, solve, then back-substitute.' } },
      { h: 'When to choose it', body: 'When an equation already looks like “y = …” or “x = …”, or when a variable has a coefficient of 1 so it is easy to isolate (like «x + y = 128»).' },
      { h: 'Worked example', paper: [
        '«5x + 3.50y = 2005»  ①', '«y = 3x - 56»  ②', '',
        'Substitute ② into ①:', '«5x + 3.50(3x - 56) = 2005»', '«5x + 10.5x - 196 = 2005»', '«15.5x = 2201»', '«x = 142»', '',
        '«y = 3(142) - 56»', '«y = 370»',
      ] },
      { h: 'Watch for', list: ['Brackets. The whole expression gets multiplied: «3.50(3x - 56)».', 'A minus sign in front of a bracket changes every sign inside.', 'Substitute into the OTHER equation, not the one you rearranged.'] },
    ],
  },
  {
    id: 'elimination', title: 'Elimination', icon: '➕', blurb: 'Add or subtract to cancel a variable.',
    sections: [
      { h: 'The idea', body: {
        5: 'Stack the two equations on top of each other. If one has +y and the other has −y, adding them makes the y’s cancel out, like two equal teams pulling a rope in opposite directions.',
        10: 'Line the equations up in columns. If a variable has opposite coefficients, add. If the coefficients are the same, subtract. If neither, multiply an equation first so they match.',
        15: 'Match coefficients, then add or subtract the equations to eliminate one variable.' } },
      { h: 'When to choose it', body: 'When both equations are already in the form ax + by = c, especially if a variable has matching or opposite coefficients.' },
      { h: 'Worked example', paper: [
        '«x + y = 128»  ①', '«5x + 2y = 424»  ②', '',
        '① × 2:  «2x + 2y = 256»  ③', '',
        '② − ③:  «3x = 168»', '«x = 56»', '',
        'Substitute into ①:  «56 + y = 128»', '«y = 72»',
      ] },
      { h: 'Watch for', list: ['Multiply EVERY term, including the number on the right.', 'When subtracting, subtract every column: x-terms, y-terms and the numbers.', 'Opposite signs: add. Same signs: subtract.'] },
    ],
  },
  {
    id: 'drt', title: 'Distance, Speed, Time', icon: '🚗', blurb: 'distance = speed × time.',
    sections: [
      { h: 'One formula', body: {
        5: 'If you go 50 km every hour, then in 3 hours you go 50, three times: 150 km. That is all the formula says: distance = speed × time.',
        10: 'distance = speed × time. The units tell you it works: km/h × h = km. Speed and time are multiplied, never added.',
        15: 'distance = speed × time. Check the units: km/h × h = km.' } },
      { h: 'A trip in two parts', body: 'Let x and y be the two times. The times add up to the total time: «x + y = 5». Each part’s distance is speed × time, and the distances add up to the total distance: «50x + 80y = 310».' },
      { h: 'Wind and current', body: 'With the wind, speeds add: «x + y». Against the wind, they subtract: «x - y». That whole speed is then multiplied by the time, so it needs brackets: «4(x - y) = 960».' },
      { h: 'Watch for', list: ['An equation like «x + y = 310» where x and y are hours but 310 is kilometres. Both sides must be the same kind of thing.', 'Forgetting brackets: «4x - y» is not «4(x - y)».', 'Mixing up which trip is with the wind. The faster trip takes less time.'] },
    ],
  },
  {
    id: 'mixtures', title: 'Mixtures & Interest', icon: '🧪', blurb: 'Percent × amount, on both sides.',
    sections: [
      { h: 'Two equations, always the same two', body: {
        5: 'Pour two jugs into one bucket. First fact: the amounts add up to what is in the bucket. Second fact: the pure stuff (alcohol, acid, juice) from each jug adds up to the pure stuff in the bucket. Nothing appears or disappears.',
        10: 'Equation 1 tracks the total amount: «x + y = 400». Equation 2 tracks only the pure ingredient: (percent × amount) for each solution adds to (percent × amount) for the mixture.',
        15: 'Total amount: «x + y = 400». Pure ingredient, with percents as decimals: «0.60x + 0.40y = 0.51(400)».' } },
      { h: 'Worked setup', paper: [
        'Let x = kg of the 60% solution', 'Let y = kg of the 40% solution', '',
        '«x + y = 400»', '«0.60x + 0.40y = 0.51(400)»',
      ] },
      { h: 'Percent to decimal', body: 'Divide by 100: 60% = 0.60, 9% = 0.09, 51% = 0.51. A common slip is writing 9% as 0.9 (that is 90%) or as 9.' },
      { h: 'Investments are the same shape', body: 'Money split between two rates: «x + y = 9000» for the amounts, and «0.09x + 0.08y = 750» for the interest. Interest = rate × amount.' },
      { h: 'Watch for', list: ['Setting the pure-ingredient side equal to the total amount. The mixture is not 100% pure.', 'Adding the percents together. Percents apply to amounts. They do not add on their own.', 'A sanity check: the mixture’s strength must fall between the two strengths you started with.'] },
    ],
  },
  {
    id: 'checking', title: 'Check & Conclude', icon: '✅', blurb: 'L.S. = R.S., then a sentence.',
    sections: [
      { h: 'The check', body: 'Substitute your values into BOTH original equations. Work out the left side and the right side separately. If one equation fails, the mistake is usually in the algebra. If both pass but the answer seems silly (a negative age, half a ticket), the mistake is usually in the translation.' },
      { h: 'How it looks', paper: [
        'Check in ①:', 'L.S. = «242 + 135» = 377', 'R.S. = 377', 'L.S. = R.S. ✓', '',
        'Check in ②:', 'L.S. = «242 - 135» = 107', 'R.S. = 107', 'L.S. = R.S. ✓',
      ] },
      { h: 'The concluding sentence', list: [
        'Answer the question that was asked. If it asks for Ellen’s age, do not stop at Lisa’s.',
        'Use the words of the story, not “x = 142”.',
        'Include units: tickets, kg, km/h, years, dollars.',
        'Start with “Therefore,” so your teacher can find it.',
      ] },
    ],
  },
];

export const articleById = id => PLAYBOOK.find(a => a.id === id);
