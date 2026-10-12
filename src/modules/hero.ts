import { $, clamp, onResize, onTick, prefersReducedMotion, viewport } from './utils';

/**
 * The reference site opens on a full-screen video. Our photos are portrait,
 * so instead the hero is built from vertical panels: each panel cycles through
 * its own images with a clip-path wipe + slow Ken Burns zoom, staggered so the
 * screen feels alive without shipping a single video byte.
 */
const SETS: string[][] = [
  ['closeup', 'rooftop', 'pour', 'festive-tree'],
  ['bar-lights', 'duomo', 'tonic', 'olives'],
  ['bar-flower', 'charcuterie', 'hand-lights', 'lamp'],
  ['wine-glass', 'marble-bites', 'bar-lights', 'closeup'],
];
const INTERVAL = 5200;

export const heroCritical = () => {
  const cols = columnCount();
  return SETS.slice(0, cols).map((s) => imgSrc(s[0]));
};

const columnCount = () => (viewport.w < 640 ? 1 : viewport.w < 1024 ? 2 : 4);
// every panel is ~400-520px wide on screen, so the full-size webp is the right fit
const imgSrc = (name: string) => `/img/${name}-lg.webp`;

export function initHero() {
  const hero = $('#hero')!;
  const wrap = $('#heroPanels')!;
  const progress = $('#heroProgress')!;
  let cols = 0;
  let step = 0;
  let timer = 0;
  let panels: HTMLElement[] = [];

  const build = () => {
    const next = columnCount();
    if (next === cols) return;
    cols = next;
    wrap.style.setProperty('--cols', String(cols));
    wrap.innerHTML = '';
    // on a single column merge all sets so the phone still sees every photo
    const sets = cols === 1 ? [SETS.flat().filter((v, i, a) => a.indexOf(v) === i)] : SETS.slice(0, cols);
    panels = sets.map((set, p) => {
      const panel = document.createElement('div');
      panel.className = 'panel';
      panel.style.animationDelay = `${p * 0.12}s`;
      set.forEach((name, i) => {
        const fig = document.createElement('div');
        fig.className = 'panel__img' + (i === 0 ? ' is-active' : '');
        const img = document.createElement('img');
        img.src = imgSrc(name);
        img.alt = '';
        img.decoding = 'async';
        if (i > 0) img.loading = 'lazy';
        fig.append(img);
        panel.append(fig);
      });
      wrap.append(panel);
      return panel;
    });
    step = 0;
    buildProgress(sets[0].length);
  };

  const buildProgress = (n: number) => {
    progress.innerHTML = '';
    for (let i = 0; i < n; i++) {
      const b = document.createElement('button');
      b.setAttribute('aria-label', `Show slide ${i + 1}`);
      b.style.setProperty('--dur', `${INTERVAL}ms`);
      b.addEventListener('click', () => go(i));
      progress.append(b);
    }
  };

  const go = (to: number) => {
    const total = panels[0].children.length;
    step = (to + total) % total;
    panels.forEach((panel, p) => {
      window.setTimeout(() => {
        const imgs = Array.from(panel.children) as HTMLElement[];
        imgs.forEach((el) => el.classList.remove('is-leaving'));
        const prev = imgs.find((el) => el.classList.contains('is-active'));
        prev?.classList.replace('is-active', 'is-leaving');
        imgs[step % imgs.length].classList.add('is-active');
      }, p * 160);
    });
    Array.from(progress.children).forEach((b, i) => {
      b.classList.remove('is-active');
      if (i === step) {
        void (b as HTMLElement).offsetWidth; // restart the CSS progress animation
        b.classList.add('is-active');
      }
    });
    clearInterval(timer);
    if (!prefersReducedMotion) timer = window.setInterval(() => go(step + 1), INTERVAL);
  };

  build();
  onResize(() => {
    const before = cols;
    build();
    if (before !== cols) go(0);
  });

  // scroll: panels drift at different speeds, content lifts and fades
  const content = $('.hero__content', hero)!;
  const bottle = $('.hero__bottle', hero)!;
  onTick(() => {
    const y = viewport.scrollY;
    if (y > viewport.h * 1.2) return;
    const t = clamp(y / viewport.h);
    panels.forEach((p, i) => p.style.setProperty('--py', `${y * (0.15 + (i % 2) * 0.18)}px`));
    content.style.transform = `translateY(calc(-50% + ${y * -0.35}px))`;
    content.style.opacity = String(1 - t * 1.6);
    bottle.style.translate = `0 ${y * 0.2}px`;
  });

  return {
    start() {
      hero.classList.add('is-intro');
      hero.querySelectorAll('[data-split]').forEach((el, i) => {
        (el as HTMLElement).style.setProperty('--d', `${600 + i * 400}ms`);
        el.classList.add('is-in');
      });
      go(0);
    },
  };
}
