/** @typedef {{ [name: string]: CardSpec & { [prop: string]: any }}} Spec */

/** @typedef {object} CardSpec
 * @property {string} name
 */

/**
 * @param {any} spec
 * @returns {spec is Spec}
 */
function isSpec(spec) {
  if (typeof spec !== 'object') return false;
  if (spec === null) return false;
  for (const val of Object.values(spec)) {
    if (!isCardSpec(val)) return false;
  }
  return true;
}

/**
 * @param {any} spec
 * @returns {spec is CardSpec}
 */
function isCardSpec(spec) {
  if (typeof spec !== 'object') return false;
  if (spec === null) return false;
  if (!('name' in spec)) return false;
  if (typeof spec.name !== 'string') return false;
  return true;
}

/** @param {any} spec */
export default function init(spec) {
  if (!(typeof spec === 'object' && spec instanceof Element))
    throw new Error('must provide spec element');
  if (
    spec.tagName.toLowerCase() !== 'script' ||
    spec.getAttribute('language') !== 'application/json'
  ) throw new Error('spec must be a JSON script element');
  const rawText = spec.textContent || '';
  const specData = JSON.parse(rawText);
  if (!isSpec(specData))
    throw new Error('invalid spec data');

  const world = makeWorld(specData);
  // TODO option for domain(s)
  world.init(document.body);
}

/** @param {HTMLElement|string} data */
const parseCard = data => {
  if (typeof data !== 'string') {
    if (data instanceof HTMLElement) {
      data = data.dataset['card'] || '';
    } else {
      throw new Error('invalid card data');
    }
  }
  const match = /^(.*?)#(.+?)(?:,(.*)|$)/.exec(data);
  const [_, flags = '', id, rest = ''] = match || [];
  return { id, flags, rest };
};

/** @param {HTMLElement|string} data */
const countCards = data => {
  if (typeof data !== 'string') {
    if (data instanceof HTMLElement) {
      data = data.dataset['card'] || '';
    } else {
      throw new Error('invalid card data');
    }
  }
  let n = data.length > 0 ? 1 : 0;
  for (const _ of data.matchAll(/,/g)) n++;
  return n;
};

/** @param {string} flags */
const isFaceUp = flags => flags.indexOf('F') != -1;

/** @param {string} flags */
const isReversed = flags => flags.indexOf('R') != -1;

/** @param {Spec} spec */
function makeWorld(spec) {

  // TODO save/restore state

  return {
    /** @param {Element} domain */
    init(domain) {
      this.makeDomain(domain);

      const stack = document.createElement('div');
      stack.dataset['card'] = Object.keys(spec).map(id => `#${id}`).join(',');
      domain.appendChild(stack);
      this.render(stack);
    },

    /** @param {HTMLElement} el */
    render(el) {
      const numCards = countCards(el);

      const baseClassName = el.classList.item(0) || (numCards > 1 ? 'stack' : 'card');
      el.className = baseClassName;

      const { id, flags } = parseCard(el);
      if (!isFaceUp(flags)) {
        el.classList.add('back');
      } else {
        el.classList.add('face');
        if (id) el.classList.add(id);
      }

      if (isReversed(flags)) el.classList.add('reversed');

      el.style.setProperty('--stack-depth', `${numCards}`);
    },

    /** @param {HTMLElement} domain */
    makeDomain(domain) {

      /** @param {HTMLElement} el */
      const dragInfo = el => {
        const match = /mouse:(\d+),(-?\d+),(-?\d+)/.exec(el.dataset['dragStart'] || '');
        if (match) {
          const buttons = parseInt(match[1] || '');
          const x = parseInt(match[2] || '');
          const y = parseInt(match[3] || '');
          return { mouse: { buttons, x, y } };
        }
        return null;
      };

      const ctl = {

        /** @param {Event} ev */
        handleEvent(ev) {

          if (ev instanceof MouseEvent) {
            const { type, target, button, buttons, x, y } = ev;

            if (type === 'mousedown') {
              if (button === 0) {
                if (target instanceof HTMLElement) {
                  target.classList.add('dragon');
                  target.dataset['dragStart'] = `mouse:${buttons},${x},${y}`;
                }
                console.log('start drag', target);
              }
              return;
            }

            const drags = domain.querySelectorAll('.dragon');
            for (const drag of drags) {
              const info = drag instanceof HTMLElement ? dragInfo(drag) : null;
              if (!info) continue;
              console.log('???', type, info.mouse.buttons, buttons);
            }

            // if (type === 'mouseup') { }
            // if (type === 'mousemove') { }

            // TODO left drag move
            // TODO right drag take
            // TODO dwell menu
            // TODO scroll for cut?
            // TODO how to cut?
            // if (ev instanceof MouseEvent)
            // const { type, target } = ev;

          }

          // if (ev instanceof MouseEvent) {
          //   // ev.preventDefault();
          //   // ev.stopPropagation();
          //   // ev.cancelBubble
          //   const { type, cancelable, button, buttons, x, y } = ev;
          //   console.log({ type, cancelable, button, buttons, x, y });
          // }

          // console.log(type, target);
          // if (target instanceof HTMLElement) {
          //   this.render(target);
          // }

        },

      };

      domain.addEventListener('contextmenu', ev => ev.preventDefault());
      domain.addEventListener('mousedown', ctl);
      domain.addEventListener('mouseup', ctl);
      domain.addEventListener('mousemove', ctl);

      // TODO key event handling
      // TODO touch event handling

      return ctl;
    },

  }
}
