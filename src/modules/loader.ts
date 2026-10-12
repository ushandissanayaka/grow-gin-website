import { $, prefersReducedMotion, storage, wait } from './utils';

const preload = (src: string) =>
  new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = img.onerror = () => resolve();
    img.src = src;
  });

/** Counts up while the first hero images download, then lifts the curtains. */
export async function runLoader(critical: string[]) {
  const loader = $('#loader')!;
  const count = $('#loaderCount')!;
  let loaded = 0;
  let shown = 0;
  const minTime = prefersReducedMotion ? 0 : 1800;
  const start = performance.now();

  const tasks = critical.map((src) => preload(src).then(() => loaded++));

  await new Promise<void>((resolve) => {
    const step = () => {
      const timePct = Math.min(1, (performance.now() - start) / Math.max(1, minTime));
      const loadPct = critical.length ? loaded / critical.length : 1;
      const goal = Math.min(timePct, loadPct) * 100;
      shown += (goal - shown) * 0.12 + 0.2;
      shown = Math.min(shown, goal);
      count.textContent = String(Math.round(shown));
      if (goal >= 100 && shown >= 99.5) {
        count.textContent = '100';
        resolve();
      } else requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  await Promise.all(tasks);

  loader.classList.add('is-done');
  document.body.classList.remove('is-loading');
  await wait(prefersReducedMotion ? 0 : 900);
  wait(600).then(() => loader.classList.add('is-gone'));
}

const AGE_KEY = 'grow-age-ok';

/**
 * Resolves once the visitor confirms they are of legal drinking age.
 * `onAccept` runs synchronously inside the click so it can start audio.
 * Resolves `true` if the gate was shown, `false` for returning visitors.
 */
export function ageGate(onAccept?: () => void): Promise<boolean> {
  const gate = $('#agegate')!;
  if (storage.get(AGE_KEY) === '1') return Promise.resolve(false);

  gate.hidden = false;
  document.body.classList.add('is-locked');
  (gate.querySelector('[data-age="yes"]') as HTMLButtonElement).focus();

  return new Promise((resolve) => {
    gate.addEventListener('click', async (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-age]');
      if (!btn) return;
      if (btn.dataset.age === 'no') {
        gate.classList.add('is-denied');
        gate.querySelector('.agegate__note')!.textContent =
          'Sorry — come back and raise a glass with us when you are of age.';
        return;
      }
      storage.set(AGE_KEY, '1');
      onAccept?.();
      gate.classList.add('is-leaving');
      document.body.classList.remove('is-locked');
      await wait(600);
      gate.hidden = true;
      resolve(true);
    });
  });
}
