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
  /** @param {number} s @param {Vec2} v @returns {Vec2} */
  scale(s, [x, y]) { return [s * x, s * y] },

  // TODO neg / add / sub / mul / dot / cross / clamp / lerp / invLerp / remap
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
const stateDataKey = 'cardsState';

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
  const ctx = {
    get el() { return target instanceof HTMLElement ? target : null },

    // TODO get domain()
    // TODO seek state up parent chain
    // TODO move state up parent chain

    get state() { return ctx.el?.dataset[stateDataKey] || '' },
    set state(st) {
      const { el } = ctx;
      if (!el) throw new Error('no event element available');
      el.dataset[stateDataKey] = st;
    },

    /** @param {string} key */
    getStateData(key) {
      const { el } = ctx;
      if (!el) return '';
      const dataKey = `${stateDataKey}${key.slice(0, 1).toUpperCase()}${key.slice(1)}`;
      return el.dataset[dataKey] || '';
    },

    /** @param {string} key @param {string} val */
    setStateData(key, val) {
      const { el } = ctx;
      if (!el) throw new Error('no event element available');
      const dataKey = `${stateDataKey}${key.slice(0, 1).toUpperCase()}${key.slice(1)}`;
      if (val)
        el.dataset[dataKey] = val;
      else
        delete el.dataset[dataKey];
    },

    get cards() {
      const { el } = ctx;
      return el && getElCards(el);
    },
    set cards(cards) {
      const { el } = ctx;
      if (!el) throw new Error('no event element available');
      setElCards(el, cards);
    },
  };
  return ctx;
};

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
      // TODO customize context menu for stack / card actions

      container.addEventListener('mousedown', ev => {
        const ctx = evContext(ev);

        const { button, buttons } = ev;
        console.log('down?', ctx.state, button, buttons);
        if (ctx.state === 'down') {
          console.log('down??', button, buttons, ctx.getStateData('buttons'));
          return;
        }

        ctx.state = 'down';
        ctx.setStateData('buttons', `${buttons}`);
        console.log('down.', button, buttons, ctx.el);

        // const cards = target instanceof HTMLElement && getElCards(target);
        // if (!cards) {
        //   // TODO if avatar hand isn't empty, also allow interaction start
        //   return;
        // }

        // console.log('down', ctx.state, ctx.cards, ctx.el);
        ev.preventDefault();
      });

      container.addEventListener('mouseup', ev => {
        const ctx = evContext(ev);

        if (ctx.state === 'down') {
          const { button, buttons } = ev;
          console.log('up', button, buttons, ctx.getStateData('buttons'));
          return;
        }

      });

      container.addEventListener('contextmenu', ev => {
        // TODO only if ev cards
        console.log('ctx', ev.target);
        ev.preventDefault();
      });

      // container.addEventListener('click', ev => console.log('click', ev.target));
      // container.addEventListener('mouseover', ev => console.log('over', ev.target));
      // container.addEventListener('mouseout', ev => console.log('out', ev.target));

      // container.addEventListener('mousemove', ev => console.log('move', ev.target, ev.buttons));

      // "mouseenter": MouseEvent;
      // "mouseleave": MouseEvent;
      // "mousemove": MouseEvent;
      // "mouseout": MouseEvent;
      // "mouseover": MouseEvent;

      // container.addEventListener('dragstart', ev => {
      //   // TODO allow drag to start on domain when holding card(s)?
      //
      //   // TODO how does card/stack drag start change when holding cards?
      //   const cev = getEvCards(ev);
      //   const { dt, el, elCards } = cev;
      //   if (!dt || !el || !elCards.length) {
      //     ev.preventDefault();
      //     return;
      //   }
      //
      //   // TODO gesture to pull & flip?
      //   const takeI = scal.clamp(
      //     Math.round(scal.remap2(
      //       ev.offsetY,
      //       vec2.scale(el.offsetHeight, takeBands),
      //       0, elCards.length)
      //     ), 1, elCards.length);
      //   const take = elCards.slice(0, takeI);
      //   const ot = orient.fromStyle(orientStyleVars, el.style);
      //   const rest = elCards.slice(takeI);
      //   console.log('drag take', take);
      //
      //   const { id: startElId, added: startElIdOwn } = ensureId(el, 'cardDragStart');
      //
      //   /** @type {string[]} */
      //   const tmpIds = [];
      //
      //   if (startElIdOwn)
      //     tmpIds.push(startElId);
      //
      //   const dragData = {
      //     orient: ot,
      //     cards: take.map(smudgeCard),
      //     startElId,
      //     tmpIds,
      //   };
      //
      //   const names = take
      //     .map(card => 'name' in card ? card.name : spec[card.id]?.name)
      //     .filter(/** @returns {x is string} */ x => !!x);
      //
      //   dt.setData('text/plain',
      //     names.length > 1 ? names.map(n => `- ${n}\n`).join('\n') : (names[0] || ''));
      //   dt.setData(dragDataType, JSON.stringify(dragData));
      //   // TODO limit ? dt.effectAllowed = 'move';
      //   // TODO attach face image(s)
      //   // TODO dt.setDragImage(img, x, y), use canvas to provide stack depth feedback ; also probably less gap to cursor
      //
      //   world.render(el, rest);
      //   // TODO hide if empty? or does .void suffice?
      // });

      // container.addEventListener('dragend', ev => {
      //   const cev = getEvCards(ev);
      //   const { dt, el, elCards, cards, } = cev;
      //   if (!dt || !el) return;
      //
      //   const { dropEffect } = dt;
      //
      //   cev.cleanup();
      //
      //   if (dropEffect === 'none') {
      //     world.render(el, cards.concat(elCards));
      //     console.log('cancel drag', el);
      //     return;
      //   }
      //
      //   if (!elCards.length) {
      //     console.log('post drag prune', el);
      //     el.parentNode?.removeChild(el);
      //   }
      //
      // });

      // container.addEventListener('dragenter', ev => {
      //   const cev = getEvCards(ev);
      //   const { dt, el, cards } = cev;
      //   if (!dt || !cards.length) return;
      //
      //   if (el === cev.startEl) {
      //     // TODO present overlay ; TODO differ when re-enter as if other stack?
      //     // TODO re-enter self should interact as if foreign stack? e.g. present actions like (stack under, ... cut into ..., stack over)
      //     ev.preventDefault();
      //     dt.dropEffect = 'none';
      //     console.log('dragging over self');
      //     cev.overEl = el;
      //     return;
      //   }
      //
      //   console.log('drag enter?', el);
      //   // TODO wen cev.overEl = el;
      //
      //   // TODO ev.preventDefault();
      // });

      // container.addEventListener('dragleave', ev => {
      //   const cev = getEvCards(ev);
      //   const { dt, el, cards } = cev;
      //   if (!dt || !cards.length) return;
      //
      //   if (el === cev.startEl) {
      //     // TODO hide any overlay?
      //     return;
      //   }
      //
      //   console.log('drag leave', el);
      //
      // });

      // container.addEventListener('dragover', ev => {
      //   // TODO update take when over self
      //
      //   // const cev = getEvCards(ev);
      //   // const { dt, el, cards } = cev;
      //   // if (!dt || !cards.length) return;
      //
      //   // TODO ev.preventDefault();
      // });

      // console.log(type, target);
      // if (target instanceof HTMLElement) {
      //   this.render(target);
      // }

      // TODO touch event handling

    },
  };

  return world;
}
