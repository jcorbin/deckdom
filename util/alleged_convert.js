import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { promisify } from 'node:util';

import { JSDOM } from 'jsdom';

const {
  stdout: out,
  stderr: logOut,
  env
} = process;

/** @param {string} s */
const firstTag = s => {
  const match = /<.*?>/.exec(s);
  return match ? match[0] : s;
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

const transformFixup = new Map([
  ['#fool-label', 'rotate(-90) translate(-180, 30)'],
  ['#fool-reversed use #fool-label', 'translate(320, 0)'],
]);

/**
 * @param {string} key
 * @param {string} [dflt]
 */
function getTransformAttr(key, dflt) {
  let xform = transformFixup.get(key);
  if (xform === undefined) {
    if (dflt) xform = dflt;
    else return '';
  }
  return xform ? ` transform="${xform}"` : '';
}

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

const dev = env['DEV'] ? true : false;
let limit = parseInt(env['LIMIT'] || '')
if (isNaN(limit)) limit = 10;

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

/** @param {string} s */
const woulda = async s => {
  if (dev)
    await writeOut(`\n<!-- would ${firstTag(s)} -->\n`);
  else
    await writeOut(`\n${s}\n`);
};

/** @type {{fileName: string, notes: string[]}[]} */
const problems = [];

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

await toState('<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" data-deck-name="alleged-tarot">');

await toState('svg');
await writeOuts([
  `\n<title>Alleged Tarot</title>\n`,
]);

await toState('svg', 'defs');
await writeOuts([
  `\n<text id="alleged-about" data-deck-about="alleged">\n`,
  `- Author: Damian Cugley\n`,
  `- Published: 2002\n`,
  `- Source: &lt;https://alleged.org.uk/pdc/tarot&gt;\n`,
  `</text>\n`,
]);

for await (const {
  fileName,
  name: allegedName,
  title: allegedTitle,
  suit: allegedSuit,
  rank: allegedRank,
  dom,
} of inputFiles()) {
  if (dev && limit-- < 1) throw new Error('TODO remove dev limit');

  logOut.write(`${fileName}...`);

  /** @type {string[]} */
  let notes = [];

  /** @param {string} s @param {string[]} detail */
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

  {
    const { window: { document } } = dom;

    const cardID = `${allegedName}`;
    const cardFaceID = `${cardID}-face`;
    const cardLabelID = `${cardID}-label`;
    const cardReversedID = `${cardID}-reversed`;

    let faceTitle = allegedTitle;
    let uprightMeaning = '';
    let reversedMeaning = '';
    let explain = '';

    let foundFace = false;
    let foundLabel = false;

    const svg = document.querySelector('svg');
    if (!svg) throw new Error('no root <svg>');

    await toState('svg', 'defs');

    for (const el of svg.querySelectorAll('defs > *')) {
      const { id } = el;
      if (!seenDefs.has(id)) {
        seenDefs.add(id);
        let s = el.outerHTML.trim();
        s = s.replace(' xmlns="http://www.w3.org/2000/svg"', '');
        await woulda(s);
      }
    }

    await writeOut(`\n<!-- file: ${fileName} -->\n`);
    await writeOut(`<!-- alleged title: ${JSON.stringify(allegedTitle)} suit: ${allegedSuit} rank: ${allegedRank} -->\n`);

    const title = svg.querySelector('title')?.textContent || allegedTitle;
    await writeOut(`<!-- title: ${title} -->\n`);

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
    } else {
      await note('missing card face graphic');
    }


    const interp = svg.querySelector('#interp') || svg;
    for (const textEl of interp.querySelectorAll(':scope > text')) {
      if (!foundLabel && textEl.getAttribute('font-family') === 'Even') {
        faceTitle = textEl.textContent?.trim() || '';
        textEl.id = cardLabelID;
        const xform = transformFixup.get(`#${cardLabelID}`);
        if (xform)
          textEl.setAttribute('transform', xform);
        else if (xform !== undefined)
          textEl.removeAttribute('transform');
        await woulda(textEl.outerHTML);
        foundLabel = true;
      } else if (!uprightMeaning) {
        uprightMeaning = textEl.textContent?.trim() || '';
      } else if (!reversedMeaning) {
        reversedMeaning = textEl.textContent?.trim() || '';
      }
    }

    /** @type {string[]} */
    const missing = [];
    if (!foundLabel) missing.push('face title');
    if (!uprightMeaning) missing.push('upright meaning');
    if (!reversedMeaning) missing.push('reversed meaning');
    if (missing.length) await note(
      `missing card ${missing}`,
      `interp: ${firstTag(interp.outerHTML)}`);

    const textEl = svg.querySelector('#text');

    // let textContent = textEl?.textContent?.trim();
    // if (textContent) explain = textContent.split(/\n/).map(ss => ss.trim()).join(' ');
    explain = textEl?.textContent || '';
    explain = explain.replace(/^\s*\n/g, '').replace(/\n\s*$/g, '');

    await writeOuts(function*() {
      yield `\n<svg id="${cardID}" viewBox="0 0 360 500" width="360" height="500"\n`;
      yield `  data-reversed-id="${cardReversedID}"\n`;
      yield `  data-card-name="${faceTitle}"\n`;
      yield `  data-card-suit="${allegedSuit}"\n`;
      yield `  data-card-rank="${allegedRank}">\n`;
      if (uprightMeaning)
        yield `  <title>${faceTitle}: ${uprightMeaning}</title>\n`;
      else
        yield `  <title>${faceTitle}</title>\n`;
      if (foundFace)
        yield `  <use href="#${cardFaceID}"${getTransformAttr(`#${cardID} use #${cardFaceID}`)} />\n`;
      if (foundLabel)
        yield `  <use href="#${cardLabelID}"${getTransformAttr(`#${cardID} use #${cardLabelID}`)} />\n`;
      if (explain)
        yield `  <desc>\n${explain}\n</desc>\n`;
      yield `</svg>\n`;


      yield `\n<svg id="${cardReversedID}" data-upgright-id="${cardID}" viewBox="0 0 360 500" width="360" height="500">\n`;
      if (reversedMeaning)
        yield `  <title>${faceTitle} reversed: ${reversedMeaning}</title>\n`;
      else
        yield `  <title>${faceTitle} reversed</title>\n`;
      if (foundFace)
        yield `  <use href="#${cardFaceID}"${getTransformAttr(`#${cardReversedID} use #${cardFaceID}`, 'rotate(180, 180, 250)')} />\n`;
      if (foundLabel)
        yield `  <use href="#${cardLabelID}"${getTransformAttr(`#${cardReversedID} use #${cardLabelID}`)} />\n`;
      yield `</svg>\n`;
    }());
  }

  if (notes.length) problems.push({ fileName, notes });

  logOut.write(`done.\n`);
}

await toState('svg');

if (problems.length) {
  await writeOut(`\n<!-- Problems encountered:\n`);
  for (const { fileName, notes } of problems)
    await writeOut(`   - ${fileName}: ${notes.join("; ")}\n`);
  await writeOut(`\n-->\n`);
}

await toState();
