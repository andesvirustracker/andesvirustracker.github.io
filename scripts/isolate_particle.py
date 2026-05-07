"""
One-shot script: take the source virus photograph, isolate ONLY the central
in-focus particle (drop background AND any out-of-focus particles), and
export as a clean transparent square PNG ready to spin/scale on the website.

Run from the repo root:
    python scripts/isolate_particle.py
"""

import sys
from pathlib import Path

import numpy as np
from PIL import Image
from rembg import remove, new_session
from scipy import ndimage

ROOT = Path(__file__).parent.parent
SRC = ROOT / "assets" / "social" / "virus-particle.jpg"
OUT = ROOT / "assets" / "social" / "virus-particle-isolated.png"


def main():
    if not SRC.exists():
        raise SystemExit(f"Source not found: {SRC}")

    print(f"Loading {SRC} ...")
    src_img = Image.open(SRC).convert("RGBA")
    print(f"  source size: {src_img.size}")

    session = new_session("isnet-general-use")
    print("Removing background (cached after first run)...")
    cut = remove(
        src_img, session=session,
        alpha_matting=True,
        alpha_matting_foreground_threshold=240,
        alpha_matting_background_threshold=10,
        alpha_matting_erode_size=2,
    )
    print("  background gone.")

    # Keep only the LARGEST connected opaque blob (= the main in-focus particle)
    arr = np.array(cut)
    alpha = arr[..., 3]
    mask = alpha > 32  # threshold to ignore faint pixels

    labeled, n = ndimage.label(mask)
    if n == 0:
        raise SystemExit("No subject detected in image.")

    sizes = ndimage.sum(mask, labeled, range(1, n + 1))
    largest = int(np.argmax(sizes)) + 1
    print(f"  found {n} blobs; keeping the largest ({int(sizes[largest - 1])} px).")

    keep = (labeled == largest)
    arr[..., 3] = np.where(keep, alpha, 0)
    cleaned = Image.fromarray(arr, mode="RGBA")

    # Crop to subject bbox
    bbox = cleaned.getbbox()
    if bbox:
        cleaned = cleaned.crop(bbox)
        print(f"  cropped to subject: {cleaned.size}")

    # Pad to square for clean rotation
    w, h = cleaned.size
    side = max(w, h) + 60
    square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    square.paste(cleaned, ((side - w) // 2, (side - h) // 2), cleaned)
    print(f"  squared canvas: {square.size}")

    # Downscale for the web
    if square.size[0] > 1024:
        square.thumbnail((1024, 1024), Image.LANCZOS)
        print(f"  resized to: {square.size}")

    square.save(OUT, "PNG", optimize=True)
    size_kb = OUT.stat().st_size // 1024
    sys.stdout.write(f"Saved -> {OUT}  ({size_kb} KB)\n")


if __name__ == "__main__":
    main()
