/* ===== 第 1 章：量词博弈、ε–δ 盒子、否定步进、δ(ε) 配方 ===== */

/* ---------- 1.1 量词卡片 ---------- */
(() => {
  const row = $('#q-row');
  if (!row) return;
  const def = $('#ed-def'), box = $('#q-explain');
  const chips = $$('.qchip', row);
  function pick(q) {
    chips.forEach(c => c.setAttribute('aria-pressed', String(c.dataset.q === q)));
    $$('[data-q]', box).forEach(d => { d.hidden = d.dataset.q !== q; });
    def.classList.remove('hl-eps', 'hl-delta', 'hl-x', 'hl-judge');
    if (q !== 'intro') def.classList.add('hl-' + q);
  }
  chips.forEach(c => c.addEventListener('click', () => pick(c.getAttribute('aria-pressed') === 'true' ? 'intro' : c.dataset.q)));
  const sw = $('#q-swap'), body = $('#q-swap-body');
  sw.addEventListener('click', () => {
    const open = body.hidden;
    body.hidden = !open;
    sw.setAttribute('aria-expanded', String(open));
    sw.textContent = open ? '⇄ 收起' : '⇄ 如果交换前两个量词？';
    // 翻转动画：交换 ε 与 δ 两张卡片的位置
    const ce = chips[0], cd = chips[1];
    const r1 = ce.getBoundingClientRect(), r2 = cd.getBoundingClientRect();
    const [first, second] = open ? [ce, cd] : [cd, ce];
    const after = first.nextSibling;
    row.insertBefore(first, second);
    row.insertBefore(second, after);
    const n1 = ce.getBoundingClientRect(), n2 = cd.getBoundingClientRect();
    if (!REDUCED) {
      ce.animate([{ transform: `translate(${r1.left - n1.left}px, ${r1.top - n1.top}px)` }, { transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.3,.7,.2,1)' });
      cd.animate([{ transform: `translate(${r2.left - n2.left}px, ${r2.top - n2.top}px)` }, { transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.3,.7,.2,1)' });
    }
    $('.who', cd).textContent = open ? '① 你（先选！）' : '② 你';
    $('.who', ce).textContent = open ? '② 对手' : '① 对手';
  });
})();

/* ---------- 1.2 ε–δ 盒子 ---------- */
(() => {
  const root = $('#ed-lab');
  if (!root) return;
  const plot = new Plot($('#ed-canvas'));
  const CFG = {
    sq: { view: [0.4, 3.6, -0.6, 8.6], eps: 1, delta: 0.35, A: 4, Ar: [2, 6], epsScale: 1, recipe: '取 δ = min(1, ε/5)：先用 δ ≤ 1 锁住 |x+2| < 5，再让 5δ ≤ ε。' },
    hole: { view: [-1, 3, -0.6, 4.2], eps: 0.5, delta: 0.4, A: 2, Ar: [0, 4], epsScale: 1, recipe: '取 δ = ε：x ≠ 1 时 f(x) = x + 1，于是 |f(x) − 2| = |x − 1| < δ。' },
    sinc: { view: [-9, 9, -0.5, 1.5], eps: 0.2, delta: 1.5, A: 1, Ar: [-0.5, 2], epsScale: 0.4, recipe: '取 δ = √(6ε)：利用 0 ≤ 1 − sin x / x ≤ x²/6。' },
    xsin: { view: [-0.5, 0.5, -0.45, 0.45], eps: 0.15, delta: 0.25, A: 0, Ar: [-1, 1], epsScale: 0.3, recipe: '取 δ = ε：|x sin(1/x) − 0| ≤ |x| < δ。' },
    sgn: { view: [-2, 2, -1.7, 1.7], eps: 0.5, delta: 0.6, A: 0, Ar: [-2, 2], epsScale: 1 },
    sin1x: { view: [-0.8, 0.8, -1.6, 1.6], eps: 0.5, delta: 0.3, A: 0, Ar: [-2, 2], epsScale: 1 },
  };
  const S = { key: 'sq', A: 4, eps: 1, delta: 0.35, mode: 'free', follow: false, showMax: true, chk: null, dmax: NaN, game: null, pick: null };
  const F = () => FN[S.key];
  const a = () => F().a;
  const cfg = () => CFG[S.key];

  const elA = $('#ed-A'), outA = $('#ed-A-out');
  const sEps = logSlider($('#ed-eps'), $('#ed-eps-out'), -4, 0.6, v => set({ eps: v }));
  const sDel = logSlider($('#ed-delta'), $('#ed-delta-out'), -6, 0.6, v => set({ delta: v }));
  elA.addEventListener('input', () => { const [lo, hi] = cfg().Ar; set({ A: lo + (hi - lo) * +elA.value }); });
  function syncA() { const [lo, hi] = cfg().Ar; elA.value = (S.A - lo) / (hi - lo); outA.textContent = fmt(S.A, 4); }

  let maxTimer = 0;
  function set(p, fromSlider = true) {
    if (p.eps !== undefined) S.eps = clamp(p.eps, 1e-4, 4);
    if (p.delta !== undefined) S.delta = clamp(p.delta, 1e-6, 4);
    if (p.A !== undefined) S.A = p.A;
    if (!fromSlider || p.eps !== undefined) sEps.set(S.eps);
    if (!fromSlider || p.delta !== undefined) sDel.set(S.delta);
    syncA();
    S.chk = supDev(F(), a(), S.delta, S.A);
    if (p.eps !== undefined || p.A !== undefined || p.key) {
      clearTimeout(maxTimer);
      maxTimer = setTimeout(() => { S.dmax = S.showMax ? deltaMax(F(), a(), S.A, S.eps) : NaN; renderStatus(); plot.request(); }, 40);
    }
    if (S.follow && S.mode === 'free') plot.setView(focusView());
    if (S.mode === 'free') S.pick = null;
    renderStatus();
    plot.request();
  }

  function focusView(d = S.delta, pad = 2.4) {
    const r = infSup(F(), a(), d * pad);
    let lo = Math.min(isFinite(r.lo) ? r.lo : S.A, S.A - S.eps), hi = Math.max(isFinite(r.hi) ? r.hi : S.A, S.A + S.eps);
    const m = (hi - lo) * 0.18 + 1e-12;
    return { x0: a() - pad * d, x1: a() + pad * d, y0: lo - m, y1: hi + m };
  }
  plot.tools($('#ed-tools'), () => focusView());

  /* 手柄：直接拖动 δ 竖线与 ε 横线 */
  const canDelta = () => S.mode === 'free' || (S.mode === 'prove' && S.game && !S.game.over && !S.game.judged);
  const canEps = () => S.mode === 'free' || (S.mode === 'refute' && S.game && !S.game.started);
  plot.handles = [
    { enabled: canDelta, cursor: 'ew-resize', hit: (px) => Math.abs(px - plot.X(a() + S.delta)) < 8 || Math.abs(px - plot.X(a() - S.delta)) < 8, drag: wx => set({ delta: Math.abs(wx - a()) }, false) },
    { enabled: canEps, cursor: 'ns-resize', hit: (px, py) => Math.abs(py - plot.Y(S.A + S.eps)) < 8 || Math.abs(py - plot.Y(S.A - S.eps)) < 8, drag: (wx, wy) => set({ eps: Math.abs(wy - S.A) }, false) },
  ];
  plot.clickCursor = () => (S.mode === 'refute' && S.game && S.game.started && !S.game.over) ? 'crosshair' : 'grab';

  plot.layers = [(c, p) => {
    const f = F(), A = S.A, e = S.eps, d = S.delta, x0 = a();
    p.vband(x0 - d, x0 + d, Theme.get('delta-fill'));
    p.hband(A - e, A + e, Theme.get('eps-fill'));
    // 最大可行 δ 的幽灵线
    if (S.showMax && S.mode === 'free' && isFinite(S.dmax) && S.dmax > 0) {
      p.vline(x0 - S.dmax, Theme.get('delta'), [1, 4], 1);
      p.vline(x0 + S.dmax, Theme.get('delta'), [1, 4], 1);
      const X = p.X(x0 + S.dmax);
      if (X > 0 && X < p.w - 40) p.text('δmax', X + 4, 76, { color: Theme.get('delta'), font: 'italic 12px "STIX Two Text", serif' });
    }
    p.vline(x0, Theme.get('ink-3'), [2, 4], 1);
    p.fn(f, { color: Theme.get('curve'), width: 1.8 });
    p.fn(f, { xmin: x0 - d, xmax: x0 + d, width: 2.8, colorBy: (lo, hi) => (lo > A - e && hi < A + e) ? Theme.get('ok') : Theme.get('bad') });
    p.marks(f);
    p.vline(x0 - d, Theme.get('delta'), [6, 4], 1.4);
    p.vline(x0 + d, Theme.get('delta'), [6, 4], 1.4);
    p.hline(A - e, Theme.get('eps'), [6, 4], 1.4);
    p.hline(A + e, Theme.get('eps'), [6, 4], 1.4);
    p.hline(A, Theme.get('eps'), [1, 3], 1);
    const lf = 'italic 14px "STIX Two Text", "Times New Roman", serif';
    const XL = p.X(x0 - d), XR = p.X(x0 + d);
    if (XR - XL > 70) { p.text('a−δ', XL - 4, 52, { align: 'right', color: Theme.get('delta'), font: lf }); p.text('a+δ', XR + 4, 52, { color: Theme.get('delta'), font: lf }); }
    else p.text('δ', XR + 4, 52, { color: Theme.get('delta'), font: lf });
    p.text('A+ε', p.w - 8, p.Y(A + e) - 10, { align: 'right', color: Theme.get('eps'), font: lf });
    p.text('A−ε', p.w - 8, p.Y(A - e) + 11, { align: 'right', color: Theme.get('eps'), font: lf });
    p.text('A', p.w - 8, p.Y(A), { align: 'right', color: Theme.get('eps'), font: lf });
    // 反例
    const w = S.mode === 'refute' ? S.pick : (S.chk && S.chk.sup >= e ? S.chk.x : null);
    if (w !== null && w !== undefined && isFinite(w)) {
      const y = f.f(w), good = S.mode === 'refute' ? Math.abs(y - A) >= e : true;
      const col = S.mode === 'refute' ? (good ? Theme.get('ok') : Theme.get('bad')) : Theme.get('bad');
      p.seg(w, A, w, y, col, [3, 3], 1.2);
      p.dot(w, y, 7, null, col);
      p.dot(w, y, 3, col);
      const X = p.X(w), Y = p.Y(y);
      p.text(`x = ${fmt(w, 6)}`, clamp(X + 10, 4, p.w - 130), clamp(Y - 14, 14, p.h - 30), { color: col });
    }
  }];

  /* ---------- 状态面板 ---------- */
  const st = $('#ed-status');
  function renderStatus() {
    const r = S.chk, f = F();
    if (!r) return;
    let h = '';
    const ok = r.sup < S.eps;
    if (S.mode === 'refute') { st.hidden = true; return; }
    st.hidden = false;
    if (ok) h += `<p class="verdict ok">✓ 这个 ${M('δ')} 合格</p><p>在 0 &lt; |${M('x')} − ${M('a')}| &lt; ${M('δ')} 内，数值上 sup |${M('f')}(${M('x')}) − ${M('A')}| ≈ ${fmt(r.sup)} &lt; ${M('ε')}。</p>`;
    else h += `<p class="verdict bad">✗ 对手找到反例</p><p>${M('x')} = ${fmt(r.x, 7)}：|${M('f')}(${M('x')}) − ${M('A')}| = ${fmt(Math.abs(f.f(r.x) - S.A))} ≥ ${M('ε')} = ${fmt(S.eps)}</p>`;
    if (S.showMax && S.mode === 'free') {
      const d = S.dmax;
      if (isNaN(d)) h += '';
      else if (d === Infinity) h += `<p class="muted">对这个 ${M('ε')}，<b>任何</b> ${M('δ')} 都合格。</p>`;
      else if (d > 0) h += `<p class="muted">对这个 ${M('ε')}，最大可行 ${M('δ')} ≈ ${fmt(d)}（图中点线）。</p>`;
      else h += `<p class="muted">对这个 ${M('ε')}，<b>不存在</b>合格的 ${M('δ')}：${M('δ')} 再小也有反例。${f.L === null || Math.abs(S.A - f.L) > 1e-9 ? '' : ''}</p>`;
    }
    st.className = 'status ' + (ok ? 'ok' : 'bad');
    st.innerHTML = h;
  }

  /* ---------- 函数切换 ---------- */
  const fnSet = pressGroup($('#ed-fns'), '.chip', k => load(k));
  const formula = $('#ed-formula');
  function load(k, keepMode) {
    S.key = k;
    fnSet(k);
    $$('[data-k]', formula).forEach(s => { s.hidden = s.dataset.k !== k; });
    const c = cfg();
    plot.home = { x0: c.view[0], x1: c.view[1], y0: c.view[2], y1: c.view[3] };
    plot.animateTo(plot.home, 500);
    $('#ed-snapA').disabled = F().L === null;
    if (!keepMode) setMode('free');
    set({ key: true, A: c.A, eps: c.eps, delta: c.delta }, false);
  }
  $('#ed-snapA').addEventListener('click', () => { if (F().L !== null) set({ A: F().L }); });
  $('#ed-follow').addEventListener('change', e => { S.follow = e.target.checked; if (S.follow) plot.animateTo(focusView(), 450); });
  $('#ed-showmax').addEventListener('change', e => { S.showMax = e.target.checked; set({ eps: S.eps }); });

  /* ---------- 模式与对局 ---------- */
  const gameEl = $('#ed-game');
  const modeSet = pressGroup($('#ed-modes'), 'button', m => setMode(m));
  function lockSliders() {
    const g = S.game;
    elA.disabled = S.mode !== 'free' && !!g && g.started;
    $('#ed-eps').disabled = S.mode === 'prove' || (S.mode === 'refute' && g && g.started);
    $('#ed-delta').disabled = S.mode === 'refute' || (S.mode === 'prove' && g && (g.judged || g.over));
  }
  function setMode(m) {
    S.mode = m;
    modeSet(m);
    S.pick = null;
    S.game = null;
    if (m === 'free') { gameEl.hidden = true; }
    else if (m === 'prove') { S.game = { round: 0, lives: 3, res: [], started: false }; gameEl.hidden = false; proveIntro(); }
    else { S.game = { round: 0, res: [], started: false, misses: 0 }; gameEl.hidden = false; refuteIntro(); }
    lockSliders();
    renderStatus();
    plot.request();
  }
  const pips = (n, res, cur) => `<span class="pips">${Array.from({ length: n }, (_, i) => `<i class="${res[i] === true ? 'win' : res[i] === false ? 'lose' : i === cur ? 'cur' : ''}"></i>`).join('')}</span>`;
  const ROUNDS = 5;

  /* 你来证明：电脑出 ε，你选 δ */
  const proveEps = () => [0.5, 0.2, 0.07, 0.02, 0.005].map(v => v * cfg().epsScale);
  function proveIntro() {
    const g = S.game;
    gameEl.innerHTML = `<div class="game-top"><b>你来证明</b>${pips(ROUNDS, g.res, -1)}</div>
      <div class="game-msg">你断言 ${M('lim f')} = ${M('A')}。先用滑块定好 ${M('A')}（当前 ${fmt(S.A)}），然后开始：电脑每轮给出更小的 ${M('ε')}，你拖动 ${M('δ')} 应战。三条命。</div>
      <div class="btns"><button class="btn primary" type="button" data-act="start">开始</button></div>`;
  }
  function proveRound() {
    const g = S.game;
    g.started = true; g.judged = false;
    const e = proveEps()[g.round];
    S.eps = e; sEps.set(e);
    const dm = deltaMax(F(), a(), S.A, e);
    const d0 = isFinite(dm) && dm > 0 ? dm * 3.2 : Math.max(S.delta, 0.02);
    set({ delta: Math.min(S.delta, d0) }, false);
    const yr = Math.max(3 * e, 1e-9);
    plot.animateTo({ x0: a() - 1.2 * d0, x1: a() + 1.2 * d0, y0: S.A - yr, y1: S.A + yr }, 600);
    gameEl.innerHTML = `<div class="game-top"><b>第 ${g.round + 1} 轮 · 命 ${'●'.repeat(g.lives)}${'○'.repeat(3 - g.lives)}</b>${pips(ROUNDS, g.res, g.round)}</div>
      <div class="game-msg">对手给出 <span class="big c-eps">ε = ${fmt(e)}</span><br>拖动青色竖线或 ${M('δ')} 滑块，选好后提交。</div>
      <div class="btns"><button class="btn primary" type="button" data-act="submit">就用这个 δ</button><button class="btn" type="button" data-act="quit">退出</button></div>`;
    lockSliders();
  }
  function proveSubmit() {
    const g = S.game;
    g.judged = true;
    const r = supDev(F(), a(), S.delta, S.A);
    S.chk = r;
    const ok = r.sup < S.eps;
    g.res[g.round] = ok;
    let msg, btn;
    if (ok) {
      msg = `<span class="c-ok">✓ 对手在 0 &lt; |${M('x')} − ${M('a')}| &lt; ${fmt(S.delta)} 里找不到反例。</span>`;
      g.round++;
      if (g.round >= ROUNDS) {
        g.over = true;
        msg += `<br><br><b>五轮全胜！</b>但赢五轮不等于证明——证明需要对<em>每个</em> ${M('ε')} 都有效的配方。${cfg().recipe ? `<br>例如：${cfg().recipe}` : ''}<br>到 1.4 去写出你的配方。`;
        btn = '<button class="btn" type="button" data-act="quit">回到自由探索</button>';
      } else btn = '<button class="btn primary" type="button" data-act="next">下一轮</button>';
    } else {
      g.lives--;
      msg = `<span class="c-bad">✗ 对手找到 ${M('x')} = ${fmt(r.x, 7)}，|${M('f')}(${M('x')}) − ${M('A')}| = ${fmt(Math.abs(F().f(r.x) - S.A))} ≥ ${M('ε')}。</span>`;
      if (g.lives <= 0) {
        g.over = true;
        const noLim = F().L === null, wrongA = !noLim && Math.abs(S.A - F().L) > 1e-6;
        msg += noLim ? `<br><br><b>三条命用完。</b>不是你的 ${M('δ')} 不够小——对这个函数，无论断言哪个 ${M('A')}，都有 ${M('ε')} 让任何 ${M('δ')} 失败。换到“你来反驳”模式当一次对手。`
          : wrongA ? `<br><br><b>三条命用完。</b>你断言的 ${M('A')} = ${fmt(S.A)} 不对，真实极限是 ${fmt(F().L)}。对错误的 ${M('A')}，当 ${M('ε')} &lt; |${M('A')} − ${fmt(F().L)}| 时任何 ${M('δ')} 都会输。`
          : `<br><br><b>三条命用完。</b>再试一次：把 ${M('δ')} 取得比“最大可行 δ”小一些。`;
        btn = '<button class="btn primary" type="button" data-act="restart">再来一局</button><button class="btn" type="button" data-act="quit">退出</button>';
      } else {
        g.res[g.round] = undefined;
        g.judged = false;
        btn = '<button class="btn primary" type="button" data-act="retry">调整 δ 再试</button>';
      }
    }
    gameEl.innerHTML = `<div class="game-top"><b>第 ${Math.min(g.round + (ok ? 0 : 1), ROUNDS)} 轮 · 命 ${'●'.repeat(Math.max(0, g.lives))}${'○'.repeat(3 - Math.max(0, g.lives))}</b>${pips(ROUNDS, g.res, g.round)}</div><div class="game-msg">${msg}</div><div class="btns">${btn}</div>`;
    lockSliders();
    renderStatus();
    plot.request();
  }

  /* 你来反驳：你选 ε₀，电脑出 δ，你点出反例 */
  const refuteDelta = [0.4, 0.05, 0.006, 7e-4, 8e-5];
  function refuteIntro() {
    const g = S.game;
    gameEl.innerHTML = `<div class="game-top"><b>你来反驳</b>${pips(ROUNDS, g.res, -1)}</div>
      <div class="game-msg">你要证明“${M('lim f')} = ${M('A')}”是<b>假</b>的。用滑块选定要反驳的 ${M('A')}（当前 ${fmt(S.A)}）和你的 ${M('ε')}<sub>0</sub>（当前 ${fmt(S.eps)}），然后开始。电脑每轮给出 ${M('δ')}——它会尽力防守。</div>
      <div class="btns"><button class="btn primary" type="button" data-act="rstart">开始</button></div>`;
  }
  function refuteRound() {
    const g = S.game;
    g.started = true; g.misses = 0; S.pick = null;
    const dm = deltaMax(F(), a(), S.A, S.eps);
    const sched = refuteDelta[g.round];
    const d = dm > 0 ? Math.min(sched, dm === Infinity ? sched : dm * 0.9) : sched;
    g.valid = dm > 0;
    g.d = d;
    set({ delta: d }, false);
    plot.animateTo(focusView(d, 1.7), 650);
    gameEl.innerHTML = `<div class="game-top"><b>第 ${g.round + 1} 轮</b>${pips(ROUNDS, g.res, g.round)}</div>
      <div class="game-msg">电脑选 <span class="big c-delta">δ = ${fmt(d)}</span><br>在青色区域里点一下，选出 ${M('x')}，要求 |${M('f')}(${M('x')}) − ${fmt(S.A)}| ≥ ${fmt(S.eps)}。点击会吸附到你点的高度附近的图像上。</div>
      <div class="btns"><button class="btn" type="button" data-act="quit">退出</button></div>`;
    lockSliders();
    plot.request();
  }
  plot.onClick = (wx, wy, px, py) => {
    const g = S.game;
    if (S.mode !== 'refute' || !g || !g.started || g.over || g.wait) return;
    const x = snapToGraph(plot, F(), px, py, a(), S.delta);
    const msgEl = $('.game-msg', gameEl);
    if (x === null) { msgEl.innerHTML = `这里不行：${M('x')} 必须满足 0 &lt; |${M('x')} − ${M('a')}| &lt; ${M('δ')}（青色区域，且 ${M('x')} ≠ ${M('a')}）。`; return; }
    S.pick = x;
    const v = Math.abs(F().f(x) - S.A);
    plot.request();
    if (v >= S.eps) {
      g.res[g.round] = true; g.round++; g.wait = true;
      let txt = `<span class="c-ok">✓ ${M('x')} = ${fmt(x, 7)}，|${M('f')}(${M('x')}) − ${M('A')}| = ${fmt(v)} ≥ ${M('ε')}<sub>0</sub>。这一轮你赢了。</span>`;
      let btn = '<button class="btn primary" type="button" data-act="rnext">下一轮（δ 更小）</button>';
      if (g.round >= ROUNDS) {
        g.over = true;
        txt += `<br><br><b>五轮全胜。</b>要把它变成证明，需要对<em>任意</em> ${M('δ')} 写出反例的公式：${refuteFormula()}`;
        btn = '<button class="btn" type="button" data-act="quit">回到自由探索</button>';
      }
      gameEl.innerHTML = `<div class="game-top"><b>第 ${g.round} 轮</b>${pips(ROUNDS, g.res, g.round)}</div><div class="game-msg">${txt}</div><div class="btns">${btn}</div>`;
    } else {
      g.misses++;
      let txt = `${M('x')} = ${fmt(x, 7)}：|${M('f')}(${M('x')}) − ${M('A')}| = ${fmt(v)} &lt; ${M('ε')}<sub>0</sub>，不够。再点一个。`;
      if (g.misses >= 3 && g.valid) {
        g.over = true;
        const r = supDev(F(), a(), S.delta, S.A);
        txt = `<b>电脑这一轮的 ${M('δ')} 是合格的。</b>数值上 sup |${M('f')}(${M('x')}) − ${M('A')}| ≈ ${fmt(r.sup)} &lt; ${M('ε')}<sub>0</sub>：这里根本没有反例。对这个 ${M('ε')}<sub>0</sub>，“证明者”赢了。如果对每个 ${M('ε')} 证明者都能这样应对，${M('lim f')} = ${M('A')} 就是真命题。<br>试着增大 ${M('ε')}<sub>0</sub> 或换一个 ${M('A')}${F().L !== null ? `（真实极限是 ${fmt(F().L)}）` : ''}。`;
        gameEl.innerHTML = `<div class="game-top"><b>证明者守住了</b>${pips(ROUNDS, g.res, g.round)}</div><div class="game-msg">${txt}</div><div class="btns"><button class="btn primary" type="button" data-act="rrestart">重新开始</button><button class="btn" type="button" data-act="quit">退出</button></div>`;
      } else msgEl.innerHTML = txt;
    }
  };
  function refuteFormula() {
    const k = S.key;
    if (k === 'sin1x') return `取正整数 ${M('k')} &gt; 1/(2π${M('δ')})，令 ${M('x')} = 1/(π/2 + 2${M('k')}π)（若 ${M('A')} ≤ 0）或 ${M('x')} = 1/(3π/2 + 2${M('k')}π)（若 ${M('A')} &gt; 0），则 0 &lt; ${M('x')} &lt; ${M('δ')} 且 |sin(1/${M('x')}) − ${M('A')}| ≥ 1。`;
    if (k === 'sgn') return `取 ${M('x')} = ${M('δ')}/2（若 ${M('A')} ≤ 0）或 ${M('x')} = −${M('δ')}/2（若 ${M('A')} &gt; 0），则 |sgn ${M('x')} − ${M('A')}| ≥ 1。`;
    return `这里真实极限是 ${fmt(F().L)}。取 ${M('ε')}<sub>0</sub> = |${M('A')} − ${fmt(F().L)}|/2，当 ${M('δ')} 足够小时 ${M('f')}(${M('x')}) 都靠近 ${fmt(F().L)}，任取一点都是反例；${M('δ')} 较大时取靠近 ${M('a')} 的点即可。`;
  }
  gameEl.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    const act = b.dataset.act, g = S.game;
    if (act === 'start') proveRound();
    else if (act === 'submit') proveSubmit();
    else if (act === 'next') proveRound();
    else if (act === 'retry') { g.judged = false; lockSliders(); $('.game-msg', gameEl).innerHTML = `再调整 ${M('δ')}，然后提交。`; gameEl.querySelector('.btns').innerHTML = '<button class="btn primary" type="button" data-act="submit">就用这个 δ</button>'; }
    else if (act === 'restart') { setMode('prove'); }
    else if (act === 'rstart') refuteRound();
    else if (act === 'rnext') { g.wait = false; refuteRound(); }
    else if (act === 'rrestart') { setMode('refute'); }
    else if (act === 'quit') setMode('free');
  });

  Lab.open.ed = k => { load(k); };
  load('sq');
})();

/* ---------- 1.3 否定步进器 ---------- */
(() => {
  const root = $('#neg');
  if (!root) return;
  const steps = $$('.st', root);
  const rules = [
    '在原命题前加否定号 ¬。下面把它一层层推进去。',
    '规则 ¬∀ ≡ ∃¬：“并非对所有 ε 都成立”就是“存在某个 ε 不成立”。',
    '规则 ¬∃ ≡ ∀¬：“不存在合格的 δ”就是“每个 δ 都不合格”。',
    '再用一次 ¬∀ ≡ ∃¬：“并非所有 x 都满足”就是“存在一个 x 不满足”。',
    '¬(P ⇒ Q) ≡ P ∧ ¬Q：条件 0<|x−a|<δ 原样保留（青色），只把结论否定成 |f(x)−A| ≥ ε（红色）。这个固定的 ε 记作 ε₀。读法：你先挑 ε₀，对手给任何 δ，你都能在去心邻域里找到坏点 x。',
  ];
  let i = 0;
  const dots = $('#neg-dots');
  dots.innerHTML = steps.map(() => '<i></i>').join('');
  function show() {
    steps.forEach((s, k) => s.setAttribute('aria-hidden', String(k !== i)));
    $$('i', dots).forEach((d, k) => d.classList.toggle('on', k === i));
    $('#neg-rule').textContent = rules[i];
    $('#neg-prev').disabled = i === 0;
    $('#neg-next').textContent = i === steps.length - 1 ? '从头再来 ↺' : '下一步 →';
  }
  $('#neg-prev').addEventListener('click', () => { i = Math.max(0, i - 1); show(); });
  $('#neg-next').addEventListener('click', () => { i = i === steps.length - 1 ? 0 : i + 1; show(); });
  show();
})();

/* ---------- 1.4 δ(ε) 配方工坊 ---------- */
function dmaxXsin(e) {
  if (e >= 1) return Infinity;
  // 找最大的 t ≤ 1/ε 使 |sin t| ≥ ε t，则 δmax = 1/t
  const t0 = 1 / e;
  const K = Math.floor((t0 - PI / 2) / PI);
  const tk = PI / 2 + K * PI;
  const h = t => Math.abs(Math.sin(t)) - e * t;
  const step = PI / 3000;
  let t = t0, prev = t0;
  while (t > tk) { if (h(t) >= 0) break; prev = t; t -= step; }
  if (t <= tk) t = tk;
  let lo = t, hi = prev;
  for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (h(m) >= 0) lo = m; else hi = m; }
  return 1 / lo;
}
const RECIPES = {
  sq: {
    F: { f: x => x * x }, a: 2, L: 4, dmax: e => -2 + Math.sqrt(4 + e), cap: 1, capE: 5,
    presets: ['eps/4', 'eps/5', 'min(1, eps/5)', 'min(1/2, eps/5)', 'sqrt(eps)'],
    start: 'eps/5',
    scratch: [
      '目标：|x² − 4| < ε。分解 |x² − 4| = |x − 2|·|x + 2|。',
      '|x − 2| 由 δ 控制，|x + 2| 却随 x 变化——先把它锁住：约定 δ ≤ 1，则 1 < x < 3，|x + 2| < 5。',
      '于是 |x² − 4| < 5|x − 2| < 5δ，只要 5δ ≤ ε。两个要求合并：δ = min(1, ε/5)。',
    ],
    proof: [
      ['recipe', '任给 ε > 0，取 δ = min{1, ε/5}。'],
      ['cap', '设 0 < |x − 2| < δ。由 δ ≤ 1 得 1 < x < 3，从而 |x + 2| < 5。'],
      ['lin', '于是 |x² − 4| = |x − 2|·|x + 2| < 5|x − 2| < 5δ ≤ ε。'],
      [null, '所以 lim<sub>x→2</sub> x² = 4。∎'],
    ],
  },
  recip: {
    F: { f: x => 1 / x }, a: 1, L: 1, dmax: e => e / (1 + e), cap: 0.5, capE: 1,
    presets: ['eps/2', 'eps', 'min(1/2, eps/2)', 'eps/(1+eps)', 'min(1, eps/2)'],
    start: 'eps/2',
    scratch: [
      '目标：|1/x − 1| = |x − 1| / |x| < ε。分子由 δ 控制，麻烦在分母 |x| 可能很小。',
      '若 δ ≥ 1，去心邻域会伸到 0 附近，1/x 无界——必须限制 δ ≤ 1/2，这样 x > 1/2，1/|x| < 2。',
      '于是 |1/x − 1| < 2|x − 1| < 2δ，只要 2δ ≤ ε。合并：δ = min(1/2, ε/2)。',
    ],
    proof: [
      ['recipe', '任给 ε > 0，取 δ = min{1/2, ε/2}。'],
      ['cap', '设 0 < |x − 1| < δ。由 δ ≤ 1/2 得 x > 1/2，从而 1/|x| < 2。'],
      ['lin', '于是 |1/x − 1| = |x − 1|/|x| < 2|x − 1| < 2δ ≤ ε。'],
      [null, '所以 lim<sub>x→1</sub> 1/x = 1。∎'],
    ],
  },
  xsin: {
    F: FN.xsin, a: 0, L: 0, dmax: dmaxXsin, cap: null,
    presets: ['eps', '2eps', 'eps/2', 'sqrt(eps)', 'min(eps, 1)'],
    start: '2eps',
    scratch: [
      '目标：|x sin(1/x) − 0| < ε。sin(1/x) 疯狂振荡，但它有界：|sin(1/x)| ≤ 1。',
      '于是 |x sin(1/x)| ≤ |x|——“有界量乘无穷小”，振荡被 |x| 压住。',
      '只要 |x| < ε 即可：δ = ε。（δ = 2ε 为什么不行？看右图锯齿边界。）',
    ],
    proof: [
      ['recipe', '任给 ε > 0，取 δ = ε。'],
      ['lin', '设 0 < |x| < δ，则 |x sin(1/x) − 0| = |x|·|sin(1/x)| ≤ |x| < δ = ε。'],
      [null, '所以 lim<sub>x→0</sub> x sin(1/x) = 0。∎'],
    ],
  },
};
(() => {
  const root = $('#rc');
  if (!root) return;
  const plot = new Plot($('#rc-canvas'), { interactive: false, xlog: true, ylog: true, view: { x0: 1e-6, x1: 1e3, y0: 1e-7, y1: 1e3 }, xName: 'ε', yName: 'δ' });
  const input = $('#rc-in'), status = $('#rc-status');
  const EPSS = Array.from({ length: 360 }, (_, i) => Math.pow(10, -6 + 9 * i / 359));
  const S = { key: 'sq', fn: null, results: null, hl: null };
  const R = () => RECIPES[S.key];
  const dmCache = {};
  function dmax(e) { return R().dmax(e); }

  plot.layers = [(c, p) => {
    const r = R();
    // 安全区
    c.beginPath();
    c.moveTo(0, p.h);
    for (let px = 0; px <= p.w; px += 2) {
      const e = p.ix(px), d = dmax(e);
      c.lineTo(px, d === Infinity ? -5 : clamp(p.Y(d), -5, p.h + 5));
    }
    c.lineTo(p.w, p.h);
    c.closePath();
    c.fillStyle = Theme.get('delta-fill');
    c.fill();
    const pts = [];
    for (let px = 0; px <= p.w; px += 1) { const e = p.ix(px), d = dmax(e); pts.push([e, d === Infinity ? p.view.y1 * 10 : d]); }
    p.polyline(pts, Theme.get('delta'), S.hl === 'safe' ? 3 : 2);
    p.text('安全区  δ ≤ δmax(ε)', 10, p.h - 30, { color: Theme.get('delta'), font: FONT_UI });
    // 证明行高亮
    if (S.hl === 'cap' && r.cap) { p.hline(r.cap, Theme.get('eps'), [6, 4], 2); p.text(`δ ≤ ${r.cap === 0.5 ? '1/2' : r.cap}`, 10, p.Y(r.cap) - 10, { color: Theme.get('eps'), font: FONT_UI }); if (r.capE) p.vline(r.capE, Theme.get('eps'), [2, 4], 1.2); }
    if (S.hl === 'lin') { const k = S.key === 'sq' ? 1 / 5 : S.key === 'recip' ? 1 / 2 : 1; p.polyline([[1e-6, k * 1e-6], [1e3, k * 1e3]], Theme.get('eps'), 2, [6, 4]); }
    // 配方曲线
    if (S.fn) {
      let cur = null, seg = [];
      const flush = () => { if (seg.length > 1) p.polyline(seg, cur ? Theme.get('ok') : Theme.get('bad'), S.hl === 'recipe' ? 4 : 2.6); seg = []; };
      for (let px = 0; px <= p.w; px += 1) {
        const e = p.ix(px);
        let d;
        try { d = S.fn({ eps: e }); } catch (_) { d = NaN; }
        if (!(d > 0) || !isFinite(d)) { flush(); cur = null; continue; }
        const ok = d <= dmax(e) * (1 + 1e-9);
        if (ok !== cur) { if (seg.length) { const last = seg[seg.length - 1]; flush(); seg.push(last); } cur = ok; }
        seg.push([e, d]);
      }
      flush();
      if (S.results && S.results.first) { const fe = S.results.first.e; p.vline(fe, Theme.get('bad'), [3, 3], 1.2); p.dot(fe, S.results.first.d, 5, Theme.get('bad')); }
    }
  }];

  function scratch() {
    const r = R();
    $('#rc-scratch').innerHTML = `<h5>草稿 · 倒推（不写进证明）</h5><ol>${r.scratch.map((s, i) => `<li${i ? ' hidden' : ''}>${s}</li>`).join('')}</ol><div class="btns" style="margin-top:8px"><button class="btn sm" type="button" id="rc-more">下一条提示</button></div>`;
    $('#rc-more').addEventListener('click', () => {
      const hid = $$('#rc-scratch li[hidden]');
      if (hid.length) hid[0].hidden = false;
      if (hid.length <= 1) $('#rc-more').disabled = true;
    });
    $('#rc-proof').innerHTML = `<h5>正式证明 · 正推（标准配方）</h5><ol>${r.proof.map(([k, s]) => `<li${k ? ` data-hl="${k}" tabindex="0"` : ''}>${s}</li>`).join('')}</ol>`;
    $$('#rc-proof li[data-hl]').forEach(li => {
      const on = () => { S.hl = li.dataset.hl; plot.request(); };
      const off = () => { S.hl = null; plot.request(); };
      li.addEventListener('mouseenter', on); li.addEventListener('focus', on);
      li.addEventListener('mouseleave', off); li.addEventListener('blur', off);
    });
    $('#rc-presets').innerHTML = r.presets.map(p => `<button class="chip mono" type="button" data-p="${p}">${p.replace(/eps/g, 'ε')}</button>`).join('');
  }
  $('#rc-presets').addEventListener('click', e => { const b = e.target.closest('[data-p]'); if (!b) return; input.value = b.dataset.p; run(); });

  function run() {
    let fn;
    input.classList.remove('err');
    try { fn = Expr.compile(input.value, ['eps']); fn({ eps: 0.1 }); }
    catch (err) { input.classList.add('err'); status.innerHTML = `<span class="c-bad">无法解析：${err.message}</span>`; S.fn = null; S.results = null; plot.request(); return; }
    S.fn = fn;
    const r = R();
    let first = null, nFail = 0;
    for (const e of EPSS) {
      let d;
      try { d = fn({ eps: e }); } catch (_) { d = NaN; }
      const dm = r.dmax(e);
      const ok = d > 0 && isFinite(d) && d <= dm * (1 + 1e-9);
      if (!ok) { nFail++; if (!first) first = { e, d, dm }; }
    }
    S.results = { first, nFail };
    if (!first) {
      status.innerHTML = `<p class="c-ok"><b>✓ 360 个 ε 全部通过。</b>你的曲线整条落在安全区内。</p><p class="muted">这是很强的数值证据，但还不是证明：证明要用左边那样的不等式链，对<em>所有</em> ε 一次性说清楚。</p>`;
    } else {
      const { e, d, dm } = first;
      let why;
      if (!(d > 0) || !isFinite(d)) why = `此时 δ(ε) = ${fmt(d)}，不是正数。`;
      else {
        const sd = supDev(r.F, r.a, d, r.L);
        why = `此时 δ = ${fmt(d)}，但最大可行 δ 只有 ${fmt(dm)}。对手取 x = ${fmt(sd.x, 7)}，得 |f(x) − ${r.L}| = ${fmt(sd.sup)} ≥ ε。`;
      }
      const hint = S.key === 'sq' && first.e > 1 ? '提示：只有大 ε 出错？想想 |x + 2| 什么时候会超过 5。'
        : S.key === 'recip' && first.e > 0.5 ? '提示：δ 太大时去心邻域碰到了 x = 0 附近。'
        : S.key === 'xsin' ? '提示：x sin(1/x) 在 x 接近 δ 处可以几乎等于 x 本身。'
        : '提示：对小 ε 也失败，说明系数取大了。';
      status.innerHTML = `<p class="c-bad"><b>✗ 在 ${nFail} / 360 个 ε 上失败。</b>第一个失败点 ε = ${fmt(e)}：${why}</p><p class="muted">${hint}</p>`;
    }
    plot.request();
  }
  $('#rc-go').addEventListener('click', run);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') run(); });
  const tSet = pressGroup($('#rc-targets'), '.chip', k => load(k));
  function load(k) { S.key = k; tSet(k); scratch(); input.value = R().start; run(); }
  load('sq');
})();
