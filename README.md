# 🏀 Jaan's Algebra Hoops

**Read the play. Build the equation. Solve the game.**

A training app for word problems that lead to two equations with two unknowns
(Ontario secondary math, linear systems). It runs in a web browser, installs on
an iPhone home screen like a normal app, and works without internet after the
first visit.

It is built for a student who can already do the algebra but gets stuck turning
the paragraph into equations. So most of the app is about the steps before the
algebra:

**words → variables → Let statements → equations → solution → check → conclusion**

---

## What is in the app

| Screen | What it does |
| --- | --- |
| **Home** | Streak, problems solved, translation accuracy, and "Continue training". |
| **Train** | The nine class-worksheet problems, plus endless new problems in eight categories. Three modes: Learn (coached), Practice (hints on request), Game (no hints, scored on the whole process). |
| **Translation Lab** | Short reps that turn phrases like "four less than" into algebra, a Let-statement warm-up, and a phrase list. |
| **Playbook** | Short reference pages: the routine, Let statements, key phrases, substitution, elimination, distance/speed/time, mixtures and interest, checking. |
| **Progress** | Accuracy for each step of the routine, mastery by category, achievements, recent problems. |
| **Coach** | A parent view: what was practised, strongest and weakest areas, repeated mistakes, and what to work on next. Reach it from the person icon on Home. |
| **Show my teacher** | After any problem, the clean solution exactly as it should be written on paper, with a separate "learning explanation" view. It can be printed. |

Every problem follows the same routine:

1. **Read the play** (mark the key facts, find the question)
2. **Define the players** (which quantities are unknown?)
3. **Write the Let statements**
4. **Translate the story** (one sentence at a time)
5. **Build the equations**
6. **Run the play** (substitution or elimination, line by line)
7. **Check the score** (L.S. = R.S. in both equations)
8. **Write the final answer** (a sentence, with units)

The explanation level (ELI5 / ELI10 / ELI15) can be changed at any moment,
including in the middle of a problem, without losing any work.

### About the worksheet problems

The nine worksheet problems are in `js/content/worksheet.js`. The app solves
each one itself and the automated tests confirm the results match the answer
key (242 and 135; 17; 142 adult tickets; 56 and 72 bills; 180 kg; $3000;
3 hours; 31 and 28; plane 280 km/h and wind 40 km/h).

**Please check the wording against the paper worksheet.** Problems 1, 3 and 8
follow the wording that was supplied. For the others only the answer and the
first line were available, so the remaining details (for example the ticket
prices, the total number of bills, the trip distance) were chosen to be
consistent with the answer key. To change a problem, edit its numbers in
`js/content/worksheet.js` and run the tests.

---

## Put it on the internet with GitHub Pages (about 10 minutes, no coding)

You need a free GitHub account (github.com).

### 1. Create the repository

1. Sign in at **github.com**.
2. Click the **+** in the top-right corner, then **New repository**.
3. Repository name: `jaans-algebra-hoops`
4. Choose **Public**. (GitHub Pages on a free account needs a public repository. The app contains no personal data beyond the first name in its title.)
5. Leave everything else as it is and click **Create repository**.

### 2. Upload the files

1. Unzip `jaans-algebra-hoops.zip` on your computer. Open the folder so you can see `index.html`, `css`, `js`, `icons` and the rest.
2. On the new repository page, click the link **uploading an existing file**.
3. Select **everything inside the folder** (not the folder itself) and drag it onto the page. Wait until all files are listed. The `css`, `js`, `icons` and `tests` folders must appear with their contents.
4. Scroll down and click **Commit changes**.

Check: the repository's front page should now show `index.html` at the top
level, next to the `css`, `js` and `icons` folders. If you see a single folder
called `jaans-algebra-hoops` instead, the files are one level too deep. Delete
it and upload the contents again.

### 3. Turn on GitHub Pages

1. In the repository, click **Settings** (top row).
2. In the left-hand menu click **Pages**.
3. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
4. Under **Branch**, choose **main** and **/ (root)**, then click **Save**.
5. Wait one to two minutes, then refresh the page. A box appears: **Your site is live at …**

### 4. Your web address

The address is:

```
https://YOUR-USERNAME.github.io/jaans-algebra-hoops/
```

Open it once on a computer to make sure the welcome screen appears.

### 5. Install it on Jaan's iPhone

1. Open the address above in **Safari** (it must be Safari).
2. Tap the **Share** button (the square with an arrow).
3. Scroll down and tap **Add to Home Screen**.
4. Confirm the name "Jaan's Algebra Hoops" (shorten it to "Algebra Hoops" if you want the whole label to show under the icon) and tap **Add**.
5. Launch it from the Home Screen icon. It opens full screen, without Safari's address bar.

Open it once while online. After that it works with no internet connection.

---

## Updating the app later

1. Change the files on your computer (or edit them directly on github.com with the pencil icon).
2. **Open `service-worker.js` and change the version line**, for example from `const VERSION = 'v1.0.0';` to `const VERSION = 'v1.0.1';`. This tells installed copies to download the new files.
3. Upload the changed files to the repository (**Add file → Upload files**, then **Commit changes**). Files with the same name are replaced.
4. On the iPhone, close the app fully and open it twice. The first launch downloads the update in the background and the second launch shows it.

Progress is not affected by updates.

---

## Progress and privacy

- Progress is saved **in the browser on that one device** (browser "local storage", under the single key `jah.v1`).
- There is **no account, no server, no analytics, no advertising and no tracking**. The app never sends anything anywhere. The automated tests check that the code contains no network calls or outside web addresses.
- Because the data stays on the device, it does not sync between devices. Progress on the iPhone app and progress in a laptop browser are separate.
- On iPhone, the Home Screen app and Safari keep separate storage, so use the Home Screen icon consistently.
- iOS may clear the data of a web app that has not been opened for several weeks.

### Resetting progress

In the app: **Home → gear icon → Reset progress**, then confirm. This clears
stats, streak, achievements and saved problems. The player name and settings
are kept.

To wipe absolutely everything, delete the app from the Home Screen, or in
iPhone **Settings → Safari → Advanced → Website Data**, remove the entry for
`github.io`.

---

## Running it on your own computer (optional)

The app must be opened through a small local web server. Double-clicking
`index.html` will not work, because browsers block app features on files opened
directly.

With Python (already installed on a Mac):

```
cd jaans-algebra-hoops
python3 -m http.server 8080
```

Then open `http://localhost:8080` in a browser. Press Ctrl+C to stop.

### Running the tests (optional, needs Node.js 20 or newer)

```
npm test
```

There is nothing to install. The tests solve all nine worksheet problems and
compare them with the answer key, generate 2,000 random problems and check each
one is sensible (no negative ages, fractional tickets or impossible mixtures),
confirm every worked solution line is mathematically true, and check the
offline file list is complete.

---

## How the files are organised

There is no build step and no outside code. What you see is what runs.

```
index.html               the single page
manifest.webmanifest     name, icon and colours for "Add to Home Screen"
service-worker.js        offline support (bump VERSION when you update)
css/styles.css           all styling, light and dark
icons/                   app icons
js/
  app.js                 start-up, navigation between screens
  core/
    math.js              reads equations, compares them, solves 2×2 systems
    solver.js            step-by-step substitution and elimination plans
    check.js             judges Let statements, equations and final sentences,
                         and diagnoses common mistakes
  content/
    categories.js        the eight problem types and their random generators
    worksheet.js         the nine worksheet problems and the tutorial
    phrases.js           Translation Lab phrases and drills
    playbook.js          reference pages
    teaching.js          coaching text at ELI5 / ELI10 / ELI15, insights
  store/progress.js      saving progress on the device, achievements
  ui/
    problem.js           the guided nine-screen problem flow
    screens.js           Home, Train, Playbook, Progress, Coach, Settings
    lab.js               Translation Lab screens
    paper.js             "Show my teacher" solution
    eqinput.js           the tap-to-build equation builder
    diagrams.js          the small pictures for each problem type
    dom.js               shared helpers
tests/                   automated checks (not needed to run the app)
tools/make_icons.py      redraws the icons (only if you want to change them)
```

### Common small changes

| To change… | Edit… |
| --- | --- |
| A worksheet problem's numbers | `js/content/worksheet.js` |
| Wording of a problem type, its hints or explanations | `js/content/categories.js` |
| The coach's wording at each step | `js/content/teaching.js` |
| The player's name | In the app: gear icon → Player name |
| Colours | The first section of `css/styles.css` |

After any change, bump `VERSION` in `service-worker.js`.

---

## Compatibility

Works in current Safari (iPhone, iPad, Mac), Chrome, Edge and Firefox. Designed
phone-first, with larger layouts for iPad and desktop. Supports light and dark
appearance, keyboard use, screen-reader labels and the "Reduce Motion" setting.
Nothing in the app requires dragging: every interaction works by tapping.
