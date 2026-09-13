import fs from 'node:fs';
const normalize = (word) => word.normalize('NFC').toLowerCase().replace(/եւ|եվ/g, 'և');
const source = fs.readFileSync('data/source/hy_AM.dic', 'utf8').split(/\r?\n/).slice(1);
const words = [
  ...new Set(
    source
      .map((line) => line.split('/')[0])
      .filter((word) => /^[ա-ֆև]+$/.test(word))
      .map(normalize),
  ),
].sort();
fs.writeFileSync('src/data/accepted.json', JSON.stringify(words));
console.log(
  `Imported ${words.length} lowercase Armenian headwords; no affix expansion or generated words.`,
);
