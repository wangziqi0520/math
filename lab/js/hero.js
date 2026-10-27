/* ===== 极限显微镜：sin(1/x) 与 x sin(1/x) 同步放大 ===== */
(() => {
  const cl = $('#scope-l'), cr = $('#scope-r');
  if (!cl) return;
  const EPS = 0.25, YH = 1.3;
  const pl = new Plot(cl, { interactive: false });
  const pr = new Plot(cr, { interactive: false });
  const slider = $('#scope-k'), playBtn = $('#scope-play');
  let k = +slider.value, playing = false, dir = 1, last = 0;

  const layer = F => (c, p) => {
    p.hband(-EPS, EPS, Theme.get('eps-fill'));
    p.hline(EPS, Theme.get('eps'), [5, 4], 1);
    p.hline(-EPS, Theme.get('eps'), [5, 4], 1);
    p.fn(F, { width: 1.8, colorBy: (lo, hi) => (lo > -EPS && hi < EPS) ? Theme.get('ok') : Theme.get('curve') });
    p.text('ε = 0.25', p.w - 10, p.Y(EPS) - 11, { align: 'right', color: Theme.get('eps') });
  };
  pl.layers = [layer(FN.sin1x)];
  pr.layers = [layer(FN.xsin)];

  function setK(v) {
    k = v;
    const W = 1.2 * Math.pow(10, -k);
    for (const p of [pl, pr]) { p.view = { x0: -W, x1: W, y0: -YH, y1: YH }; p.request(); }
    $('#scope-w').textContent = fmt(W, 3);
    const L = infSup(FN.sin1x, 0, W), R = infSup(FN.xsin, 0, W);
    $('#scope-om-l').textContent = fmt(L.hi - L.lo, 3);
    $('#scope-om-r').textContent = fmt(R.hi - R.lo, 3);
    const fitL = L.hi < EPS && L.lo > -EPS, fitR = R.hi < EPS && R.lo > -EPS;
    const vl = $('#scope-v-l'), vr = $('#scope-v-r');
    vl.textContent = fitL ? '已锁进 ε 带' : '装不进 ε 带';
    vl.style.color = fitL ? Theme.get('ok') : Theme.get('bad');
    vr.textContent = fitR ? '已锁进 ε 带 ✓' : '还在 ε 带外';
    vr.style.color = fitR ? Theme.get('ok') : Theme.get('ink-2');
  }
  slider.addEventListener('input', () => { stop(); setK(+slider.value); });
  function stop() { playing = false; playBtn.textContent = '▶ 自动放大'; }
  function tick(now) {
    if (!playing) return;
    const dt = Math.min(64, now - (last || now)); last = now;
    let v = k + dir * dt * 0.0011;
    if (v >= 6.5) { v = 6.5; dir = -1; }
    if (v <= 0) { v = 0; dir = 1; }
    slider.value = v;
    setK(v);
    requestAnimationFrame(tick);
  }
  playBtn.addEventListener('click', () => {
    if (playing) { stop(); return; }
    playing = true; last = 0; playBtn.textContent = '❚❚ 暂停';
    if (k >= 6.4) dir = -1; else if (k <= 0.05) dir = 1;
    requestAnimationFrame(tick);
  });
  Lab.on('theme', () => setK(k));
  setK(k);
})();
