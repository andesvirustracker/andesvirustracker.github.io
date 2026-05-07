"""
Inline the isolated virus particle PNG into the social SVGs as a base64
data: URI. Required because when an SVG is used as an <img> source (which is
how X reads profile/banner uploads, and how preview.html converts SVG→PNG via
canvas), browsers block external resources referenced by <image href="..."/>
inside the SVG. Embedding the PNG works around this restriction.

Run from repo root after updating the source PNG:
    python scripts/embed_particle.py
"""

import base64
import re
from pathlib import Path

ROOT = Path(__file__).parent.parent
PNG  = ROOT / "assets" / "social" / "virus-particle-isolated.png"
SVGS = [
    ROOT / "assets" / "social" / "profile.svg",
    ROOT / "assets" / "social" / "banner.svg",
]

# Match either the bare relative href or a previously-inlined data URI so the
# script is idempotent (re-running just refreshes the embed).
HREF_PATTERN = re.compile(
    r'href="(?:virus-particle-isolated\.png|data:image/png;base64,[^"]+)"'
)


def main():
    if not PNG.exists():
        raise SystemExit(f"PNG not found at {PNG}")

    raw = PNG.read_bytes()
    b64 = base64.b64encode(raw).decode("ascii")
    uri = f"data:image/png;base64,{b64}"
    print(f"Embedding {PNG.name}: {len(raw) // 1024} KB -> base64 {len(uri) // 1024} KB")

    for svg in SVGS:
        if not svg.exists():
            print(f"  skip (missing): {svg.name}")
            continue
        before = svg.read_text(encoding="utf-8")
        after, n = HREF_PATTERN.subn(f'href="{uri}"', before)
        if n == 0:
            print(f"  skip (no <image href> match): {svg.name}")
            continue
        svg.write_text(after, encoding="utf-8")
        print(f"  inlined {n} ref(s) in {svg.name} -> {svg.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
