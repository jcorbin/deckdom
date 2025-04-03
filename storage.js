/**
 * @param {string} prefix
 * @param {Storage} [storage]
 * @returns {Storage}
 */
export function makeSubStorage(prefix, storage = localStorage) {
  const keys = function*() {
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key?.startsWith(prefix)) yield key;
    }
  };

  return {
    get length() {
      let n = 0;
      for (const _ of keys())
        n++;
      return n;
    },

    key(i) {
      let j = 0;
      for (const key of keys())
        if (i === j++) {
          key.slice(prefix.length);
        }
      return null;
    },

    clear() {
      for (const key of Array.from(keys()))
        storage.removeItem(key);
    },

    getItem(key) {
      return storage.getItem(`${prefix}${key}`);
    },

    removeItem(key) {
      return storage.removeItem(`${prefix}${key}`);
    },

    setItem(key, value) {
      return storage.setItem(`${prefix}${key}`, value);
    },
  };
}
