/* ===== 页面胶水：导航高亮、跨实验台跳转、字体与公式加载后的重绘 ===== */
(() => {
  const links = $$('.toc a');
  const secs = links.map(a => $(a.getAttribute('href'))).filter(Boolean);
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => {
      es.forEach(e => {
        if (!e.isIntersecting) return;
        links.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    secs.forEach(s => io.observe(s));
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-open]');
    if (!b) return;
    const [name, arg] = b.dataset.open.split(':');
    const fn = Lab.open[name];
    if (!fn) return;
    const el = fn(arg);
    if (el) el.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' });
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => Plot.all.forEach(p => p.request()));
  Lab.on('mathjax', () => Plot.all.forEach(p => p.resize()));
})();
