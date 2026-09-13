import fs from 'node:fs';
const accepted = new Set(JSON.parse(fs.readFileSync('src/data/accepted.json', 'utf8')));
const answers = JSON.parse(fs.readFileSync('src/data/answers.json', 'utf8'));
const seen = new Set();
for (const entry of answers) {
  if (!accepted.has(entry.word) || seen.has(entry.word))
    throw Error(`Invalid/duplicate answer: ${entry.word}`);
  seen.add(entry.word);
}
const counts = {};
const lengths = {};
for (const entry of answers) {
  counts[entry.difficulty] = (counts[entry.difficulty] || 0) + 1;
  const n = entry.word.match(/ու|և|[ա-ֆ]/g).length;
  lengths[n] = (lengths[n] || 0) + 1;
}
console.log(
  JSON.stringify({ accepted: accepted.size, answers: answers.length, counts, lengths }, null, 2),
);
