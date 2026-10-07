// dom.js — tiny helpers shared by every screen. No framework.
import { mathHTML, inst } from '../core/math.js';

export const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

/**
 * Authored text -> HTML.
 *   «3p - 56»  becomes typeset math (p/q swapped for Jaan's letters)
 *   **bold**   becomes <strong>
 *   newlines   become line breaks
 */
export function rich(text, map = { p: 'x', q: 'y' }) {
  return esc(text)
    .replace(/«(.*?)»/g, (_, m) => mathHTML(inst(m.replace(/&amp;/g, '&'), map)))
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}
/** Math written directly with x and y. */
export const xy = src => mathHTML(src);

const I = (d, extra = '') => `<svg class="ic" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;
export const icon = {
  home: I('<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/>'),
  train: I('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3.2 3 3.2 15 0 18M12 3c-3.2 3-3.2 15 0 18"/>'),
  lab: I('<path d="M4 6h10M4 12h7M4 18h10"/><path d="m15 15 3 3 3-3M18 6v12"/>'),
  book: I('<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>'),
  chart: I('<path d="M4 20V10M10 20V4M16 20v-7M21 20H3"/>'),
  coach: I('<circle cx="12" cy="8" r="3.5"/><path d="M5 20c.6-3.8 3.4-6 7-6s6.4 2.2 7 6"/>'),
  gear: I('<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/>'),
  close: I('<path d="M6 6l12 12M18 6 6 18"/>'),
  back: I('<path d="M15 5l-7 7 7 7"/>'),
  next: I('<path d="M9 5l7 7-7 7"/>'),
  check: I('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  bulb: I('<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1.1 2.2h5c.1-1 .5-1.7 1.1-2.2A6 6 0 0 0 12 3z"/>'),
  undo: I('<path d="M21 6H9l-6 6 6 6h12zM17 10l-4 4M13 10l4 4"/>'),
  paper: I('<path d="M7 3h8l4 4v14H7z"/><path d="M15 3v4h4M10 12h6M10 16h6"/>'),
  lock: I('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
  print: I('<path d="M7 9V4h10v5M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2"/><path d="M7 14h10v6H7z"/>'),
};

/** The app's basketball mark (original artwork). */
export const ballSVG = (size = 28) => `<svg class="ball" width="${size}" height="${size}" viewBox="0 0 40 40" aria-hidden="true">
  <circle cx="20" cy="20" r="18" fill="var(--ball)"/>
  <g fill="none" stroke="var(--ball-line)" stroke-width="2" stroke-linecap="round">
    <path d="M2 20h36M20 2v36"/><path d="M7.5 7.5c6 6.5 6 18.500 0 25M32.5 7.5c-6 6.5-6 18.500 0 25"/>
  </g></svg>`;

/** Faint half-court lines used behind headers. */
export const courtSVG = `<svg class="court" viewBox="0 0 400 220" preserveAspectRatio="xMidYMin slice" aria-hidden="true">
  <g fill="none" stroke="currentColor" stroke-width="2">
    <path d="M40 0v60a160 160 0 0 0 320 0V0"/><rect x="140" y="0" width="120" height="120"/>
    <circle cx="200" cy="120" r="60"/><path d="M170 26h60"/><circle cx="200" cy="38" r="9"/>
  </g></svg>`;

export const bar = (pct, label = '') => `<div class="bar" role="img" aria-label="${esc(label)} ${pct} percent"><span style="width:${Math.max(0, Math.min(100, pct))}%"></span></div>`;

export const coach = (html, tone = 'info') => `<div class="coach coach-${tone}"><span class="coach-dot" aria-hidden="true"></span><div>${html}</div></div>`;

export function feedback(fb) {
  if (!fb) return '<div class="fb-slot" aria-live="polite"></div>';
  return `<div class="fb-slot" aria-live="polite"><div class="fb fb-${fb.tone}${fb.flash ? ' flash' : ''}" role="status">
    <strong>${fb.tone === 'good' ? 'Yes.' : fb.tone === 'try' ? 'Not quite.' : fb.tone === 'show' ? 'Here it is.' : ''}</strong> ${fb.html}</div></div>`;
}

export function confirmDialog({ title, body, ok = 'Confirm', cancel = 'Cancel', danger = false }) {
  return new Promise(resolve => {
    const d = document.createElement('dialog');
    d.className = 'dlg';
    d.innerHTML = `<form method="dialog"><h2>${esc(title)}</h2><p>${esc(body)}</p>
      <div class="dlg-row"><button value="no" class="btn ghost">${esc(cancel)}</button><button value="yes" class="btn ${danger ? 'danger' : 'primary'}">${esc(ok)}</button></div></form>`;
    document.body.appendChild(d);
    d.addEventListener('close', () => { resolve(d.returnValue === 'yes'); d.remove(); });
    d.showModal();
  });
}

export function toast(html) {
  const t = document.createElement('div');
  t.className = 'toast'; t.setAttribute('role', 'status'); t.innerHTML = html;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('out'), 3200);
  setTimeout(() => t.remove(), 3800);
}

/** Deterministic shuffle so choices stay put when the screen re-renders. */
export function shuffled(n, seed) {
  const idx = [...Array(n).keys()];
  let a = seed >>> 0;
  const rnd = () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; };
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  return idx;
}
