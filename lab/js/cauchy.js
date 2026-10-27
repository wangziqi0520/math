/* ===== 第 3 章：振幅计、两点博弈 ===== */
(() => {
  const root = $('#ca-lab');
  if (!root) return;
  const plot = new Plot($('#ca-canvas'));
  const wplot = new Plot($('#ca-wcanvas'), { interactive: false, xlog: true, view: { x0: 1e-6, x1: 2.5, y0: -0.1, y1: 2.3 }, xName: 'δ' });
  const CFG = {
    sin1x: { view: [-0.8, 0.8, -1.6, 1.6], d: 0.2 },
    xsin: { view: [-0.5, 0.5, -0.5, 0.5], d: 0.3 },
    sgn: { view: [-1.5, 1.5, -1.6, 1.6], d: 0.5 },
    sinc: { view: [-8, 8, -0.5, 1.4], d: 2 },
    sq: { view: [0.4, 3.6, -0.6, 9], d: 0.5 },
  };
  const S = { key: 'sin1x', d: 0.2, follow: true, curve: [], r: null };
  const F = () => FN[S.key];
  const sl = logSlider($('#ca-delta'), $('#ca-delta-out'), -6, 0.38, v => setD(v));

  function focus(d = S.d) {
    const r = infSup(F(), F().a, d * 2.2);
    const m = Math.max((r.hi - r.lo) * 0.2, 1e-9);
    return { x0: F().a - 2.2 * d, x1: F().a + 2.2 * d, y0: r.lo - m, y1: r.hi + m };
  }
  plot.tools($('#ca-tools'), () => focus());
  plot.onView = () => { if (S.follow) { S.follow = false; $('#ca-follow').checked = false; } };
  $('#ca-follow').addEventListener('change', e => { S.follow = e.target.checked; if (S.follow) plot.animateTo(focus(), 450); });

  plot.layers = [(c, p) => {
    const f = F(), a = f.a, d = S.d, r = S.r;
    p.vband(a - d, a + d, Theme.get('delta-fill'));
    p.vline(a - d, Theme.get('delta'), [6, 4], 1.3); p.vline(a + d, Theme.get('delta'), [6, 4], 1.3);
    if (r && isFinite(r.lo)) {
      p.hband(r.lo, r.hi, Theme.get('cau-fill'), a - d, a + d);
      p.hline(r.lo, Theme.get('cau'), [4, 4], 1.2); p.hline(r.hi, Theme.get('cau'), [4, 4], 1.2);
    }
    p.fn(f, { width: 1.8 });
    p.marks(f);
    if (r && isFinite(r.lo)) {
      p.dot(r.xhi, r.hi, 6, Theme.get('plot-bg'), Theme.get('cau'));
      p.dot(r.xlo, r.lo, 6, Theme.get('plot-bg'), Theme.get('cau'));
      const lf = 'italic 14px "STIX Two Text", serif';
      p.text('x′', p.X(r.xhi) + 8, p.Y(r.hi) - 12, { color: Theme.get('cau'), font: lf });
      p.text('x″', p.X(r.xlo) + 8, p.Y(r.lo) + 14, { color: Theme.get('cau'), font: lf });
      const X = p.w - 34, y1 = clamp(p.Y(r.hi), 4, p.h - 4), y0 = clamp(p.Y(r.lo), 4, p.h - 4);
      c.strokeStyle = Theme.get('cau'); c.lineWidth = 2;
      c.beginPath(); c.moveTo(X - 6, y1); c.lineTo(X, y1); c.lineTo(X, y0); c.lineTo(X - 6, y0); c.stroke();
      p.text(`ω = ${fmt(r.hi - r.lo, 3)}`, X - 10, (y0 + y1) / 2, { align: 'right', color: Theme.get('cau') });
    }
  }];
  wplot.layers = [(c, p) => {
    p.polyline(S.curve, Theme.get('cau'), 2);
    p.vline(S.d, Theme.get('delta'), [4, 3], 1.2);
    if (S.r) p.dot(S.d, S.r.hi - S.r.lo, 4.5, Theme.get('cau'), Theme.get('plot-bg'));
  }];

  function setD(d) {
    S.d = clamp(d, 1e-6, 2.4);
    S.r = infSup(F(), F().a, S.d);
    if (S.follow) plot.setView(focus());
    wplot.request(); plot.request();
    const w = S.r.hi - S.r.lo, f = F();
    const lim = f.L !== null;
    $('#ca-status').className = 'status ' + (lim ? 'ok' : 'bad');
    $('#ca-status').innerHTML = `<p>窗口 0 &lt; |${M('x')} − ${M('a')}| &lt; ${fmt(S.d)} 内：sup ${M('f')} ≈ ${fmt(S.r.hi, 4)}，inf ${M('f')} ≈ ${fmt(S.r.lo, 4)}，<b>${M('ω')}(${M('δ')}) ≈ ${fmt(w, 4)}</b>。</p>`
      + (lim ? `<p class="c-ok">${M('δ')} → 0 时 ${M('ω')} → 0：任给 ${M('ε')}，只要 ${M('ω')}(${M('δ')}) &lt; ${M('ε')}，窗口内任两点之差就 &lt; ${M('ε')}。Cauchy 条件成立 ⇒ 极限存在。</p>`
        : `<p class="c-bad">${M('δ')} 再小，${M('ω')}(${M('δ')}) 也停在 ${fmt(w, 3)}：取 ${M('ε')}<sub>0</sub> ≤ ${fmt(w, 3)}，每个窗口里都有两点之差 ≥ ${M('ε')}<sub>0</sub>。Cauchy 条件失败 ⇒ 极限不存在。</p>`);
  }
  const fnSet = pressGroup($('#ca-fns'), '.chip', k => load(k));
  function load(k) {
    S.key = k; fnSet(k);
    const c = CFG[k];
    plot.home = { x0: c.view[0], x1: c.view[1], y0: c.view[2], y1: c.view[3] };
    S.curve = [];
    let ymax = 0.1;
    for (let i = 0; i <= 140; i++) { const d = Math.pow(10, -6 + (Math.log10(2.5) + 6) * i / 140); const w = omega(FN[k], FN[k].a, d); S.curve.push([d, w]); ymax = Math.max(ymax, w); }
    wplot.view = { x0: 1e-6, x1: 2.5, y0: -ymax * 0.06, y1: ymax * 1.4 };
    sl.set(c.d);
    S.follow = true; $('#ca-follow').checked = true;
    setD(c.d);
    plot.setView(focus());
  }
  Lab.open.cauchy = k => { load(k || 'xsin'); return root; };
  load('sin1x');
})();

/* ---------- 3.3 两点博弈 ---------- */
(() => {
  const root = $('#pg-lab');
  if (!root) return;
  const plot = new Plot($('#pg-canvas'));
  const gameEl = $('#pg-game');
  const S = { key: 'sin1x', eps0: 1, g: null, picks: [] };
  const F = () => FN[S.key];
  const SCHED = [0.3, 0.04, 0.005, 6e-4, 7e-5];
  const VIEWS = { sin1x: [-0.8, 0.8, -1.6, 1.6], sgn: [-1.5, 1.5, -1.6, 1.6], xsin: [-0.5, 0.5, -0.5, 0.5] };
  const pips = (res, cur) => `<span class="pips">${SCHED.map((_, i) => `<i class="${res[i] ? 'win' : i === cur ? 'cur' : ''}"></i>`).join('')}</span>`;
  const viewFor = d => {
    const r = infSup(F(), 0, d * 1.7);
    const m = Math.max((r.hi - r.lo) * 0.25, d * 0.2, 1e-9);
    return { x0: -1.7 * d, x1: 1.7 * d, y0: r.lo - m, y1: r.hi + m };
  };
  plot.tools($('#pg-tools'), () => S.g && S.g.d ? viewFor(S.g.d) : null);
  plot.clickCursor = () => S.g && S.g.started && !S.g.over ? 'crosshair' : 'grab';
  plot.layers = [(c, p) => {
    const f = F(), g = S.g;
    if (g && g.d) {
      p.vband(-g.d, g.d, Theme.get('delta-fill'));
      p.vline(-g.d, Theme.get('delta'), [6, 4], 1.3); p.vline(g.d, Theme.get('delta'), [6, 4], 1.3);
      p.text(`δ = ${fmt(g.d)}`, p.X(g.d) - 6, 52, { align: 'right', color: Theme.get('delta'), font: 'italic 14px "STIX Two Text", serif' });
    }
    p.fn(f, { width: 1.8 });
    p.marks(f);
    const lf = 'italic 15px "STIX Two Text", serif';
    S.picks.forEach((x, i) => {
      const y = f.f(x);
      p.dot(x, y, 7, Theme.get('plot-bg'), Theme.get('cau'));
      p.dot(x, y, 3, Theme.get('cau'));
      p.text(i ? 'x″' : 'x′', p.X(x) + 9, p.Y(y) + (i ? 14 : -12), { color: Theme.get('cau'), font: lf });
    });
    if (S.picks.length === 2) {
      const y1 = f.f(S.picks[0]), y2 = f.f(S.picks[1]), ok = Math.abs(y1 - y2) >= S.eps0;
      const col = ok ? Theme.get('ok') : Theme.get('bad');
      const X = p.w - 34, Y1 = p.Y(y1), Y2 = p.Y(y2);
      p.hline(y1, Theme.get('cau'), [2, 3], 1); p.hline(y2, Theme.get('cau'), [2, 3], 1);
      c.strokeStyle = col; c.lineWidth = 2.2;
      c.beginPath(); c.moveTo(X - 6, Y1); c.lineTo(X, Y1); c.lineTo(X, Y2); c.lineTo(X - 6, Y2); c.stroke();
      p.text(`|f(x′)−f(x″)| = ${fmt(Math.abs(y1 - y2), 3)}`, X - 10, (Y1 + Y2) / 2, { align: 'right', color: col });
    }
  }];
  const epsIn = $('#pg-eps');
  epsIn.addEventListener('input', () => { S.eps0 = +epsIn.value; $('#pg-eps-out').textContent = fmt(S.eps0); intro(); });
  function intro() {
    S.g = null; S.picks = [];
    epsIn.disabled = false;
    gameEl.innerHTML = `<div class="game-top"><b>两点博弈</b>${pips([], -1)}</div>
      <div class="game-msg">你要证明：对 ${M('ε')}<sub>0</sub> = ${fmt(S.eps0)}，<em>每个</em> ${M('δ')} 的窗口里都有两点 ${M('x')}′, ${M('x')}″ 满足 |${M('f')}(${M('x')}′) − ${M('f')}(${M('x')}″)| ≥ ${M('ε')}<sub>0</sub>。电脑出 5 个越来越小的 ${M('δ')}。</div>
      <div class="btns"><button class="btn primary" type="button" data-act="start">开始</button></div>`;
    plot.animateTo({ x0: VIEWS[S.key][0], x1: VIEWS[S.key][1], y0: VIEWS[S.key][2], y1: VIEWS[S.key][3] }, 450);
  }
  function round() {
    const g = S.g;
    g.started = true; g.misses = 0; g.wait = false; S.picks = [];
    const ds = omegaStar(F(), 0, S.eps0);
    const sched = SCHED[g.r];
    g.d = ds > 0 ? (ds === Infinity ? sched : Math.min(sched, ds * 0.9)) : sched;
    g.valid = ds > 0;
    plot.animateTo(viewFor(g.d), 650);
    msg(`电脑给出 <span class="big c-delta">δ = ${fmt(g.d)}</span><br>在青色区域里点两次，依次选出 ${M('x')}′ 和 ${M('x')}″。`, '<button class="btn" type="button" data-act="quit">放弃</button>');
  }
  function msg(html, btns) {
    const g = S.g;
    gameEl.innerHTML = `<div class="game-top"><b>${g ? `第 ${Math.min(g.r + 1, SCHED.length)} 轮` : '两点博弈'}</b>${pips(g ? g.res : [], g ? g.r : -1)}</div><div class="game-msg">${html}</div><div class="btns">${btns || ''}</div>`;
  }
  plot.onClick = (wx, wy, px, py) => {
    const g = S.g;
    if (!g || !g.started || g.over || g.wait) return;
    const x = snapToGraph(plot, F(), px, py, 0, g.d);
    if (x === null) { $('.game-msg', gameEl).innerHTML = `这里不行：点必须在 0 &lt; |${M('x')}| &lt; ${M('δ')} 内（青色区域，且不是 0）。`; return; }
    if (S.picks.length === 2) S.picks = [];
    S.picks.push(x);
    plot.request();
    const f = F();
    if (S.picks.length === 1) { $('.game-msg', gameEl).innerHTML = `已选 ${M('x')}′ = ${fmt(x, 6)}，${M('f')}(${M('x')}′) = ${fmt(f.f(x), 4)}。<br>再点第二个点 ${M('x')}″。`; return; }
    const diff = Math.abs(f.f(S.picks[0]) - f.f(S.picks[1]));
    if (diff >= S.eps0) {
      g.res[g.r] = true; g.r++; g.wait = true;
      if (g.r >= SCHED.length) {
        g.over = true;
        const formula = S.key === 'sin1x' ? `取 ${M('k')} &gt; 1/(2π${M('δ')})，${M('x')}′ = 1/(2${M('k')}π)，${M('x')}″ = 1/(π/2 + 2${M('k')}π)，差恰为 1。`
          : S.key === 'sgn' ? `取 ${M('x')}′ = ${M('δ')}/2，${M('x')}″ = −${M('δ')}/2，差恰为 2。` : '';
        msg(`<span class="c-ok">✓ 差 = ${fmt(diff, 4)} ≥ ${M('ε')}<sub>0</sub>。</span><br><br><b>五轮全胜。</b>写成证明时，把“点出来的两点”换成对任意 ${M('δ')} 都成立的公式：${formula}`, '<button class="btn primary" type="button" data-act="again">再来一局</button>');
      } else msg(`<span class="c-ok">✓ |${M('f')}(${M('x')}′) − ${M('f')}(${M('x')}″)| = ${fmt(diff, 4)} ≥ ${M('ε')}<sub>0</sub>。这一轮你赢了。</span>`, '<button class="btn primary" type="button" data-act="next">下一轮（δ 更小）</button>');
    } else {
      g.misses++;
      if (g.misses >= 3 && g.valid) {
        g.over = true;
        const w = omega(f, 0, g.d);
        msg(`<b>电脑守住了。</b>这一轮 ${M('ω')}(${M('δ')}) ≈ ${fmt(w, 4)} &lt; ${M('ε')}<sub>0</sub>：窗口里<em>任意</em>两点之差都小于 ${M('ε')}<sub>0</sub>，你不可能赢。如果对每个 ${M('ε')}<sub>0</sub> 电脑都能这样防守，Cauchy 条件就成立，极限存在。`, '<button class="btn primary" type="button" data-act="again">重新开始</button>');
      } else $('.game-msg', gameEl).innerHTML = `差 = ${fmt(diff, 4)} &lt; ${M('ε')}<sub>0</sub>，不够。再点两个点（第一下会重新开始选 ${M('x')}′）。`;
    }
  };
  gameEl.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    const act = b.dataset.act;
    if (act === 'start') { S.g = { r: 0, res: [] }; epsIn.disabled = true; round(); }
    else if (act === 'next') round();
    else if (act === 'again' || act === 'quit') intro();
  });
  const fnSet = pressGroup($('#pg-fns'), '.chip', k => { S.key = k; intro(); });
  fnSet('sin1x');
  intro();
})();
