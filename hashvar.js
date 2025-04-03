/** @param {Location} loc */
export function* split(loc) {
  const { hash = '' } = loc;
  for (const match of hash.matchAll(/(?:^#([^#;&]+)|[#;&]([^#;&]+))/g)) {
    const part = match[1] || match[2];
    if (!part) continue;
    yield part;
  }
}

  /** @param {Location} loc */
  export function* parse(loc) {
    for (const part of split(loc)) {
      const eqi = part.indexOf('=');
      if (eqi < 0) yield [part, ''];
      else yield [part.slice(0, eqi), part.slice(eqi + 1)]
    }
  }

/**
 * @param {Location} loc
 * @param {Iterable<string>} parts
 */
export function update(loc, parts) {
  const aParts = Array.from(parts);
  loc.hash = aParts.length ? `#${aParts.join('&')}` : '';
}

/**
 * @param {Location} loc
 * @param {string} name
 */
export function* getAll(loc, name) {
  for (const [key, val] of parse(loc))
    if (key === name) yield val;
}

/**
 * @param {Location} loc
 * @param {string} name
 */
export function get(loc, name) {
  for (const [key, val] of parse(loc))
    if (key === name) return val;
  return undefined;
}

/**
 * @param {Location} loc
 * @param {string} name
 * @param {string|undefined} value
 */
export function set(loc, name, value) {
  update(loc, function*() {
    const pre = `${name}=`;
    for (const part of split(loc))
      if (part !== name && !part.startsWith(pre)) yield part;
    if (value !== undefined)
      yield `${pre}${value}`;
  }());
}

/**
 * @param {Location} loc
 * @param {string} name
 * @param {string|undefined} value
 */
export function push(loc, name, value) {
  update(loc, function*() {
    yield* split(loc);
    yield `${name}=${value}`;
  }());
}

/**
 * @param {Location} loc
 * @param {string} name
 * @param {string|undefined} value
 */
export function remove(loc, name, value) {
  update(loc, function*() {
    const pre = `${name}=`;
    for (const part of split(loc)) {
      if (part.startsWith(pre) && part.slice(pre.length) === value) continue;
      yield part;
    }
  }());
}

/**
 * @param {Location} loc
 * @param {string} name
 */
export function removeAll(loc, name) {
  set(loc, name, undefined);
}
