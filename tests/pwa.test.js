import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = f => readFileSync(join(ROOT, f), 'utf8');
const walk = dir => readdirSync(join(ROOT, dir)).flatMap(f => { const p = join(dir, f); return statSync(join(ROOT, p)).isDirectory() ? walk(p) : [p.replace(/\\/g, '/')]; });
const SHIPPED = ['index.html', 'manifest.webmanifest', 'service-worker.js', ...walk('css'), ...walk('js'), ...walk('icons')];

test('manifest is installable and uses relative paths only', () => {
  const m = JSON.parse(read('manifest.webmanifest'));
  assert.equal(m.name, "Jaan's Algebra Hoops");
  assert.equal(m.display, 'standalone');
  assert.equal(m.start_url, './');
  assert.equal(m.scope, './');
  assert.ok(m.theme_color && m.background_color);
  for (const size of ['192x192', '512x512']) assert.ok(m.icons.some(i => i.sizes === size), `icon ${size}`);
  assert.ok(m.icons.some(i => i.purpose === 'maskable'));
  m.icons.forEach(i => { assert.ok(!i.src.startsWith('/'), 'icon path must be relative'); assert.ok(existsSync(join(ROOT, i.src)), i.src); });
});

test('index.html has the iPhone home-screen tags and no root-absolute paths', () => {
  const html = read('index.html');
  for (const needle of ['rel="manifest"', 'apple-mobile-web-app-capable', 'apple-mobile-web-app-title', 'apple-touch-icon', 'theme-color', 'viewport-fit=cover', 'mobile-web-app-capable']) {
    assert.ok(html.includes(needle), needle);
  }
  const refs = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map(m => m[1]).filter(r => !r.startsWith('#'));
  refs.forEach(r => { assert.ok(r.startsWith('./'), `"${r}" must be relative (GitHub Pages project folders)`); assert.ok(existsSync(join(ROOT, r)), `${r} exists`); });
});

test('service worker precaches every shipped file, and every listed file exists', () => {
  const sw = read('service-worker.js');
  const list = [...sw.matchAll(/'\.\/([^']*)'/g)].map(m => m[1]).filter(f => f !== 'service-worker.js');
  list.filter(Boolean).forEach(f => assert.ok(existsSync(join(ROOT, f)), `listed but missing: ${f}`));
  SHIPPED.filter(f => f !== 'service-worker.js').forEach(f => assert.ok(list.includes(f), `not cached for offline use: ${f}`));
  assert.ok(list.includes(''), 'caches the folder URL itself');
  assert.match(sw, /register|addEventListener\('fetch'/);
  assert.ok(!/['"]\/[a-z]/i.test(sw.replace(/\/\/.*$/gm, '')), 'no root-absolute paths in the service worker');
});

test('every import resolves to a real file', () => {
  walk('js').forEach(f => {
    [...read(f).matchAll(/from\s+'(\.[^']+)'|import\('(\.[^']+)'\)/g)].forEach(m => {
      const target = join(ROOT, dirname(f), m[1] || m[2]);
      assert.ok(existsSync(target), `${f} imports missing ${relative(ROOT, target)}`);
    });
  });
});

test('privacy: no network calls, trackers or third-party resources anywhere', () => {
  SHIPPED.filter(f => /\.(js|html|css|webmanifest)$/.test(f)).forEach(f => {
    const src = read(f);
    assert.ok(!/https?:\/\//.test(src.replace(/\/\^https\?:\$\//g, '')), `${f} references an external URL`);
    if (f !== 'service-worker.js') assert.ok(!/\bfetch\(|XMLHttpRequest|sendBeacon|WebSocket|document\.cookie/.test(src), `${f} talks to the network`);
    assert.ok(!/google-analytics|gtag|facebook|doubleclick|hotjar|segment\.io/i.test(src), `${f} has a tracker`);
  });
});

test('no placeholder work left in shipped code', () => {
  SHIPPED.filter(f => /\.(js|html|css)$/.test(f)).forEach(f => assert.ok(!/\bTODO\b|\bFIXME\b|lorem ipsum/i.test(read(f)), `${f} has a TODO/placeholder`));
});

test('every tappable action in the screens has a handler', async () => {
  const mods = { 'js/ui/problem.js': ['playView'], 'js/ui/screens.js': ['homeView', 'trainView', 'playbookView', 'progressView', 'coachView', 'settingsView', 'welcomeView', 'teacherView'], 'js/ui/lab.js': ['labView', 'drillView', 'phrasesView'] };
  for (const [file, views] of Object.entries(mods)) {
    const mod = await import('../' + file);
    const handlers = new Set(views.flatMap(v => Object.keys(mod[v].actions || {})));
    const used = new Set([...read(file).matchAll(/data-a="([a-z-]+)"/g)].map(m => m[1]));
    // pieces rendered by shared components
    if (file !== 'js/ui/screens.js') ['tok', 'bksp', 'clr'].forEach(a => assert.ok(handlers.has(a), `${file}: ${a}`));
    used.forEach(a => assert.ok(handlers.has(a), `${file}: button "${a}" has no handler`));
  }
});
