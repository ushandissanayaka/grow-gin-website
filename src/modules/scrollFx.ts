import { $, $$, clamp, lerp, onTick, prefersReducedMotion, viewport } from './utils';

/** Header: compact bar after the hero top, hides while scrolling down. */
export function initHeader() {
  const header = $('#header')!;
  let lastY = 0;
  onTick(() => {
    const y = viewport.scrollY;
    if (Math.abs(y - lastY) < 2) return;
    header.classList.toggle('is-scrolled', y > 80);
    const menuOpen = document.body.classList.contains('menu-open');
    header.classList.toggle('is-hidden', !menuOpen && y > viewport.h && y > lastY);
    lastY = y;
  });
}

/** [data-parallax="speed"] images and [data-parallax-box] blocks drift on scroll. */
export function initParallax() {
  if (prefersReducedMotion) return;
  const items = $$('[data-parallax], [data-parallax-box]').map((el) => ({
    el,
    speed: parseFloat(el.dataset.parallax ?? el.dataset.parallaxBox ?? '0'),
    host: (el.closest('figure') ?? el) as HTMLElement,
  }));
  onTick(() => {
    const vh = viewport.h;
    for (const it of items) {
      const r = it.host.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) continue;
      const offset = (r.top + r.height / 2 - vh / 2) * it.speed;
      it.el.style.setProperty('--p', `${offset.toFixed(1)}px`);
    }
  });
}

/** Intro paragraph: words light up one by one as you scroll through it. */
export function initScrubText() {
  $$('[data-scrub]').forEach((el) => {
    const words = (el.textContent ?? '').trim().split(/\s+/);
    el.setAttribute('aria-label', words.join(' '));
    el.innerHTML = words.map((w) => `<span class="w" aria-hidden="true">${w}</span>`).join(' ');
    const spans = $$('.w', el);
    let lastLit = -1;
    onTick(() => {
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > viewport.h) return;
      const p = clamp((viewport.h * 0.85 - r.top) / (r.height + viewport.h * 0.35));
      const lit = prefersReducedMotion ? spans.length : Math.round(p * spans.length);
      if (lit === lastLit) return;
      spans.forEach((s, i) => s.classList.toggle('on', i < lit));
      lastLit = lit;
    });
  });
}

/** Endless marquee whose speed and direction follow scroll velocity. */
export function initMarquee() {
  const track = $('#marquee');
  if (!track) return;
  let x = 0;
  let velocity = 0;
  let dir = -1;
  let lastY = viewport.scrollY;
  onTick((_, dt) => {
    const y = viewport.scrollY;
    const dy = y - lastY;
    lastY = y;
    if (dy !== 0) dir = dy > 0 ? -1 : 1;
    velocity = lerp(velocity, Math.abs(dy), 0.1);
    const half = track.scrollWidth / 2;
    const speed = prefersReducedMotion ? 0 : (0.04 + velocity * 0.02) * dt;
    x += speed * dir;
    if (x <= -half) x += half;
    if (x > 0) x -= half;
    track.style.transform = `translate3d(${x}px,0,0) skewX(${clamp(dy * -0.15, -8, 8)}deg)`;
  });
}

/** Pinned section whose track slides horizontally while you scroll down. */
export function initHorizontalGallery() {
  const section = $('#gallery');
  const track = $('#hTrack');
  if (!section || !track) return;
  const figs = $$('img', track);
  let eased = 0;
  onTick(() => {
    const r = section.getBoundingClientRect();
    if (r.bottom < 0 || r.top > viewport.h) return;
    const total = r.height - viewport.h;
    const p = clamp(-r.top / total);
    eased = prefersReducedMotion ? p : lerp(eased, p, 0.12);
    const distance = track.scrollWidth - viewport.w;
    track.style.transform = `translate3d(${-eased * distance}px,0,0)`;
    figs.forEach((img) => {
      const fr = img.parentElement!.getBoundingClientRect();
      const c = (fr.left + fr.width / 2) / viewport.w - 0.5; // -0.5 .. 0.5
      // sharpest (scale 1) at screen centre, zoomed toward the edges
      img.style.setProperty('--s', (1 + Math.min(1, Math.abs(c) * 2) * 0.2).toFixed(3));
    });
  });
}

/** Number counters + measure SVG paths for the botanical line drawing. */
export function initBotanicals() {
  $$<SVGGeometryElement>('.leaf__art .draw').forEach((path, i) => {
    const len = Math.ceil(path.getTotalLength());
    path.style.setProperty('--len', String(len));
    path.style.setProperty('--i', String(i));
  });

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        const el = entry.target as HTMLElement;
        const end = Number(el.dataset.count);
        const start = performance.now();
        const dur = prefersReducedMotion ? 0 : 1800;
        const step = (t: number) => {
          const p = dur ? clamp((t - start) / dur) : 1;
          el.textContent = String(Math.round(end * (1 - Math.pow(1 - p, 4))));
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    },
    { threshold: 0.6 },
  );
  $$('[data-count]').forEach((el) => io.observe(el));
}
