"""
Generate a Pac-Man-style maze by carving walls into an open room, checking
connectivity after every carve so the result is guaranteed fully connected.
Deterministic (seeded) so results are reproducible and reviewable.
"""
import random
from collections import deque

def bfs_reachable(grid, start):
    rows, cols = len(grid), len(grid[0])
    seen = {start}
    q = deque([start])
    while q:
        r, c = q.popleft()
        for dr, dc in [(0,1),(0,-1),(1,0),(-1,0)]:
            nr, nc = r+dr, c+dc
            if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] != '#' and (nr,nc) not in seen:
                seen.add((nr,nc))
                q.append((nr,nc))
    return seen

def total_floor(grid):
    return sum(1 for row in grid for ch in row if ch != '#')

def generate(rows, cols, wall_fraction, seed, symmetric=True):
    """
    rows, cols: interior playable size will be rows x cols (both odd interior
    recommended for symmetry); border walls are added automatically making the
    final grid (rows+2) x (cols+2).
    wall_fraction: target fraction of interior cells to convert to walls.
    symmetric: mirror wall placement left-right for a classic maze look.
    """
    rnd = random.Random(seed)
    R, C = rows + 2, cols + 2
    grid = [['.' for _ in range(C)] for _ in range(R)]
    # border
    for c in range(C):
        grid[0][c] = '#'
        grid[R-1][c] = '#'
    for r in range(R):
        grid[r][0] = '#'
        grid[r][C-1] = '#'

    interior_cells = [(r, c) for r in range(1, R-1) for c in range(1, C-1)]
    rnd.shuffle(interior_cells)

    target_walls = int(len(interior_cells) * wall_fraction)
    placed = 0
    mid_col = C // 2

    for (r, c) in interior_cells:
        if placed >= target_walls:
            break
        if grid[r][c] == '#':
            continue
        mirror_c = C - 1 - c
        candidates = [(r, c)]
        if symmetric and mirror_c != c:
            candidates.append((r, mirror_c))

        # tentatively wall them
        old_vals = [grid[rr][cc] for rr, cc in candidates]
        for rr, cc in candidates:
            grid[rr][cc] = '#'

        # verify still connected and no 2x2 open pocket destroyed into isolation
        # find any open cell to BFS from
        start = None
        for rr in range(1, R-1):
            for cc in range(1, C-1):
                if grid[rr][cc] != '#':
                    start = (rr, cc)
                    break
            if start:
                break
        if start is None:
            # revert, can't wall everything
            for (rr, cc), old in zip(candidates, old_vals):
                grid[rr][cc] = old
            continue

        reachable = bfs_reachable(grid, start)
        floor = total_floor(grid)
        if len(reachable) == floor:
            placed += len(candidates)
        else:
            for (rr, cc), old in zip(candidates, old_vals):
                grid[rr][cc] = old

    return [''.join(row) for row in grid]

if __name__ == '__main__':
    import sys
    rows = int(sys.argv[1])
    cols = int(sys.argv[2])
    frac = float(sys.argv[3])
    seed = int(sys.argv[4])
    maze = generate(rows, cols, frac, seed)
    for row in maze:
        print(row)
