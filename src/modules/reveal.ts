import { $$ } from './utils';

/** Adds `.is-in` to anything that scrolls into view (once). */
export function initReveal() {
  // Chrome's IntersectionObserver honours clip-path, so a fully clipped
  // [data-reveal="clip"] figure would never intersect: watch its parent instead.
  const watchers = new Map<Element, HTMLElement[]>();

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        watchers.get(entry.target)?.forEach((el) => el.classList.add('is-in'));
        watchers.delete(entry.target);
        io.unobserve(entry.target);
      });
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.05 },
  );

  $$('[data-delay]').forEach((el) => el.style.setProperty('--delay', `${el.dataset.delay}ms`));

  $$('[data-reveal], [data-split], .way, .slider, .leaf')
    .filter((el) => !el.closest('.hero'))
    .forEach((el) => {
      const watched = el.dataset.reveal === 'clip' ? el.parentElement! : el;
      if (!watchers.has(watched)) {
        watchers.set(watched, []);
        io.observe(watched);
      }
      watchers.get(watched)!.push(el);
    });
}
