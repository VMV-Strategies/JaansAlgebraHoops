// ---------------------------------------------------------------------------
// math.js — the small algebra engine behind the app.
//
// Everything Jaan types or builds is turned into a LINEAR FORM
//     { x: coefficient of x, y: coefficient of y, c: constant }
// so the app can tell whether two equations MEAN the same thing even when
// they are written differently (x + y = 5  is the same as  2x + 2y = 10).
// No DOM code in here, so it can be unit-tested with plain Node.
// ---------------------------------------------------------------------------

export class MathError extends Error {
  constructor(code, detail = '') { super(code); this.code = code; this.detail = detail; }
}

const TINY = 1e-9;
export const z = n => Math.abs(n) < TINY;
export const isInt = n => z(n - Math.round(n));
export const clean = n => { const r = Math.round(n * 1e9) / 1e9; return Object.is(r, -0) ? 0 : r; };
export const gcd = (a, b) => { a = Math.abs(Math.round(a)); b = Math.abs(Math.round(b)); while (b) [a, b] = [b, a % b]; return a; };

/** Number -> plain string ("3.5", "-2", "2201"). Never scientific notation for our sizes. */
export function fmtNum(n) {
  const r = clean(n);
  if (isInt(r)) return String(Math.round(r));
  return String(parseFloat(r.toFixed(6)));
}

// ---- Tokenizer -------------------------------------------------------------
export function tokenize(src) {
  const s = String(src).replace(/[−–—]/g, '-').replace(/[×·∙]/g, '*').replace(/÷/g, '/');
  const out = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (/\s/.test(ch) || ch === '$') { i++; continue; }
    const m = /^(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+\.?\d*|\.\d+)/.exec(s.slice(i));
    if (m) { out.push({ t: 'num', v: m[1].replace(/,/g, ''), raw: m[1] }); i += m[1].length; continue; }
    if (/[xyXY]/.test(ch)) { out.push({ t: 'var', v: ch.toLowerCase() }); i++; continue; }
    if ('+-*/'.includes(ch)) { out.push({ t: 'op', v: ch }); i++; continue; }
    if ('()=%'.includes(ch)) { out.push({ t: ch, v: ch }); i++; continue; }
    throw new MathError('bad-char', ch);
  }
  return out;
}

// ---- Linear-form arithmetic --------------------------------------------------
const lin = (x = 0, y = 0, c = 0) => ({ x, y, c });
const isConst = a => z(a.x) && z(a.y);
const add = (a, b) => lin(a.x + b.x, a.y + b.y, a.c + b.c);
const sub = (a, b) => lin(a.x - b.x, a.y - b.y, a.c - b.c);
const scale = (a, k) => lin(a.x * k, a.y * k, a.c * k);
function mul(a, b) {
  if (isConst(a)) return scale(b, a.c);
  if (isConst(b)) return scale(a, b.c);
  throw new MathError('nonlinear');
}
function div(a, b) {
  if (!isConst(b)) throw new MathError('nonlinear');
  if (z(b.c)) throw new MathError('div-zero');
  return scale(a, 1 / b.c);
}

// ---- Recursive-descent parser -------------------------------------------------
function parseTokens(toks) {
  let i = 0;
  const peek = () => toks[i];
  const isOp = (p, ...vs) => p && p.t === 'op' && vs.includes(p.v);

  function expr() {
    let v = term();
    while (isOp(peek(), '+', '-')) {
      const op = toks[i++].v;
      const r = term();
      v = op === '+' ? add(v, r) : sub(v, r);
    }
    return v;
  }
  function term() {
    let v = unary();
    for (;;) {
      const p = peek();
      if (!p) break;
      if (isOp(p, '*', '/')) { i++; const r = unary(); v = p.v === '*' ? mul(v, r) : div(v, r); }
      else if (p.t === 'num' || p.t === 'var' || p.t === '(') {
        // implicit multiplication: 3x, 4(x - y)
        const prev = toks[i - 1];
        if (p.t === 'num' && prev.t === 'num') throw new MathError('two-numbers', `${prev.raw} ${p.raw}`);
        v = mul(v, factor());
      } else break;
    }
    return v;
  }
  function unary() {
    const p = peek();
    if (isOp(p, '-')) { i++; return scale(unary(), -1); }
    if (isOp(p, '+')) { i++; return unary(); }
    return factor();
  }
  function factor() {
    const p = toks[i++];
    if (!p) throw new MathError('incomplete');
    if (p.t === 'num') {
      let n = parseFloat(p.v);
      if (peek() && peek().t === '%') { i++; n /= 100; }
      return lin(0, 0, n);
    }
    if (p.t === 'var') return p.v === 'x' ? lin(1, 0, 0) : lin(0, 1, 0);
    if (p.t === '(') {
      const v = expr();
      const q = toks[i++];
      if (!q || q.t !== ')') throw new MathError('paren');
      return v;
    }
    if (p.t === ')') throw new MathError('paren');
    throw new MathError('syntax', p.v);
  }

  if (!toks.length) throw new MathError('incomplete');
  const v = expr();
  if (i < toks.length) throw new MathError(toks[i].t === ')' ? 'paren' : 'syntax', toks[i].v);
  return lin(clean(v.x), clean(v.y), clean(v.c));
}

/** Parse an expression such as "3x - 56" into a linear form. Throws MathError. */
export function parseExpr(src) {
  const toks = typeof src === 'string' ? tokenize(src) : src;
  if (toks.some(t => t.t === '=')) throw new MathError('has-equals');
  return parseTokens(toks);
}

/**
 * Parse an equation. Returns { L, R, a, b, c } where the equation means
 *     a·x + b·y = c
 */
export function parseEquation(src) {
  const toks = tokenize(src);
  const eqs = toks.reduce((n, t, idx) => (t.t === '=' ? [...n, idx] : n), []);
  if (eqs.length === 0) throw new MathError('no-equals');
  if (eqs.length > 1) throw new MathError('many-equals');
  const lt = toks.slice(0, eqs[0]), rt = toks.slice(eqs[0] + 1);
  if (!lt.length || !rt.length) throw new MathError('empty-side');
  const L = parseTokens(lt), R = parseTokens(rt);
  return { L, R, a: clean(L.x - R.x), b: clean(L.y - R.y), c: clean(R.c - L.c) };
}

// ---- Comparing --------------------------------------------------------------
/** True when two equations describe exactly the same line (one is a multiple of the other). */
export function equivalent(e, f) {
  const u = [e.a, e.b, e.c], v = [f.a, f.b, f.c];
  const mu = Math.max(...u.map(Math.abs)), mv = Math.max(...v.map(Math.abs));
  if (mu < TINY || mv < TINY) return false;
  if ((z(e.a) && z(e.b)) || (z(f.a) && z(f.b))) return false;
  const tol = 1e-7 * mu * mv;
  return Math.abs(u[0] * v[1] - u[1] * v[0]) < tol &&
         Math.abs(u[0] * v[2] - u[2] * v[0]) < tol &&
         Math.abs(u[1] * v[2] - u[2] * v[1]) < tol;
}
export const sameExpr = (p, q) => z(p.x - q.x) && z(p.y - q.y) && z(p.c - q.c);
export const swapXY = e => ({ ...e, a: e.b, b: e.a });
export const evalLin = (l, s) => clean(l.x * s.x + l.y * s.y + l.c);
export function holdsAt(e, s) {
  const scaleBy = Math.max(1, Math.abs(e.a * s.x), Math.abs(e.b * s.y), Math.abs(e.c));
  return Math.abs(e.a * s.x + e.b * s.y - e.c) < 1e-7 * scaleBy;
}
/** Solve a 2×2 system by Cramer's rule. Returns null if there is no single answer. */
export function solve2(e, f) {
  const det = e.a * f.b - e.b * f.a;
  const size = Math.max(Math.abs(e.a * f.b), Math.abs(e.b * f.a), TINY);
  if (Math.abs(det) < 1e-9 * size) return null;
  return { x: clean((e.c * f.b - e.b * f.c) / det), y: clean((e.a * f.c - e.c * f.a) / det) };
}

// ---- Writing math back out ----------------------------------------------------
/** Linear form -> plain string, e.g. {x:3,c:-56} -> "3x - 56", {x:-1,c:128} -> "128 - x". */
export function fmtLin({ x = 0, y = 0, c = 0 }) {
  const terms = [];
  if (!z(x)) terms.push({ k: x, s: 'x' });
  if (!z(y)) terms.push({ k: y, s: 'y' });
  if (!z(c)) {
    if (terms.length && c > 0 && terms.every(t => t.k < 0)) terms.unshift({ k: c, s: '' });
    else terms.push({ k: c, s: '' });
  }
  if (!terms.length) return '0';
  return terms.map((t, i) => {
    const mag = Math.abs(t.k);
    const body = t.s ? (z(mag - 1) ? '' : fmtNum(mag)) + t.s : fmtNum(mag);
    if (i === 0) return (t.k < 0 ? '-' : '') + body;
    return (t.k < 0 ? ' - ' : ' + ') + body;
  }).join('');
}
export const fmtStd = e => `${fmtLin({ x: e.a, y: e.b })} = ${fmtNum(e.c)}`;

/** Tokens -> plain string with tidy spacing (re-parseable). */
export function plain(toks) {
  let s = '';
  toks.forEach((t, i) => {
    const prev = toks[i - 1];
    if (t.t === 'op') {
      const unary = (t.v === '-' || t.v === '+') && (!prev || prev.t === 'op' || prev.t === '(' || prev.t === '=');
      s += unary ? t.v : ` ${t.v} `;
    } else if (t.t === '=') s += ' = ';
    else if (t.t === 'num') s += (prev && prev.t === 'num' ? ' ' : '') + t.raw;
    else s += t.v;
  });
  return s.trim();
}

/**
 * Replace variables with values or expressions, the way a student writes it:
 *   subst("5x + 2y = 424", {x:"56"})   -> "5(56) + 2y = 424"
 *   subst("x + y = 400", {y:"400 - x"}) -> "x + (400 - x) = 400"
 */
export function subst(src, map) {
  const toks = tokenize(src);
  const out = toks.map((t, i) => {
    if (t.t !== 'var' || !(t.v in map)) return t;
    const rep = String(map[t.v]);
    const prev = toks[i - 1], next = toks[i + 1];
    const touching = (prev && (prev.t === 'num' || prev.t === ')' || prev.t === 'var')) ||
                     (next && (next.t === '(' || next.t === 'num'));
    const simple = /^\d+(\.\d+)?$/.test(rep);
    return { t: 'raw', v: touching || !simple ? `(${rep})` : rep };
  });
  return plain(out);
}

const escHtml = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

/** Plain math string -> typeset HTML (italic variables, real minus sign, spacing). */
export function mathHTML(src) {
  let toks;
  try { toks = tokenize(src); } catch { return `<span class="math">${escHtml(src)}</span>`; }
  let h = '';
  toks.forEach((t, i) => {
    const prev = toks[i - 1];
    if (t.t === 'num') h += `<span class="n">${t.raw}</span>`;
    else if (t.t === 'var') h += `<i>${t.v}</i>`;
    else if (t.t === 'op') {
      const unary = (t.v === '-' || t.v === '+') && (!prev || prev.t === 'op' || prev.t === '(' || prev.t === '=');
      const sym = { '+': '+', '-': '−', '*': '×', '/': '÷' }[t.v];
      h += unary ? sym : `<span class="o">${sym}</span>`;
    } else if (t.t === '=') h += '<span class="o">=</span>';
    else h += `<span class="p">${t.v}</span>`;
  });
  return `<span class="math">${h}</span>`;
}

/** Plain math string -> words, for screen readers. */
export function speak(src) {
  let toks;
  try { toks = tokenize(src); } catch { return String(src); }
  const w = { '+': 'plus', '-': 'minus', '*': 'times', '/': 'divided by', '=': 'equals', '(': 'open bracket', ')': 'close bracket', '%': 'percent' };
  return toks.map(t => (t.t === 'num' ? t.raw : t.t === 'var' ? t.v : w[t.v])).join(' ');
}

/** Problem templates are written with p and q; swap in whichever letters Jaan chose. */
export const inst = (tpl, map) => tpl.replace(/[pq]/g, m => map[m]);
