'use strict';
/* =========================================================
   core: 工具函数、主题、表达式解析、函数库、画布绘图引擎
   ========================================================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const PI = Math.PI, TAU = 2 * Math.PI;
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const M = s => `<i class="m">${s}</i>`;

const Lab = {
  _ev: {},
  on(e, f) { (this._ev[e] || (this._ev[e] = [])).push(f); },
  emit(e, ...a) { (this._ev[e] || []).forEach(f => f(...a)); },
  open: {},
};

/* ---------- MathJax ---------- */
const MJQ = [];
function typeset(el) {
  const MJ = window.MathJax;
  if (Lab.mjReady && MJ && MJ.typesetPromise) {
    try { MJ.typesetClear([el]); } catch (_) { /* first typeset */ }
    return MJ.typesetPromise([el]).catch(() => {});
  }
  MJQ.push(el);
  return Promise.resolve();
}
Lab.on('mathjax', () => { const q = MJQ.splice(0); if (q.length) window.MathJax.typesetPromise(q).catch(() => {}); });

/* ---------- 数字格式 ---------- */
const SUPS = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };
const sup = n => String(n).split('').map(c => SUPS[c] || c).join('');
function fmt(v, p = 4) {
  if (v === Infinity) return '∞';
  if (v === -Infinity) return '−∞';
  if (typeof v !== 'number' || isNaN(v)) return '—';
  if (v === 0) return '0';
  const a = Math.abs(v);
  if (a >= 1e5 || a < 1e-3) {
    let e = Math.floor(Math.log10(a));
    let m = +(v / Math.pow(10, e)).toPrecision(Math.max(1, p - 1));
    if (Math.abs(m) >= 10) { m /= 10; e += 1; }
    const ms = m === 1 ? '' : m === -1 ? '−' : String(m).replace('-', '−') + '×';
    return ms + '10' + sup(e);
  }
  return String(+v.toPrecision(p)).replace('-', '−');
}

/* ---------- 主题颜色（画布从 CSS 变量取色） ---------- */
const Theme = {
  c: {},
  get(n) {
    let v = this.c[n];
    if (v === undefined) { v = getComputedStyle(document.documentElement).getPropertyValue('--' + n).trim() || '#888'; this.c[n] = v; }
    return v;
  },
  reset() { this.c = {}; Plot.all.forEach(p => p.request()); Lab.emit('theme'); },
};
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => Theme.reset());
new MutationObserver(() => Theme.reset()).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
const FONT_MONO = '11px "JetBrains Mono", ui-monospace, monospace';
const FONT_MATH = 'italic 15px "STIX Two Text", "Times New Roman", serif';
const FONT_UI = '12px "Noto Sans SC", "PingFang SC", system-ui, sans-serif';

/* ---------- 表达式解析（不使用 eval） ---------- */
const Expr = (() => {
  const FUNCS = {
    sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, arcsin: Math.asin, acos: Math.acos, arccos: Math.acos,
    atan: Math.atan, arctan: Math.atan, sqrt: Math.sqrt, ln: Math.log, log: Math.log, exp: Math.exp, abs: Math.abs,
    floor: Math.floor, ceil: Math.ceil, sgn: Math.sign, sign: Math.sign, min: Math.min, max: Math.max,
  };
  const CONSTS = { pi: Math.PI, e: Math.E };
  function tokenize(src, vars) {
    const s = src.replace(/π/g, 'pi').replace(/[εϵ]/g, 'eps').replace(/epsilon/g, 'eps').replace(/[×·∙]/g, '*')
      .replace(/[−–—]/g, '-').replace(/√/g, 'sqrt').replace(/（/g, '(').replace(/）/g, ')').replace(/，/g, ',').replace(/\*\*/g, '^');
    const names = [...Object.keys(FUNCS), ...Object.keys(CONSTS), ...vars].sort((a, b) => b.length - a.length);
    const out = [];
    let i = 0;
    while (i < s.length) {
      const c = s[i];
      if (/\s/.test(c)) { i++; continue; }
      const num = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i.exec(s.slice(i));
      if (num) { out.push({ t: 'num', v: parseFloat(num[0]) }); i += num[0].length; continue; }
      if (/[a-zA-Z_]/.test(c)) {
        const nm = names.find(n => s.startsWith(n, i));
        if (!nm) { const w = /^[a-zA-Z_]+/.exec(s.slice(i))[0]; throw new Error(`不认识 “${w}”`); }
        out.push({ t: 'name', v: nm }); i += nm.length; continue;
      }
      if ('+-*/^(),'.includes(c)) { out.push({ t: 'op', v: c }); i++; continue; }
      throw new Error(`不认识的符号 “${c}”`);
    }
    return out;
  }
  function compile(src, vars) {
    if (!src || !src.trim()) throw new Error('表达式为空');
    const toks = tokenize(src, vars);
    let p = 0;
    const peek = () => toks[p];
    const expect = v => { const t = toks[p++]; if (!t || t.v !== v) throw new Error(`缺少 “${v}”`); };
    function primary() {
      const t = toks[p++];
      if (!t) throw new Error('表达式不完整');
      if (t.t === 'num') { const v = t.v; return () => v; }
      if (t.t === 'op' && t.v === '(') { const e = expr(0); expect(')'); return e; }
      if (t.t === 'op' && t.v === '-') { const e = expr(3); return env => -e(env); }
      if (t.t === 'op' && t.v === '+') return expr(3);
      if (t.t === 'name') {
        if (t.v in FUNCS && !vars.includes(t.v)) {
          if (!peek() || peek().v !== '(') throw new Error(`${t.v} 后面需要括号，例如 ${t.v}(n)`);
          p++;
          const args = [expr(0)];
          while (peek() && peek().v === ',') { p++; args.push(expr(0)); }
          expect(')');
          const fn = FUNCS[t.v];
          if (args.length === 1) { const a0 = args[0]; return env => fn(a0(env)); }
          return env => fn(...args.map(a => a(env)));
        }
        if (vars.includes(t.v)) { const k = t.v; return env => env[k]; }
        if (t.v in CONSTS) { const v = CONSTS[t.v]; return () => v; }
      }
      throw new Error(`意外的 “${t.v}”`);
    }
    function expr(minPrec) {
      let lhs = primary();
      for (;;) {
        const t = peek();
        if (!t) break;
        let op, prec, right = false, implicit = false;
        if (t.t === 'op' && (t.v === '+' || t.v === '-')) { op = t.v; prec = 1; }
        else if (t.t === 'op' && (t.v === '*' || t.v === '/')) { op = t.v; prec = 2; }
        else if (t.t === 'op' && t.v === '^') { op = '^'; prec = 4; right = true; }
        else if (t.t === 'num' || t.t === 'name' || (t.t === 'op' && t.v === '(')) { op = '*'; prec = 2; implicit = true; }
        else break;
        if (prec < minPrec) break;
        if (!implicit) p++;
        const rhs = expr(right ? prec : prec + 1);
        const l = lhs;
        lhs = op === '+' ? env => l(env) + rhs(env)
          : op === '-' ? env => l(env) - rhs(env)
          : op === '*' ? env => l(env) * rhs(env)
          : op === '/' ? env => l(env) / rhs(env)
          : env => Math.pow(l(env), rhs(env));
      }
      return lhs;
    }
    const f = expr(0);
    if (p < toks.length) throw new Error(`多余的 “${toks[p].v}”`);
    return f;
  }
  return { compile };
})();

/* ---------- 函数库 ---------- */
function sinRange(t0, t1) {
  if (t1 - t0 >= TAU) return [-1, 1];
  const s0 = Math.sin(t0), s1 = Math.sin(t1);
  let lo = Math.min(s0, s1), hi = Math.max(s0, s1);
  if (PI / 2 + Math.ceil((t0 - PI / 2) / TAU) * TAU <= t1) hi = 1;
  if (-PI / 2 + Math.ceil((t0 + PI / 2) / TAU) * TAU <= t1) lo = -1;
  return [lo, hi];
}
function sampleRange(f, x0, x1, m = 6) {
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i <= m; i++) {
    const y = f(x0 + (x1 - x0) * i / m);
    if (isFinite(y)) { if (y < lo) lo = y; if (y > hi) hi = y; }
  }
  return lo <= hi ? [lo, hi] : null;
}
// 让 sin(c/x) = ±1 的点：取满足 0<x<δ 的前几个
function peakPoints(c, d, phase) {
  const out = [];
  const k0 = Math.max(0, Math.floor((c / d - phase) / TAU) + 1);
  for (let k = k0; k < k0 + 3; k++) { const x = c / (phase + k * TAU); out.push(x, -x); }
  return out;
}
const FN = {
  sq: { tex: 'x^2', f: x => x * x, a: 2, L: 4 },
  hole: { tex: '\\frac{x^2-1}{x-1}', f: x => x === 1 ? NaN : (x * x - 1) / (x - 1), a: 1, L: 2, marks: [{ x: 1, y: 2, open: true }] },
  sinc: { tex: '\\frac{\\sin x}{x}', f: x => x === 0 ? NaN : Math.sin(x) / x, a: 0, L: 1, marks: [{ x: 0, y: 1, open: true }] },
  xsin: {
    tex: 'x\\sin\\frac1x', f: x => x === 0 ? NaN : x * Math.sin(1 / x), a: 0, L: 0,
    range(x0, x1) {
      const M_ = Math.max(Math.abs(x0), Math.abs(x1));
      if (x0 <= 0 && x1 >= 0) return [-M_, M_];
      if (Math.abs(1 / x0 - 1 / x1) >= TAU) return [-M_, M_];
      return sampleRange(this.f, x0, x1, 16);
    },
    special(a, d) { const out = []; const k0 = Math.max(0, Math.floor((1 / d - PI / 2) / PI) + 1); for (let k = k0; k < k0 + 4; k++) { const x = 1 / (PI / 2 + k * PI); out.push(x, -x); } return out; },
    marks: [{ x: 0, y: 0, open: true }],
  },
  sgn: { tex: '\\operatorname{sgn}x', f: x => Math.sign(x), a: 0, L: null, breaks: [0], marks: [{ x: 0, y: 1, open: true }, { x: 0, y: -1, open: true }, { x: 0, y: 0 }] },
  sin1x: {
    tex: '\\sin\\frac1x', f: x => x === 0 ? NaN : Math.sin(1 / x), a: 0, L: null,
    range(x0, x1) { if (x0 <= 0 && x1 >= 0) return [-1, 1]; return sinRange(1 / x1, 1 / x0); },
    special(a, d) { return [...peakPoints(1, d, PI / 2), ...peakPoints(1, d, 3 * PI / 2)]; },
  },
  sinpix: {
    tex: '\\sin\\frac{\\pi}{x}', f: x => x === 0 ? NaN : Math.sin(PI / x), a: 0, L: null,
    range(x0, x1) { if (x0 <= 0 && x1 >= 0) return [-1, 1]; return sinRange(PI / x1, PI / x0); },
    special(a, d) { return [...peakPoints(PI, d, PI / 2), ...peakPoints(PI, d, 3 * PI / 2)]; },
  },
};
for (const k in FN) FN[k].key = k;

/* 去心邻域 0<|x-a|<d 内取样（线性 + 对数，兼顾远端与贴近 a 的点） */
function nbhd(a, d, cb) {
  const N = 400;
  for (let i = 1; i <= N; i++) {
    const t = i / N;
    const lin = d * t * (1 - 1e-9);
    const lg = d * Math.pow(10, -11 * (1 - t)) * (1 - 1e-9);
    cb(a + lin); cb(a - lin); cb(a + lg); cb(a - lg);
  }
}
function inNbhd(x, a, d) { const dx = Math.abs(x - a); return dx > 0 && dx < d; }
/* sup{|f(x)-A| : 0<|x-a|<d}，同时返回近似取到它的 x（反例） */
function supDev(F, a, d, A) {
  let best = -1, bx = NaN;
  const test = x => {
    if (!inNbhd(x, a, d)) return;
    const y = F.f(x);
    if (isNaN(y)) return;
    const v = Math.abs(y - A);
    if (v > best) { best = v; bx = x; }
  };
  nbhd(a, d, test);
  if (F.special) F.special(a, d).forEach(test);
  return { sup: best, x: bx };
}
function infSup(F, a, d) {
  let lo = Infinity, hi = -Infinity, xlo = NaN, xhi = NaN;
  const test = x => {
    if (!inNbhd(x, a, d)) return;
    const y = F.f(x);
    if (!isFinite(y)) return;
    if (y < lo) { lo = y; xlo = x; }
    if (y > hi) { hi = y; xhi = x; }
  };
  nbhd(a, d, test);
  if (F.special) F.special(a, d).forEach(test);
  return { lo, hi, xlo, xhi };
}
/* 对给定 ε，最大的可行 δ（数值二分）。Infinity: 任何 δ 都行；0: 不存在可行 δ */
function deltaMax(F, a, A, eps, cap = 10) {
  const ok = d => supDev(F, a, d, A).sup < eps;
  if (ok(cap)) return Infinity;
  let lo = -10, hi = Math.log10(cap);
  if (!ok(Math.pow(10, lo))) return 0;
  for (let i = 0; i < 34; i++) { const m = (lo + hi) / 2; if (ok(Math.pow(10, m))) lo = m; else hi = m; }
  return Math.pow(10, lo);
}
/* 振幅 ω(δ) = sup f − inf f 在去心邻域上 */
function omega(F, a, d) { const r = infSup(F, a, d); return r.hi - r.lo; }
function omegaStar(F, a, eps) {
  const ok = d => omega(F, a, d) < eps;
  if (ok(10)) return Infinity;
  let lo = -10, hi = 1;
  if (!ok(Math.pow(10, lo))) return 0;
  for (let i = 0; i < 34; i++) { const m = (lo + hi) / 2; if (ok(Math.pow(10, m))) lo = m; else hi = m; }
  return Math.pow(10, lo);
}
/* 点击“吸附”：在像素邻域内找函数图像上离点击高度最近的点（限制在去心邻域内） */
function snapToGraph(plot, F, px, py, a, d, r = 6) {
  let best = null, bd = Infinity;
  const x0 = plot.ix(px - r), x1 = plot.ix(px + r);
  for (let i = 0; i <= 300; i++) {
    const x = x0 + (x1 - x0) * i / 300;
    if (!inNbhd(x, a, d)) continue;
    const y = F.f(x);
    if (!isFinite(y)) continue;
    const dist = Math.abs(plot.Y(y) - py);
    if (dist < bd) { bd = dist; best = x; }
  }
  return best;
}

/* =========================================================
   Plot：可缩放、可平移、可拖拽手柄的画布坐标系
   ========================================================= */
class Plot {
  constructor(canvas, opt = {}) {
    this.cv = canvas;
    this.wrap = canvas.parentElement;
    this.ctx = canvas.getContext('2d');
    this.o = Object.assign({ interactive: true, xlog: false, ylog: false, minW: 2e-12, maxW: 5e3, lockY: false, xName: '', yName: '' }, opt);
    this.view = Object.assign({ x0: -1, x1: 1, y0: -1, y1: 1 }, opt.view || {});
    this.home = Object.assign({}, this.view);
    this.layers = [];
    this.handles = [];
    this.onClick = null;
    this.onView = null;
    this.w = 300; this.h = 200; this.dpr = 1;
    this.active = false;
    Plot.all.add(this);
    if ('ResizeObserver' in window) new ResizeObserver(() => this.resize()).observe(canvas);
    this.resize();
    if (this.o.interactive) this.bind();
  }
  resize() {
    const r = this.cv.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    this.w = r.width; this.h = r.height;
    this.cv.width = Math.round(r.width * this.dpr);
    this.cv.height = Math.round(r.height * this.dpr);
    this.draw();
  }
  tx(x) { return this.o.xlog ? Math.log10(x) : x; }
  ty(y) { return this.o.ylog ? Math.log10(y) : y; }
  X(x) { const a = this.tx(this.view.x0), b = this.tx(this.view.x1); return (this.tx(x) - a) / (b - a) * this.w; }
  Y(y) { const a = this.ty(this.view.y0), b = this.ty(this.view.y1); return this.h - (this.ty(y) - a) / (b - a) * this.h; }
  ix(px) { const a = this.tx(this.view.x0), b = this.tx(this.view.x1); const t = a + px / this.w * (b - a); return this.o.xlog ? Math.pow(10, t) : t; }
  iy(py) { const a = this.ty(this.view.y0), b = this.ty(this.view.y1); const t = a + (this.h - py) / this.h * (b - a); return this.o.ylog ? Math.pow(10, t) : t; }
  request() { if (this.raf) return; this.raf = requestAnimationFrame(() => { this.raf = 0; this.draw(); }); }
  setView(v) { cancelAnimationFrame(this.anim); this.view = Object.assign({}, v); this.request(); }
  animateTo(t, ms = 700) {
    cancelAnimationFrame(this.anim);
    if (REDUCED) ms = 0;
    const s = Object.assign({}, this.view);
    const sc = [(s.x0 + s.x1) / 2, (s.y0 + s.y1) / 2], sw = [s.x1 - s.x0, s.y1 - s.y0];
    const tc = [(t.x0 + t.x1) / 2, (t.y0 + t.y1) / 2], tw = [t.x1 - t.x0, t.y1 - t.y0];
    const t0 = performance.now();
    return new Promise(res => {
      const step = now => {
        const u = ms ? Math.min(1, (now - t0) / ms) : 1;
        const e = u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
        const wx = Math.exp(lerp(Math.log(sw[0]), Math.log(tw[0]), e));
        const wy = Math.exp(lerp(Math.log(sw[1]), Math.log(tw[1]), e));
        // 中心按“缩放比例”插值，使放大过程中目标点保持稳定
        const k = Math.abs(sw[0] - tw[0]) > 1e-300 ? (sw[0] - wx) / (sw[0] - tw[0]) : e;
        const kk = isFinite(k) ? clamp(k, 0, 1) : e;
        const cx = lerp(sc[0], tc[0], kk), cy = lerp(sc[1], tc[1], e);
        this.view = { x0: cx - wx / 2, x1: cx + wx / 2, y0: cy - wy / 2, y1: cy + wy / 2 };
        this.draw();
        if (u < 1) this.anim = requestAnimationFrame(step); else { this.view = Object.assign({}, t); this.draw(); res(); }
      };
      this.anim = requestAnimationFrame(step);
    });
  }
  /* ----- interaction ----- */
  setActive(on) {
    if (this.active === on) return;
    this.active = on;
    this.wrap.classList.toggle('is-active', on);
    this.cv.style.touchAction = on ? 'none' : 'pan-y';
  }
  flashHint() {
    const h = $('.plot-hint', this.wrap);
    if (!h) return;
    h.classList.add('show');
    clearTimeout(this._ht);
    this._ht = setTimeout(() => h.classList.remove('show'), 1300);
  }
  hit(px, py) { for (const h of this.handles) if ((!h.enabled || h.enabled()) && h.hit(px, py)) return h; return null; }
  bind() {
    const cv = this.cv;
    const ptrs = new Map();
    let g = null;
    const pos = e => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    cv.addEventListener('pointerdown', e => {
      const p = pos(e);
      ptrs.set(e.pointerId, p);
      try { cv.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
      this.setActive(true);
      cancelAnimationFrame(this.anim);
      if (ptrs.size === 1) {
        const h = this.hit(p.x, p.y);
        g = { kind: h ? 'handle' : 'pan', h, sx: p.x, sy: p.y, v: Object.assign({}, this.view), moved: false };
      } else if (ptrs.size === 2) {
        const [a, b] = [...ptrs.values()];
        g = { kind: 'pinch', d0: Math.max(10, Math.hypot(a.x - b.x, a.y - b.y)), v: Object.assign({}, this.view), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, moved: true };
      }
    });
    cv.addEventListener('pointermove', e => {
      const p = pos(e);
      if (!ptrs.has(e.pointerId)) {
        const h = this.hit(p.x, p.y);
        cv.style.cursor = h ? (h.cursor || 'grab') : (this.clickCursor ? this.clickCursor() : 'grab');
        return;
      }
      ptrs.set(e.pointerId, p);
      if (!g) return;
      if (g.kind === 'pinch') {
        if (ptrs.size < 2) return;
        const [a, b] = [...ptrs.values()];
        const k = g.d0 / Math.max(10, Math.hypot(a.x - b.x, a.y - b.y));
        this.view = Object.assign({}, g.v);
        this.zoomAt(g.cx, g.cy, k, this.o.lockY ? 1 : k, false);
        this.panBy((a.x + b.x) / 2 - g.cx, (a.y + b.y) / 2 - g.cy);
        this.changed();
        return;
      }
      const dx = p.x - g.sx, dy = p.y - g.sy;
      if (Math.hypot(dx, dy) > 4) g.moved = true;
      if (g.kind === 'handle') { g.h.drag(this.ix(p.x), this.iy(p.y)); this.request(); }
      else if (g.moved) { this.view = Object.assign({}, g.v); this.panBy(dx, this.o.lockY ? 0 : dy); this.changed(); }
    });
    const end = e => {
      const p = pos(e);
      if (g && g.kind === 'pan' && !g.moved && this.onClick && ptrs.size === 1) this.onClick(this.ix(p.x), this.iy(p.y), p.x, p.y);
      if (g && g.kind === 'handle' && g.h.end) g.h.end();
      ptrs.delete(e.pointerId);
      if (ptrs.size === 0) g = null;
      else if (ptrs.size === 1) { const q = [...ptrs.values()][0]; g = { kind: 'pan', sx: q.x, sy: q.y, v: Object.assign({}, this.view), moved: true }; }
    };
    cv.addEventListener('pointerup', end);
    cv.addEventListener('pointercancel', e => { ptrs.delete(e.pointerId); if (!ptrs.size) g = null; });
    cv.addEventListener('wheel', e => {
      if (!this.active && !e.ctrlKey && !e.metaKey) { this.flashHint(); return; }
      e.preventDefault();
      const p = pos(e);
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1);
      const k = Math.exp(clamp(dy, -250, 250) * 0.002);
      this.zoomAt(p.x, p.y, e.altKey ? 1 : k, (e.shiftKey || this.o.lockY) ? 1 : k);
    }, { passive: false });
    document.addEventListener('pointerdown', e => { if (!this.wrap.contains(e.target)) this.setActive(false); });
  }
  zoomAt(px, py, kx, ky, fire = true) {
    const v = this.view, wx = this.ix(px), wy = this.iy(py);
    let n = { x0: wx - (wx - v.x0) * kx, x1: wx + (v.x1 - wx) * kx, y0: wy - (wy - v.y0) * ky, y1: wy + (v.y1 - wy) * ky };
    const W = n.x1 - n.x0, H = n.y1 - n.y0;
    if (W < this.o.minW * Math.max(1, Math.abs(wx)) || W > this.o.maxW) { n.x0 = v.x0; n.x1 = v.x1; }
    if (H < this.o.minW * Math.max(1, Math.abs(wy)) || H > this.o.maxW) { n.y0 = v.y0; n.y1 = v.y1; }
    this.view = n;
    if (fire) this.changed();
  }
  zoomCenter(k) { this.zoomAt(this.w / 2, this.h / 2, k, this.o.lockY ? 1 : k); }
  panBy(dx, dy) {
    const v = this.view, sx = (v.x1 - v.x0) / this.w, sy = (v.y1 - v.y0) / this.h;
    this.view = { x0: v.x0 - dx * sx, x1: v.x1 - dx * sx, y0: v.y0 + dy * sy, y1: v.y1 + dy * sy };
  }
  changed() { this.request(); if (this.onView) this.onView(); }
  tools(el, focus) {
    if (!el) return;
    el.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      const act = b.dataset.z;
      if (act === 'in') this.zoomCenter(0.5);
      else if (act === 'out') this.zoomCenter(2);
      else if (act === 'home') this.animateTo(this.home);
      else if (act === 'focus' && focus) { const v = focus(); if (v) this.animateTo(v); }
    });
  }
  /* ----- drawing ----- */
  draw() {
    const c = this.ctx;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.clearRect(0, 0, this.w, this.h);
    c.fillStyle = Theme.get('plot-bg');
    c.fillRect(0, 0, this.w, this.h);
    this.gx = this.ticks(this.view.x0, this.view.x1, this.w, this.o.xlog);
    this.gy = this.ticks(this.view.y0, this.view.y1, this.h, this.o.ylog);
    this.grid();
    for (const L of this.layers) { c.save(); try { L(c, this); } catch (err) { console.error(err); } c.restore(); }
    this.tickLabels();
  }
  ticks(lo, hi, px, log) {
    const out = [];
    if (log) {
      const a = Math.log10(lo), b = Math.log10(hi);
      for (let k = Math.ceil(a - 1e-9); k <= Math.floor(b + 1e-9); k++) {
        out.push({ v: Math.pow(10, k), major: true, label: k === 0 ? '1' : '10' + sup(k) });
        for (let m = 2; m < 10; m++) { const v = m * Math.pow(10, k); if (v < hi) out.push({ v, major: false }); }
      }
      return out;
    }
    const target = Math.max(2, px / 95);
    const raw = (hi - lo) / target;
    if (!(raw > 0)) return out;
    const p = Math.pow(10, Math.floor(Math.log10(raw)));
    const m = raw / p;
    const step = (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
    const s = Math.ceil(lo / step), e = Math.floor(hi / step);
    if (e - s > 300) return out;
    const big = Math.max(Math.abs(lo), Math.abs(hi));
    const sci = (step < 1e-4 && big < 1e-2) || step >= 1e5;
    const dec = clamp(-Math.floor(Math.log10(step) + 1e-9), 0, 14);
    for (let k = s; k <= e; k++) {
      const v = k * step;
      let label;
      if (k === 0) label = '0';
      else if (sci) label = fmt(v, 3);
      else label = v.toFixed(dec).replace('-', '−');
      out.push({ v, major: true, label });
    }
    return out;
  }
  grid() {
    const c = this.ctx;
    c.lineWidth = 1;
    for (const t of this.gx) { const x = Math.round(this.X(t.v)) + .5; c.strokeStyle = Theme.get(t.major ? 'plot-grid-2' : 'plot-grid'); c.beginPath(); c.moveTo(x, 0); c.lineTo(x, this.h); c.stroke(); }
    for (const t of this.gy) { const y = Math.round(this.Y(t.v)) + .5; c.strokeStyle = Theme.get(t.major ? 'plot-grid-2' : 'plot-grid'); c.beginPath(); c.moveTo(0, y); c.lineTo(this.w, y); c.stroke(); }
    c.strokeStyle = Theme.get('plot-axis');
    c.lineWidth = 1.2;
    if (!this.o.xlog && this.view.x0 < 0 && this.view.x1 > 0) { const x = Math.round(this.X(0)) + .5; c.beginPath(); c.moveTo(x, 0); c.lineTo(x, this.h); c.stroke(); }
    if (!this.o.ylog && this.view.y0 < 0 && this.view.y1 > 0) { const y = Math.round(this.Y(0)) + .5; c.beginPath(); c.moveTo(0, y); c.lineTo(this.w, y); c.stroke(); }
  }
  tickLabels() {
    const c = this.ctx;
    c.font = FONT_MONO;
    let lastR = -1e9;
    for (const t of this.gx) {
      if (!t.label) continue;
      const x = this.X(t.v);
      const w = c.measureText(t.label).width;
      if (x - w / 2 < 4 || x + w / 2 > this.w - 4 || x - w / 2 < lastR + 8) continue;
      lastR = x + w / 2;
      this.text(t.label, x, this.h - 9, { align: 'center' });
    }
    for (const t of this.gy) {
      if (!t.label) continue;
      const y = this.Y(t.v);
      if (y < 12 || y > this.h - 22) continue;
      this.text(t.label, 6, y, {});
    }
    if (this.o.xName) this.text(this.o.xName, this.w - 8, this.h - 24, { align: 'right', font: FONT_MATH });
    if (this.o.yName) this.text(this.o.yName, 52, 14, { font: FONT_MATH });
  }
  text(s, px, py, o = {}) {
    const c = this.ctx;
    c.font = o.font || FONT_MONO;
    c.textAlign = o.align || 'left';
    c.textBaseline = o.base || 'middle';
    if (o.box !== false && c.textBaseline === 'middle') {
      const w = c.measureText(s).width, x0 = c.textAlign === 'center' ? px - w / 2 : c.textAlign === 'right' ? px - w : px;
      c.globalAlpha = .86; c.fillStyle = Theme.get('plot-bg'); c.fillRect(x0 - 3, py - 8, w + 6, 16); c.globalAlpha = 1;
    } else if (o.halo !== false) { c.lineWidth = 4; c.lineJoin = 'round'; c.strokeStyle = Theme.get('plot-bg'); c.strokeText(s, px, py); }
    c.fillStyle = o.color || Theme.get('plot-label');
    c.fillText(s, px, py);
  }
  vband(x0, x1, fill) { const a = clamp(this.X(x0), -10, this.w + 10), b = clamp(this.X(x1), -10, this.w + 10); this.ctx.fillStyle = fill; this.ctx.fillRect(Math.min(a, b), 0, Math.abs(b - a), this.h); }
  hband(y0, y1, fill, xa = -Infinity, xb = Infinity) {
    const a = clamp(this.Y(y0), -10, this.h + 10), b = clamp(this.Y(y1), -10, this.h + 10);
    const l = xa === -Infinity ? 0 : clamp(this.X(xa), -10, this.w + 10), r = xb === Infinity ? this.w : clamp(this.X(xb), -10, this.w + 10);
    this.ctx.fillStyle = fill; this.ctx.fillRect(l, Math.min(a, b), r - l, Math.abs(b - a));
  }
  vline(x, color, dash = [], w = 1.2) { const c = this.ctx, X = this.X(x); if (X < -5 || X > this.w + 5) return; c.save(); c.strokeStyle = color; c.lineWidth = w; c.setLineDash(dash); c.beginPath(); c.moveTo(X, 0); c.lineTo(X, this.h); c.stroke(); c.restore(); }
  hline(y, color, dash = [], w = 1.2, xa = -Infinity, xb = Infinity) {
    const c = this.ctx, Y = this.Y(y); if (Y < -5 || Y > this.h + 5) return;
    const l = xa === -Infinity ? 0 : clamp(this.X(xa), -10, this.w + 10), r = xb === Infinity ? this.w : clamp(this.X(xb), -10, this.w + 10);
    c.save(); c.strokeStyle = color; c.lineWidth = w; c.setLineDash(dash); c.beginPath(); c.moveTo(l, Y); c.lineTo(r, Y); c.stroke(); c.restore();
  }
  seg(x0, y0, x1, y1, color, dash = [], w = 1.2) { const c = this.ctx; c.save(); c.strokeStyle = color; c.lineWidth = w; c.setLineDash(dash); c.beginPath(); c.moveTo(this.X(x0), this.Y(y0)); c.lineTo(this.X(x1), this.Y(y1)); c.stroke(); c.restore(); }
  dot(x, y, r, fill, stroke) {
    const c = this.ctx, X = this.X(x), Y = this.Y(y);
    if (X < -20 || X > this.w + 20 || Y < -20 || Y > this.h + 20) return;
    c.beginPath(); c.arc(X, Y, r, 0, TAU);
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.lineWidth = 1.6; c.strokeStyle = stroke; c.stroke(); }
  }
  marks(F, color) {
    for (const m of F.marks || []) this.dot(m.x, m.y, 4.2, m.open ? Theme.get('plot-bg') : (color || Theme.get('curve')), color || Theme.get('curve'));
  }
  /* 逐像素列取函数值区间，画出“包络”：振荡无穷的地方自然变成一整条带 */
  fn(F, o = {}) {
    const c = this.ctx, v = this.view;
    const xa = o.xmin !== undefined ? Math.max(o.xmin, v.x0) : v.x0;
    const xb = o.xmax !== undefined ? Math.min(o.xmax, v.x1) : v.x1;
    if (!(xb > xa)) return;
    const p0 = Math.max(0, Math.floor(this.X(xa))), p1 = Math.min(Math.ceil(this.w), Math.ceil(this.X(xb)));
    c.lineWidth = o.width || 2;
    c.lineCap = 'round';
    const base = o.color || Theme.get('curve');
    const H = this.h;
    let cur = null;
    c.beginPath();
    const flush = () => { if (cur) { c.strokeStyle = cur; c.stroke(); } c.beginPath(); };
    for (let px = p0; px < p1; px++) {
      const u0 = Math.max(this.ix(px), xa), u1 = Math.min(this.ix(px + 1), xb);
      if (!(u1 > u0)) continue;
      let parts = [[u0, u1]];
      if (F.breaks) for (const b of F.breaks) if (b >= u0 && b <= u1) {
        const e = (u1 - u0) * 1e-3; parts = [];
        if (b - e > u0) parts.push([u0, b - e]);
        if (b + e < u1) parts.push([b + e, u1]);
      }
      for (const [s0, s1] of parts) {
        const r = F.range ? F.range(s0, s1) : sampleRange(F.f, s0, s1, 6);
        if (!r) continue;
        const col = o.colorBy ? o.colorBy(r[0], r[1]) : base;
        if (col !== cur) { flush(); cur = col; }
        const ya = clamp(this.Y(r[0]), -40, H + 40), yb = clamp(this.Y(r[1]), -40, H + 40);
        c.moveTo(px + .5, ya); c.lineTo(px + .5, Math.abs(yb - ya) < .01 ? ya - .01 : yb);
      }
    }
    flush();
  }
  polyline(pts, color, w = 1.5, dash = []) {
    const c = this.ctx; c.save(); c.strokeStyle = color; c.lineWidth = w; c.setLineDash(dash); c.lineJoin = 'round'; c.beginPath();
    let started = false;
    for (const [x, y] of pts) { if (!isFinite(y) || !isFinite(x)) { started = false; continue; } const X = this.X(x), Y = clamp(this.Y(y), -50, this.h + 50); if (!started) { c.moveTo(X, Y); started = true; } else c.lineTo(X, Y); }
    c.stroke(); c.restore();
  }
}
Plot.all = new Set();

/* 统一的对数滑块 */
function logSlider(input, out, lo, hi, onInput, digits = 3) {
  input.min = lo; input.max = hi; input.step = 0.001;
  const api = {
    get() { return Math.pow(10, +input.value); },
    set(v) { input.value = clamp(Math.log10(v), lo, hi); if (out) out.textContent = fmt(v, digits); },
    show(v) { if (out) out.textContent = fmt(v, digits); },
  };
  input.addEventListener('input', () => { const v = api.get(); if (out) out.textContent = fmt(v, digits); onInput(v); });
  return api;
}
function pressGroup(container, sel, onPick) {
  const btns = $$(sel, container);
  const set = val => btns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === val)));
  btns.forEach(b => b.addEventListener('click', () => { set(b.dataset.v); onPick(b.dataset.v); }));
  return set;
}
function storeGet(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (_) { return d; } }
function storeSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) { /* storage unavailable */ } }
