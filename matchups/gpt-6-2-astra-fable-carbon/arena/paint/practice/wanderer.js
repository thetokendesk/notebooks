// Practice opponent: walks one way until blocked, then turns right.
function brain(state, memory) {
  const order = ['up', 'right', 'down', 'left'];
  const step = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] };
  memory.d = memory.d ?? 0;
  for (let i = 0; i < 4; i++) {
    const dir = order[(memory.d + i) % 4];
    const x = state.me.x + step[dir][0], y = state.me.y + step[dir][1];
    if (x >= 0 && y >= 0 && x < state.width && y < state.height && state.grid[y][x] !== -1 && !state.painters.some((p) => p.x === x && p.y === y)) {
      memory.d = (memory.d + i) % 4;
      return dir;
    }
  }
  return 'stay';
}
