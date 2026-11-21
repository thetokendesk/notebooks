'use strict';
// Five 48 x 30 maps. Walls are mirrored left to right; starting cell 1 is top left, 2 top right, 3 bottom centre.
// Bomb spots a, b, c … are where bombs appear, in that order. `rows` is what the engine and the viewer read.
const W = 48, H = 30;
const START = [[4, 4], [43, 4], [23, 26]];

function build(id, name, { walls, spots, starts = START }) {
  const g = Array.from({ length: H }, () => Array(W).fill('.'));
  const all = [];
  for (const [x, y, w, h] of walls) { all.push([x, y, w, h]); all.push([W - x - w, y, w, h]); }
  for (const [x, y, w, h] of all) for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) g[j][i] = '#';
  starts.forEach(([x, y], i) => { g[y][x] = String(i + 1); });
  spots.forEach(([x, y], i) => { g[y][x] = String.fromCharCode(97 + i); });
  return { id, name, rows: g.map(r => r.join('')) };
}

module.exports = [
  build('open', 'Open Floor', {
    walls: [[10, 8, 3, 3], [10, 19, 3, 3], [21, 14, 3, 2], [4, 14, 5, 2], [17, 3, 2, 4]],
    spots: [[23, 9], [9, 25], [38, 25], [15, 14], [32, 14], [23, 19]],
  }),
  build('crossroads', 'Crossroads', {
    walls: [[6, 14, 13, 2], [23, 3, 1, 8], [23, 19, 1, 6], [11, 6, 2, 4], [11, 20, 2, 4]],
    spots: [[23, 14], [6, 22], [41, 22], [17, 8], [30, 8], [23, 28]],
  }),
  build('islands', 'Islands', {
    walls: [[8, 8, 5, 3], [16, 3, 3, 5], [6, 18, 4, 6], [15, 13, 6, 3], [21, 21, 3, 3], [22, 7, 2, 3], [14, 24, 4, 2]],
    spots: [[23, 12], [11, 27], [36, 27], [11, 14], [36, 14], [23, 2], [19, 19], [28, 19]],
  }),
  build('lanes', 'Lanes', {
    walls: [[6, 9, 15, 1], [6, 20, 15, 1], [12, 13, 1, 4], [22, 14, 2, 2], [0, 14, 3, 2]],
    spots: [[23, 4], [6, 16], [41, 16], [15, 25], [32, 25], [23, 11]],
  }),
  build('ring', 'The Ring', {
    walls: [[14, 7, 8, 1], [14, 22, 8, 1], [14, 7, 1, 6], [14, 17, 1, 6], [21, 13, 3, 4], [4, 12, 3, 6]],
    spots: [[18, 10], [29, 19], [29, 10], [18, 19], [23, 2], [5, 25], [42, 25]],
  }),
];
