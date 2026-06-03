"""
Aaroine Logo Generator
Recreates the logo programmatically using PIL + numpy.
Run: pip install pillow numpy && python aaroine_logo.py
Output: aaroine_logo.png
"""

from PIL import Image, ImageDraw, ImageFont, ImageFilter
import numpy as np
import math

WIDTH, HEIGHT = 1080, 1080
img = Image.new("RGBA", (WIDTH, HEIGHT), (255, 255, 255, 255))
draw = ImageDraw.Draw(img)

# ──────────────────────────────────────────────
# 1.  GRADIENT "A" SHAPE  (drawn on a temp layer)
# ──────────────────────────────────────────────

# We'll build the shape as a numpy mask, then colorise with a gradient.

icon_w, icon_h = 520, 480
icon_x0, icon_y0 = (WIDTH - icon_w) // 2, 130        # top-left of icon bbox

# Create a high-res mask for the A shape
SCALE = 4
mw, mh = icon_w * SCALE, icon_h * SCALE

mask = Image.new("L", (mw, mh), 0)
md = ImageDraw.Draw(mask)

# ── Outer outline of the A (rounded arch) ──
# The A is a thick ribbon.  We approximate it with a wide polygon
# then subtract the inner triangle and the crossbar gap.

def pt(x_frac, y_frac):
    """Convert 0-1 fractions to mask pixels."""
    return (int(x_frac * mw), int(y_frac * mh))

# Outer arch – roughly an upside-down U with angled legs
outer = [
    pt(0.13, 1.00),   # bottom-left outer
    pt(0.00, 0.62),   # left side, lower
    pt(0.30, 0.00),   # top-left of arch
    pt(0.50, 0.00),   # top-right of arch  (rounded peak handled by antialias)
    pt(0.70, 0.00),
    pt(1.00, 0.62),
    pt(0.87, 1.00),   # bottom-right outer
    pt(0.66, 1.00),   # bottom-right inner start
    pt(0.84, 0.60),
    pt(0.60, 0.08),
    pt(0.40, 0.08),
    pt(0.16, 0.60),
    pt(0.34, 1.00),   # bottom-left inner end
]
md.polygon(outer, fill=255)

# Inner negative-space triangle (the "hole" inside the A)
inner_tri = [
    pt(0.37, 0.38),
    pt(0.50, 0.18),
    pt(0.63, 0.38),
]
md.polygon(inner_tri, fill=0)

# Bottom gap / crossbar notch – the two legs cross; carve a small
# V-notch at the bottom center to show the overlap fold
notch = [
    pt(0.44, 0.78),
    pt(0.50, 0.68),
    pt(0.56, 0.78),
    pt(0.56, 1.00),
    pt(0.44, 1.00),
]
md.polygon(notch, fill=0)

# Smooth the mask slightly
mask = mask.filter(ImageFilter.GaussianBlur(SCALE * 1.5))
mask = mask.resize((icon_w, icon_h), Image.LANCZOS)

# ── Gradient colorisation ──
grad = Image.new("RGBA", (icon_w, icon_h))
grad_arr = np.zeros((icon_h, icon_w, 4), dtype=np.uint8)

# Gradient: top-left bright blue → bottom-right deep navy-blue
color_tl = np.array([60,  140, 255, 255])   # #3C8CFF
color_br = np.array([20,   45, 180, 255])   # #142DB4
color_fold = np.array([10, 25, 130, 255])   # dark fold #0A197A

for y in range(icon_h):
    for x in range(icon_w):
        t = (x / icon_w + y / icon_h) / 2.0   # diagonal factor 0→1
        # extra darkening near the bottom-center fold
        fold_proximity = max(0, 1 - math.hypot((x/icon_w - 0.5)*2,
                                                (y/icon_h - 0.85)*3))
        base = (1 - t) * color_tl + t * color_br
        c = (1 - fold_proximity) * base + fold_proximity * color_fold
        grad_arr[y, x] = c.astype(np.uint8)

grad = Image.fromarray(grad_arr, "RGBA")

# Apply mask as alpha
mask_arr = np.array(mask)
grad_arr2 = np.array(grad)
grad_arr2[:, :, 3] = mask_arr
result_icon = Image.fromarray(grad_arr2, "RGBA")

# Paste icon onto canvas
img.paste(result_icon, (icon_x0, icon_y0), result_icon)

# ──────────────────────────────────────────────
# 2.  TEXT  "Aaroine"
# ──────────────────────────────────────────────

# Try to use a bold sans-serif font; fall back to default if unavailable
font_size = 148
font_paths = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    "/System/Library/Fonts/Helvetica.ttc",
    "arial.ttf",
]
font = None
for fp in font_paths:
    try:
        font = ImageFont.truetype(fp, font_size)
        break
    except OSError:
        continue
if font is None:
    font = ImageFont.load_default()

text = "Aaroine"
navy = (13, 27, 62, 255)   # #0D1B3E

# Measure text
bbox = draw.textbbox((0, 0), text, font=font)
tw = bbox[2] - bbox[0]
th = bbox[3] - bbox[1]

text_x = (WIDTH - tw) // 2 - bbox[0]
text_y = icon_y0 + icon_h + 55

draw.text((text_x, text_y), text, font=font, fill=navy)

# ── Replace the dot over "i" with a bright blue circle ──
# Find the "i" position: measure width of "Aaroine" up to and including "i"
prefix_real = "Aaroi"
pbbox = draw.textbbox((0, 0), prefix_real, font=font)
i_right = text_x + pbbox[2] - bbox[0]

# Measure just "i" to get its width
ibbox = draw.textbbox((0, 0), "i", font=font)
i_w = ibbox[2] - ibbox[0]
i_x_center = i_right - i_w // 2 - 2

# Dot position: just above the text baseline ascender
dot_r = 10
dot_cy = text_y + 12     # near the top of capital letters
dot_color = (60, 140, 255, 255)   # same bright blue as icon

# Paint over old dot with background colour first
draw.ellipse(
    [i_x_center - dot_r - 4, dot_cy - dot_r - 4,
     i_x_center + dot_r + 4, dot_cy + dot_r + 10],
    fill=(255, 255, 255, 255)
)
# Draw new bright-blue dot
draw.ellipse(
    [i_x_center - dot_r, dot_cy,
     i_x_center + dot_r, dot_cy + dot_r * 2],
    fill=dot_color
)

# ──────────────────────────────────────────────
# 3.  SAVE
# ──────────────────────────────────────────────
out = img.convert("RGB")
out.save("aaroine_logo.png", dpi=(300, 300))
print("Saved → aaroine_logo.png")
