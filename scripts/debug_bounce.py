"""
Headless test harness for the hero bouncing particle.
Loads the live site, taps the particle, and samples its bounding-box every
100ms for 5 seconds, reporting any frames where any part of the ball is
outside the viewport.

Run from repo root:
    python scripts/debug_bounce.py
"""

import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

URL = "https://andesvirustracker.github.io/?cb=" + str(int(time.time()))
VIEWPORTS = [
    ("desktop", 1366, 768),
    ("laptop",  1280, 800),
    ("narrow",  1024, 720),
]
OUT_DIR = Path(__file__).parent.parent / "scripts" / "debug-out"
OUT_DIR.mkdir(parents=True, exist_ok=True)


def run(viewport_name, vw, vh):
    print(f"\n=== {viewport_name} {vw}x{vh} ===")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(viewport={"width": vw, "height": vh})
        page = ctx.new_page()
        page.goto(URL, wait_until="networkidle", timeout=30000)
        time.sleep(0.5)

        # Hit "Tap me"
        page.click(".hero-particle-button")
        # Make sure animations are running
        time.sleep(0.2)

        # Snapshot once near launch
        page.screenshot(path=str(OUT_DIR / f"{viewport_name}-launch.png"))

        violations = []
        positions = []
        for i in range(50):
            t = (i + 1) * 0.1
            data = page.evaluate("""
              () => {
                const p = document.querySelector('.hero-particle');
                if (!p) return null;
                const r = p.getBoundingClientRect();
                return {
                  x: r.left, y: r.top,
                  right: r.right, bottom: r.bottom,
                  w: r.width, h: r.height,
                  vw: window.innerWidth, vh: window.innerHeight,
                  transform: getComputedStyle(p).transform.slice(0, 80),
                  cls: p.className
                };
              }
            """)
            if data is None:
                continue
            positions.append((round(t, 1), data))
            outside = (
                data["x"] < -1 or data["y"] < -1
                or data["right"]  > data["vw"] + 1
                or data["bottom"] > data["vh"] + 1
            )
            if outside:
                violations.append((round(t, 1), data))
            time.sleep(0.1)

        page.screenshot(path=str(OUT_DIR / f"{viewport_name}-mid.png"), full_page=False)

        print(f"  ball size: {positions[0][1]['w']:.0f} x {positions[0][1]['h']:.0f}")
        print(f"  viewport: {positions[0][1]['vw']} x {positions[0][1]['vh']}")
        print(f"  position samples: {len(positions)}")
        print(f"  off-screen frames: {len(violations)}")
        for t, d in violations[:8]:
            print(f"    t={t}s  rect=({d['x']:.0f},{d['y']:.0f})..({d['right']:.0f},{d['bottom']:.0f})  vw={d['vw']} vh={d['vh']}")

        # Final positions report
        last = positions[-1][1]
        print(f"  final pos: ({last['x']:.0f},{last['y']:.0f})  transform={last['transform']}")

        browser.close()
        return violations


def main():
    total_violations = 0
    for name, w, h in VIEWPORTS:
        v = run(name, w, h)
        total_violations += len(v)
    print(f"\nTotal off-screen frames across all viewports: {total_violations}")
    print(f"Screenshots saved to: {OUT_DIR}")


if __name__ == "__main__":
    main()
