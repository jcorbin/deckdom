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
    const z = parseFloat(style.getPropertyValue(zVar));
    const y = parseFloat(style.getPropertyValue(yVar));
    const x = parseFloat(style.getPropertyValue(xVar));
    if (x !== 0 && !isNaN(x)) return [z, y, x];
    if (y !== 0 && !isNaN(y)) return [z, y];
    return z;
  },

  // TODO convert to quaternion

});

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

// τurn and fliπ
/** @typedef {object} ParticularCard
 * @property {Orient} [orient] -- default to 0, aka face down
 */

/** @param {any} raw @returns {Card} */
const toCard = raw => {
  const card = isCardDef(raw) ? raw : toCardRef(raw);
  if ('orient' in card && card['orient'] !== undefined && !orient.isInstance(card['orient']))
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
    if (keys.length === 1 && keys[0] === 'id') return `#${card.id}`;
  }
  return card;
};

const dragDataType = 'application/x-webdeck+json';
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

/** @param {Event} ev */
const evContext = ev => {
  const { target } = ev;
  if (!(target instanceof HTMLElement)) return null;
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

    // TODO set el(el: HTMLElement)

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
        delete ref.dataset[dataKey];
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

/** @param {Event} ev */
const getEvCards = ev => {
  const { target } = ev;

  const el = target instanceof HTMLElement ? target : null;

  // TODO dataset[dragDataKey] instead of DragEvent
  const dt = ev instanceof DragEvent ? ev.dataTransfer : null;

  /** @type {{[prop: string]: any} | null | undefined } */
  let _dragData = undefined;

  /** @param {{[prop: string]: any}} data */
  const updateDragData = data => {
    const { dragData } = cev;
    const newData = { ...dragData, ...data };
    // FIXME rip cannot update data
    dt?.setData(dragDataType, JSON.stringify(newData));
    _dragData = newData;
  };

  const cev = {
    el,
    dt,

    // TODO get dragEl()

    get elCards() {
      return el && getElCards(el) || [];
    },

    get dragData() {
      if (_dragData === undefined) _dragData = (() => {
        const rawData = dt?.getData(dragDataType);
        if (!rawData) return null;

        const data = JSON.parse(rawData);
        if (typeof data !== 'object' || !data) return null;

        return /** @type {{[prop: string]: any}} */ (data);
      })();
      return _dragData;
    },

    /** @returns {Card[]} */
    get cards() {
      const { dragData } = cev;
      return dragData ? toCards(dragData['cards']) : [];
    },

    /** @returns {HTMLElement|null} */
    get startEl() {
      const { dragData } = cev;
      if (!dragData) return null;
      const document = el?.ownerDocument;
      if (!document) return null;
      const startElId = dragData['startElId'];
      if (typeof startElId !== 'string') return null;
      return document.getElementById(startElId);
    },

    /** @returns {HTMLElement|null} */
    get overEl() {
      const { dragData } = cev;
      if (!dragData) return null;
      const document = el?.ownerDocument;
      if (!document) return null;
      const overElId = dragData['overElId'];
      if (typeof overElId !== 'string') return null;
      return document.getElementById(overElId);
    },

    set overEl(el) {
      if (!el) {
        updateDragData({ overElId: null });
        return;
      }
      const { id: overElId, added: overElIdOwn } = ensureId(el, 'cardDragOver');
      if (overElIdOwn) {
        const tmpIds = [...cev.tmpIds, overElId];
        updateDragData({ overElId, tmpIds });
      } else {
        updateDragData({ overElId });
      }
    },

    /** @returns {Array<string>} */
    get tmpIds() {
      const { dragData } = cev;
      const raw = dragData && dragData['tmpIds'];
      return Array.isArray(raw)
        ? raw.filter(x => typeof x === 'string')
        : [];
    },

    cleanup() {
      const document = el?.ownerDocument;
      if (document) {
        for (const tmpId of cev.tmpIds) {
          const tmpEl = document.getElementById(tmpId);
          if (tmpEl?.id === tmpId)
            tmpEl.removeAttribute('id');
        }
      }
    },
  };
  return cev;
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
    world.render(el, world.allCardIds());
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

      const { orient: ot = 0 } = top;
      if (orient.zInversions(ot) % 2 == 0) {
        el.classList.add('back');
      } else {
        el.classList.add('face');
        if ('id' in top) el.classList.add(top.id);
        // const card = 'id' in top ? spec[top.id] : top;
        // if (card) TODO actually render face
      }
      if (orient.xInversions(ot) % 2 == 1) el.classList.add('reversed');
      orient.toStyle(orientStyleVars, el.style, ot);
      for (const v of orientStyleVars)
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
  };

  /** @type {Vec2} */
  const takeBands = [
    /* take 1 ... */
    0.2,
    /* ... take N ... */
    0.8,
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
        if (ev.buttons) {
          console.log('in situ click', ev.button);
          // TODO handle secondary clicks while other held
        } else {
          console.log('fin click', ev.button);
        }
      };

      /** @param {ElState} ctx */
      const handleDragTake = ctx => {
        const startId = ctx.getData('dragStartId');
        const startEl = startId ? ctx.el.ownerDocument.getElementById(startId) : null;
        if (!startEl) return;

        const startCards = startEl && getElCards(startEl) || [];

        const [_offsetX, offsetY] = vec2.fromString(getElData(startEl, 'moveAt'));

        const takeEl = ctx.domain.appendChild(ctx.el.ownerDocument.createElement('div'));
        const takeI = scal.clamp(
          Math.round(scal.remap2(
            offsetY,
            vec2.scale(startEl.offsetHeight, takeBands),
            0, startCards.length)
          ), 1, startCards.length);
        const takeCards = startCards.slice(0, takeI);
        const restCards = startCards.slice(takeI);
        world.render(startEl, restCards); // TODO hide if empty? or does .void suffice?
        world.render(takeEl, takeCards);
        orient.toStyle(orientStyleVars, takeEl.style,
          orient.fromStyle(orientStyleVars, startEl.style));
        ctx.setDomData('dragTakeId', ctx.track(takeEl));

        // TODO gesture to pull & flip? based on overlay action regions?
      };

      /** @param {ElState} ctx */
      const handleDragEnter = ctx => {
        const id = ctx.track(ctx.el);
        // const overId = ctx.getData('dragOverId');
        // const takeId = ctx.getData('dragTakeId');
        // const startId = ctx.getData('dragStartId');

        console.log('dragenter', id);
        // TODO show overlay
        // TODO update effect indicator
        // if (el === cev.startEl) {
        //   // TODO present overlay ; TODO differ when re-enter as if other stack?
        //   // TODO re-enter self should interact as if foreign stack? e.g. present actions like (stack under, ... cut into ..., stack over)
        //   ev.preventDefault();
        //   dt.dropEffect = 'none';
        //   console.log('dragging over self');
        //   cev.overEl = el;
        //   return;
        // }

      };

      /** @param {ElState} ctx */
      const handleDragOver = ctx => {

        const takeId = ctx.getData('dragTakeId');
        const takeEl = takeId ? ctx.el.ownerDocument.getElementById(takeId) : null;
        if (takeEl) {
          const at = vec2.fromString(ctx.getData('moveAt'));
          // TODO add offset to domain from ctx.el
          vec2.toStyleTopLeft(vec2.add(at, dragImageOffset), takeEl.style);
        }

        // TODO update overlay
        // TODO update effect indicator based on overlay
      };

      /** @param {ElState} ctx */
      const handleDragLeave = ctx => {
        const overId = ctx.getData('dragOverId');
        const overEl = overId ? ctx.el.ownerDocument.getElementById(overId) : null;
        console.log('dragleave', overEl);
        // TODO hide any overlay
      };

      /** @param {ElState} ctx */
      const handleDragEnd = (ctx, cancel = false) => {
        const takeId = ctx.getData('dragTakeId');
        const startId = ctx.getData('dragStartId');
        const takeEl = takeId ? ctx.el.ownerDocument.getElementById(takeId) : null;
        const startEl = ctx.el.ownerDocument.getElementById(startId);

        const startCards = startEl && getElCards(startEl) || [];
        const takeCards = takeEl && getElCards(takeEl) || [];
        // TODO cancel ||= dropEffect === 'none'

        if (cancel) {

          console.log('dragcancel', {
            start: startEl,
            take: takeEl,
          });

          if (startEl && takeEl) {
            world.render(startEl, startCards.concat(takeCards));
            takeEl.parentNode?.removeChild(takeEl);
          }
        } else {

          console.log('dragend', {
            start: startEl,
            take: takeEl,
            drop: ctx.el,
            went: startEl !== ctx.el,
          });

          if (startEl && !startCards.length)
            startEl.parentNode?.removeChild(startEl);
        }
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

        const { offsetX, offsetY } = ev;
        ctx.setData('moveAt', `${offsetX},${offsetY}`);

        const buttons = ctx.getData('buttons');

        if (st === 'mousedown' && `${ev.buttons}` === buttons) {
          const { el } = ctx;
          const cards = getElCards(el);
          if (!cards?.length) return;
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

          const id = ctx.track(ctx.el);
          const overId = ctx.getData('dragOverId');
          const takeId = ctx.getData('dragTakeId');
          const startId = ctx.getData('dragStartId');
          if (overId !== id) {
            if (!takeId && overId == startId) {
              handleDragTake(ctx);
            } else {
              handleDragLeave(ctx);
            }
            ctx.setDomData('dragOverId', id);
            handleDragEnter(ctx);
          }
          handleDragOver(ctx);
        }
      });

      container.addEventListener('contextmenu', ev => {
        const ctx = evContext(ev);
        if (!ctx) return;
        const st = ctx.getData('state');
        console.log('ctx?', st);
        // TODO display own based on cards / hand? only if not dragging?
        ev.preventDefault();
      });

      // TODO touch event handling

    },
  };

  return world;
}
