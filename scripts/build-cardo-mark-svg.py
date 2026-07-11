"""Build Cardo mark: symmetrical split-C (upper dark / lower mid), no streak blades."""

from __future__ import annotations

import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BRAND = ROOT / "assets" / "brand"

VIEW = 128
CX, CY = 64.0, 64.0
# Stroke ring — thick C with clear right opening
R = 36.0
STROKE = 26.0

# Symmetrical about horizontal axis through center.
# Upper: left → right via north (math angles decrease, SVG sweep 1)
# Lower: mirror of upper via south (SVG sweep 0)
# Opening on the right: ±OPEN from east.
OPEN = 38.0  # degrees from +x to each terminal
# Left side closed enough to read as C (not a thin crescent)
LEFT = 180.0 - 12.0  # 168° upper-left / 192° lower-left

DARK_A0 = LEFT  # upper left
DARK_A1 = OPEN  # upper right
MID_A0 = 360.0 - LEFT  # lower left = 192°
MID_A1 = 360.0 - OPEN  # lower right = 322°

C_DARK = "#1C1C1E"
C_MID = "#6E6E73"


def polar(r: float, deg: float) -> tuple[float, float]:
    rad = math.radians(deg)
    return CX + r * math.cos(rad), CY - r * math.sin(rad)


def fmt(n: float) -> str:
    s = f"{n:.2f}"
    return s.rstrip("0").rstrip(".") if "." in s else s


def stroke_arc(a0: float, a1: float, sweep: int) -> str:
    x0, y0 = polar(R, a0)
    x1, y1 = polar(R, a1)
    span = ((a0 - a1) % 360) if sweep == 1 else ((a1 - a0) % 360)
    large = 1 if span > 180 else 0
    return (
        f"M {fmt(x0)} {fmt(y0)} "
        f"A {fmt(R)} {fmt(R)} 0 {large} {sweep} {fmt(x1)} {fmt(y1)}"
    )


def mark_body() -> str:
    upper = stroke_arc(DARK_A0, DARK_A1, sweep=1)
    lower = stroke_arc(MID_A0, MID_A1, sweep=0)
    return f"""  <path
    d="{upper}"
    stroke="{C_DARK}"
    stroke-width="{fmt(STROKE)}"
    stroke-linecap="round"
    fill="none"
  />
  <path
    d="{lower}"
    stroke="{C_MID}"
    stroke-width="{fmt(STROKE)}"
    stroke-linecap="round"
    fill="none"
  />
"""


def write_svg(path: Path, *, tile: str | None, label: str) -> None:
    body = mark_body()
    tile_el = f'  <rect width="{VIEW}" height="{VIEW}" rx="28" fill="{tile}"/>\n' if tile else ""
    path.write_text(
        f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {VIEW} {VIEW}" fill="none" role="img" aria-label="{label}">
{tile_el}{body}</svg>
""",
        encoding="utf-8",
    )
    print("wrote", path.relative_to(ROOT))


def main() -> None:
    global C_DARK, C_MID

    write_svg(BRAND / "cardo-mark-on-white.svg", tile=None, label="Cardo mark")
    write_svg(BRAND / "cardo-mark.svg", tile="#F3F4F6", label="Cardo")

    C_DARK, C_MID = "#F8FAFC", "#94A3B8"
    write_svg(BRAND / "cardo-mark-monochrome.svg", tile="#111827", label="Cardo monochrome")

    body = mark_body()
    (BRAND / "cardo-lockup.svg").write_text(
        f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 88" fill="none" role="img" aria-label="Cardo logo and wordmark">
  <rect width="360" height="88" rx="16" fill="#111827"/>
  <g transform="translate(12 12) scale(0.5)">
    <rect width="128" height="128" rx="28" fill="#1F2937"/>
{body}  </g>
  <text
    x="96"
    y="54"
    fill="#F8FBFF"
    font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    font-size="28"
    font-weight="600"
    letter-spacing="0.12em"
  >CARDO</text>
</svg>
""",
        encoding="utf-8",
    )
    print("wrote assets/brand/cardo-lockup.svg")

    C_DARK, C_MID = "#1C1C1E", "#6E6E73"
    body = mark_body()
    (BRAND / "cardo-lockup-light.svg").write_text(
        f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 88" fill="none" role="img" aria-label="Cardo lockup on light">
  <rect width="360" height="88" rx="16" fill="#F8FAFC"/>
  <g transform="translate(12 12) scale(0.5)">
    <rect width="128" height="128" rx="28" fill="#F3F4F6"/>
{body}  </g>
  <text
    x="96"
    y="54"
    fill="#0F172A"
    font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    font-size="28"
    font-weight="600"
    letter-spacing="0.12em"
  >CARDO</text>
</svg>
""",
        encoding="utf-8",
    )
    print("wrote assets/brand/cardo-lockup-light.svg")


if __name__ == "__main__":
    main()
