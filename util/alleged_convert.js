import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { promisify } from 'node:util';

import { JSDOM } from 'jsdom';

/** @param {number} num */
const fillna = (num, dflt = 0) => isNaN(num) ? dflt : num;

const {
  stdout: out,
  stderr: logOut,
  env
} = process;

/** @returns {AsyncGenerator<string>} */
async function* inputFileNames(args = process.argv.slice(2)) {
  for (const arg of args) {
    const info = await fs.stat(arg);
    if (info.isDirectory())
      yield* inputFileNames((await fs.readdir(arg)).map(ent => path.join(arg, ent)))
    else
      yield arg;
  }
}

async function* inputFiles() {
  /** @type {string[]} */
  const fileNames = [];
  for await (const fileName of inputFileNames())
    fileNames.push(fileName);

  const names = fileNames.map(fileName => ({ ...parseAllegedName(fileName), fileName }));

  names.sort((
    { suit: aSuit, rank: aRank },
    { suit: bSuit, rank: bRank },
  ) => {
    if (aSuit !== bSuit) {
      if (aSuit === 'major') return -1;
      if (bSuit === 'major') return 1;
      // TODO attempt elemental semantic sorting
      // water > fire > earth > air
      return aSuit.localeCompare(bSuit);
    }
    return aRank - bRank;
  });

  for (const { fileName, ...info } of names)
    yield {
      fileName,
      ...info,
      dom: await JSDOM.fromFile(fileName, {
        contentType: 'image/svg+xml'
      }),
    }
}

const writeOut = promisify(out.write.bind(out));

/** @param {Iterable<string>} ss */
const writeOuts = async ss => {
  for (const s of ss)
    await writeOut(s)
};

/** @type {{fileName: string, notes: string[]}[]} */
const problems = [];

/** @type {{[id: string]: any}} */
const index = {};

/** @type {Set<string>} */
const seenDefs = new Set();

/** @type {string[]} */
const state = [];

/** @param {string[]} path */
const toState = async (...path) => {
  let i = 0;
  let j = 0;

  const pathTags = path.map(s => {
    const match = /^<([^ ]+)/.exec(s);
    return match && match[1] || s;
  });

  for (; i < state.length && j < path.length; i++, j++)
    if (state[i] !== pathTags[i]) break;
  while (i < state.length) {
    const tagName = state.pop();
    await writeOut(`\n</${tagName}>\n`);
  }
  while (j < path.length) {
    const p = path[j] || 'undefined';
    if (p.startsWith('<'))
      await writeOut(`\n${p}\n`);
    else
      await writeOut(`\n<${p}>\n`);
    state.push(pathTags[j] || 'undefined');
    j++;
  }
};

await toState('<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">');

const dev = env['DEV'] ? true : false;
let limit = fillna(parseInt(env['LIMIT'] || ''), 10);

/** @param {string} s */
const firstTag = s => {
  const match = /<.*?>/.exec(s);
  return match ? match[0] : s;
};

/** @param {string} s */
const woulda = async s => {
  if (dev)
    await writeOut(`\n<!-- would ${firstTag(s)} -->\n`);
  else
    await writeOut(`\n${s}\n`);
};

const Roman = Object.freeze({
  /** @type {[RegExp, number][]} */
  Values: [
    [/CM/, 900],
    [/CD/, 400],
    [/XC/, 90],
    [/XL/, 40],
    [/IV/, 4],
    [/IX/, 9],
    [/V/, 5],
    [/X/, 10],
    [/L/, 50],
    [/C/, 100],
    [/M/, 1000],
    [/I/, 1],
    [/D/, 500]
  ],
  UnmappedStr: 'Q',
  /** @param {string} str */
  parse(str) {
    let result = 0
    for (const [pat, value = 0] of Roman.Values) {
      while (str.match(pat)) {
        result += value;
        str = str.replace(pat, Roman.UnmappedStr);
      }
    }
    return result;
  },
});

/** @param {string} str */
const parseMinorRank = str => {
  switch (str.toLowerCase()) {
    case 'ace': return 1
    case 'ten': return 10
    case 'page': return 11
    case 'knight': return 12
    case 'queen': return 13
    case 'king': return 14
  }
  return parseInt(str);
};

/** @param {string} fileName */
const parseAllegedName = fileName => {
  let name = path.basename(fileName, '.svg');
  const match = /^(?:(\d+)|([ivxlcdmIVXLCDM]+)|(.+?))-(.*)-card3$/.exec(name);
  if (!match)
    throw new Error('unalleged file name');

  const [_, intStr = '', romStr = '', suit = '', sub = ''] = match;

  if (intStr || romStr) {
    const rank = intStr ? parseInt(intStr) : Roman.parse(romStr.toUpperCase());
    const title = sub.replaceAll('-', ' ');
    return {
      suit: 'major',
      rank,
      title,
      name: sub,
    };
  }

  if (suit) {
    const rank = parseMinorRank(sub);
    return {
      suit,
      rank,
      title: `${rank} of ${suit}`,
      name: `${suit}-${rank}`,
    };
  }

  throw new Error('unalleged file name');
};

for await (const {
  fileName,
  name: allegedName,
  title: allegedTitle,
  suit: allegedSuit,
  rank: allegedRank,
  dom,
} of inputFiles()) {
  logOut.write(`${fileName}...`);

  /** @type {string[]} */
  let notes = [];

  /**
   * @param {string} s
   * @param {string[]} detail
   */
  const note = async (s, ...detail) => {
    notes.push(s);
    if (detail.length) {
      await writeOut(`<!-- FIXME ${s}\n`);
      for (const mess of detail)
        await writeOut(`     ${mess}\n`);
      await writeOut(`-->\n`);
    } else {
      await writeOut(`<!-- FIXME ${s} -->\n`);
    }
  };

  const cardID = `alleged-${allegedName}`;
  /** @type {{name: string} & {[key: string]: any}} */
  const cardDef = { name: allegedName };

  if (dev && limit-- < 1) throw new Error('TODO remove dev limit');
  const { window: { document } } = dom;

  const svg = document.querySelector('svg');
  if (!svg) throw new Error('no root <svg>');

  for (const el of svg.querySelectorAll('defs > *')) {
    const { id } = el;
    if (!seenDefs.has(id)) {
      seenDefs.add(id);
      await toState('svg', 'defs');
      let s = el.outerHTML.trim();
      s = s.replace(' xmlns="http://www.w3.org/2000/svg"', '');
      await woulda(s);
    }
  }

  await toState('svg', 'defs');
  await writeOut(`\n<!-- file: ${fileName} -->\n`);
  await writeOut(`<!-- alleged title: ${JSON.stringify(allegedTitle)} suit: ${allegedSuit} rank: ${allegedRank} -->\n`);

  const title = svg.querySelector('title')?.textContent || allegedTitle;
  await writeOut(`<!-- title: ${title} -->\n`);

  const cardFaceID = `${cardID}-face`;
  const cardLabelID = `${cardID}-label`;
  const cardUprightID = `${cardID}-upright`;
  const cardReversedID = `${cardID}-reversed`;

  let foundFace = false;
  const faceGraphic = svg.querySelector(':scope > svg');
  if (faceGraphic) {
    faceGraphic.id = cardFaceID;

    const width = faceGraphic.getAttribute('width');
    const height = faceGraphic.getAttribute('height');
    if (`${width}` !== '360' || `${height}` !== '500') {
      await writeOut(`<!-- FIXME expected face size 360x500, got ${width}x${height} -->\n`);
    }

    // upstream uses something like a 20x40 border offset that we zero out
    faceGraphic.setAttribute('x', '0');
    faceGraphic.setAttribute('y', '0');

    // TODO validate viewBox="28.1 5.3 577.2 792.2" ?

    faceGraphic.setAttribute('preserveAspectRatio', 'xMidYMid slice');

    let s = faceGraphic.outerHTML.trim();
    s = s.replace(' xmlns="http://www.w3.org/2000/svg"', '');
    await woulda(s);
    foundFace = true;
  }
  if (!foundFace)
    await note('missing card face');

  {
    const interp = svg.querySelector('#interp') || svg;
    let faceTitle = allegedTitle;
    let uprightMeaning = '';
    let reversedMeaning = '';
    for (const textEl of interp.querySelectorAll(':scope > text')) {
      if (!faceTitle && textEl.getAttribute('font-family') === 'Even') {
        faceTitle = textEl.textContent?.trim() || '';
        textEl.id = cardLabelID;
        await woulda(textEl.outerHTML);
      } else if (!uprightMeaning) {
        uprightMeaning = textEl.textContent?.trim() || '';
      } else if (!reversedMeaning) {
        reversedMeaning = textEl.textContent?.trim() || '';
      }
    }
    if (!faceTitle || !uprightMeaning || !reversedMeaning) {
      /** @type {string[]} */
      const missing = [];
      if (!faceTitle) missing.push('face title');
      if (!uprightMeaning) missing.push('upright meaning');
      if (!reversedMeaning) missing.push('reversed meaning');
      await note(
        `missing card ${missing}`,
        `interp: ${firstTag(interp.outerHTML)} -->\n`);
    }

    if (faceTitle) cardDef.name = faceTitle;

    if (faceTitle || foundFace) {
      await writeOuts(function*() {
        yield `\n<svg id="${cardUprightID}" viewBox="0 0 360 500" width="360" height="500">\n`;
        if (uprightMeaning)
          yield `  <title>${(faceTitle || allegedName)}: ${uprightMeaning}</title>\n`;
        else
          yield `  <title>${(faceTitle || allegedName)}</title>\n`;
        if (foundFace)
          yield `  <use href="#${cardFaceID}" />\n`;
        if (faceTitle)
          yield `  <use href="#${cardLabelID}" />\n`;
        yield `</svg>\n`;

        yield `\n<svg id="${cardReversedID}" viewBox="0 0 360 500" width="360" height="500">\n`;
        if (reversedMeaning)
          yield `  <title>${(faceTitle || allegedName)} reversed: ${reversedMeaning}</title>\n`;
        else
          yield `  <title>${(faceTitle || allegedName)} reversed</title>\n`;
        if (foundFace)
          yield `  <use href="#${cardFaceID}" transform="rotate(180, 180, 250)" />\n`;
        if (faceTitle)
          yield `  <use href="#${cardLabelID}" />\n`;
        yield `</svg>\n`;
      }())
      cardDef['upright'] = `#${cardUprightID}`;
      cardDef['reversed'] = `#${cardReversedID}`;
    }
  }

  {
    let explain = '';
    const el = svg.querySelector('#text');
    let s = el?.textContent?.trim();
    if (s) {
      explain = s.split(/\n/).map(ss => ss.trim()).join(' ');
    }
    if (!explain) {
      const isMinor = [
        'coins',
        'cups',
        'swords',
        'wands',
      ].some(minor => allegedName.startsWith(`${minor}-`))

      // NOTE buddy only bothered to commentate on some of me majors, plus some artist notes on a few minors... does not make for a full "little white book" experience
      // TODO evolve data scheme so that we can just call these out as artist notes?
      if (!isMinor)
        await note(`missing ${allegedName} card explanation`);
    } else {
      cardDef['explain'] = explain;
    }
  }

  if (notes.length) {
    problems.push({ fileName, notes });
    // for (const el of svg.querySelectorAll(':scope > *')) {
    //   switch (el.tagName) {
    //     case 'defs': continue;
    //     case 'title': continue;
    //   }
    //   await writeOut(`<!-- FIXME maybe child: ${el.tagName} #${el.id}\n     ${firstTag(el.outerHTML)} -->\n`);
    // }
  }

  index[cardID] = cardDef;

  logOut.write(`done.\n`);
}

await toState();

if (problems.length) {
  await writeOut(`\n<!-- Problems encountered:\n`);
  for (const { fileName, notes } of problems)
    await writeOut(`   - ${fileName}: ${notes.join("; ")}\n`);
  await writeOut(`\n-->\n`);
}

// TODO evolve data scheme so that we can just annotate svg elements above
await writeOut(`\n<script type="application/json" id="book">${JSON.stringify(index, null, 2)}</script>\n`);

await toState('svg');
