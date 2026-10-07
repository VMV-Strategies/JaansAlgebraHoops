// ---------------------------------------------------------------------------
// app.js — starts the app: routing, the tab bar, taps and keys, and the
// offline service worker. Screens live in js/ui/.
//
// Routing uses the part of the address after "#" (e.g. #/train), which works
// on GitHub Pages at any path and never causes a "page not found" on refresh.
// ---------------------------------------------------------------------------
import { store } from './store/progress.js';
import { homeView, trainView, playbookView, progressView, coachView, settingsView, welcomeView, teacherView, applyTheme } from './ui/screens.js';
import { playView } from './ui/problem.js';
import { labView, drillView, phrasesView } from './ui/lab.js';
import { icon } from './ui/dom.js';

const ROUTES = {
  home: homeView, train: trainView, play: playView,
  lab: labView, 'lab/drill': drillView, 'lab/phrases': phrasesView,
  playbook: playbookView, progress: progressView, coach: coachView,
  settings: settingsView, welcome: welcomeView, teacher: teacherView,
};
const TABS = [['home', 'Home', icon.home], ['train', 'Train', icon.train], ['lab', 'Lab', icon.lab], ['playbook', 'Playbook', icon.book], ['progress', 'Progress', icon.chart]];

const root = document.getElementById('view');
const tabbar = document.getElementById('tabbar');
let current = null, arg = null, routeName = '';

function parse() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (!parts.length) return ['home', null];
  const two = parts.slice(0, 2).join('/');
  if (ROUTES[two]) return [two, parts[2] ?? null];
  if (ROUTES[parts[0]]) return [parts[0], parts[1] ?? null];
  return ['home', null];
}

function focusKey(el) {
  if (!el || el === document.body) return null;
  const d = el.dataset || {};
  return [d.a, d.v, d.i, d.k, d.bind].some(x => x !== undefined) ? [el.tagName, d.a, d.v, d.i, d.k, d.bind].join('|') : null;
}

function render({ keepFocus = true } = {}) {
  const fk = keepFocus ? focusKey(document.activeElement) : null;
  const sel = document.activeElement && 'selectionStart' in document.activeElement ? document.activeElement.selectionStart : null;
  root.innerHTML = current.render(arg);
  current.after?.(root);
  if (fk) {
    const match = [...root.querySelectorAll('[data-a],[data-bind]')].find(el => focusKey(el) === fk && !el.disabled);
    if (match) { match.focus({ preventScroll: true }); if (sel !== null && match.setSelectionRange) { try { match.setSelectionRange(sel, sel); } catch { /* not a text field */ } } }
  }
}

function route() {
  const [name, a] = parse();
  const st = store();
  if (!st.state.onboarded && name === 'home' && !st.getSession()) { location.replace('#/welcome'); return; }
  const changed = name !== routeName || a !== arg;
  routeName = name; arg = a; current = ROUTES[name];
  const showNav = current.nav !== false;
  document.body.classList.toggle('no-nav', !showNav);
  const top = name.split('/')[0];
  tabbar.innerHTML = TABS.map(([id, label, ic]) => `<a href="#/${id}" class="tab${top === id ? ' on' : ''}"${top === id ? ' aria-current="page"' : ''}>${ic}<span>${label}</span></a>`).join('') +
    `<a href="#/coach" class="tab side-only${top === 'coach' ? ' on' : ''}">${icon.coach}<span>Coach</span></a><a href="#/settings" class="tab side-only${top === 'settings' ? ' on' : ''}">${icon.gear}<span>Settings</span></a>`;
  render({ keepFocus: false });
  if (changed) { window.scrollTo(0, 0); root.focus({ preventScroll: true }); }
}

// One listener handles every tap: buttons carry data-a="actionName".
root.addEventListener('click', async ev => {
  const el = ev.target.closest('[data-a]');
  if (!el || el.disabled || !root.contains(el)) return;
  const fn = current.actions?.[el.dataset.a];
  if (!fn) return;
  const out = await fn(el, ev);
  if (out !== false && ROUTES[parse()[0]] === current) render();
});
root.addEventListener('input', ev => {
  const el = ev.target.closest('[data-bind]');
  if (el) current.input?.(el);
});
document.addEventListener('keydown', ev => {
  if (document.querySelector('dialog[open]')) return;
  if (ev.key === 'Enter' && !ev.shiftKey) {
    const t = ev.target;
    const inField = t.tagName === 'INPUT' || t.classList?.contains('eq-display') || t === document.body || t === root;
    if (inField) {
      const primary = root.querySelector('[data-primary]:not([disabled])');
      if (primary) { ev.preventDefault(); primary.click(); return; }
    }
  }
  if (current?.key?.(ev)) render();
});
window.addEventListener('hashchange', route);
window.addEventListener('jah:render', () => { render({ keepFocus: false }); window.scrollTo(0, 0); });
window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);

applyTheme();
route();

// Offline support. The path is relative, so it works at a domain root AND in a
// GitHub Pages project folder such as username.github.io/jaans-algebra-hoops/.
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('./service-worker.js').catch(() => { /* offline support is optional */ }); });
}
