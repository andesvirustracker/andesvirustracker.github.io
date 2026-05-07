"""
Build a real, recognisable world-map SVG path string from a public-domain
simplified GeoJSON, projected into the banner's coordinate system, and
write the result into assets/social/banner.svg between the markers
<!-- WORLDMAP-START --> ... <!-- WORLDMAP-END -->.

Run from repo root:
    python scripts/generate_worldmap.py
"""

import json
import re
import urllib.request
from pathlib import Path

ROOT = Path(__file__).parent.parent
BANNER = ROOT / "assets" / "social" / "banner.svg"
GEOJSON_URL = "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson"

# Map area inside the banner (matches earlier coords in the SVG)
MAP_X0, MAP_Y0 = 80,  110
MAP_X1, MAP_Y1 = 1050, 430

# Skip Antarctica — it sprawls across the whole bottom and obscures the legend
SKIP_NAMES = {"Antarctica"}


def project(lon, lat):
    """Equirectangular projection lon,lat -> banner x,y."""
    x = MAP_X0 + (lon + 180) * (MAP_X1 - MAP_X0) / 360
    y = MAP_Y0 + (90 - lat) * (MAP_Y1 - MAP_Y0) / 180
    return x, y


def simplify(coords, tolerance=0.6):
    """Drop consecutive points that are closer than `tolerance` pixels."""
    if not coords:
        return coords
    out = [coords[0]]
    for pt in coords[1:]:
        dx = pt[0] - out[-1][0]
        dy = pt[1] - out[-1][1]
        if dx * dx + dy * dy >= tolerance * tolerance:
            out.append(pt)
    if out[-1] != coords[-1]:
        out.append(coords[-1])
    return out


def ring_to_path(ring):
    pts = [project(lon, lat) for lon, lat in ring]
    pts = simplify(pts, tolerance=0.6)
    if len(pts) < 3:
        return ""
    cmds = [f"M{pts[0][0]:.1f},{pts[0][1]:.1f}"]
    for x, y in pts[1:]:
        cmds.append(f"L{x:.1f},{y:.1f}")
    cmds.append("Z")
    return "".join(cmds)


def feature_to_path(feature):
    name = (feature.get("properties") or {}).get("name", "")
    if name in SKIP_NAMES:
        return ""
    geom = feature["geometry"]
    parts = []
    if geom["type"] == "Polygon":
        for ring in geom["coordinates"]:
            parts.append(ring_to_path(ring))
    elif geom["type"] == "MultiPolygon":
        for poly in geom["coordinates"]:
            for ring in poly:
                parts.append(ring_to_path(ring))
    return "".join(parts)


def main():
    print(f"Fetching {GEOJSON_URL} ...")
    with urllib.request.urlopen(GEOJSON_URL, timeout=30) as r:
        data = json.loads(r.read().decode("utf-8"))
    print(f"  features: {len(data.get('features', []))}")

    paths = []
    for feat in data["features"]:
        d = feature_to_path(feat)
        if d:
            paths.append(d)
    print(f"  built {len(paths)} country paths")

    combined = "".join(paths)
    print(f"  total path data: {len(combined) // 1024} KB")

    snippet = (
        '<g stroke="#14110F" stroke-width="0.9" fill="#F4F2EC" fill-opacity="0.55" '
        'stroke-linejoin="round" stroke-linecap="round">\n'
        f'  <path d="{combined}"/>\n'
        '</g>'
    )

    text = BANNER.read_text(encoding="utf-8")
    pattern = re.compile(
        r"<!-- WORLDMAP-START -->.*?<!-- WORLDMAP-END -->",
        flags=re.DOTALL,
    )
    if not pattern.search(text):
        print("[error] markers <!-- WORLDMAP-START --> / <!-- WORLDMAP-END --> "
              "not found in banner.svg — add them first around the world-map <g>.")
        return
    new_text = pattern.sub(
        f"<!-- WORLDMAP-START -->\n{snippet}\n  <!-- WORLDMAP-END -->",
        text,
    )
    BANNER.write_text(new_text, encoding="utf-8")
    print(f"Wrote {BANNER} ({BANNER.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
