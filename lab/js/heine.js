/* ===== 第 2 章：数列工坊、收集挑战、坏点机器 ===== */
const SUBS = { '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉' };
const subN = n => String(n).split('').map(c => SUBS[c] || c).join('');

(() => {
  const root = $('#hn-lab');
  if (!root) return;
  const plot = new Plot($('#hn-canvas'));
  const vplot = new Plot($('#hn-vcanvas'), { interactive: false, xName: 'n' });
  const NMAX = 4000, NSHOW = 200;
  const CFG = {
    sin1x: { seqs: ['1/(n*pi)', '1/(pi/2 + 2n*pi)'], view: [-0.42, 0.42, -1.45, 1.45], vy: [-1.35, 1.35] },
    sinpix: { seqs: ['1/n', '2/(4n+1)'], view: [-1.1, 1.1, -1.45, 1.45], vy: [-1.35, 1.35] },
    xsin: { seqs: ['1/(n*pi)', '1/(pi/2 + 2n*pi)'], view: [-0.42, 0.42, -0.45, 0.45], vy: [-0.36, 0.36] },
    sgn: { seqs: ['1/n', '-1/n'], view: [-1.2, 1.2, -1.5, 1.5], vy: [-1.35, 1.35] },
    sinc: { seqs: ['1/n', '(-1)^n/n'], view: [-4, 4, -0.4, 1.3], vy: [0.8, 1.04] },
  };
  const COLORS = ['seq-a', 'seq-b', 'seq-c'];
  const NAMES = ['x', 'y', 'z'];
  const slots = [0, 1, 2].map(i => {
    const el = $(`.slot[data-i="${i}"]`);
    return { i, el, input: $('input', el), btn: $('.x', el), infoEl: $('.slot-info', el), on: i < 2, mix: false, xs: null, an: null, err: null };
  });
  const S = { key: 'sin1x', N: 30, follow: true, playing: false, collected: [], hint: 0 };
  const F = () => FN[S.key];

  function analyze(xs) {
    const f = F(), a = f.a;
    let bad = 0, hitA = false, tail = 0, mid = 0;
    for (let n = 1; n <= NMAX; n++) { const x = xs[n]; if (!isFinite(x)) bad++; else if (x === a) hitA = true; }
    for (let n = 2000; n <= NMAX; n++) tail = Math.max(tail, Math.abs(xs[n] - a));
    for (let n = 500; n <= 1000; n++) mid = Math.max(mid, Math.abs(xs[n] - a));
    const toA = bad === 0 && tail < 0.05 && (tail === 0 || tail <= mid * 0.85);
    let lo = Infinity, hi = -Infinity, cnt = 0;
    for (let n = 2000; n <= NMAX; n++) { const y = f.f(xs[n]); if (isFinite(y)) { cnt++; if (y < lo) lo = y; if (y > hi) hi = y; } }
    const conv = cnt > 1900 && hi - lo < 2e-3;
    const r0 = v => Math.abs(v) < 1e-9 ? 0 : v;
    return { bad, hitA, toA, conv, lim: conv ? r0((lo + hi) / 2) : null, lo: r0(lo), hi: r0(hi), valid: bad === 0 && toA && !hitA };
  }
  function compute(s) {
    s.err = null; s.xs = null; s.an = null;
    if (!s.on) return;
    const xs = new Float64Array(NMAX + 1);
    xs[0] = NaN;
    if (s.mix) {
      const A = slots[0].xs, B = slots[1].xs;
      if (!A || !B || !slots[0].on || !slots[1].on) { s.err = '交错需要 xₙ 与 yₙ 都启用且有效'; return; }
      for (let n = 1; n <= NMAX; n++) xs[n] = n % 2 ? A[(n + 1) / 2] : B[n / 2];
    } else {
      let fn;
      try { fn = Expr.compile(s.input.value, ['n']); } catch (e) { s.err = e.message; return; }
      for (let n = 1; n <= NMAX; n++) xs[n] = fn({ n });
    }
    s.xs = xs;
    s.an = analyze(xs);
  }
  function slotInfo(s) {
    const nm = NAMES[s.i] + 'ₙ';
    s.el.classList.toggle('off', !s.on);
    s.btn.textContent = s.on ? '✓' : '○';
    s.input.classList.toggle('err', !!s.err);
    if (!s.on) { s.infoEl.innerHTML = '<span class="muted">未启用（点右侧按钮打开）</span>'; return; }
    if (s.err) { s.infoEl.innerHTML = `<span class="bad">${s.err}</span>`; return; }
    const a = s.an, parts = [];
    if (a.bad) parts.push(`<span class="bad">${a.bad} 项无定义</span>`);
    parts.push(a.toA ? `<span class="ok">${nm} → 0</span>` : `<span class="bad">${nm} 看起来不趋于 0，不能用</span>`);
    if (a.hitA) parts.push(`<span class="bad">出现了 ${nm} = 0，违反 ${nm} ≠ a</span>`);
    parts.push(a.conv ? `f(${nm}) → <b>${fmt(a.lim, 4)}</b>` : `f(${nm}) 在 [${fmt(a.lo, 3)}, ${fmt(a.hi, 3)}] 间摆动，<b>不收敛</b>`);
    s.infoEl.innerHTML = parts.join(' · ');
  }
  function verdict() {
    const el = $('#hn-verdict'), f = F();
    const vs = slots.filter(s => s.on && s.an && s.an.valid);
    if (!vs.length) { el.innerHTML = '<span class="muted">至少需要一个趋于 0、且各项不等于 0 的数列。</span>'; return; }
    const div = vs.filter(s => !s.an.conv);
    const lims = vs.filter(s => s.an.conv);
    const nm = s => `${NAMES[s.i]}ₙ`;
    if (div.length) {
      el.innerHTML = `<span class="hl c-bad">f(${nm(div[0])}) 发散</span>，而 ${nm(div[0])} → 0。由 Heine 归结原理，<b>lim<sub>x→0</sub> f(x) 不存在</b>。`;
      return;
    }
    for (let i = 0; i < lims.length; i++) for (let j = i + 1; j < lims.length; j++) {
      if (Math.abs(lims[i].an.lim - lims[j].an.lim) > 2e-3) {
        el.innerHTML = `<span class="hl c-bad">两条路径，两个结论：</span>f(${nm(lims[i])}) → ${fmt(lims[i].an.lim, 3)}，f(${nm(lims[j])}) → ${fmt(lims[j].an.lim, 3)}。由 Heine 归结原理，<b>lim<sub>x→0</sub> f(x) 不存在</b>。`;
        return;
      }
    }
    const L = lims[0].an.lim;
    el.innerHTML = `<span class="hl c-ok">所有试过的数列都给出 ${fmt(L, 4)}。</span>这与“极限是 ${fmt(L, 4)}”相容——但有限个数列<b>不能</b>证明极限存在。${f.L !== null ? `（事实上 lim = ${fmt(f.L)}，可以用 ε–δ 证明。）` : '再找找别的路径？'}`;
  }

  /* ---------- 收集挑战 ---------- */
  const TARGETS = [{ v: 1, l: '1' }, { v: -1, l: '−1' }, { v: 0, l: '0' }, { v: 0.5, l: '1/2' }, { v: -Math.sqrt(3) / 2, l: '−√3/2' }, { v: 0.3, l: '0.3' }];
  const tgEl = $('#hn-targets'), nl = $('#hn-numline');
  tgEl.innerHTML = TARGETS.map((t, i) => `<span class="chip" data-t="${i}">sin(1/xₙ) → ${t.l}</span>`).join('');
  nl.innerHTML = [-1, -0.5, 0, 0.5, 1].map(v => `<span class="tk" style="left:${(v + 1) * 50}%"></span><span class="tl" style="left:${(v + 1) * 50}%">${fmt(v)}</span>`).join('');
  S.collected = storeGet('limlab-collect', []);
  function collect() {
    if (S.key !== 'sin1x') return;
    let added = false;
    for (const s of slots) {
      if (!s.on || !s.an || !s.an.valid || !s.an.conv) continue;
      const v = s.an.lim;
      if (!S.collected.some(c => Math.abs(c - v) < 2e-3)) { S.collected.push(v); added = true; }
    }
    if (added) storeSet('limlab-collect', S.collected);
    renderCollect();
  }
  function renderCollect() {
    $$('.pt', nl).forEach(p => p.remove());
    S.collected.forEach(v => { const p = document.createElement('span'); p.className = 'pt'; p.style.left = `${clamp((v + 1) * 50, 0, 100)}%`; p.title = fmt(v, 4); nl.appendChild(p); });
    let done = 0;
    $$('[data-t]', tgEl).forEach(c => { const t = TARGETS[+c.dataset.t]; const ok = S.collected.some(v => Math.abs(v - t.v) < 2e-3); c.classList.toggle('done', ok); if (ok) done++; c.textContent = `${ok ? '✓ ' : ''}sin(1/xₙ) → ${t.l}`; });
    const ins = $('#hn-insight');
    if (done >= 4 && ins.hidden) {
      ins.hidden = false;
      ins.innerHTML = `<b>规律出现了。</b>$\\sin t=c$ 的一组解是 $t=\\arcsin c+2n\\pi$，所以 $x_n=\\dfrac{1}{\\arcsin c+2n\\pi}\\to0$ 使 $\\sin\\dfrac1{x_n}\\equiv c$。<strong>$[-1,1]$ 中每个数都是某条路径上的极限</strong>——这比“两个数列极限不同”强得多：$\\sin\\frac1x$ 在 $0$ 附近的“聚点值”铺满了整个区间。`;
      typeset(ins);
    }
  }
  const HINTS = [
    '想让 sin(1/xₙ) 恒等于 c，就让 1/xₙ 落在方程 sin t = c 的解上。',
    'sin t = c 的一组解是 t = arcsin(c) + 2nπ，n 越大 t 越大、xₙ = 1/t 越小。',
    '例如 c = 1/2：在任一输入框里写 1/(arcsin(1/2) + 2n*pi)，或 1/(pi/6 + 2n*pi)。',
  ];
  $('#hn-hint').addEventListener('click', e => { e.target.textContent = HINTS[S.hint % HINTS.length]; S.hint++; e.target.style.whiteSpace = 'normal'; e.target.style.textAlign = 'left'; });

  /* ---------- 绘图 ---------- */
  plot.layers = [(c, p) => {
    const f = F();
    p.fn(f, { width: 1.6 });
    p.marks(f);
    for (const s of slots) {
      if (!s.on || !s.xs) continue;
      const col = Theme.get(COLORS[s.i]);
      c.strokeStyle = col;
      c.lineWidth = 1;
      c.globalAlpha = .6;
      c.beginPath();
      for (let n = 1; n <= S.N; n++) { const X = p.X(s.xs[n]); if (X > -5 && X < p.w + 5) { c.moveTo(X, p.h - 28); c.lineTo(X, p.h - 20); } }
      c.stroke();
      c.globalAlpha = 1;
      for (let n = 1; n < S.N; n++) { const x = s.xs[n], y = f.f(x); if (isFinite(x) && isFinite(y)) p.dot(x, y, 3.2, col); }
      const x = s.xs[S.N], y = f.f(x);
      if (isFinite(x) && isFinite(y)) {
        p.dot(x, y, 6.5, col, Theme.get('plot-bg'));
        p.text(`${NAMES[s.i]}${subN(S.N)}`, p.X(x) + 9, p.Y(y) - 13 + s.i * 4, { color: col, font: FONT_MATH });
      }
    }
  }];
  vplot.layers = [(c, p) => {
    const f = F();
    for (const s of slots) {
      if (!s.on || !s.xs) continue;
      const col = Theme.get(COLORS[s.i]);
      const pts = [];
      for (let n = 1; n <= S.N; n++) pts.push([n, f.f(s.xs[n])]);
      c.globalAlpha = .35; p.polyline(pts, col, 1); c.globalAlpha = 1;
      for (const [n, y] of pts) if (isFinite(y)) p.dot(n, y, n === S.N ? 4.5 : 2.6, col);
      if (s.an && s.an.valid && s.an.conv) { p.hline(s.an.lim, col, [5, 4], 1.2); p.text(`→ ${fmt(s.an.lim, 3)}`, p.w - 8, p.Y(s.an.lim) - 9 - s.i * 2, { align: 'right', color: col }); }
    }
  }];

  function followTarget() {
    let r = 0;
    for (const s of slots) if (s.on && s.xs && isFinite(s.xs[S.N])) r = Math.max(r, Math.abs(s.xs[S.N] - F().a));
    if (!(r > 0)) return null;
    const c = CFG[S.key];
    return { x0: F().a - 2.8 * r, x1: F().a + 2.8 * r, y0: c.view[2], y1: c.view[3] };
  }
  function followBlend(k) {
    const t = followTarget();
    if (!t) return;
    const v = plot.view;
    const w = Math.exp(lerp(Math.log(v.x1 - v.x0), Math.log(t.x1 - t.x0), k));
    const cx = lerp((v.x0 + v.x1) / 2, (t.x0 + t.x1) / 2, k);
    plot.view = { x0: cx - w / 2, x1: cx + w / 2, y0: t.y0, y1: t.y1 };
    plot.request();
  }
  plot.onView = () => { if (S.follow) { S.follow = false; $('#hn-follow').checked = false; } };
  plot.tools($('#hn-tools'));

  function setN(n) {
    S.N = clamp(Math.round(n), 1, NSHOW);
    $('#hn-N').value = S.N;
    $('#hn-N-out').textContent = S.N;
    const c = CFG[S.key];
    vplot.view = { x0: 0, x1: Math.max(10, S.N) + 1, y0: c.vy[0], y1: c.vy[1] };
    vplot.request();
    plot.request();
  }
  $('#hn-N').addEventListener('input', e => { stopPlay(); setN(+e.target.value); if (S.follow) { const t = followTarget(); if (t) plot.animateTo(t, 300); } });
  $('#hn-follow').addEventListener('change', e => { S.follow = e.target.checked; if (S.follow) { const t = followTarget(); if (t) plot.animateTo(t, 500); } });

  const playBtn = $('#hn-play');
  function stopPlay() { S.playing = false; playBtn.textContent = '▶ 播放 n → ∞'; }
  playBtn.addEventListener('click', () => {
    if (S.playing) { stopPlay(); return; }
    S.playing = true;
    playBtn.textContent = '❚❚ 暂停';
    if (S.N >= NSHOW) setN(1);
    let last = 0, acc = 0;
    const tick = now => {
      if (!S.playing) return;
      const dt = last ? Math.min(80, now - last) : 16;
      last = now; acc += dt;
      const rate = S.N < 15 ? 260 : S.N < 50 ? 90 : 40;
      let n = S.N;
      while (acc > rate && n < NSHOW) { n++; acc -= rate; }
      if (n !== S.N) setN(n);
      if (S.follow) followBlend(REDUCED ? 1 : 0.1);
      if (S.N >= NSHOW) { stopPlay(); return; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  function recomputeAll() {
    for (const s of slots) if (!s.mix) compute(s);
    for (const s of slots) if (s.mix) compute(s);
    slots.forEach(slotInfo);
    verdict();
    collect();
    plot.request(); vplot.request();
  }
  slots.forEach(s => {
    let t = 0;
    s.input.addEventListener('input', () => { clearTimeout(t); t = setTimeout(recomputeAll, 280); });
    s.input.addEventListener('change', recomputeAll);
    s.input.addEventListener('focus', () => { if (s.mix) { s.mix = false; s.input.readOnly = false; s.input.value = ''; recomputeAll(); } });
    s.btn.addEventListener('click', () => { s.on = !s.on; if (!s.on && s.mix) { s.mix = false; s.input.readOnly = false; s.input.value = ''; } recomputeAll(); });
  });
  function mixNow() {
    const s = slots[2];
    s.mix = true; s.on = true; s.input.readOnly = true;
    s.input.value = '交错：x₁, y₁, x₂, y₂, …';
    recomputeAll();
    if (S.N < 40) setN(40);
  }
  $('#hn-mix').addEventListener('click', mixNow);
  $('#hn-reset').addEventListener('click', () => load(S.key));

  const fnSet = pressGroup($('#hn-fns'), '.chip', k => load(k));
  function load(k) {
    stopPlay();
    S.key = k;
    fnSet(k);
    const c = CFG[k];
    slots.forEach((s, i) => { s.mix = false; s.input.readOnly = false; s.on = i < 2; s.input.value = i < 2 ? c.seqs[i] : ''; });
    plot.home = { x0: c.view[0], x1: c.view[1], y0: c.view[2], y1: c.view[3] };
    S.follow = true; $('#hn-follow').checked = true;
    recomputeAll();
    setN(30);
    const t = followTarget();
    plot.animateTo(t || plot.home, 500);
    $('#hn-collect').hidden = k !== 'sin1x';
  }
  Lab.open.heine = arg => {
    if (arg === 'mix') { load('sin1x'); mixNow(); }
    else load(arg || 'sin1x');
    return root;
  };
  Lab.on('theme', renderCollect);
  load('sin1x');
  renderCollect();
})();

/* ---------- 2.3 坏点机器 ---------- */
(() => {
  const root = $('#br-lab');
  if (!root) return;
  const plot = new Plot($('#br-canvas'));
  const S = { A: 0, ns: [1] };
  const f = FN.sin1x;
  const wit = (n, A) => { const ph = A <= 0 ? PI / 2 : 3 * PI / 2; const k = Math.max(0, Math.floor((n - ph) / TAU) + 1); return 1 / (ph + k * TAU); };
  const cur = () => S.ns[S.ns.length - 1];
  const viewFor = n => ({ x0: -1.35 / n, x1: 1.35 / n, y0: -2.7, y1: 2.7 });
  plot.layers = [(c, p) => {
    const n = cur(), d = 1 / n, A = S.A;
    p.vband(-d, d, Theme.get('delta-fill'));
    p.vline(-d, Theme.get('delta'), [6, 4], 1.3); p.vline(d, Theme.get('delta'), [6, 4], 1.3);
    p.hband(A - 1, A + 1, Theme.get('eps-fill'));
    p.hline(A - 1, Theme.get('eps'), [6, 4], 1.2); p.hline(A + 1, Theme.get('eps'), [6, 4], 1.2);
    p.hline(A, Theme.get('eps'), [1, 3], 1);
    p.fn(f, { width: 1.5 });
    const lf = 'italic 14px "STIX Two Text", serif';
    p.text('A+ε₀', p.w - 8, p.Y(A + 1) - 10, { align: 'right', color: Theme.get('eps'), font: lf });
    p.text('A−ε₀', p.w - 8, p.Y(A - 1) + 11, { align: 'right', color: Theme.get('eps'), font: lf });
    p.text(`δ = 1/${n}`, p.X(d) - 6, 52, { align: 'right', color: Theme.get('delta'), font: lf });
    for (const m of S.ns) {
      const x = wit(m, A), y = f.f(x), last = m === n;
      p.dot(x, y, last ? 7 : 4, Theme.get('seq-a'), last ? Theme.get('plot-bg') : null);
      if (last) { p.seg(x, A, x, y, Theme.get('seq-a'), [3, 3], 1.2); p.text(`x${subN(m)}`, p.X(x) + 10, p.Y(y) + (y > A ? -12 : 14), { color: Theme.get('seq-a'), font: lf }); }
    }
  }];
  plot.tools($('#br-tools'), () => viewFor(cur()));
  function rows() {
    const show = S.ns.slice(-7);
    $('#br-rows').innerHTML = show.map(n => { const x = wit(n, S.A), y = f.f(x); return `<tr><td>${n}</td><td>${fmt(1 / n, 4)}</td><td>${fmt(x, 5)}</td><td>${fmt(y, 4)}</td><td>${fmt(Math.abs(y - S.A), 4)}</td></tr>`; }).join('');
    $('#br-rule').innerHTML = `取 ${M('ε')}<sub>0</sub> = 1。因为 ${M('A')} = ${fmt(S.A)} ${S.A <= 0 ? '≤ 0，机器取 sin(1/x) = 1 的点' : '&gt; 0，机器取 sin(1/x) = −1 的点'}，于是 |${M('f')}(${M('x')}<sub>n</sub>) − ${M('A')}| = 1 + |${M('A')}| ≥ 1。同时 0 &lt; ${M('x')}<sub>n</sub> &lt; 1/${M('n')}，所以 ${M('x')}<sub>n</sub> → 0 而 ${M('f')}(${M('x')}<sub>n</sub>) ↛ ${M('A')}。`;
  }
  function go(n, anim = true) {
    if (!S.ns.includes(n)) S.ns.push(n);
    S.ns.sort((x, y) => x - y);
    S.ns = S.ns.filter(m => m <= n);
    rows();
    if (anim) plot.animateTo(viewFor(n), 650); else plot.setView(viewFor(n));
  }
  $('#br-next').addEventListener('click', () => go(cur() + 1));
  $('#br-jump').addEventListener('click', () => go(1000));
  $('#br-reset').addEventListener('click', () => { S.ns = [1]; go(1); });
  $('#br-A').addEventListener('input', e => { S.A = +e.target.value; $('#br-A-out').textContent = fmt(S.A); rows(); plot.request(); });
  Lab.open.bridge = () => root;
  go(1, false);
})();
