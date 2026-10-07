// eqinput.js — the equation builder.
// Jaan taps pieces (or types on a keyboard) to build an expression or equation.
// It is tap-only by design: no dragging is ever required.
import { mathHTML, speak } from '../core/math.js';
import { esc, icon } from './dom.js';

export const tokSrc = toks => toks.map(t => t.v).join(' ');

/** Add a piece. Digits typed on the keypad join up into one number. */
export function pushTok(toks, v, kind = 'tile') {
  const last = toks[toks.length - 1];
  if (kind === 'key' && /^[\d.]$/.test(v)) {
    if (last && last.k === 'key' && /^[\d.]+$/.test(last.v)) {
      if (v === '.' && last.v.includes('.')) return;
      if (last.v.length >= 9) return;
      last.v += v; return;
    }
    toks.push({ v: v === '.' ? '0.' : v, k: 'key' }); return;
  }
  if (toks.length >= 28) return;
  toks.push({ v, k: kind });
}
export function popTok(toks) {
  const last = toks[toks.length - 1];
  if (!last) return;
  if (last.k === 'key' && /^[\d.]+$/.test(last.v) && last.v.length > 1) last.v = last.v.slice(0, -1);
  else toks.pop();
}

const face = v => (v === 'x' || v === 'y' ? `<i>${v}</i>` : { '-': '−', '*': '×', '/': '÷' }[v] || esc(v));
const say = v => ({ '+': 'plus', '-': 'minus', '*': 'times', '/': 'divided by', '=': 'equals', '(': 'open bracket', ')': 'close bracket', '.': 'decimal point' }[v] || v);
const cls = v => (/^[xy]$/.test(v) ? 'var' : /\d|\./.test(v) ? 'num' : v === '=' ? 'eq' : 'op');

const KEYPAD = [['x', 'y', '(', ')'], ['7', '8', '9', '+'], ['4', '5', '6', '-'], ['1', '2', '3', '*'], ['0', '.', '=', '/']];

/**
 * @param {{tokens:object[], tiles?:string[], keypad?:boolean, label:string, placeholder?:string}} o
 */
export function eqInput({ tokens, tiles, keypad = false, label, placeholder = 'Tap the pieces to build it' }) {
  const src = tokSrc(tokens);
  const shown = tokens.length ? mathHTML(src) : `<span class="eq-ph">${esc(placeholder)}</span>`;
  const btn = (v, kind) => `<button type="button" class="tile tile-${cls(v)}" data-a="tok" data-v="${esc(v)}" data-k="${kind}" aria-label="${esc(say(v))}">${face(v)}</button>`;
  const pad = keypad
    ? `<div class="keypad" role="group" aria-label="Math keypad">${KEYPAD.map(row => row.map(v => btn(v, 'key')).join('')).join('')}</div>`
    : `<div class="tiles" role="group" aria-label="Equation pieces">${tiles.map(v => btn(v, 'tile')).join('')}</div>`;
  return `<div class="eqin">
    <div class="eq-row">
      <div class="eq-display${tokens.length ? '' : ' empty'}" role="math" tabindex="0" aria-label="${esc(label)}: ${tokens.length ? esc(speak(src)) : 'empty'}" aria-live="polite">${shown}</div>
      <button type="button" class="iconbtn" data-a="bksp" aria-label="Remove last piece"${tokens.length ? '' : ' disabled'}>${icon.undo}</button>
    </div>
    ${pad}
    <div class="eq-tools"><button type="button" class="btn ghost small" data-a="clr"${tokens.length ? '' : ' disabled'}>Clear</button>
    <span class="eq-kb">Keyboard works too</span></div>
  </div>`;
}

/** Map a physical key press to a piece. Returns {v} | {act} | null. */
export function keyToTok(ev) {
  if (ev.metaKey || ev.ctrlKey || ev.altKey) return null;
  const k = ev.key;
  if (/^[0-9.]$/.test(k)) return { v: k };
  if (k === 'x' || k === 'X') return { v: 'x' };
  if (k === 'y' || k === 'Y') return { v: 'y' };
  if ('+-=()/'.includes(k) && k.length === 1) return { v: k };
  if (k === '*') return { v: '*' };
  if (k === 'Backspace') return { act: 'bksp' };
  if (k === 'Enter') return { act: 'enter' };
  return null;
}
