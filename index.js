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
 * @param {HTMLElement} a
 * @param {HTMLElement} b
 */
const isDescendedFrom = (a, b) => {
  for (
    let par = a.parentNode;
    par;
    par = par?.parentNode
  ) if (par === b) return true;
  return false;
}

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

/** @param {any} raw @returns {raw is CardRef} */
const isCardRef = raw =>
  typeof raw === 'object' && raw !== null &&
  'id' in raw && typeof raw.id === 'string';

/** @typedef {object} CardRef
 * @property {string} id
 */

/** @typedef {(CardRef|CardDef) & ParticularCard} Card */

// τurn and fliπ
/** @typedef {object} ParticularCard
 * @property {Orient} [orient] -- default to 0, aka face down
 */

/** @param {any} raw @returns {Card} */
const toCard = raw => {
  if (typeof raw === 'string') {
    const match = /^(?:([^,]+)(?:,([^,]+)(?:,([^,]+))?)?)?#(.+)$/.exec(raw)
    if (match) {
      const [_, zv = '', yv = '', xv = '', id = ''] = match;
      const z = zv ? parseFloat(zv) : 0;
      const y = yv ? parseFloat(yv) : 0;
      const x = xv ? parseFloat(xv) : 0;
      const ot = orient.packValues(z, y, x);
      return { id, orient: ot }
    }
    throw new Error('invalid card string');
  }
  if (!isCardDef(raw) && !isCardRef(raw))
    throw new Error('invalid card ref');
  if ('orient' in raw && raw['orient'] !== undefined && !orient.isInstance(raw['orient']))
    throw new Error('invalid card orientation');
  return raw;
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
    const { id, orient: ot } = card;
    const numKeys = Object.keys(card).length;
    if (!ot && numKeys <= 2) return `#${id}`;
    if (ot && numKeys === 2) return `${ot}#${id}`;
    console.log('nop', card, numKeys, ot)
  }
  return card;
};

const cardDataKey = 'cards';
const stateDataKey = 'cardsUi';

/** @param {HTMLElement} el @param {string} key */
const getElData = (el, key) => {
  const dataKey = `${stateDataKey}${key.slice(0, 1).toUpperCase()}${key.slice(1)}`;
  return dataKey in el.dataset && el.dataset[dataKey] || '';
};

/** @type {[string, string, string]} */
const orientStyleVars = ['--card-z-flips', '--card-y-flips', '--card-x-flips'];

/**
 * @param {HTMLElement} el
 * @param {Array<string|Card>|null} cards
 */
const setElCards = (el, cards) => {
  if (!cards) delete el.dataset[cardDataKey];
  else el.dataset[cardDataKey] = JSON.stringify(
    cards.map(c => typeof c === 'string' ? c : smudgeCard(c)));
};

/** @param {HTMLElement} el */
const getElCards = el => {
  const data = el.dataset[cardDataKey];
  return data ? parseCards(data) : null;
};

/** @param {HTMLElement} el */
const hasElCards = el => {
  const data = el.dataset[cardDataKey];
  if (!data) return false;
  const raw = JSON.parse(data);
  return Array.isArray(raw) ? !!raw.length : true;
};

/** @param {Event} ev */
const evContext = ev => {
  const { target } = ev;
  if (!(target instanceof HTMLElement)) {
    if (target instanceof Element) {
      for (
        let par = target.parentNode;
        par && par instanceof Element;
        par = par.parentNode
      ) if (par instanceof HTMLElement) return elState(par);
    }
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
      const dataKey = `${stateDataKey}${key.slice(0, 1).toUpperCase()}${key.slice(1)}`;
      for (const el of walk())
        if (dataKey in el.dataset)
          return el.dataset[dataKey] || '';
      return '';
    },

    /** @param {string} key @param {string} val */
    setData(key, val) {
      const dataKey = `${stateDataKey}${key.slice(0, 1).toUpperCase()}${key.slice(1)}`;
      if (val)
        ref.dataset[dataKey] = val;
      else if (Array.from(walk()).some(el => el !== ref && dataKey in el))
        ref.dataset[dataKey] = '';
      else
        delete ref.dataset[dataKey];
    },

    /** @param {string} key @param {string} val */
    setDomData(key, val) {
      const dataKey = `${stateDataKey}${key.slice(0, 1).toUpperCase()}${key.slice(1)}`;
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
      const dataKey = `${stateDataKey}${key.slice(0, 1).toUpperCase()}${key.slice(1)}`;
      if (val) {
        const prior = ref.dataset[dataKey];
        const raw = prior ? JSON.parse(prior) : null;
        ref.dataset[dataKey] = JSON.stringify(Array.isArray(raw) ? [...raw, val] : [val]);
      }
    },

    /** @param {string} key @param {string} val */
    appendDomData(key, val) {
      const dataKey = `${stateDataKey}${key.slice(0, 1).toUpperCase()}${key.slice(1)}`;
      if (val) {
        const dom = ctx.domain;
        const prior = dom.dataset[dataKey];
        const raw = prior ? JSON.parse(prior) : null;
        dom.dataset[dataKey] = JSON.stringify(Array.isArray(raw) ? [...raw, val] : [val]);
      }
    },

    /** @param {string} key */
    *iterData(key) {
      const dataKey = `${stateDataKey}${key.slice(0, 1).toUpperCase()}${key.slice(1)}`;
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
    world.render(el, world.allCardIds());
  }));
}

/** @typedef {object} FaceRenderOpts
 * @prop {string} src
 * @prop {number} [rotate]
 */
/** @param {HTMLElement} el
 * @param {string | FaceRenderOpts} srcOrOpts
 */
const renderFace = (el, srcOrOpts) => {
  const {
    src,
    rotate
  } = typeof srcOrOpts === 'string' ? { src: srcOrOpts } : srcOrOpts;

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
    face.setAttribute('width', `${el.clientWidth}`);
    face.setAttribute('height', `${el.clientHeight}`);
    face.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    const ref = el.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'use')
    ref.setAttribute('href', `#${srcEl.id}`);
    face.appendChild(ref);
    el.appendChild(face);

    if (rotate)
      console.warn('manual card reversal not implemented');

    return;
  }

  console.warn('unsupported face source element', srcEl);
};

/** @param {HTMLElement} el
 * @param {Card} card
 */
const renderCardFace = (el, card) => {
  const elOt = orient.fromStyle(orientStyleVars, el.style);
  const { orient: cardOt = 0 } = card;
  const ot = orient.add(elOt, cardOt);

  const isReversed = orient.yInversions(ot) % 2 == 1
  if ('id' in card) el.classList.add(card.id);
  if (isReversed) el.classList.add('reversed');

  if (isReversed) {
    if ('reversed' in card) {
      renderFace(el, card['reversed']);
      return;
    } if ('upright' in card) {
      renderFace(el, { src: card['upright'], rotate: 180 });
      return;
    }
  }
  if ('upright' in card) {
    renderFace(el, card['upright']);
    return;
  }
  console.warn('no face defined for', top, card);
};

/**
 * @param {Spec} spec
 */
function makeWorld(spec) {
  // TODO freeze a copy of spec?
  // TODO save/restore state

  const renderProps = new Set(['upright', 'reversed']);

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

    el.innerHTML = '';
    if (!top) {
      el.className = 'void';
    } else {
      el.className = cards.length > 1 ? 'stack' : 'card';
      const oldDataKeys = new Set(Object.keys(el.dataset).filter(name => /^card[A-Z]/.test(name)));
      const { orient: ot = 0 } = top;
      if (orient.zInversions(ot) % 2 == 0) {
        el.classList.add('back');
      } else {
        el.classList.add('face');
        const def = 'id' in top && { ...spec[top.id], ...top };
        if (def) {
          for (const [prop, val] of Object.entries(def)) {
            if (!renderProps.has(prop)) {
              const dataKey = `card${prop.slice(0, 1).toUpperCase()}${prop.slice(1)}`
              el.dataset[dataKey] = val;
              oldDataKeys.delete(dataKey);
              const key = `--card-${prop}`;
              st.setProperty(key, val);
              updatedVars.add(key);
            }
          }
          renderCardFace(el, def);
        }
      }
      for (const v of orientStyleVars)
        updatedVars.add(v);
      for (const dataKey of oldDataKeys)
        delete el.dataset[dataKey];
    }

    for (const key of Array.from(st))
      if (key.startsWith('--card-') && !updatedVars.has(key))
        st.removeProperty(key);

    st.setProperty('--stack-depth', `${cards.length}`);
  };

  /** @type {Vec2} */
  const takeBands = [
    /* take 1 ... */
    0.15,
    /* ... take N ... */
    0.85,
    /* ... take all */
  ];

  const world = {
    get spec() {
      return spec
    },

    allCardIds() {
      return Array.from(Object.keys(spec).map(id => `#${id}`));
    },

    render,

    /** @param {HTMLElement} container */
    makeController(container) {
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
          if (cards && cards.length) {
            const [top, ...rest] = cards;
            if (!top) return;
            top.orient = orient.addValues(top.orient || 0, 0, 1);
            world.render(el, [top, ...rest]);
          }
        } else if (button === 2) {
          orient.toStyle(orientStyleVars, el.style,
            orient.addValues(orient.fromStyle(orientStyleVars, el.style), 1));
          world.render(el);
        }
      };

      /** @param {ElState} ctx */
      const handleDragTake = ctx => {
        const startId = ctx.getData('dragStartId');
        const startEl = startId ? ctx.el.ownerDocument.getElementById(startId) : null;
        if (!startEl) return;

        const startCards = startEl && getElCards(startEl) || [];

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

        world.render(startEl, restCards); // TODO hide if empty? or does .void suffice?
        world.render(takeEl, takeCards);

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
        const cards = dropEl && getElCards(dropEl) || [];
        if (dropEl && cards.length) {
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

        const startCards = startEl && getElCards(startEl) || [];

        const dropId = ctx.getData('dragDropId');
        const dropEl = dropId ? ctx.el.ownerDocument.getElementById(dropId) : null;
        const dropAction = ctx.getData('dragDropAction');
        if (!dropEl || !dropAction) cancel = true;

        if (cancel) {
          const takeCards = takeEl && getElCards(takeEl);
          if (startEl && takeCards)
            world.render(startEl, startCards.concat(takeCards));
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
            const dropCards = getElCards(dropEl) || [];
            const elCards = getElCards(takeEl);
            if (elCards) {
              const takeCards = takeOt !== 0
                ? elCards.map(card => ({ ...card, orient: takeOt }))
                : elCards;
              const head = dropCards.slice(0, stackI);
              const tail = dropCards.slice(stackI);
              const newCards = head.concat(takeCards, tail);

              world.render(dropEl, newCards);
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

        // TODO hover/dwell tracking

        const st = ctx.getData('state');
        if (!st.startsWith('mouse')) return;

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

      container.addEventListener('contextmenu', ev => ev.preventDefault());

      // TODO touch event handling

    },
  };

  return world;
}
