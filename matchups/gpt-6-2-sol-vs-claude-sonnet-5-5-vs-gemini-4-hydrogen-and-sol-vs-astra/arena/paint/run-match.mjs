import fs from 'node:fs';
import path from 'node:path';
import engine from './engine.js';
import maps from './maps.js';

const { playRound, KEYS } = engine;
const USAGE = 'Usage: node run-match.mjs <a.js> <b.js> <c.js> --names A,B,C [--short a,b,c] [--colors #hex,#hex,#hex] [--tries 3] [--restarts 60] --out <dir>';
const args = process.argv.slice(2);
const files = args.splice(0, 3);
if (files.length !== 3 || files.some(f => f.startsWith('--'))) { console.error(USAGE); process.exit(1); }
const options = { '--names': 'Greedy,Bomber,Sweeper', '--short': '', '--colors': '', '--out': 'sample-match', '--tries': '3', '--restarts': '60' };
for (let i = 0; i < args.length; i += 2) {
  if (!(args[i] in options) || args[i + 1] === undefined) { console.error('Unknown or incomplete option: ' + args[i] + '\n' + USAGE); process.exit(1); }
  options[args[i]] = args[i + 1];
}
const list = (s, n, what) => {
  const v = s.split(',').map(x => x.trim());
  if (v.length !== n || v.some(x => !x)) { console.error(`${what}: expected ${n} comma-separated values`); process.exit(1); }
  return v;
};
const names = list(options['--names'], 3, '--names');
// The label over each painter: the first word of its name unless given.
const short = options['--short'] ? list(options['--short'], 3, '--short') : names.map(n => n.split(/\s+/)[0]);
const colors = options['--colors'] ? list(options['--colors'], 3, '--colors') : null;
if (colors && colors.some(c => !/^#[0-9a-f]{6}$/i.test(c))) { console.error('--colors: use #rrggbb'); process.exit(1); }

const sources = files.map(f => fs.readFileSync(f, 'utf8'));
sources.forEach(s => { if (!engine.createBrain(s).valid) console.warn('Warning: a brain did not load (no brain function, a syntax error, or over 5 ms at load); it will stay put.'); });
const out = path.resolve(options['--out']);
fs.mkdirSync(out, { recursive: true });

const by = f => Object.fromEntries(KEYS.map((k, i) => [k, f(k, i)]));
const match = {
  version: 1, game: 'paint', names: by((k, i) => names[i]), short: by((k, i) => short[i]),
  ...(colors ? { colors: by((k, i) => colors[i]) } : {}),
  points: by(() => 0), cells: by(() => 0), wins: by(() => 0), rounds: [],
};
function writeData(filename, data) {
  const json = JSON.stringify(data);
  fs.writeFileSync(path.join(out, filename), json + '\n');
  // A script companion lets the viewer load the data from file:// without a server.
  fs.writeFileSync(path.join(out, filename + '.js'), 'window.PAINT_DATA(' + json.replace(/</g, '\\u003c') + ');\n');
}

const total = maps.length * 3;
for (const map of maps) for (let rotation = 0; rotation < 3; rotation++) {
  const round = match.rounds.length + 1, replayFile = `round-${String(round).padStart(2, '0')}.json`;
  const before = { points: { ...match.points }, history: match.rounds.map(r => r.places) };
  const t0 = Date.now(), sim = playRound({ map, brains: sources, names, rotation, retryLimits: { tries: Number(options['--tries']), restarts: Number(options['--restarts']) } }), result = sim.result, ms = Date.now() - t0;
  const replay = sim.replay();
  replay.players.forEach((p, i) => { p.short = short[i]; if (colors) p.color = colors[i]; });
  replay.match = { round, of: total, before };
  writeData(replayFile, replay);
  for (const k of KEYS) { match.points[k] += result.points[k]; match.cells[k] += result.cells[k]; }
  for (const k of result.winner) match.wins[k]++;
  match.rounds.push({ round, mapName: map.name, ...result, replay: replayFile });
  const line = KEYS.map(k => `${names[KEYS.indexOf(k)]} ${result.cells[k]} (+${result.points[k]})`).join(' · ');
  const trouble = KEYS.flatMap((k, i) => [
    !result.loaded[k] ? `${names[i]} did not load` : '',
    result.timeouts[k] ? `${names[i]} ${result.timeouts[k]} timeouts` : '',
    result.errors[k] ? `${names[i]} ${result.errors[k]} errors` : '',
  ]).filter(Boolean).join(', ');
  console.log(`Round ${String(round).padStart(2)} / ${map.name.padEnd(11)} ${line} · ${(ms / 1000).toFixed(1)} s` +
    (sim.restarts ? ` · ${sim.restarts} restarts` : '') + (trouble ? ` · ${trouble}` : ''));
}
const order = KEYS.slice().sort((a, b) => match.points[b] - match.points[a] || match.cells[b] - match.cells[a]);
const top = order.filter(k => match.points[k] === match.points[order[0]] && match.cells[k] === match.cells[order[0]]);
match.winner = top;
writeData('results.json', match);
console.log(`Match: ${order.map(k => `${match.names[k]} ${match.points[k]} pts (${match.cells[k]} cells)`).join(' · ')}. ` +
  `${top.length > 1 ? 'Tie' : match.names[top[0]] + ' wins'}. Saved ${out}`);
