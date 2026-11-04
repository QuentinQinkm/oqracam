#!/usr/bin/env python3
"""Bakes the page light: one small, heavily blurred copy of each photo the background
can follow. Baking ahead means phones do no image work for it, and the files are small
enough to fetch before they are needed. Re-run after changing any of these photos:

    python3 scripts/bake-light.py
"""
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets/img/light"
WIDTH, HEIGHT = 96, 60
BLUR_X, BLUR_Y = 9, 6
SATURATION, GAIN = 1.9, 0.78

SAMPLES = ROOT / "assets/img/samples"
PHOTOS = [p for look in ("golden", "sunburn", "window", "monor")
          for p in sorted(SAMPLES.glob(f"*_{look}.webp"))]
PHOTOS += sorted((ROOT / "assets/img/scenes").glob("scene-*.webp"))
PHOTOS += [SAMPLES / "build-7-halation.webp",
           ROOT / "assets/img/flow/edit-1000.webp",
           ROOT / "assets/img/app/native-control.webp"]


def box(a, radius, axis):
    """One box blur along an axis, holding the edge value past each end."""
    pad = [(0, 0)] * a.ndim
    pad[axis] = (radius + 1, radius)
    total = np.cumsum(np.pad(a, pad, mode="edge"), axis=axis)
    n = total.shape[axis]
    return (np.take(total, range(2 * radius + 1, n), axis=axis) -
            np.take(total, range(0, n - 2 * radius - 1), axis=axis)) / (2 * radius + 1)


# Bright near the middle of the screen, gone before the edges.
Y, X = np.mgrid[0:HEIGHT, 0:WIDTH].astype(np.float32)
radius = np.hypot((X / (WIDTH - 1) - 0.5) / 1.2, (Y / (HEIGHT - 1) - 0.45) / 0.9)
FALLOFF = 1 - np.clip((radius - 0.15) / 0.73, 0, 1)

OUT.mkdir(parents=True, exist_ok=True)
for photo in PHOTOS:
    small = Image.open(photo).convert("RGB").resize((WIDTH, HEIGHT), Image.BOX)
    rgb = np.asarray(small, np.float32)
    for _ in range(3):      # three box blurs look Gaussian
        rgb = box(box(rgb, BLUR_X, 1), BLUR_Y, 0)
    luma = rgb @ np.array([0.3, 0.59, 0.11], np.float32)
    rgb = luma[..., None] + (rgb - luma[..., None]) * SATURATION
    rgb = np.clip(rgb * GAIN * FALLOFF[..., None], 0, 255)
    Image.fromarray((rgb + 0.5).astype(np.uint8)).save(
        OUT / f"{photo.stem}.webp", lossless=True, method=6)
