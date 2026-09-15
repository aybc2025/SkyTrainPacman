# CLAUDE.md — SkyTrain Chase

Guide for picking up this repo cold. Read this before making changes.

## On opening this repo, run automatically

```bash
npm install && npm run build
```

**This build has never actually run end-to-end.** The repo was built in a sandboxed
environment with no network access (npm registry was unreachable — every `npm install`
attempt returned `403 Forbidden`), so while every source file was syntax-checked and
bundled successfully with a standalone `esbuild` binary found on the build machine (see
"How this was verified" below), the real `vite build` / `vite-plugin-pwa` pipeline has
never run. Treat the first `npm install && npm run build` as a real verification step:
fix errors and re-run until clean before doing anything else asked of you.

**Likely first-build friction points**, roughly in order of likelihood:
- `vite-plugin-pwa`'s manifest/service-worker generation is the piece most likely to
  need a version-compatibility tweak — it was never actually exercised.
- Google Fonts `@import` in `src/styles/global.css` requires network access at build
  *and* runtime (the font loads from `fonts.googleapis.com`); this is fine for a normal
  deploy but will 403 in a sandboxed/offline build environment, which is expected and
  not a bug in the CSS.
- CSS Modules (`*.module.css`) are used throughout — Vite handles these natively with
  zero config, but if you swap the bundler this is the first thing to re-verify.
- No `package-lock.json` exists yet (see below) — this is expected, not an error.

This first `npm install` is also what generates `package-lock.json` and silently wires
up the commit-blocking git hook (see "package-lock.json and CI" below) — no separate
action needed, but a commit may get blocked if `node_modules` exists without a
lockfile, and that block is intentional (see `.githooks/pre-commit`).

## How this was verified (in lieu of a real build)

No `npm`/`vite` build was possible, so verification instead used tools that happened to
be present on the build machine as transitive dependencies of unrelated global npm
packages:

- **esbuild** (found under a global `tsx` install's `node_modules`) syntax-checked
  every `.js`/`.jsx` file individually with zero errors, then bundled the entire app
  from `src/main.jsx` (resolving every import, processing every CSS Module) into a
  single working bundle with zero errors.
- **Playwright** (globally installed) loaded that bundle in real headless Chromium and
  exercised actual gameplay: movement, wall collision, dot collection, power mode,
  train collision (both fatal and power-mode capture), pause/resume, retry, exit-to-
  home, win/lose modal transitions, level-advance, and `localStorage` persistence
  across a full session — all confirmed working with zero runtime console/page errors.
- A **Python BFS solver** (`icon-design/` sibling — see `tools/gen_maze.py` for the
  maze generator, the solver itself was a one-off not committed) computed an optimal
  full-dot-collection path through Level 1's maze and replayed it via Playwright
  keyboard events to confirm the win condition fires at exactly the configured
  threshold score.
- This process caught and fixed two real bugs before they shipped: Level 5's threshold
  was mathematically unreachable (see "Intentional decisions" below), and the
  new-high-score comparison in `GameScreen.jsx` had a read-after-write race. Both are
  fixed in the current code. Re-run equivalent checks (or the real `vite build` +
  manual playtesting) after any change to `src/config/levels.js`, `useMazeEngine.js`,
  or `GameScreen.jsx` — those are exactly the files where this class of bug lives.

## package-lock.json and CI

**Currently in bootstrap state.** `.github/workflows/deploy.yml` uses plain
`npm install` with no `cache: 'npm'`, because no `package-lock.json` is committed yet
(it can't be — `npm install` never ran). The first real `npm install` in a networked
environment generates the lockfile; once it's committed, switch the workflow to the
locked state (`npm ci` + `cache: 'npm'`) per the `app-development` skill's GitHub
Actions rules. Don't make that switch speculatively — verify the lockfile is actually
tracked in git first (`git ls-files package-lock.json`).

The `prepare` script in `package.json` wires up `.githooks/pre-commit` automatically on
every `npm install`, so this happens without anyone needing to remember it. The hook
blocks any commit where `node_modules` exists but `package-lock.json` is missing or
untracked — if a commit gets blocked, that's the hook working as intended, not a bug.

## What you can NOT do here, even if asked

- Create or configure any backend service — this app has none by design (see
  "Intentional decisions"). Don't add Firebase, Netlify Functions, or any auth flow
  unless the person explicitly asks for a new feature that genuinely requires one.
- Push directly to `main` in a way that triggers an unreviewed deploy. Open a PR or
  otherwise let a human review before merging to the branch GitHub Pages deploys from.
- Obtain, generate, or handle real secret values. This app needs none currently; if a
  future feature adds one, name the manual step (adding a repo secret in GitHub
  Settings) rather than trying to work around it.

## Architecture

```
src/
  config/levels.js       — the single source of truth for maze layout, scoring
                            thresholds, and per-train behavior/speed. Adding a
                            level 6 means adding one object here — the engine
                            reads this generically and never special-cases a
                            level number.
  engine/                — pure game logic, no React rendering concerns
    collision.js            maze string parsing, walkability checks, BFS-based
                             power-dot placement (farthest from player start)
    trainAI.js               patrol / chase / intercept / flee movement, one
                              pure function per behavior
    useGameLoop.js            generic requestAnimationFrame ticker — no game
                              knowledge, reusable as-is in another project
    useMazeEngine.js          the state machine: owns player/train positions,
                              score, lives, phase. Emits one `lastEvent` field
                              (kind + nonce) for the render layer to observe —
                              see "Animation event channel" below.
  hooks/useHighScores.js — localStorage-backed progress: per-level high score,
                            completion, unlock state. Merges saved data against
                            fresh defaults on load so a newly-added level is
                            handled correctly even against an older save.
  components/
    HomeScreen/           — level list, lock/star/high-score display
    GameScreen/           — active gameplay: Hud, MazeCanvas, TouchControls,
                            PauseOverlay, all composed in GameScreen.jsx
    Modals/               — LevelCompleteModal, GameOverModal (share Modal.module.css)
    shared/               — Button.jsx, the one reused primitive
  styles/tokens.css       — the declared visual system (see below). Every
                            color/spacing/radius value in the app traces back
                            here; a value that doesn't is a bug.
tools/
  gen_maze.py             — the maze generator used to build all 5 levels'
                            layouts (carves walls into an open room, checking
                            full BFS connectivity after every carve). Kept in
                            the repo so a level 6+ maze can be regenerated
                            rather than hand-typed — hand-typing ASCII mazes
                            is exactly how the ragged-row and disconnected-
                            region bugs during this build happened.
  build_levels.py         — the script that ran gen_maze.py at 5 sizes and
                            placed P/C/E/M entities, producing the JS arrays
                            currently pasted into src/config/levels.js.
icon-design/make_icons.py — regenerate app icons here if the palette or motif
                            ever changes; don't hand-edit the PNGs.
```

### Animation event channel

`useMazeEngine` never imports or references animation code. When something
game-relevant happens (a dot is eaten, a train hits the player, a power-up
starts, the level resolves), it calls an internal `emit(kind, payload)` that
sets a single `lastEvent = { kind, payload, nonce }` state field — `nonce` is a
monotonically increasing counter, never the event data itself, specifically so
a consumer can detect "this is a new event" vs. "this is a re-render of the
same event" by comparing nonces, not payloads. `MazeCanvas.jsx`'s
`useFlashOnEvent` hook is the only consumer today (it drives the red
hit-flash and green win-flash borders). If you add a new visual effect for a
game event, watch `lastEvent` from the rendering layer — never add a
callback prop threaded through the engine, and never have the engine import
anything animation-related.

## Intentional decisions — do not revert without asking

- **No backend, no auth, no Firebase, no Netlify.** Per the approved spec, this
  is a fully local game — all progress lives in `localStorage`. Deployment is
  GitHub Pages only. Don't add a backend "for future features" without being
  asked; it's a deliberate simplicity choice, not an oversight.
- **Level thresholds are NOT the round numbers from the original spec.** The
  spec's HTML draft proposed round thresholds (300/600/1000/1500/2200) before
  any maze existed. Once real mazes were generated, Level 5's maximum possible
  score (every dot + every power dot, sum computed in `tools/`) was only 2090
  — strictly less than the spec's 2200 threshold, making that level
  mathematically unwinnable. All five thresholds were recalculated to sit at a
  fixed, increasing fraction of each level's actual max score
  (0.42 → 0.55 → 0.68 → 0.75 → 0.80), verified programmatically. If you
  regenerate any maze, recompute its max score
  (`dots × 10 + powerDots × 50`) and re-derive the threshold — never hand-pick
  a round number again without checking it against the actual maze.
- **Mazes are generator output, not hand-typed.** `tools/gen_maze.py` carves
  walls into an open room while checking full BFS connectivity after every
  single carve, so the result is guaranteed to have zero unreachable dots and
  zero border leaks. Three separate hand-typed maze attempts during this build
  had ragged rows, disconnected chambers, or open borders that a build step
  would never have caught (they're valid JS strings, just wrong game
  geometry) — regenerate, don't hand-edit, if a maze needs to change size.
- **Replay/retry remounts the component instead of reloading the page.**
  `App.jsx` holds a `sessionKey` that increments on every level entry/restart,
  passed as `GameScreen`'s React `key` — this gives a clean fresh
  `useMazeEngine` instance instantly, which matters both for a good replay
  feel and because a real page reload would be a jarring, unnecessary reset
  for a PWA meant to also work offline.
- **New-high-score detection snapshots the previous score in a ref before
  calling `onLevelComplete`.** Reading `getLevelProgress()` after that call
  would read the score that was just written, not the true previous one — see
  the "How this was verified" section above for how this bug was caught.
- **D-pad directions are NOT RTL-mirrored** (`TouchControls.module.css`). This
  is a deliberate exception to the app's general RTL-mirroring rule: these are
  physical screen directions the player's thumb already learned, not
  reading-order UI, so up/down/left/right stay fixed regardless of `dir`.

## The declared visual system

From `src/styles/tokens.css` — the single source every color/spacing/radius
value in the app must trace back to:

- **Palette**: dark station-at-night blue background (`--bg`, `--bg-panel`,
  `--bg-card` — three elevation levels); the three real SkyTrain line colors
  used only for their trains (`--expo` #0057B8, `--millennium` #FDB913,
  `--canada` #00B2A9 — verified against TransLink's actual line branding, do
  not alter); `--track` #FF6B4A as the one neutral accent for the player,
  points, and primary actions (deliberately distinct from all three line
  colors so the player sprite is never confused for a train); `--good` /
  `--bad` for win/power-up and hit/loss states.
- **Type**: Heebo (700–900) for all UI text — chosen for full Hebrew support
  and a geometric, station-signage feel; JetBrains Mono for all numbers/scores
  (the "digital departure board" register).
- **Spacing**: 4px base — `--space-1` through `--space-12`.
- **Radius**: one strategy, small-uniform — `--radius-sm` (8px) /
  `--radius-md` (12px) / `--radius-lg` (16px) / `--radius-pill`. No
  per-component radius decisions outside these four values.
- **Motion**: `--ease-out` for entrances, `--ease-in-out` for continuous
  sprite movement; `--dur-fast` (140ms) for taps, `--dur-base` (220ms) for
  sprite transitions, `--dur-modal` (320ms) for modal pop-in. All collapse to
  1ms under `prefers-reduced-motion`.
- **RTL**: `--dir` sign token (1 / -1) declared for any future transform-based
  mirroring; logical CSS properties preferred throughout. The one deliberate
  non-mirrored exception is the D-pad (see "Intentional decisions" above).

## App icons

**Concept**: the three real SkyTrain line colors (Expo navy → Canada turquoise
→ Millennium yellow) form the same diagonal gradient used in the home-screen
logo mockup from the approved spec, with a rounded orange chevron-and-dot
glyph on top — the chevron suggests directional motion ("chase"), the trailing
white dot echoes the maze dots from the game itself, and the orange matches
`--track`, the same color as the player sprite in-game.

Generator: `icon-design/make_icons.py` (built at 8× final size, downsampled
with `Image.LANCZOS`). Regenerate from this script if the palette changes —
don't hand-edit the PNGs directly.

Full set generated, verified (viewed at full size, maskable variant simulated
through a circular crop, downscaled to 96px/48px to confirm legibility), and
wired in:
- `public/icons/icon-192.png`, `icon-512.png` (`purpose: 'any'` in the
  manifest), `icon-512-maskable.png` (`purpose: 'maskable'`) — all referenced
  in `vite.config.js`'s `VitePWA` manifest config.
- `apple-touch-icon.png`, `favicon-32.png` — referenced via `<link>` tags in
  `index.html`.

## Commands reference

```bash
npm run dev       # local dev server
npm run build     # production build to dist/
npm run preview   # preview the production build locally
```

## Deployment model

GitHub Pages, deployed automatically via `.github/workflows/deploy.yml` on
every push to `main`: the workflow installs dependencies, runs `npm run
build`, and publishes `dist/` to the `gh-pages` environment. No manual step is
needed for an ordinary content/code change once the repo exists on GitHub.

**One manual step required once, outside this repo and outside anything
Claude Code can do:** a human needs to create the GitHub repository itself,
push this code to it, and enable GitHub Pages (Settings → Pages → Source:
GitHub Actions) the first time. After that, every push to `main` deploys
automatically. If the repo is ever renamed, update `REPO_NAME` in
`vite.config.js` — the Vite `base` path must match the repo name for GitHub
Pages' subpath routing to work.

No Firebase project, no Netlify site, and no secrets need to exist anywhere —
per the "Intentional decisions" section above, this app has no backend.
