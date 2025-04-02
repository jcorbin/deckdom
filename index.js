//// TODO break out into some kinda maths module
// structure inspired by gl-matrix, but based instead around modern array destructuring,
// and the supposition that result array re-use is less important in modern runtimes
//
// also gl-matrix doesn't ship invLerp / remap / clamp functions anyhow

const scal = Object.freeze({
  /** @param {number} v @param {number} a @param {number} b */
  clamp(v, a, b) { return Math.max(a, Math.min(b, v)) },

  /** @param {number} v @param {Vec2} ab */
  clamp2(v, [a, b]) { return Math.max(a, Math.min(b, v)) },

  /** @param {number} p @param {number} a @param {number} b */
  lerp(p, a, b) { return a + p * (b - a) },

  /** @param {number} p @param {Vec2} ab
   */
  lerp2(p, [a, b]) { return a + p * (b - a) },

  /** @param {number} v @param {number} a @param {number} b */
  invLerp(v, a, b) { return (v - a) / (b - a) },

  /** @param {number} v @param {Vec2} ab */
  invLerp2(v, [a, b]) { return (v - a) / (b - a) },

  /** @param {number} v @param {number} a @param {number} b @param {number} c @param {number} d */
  remap(v, a, b, c, d) { return scal.lerp(scal.invLerp(v, a, b), c, d) },

  /** @param {number} v @param {Vec2} ab @param {number} c @param {number} d */
  remap2(v, ab, c, d) { return scal.lerp(scal.invLerp2(v, ab), c, d) },

  /** @param {number} v @param {number} a @param {number} b @param {Vec2} cd */
  remap4(v, a, b, cd) { return scal.lerp2(scal.invLerp(v, a, b), cd) },

  /** @param {number} v @param {Vec2} ab @param {Vec2} cd */
  remap6(v, ab, cd) { return scal.lerp2(scal.invLerp2(v, ab), cd) },
});

/** @typedef {[x: number, y: number]} Vec2 */

const vec2 = Object.freeze({
  /** @param {Vec2} v */
  toString([x, y]) { return `${x},${y}` },

  /** @param {string} s @returns {Vec2} */
  fromString(s) {
    const match = /^(.+?),(.+?)(?:$|,.*)/.exec(s);
    const [_, sx = '', sy = ''] = match || [];
    return [parseFloat(sx), parseFloat(sy)];
  },

  /**
   * @param {Vec2} xy
   * @param {HTMLElement|CSSStyleDeclaration} elOrStyle
   */
  toStyleTopLeft([x, y], elOrStyle) {
    const style = elOrStyle instanceof CSSStyleDeclaration ? elOrStyle : elOrStyle.style;
    style.left = `${x}px`;
    style.top = `${y}px`;
  },

  /** @param {number} s @param {Vec2} v @returns {Vec2} */
  scale(s, [x, y]) { return [s * x, s * y] },

  /** @param {Vec2} a @returns {Vec2} */
  neg([ax, ay]) { return [-ax, -ay] },

  /** @param {Vec2} a @param {Vec2} b @returns {Vec2} */
  add([ax, ay], [bx, by]) { return [ax + bx, ay + by] },

  /** @param {Vec2} a @param {Vec2} b @returns {Vec2} */
  sub([ax, ay], [bx, by]) { return [ax - bx, ay - by] },

  /** @param {Vec2} a @param {Vec2} b @returns {Vec2} */
  mul([ax, ay], [bx, by]) { return [ax * bx, ay * by] },

  // TODO dot / cross / norm

  /** @param {Vec2} a @param {Vec2} b @returns {Vec2} */
  min([ax, ay], [bx, by]) { return [Math.min(ax, bx), Math.min(ay, by)] },

  /** @param {Vec2} a @param {Vec2} b @returns {Vec2} */
  max([ax, ay], [bx, by]) { return [Math.max(ax, bx), Math.max(ay, by)] },

  /** @param {Vec2} v @param {Vec2} a @param {Vec2} b @returns {Vec2} */
  clamp(v, a, b) { return vec2.max(a, vec2.min(b, v)) },

  // TODO lerp / invLerp / remap
});

/** @typedef {[x: number, y: number, z: number]} Vec3 */

/** @typedef {[x: number, y: number, z: number, w: number]} Vec4 */

/**
 * Orientation is represented as ZYX "flip units".
 * A flip unit is simply a count, or partial factor of, half-turns around a given axis.
 * In other words 1 flip is π radians.
 *
 * @typedef {(
 * | number      // Orientation degenerates to "just regular 2d rotation, in flip units"
 * | [z: number] // programming convenience, used mostly as a temporary type lift
 * | Vec2        // ZY flips vector
 * | Vec3        // ZYX flips vector
 * )} Orient
 */

const orient = Object.freeze({
  // NOTE toString is redundant since fromString will parse natural string value of number or array

  /** @param {string} s @returns {Orient} */
  fromString(s) {
    const match = /^(?:([^,]+)(?:,([^,]+)(?:,([^,]+))?)?)?/.exec(s)
    const [_, sz = '', sy = '', sx = ''] = match || [];
    const z = sz ? parseFloat(sz) : 0;
    const y = sz ? parseFloat(sy) : 0;
    const x = sz ? parseFloat(sx) : 0;
    return orient.packValues(z, y, x);
  },

  /**
   * @param {Orient} a
   * @param {Orient} b
   * @returns {Orient}
   */
  add(a, b) {
    const [za, ya = 0, xa = 0] = orient.unpack(a);
    const [zb, yb = 0, xb = 0] = orient.unpack(b);
    return orient.packValues(za + zb, ya + yb, xa + xb);
  },

  /**
   * @param {Orient} o
   * @param {number} az
   * @param {number} [ay]
   * @param {number} [ax]
   * @returns {Orient}
   */
  addValues(o, az, ay = 0, ax = 0) {
    const [z, y = 0, x = 0] = orient.unpack(o);
    return orient.packValues(z + az, y + ay, x + ax);
  },

  /** @param {any} val @returns {val is Orient} */
  isInstance(val) {
    if (typeof val === 'number') return true;
    if (!Array.isArray(val)) return false;
    if (!val.every(x => typeof x === 'number')) return false;
    return val.length > 1;
  },

  /** @param {Orient} o @returns {Vec3} */
  unpack(o) {
    const [z, y = 0, x = 0] = (typeof o === 'number') ? [o] : o;
    return [z, y, x];
  },

  /**
   * @param {number} z
   * @param {number} y
   * @param {number} x
   * @returns {Orient}
   */
  packValues(z, y, x) {
    if (x !== 0 && !isNaN(x)) return [z, y, x];
    if (y !== 0 && !isNaN(y)) return [z, y];
    return z;
  },

  /** @param {Orient} o */
  zInversions(o) {
    const [_z, y = 0, x = 0] = orient.unpack(o);
    return x + y;
  },


  /** @param {Orient} o */
  yInversions(o) {
    const [z, _y = 0, x = 0] = orient.unpack(o);
    return x + z;
  },


  /** @param {Orient} o */
  xInversions(o) {
    const [z, y = 0, _x = 0] = orient.unpack(o);
    return y + z;
  },

  /** @typedef {[string, string, string]} OrientStyleVars */

  /**
   * @param {Orient} o
   * @param {OrientStyleVars} vars
   * @param {CSSStyleDeclaration} style
   */
  toStyle(vars, style, o) {
    const [z, y = 0, x = 0] = typeof o === 'number' ? [o] : o;
    const [zVar, yVar, xVar] = vars;
    style.setProperty(zVar, `${z}`);
    style.setProperty(yVar, `${y}`);
    style.setProperty(xVar, `${x}`);
  },

  /**
   * @param {OrientStyleVars} vars
   * @param {CSSStyleDeclaration} style
   * @returns {Orient}
   */
  fromStyle(vars, style) {
    const [zVar, yVar, xVar] = vars;
    const zv = style.getPropertyValue(zVar)
    const yv = style.getPropertyValue(yVar)
    const xv = style.getPropertyValue(xVar)
    const z = zv ? parseFloat(zv) : 0;
    const y = yv ? parseFloat(yv) : 0;
    const x = xv ? parseFloat(xv) : 0;
    return orient.packValues(z, y, x);
  },

  // TODO convert to quaternion

});

/**
 * @param {Vec2} at
 * @param {Element|null} el
 * @param {Element} [until]
 */
function subOffset(at, el, until) {
  for (
    let op = el;
    op && op !== until && op instanceof HTMLElement;
    op = op.offsetParent
  ) at[0] -= op.offsetLeft, at[1] -= op.offsetTop;
};

/**
 * @param {Vec2} at
 * @param {Element|null} el
 * @param {Element} [until]
 */
function addOffset(at, el, until) {
  for (
    let op = el;
    op && op !== until && op instanceof HTMLElement;
    op = op.offsetParent
  ) at[0] += op.offsetLeft, at[1] += op.offsetTop;
};

//// END maths module

// NOTE For card orientations zero is face down, and the Y and X components are usually integers in practice:
// - cards on a flat surface may only have integer values, having been either flipped face up or down
// - conversely, a held card may be freely rotated in space
// - beyond that, animation should be the only other time when partial X or Y flip values are seen
//
// Examples:
// - `0` is a face down card 
// - `1` is a face down card, reversed
// - `0.5` is a face down card turnt sideways
// - `[0,1]` is a face up card, upright
// - `[1,1]` is a face up card, reversed
// - `[0.5,1]` is a face up card, sideways (e.g. to form a cross)
// - `[0,1,1]` is also face down reversed; `x flip * y flip = z flip`

/** @param {string} nom */
function* generateMonotonicIds(nom) {
  for (let n = 1; ; n++)
    yield `${nom}${n}`;
}

/**
 * @param {string|Iterable<string>} genId
 * @param {Document} doc
 */
function generateId(genId, doc = window.document) {
  for (const id of typeof genId === 'string' ? generateMonotonicIds(genId) : genId)
    if (!doc.getElementById(id))
      return id;
  throw new Error('must generate id');
}

/**
 * @param {string|undefined} name
 * @param {string} kind
 * @param {Document} doc
 */
function makeId(name, kind, doc = window.document) {
  return name
    ? titleJoin(...idParts(name))
    : generateId(kind, doc);
}

export const HashVar = Object.freeze({
  /** @param {Location} loc */
  *split(loc) {
    const { hash = '' } = loc;
    for (const match of hash.matchAll(/(?:^#([^#;&]+)|[#;&]([^#;&]+))/g)) {
      const part = match[1] || match[2];
      if (!part) continue;
      yield part;
    }
  },

  /** @param {Location} loc */
  *parse(loc) {
    for (const part of HashVar.split(loc)) {
      const eqi = part.indexOf('=');
      if (eqi < 0) yield [part, ''];
      else yield [part.slice(0, eqi), part.slice(eqi + 1)]
    }
  },

  /**
   * @param {Location} loc
   * @param {Iterable<string>} parts
   */
  update(loc, parts) {
    const aParts = Array.from(parts);
    loc.hash = aParts.length ? `#${aParts.join('&')}` : '';
  },

  /**
   * @param {Location} loc
   * @param {string} name
   */
  *getAll(loc, name) {
    for (const [key, val] of HashVar.parse(loc))
      if (key === name) yield val;
  },

  /**
   * @param {Location} loc
   * @param {string} name
   */
  get(loc, name) {
    for (const [key, val] of HashVar.parse(loc))
      if (key === name) return val;
    return undefined;
  },

  /**
   * @param {Location} loc
   * @param {string} name
   * @param {string|undefined} value
   */
  set(loc, name, value) {
    HashVar.update(loc, function*() {
      const pre = `${name}=`;
      for (const part of HashVar.split(loc))
        if (part !== name && !part.startsWith(pre)) yield part;
      if (value !== undefined)
        yield `${pre}${value}`;
    }());
  },

  /**
   * @param {Location} loc
   * @param {string} name
   * @param {string|undefined} value
   */
  push(loc, name, value) {
    HashVar.update(loc, function*() {
      yield* HashVar.split(loc);
      yield `${name}=${value}`;
    }());
  },

  /**
   * @param {Location} loc
   * @param {string} name
   * @param {string|undefined} value
   */
  delete(loc, name, value) {
    HashVar.update(loc, function*() {
      const pre = `${name}=`;
      for (const part of HashVar.split(loc)) {
        if (part.startsWith(pre) && part.slice(pre.length) === value) continue;
        yield part;
      }
    }());
  },

  /**
   * @param {Location} loc
   * @param {string} name
   */
  deleteAll(loc, name) {
    HashVar.set(loc, name, undefined);
  },

});

/**
 * @param {HTMLElement} el
 * @param {string|Iterable<string>} genId
 * @returns {{id: string, added: boolean}} -- non-empty
 */
function ensureId(el, genId) {
  if (el.id) return { id: el.id, added: false };
  for (const id of typeof genId === 'string' ? generateMonotonicIds(genId) : genId)
    if (!el.ownerDocument.getElementById(id)) {
      el.id = id;
      return { id, added: true };
    }
  throw new Error('must generate element id');
}

/**
 * @param {Element} a
 * @param {ParentNode|((el: ParentNode) => boolean)} b
 */
const isDescendedFrom = (a, b) => {
  if (typeof b === 'function' && b(a)) return true;
  for (
    let par = a.parentNode;
    par;
    par = par?.parentNode
  ) if (typeof b === 'function' ? b(par) : par === b) return true;
  return false;
}

/**
 * @template T
 * @template {keyof T} K
 * @typedef {Required<Pick<T, K>> & Omit<T, K>} Nominate
 */

/** @typedef {object} CardData
 * @prop {string} [name]
 * @prop {string} [title]
 * @prop {string} [desc]
 * @prop {string} [face]
 * @prop {boolean} [isReversed]
 * @prop {DeckCard} [other] -- reversed/upright linkage
 */

/** @typedef {Nominate<CardData, "name">} CardDef */

/** @typedef {{id: string}} CardRef */

/** @typedef {CardRef & CardDef} DeckCard */

/** @param {any} raw @returns {raw is CardDef} */
const isCardDef = raw =>
  typeof raw === 'object' && raw !== null &&
  'name' in raw && typeof raw.name === 'string';

/** @param {any} raw @returns {raw is CardRef} */
const isCardRef = raw =>
  typeof raw === 'object' && raw !== null &&
  'id' in raw && typeof raw.id === 'string';

/** @param {any} raw @returns {raw is DeckCard} */
const isDeckCard = raw => isCardDef(raw) && isCardRef(raw);

/** @typedef {{orient?: Orient} & (CardRef | CardDef)} OrientedCard */

/** @param {string} str @returns {OrientedCard} */
const parseCard = str => {
  const match = /^(?:([^,]+)(?:,([^,]+)(?:,([^,]+))?)?)?#(.+)$/.exec(str);
  if (match) {
    const [_, zv = '', yv = '', xv = '', id = ''] = match;
    const z = zv ? parseFloat(zv) : 0;
    const y = yv ? parseFloat(yv) : 0;
    const x = xv ? parseFloat(xv) : 0;
    const ot = orient.packValues(z, y, x);
    return { id, orient: ot }
  }
  throw new Error('invalid card string');
};

/** @param {any} raw @returns {OrientedCard} */
const toCard = raw => {
  if (typeof raw === 'string') return parseCard(raw);
  if (!isCardDef(raw) && !isCardRef(raw))
    throw new Error('invalid card ref');
  if ('orient' in raw && raw['orient'] !== undefined && !orient.isInstance(raw['orient']))
    throw new Error('invalid card orientation');
  return raw;
}

/** @param {any} raw @returns {Array<OrientedCard>} */
const toCards = raw => {
  if (Array.isArray(raw)) return raw.map(toCard);
  return [toCard(raw)];
};

/** @param {string} dat */
const parseCards = dat => {
  if (!dat) return [];
  // try { return [toCard(dat)]; } catch { }
  return toCards(JSON.parse(dat));
}

/** @param {OrientedCard} card */
const smudgeCard = card => {
  if ('id' in card) {
    const { id, orient: ot } = card;
    const numKeys = Object.keys(card).length;
    if (!ot && numKeys <= 2) return `#${id}`;
    if (ot && numKeys === 2) return `${ot}#${id}`;
  }
  return card;
};

/** @param {string} str */
const upperCaseFirst = str => `${str.slice(0, 1).toUpperCase()}${str.slice(1)}`;

/** @param {string[]} parts */
const titleJoin = (...parts) => parts
  .map((part, i) => i == 0 ? part : upperCaseFirst(part))
  .join('');

/** @param {string} str */
const idParts = str =>
  str.replace(/\.([^.]+)$/, '')
    .replaceAll(/[^\w]+/g, '-')
    .replace(/^-/, '')
    .split(/-/g);

const cardDataKey = 'cards';
const stateDataKey = 'cardsUi';

/** @param {HTMLElement} el @param {string} key */
const getElData = (el, key) => {
  const dataKey = titleJoin(stateDataKey, key);
  return dataKey in el.dataset && el.dataset[dataKey] || '';
};

/** @type {[string, string, string]} */
const orientStyleVars = ['--card-z-flips', '--card-y-flips', '--card-x-flips'];

/**
 * @param {HTMLElement} el
 * @param {Array<string|OrientedCard>|null} cards
 */
const setElCards = (el, cards) => {
  if (!cards) {
    delete el.dataset[cardDataKey];
    return [];
  }

  el.dataset[cardDataKey] = JSON.stringify(
    cards.map(c => typeof c === 'string' ? c : smudgeCard(c)));
  return toCards(cards);
};

/** @param {HTMLElement} el */
const getElCards = el => {
  const data = el.dataset[cardDataKey];
  return data ? parseCards(data) : [];
};

/** @param {HTMLElement} el */
const hasElCards = el => {
  const data = el.dataset[cardDataKey];
  if (!data) return false;
  // try { toCard(data); return true; } catch { }
  const raw = JSON.parse(data);
  return Array.isArray(raw) ? !!raw.length : true;
};

/** @param {Event} ev */
const evContext = ev => {
  const { target } = ev;
  if (!(target instanceof Element)) return null;

  if (!isDescendedFrom(
    target,
    par => par instanceof HTMLElement && par.classList.contains('domain')))
    return null;

  if (!(target instanceof HTMLElement)) {
    for (
      let par = target.parentNode;
      par && par instanceof Element;
      par = par.parentNode
    ) if (par instanceof HTMLElement) return elState(par);
    return null;
  }

  return elState(target);
};

/** @param {HTMLElement} ref */
const elState = ref => {
  function* walk() {
    let el = ref;
    do {
      yield el;
      if (el.classList.contains('domain')) break;
      if (el === el.ownerDocument.body) return;
      const { parentNode } = el;
      if (!parentNode) break;
      if (!(parentNode instanceof HTMLElement)) return;
      el = parentNode;
    } while (el);
    // TODO keep going to root .domain?
  }

  const ctx = {
    get el() { return ref },
    set el(el) { ref = el },

    get domain() {
      let el = ref;
      for (el of walk()) { }
      return el;
    },

    close() {
      ctx.cleanup();
      for (const el of walk())
        for (const key of Object.keys(el.dataset))
          if (key.startsWith(stateDataKey))
            delete el.dataset[key];
    },

    /** @param {string} key */
    getData(key) {
      const dataKey = titleJoin(stateDataKey, key);
      for (const el of walk())
        if (dataKey in el.dataset)
          return el.dataset[dataKey] || '';
      return '';
    },

    /** @param {string} key @param {string} val */
    setData(key, val) {
      const dataKey = titleJoin(stateDataKey, key);
      if (val)
        ref.dataset[dataKey] = val;
      else if (Array.from(walk()).some(el => el !== ref && dataKey in el))
        ref.dataset[dataKey] = '';
      else
        delete ref.dataset[dataKey];
    },

    /** @param {string} key @param {string} val */
    setDomData(key, val) {
      const dataKey = titleJoin(stateDataKey, key);
      const dom = ctx.domain;
      if (val)
        dom.dataset[dataKey] = val;
      else
        delete dom.dataset[dataKey];
    },

    /** @param {HTMLElement} el @param {string} kind */
    track(el, kind = 'eventInvolved') {
      const [cls = kind] = el.classList;
      const { id, added } = ensureId(el, cls);
      if (added) ctx.appendDomData('tmpIds', id);
      return id;
    },

    /** @param {string} key @param {string} val */
    appendData(key, val) {
      if (val) {
        const dataKey = titleJoin(stateDataKey, key);
        const prior = ref.dataset[dataKey];
        const raw = prior ? JSON.parse(prior) : null;
        ref.dataset[dataKey] = JSON.stringify(Array.isArray(raw) ? [...raw, val] : [val]);
      }
    },

    /** @param {string} key @param {string} val */
    appendDomData(key, val) {
      if (val) {
        const dataKey = titleJoin(stateDataKey, key);
        const dom = ctx.domain;
        const prior = dom.dataset[dataKey];
        const raw = prior ? JSON.parse(prior) : null;
        dom.dataset[dataKey] = JSON.stringify(Array.isArray(raw) ? [...raw, val] : [val]);
      }
    },

    /** @param {string} key */
    *iterData(key) {
      const dataKey = titleJoin(stateDataKey, key);
      for (const el of walk()) {
        if (dataKey in el.dataset) {
          const val = el.dataset[dataKey];
          if (!val) continue;
          const raw = JSON.parse(val);
          if (Array.isArray(raw)) yield* raw;
          else yield raw;
        }
      }
    },

    cleanup() {
      const document = ctx.el.ownerDocument;
      const tmpIds = Array.from(ctx.iterData('tmpIds'));
      for (const id of tmpIds) {
        if (typeof id !== 'string') continue;
        const el = document.getElementById(id);
        if (!el) continue;
        for (const key of Object.keys(el.dataset))
          if (key.startsWith(stateDataKey))
            delete el.dataset[key];
        if (el.id === id)
          el.removeAttribute('id');
      }
    },

  };
  return ctx;
};

/** @typedef {ReturnType<typeof elState>} ElState */

/**
 * @param {object} opts
 * @param {string} opts.src
 * @param {Document} [opts.document]
 * @param {Element} [opts.container]
 * @param {Element} [opts.replace]
 */
async function fetchDeck({
  src,
  document = window.document,
  container = document.querySelector('.library') || document.body,
  replace,
}) {
  container.insertAdjacentHTML('beforeend', (() => {
    switch (container.tagName.toLowerCase()) {
      case 'menu':
      case 'ol':
      case 'ul':
        return '<li class="deck"></li>';
      case 'dl':
        return '<dt class="title"></dt><dd class="deck"></dd>';
      default:
        return '<div class="deck"></div>';
    }
  })());
  const titleEl = container.querySelector(`:scope > .title:last-of-type`);
  const deckEl = container.querySelector(`:scope > .deck:last-of-type`);
  if (titleEl && !(titleEl instanceof HTMLElement)) throw new Error('invalid .deck element');
  if (!(deckEl instanceof HTMLElement)) throw new Error('invalid .deck element');
  if (titleEl) {
    titleEl.innerText = `Loading... `;
    if (replace) titleEl.insertAdjacentElement('beforeend', replace);
  } else if (replace) {
    deckEl.insertAdjacentElement('beforeend', replace);
  } else {
    deckEl.innerText = src;
  }
  try {
    const res = await fetch(src);
    if (res.status !== 200)
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const deck = await processDeckBlob({
      blob: await res.blob(),
      src: res.url,
      deckEl,
    });
    hookupLibraryDeck({
      deck,
      src: res.url,
      deckEl,
      titleEl,
    });
    return deck;
  } catch (err) {
    deckEl.innerHTML = replace
      ? `${replace.outerHTML} -- ${err}`
      : `${err}`;
    throw err;
  }
}

/** @param {object} opts
 * @param {Blob} opts.blob
 * @param {string} opts.src
 * @param {HTMLElement} opts.deckEl
 */
async function processDeckBlob({
  blob,
  src,
  deckEl,
}) {

  const { ownerDocument: { defaultView } } = deckEl;
  const viewHost = defaultView?.location?.host;
  const srcURL = new URL(src);
  const srcParts = idParts(
    viewHost === srcURL.host
      ? srcURL.pathname
      : `${srcURL.host}${srcURL.pathname}`);

  const loadOpts = {
    fallbackTitle: srcParts.map(upperCaseFirst).join(' '),
    fallbackName: srcParts.join(' '),
  };

  switch (blob.type) {
    // TODO case 'application/zip':

    // TODO other svg media types?
    case 'image/svg+xml':
      deckEl.innerHTML = await blob.text();
      const el = deckEl.querySelector(`:scope > :first-child`);
      if (!el)
        throw new Error(`undefined root svg element`);

      if (!(el instanceof SVGSVGElement))
        throw new Error(`unexpected ${el.tagName} root element, expected svg`);
      const deck = deckFromElement(el, loadOpts);

      el.insertAdjacentHTML('beforebegin', `<!-- fetched from ${src} -->`);
      // TODO box art how
      el.setAttribute('width', '0');
      el.setAttribute('height', '0');

      return deck;

    default:
      throw new Error(`unsupported ${blob.type} content`);
  }
}

/** @param {object} opts
 * @param {Deck} opts.deck
 * @param {string} opts.src
 * @param {HTMLElement|null} [opts.titleEl]
 * @param {HTMLElement} opts.deckEl
 */
function hookupLibraryDeck({
  deck,
  src,
  deckEl,
  titleEl,
}) {
  const { ownerDocument: document } = deckEl;
  const { defaultView: window } = document;

  const { name, title = 'Untitled' } = deck;
  const deckId = makeId(name, 'deck', document);
  deckEl.id = deckId;

  const button = (() => {
    if (titleEl) {
      titleEl.innerHTML = '';
      if (titleEl instanceof HTMLButtonElement) return titleEl;
      else if (titleEl) {
        const but = document.createElement('button')
        titleEl.insertAdjacentElement('beforeend', but);
        return but;
      }
    }

    if (deckEl instanceof HTMLButtonElement) return deckEl;
    const but = document.createElement('button')
    deckEl.insertAdjacentElement('beforeend', but);
    return but;

  })();
  button.innerHTML = title;
  button.draggable = true;
  button.addEventListener('dragstart', ({ dataTransfer: dt }) => {
    if (!dt) return;
    dt.setData('text/plain', title);
    dt.setData('text/uri-list', src);
    const idel = deckEl.id
      ? deckEl
      : deckEl.querySelector(':scope > [id]');
    if (idel)
      dt.setData('application/query-selector', `#${idel.id}`);
  });

  const editor = makeDeckEditor({
    deckId,
    deck,
    parentNode: deckEl,
  });

  // TODO someday: button.command = 'open'; button.commandFor = editor.id;
  button.addEventListener('click', () => {
    if (window) HashVar.push(window.location, 'dialog', editor.id)
    editor.showModal();
  });
  if (window) {
    editor.addEventListener('close', () => {
      if (window) HashVar.delete(window.location, 'dialog', editor.id)
    });
    if (new Set(
      HashVar.getAll(window.location, 'dialog')
    ).has(editor.id)) editor.show();
  }
}

/** @param {Document} document */
function makeMetaDeck(document) {
  const init = async () => {
    const lib = document.querySelector('.library');
    await Promise.all(Array
      .from(lib
        ? lib.querySelectorAll(':scope > link, :scope > a')
        : document.querySelectorAll('link[rel="deck"], a[rel="deck"]'))
      .map(async link => {
        const href = link.getAttribute('href');
        if (!href) return;
        await fetchDeck({
          src: href,
          document,
          container: lib || document.body,
          replace: link,
        });
      })
    );
  }

  const loaded = init();

  const self = {
    loaded,

    get name() { return undefined }, // TODO something?
    get title() { return undefined }, // TODO something?
    get about() { return undefined }, // TODO something?

    *allDecks() {
      for (const el of document.querySelectorAll('.deck'))
        yield deckFromElement(el);
    },

    *allCards() {
      for (const deck of self.allDecks())
        yield* deck.allCards();
    },

    /** @param {string} id */
    getCardById(id) {
      for (const deck of self.allDecks()) {
        const card = deck.getCardById(id);
        if (card !== undefined) return card;
      }
      return undefined;
    },
  };

  return self;
}

/** @typedef {object} LoadDeckOptions
 * @prop {string} [fallbackTitle]
 * @prop {string} [fallbackName]
 */

/**
 * @param {Element} el
 * @param {LoadDeckOptions} [opts]
 */
function deckFromElement(el, opts) {
  const tagName = el.tagName.toLowerCase();
  let nom = tagName;
  if (el.id) nom = `${nom}#${el.id}`;

  switch (tagName) {

    case 'script':
      const lang = el.getAttribute('language');
      if (lang !== 'application/json')
        throw new Error(`unsupported card deck element: ${nom}[language=${lang}]`);
      const { textContent } = el;
      const data = JSON.parse(textContent || '');
      return deckFromData(data, opts);

    // TODO case 'html':

    case 'svg':
      if (!(el instanceof SVGSVGElement))
        throw new Error('invalid SVG root element instance');
      return deckFromSVG(el, opts);

    default:
      {
        const child = el.querySelector(`svg`);
        if (child) return deckFromSVG(child, opts);
      }

      {
        const child = el.querySelector(`script[type="application/json"]`);
        if (child) return deckFromElement(child, opts);
      }
  }
  throw new Error(`unsupported card deck element: ${tagName}`);
}

/** @typedef {object} Deck
 * @prop {string} [name]
 * @prop {string} [title]
 * @prop {string} [about]
 * @prop {(id: string) => DeckCard|undefined} getCardById
 * @prop {() => Iterable<DeckCard>} allCards
 */

/**
 * @param {SVGSVGElement} svg
 * @param {LoadDeckOptions} [opts]
 */
function deckFromSVG(svg, opts) {
  /** @param {SVGElement} el @returns {DeckCard} */
  const ref = el => {
    const { id } = el;

    const isReversed = !!el.dataset['upgrightId'];
    const otherId = el.dataset[isReversed ? 'upgrightId' : 'reversedId']

    const getOtherEl = () => {
      const other = otherId ? svg.getElementById(otherId) : undefined;
      return other instanceof SVGElement ? other : undefined;
    };

    return {
      get id() { return id },
      get isReversed() { return isReversed },
      get name() {
        const myName = el.dataset['cardName'];
        if (myName) return myName;
        const otherName = getOtherEl()?.dataset['cardName'];
        if (otherName) return otherName;
        return 'unknown';
      },

      get other() {
        const oel = getOtherEl();
        return oel ? ref(oel) : undefined;
      },

      get title() {
        return el.querySelector('title')?.textContent || '';
      },

      get desc() {
        return el.querySelector('desc')?.textContent || '';
      },

      get face() { return `#${id}` },

      // TODO additional data fields like suit/rank:
      //   data-card-suit="major"
      //   data-card-rank="0"

    };
  };

  return {
    get name() {
      return svg.dataset['deckName'] || opts?.fallbackName;
    },

    get title() {
      return svg.querySelector('title')?.textContent || opts?.fallbackTitle;
    },

    get about() {
      return svg.querySelector('metadata')?.innerHTML || undefined;
    },

    /** @param {string} id */
    getCardById(id) {
      const el = svg.getElementById(id);
      if (!(el instanceof SVGElement)) return undefined;
      return ref(el);
    },

    *allCards() {
      for (const el of svg.querySelectorAll('defs > svg[data-card-name]'))
        if (el instanceof SVGElement)
          yield ref(el);
    },
  };
}

/**
 * @param {any} data
 * @param {LoadDeckOptions} [opts]
 */
function deckFromData(data, opts) {
  /** @type {{[prop: string]: any}|null} */
  let doc = null;

  // TODO look for array of cards or { cards, ...deckInfo }
  if (typeof data === 'object' && data !== null && 'cards' in data)
    doc = data;

  const givenCards = doc ? doc['cards'] : data;

  const cards =
    Array.isArray(givenCards)
      ? givenCards.filter(card => isDeckCard(card))
      : Object.entries(data)
        .filter(/** @returns {ent is [string, CardDef]} */ ent => isCardDef(ent[1]))
        .map(/** @returns {DeckCard} */([id, def]) => Object.freeze({ ...def, id }));

  const cardById = new Map(cards.map(card => [card.id, card]));

  if (!cardById.size)
    throw new Error('invalid card deck spec: no card defs');

  return {
    get name() {
      // TODO some data field?
      return opts?.fallbackName;
    },

    get title() {
      // TODO some data field?
      return opts?.fallbackTitle;
    },

    get about() { return undefined }, // TODO something?

    /** @param {string} id */
    getCardById(id) { return cardById.get(id) },

    *allCards() { yield* cards },
  };
}

/** @typedef {{ [id: string]: CardDef}} Spec */

/** @param {Window|Document|HTMLElement} [arg] */
export default async function init(arg = window) {
  const ctl = makeController(arg);
  const { deck } = ctl;
  if ('loaded' in deck) await deck.loaded;
  return { deck };
}

/** @param {Window|Document|HTMLElement} [arg] */
export function deck(arg = window) {
  return makeMetaDeck(
    arg instanceof HTMLElement ? arg.ownerDocument
      : arg instanceof Window ? window.document
        : arg);
}

/**
 * @param {HTMLElement} el
 * @param {object} opts
 * @param {CardData} opts.def
 * @param {number} [opts.rotate]
 */
const renderFace = (el, opts) => {
  const { def: { face: src }, rotate } = opts;

  // TODO support for dataset / css vars

  if (!src) {
    console.warn('no face source');
    return;
  }

  if (!src.startsWith('#')) {
    console.warn('unsupported face source', src);
    return;
  }

  const srcEl = document.querySelector(src);
  if (!srcEl) {
    console.warn('face source not found', src);
    return;
  }

  if (srcEl instanceof SVGSVGElement) {
    const face = el.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'svg')
    const viewBox = srcEl.getAttribute('viewBox');
    if (viewBox) face.setAttribute('viewBox', viewBox);
    face.setAttribute('width', '100%');
    face.setAttribute('height', '100%');
    face.setAttribute('preserveAspectRatio', 'xMidYMid slice');

    const ref = el.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'use')
    ref.setAttribute('href', `#${srcEl.id}`);
    face.appendChild(ref);
    el.appendChild(face);

    if (rotate) {
      const {
        width: { baseVal: { value: width } },
        height: { baseVal: { value: height } },
      } = srcEl;
      ref.setAttribute('transform', `rotate(180, ${width / 2}, ${height / 2})`);
    }

    return;
  }

  console.warn('unsupported face source element', srcEl);
};

/**
 * @param {HTMLElement} el
 * @param {object} [opts]
 * @param {Array<string|OrientedCard>} [opts.cards]
 * @param {Deck} [opts.deck]
 */
function renderCard(el, {
  cards: givenCards,
  deck = makeMetaDeck(el.ownerDocument),
} = {}) {
  const cards = givenCards
    ? setElCards(el, givenCards)
    : getElCards(el);

  const top = cards[0] || null; // cards.length > 1 ? cards[0] : null;

  el.innerHTML = '';
  if (!top) {
    el.className = 'void';
    // TODO clear any facial dataset / css vars
  } else {
    el.className = cards.length > 1 ? 'stack' : 'card';
    const { orient: ot = 0, ...topCard } = top;
    if (orient.zInversions(ot) % 2 == 0) {
      el.classList.add('back');
    } else {
      el.classList.add('face');
      const def = 'id' in topCard ? deck?.getCardById(topCard.id) : topCard;
      if (def) renderCardFace(el, ot, def);
      else {
        const nom = 'id' in topCard ? `#${topCard.id}` : `[name=${topCard.name}]`;
        el.innerHTML = `undefined_card${nom}`;
      }
    }
  }

  el.style.setProperty('--stack-depth', `${cards.length}`);
}

/** @param {HTMLElement} el
 * @param {Orient} cardOt
 * @param {CardDef} def
 */
function renderCardFace(el, cardOt, def) {
  const elOt = orient.fromStyle(orientStyleVars, el.style);
  const ot = orient.add(elOt, cardOt);
  const isReversed = orient.yInversions(ot) % 2 == 1
  if (isReversed) {
    el.classList.add('reversed');
    const { other } = def;
    if (other) def = other;
  }
  const { isReversed: defReversed = false, other } = def;
  if (isReversed === defReversed && def.face) {
    renderFace(el, { def });
  } else if (other?.face) {
    renderFace(el, { def: other, rotate: 180 });
  } else {
    console.warn('unable to render card face', { el, card: { ...def }, isReversed });
  }
}

/**
 * @param {Window|Document|HTMLElement|Deck} arg
 * @param {Window|Document|HTMLElement} [container]
 */
function makeController(arg, container) {
  const deck = (
    arg instanceof Window ||
    arg instanceof Document ||
    arg instanceof HTMLElement
  ) ? makeMetaDeck(
    arg instanceof Window ? arg.document
      : arg instanceof Document ? document
        : arg.ownerDocument
  ) : arg;
  if (!container) container = (
    arg instanceof Window ||
    arg instanceof Document ||
    arg instanceof HTMLElement
  ) ? arg : window;
  if (container instanceof Window) container = container.document;
  if (container instanceof Document) container = container.body;

  // TODO save/restore state

  /** @type {Vec2} */
  const takeBands = [
    /* take 1 ... */
    0.2,
    /* ... take N ... */
    0.8,
    /* ... take all */
  ];

  // TODO better drag image positioning
  /** @type {Vec2} */
  const dragImageOffset = [5, 5];

  /** @param {ElState} ctx @param {MouseEvent} ev */
  const handleClick = (ctx, ev) => {
    const { el } = ctx;
    const { button, buttons } = ev;

    if (buttons) {
      console.log('in situ click', button);
      // TODO handle secondary clicks while other held
    } else if (button === 0) {
      const cards = getElCards(el);
      if (cards.length) {
        const [top, ...rest] = cards;
        if (!top) return;
        top.orient = orient.addValues(top.orient || 0, 0, 1);
        renderCard(el, { cards: [top, ...rest] });
      }
    } else if (button === 2) {
      orient.toStyle(orientStyleVars, el.style,
        orient.addValues(orient.fromStyle(orientStyleVars, el.style), 1));
      renderCard(el);
    }
  };

  /** @param {ElState} ctx */
  const handleDragTake = ctx => {
    const startId = ctx.getData('dragStartId');
    const startEl = startId ? ctx.el.ownerDocument.getElementById(startId) : null;
    if (!startEl) return;

    const startCards = startEl && getElCards(startEl);

    const at = vec2.fromString(getElData(startEl, 'moveAt'));

    // TODO degenerate single card case: the take is the start, just use it
    const takeEl = ctx.domain.appendChild(ctx.el.ownerDocument.createElement('div'));
    const takeI = scal.clamp(
      Math.round(scal.remap2(
        at[1],
        vec2.scale(startEl.offsetHeight, takeBands),
        0, startCards.length)
      ), 1, startCards.length);
    const takeCards = startCards.slice(0, takeI);
    const restCards = startCards.slice(takeI);
    const ot = orient.fromStyle(orientStyleVars, startEl.style);
    orient.toStyle(orientStyleVars, takeEl.style, ot);

    renderCard(startEl, { cards: restCards }); // TODO hide if empty? or does .void suffice?
    renderCard(takeEl, { cards: takeCards });

    // takeEl.style.position = 'absolute';
    ctx.setDomData('dragTakeId', ctx.track(takeEl));

    // TODO gesture to pull & flip? based on overlay action regions?
  };

  /** @param {ElState} ctx */
  const handleDragEnter = ctx => {
    const { el } = ctx;

    // TODO else?
    const dropId = ctx.getData('dragDropId');
    const dropEl = dropId ? el.ownerDocument.getElementById(dropId) : null;
    if (dropEl &&
      isDescendedFrom(el, dropEl) &&
      !dropEl.classList.contains('domain')) {
      return;
    }

    if (el.classList.contains('domain')) {
      ctx.setDomData('dragDropId', ctx.track(el));
      ctx.setDomData('dragDropAction', 'place');
      return;
    }

    if (hasElCards(el)) {
      ctx.setDomData('dragDropId', ctx.track(el));
      ctx.setDomData('dragDropAction', 'stack');
      // TODO show overlay
      return;
    }

    // TODO (domain) places
    // TODO (avatar) hands
  };

  /** @param {ElState} ctx */
  const handleDragOver = (ctx) => {
    const takeId = ctx.getData('dragTakeId');
    const takeEl = takeId ? ctx.el.ownerDocument.getElementById(takeId) : null;
    if (takeEl) {
      const at = vec2.fromString(ctx.getData('moveAtAbs'));
      subOffset(at, takeEl.offsetParent);
      vec2.toStyleTopLeft(vec2.add(at, dragImageOffset), takeEl.style);
    }

    const dropId = ctx.getData('dragDropId');
    const dropEl = dropId ? ctx.el.ownerDocument.getElementById(dropId) : null;
    const cards = dropEl && getElCards(dropEl);
    if (dropEl && cards?.length) {
      // TODO use overlay
      const overId = ctx.getData('dragOverId');
      const overEl = overId ? ctx.el.ownerDocument.getElementById(overId) : null;
      const at = vec2.fromString(ctx.getData('moveAt')); // TODO adjust over ... drop
      addOffset(at, overEl, dropEl);
      const stackI = scal.clamp(
        Math.round(scal.remap2(
          at[1],
          vec2.scale(dropEl.offsetHeight, takeBands),
          0, cards.length)
        ), 0, cards.length);
      ctx.setDomData('dragDropAction', `stack_${stackI}`);

      // TODO update overlay
      return;
    }

    // TODO update subtlety of to-hand action
  };

  /** @param {ElState} ctx */
  const handleDragLeave = ctx => {
    // TODO hide any overlay
    // const dropId = ctx.getData('dragDropId');
    // const dropEl = dropId ? ctx.el.ownerDocument.getElementById(dropId) : null;
    ctx.setDomData('dragDropId', '');
  };

  /** @param {ElState} ctx */
  const handleDragEnd = (ctx, cancel = false) => {
    const takeId = ctx.getData('dragTakeId');
    const startId = ctx.getData('dragStartId');
    const takeEl = takeId ? ctx.el.ownerDocument.getElementById(takeId) : null;
    const startEl = ctx.el.ownerDocument.getElementById(startId);

    const startCards = startEl ? getElCards(startEl) : [];

    const dropId = ctx.getData('dragDropId');
    const dropEl = dropId ? ctx.el.ownerDocument.getElementById(dropId) : null;
    const dropAction = ctx.getData('dragDropAction');
    if (!dropEl || !dropAction) cancel = true;

    if (cancel) {
      const takeCards = takeEl ? getElCards(takeEl) : [];
      if (startEl && takeCards.length)
        renderCard(startEl, { cards: startCards.concat(takeCards) });
      takeEl?.parentNode?.removeChild(takeEl);
      return;
    }

    if (!dropEl || !takeEl) return;

    if (dropAction.startsWith('stack')) {
      const match = /^stack(?:_(\d+))?$/.exec(dropAction);
      if (!match) {
        console.warn('invalid stack action', dropAction);
      } else {
        const takeOt = orient.fromStyle(orientStyleVars, takeEl.style);
        const stackI = parseInt(match[1] || '0');
        const dropCards = getElCards(dropEl);
        const elCards = getElCards(takeEl);
        if (elCards.length) {
          const takeCards = takeOt !== 0
            ? elCards.map(card => ({ ...card, orient: takeOt }))
            : elCards;
          const head = dropCards.slice(0, stackI);
          const tail = dropCards.slice(stackI);
          const newCards = head.concat(takeCards, tail);

          renderCard(dropEl, { cards: newCards });
          takeEl.parentNode?.removeChild(takeEl);
        }
      }
    } else if (dropAction === 'place') {
      // TODO any finalizing? into placeholder?
    } else {
      console.warn('unknown drop action', dropAction);
    }

    if (startEl && !startCards.length)
      startEl.parentNode?.removeChild(startEl);

  };

  container.addEventListener('mousedown', ev => {
    const ctx = evContext(ev);
    if (!ctx) return;
    ev.preventDefault();
    ev.stopPropagation();

    const { button, buttons, offsetX, offsetY } = ev;
    if (!ctx.getData('state')) {
      ctx.setData('state', 'mousedown');
      ctx.setData('downButton', `${button}`);
      ctx.setData('downAt', `${offsetX},${offsetY}`);
    }
    ctx.setData('buttons', `${buttons}`);
    // TODO present action feedback based on cards and hand ; hand choice from button
    // const cards = getElCards(ctx.el);
  });

  // TODO other ways to cancel a drag? <Esc> key? loose focus?
  container.addEventListener('mouseup', ev => {
    const ctx = evContext(ev);
    if (!ctx) return;
    ev.preventDefault();
    ev.stopPropagation();

    const st = ctx.getData('state');
    if (st.startsWith('mouse')) {
      const { button, buttons } = ev;
      if (buttons) {
        ctx.setData('buttons', `${buttons}`);
        handleClick(ctx, ev);
      } else {
        if (st === 'mousedown') {
          handleClick(ctx, ev);
        } else if (st === 'mousedrag') {
          handleDragEnd(ctx);
        } else {
          console.log('fin ???', st, button);
        }
        ctx.close();
      }
    }
  });

  container.addEventListener('mousemove', ev => {
    const ctx = evContext(ev);
    if (!ctx) return;
    ev.preventDefault();
    ev.stopPropagation();

    // TODO hover/dwell tracking

    const st = ctx.getData('state');
    if (!st.startsWith('mouse')) return;

    // TODO take scroll offset of target into account
    const { offsetX, offsetY, pageX, pageY } = ev;
    ctx.setData('moveAt', `${offsetX},${offsetY}`);
    ctx.setData('moveAtAbs', `${pageX},${pageY}`);

    const buttons = ctx.getData('buttons');

    if (st === 'mousedown' && `${ev.buttons}` === buttons) {
      const { el } = ctx;
      if (!hasElCards(el)) return;
      const id = ctx.track(ctx.el);
      ctx.setData('state', '');
      ctx.setData('buttons', '');
      ctx.setDomData('state', 'mousedrag');
      ctx.setDomData('dragStartId', id);
      ctx.setDomData('dragOverId', id);
      ctx.setDomData('buttons', `${ev.buttons}`);
      return;
    }

    if (st === 'mousedrag') {
      if (!ev.buttons) {
        handleDragEnd(ctx, true);
        ctx.close();
        return;
      }

      const takeId = ctx.getData('dragTakeId');
      if (takeId && takeId === ctx.el.id) {
        const { el: { parentNode: par } } = ctx;
        if (!(par instanceof HTMLElement)) return;
        ctx.el = par;
      }

      const overId = ctx.getData('dragOverId');
      const overEl = overId ? ctx.el.ownerDocument.getElementById(overId) : null;
      if (overEl !== ctx.el) {
        const startId = ctx.getData('dragStartId');
        if (!takeId && overId == startId) {
          handleDragTake(ctx);
        } else {
          const dropId = ctx.getData('dragDropId');
          const dropEl = dropId ? ctx.el.ownerDocument.getElementById(dropId) : null;
          if (dropEl && !isDescendedFrom(ctx.el, dropEl)) {
            handleDragLeave(ctx);
          }

        }
        ctx.setDomData('dragOverId', ctx.track(ctx.el));
        handleDragEnter(ctx);
      }

      // TODO throttle?
      handleDragOver(ctx);
    }
  });

  container.addEventListener('contextmenu', ev => {
    const ctx = evContext(ev);
    if (!ctx) return;
    ev.preventDefault()
    ev.stopPropagation();
    // TODO show something?
  });

  container.addEventListener('dragenter', ev => {
    const { target, dataTransfer: dt } = ev;
    if (!dt) return;
    if (!(target instanceof HTMLElement)) return;
    if (!target.classList.contains('domain')) return;
    target.classList.add('dragover');
    ev.preventDefault();
  });

  container.addEventListener('dragleave', ev => {
    const { target } = ev;
    if (!(target instanceof HTMLElement)) return;
    if (!target.classList.contains('domain')) return;
    target.classList.remove('dragover');
    target.classList.remove('mayDrop');
    const dummy = target.querySelector('.dragDummy');
    if (dummy) dummy.parentNode?.removeChild(dummy);
  });

  container.addEventListener('dragover', ev => {
    const { target, dataTransfer: dt, offsetX, offsetY } = ev;
    if (!dt) return;
    if (!(target instanceof HTMLElement)) return;
    if (!target.classList.contains('domain')) return;
    const may = (() => {
      const sel = dt.getData('application/query-selector');
      if (sel) {
        const deckEl = target.ownerDocument.querySelector(sel);
        if (!deckEl) return false;

        const dummy = (() => {
          let el = target.querySelector('.dragDummy');
          if (!(el instanceof HTMLElement)) {
            target.insertAdjacentHTML('beforeend', `<div class="card dragDummy"></div>`);
            el = target.querySelector('.dragDummy');
            if (!(el instanceof HTMLElement))
              throw new Error('unable to find created dummy card');
          }
          return el;
        })();
        renderCard(dummy, { deck, cards: [{ name: 'dummy' }] })
        dummy.classList.add('dragDummy');

        dummy.style.position = 'absolute';
        dummy.style.top = `${offsetY + 5}px`;
        dummy.style.left = `${offsetX + 5}px`;

        return true;
      }

      // TODO accept raw file drops to import new cards and decks

      return false;
    })();

    if (may) {
      target.classList.add('mayDrop');
      ev.preventDefault();
    } else {
      target.classList.remove('mayDrop');
    }
  });

  container.addEventListener('drop', ev => {
    const { target } = ev;

    if (!(target instanceof HTMLElement)) return;
    target.classList.remove('dragover');
    target.classList.remove('mayDrop');

    let dummy = target.querySelector('.dragDummy');
    try {
      const { dataTransfer: dt } = ev;
      if (!dt) throw new Error('no dataTransfer');

      const sel = dt.getData('application/query-selector');
      const deckEl = sel && target.ownerDocument.querySelector(sel);
      if (!deckEl) throw new Error('no dropped deck');

      const deck = deckFromElement(deckEl);
      const cards = Array.from(deck.allCards()).map(({ id }) => ({ id }));
      if (!(dummy instanceof HTMLElement)) {
        target.insertAdjacentHTML('beforeend', `<div class="card dragDummy"></div>`);
        dummy = target.querySelector('.dragDummy');
        if (!(dummy instanceof HTMLElement)) throw new Error('unable to create card element');
        dummy.style.position = 'absolute';
        dummy.style.top = `${ev.offsetY + 5}px`;
        dummy.style.left = `${ev.offsetX + 5}px`;
      }

      renderCard(dummy, { cards });

    } catch (err) {
      console.error(err);
      dummy?.parentNode?.removeChild(dummy);
    }
  });

  // TODO touch event handling

  return Object.freeze({
    get deck() { return deck },
  });
}

/**
 * @param {object} opts
 * @param {Deck} opts.deck
 * @param {string} opts.deckId
 * @param {Document} [opts.document]
 * @param {HTMLElement} [opts.parentNode]
 */
function makeDeckEditor(opts) {
  const {
    deck,
    deckId,
  } = opts;
  const { parentNode = (opts.document || window.document).body } = opts;
  const { document = parentNode.ownerDocument } = opts;

  parentNode.insertAdjacentHTML('beforeend',
    `<dialog id="deck-editor-${deckId}">` +
    `<form method="dialog">` +
    `<div class="cardBook">` +
    `<header>` +
    `<button value="close" onclick="({target}) => console.log(target)" style="float: right">X</button>` +

    (() => {
      const { title, about } = deck;
      const head = `<h1>${title || '-- Untitled --'}</h1>`;
      return about
        ? `<details><summary>${head}</summary>${about}</details>`
        : head;
    })() +

    `</header><nav><menu>` +
    `</menu></nav><main>` +
    `</main></div></form></dialog>`);

  // TODO editing

  const diag = parentNode.querySelector(':scope > dialog:last-child');
  if (!(diag instanceof HTMLDialogElement))
    throw new Error('unable to find new dialog');

  const viewer = diag.querySelector('main');
  if (!viewer) throw new Error('missing dialog main element');

  /**
   * @param {HTMLElement} explain
   * @param {DeckCard} card
   */
  const renderExplain = (explain, card) => {
    const { desc: ex } = card;
    if (!ex) return;

    if (!ex.startsWith('#')) {
      explain.innerHTML = ex;
      return;
    }

    const el = document.querySelector(ex);
    if (!el) {
      explain.innerText = `-- no element for query ${ex} --`;
      return;
    }

    if (el instanceof HTMLElement) {
      explain.innerHTML = el.innerHTML;
      return;
    }

    // TODO more specific element grafting logic
    if (el instanceof Element) {
      explain.innerText = el.textContent || '';
      return;
    }
  };

  {
    const el = diag.querySelector('menu');
    if (el && el instanceof HTMLElement)
      for (const { id, name } of deck.allCards())
        el.insertAdjacentHTML('beforeend', `<li><a href="#${deckId}-${id}">${name}</a></li>`);
  }

  diag.querySelector('menu')?.addEventListener('click', ev => {
    const { target } = ev;
    if (!(target instanceof HTMLAnchorElement)) return;
    if (window.location.href.replace(/#.*$/, '') !== target.href.replace(/#.*$/, '')) return;
    const hashId = target.hash.slice(1);
    const buddy = hashId ? viewer.querySelector(`a[name=${hashId}]`) : null;
    if (!buddy) return;
    buddy.scrollIntoView({ block: 'start', behavior: 'smooth' });
    ev.preventDefault();
  });

  for (const card of deck.allCards()) {
    const { id, name } = card;

    // TODO provide page anchor
    viewer.insertAdjacentHTML('beforeend', `
      <fieldset class="page"><legend><a name="${deckId}-${id}">${name}</a></legend>
        <div class="card" data-orient="0,1"></div>
        <div class="card" data-orient="1,1"></div>
        <br style="clear: both" />
        <p class="explain" style="white-space: pre-line"></p>
      </fieldset>`);

    for (const el of viewer.querySelectorAll(':scope > :last-child .card')) {
      if (!(el instanceof HTMLElement)) continue;
      const ot = orient.fromString(el.dataset['orient'] || '');
      renderCard(el, {
        cards: [{ id, orient: ot }],
        deck,
      });
    }

    const explain = viewer.querySelector(':scope > :last-child .explain');
    if (explain instanceof HTMLElement)
      renderExplain(explain, card);
  }

  const updateScroll = () => {
    const { scrollTop, clientHeight } = viewer;
    const scrollBottom = scrollTop + clientHeight;
    const pages = Array
      .from(viewer.querySelectorAll(':scope > .page'))
      .filter(el => el instanceof HTMLElement)
      .filter(({ offsetTop }) => offsetTop < scrollBottom);
    const page =
      pages.filter(({ offsetTop }) => offsetTop >= scrollTop)[0] ||
      pages[pages.length - 1];
    const linkName = page?.querySelector('a[name]')?.getAttribute('name');
    const link = linkName ? diag.querySelector(`nav a[href="#${linkName}"]`) : null;
    const priors = Array
      .from(diag.querySelectorAll('nav a.current, .page.current'))
      .filter(prior => prior instanceof HTMLElement);
    if ((page && !page.classList.contains('current')) ||
      (link && !link.classList.contains('current'))) {

      const loc = document.defaultView?.location;
      if (loc && linkName) HashVar.set(loc, diag.id, linkName);

      link?.classList.add('current')
      page?.classList.add('current');
      for (const prior of priors)
        prior.classList.remove('current');
    }
    link?.scrollIntoView({
      behavior: 'instant',
      block: 'nearest'
    });
  };

  viewer.addEventListener('scroll', () => updateScroll());
  viewer.addEventListener('scrollend', () => updateScroll());
  if (!(() => {
    const loc = document.defaultView?.location;
    if (loc) {
      const { id } = diag;
      diag.addEventListener('close', () => HashVar.deleteAll(loc, id));
      const linkName = HashVar.get(loc, id);
      const buddy = linkName && viewer.querySelector(`a[name=${linkName}]`);
      if (buddy) {
        setTimeout(() => buddy.scrollIntoView({ block: 'start', behavior: 'smooth' }), 0);
        return true;
      }
    }
    return false;
  })()) setTimeout(() => updateScroll(), 0);

  return diag;
}
