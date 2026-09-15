import sys, random
sys.path.insert(0, '/tmp')
from gen_maze import generate, bfs_reachable, total_floor

def place_entities(maze, entities, seed):
    """entities: list of single-char labels to place on distinct floor cells,
    spread apart from each other using farthest-point-ish sampling."""
    rnd = random.Random(seed)
    grid = [list(row) for row in maze]
    rows, cols = len(grid), len(grid[0])
    floor_cells = [(r,c) for r in range(rows) for c in range(cols) if grid[r][c] == '.']
    rnd.shuffle(floor_cells)

    chosen = []
    for cell in floor_cells:
        if len(chosen) == len(entities):
            break
        if not chosen:
            chosen.append(cell)
            continue
        # require reasonable distance from all previously chosen cells
        min_dist = min(abs(cell[0]-pc[0]) + abs(cell[1]-pc[1]) for pc in chosen)
        if min_dist >= max(3, min(rows, cols) // 3):
            chosen.append(cell)

    if len(chosen) < len(entities):
        # fallback: just take any remaining distinct floor cells
        for cell in floor_cells:
            if cell not in chosen:
                chosen.append(cell)
            if len(chosen) == len(entities):
                break

    for label, (r, c) in zip(entities, chosen):
        grid[r][c] = label

    return [''.join(row) for row in grid]

def validate_full(name, maze, expected_labels):
    rows = len(maze)
    cols = len(maze[0])
    lengths = set(len(r) for r in maze)
    ok = True
    if len(lengths) != 1:
        print(f"{name}: RAGGED {lengths}"); return False
    for c in range(cols):
        if maze[0][c] != '#' or maze[rows-1][c] != '#':
            print(f"{name}: border leak col {c}"); ok = False
    for r in range(rows):
        if maze[r][0] != '#' or maze[r][cols-1] != '#':
            print(f"{name}: border leak row {r}"); ok = False
    flat = ''.join(maze)
    for label in expected_labels:
        cnt = flat.count(label)
        if cnt != 1:
            print(f"{name}: label {label} count={cnt}, expected 1"); ok = False
    grid = [list(r) for r in maze]
    start = None
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == 'P':
                start = (r,c)
    if start:
        reachable = bfs_reachable(grid, start)
        floor = sum(1 for r in range(rows) for c in range(cols) if grid[r][c] != '#')
        if len(reachable) != floor:
            print(f"{name}: DISCONNECTED {len(reachable)}/{floor}"); ok = False
    if ok:
        print(f"{name}: OK ({rows}x{cols})")
    return ok

# Level configs: (interior_rows, interior_cols, wall_fraction, seed, entities)
configs = [
    (9, 9, 0.32, 101, ['P', 'C']),
    (11, 11, 0.34, 102, ['P', 'C', 'E']),
    (13, 13, 0.36, 103, ['P', 'C', 'E', 'M']),
    (15, 17, 0.38, 104, ['P', 'C', 'E', 'M']),
    (17, 19, 0.40, 105, ['P', 'C', 'E', 'M']),
]

names = ['LEVEL_1_MAZE','LEVEL_2_MAZE','LEVEL_3_MAZE','LEVEL_4_MAZE','LEVEL_5_MAZE']
results = []
for i, (rows, cols, frac, seed, entities) in enumerate(configs):
    maze = generate(rows, cols, frac, seed)
    maze = place_entities(maze, entities, seed + 1000)
    ok = validate_full(names[i], maze, entities)
    results.append((names[i], maze, ok))

print()
print("---- JS OUTPUT ----")
for name, maze, ok in results:
    lines = ",\n  ".join(f"'{row}'" for row in maze)
    print(f"const {name} = [\n  {lines}\n];\n")
