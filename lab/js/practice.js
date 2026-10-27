/* ===== 第 4 章关系图 + 第 5 章英文练习 ===== */
(() => {
  const wrap = $('#map');
  if (!wrap) return;
  const arrows = $$('.marrow', wrap), pfs = $$('#map-proof .pf');
  function select(p) {
    arrows.forEach(a => { const on = a.dataset.p === p; a.classList.toggle('on', on); $('path.vis', a).setAttribute('marker-end', on ? 'url(#ah-on)' : 'url(#ah)'); a.setAttribute('aria-pressed', String(on)); });
    pfs.forEach(d => { d.hidden = d.dataset.p !== p; });
  }
  arrows.forEach(a => {
    a.addEventListener('click', () => select(a.dataset.p));
    a.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(a.dataset.p); } });
  });
})();

(() => {
  const list = $('#ex-list');
  if (!list) return;
  const EX = [
    {
      id: 'neg', topic: 'Quantifiers', type: 'mc',
      q: 'Which statement is the <b>negation</b> of $\\lim_{x\\to a}f(x)=A$?',
      opts: [
        '$\\forall\\varepsilon>0\\ \\exists\\delta>0\\ \\exists x:\\ 0&lt;|x-a|&lt;\\delta$ and $|f(x)-A|\\ge\\varepsilon$',
        '$\\exists\\varepsilon>0\\ \\forall\\delta>0\\ \\exists x:\\ 0&lt;|x-a|&lt;\\delta$ and $|f(x)-A|\\ge\\varepsilon$',
        '$\\exists\\varepsilon>0\\ \\forall\\delta>0\\ \\forall x:\\ 0&lt;|x-a|&lt;\\delta\\Rightarrow|f(x)-A|\\ge\\varepsilon$',
        '$\\exists\\varepsilon>0\\ \\exists\\delta>0\\ \\exists x:\\ |x-a|\\ge\\delta$ and $|f(x)-A|\\ge\\varepsilon$',
      ],
      ans: 1,
      why: [
        'The quantifiers $\\forall\\varepsilon\\,\\exists\\delta$ were not flipped. Negation turns every $\\forall$ into $\\exists$ and vice versa.',
        'Correct. Push $\\neg$ through: $\\forall\\to\\exists$, $\\exists\\to\\forall$, $\\forall\\to\\exists$, and $\\neg(P\\Rightarrow Q)\\equiv P\\wedge\\neg Q$.',
        'Too strong: this says <em>every</em> point near $a$ is bad. The negation only needs <em>one</em> bad point in each neighbourhood.',
        'The condition $0&lt;|x-a|&lt;\\delta$ must stay unchanged; only the conclusion is negated. Points far from $a$ say nothing about the limit.',
      ],
    },
    {
      id: 'swap', topic: 'Quantifier order', type: 'mc',
      q: 'What does $\\exists\\delta>0\\ \\forall\\varepsilon>0\\ \\forall x\\ \\big(0&lt;|x-a|&lt;\\delta\\Rightarrow|f(x)-A|&lt;\\varepsilon\\big)$ say about $f$?',
      opts: ['It is equivalent to $\\lim_{x\\to a}f(x)=A$.', '$f(x)=A$ for every $x$ in some punctured neighbourhood of $a$.', '$f$ is continuous at $a$.', 'It is false for every function $f$.'],
      ans: 1,
      why: [
        'Swapping $\\forall\\varepsilon$ and $\\exists\\delta$ changes the meaning: $\\delta$ can no longer depend on $\\varepsilon$.',
        'Correct. For a fixed $x$, $|f(x)-A|&lt;\\varepsilon$ for <em>all</em> $\\varepsilon>0$ forces $f(x)=A$. So $f\\equiv A$ on $U^\\circ(a;\\delta)$.',
        'The statement never mentions $f(a)$, so it cannot say anything about continuity at $a$.',
        'A constant function $f\\equiv A$ satisfies it, so it is not always false.',
      ],
    },
    {
      id: 'lin', topic: 'Choosing δ', type: 'multi',
      q: 'For $\\lim_{x\\to2}(3x-1)=5$, which choices of $\\delta$ work for <b>every</b> $\\varepsilon>0$? Select all that apply.',
      opts: ['$\\delta=\\varepsilon$', '$\\delta=\\varepsilon/3$', '$\\delta=\\varepsilon/4$', '$\\delta=3\\varepsilon$', '$\\delta=\\min\\{1,\\varepsilon/3\\}$'],
      ans: [1, 2, 4],
      why: [
        '$\\delta=\\varepsilon$ fails: $|(3x-1)-5|=3|x-2|$ can be close to $3\\varepsilon$.',
        '$\\delta=\\varepsilon/3$ works: $3|x-2|&lt;3\\delta=\\varepsilon$.',
        '$\\delta=\\varepsilon/4$ works: any smaller positive $\\delta$ also works.',
        '$\\delta=3\\varepsilon$ fails: $3|x-2|$ can be close to $9\\varepsilon$.',
        '$\\min\\{1,\\varepsilon/3\\}\\le\\varepsilon/3$, so it works too.',
      ],
    },
    {
      id: 'rec', topic: 'Constructing δ', type: 'recipe',
      q: 'Find a formula $\\delta(\\varepsilon)$ that proves $\\lim_{x\\to3}x^2=9$. Type it below using <code>eps</code>, e.g. <code>min(1, eps/10)</code>. It will be tested on 360 values of $\\varepsilon\\in[10^{-6},10^{3}]$.',
      dmax: e => -3 + Math.sqrt(9 + e),
      sup: d => 6 * d + d * d,
      sol: 'Scratch work: $|x^2-9|=|x-3|\\,|x+3|$. If $\\delta\\le1$ then $2&lt;x&lt;4$, so $|x+3|&lt;7$ and $|x^2-9|&lt;7\\delta$. Take $\\delta=\\min\\{1,\\varepsilon/7\\}$. (Any formula with $6\\delta+\\delta^2\\le\\varepsilon$ also works.)',
    },
    {
      id: 'one', topic: 'Heine', type: 'mc',
      q: 'True or false: if $f(1/n)\\to L$ as $n\\to\\infty$, then $\\lim_{x\\to0}f(x)=L$.',
      opts: ['True', 'False'],
      ans: 1,
      why: [
        'One sequence is not enough. Try $f(x)=\\sin\\frac{\\pi}{x}$: $f(1/n)=\\sin n\\pi=0$, yet the limit does not exist.',
        'Correct. Heine requires <em>every</em> sequence $x_n\\to0$, $x_n\\ne0$. For $f(x)=\\sin\\frac{\\pi}{x}$, $f(1/n)=0$ but $x_n=\\frac{2}{4n+1}$ gives $f(x_n)=1$.',
      ],
    },
    {
      id: 'half', topic: 'Constructing sequences', type: 'seq',
      q: 'Construct a sequence $x_n\\to0$ with $x_n\\ne0$ such that $\\sin\\dfrac{1}{x_n}\\to\\dfrac12$. Type $x_n$ as a formula in <code>n</code>.',
      target: 0.5,
      sol: 'Solve $\\sin t=\\frac12$: $t=\\frac\\pi6+2n\\pi$. So $x_n=\\dfrac{1}{\\pi/6+2n\\pi}$ gives $\\sin\\frac1{x_n}=\\frac12$ for every $n$. Also valid: $x_n=\\dfrac{1}{5\\pi/6+2n\\pi}$.',
    },
    {
      id: 'cos', topic: 'Heine', type: 'mc',
      q: 'To show $\\lim_{x\\to0}\\cos\\frac1x$ does not exist with Heine\'s criterion, which pair of sequences works?',
      opts: ['$x_n=\\frac{1}{2n\\pi},\\ y_n=-\\frac{1}{2n\\pi}$', '$x_n=\\frac{1}{2n\\pi},\\ y_n=\\frac{1}{(2n+1)\\pi}$', '$x_n=\\frac{1}{2n\\pi},\\ y_n=\\frac{1}{4n\\pi}$', '$x_n=2n\\pi,\\ y_n=(2n+1)\\pi$'],
      ans: 1,
      why: [
        '$\\cos$ is even, so both give $\\cos(\\pm 2n\\pi)=1$: the same limit, which proves nothing.',
        'Correct. $\\cos(2n\\pi)=1$ and $\\cos((2n+1)\\pi)=-1$, both sequences tend to $0$ and avoid $0$.',
        'Both give $\\cos(2n\\pi)=\\cos(4n\\pi)=1$: the same limit.',
        'These sequences tend to $\\infty$, not to $0$.',
      ],
    },
    {
      id: 'exist', topic: 'Existence', type: 'multi',
      q: 'Which of these limits <b>exist</b>? Select all that apply.',
      opts: ['$\\lim_{x\\to0}x\\sin\\frac1x$', '$\\lim_{x\\to0}\\sin\\frac1x$', '$\\lim_{x\\to0}x^2\\cos\\frac1{x^2}$', '$\\lim_{x\\to0}\\operatorname{sgn}x$', '$\\lim_{x\\to0}\\frac{\\sin x}{x}$'],
      ans: [0, 2, 4],
      why: [
        'Exists and equals $0$: $|x\\sin\\frac1x|\\le|x|$ (bounded × infinitesimal).',
        'Does not exist: $x_n=\\frac1{2n\\pi}$ and $y_n=\\frac{1}{\\pi/2+2n\\pi}$ give limits $0$ and $1$.',
        'Exists and equals $0$: $|x^2\\cos\\frac1{x^2}|\\le x^2$.',
        'Does not exist: $\\frac1n\\to0$ gives $1$, $-\\frac1n\\to0$ gives $-1$.',
        'Exists and equals $1$ — one of the two fundamental limits.',
      ],
    },
    {
      id: 'cneg', topic: 'Cauchy criterion', type: 'mc',
      q: 'Which statement shows that $\\lim_{x\\to a}f(x)$ does <b>not</b> exist (the negation of the Cauchy criterion)?',
      opts: [
        '$\\exists\\varepsilon_0>0\\ \\forall\\delta>0\\ \\exists x\',x\'\'\\in U^\\circ(a;\\delta):\\ |f(x\')-f(x\'\')|\\ge\\varepsilon_0$',
        '$\\forall\\varepsilon>0\\ \\exists\\delta>0\\ \\exists x\',x\'\'\\in U^\\circ(a;\\delta):\\ |f(x\')-f(x\'\')|\\ge\\varepsilon$',
        '$\\exists\\varepsilon_0>0\\ \\exists\\delta>0\\ \\forall x\',x\'\'\\in U^\\circ(a;\\delta):\\ |f(x\')-f(x\'\')|\\ge\\varepsilon_0$',
        'There exist $x\',x\'\'$ near $a$ with $f(x\')\\ne f(x\'\')$.',
      ],
      ans: 0,
      why: [
        'Correct. Note that no candidate value $A$ appears — that is the advantage of the Cauchy form.',
        'Wrong quantifier pattern: the negation starts with $\\exists\\varepsilon_0$, not $\\forall\\varepsilon$.',
        'Too strong (and impossible for $x\'=x\'\'$). We need bad pairs in <em>every</em> neighbourhood, not all pairs in one.',
        'Almost every non-constant function has such points; this says nothing about the limit.',
      ],
    },
    {
      id: 'order', topic: 'Writing a proof', type: 'order',
      q: 'Build the formal proof that $\\lim_{x\\to2}x^2=4$: click the steps in the correct order. One step does not belong in a formal proof.',
      steps: [
        'Let $\\varepsilon>0$ be given.',
        'Choose $\\delta=\\min\\{1,\\varepsilon/5\\}$.',
        'Suppose $0&lt;|x-2|&lt;\\delta$.',
        'Since $\\delta\\le1$, we have $1&lt;x&lt;3$, so $|x+2|&lt;5$.',
        'Then $|x^2-4|=|x-2|\\,|x+2|&lt;5|x-2|&lt;5\\delta\\le\\varepsilon$.',
        'Hence $\\lim_{x\\to2}x^2=4$. $\\blacksquare$',
      ],
      distractor: 'Assume $|x^2-4|&lt;\\varepsilon$; then $|x-2|&lt;\\varepsilon/5$.',
      sol: 'The order is: fix $\\varepsilon$ → choose $\\delta$ → take an arbitrary admissible $x$ → bound $|x+2|$ → chain of inequalities → conclusion. The step “Assume $|x^2-4|&lt;\\varepsilon$” assumes the conclusion; reasoning backwards belongs in scratch work only.',
    },
    {
      id: 'compl', topic: 'Completeness', type: 'mc',
      q: 'In the proof that the Cauchy criterion implies $\\lim_{x\\to a}f(x)$ exists, where is the <b>completeness of $\\mathbb R$</b> used?',
      opts: ['To show that $\\{f(x_n)\\}$ is a Cauchy sequence for every $x_n\\to a$.', 'To conclude that the Cauchy sequence $\\{f(x_n)\\}$ converges.', 'To show that two sequences give the same limit, via interleaving.', 'To choose $\\delta$ for a given $\\varepsilon$.'],
      ans: 1,
      why: [
        'This step only uses the Cauchy condition on $f$ and $x_n\\to a$; it works in $\\mathbb Q$ as well.',
        'Correct. A Cauchy sequence of reals converges — that is completeness. In $\\mathbb Q$ this step fails.',
        'Interleaving uses only the fact that subsequences of a convergent sequence share its limit.',
        'Choosing $\\delta$ is given by the hypothesis; no completeness needed.',
      ],
    },
    {
      id: 'dir', topic: 'Heine', type: 'mc',
      q: 'Let $D(x)=1$ for rational $x$ and $D(x)=0$ for irrational $x$. Which argument correctly shows $\\lim_{x\\to a}D(x)$ does not exist for every $a$?',
      opts: [
        '$D$ is not continuous anywhere, so the limit cannot exist.',
        'Take rationals $r_n\\to a$ and irrationals $s_n\\to a$ with $r_n,s_n\\ne a$; then $D(r_n)\\to1$ and $D(s_n)\\to0$.',
        'Take $x_n=a+\\frac1n$; then $D(x_n)$ does not converge.',
        '$D$ takes only two values, so it has no limit.',
      ],
      ans: 1,
      why: [
        'Discontinuity alone does not rule out a limit: a removable discontinuity still has a limit.',
        'Correct. Both sequences exist because $\\mathbb Q$ and $\\mathbb R\\setminus\\mathbb Q$ are dense; two different limits contradict Heine.',
        'If $a$ is rational, $a+\\frac1n$ is always rational and $D(x_n)\\equiv1$ converges. The argument fails.',
        'Taking finitely many values proves nothing: $\\operatorname{sgn}x$ takes three values, yet $\\lim_{x\\to5}\\operatorname{sgn}x=1$.',
      ],
    },
  ];

  let solved = new Set(storeGet('limlab-solved', []));
  const save = () => storeSet('limlab-solved', [...solved]);
  function progress() {
    const n = EX.filter(e => solved.has(e.id)).length;
    $('#ex-bar').style.width = `${n / EX.length * 100}%`;
    $('#ex-count').textContent = `${n} / ${EX.length} solved`;
  }
  function mark(card, ex, ok) {
    if (ok) { solved.add(ex.id); save(); }
    card.classList.toggle('solved', solved.has(ex.id));
    $('.tick', card).hidden = !solved.has(ex.id);
    progress();
  }
  const shuffle = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

  EX.forEach((ex, k) => {
    const card = document.createElement('article');
    card.className = 'ex';
    card.id = 'ex-' + ex.id;
    let body = '';
    if (ex.type === 'mc' || ex.type === 'multi') {
      body = `<div class="opts">${ex.opts.map((o, i) => `<button class="opt" type="button" data-i="${i}" aria-pressed="false"><span class="key">${String.fromCharCode(65 + i)}</span><span>${o}</span></button>`).join('')}</div>`;
      if (ex.type === 'multi') body = '<p class="muted" style="font-size:var(--t-xs)">Select all that apply.</p>' + body;
    } else if (ex.type === 'recipe') {
      body = `<div class="recipe-input"><label for="exin-${ex.id}">δ(ε) =</label><input class="txt" id="exin-${ex.id}" type="text" spellcheck="false" autocomplete="off" placeholder="min(1, eps/7)"></div>`;
    } else if (ex.type === 'seq') {
      body = `<div class="recipe-input"><label for="exin-${ex.id}">xₙ =</label><input class="txt" id="exin-${ex.id}" type="text" spellcheck="false" autocomplete="off" placeholder="1/(... + 2n*pi)"></div>`;
    } else if (ex.type === 'order') {
      const items = shuffle([...ex.steps.map((s, i) => ({ i, s })), { i: -1, s: ex.distractor }]);
      body = `<span class="order-cap">AVAILABLE STEPS</span><div class="order-pool">${items.map(it => `<button class="opt" type="button" data-i="${it.i}"><span>${it.s}</span></button>`).join('')}</div><span class="order-cap">YOUR PROOF</span><div class="order-built"></div>`;
    }
    const whys = ex.why ? ex.why.map((w, i) => `<div data-w="${i}" hidden><b>${String.fromCharCode(65 + i)}.</b> ${w}</div>`).join('') : '';
    card.innerHTML = `<div class="ex-head"><span class="ex-no">${String(k + 1).padStart(2, '0')}</span><span class="ex-topic">${ex.topic}</span><span class="tick" hidden>✓ Solved</span></div>
      <div class="ex-q">${ex.q}</div>${body}
      <div class="ex-actions"><button class="btn primary" type="button" data-a="check">Check</button>${ex.sol ? '<button class="btn" type="button" data-a="sol">Show solution</button>' : ''}${ex.type === 'order' ? '<button class="btn" type="button" data-a="clear">Clear</button>' : ''}</div>
      <div class="ex-fb" hidden><p class="fb-head"></p>${whys}</div>
      ${ex.sol ? `<div class="ex-sol" hidden>${ex.sol}</div>` : ''}`;
    list.appendChild(card);
    mark(card, ex, false);
    const fb = $('.ex-fb', card), head = $('.fb-head', fb);
    const show = (cls, text, ws = []) => {
      fb.hidden = false; fb.className = 'ex-fb ' + cls; head.innerHTML = text;
      $$('[data-w]', fb).forEach(d => { d.hidden = !ws.includes(+d.dataset.w); });
    };

    if (ex.type === 'mc' || ex.type === 'multi') {
      const opts = $$('.opt', card);
      opts.forEach(o => o.addEventListener('click', () => {
        if (ex.type === 'mc') opts.forEach(x => x.setAttribute('aria-pressed', String(x === o)));
        else o.setAttribute('aria-pressed', String(o.getAttribute('aria-pressed') !== 'true'));
        opts.forEach(x => x.classList.remove('right', 'wrong'));
        fb.hidden = true;
      }));
    }
    if (ex.type === 'order') {
      const pool = $('.order-pool', card), built = $('.order-built', card);
      card.addEventListener('click', e => {
        const b = e.target.closest('.opt');
        if (!b) return;
        (b.parentElement === pool ? built : pool).appendChild(b);
        fb.hidden = true;
      });
      card.addEventListener('click', e => {
        if (e.target.closest('[data-a="clear"]')) { $$('.opt', built).forEach(b => pool.appendChild(b)); fb.hidden = true; }
      });
    }
    $('[data-a="check"]', card).addEventListener('click', () => {
      if (ex.type === 'mc') {
        const sel = $$('.opt', card).findIndex(o => o.getAttribute('aria-pressed') === 'true');
        if (sel < 0) { show('info', 'Pick an option first.'); return; }
        const ok = sel === ex.ans;
        $$('.opt', card)[sel].classList.add(ok ? 'right' : 'wrong');
        show(ok ? 'ok' : 'bad', ok ? '✓ Correct.' : '✗ Not quite.', [sel]);
        mark(card, ex, ok);
      } else if (ex.type === 'multi') {
        const sel = $$('.opt', card).map((o, i) => o.getAttribute('aria-pressed') === 'true' ? i : -1).filter(i => i >= 0);
        if (!sel.length) { show('info', 'Select at least one option.'); return; }
        const wrong = [];
        ex.opts.forEach((_, i) => { const want = ex.ans.includes(i), got = sel.includes(i); if (want !== got) wrong.push(i); });
        $$('.opt', card).forEach((o, i) => { if (sel.includes(i)) o.classList.add(ex.ans.includes(i) ? 'right' : 'wrong'); });
        const ok = wrong.length === 0;
        show(ok ? 'ok' : 'bad', ok ? '✓ Correct — all of them, and nothing else.' : `✗ ${wrong.length} option${wrong.length > 1 ? 's are' : ' is'} misjudged:`, ok ? ex.ans : wrong);
        mark(card, ex, ok);
      } else if (ex.type === 'recipe') {
        const inp = $('input', card);
        let fn;
        try { fn = Expr.compile(inp.value, ['eps']); fn({ eps: 1 }); } catch (_) { inp.classList.add('err'); show('bad', 'Could not read that formula. Use <code>eps</code>, numbers, + − * / ^, min, max, sqrt and parentheses.'); return; }
        inp.classList.remove('err');
        let first = null, fails = 0;
        for (let i = 0; i < 360; i++) {
          const e = Math.pow(10, -6 + 9 * i / 359);
          let d; try { d = fn({ eps: e }); } catch (_) { d = NaN; }
          if (!(d > 0 && isFinite(d) && d <= ex.dmax(e) * (1 + 1e-9))) { fails++; if (!first) first = { e, d }; }
        }
        if (!first) { show('ok', '✓ Passed all 360 tests. Now write the inequality chain that proves it for every ε — the numerical test is only evidence.'); mark(card, ex, true); }
        else {
          const { e, d } = first;
          const msg = !(d > 0 && isFinite(d)) ? `At ε = ${fmt(e)} your δ is ${fmt(d)}, which is not a positive number.`
            : `At ε = ${fmt(e)} your δ = ${fmt(d)}, but for x = 3 + δ (approached from inside) |x² − 9| reaches 6δ + δ² = ${fmt(ex.sup(d))} ≥ ε.`;
          show('bad', `✗ Failed for ${fails} of 360 values of ε. ${msg} ${e > 1 ? 'Large ε are the problem — remember to cap δ.' : 'Try a smaller constant.'}`);
        }
      } else if (ex.type === 'seq') {
        const inp = $('input', card);
        let fn;
        try { fn = Expr.compile(inp.value, ['n']); } catch (_) { inp.classList.add('err'); show('bad', 'Could not read that formula. Use <code>n</code>, <code>pi</code>, numbers, + − * / ^, sqrt, arcsin and parentheses.'); return; }
        inp.classList.remove('err');
        let zero = false, nan = false, maxTail = 0, maxMid = 0, errMax = 0;
        for (let n = 1; n <= 4000; n++) {
          const x = fn({ n });
          if (!isFinite(x)) { nan = true; break; }
          if (x === 0) zero = true;
          if (n >= 2000) { maxTail = Math.max(maxTail, Math.abs(x)); errMax = Math.max(errMax, Math.abs(Math.sin(1 / x) - ex.target)); }
          if (n >= 500 && n <= 1000) maxMid = Math.max(maxMid, Math.abs(x));
        }
        if (nan) show('bad', '✗ Some terms are undefined.');
        else if (zero) show('bad', '✗ Some term equals 0, but Heine\'s criterion needs x<sub>n</sub> ≠ 0.');
        else if (!(maxTail < 0.05 && maxTail <= maxMid * 0.85)) show('bad', `✗ Your sequence does not seem to tend to 0 (|x<sub>n</sub>| is still about ${fmt(maxTail, 3)} for n ≈ 4000).`);
        else if (errMax > 1e-4) show('bad', `✗ x<sub>n</sub> → 0, but sin(1/x<sub>n</sub>) does not approach 1/2: for 2000 ≤ n ≤ 4000 it is off by up to ${fmt(errMax, 3)}.`);
        else { show('ok', '✓ x<sub>n</sub> → 0, x<sub>n</sub> ≠ 0, and sin(1/x<sub>n</sub>) → 1/2. Combined with x<sub>n</sub> = 1/(2nπ) (giving 0), this proves the limit does not exist.'); mark(card, ex, true); }
      } else if (ex.type === 'order') {
        const ids = $$('.order-built .opt', card).map(b => +b.dataset.i);
        if (!ids.length) { show('info', 'Click steps to add them to your proof.'); return; }
        if (ids.includes(-1)) { show('bad', '✗ Your proof contains a step that assumes the conclusion (“Assume |x² − 4| < ε …”). That is scratch work, not proof.'); return; }
        const pos = ids.findIndex((v, i) => v !== i);
        if (pos === -1 && ids.length === ex.steps.length) { show('ok', '✓ A complete, correctly ordered proof.'); mark(card, ex, true); }
        else if (pos === -1) show('info', `So far so good — ${ex.steps.length - ids.length} step(s) still missing.`);
        else show('bad', `✗ Step ${pos + 1} is out of place. Think: what must be fixed before you can talk about it?`);
      }
    });
    const solBtn = $('[data-a="sol"]', card);
    if (solBtn) solBtn.addEventListener('click', () => { const s = $('.ex-sol', card); s.hidden = !s.hidden; solBtn.textContent = s.hidden ? 'Show solution' : 'Hide solution'; });
  });
  $('#ex-reset').addEventListener('click', () => {
    solved = new Set(); save();
    $$('.ex', list).forEach((c, i) => mark(c, EX[i], false));
  });
  progress();
})();
