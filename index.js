/** @typedef {[x: number, y: number]} Vec2 */
/** @typedef {[x: number, y: number, z: number]} Vec3 */
/** @typedef {[x: number, y: number, z: number, w: number]} Vec4 */

/** @param {number} a @param {number} b @param {number} p */
const lerp = (a, b, p) => a + p * (b - a);

/** @param {number} a @param {number} b @param {number} v */
const invLerp = (a, b, v) => (v - a) / (b - a);

/** @param {number} a @param {number} b @param {number} v */
const clamp = (a, b, v) => Math.max(a, Math.min(b, v));

/**
 * @param {number} a @param {number} b
 * @param {number} v
 * @param {number} c @param {number} d
 */
const remap = (a, b, v, c, d) => lerp(c, d, invLerp(a, b, v));

/** @typedef {{ [name: string]: CardDef}} Spec */

/** @typedef {{name: string} & {[prop: string]: any}} CardDef */

/**
 * @param {any} spec
 * @returns {spec is Spec}
 */
function isSpec(spec) {
  if (typeof spec !== 'object') return false;
  if (spec === null) return false;
  for (const val of Object.values(spec)) {
    if (!isCardDef(val)) return false;
  }
  return true;
}

/** @param {any} raw @returns {raw is CardDef} */
const isCardDef = raw =>
  typeof raw === 'object' && raw !== null &&
  'name' in raw && typeof raw.name === 'string';

/** @typedef {object} CardRef
 * @property {string} id
 */

/** @param {any} raw @returns {CardRef} */
const toCardRef = raw => {
  if (typeof raw === 'string') {
    // TODO validate as "#id" under spec?
    const id = raw.startsWith('#') ? raw.slice(1) : raw;
    return { id };
  }
  if (typeof raw === 'object' && raw !== null &&
    'id' in raw && typeof raw.id === 'string')
    return /** @type {CardRef} */ (raw);
  throw new Error('invalid card ref');
};

/** @typedef {(CardRef|CardDef) & ParticularCard} Card */

/**
 * Card orientation is represented as a ZYX ordered quaternion (i.e. KJI order if you're being classical about it).
 * However component values are in flip units, not radians.
 * Flip units are basically half-turns about a particular axis; i.e. they're equivalent to π radians.
 * Zero orientation is face down.
 *
 * The Y and X components are usually integers in practice:
 * - cards on a flat surface may only have integer values, having been either flipped face up or down
 * - conversely, a held card may be freely rotated in space
 * - beyond that, animation should be the only other time when partial X or Y flip values are seen
 *
 * Examples:
 * - `0` is a face down card 
 * - `1` is a face down card, reversed
 * - `0.5` is a face down card turnt sideways
 * - `[0,1]` is a face up card, upright
 * - `[1,1]` is a face up card, reversed
 * - `[0.5,1]` is a face up card, sideways (e.g. to form a cross)
 * - `[0,1,1]` is also face down reversed; `x flip * y flip = z flip`
 *
 * @typedef {(
 * | number // just Z
 * | [z: number]                         // singleton 'vector' type system / programming convenience ; shouldn't be used in practice
 * | [z: number, y: number]              // vec2 turn-unit quaternion, x=0
 * | [z: number, y: number, x: number]   // vec3 turn-unit quaternion
 * )} Orientation
 */

/** @param {any} raw @returns {raw is Orientation} */
function isOrientation(raw) {
  if (typeof raw === 'number') return true;
  if (!Array.isArray(raw)) return false;
  if (!raw.every(x => typeof x === 'number')) return false;
  return raw.length > 1;
}

const orientVars = ['--z-flips', '--y-flips', '--x-flips'];

/**
 * @param {HTMLElement} el
 * @param {Orientation} [orient]
 */
function orientEl(el, orient = 0) {
  const [z, y = 0, x = 0] = typeof orient === 'number' ? [orient] : orient;
  el.style.setProperty('--z-flips', `${z}`);
  el.style.setProperty('--y-flips', `${y}`);
  el.style.setProperty('--x-flips', `${x}`);
}

/**
 * @param {HTMLElement} el
 * @returns Orientation
 */
function elOrient(el) {
  const z = parseFloat(el.style.getPropertyValue('--z-flips'));
  const y = parseFloat(el.style.getPropertyValue('--y-flips'));
  const x = parseFloat(el.style.getPropertyValue('--x-flips'));
  if (x !== 0) return [z, y, x];
  if (y !== 0) return [z, y];
  return z;
}

/** @param {Orientation|undefined} orient */
const isFaceUp = orient => {
  if (!orient) return false;
  const [_z, y = 0, x = 0] = (typeof orient === 'number') ? [orient] : orient;
  return (x + y) % 2 == 1; // every x and y flip changes face
};

/** @param {Orientation|undefined} orient */
const isReversed = orient => {
  if (!orient) return false;
  const [z, _y = 0, x = 0] = (typeof orient === 'number') ? [orient] : orient;
  return (x + z) % 2 == 1; // only x and z flips will invert the face top-wrt-bottom
};

// τurn and fliπ
/** @typedef {object} ParticularCard
 * @property {Orientation} [orient] -- default to 0, aka face down
 */

/** @param {any} raw @returns {Card} */
const toCard = raw => {
  const card = isCardDef(raw) ? raw : toCardRef(raw);
  if ('orient' in card && card['orient'] !== undefined && !isOrientation(card['orient']))
    throw new Error('invalid card orientation');
  return card;
}

/** @param {any} raw @returns {Array<Card>} */
const toCards = raw => {
  if (Array.isArray(raw)) return raw.map(toCard);
  return [toCard(raw)];
};

/** @param {string} dat */
const parseCards = dat => dat ? toCards(JSON.parse(dat)) : [];

/** @param {Card} card */
const smudgeCard = card => {
  if ('id' in card) {
    const keys = Object.keys(card);
    if (keys.length === 1 && keys[0] === 'id') return card.id;
  }
  return card;
};

const dragDataType = 'application/x-webdeck+json';
const datasetKey = 'cards';

/**
 * @param {HTMLElement} el
 * @param {Array<string|Card>} cards
 */
const setElCards = (el, cards) => {
  el.dataset[datasetKey] = JSON.stringify(
    cards.map(c => typeof c === 'string' ? c : smudgeCard(c)));
};

/** @param {HTMLElement} el */
const getElCards = el => {
  const data = el.dataset[datasetKey];
  return data ? parseCards(data) : null;
};

/** @param {Event} ev */
const getEvCards = ev => {
  const { target } = ev;
  if (target instanceof HTMLElement)
    return { el: target, cards: getElCards(target) };
  // TODO support drag event data transfer
  return null;
};

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

  /**
   * @param {string} sel
   * @param {(el: HTMLElement) => void} [init]
   */
  const h = (sel, init) => {
    const match = /(.*?)(?:\.(.+?))?(?:#(.+))?$/.exec(sel);
    if (!match) throw new Error('invalid h sel');
    const [_, tagName, dottedClass, id] = match;
    const el = document.createElement(tagName || 'div');
    if (dottedClass) el.classList.add(...(dottedClass || '').split('.'));
    if (id) el.id = id;
    if (init) init(el);
    return el;
  };

  // TODO option to pass table and/or other domains
  const table = document.body.appendChild(h('.domain.table'));
  // TODO other domains?

  world.makeController(document.body);

  document.body.appendChild(h('.avatar.me', el => {
    el.appendChild(h('.hand.right'));
    el.appendChild(h('.hand.left'));
  }));

  table.appendChild(h('', el => {
    el.style.top = '20vh';
    el.style.left = '10vw';
    world.render(el, world.allCardIDs());
  }));
}

/**
 * @param {Spec} spec
 */
function makeWorld(spec) {
  // TODO freeze a copy of spec?
  // TODO save/restore state

  /**
   * @param {HTMLElement} el
   * @param {Array<string|Card>} [givenCards]
   */
  const render = (el, givenCards) => {
    const cards = (() => {
      if (givenCards) {
        setElCards(el, givenCards); // XXX smudge?
        return givenCards.map(x => {
          if (typeof x === 'string') {
            const id = x.startsWith('#') ? x.slice(1) : x;
            return { id };
          }
          return x;
        });
      }
      return getElCards(el) || [];
    })();

    const top = cards[0] || null; // cards.length > 1 ? cards[0] : null;

    const st = el.style;
    const updatedVars = new Set();

    if (!top) {
      el.className = 'void';
    } else {
      el.className = cards.length > 1 ? 'stack' : 'card';

      const { orient } = top;
      if (!isFaceUp(orient)) {
        el.classList.add('back');
      } else {
        el.classList.add('face');
        if ('id' in top) el.classList.add(top.id);
        // const card = 'id' in top ? spec[top.id] : top;
        // if (card) TODO actually render face
      }
      if (isReversed(orient)) el.classList.add('reversed');
      orientEl(el, orient);
      for (const v of orientVars)
        updatedVars.add(v);

      const def = 'id' in top ? spec[top.id] : top;
      if (def) {
        for (const [prop, val] of Object.entries(def)) {
          const key = `--card-${prop}`;
          st.setProperty(key, val);
          updatedVars.add(key);
        }
      }
    }

    for (const key of Array.from(st))
      if (key.startsWith('--card-') && !updatedVars.has(key))
        st.removeProperty(key);

    st.setProperty('--stack-depth', `${cards.length}`);
    el.draggable = cards.length > 0;
  };

  const world = {
    get spec() {
      return spec
    },

    allCardIDs() {
      return Array.from(Object.keys(spec).map(id => `#${id}`));
    },

    render,

    /** @param {HTMLElement} container */
    makeController(container) {
      // TODO customize context menu for stack / card actions
      // container.addEventListener('contextmenu', ev => ev.preventDefault());

      container.addEventListener('dragstart', ev => {
        const { dataTransfer: dt, offsetY } = ev;

        const r = getEvCards(ev);
        if (!dt || !r) {
          ev.preventDefault();
          return;
        }

        const { el, cards } = r;
        if (!cards || !cards.length) {
          ev.preventDefault();
          return;
        }

        const { offsetHeight } = el;

        /** @type {Vec2} */
        const dragBands = [
          /* take 1 ... */
          0.2,
          /* ... take N ... */
          0.8,
          /* ... take all */
        ];

        const dragBandLo = offsetHeight * dragBands[0];
        const dragBandHi = offsetHeight * dragBands[1];

        const ci = clamp(1, cards.length, Math.round(remap(dragBandLo, dragBandHi, offsetY, 0, cards.length)));
        const take = cards.slice(0, ci);
        const orient = elOrient(el);
        const rest = cards.slice(ci);

        // TODO update target, re-render, hide if empty
        // TODO sanify cards' particular orientations ; apply orient

        const dragData = {
          orient,
          cards: take.map(smudgeCard),
        };

        const names = take
          .map(card => 'name' in card ? card.name : spec[card.id]?.name)
          .filter(/** @returns {x is string} */ x => !!x);

        dt.setData('text/plain',
          names.length > 1 ? names.map(n => `- ${n}\n`).join('\n') : (names[0] || ''));
        dt.setData(dragDataType, JSON.stringify(dragData));
        dt.effectAllowed = 'move';
        // TODO attach face image(s)
        // TODO dt.setDragImage(img, x, y), use canvas to provide stack depth feedback ; also probably less gap to cursor

        world.render(el, rest);
      });

      container.addEventListener('dragenter', ev => {
        // TODO ev.preventDefault();
      });

      container.addEventListener('dragover', ev => {
        // TODO ev.preventDefault();
      });

      // TODO dragexit?

      // console.log(type, target);
      // if (target instanceof HTMLElement) {
      //   this.render(target);
      // }

      // TODO touch event handling

    },
  };

  return world;
}
