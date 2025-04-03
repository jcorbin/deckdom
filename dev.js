import { get as getHashVar } from './hashvar.js';

/** @param {object} [opts]
 * @param {HTMLDialogElement} [opts.dialog]
 * @param {HTMLElement} [opts.content]
 * @param {Storage} [opts.storage]
 */
export default async function initDevLog({
  dialog,
  content = dialog,
  storage = localStorage,
} = {}) {

  const digest = await (async () => {
    if (!content) return '';
    const algo = 'SHA-256';
    const text = await fetchDevLog(content);
    const data = (new TextEncoder()).encode(text);
    const hash = await crypto.subtle.digest(algo, data);
    const hashArray = Array.from(new Uint8Array(hash));
    const hashHex = hashArray
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    return `${algo}:${hashHex}`;
  })()

  if (dialog) {
    if (getHashVar(window.location, 'dialog')) return;
    if (digest) {
      const seenKey = `${dialog.id || '_devLog'}_lastSeen`;
      const lastSeen = storage.getItem(seenKey);
      console.log({ seenKey, lastSeen, digest });
      if (lastSeen === digest) return;
      dialog.addEventListener('close', () => storage.setItem(seenKey, digest), { once: true });
    }
    dialog.showModal();
  }
}

/** @param {HTMLElement} el */
export async function fetchDevLog(el) {
  const devLogSrc = (() => {
    for (const link of el.querySelectorAll(':scope a')) {
      const href = link?.getAttribute('href');
      if (href) {
        link.parentNode?.removeChild(link);
        return href;
      }
    }
    return undefined;
  })();
  if (!devLogSrc) return;

  const mdStatus = await fetch(devLogSrc);
  if (mdStatus.status !== 200)
    throw new Error(`HTTP ${mdStatus.status} ${mdStatus.statusText}`);

  const text = await mdStatus.text();
  el.insertAdjacentHTML('beforeend', Array
    .from(renderHead(mdStatus.url, text))
    .join('\n'));

  return text;
}

/**
 * @param {string} url
 * @param {string} text
 */
function* renderHead(url, text) {

  // TODO rework this into a proper markdown structure scanner
  yield* function*() {
    /** @type {{H: number, title: string}[]} */
    const section = [];

    /** @type {string[]} */
    const htmlState = [];

    for (const line of text.split(/\n/g)) {

      {
        const match = /^(#+)\s+(.+)$/.exec(line);
        if (match) {
          const [_, head = '', title = ''] = match;
          const H = head.length;
          while (section.length) {
            const last = section[section.length - 1];
            if (last && last.H > 1 && last.title === 'Done') return;
            section.pop();
          }
          while (htmlState.length) yield `</${htmlState.pop()}>`;
          yield `<h${H}>${title}</h${H}>`;
          section.push({ H, title });
          continue;
        }
      }

      // TODO actual markdown rendering
      if (!htmlState.length && !line) continue;
      if (htmlState[htmlState.length - 1] !== 'pre') {
        htmlState.push('pre');
        yield `<pre>`;
      }
      yield line
        .replaceAll('<', '&lt')
        .replaceAll('>', '&gt');

    }

    while (htmlState.length) yield `</${htmlState.pop()}>`;
  }();

  yield `<a href="${url}">Full Dev Log</a>`;
}
