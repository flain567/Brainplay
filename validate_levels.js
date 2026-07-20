const fs = require('fs');
const src = fs.readFileSync('./src/pages/games/anagramLevels.js', 'utf-8');
const modified = src
  .replace(/export const CHAPTERS/g, 'const CHAPTERS')
  .replace(/export function/g, 'function')
  .replace(/export const TOTAL_LEVELS.*/, '');
eval(modified);
let totalErrors = 0;
let levelNum = 0;
CHAPTERS.forEach((ch, ci) => {
  ch.levels.forEach((level, li) => {
    levelNum++;
    const cellMap = new Map();
    let hasError = false;
    level.words.forEach(w => {
      const cells = w.word.split('').map((letter, i) => ({
        r: w.dir === 'H' ? w.r : w.r + i,
        c: w.dir === 'H' ? w.c + i : w.c,
        letter,
      }));
      cells.forEach(cell => {
        const key = `${cell.r},${cell.c}`;
        if (cellMap.has(key)) {
          const existing = cellMap.get(key);
          if (existing.letter !== cell.letter) {
            console.error(`X L${levelNum}: CONFLICT (${cell.r},${cell.c}) "${existing.word}"='${existing.letter}' vs "${w.word}"='${cell.letter}'`);
            hasError = true;
            totalErrors++;
          }
        } else {
          cellMap.set(key, { ...cell, word: w.word });
        }
      });
    });
    level.words.forEach(w => {
      const available = [...level.letters];
      for (const ch of w.word) {
        const idx = available.indexOf(ch);
        if (idx === -1) {
          console.error(`X L${levelNum}: "${w.word}" cant form from [${level.letters}]`);
          hasError = true; totalErrors++; break;
        }
        available.splice(idx, 1);
      }
    });
    const status = hasError ? 'FAIL' : 'OK';
    console.log(`L${String(levelNum).padStart(2)} ${String(level.words.length).padStart(1)}w ${status}`);
  });
});
console.log(`\nLevels: ${levelNum}, Errors: ${totalErrors}`);
if (totalErrors === 0) console.log('ALL VALID!');
