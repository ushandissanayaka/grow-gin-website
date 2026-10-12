import { $, prefersReducedMotion, storage } from './utils';

type Theme = 'dark' | 'light';
const KEY = 'grow-theme';
const root = document.documentElement;

const current = (): Theme => (root.dataset.theme === 'light' ? 'light' : 'dark');

const apply = (theme: Theme) => {
  root.dataset.theme = theme;
  $('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#f6f3ec' : '#0b0b0a');
  const btn = $('#themeToggle');
  btn?.setAttribute('aria-label', `Switch to ${theme === 'light' ? 'dark' : 'light'} mode`);
};

/**
 * Dark / light switch. Where the View Transitions API exists the new theme
 * spreads out as a circle from the button; elsewhere colours cross-fade.
 */
export function initTheme() {
  const btn = $<HTMLButtonElement>('#themeToggle');
  if (!btn) return;
  apply(current());

  btn.addEventListener('click', () => {
    const next: Theme = current() === 'dark' ? 'light' : 'dark';
    storage.set(KEY, next);

    if (!document.startViewTransition || prefersReducedMotion) {
      apply(next);
      return;
    }
    const r = btn.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));

    const transition = document.startViewTransition(() => apply(next));
    transition.ready.then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 900, easing: 'cubic-bezier(0.77, 0, 0.175, 1)', pseudoElement: '::view-transition-new(root)' },
      );
    });
  });

  // follow the OS setting until the visitor picks one themselves
  matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
    if (!storage.get(KEY)) apply(e.matches ? 'light' : 'dark');
  });
}
