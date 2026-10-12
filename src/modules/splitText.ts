import { $$ } from './utils';

/**
 * Splits every [data-split="chars|words"] element into masked spans so the
 * CSS can slide each piece up when the host receives `.is-in`.
 * Nested inline elements (<strong>, <em>) are preserved.
 */
export function initSplitText() {
  $$('[data-split]').forEach((host) => {
    const mode = host.dataset.split === 'words' ? 'words' : 'chars';
    let index = 0;

    const splitNode = (node: Node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        Array.from(node.childNodes).forEach(splitNode);
        return;
      }
      if (node.nodeType !== Node.TEXT_NODE || !node.textContent) return;

      const frag = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) {
          frag.append(document.createTextNode(' '));
          return;
        }
        const word = document.createElement('span');
        word.className = 'split-word';
        if (mode === 'words') {
          const inner = document.createElement('span');
          inner.className = 'split-inner';
          inner.style.setProperty('--i', String(index++ * 3));
          inner.textContent = part;
          word.append(inner);
        } else {
          for (const ch of part) {
            const c = document.createElement('span');
            c.className = 'split-char';
            c.style.setProperty('--i', String(index++));
            c.textContent = ch;
            word.append(c);
          }
        }
        frag.append(word);
      });
      node.parentNode?.replaceChild(frag, node);
    };

    host.setAttribute('aria-label', host.textContent?.replace(/\s+/g, ' ').trim() ?? '');
    Array.from(host.childNodes).forEach(splitNode);
    $$('.split-word', host).forEach((w) => w.setAttribute('aria-hidden', 'true'));
    host.classList.add('split-host');
  });
}
