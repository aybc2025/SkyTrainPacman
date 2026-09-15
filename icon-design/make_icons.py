"""
Icon generator for SkyTrain Chase.

Concept: the three real SkyTrain line colors (Expo navy blue, Canada
turquoise, Millennium yellow) form a diagonal gradient background — the same
motif used on the app's home-screen logo mockup in the approved spec — with a
simple pac-man-style "chase" glyph on top: a rounded chevron/arrow shape
suggesting motion along a track, in the neutral player-orange accent color so
it reads clearly against all three background hues.

Built at 8x final size and downsampled with LANCZOS per app-development
skill's icon guidance, so edges stay crisp instead of jagged.
"""
from PIL import Image, ImageDraw
import math
import os

OUT_DIR = "/home/claude/skytrain-chase/public/icons"
os.makedirs(OUT_DIR, exist_ok=True)

# Colors from the declared visual system (src/styles/tokens.css)
EXPO = (0, 87, 184)         # #0057B8
CANADA = (0, 178, 169)      # #00B2A9
MILLENNIUM = (253, 185, 19) # #FDB913
TRACK = (255, 107, 74)      # #FF6B4A — player / accent
BG_DARK = (11, 18, 32)      # #0B1220

SCALE = 8
FINAL = 512
SIZE = FINAL * SCALE  # working canvas size


def make_gradient_background(size):
    """Diagonal 3-stop gradient: Expo -> Canada -> Millennium, top-left to
    bottom-right, matching the home-screen logo mockup from the spec."""
    img = Image.new("RGB", (size, size))
    px = img.load()
    stops = [EXPO, CANADA, MILLENNIUM]
    for y in range(size):
        for x in range(0, size, 4):  # step by 4, fill blocks (perf: avoid full per-pixel loop cost)
            t = (x + y) / (2 * size)  # 0..1 diagonal position
            t = max(0.0, min(1.0, t))
            if t < 0.5:
                local_t = t / 0.5
                c0, c1 = stops[0], stops[1]
            else:
                local_t = (t - 0.5) / 0.5
                c0, c1 = stops[1], stops[2]
            r = int(c0[0] + (c1[0] - c0[0]) * local_t)
            g = int(c0[1] + (c1[1] - c0[1]) * local_t)
            b = int(c0[2] + (c1[2] - c0[2]) * local_t)
            for xx in range(x, min(x + 4, size)):
                px[xx, y] = (r, g, b)
    return img


def rounded_rect_mask(size, radius_ratio):
    mask = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(mask)
    radius = int(size * radius_ratio)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    return mask


def draw_glyph(draw, cx, cy, r):
    """Draw a simple rounded chevron/play-style arrow to suggest a train
    moving along a track — the 'chase' motif — plus a small trailing dot
    to read as a train-and-track silhouette rather than a generic arrow."""
    # Main chevron: three thick rounded strokes forming a right-pointing arrow
    # (works fine un-mirrored for RTL since it's a brand mark, not UI text).
    stroke_w = int(r * 0.34)

    def thick_line(p1, p2):
        draw.line([p1, p2], fill=TRACK, width=stroke_w)
        # rounded caps
        for p in (p1, p2):
            draw.ellipse(
                [p[0] - stroke_w / 2, p[1] - stroke_w / 2, p[0] + stroke_w / 2, p[1] + stroke_w / 2],
                fill=TRACK,
            )

    top = (cx - r * 0.55, cy - r * 0.62)
    tip = (cx + r * 0.62, cy)
    bottom = (cx - r * 0.55, cy + r * 0.62)

    thick_line(top, tip)
    thick_line(tip, bottom)

    # small trailing dot (echoes the maze "dot" motif from the game itself)
    dot_r = r * 0.12
    dot_c = (cx - r * 0.85, cy)
    draw.ellipse(
        [dot_c[0] - dot_r, dot_c[1] - dot_r, dot_c[0] + dot_r, dot_c[1] + dot_r],
        fill=(255, 255, 255, 235),
    )


def build_icon(maskable=False):
    img = make_gradient_background(SIZE)

    if maskable:
        # Maskable: background fills edge-to-edge (required), glyph scaled
        # down into the ~72-80% safe zone so nothing meaningful touches the
        # circular/squircle crop area.
        canvas = img.convert("RGBA")
        draw = ImageDraw.Draw(canvas)
        cx, cy = SIZE / 2, SIZE / 2
        glyph_r = SIZE * 0.27  # well within safe zone
        draw_glyph(draw, cx, cy, glyph_r)
        return canvas
    else:
        # Regular icon: rounded-square mask (station-signage radius, matches
        # the app's own --radius-lg strategy) with the glyph filling more of
        # the canvas since there's no OS crop to worry about.
        mask = rounded_rect_mask(SIZE, 0.22)
        canvas = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
        canvas.paste(img, (0, 0), mask)
        draw = ImageDraw.Draw(canvas)
        cx, cy = SIZE / 2, SIZE / 2
        glyph_r = SIZE * 0.33
        draw_glyph(draw, cx, cy, glyph_r)
        return canvas


def save_all():
    regular = build_icon(maskable=False)
    maskable = build_icon(maskable=True)

    targets = [
        (regular, "icon-512.png", 512),
        (regular, "icon-192.png", 192),
        (regular, "apple-touch-icon.png", 180),
        (regular, "favicon-32.png", 32),
        (maskable, "icon-512-maskable.png", 512),
    ]

    for source, filename, target_size in targets:
        resized = source.resize((target_size, target_size), Image.LANCZOS)
        resized.save(os.path.join(OUT_DIR, filename))
        print(f"Saved {filename} ({target_size}x{target_size})")


if __name__ == "__main__":
    save_all()
