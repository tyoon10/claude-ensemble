#!/usr/bin/env python3
"""Public cost-vs-quality chart for the README — clean, no methodology caveats.
Three points = the kit's three routes (matches the How-it-works diagram):
  single pass (gated-out simple tasks) -> panel+judge (complex) -> + verify-loop (complex & checkable).
x = relative cost (x a single model call); y = relative quality (directional, no claimed numbers).
Pure-stdlib SVG. Regenerate: python3 eval/chart-cost-performance.py  ->  assets/cost-performance.svg"""

import os

# label, cost (x single), quality (relative 0-100 for layout only), color, note
P = [
    ("Single pass",                 1.0, 38, "#64748b", "simple tasks (gated)"),
    ("Panel + judge",               3.2, 60, "#7c3aed", "complex tasks"),
    ("Panel + judge + verify-loop", 5.0, 86, "#16a34a", "checkable tasks"),
]

W, H = 780, 440
ML, MR, MT, MB = 64, 200, 70, 64
PW, PH = W - ML - MR, H - MT - MB
XMIN, XMAX, YMIN, YMAX = 0.4, 5.7, 26, 96
def X(c): return ML + PW * (c - XMIN) / (XMAX - XMIN)
def Y(q): return MT + PH * (YMAX - q) / (YMAX - YMIN)

s = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" font-family="-apple-system,Segoe UI,Roboto,sans-serif">',
     f'<rect width="{W}" height="{H}" fill="#ffffff"/>',
     f'<text x="{ML}" y="34" font-size="19" font-weight="700" fill="#111">Cost vs quality</text>',
     f'<text x="{ML}" y="54" font-size="12.5" fill="#666">More verification buys more quality, at more cost. The verify-loop (checkable tasks) is the biggest lever.</text>']
# axes
s.append(f'<line x1="{ML}" y1="{Y(YMIN):.1f}" x2="{X(XMAX):.1f}" y2="{Y(YMIN):.1f}" stroke="#cbd5e1" stroke-width="1.2"/>')
s.append(f'<line x1="{ML}" y1="{MT-6}" x2="{ML}" y2="{Y(YMIN):.1f}" stroke="#cbd5e1" stroke-width="1.2"/>')
# x ticks (relative cost)
for c in [1, 3, 5]:
    s.append(f'<line x1="{X(c):.1f}" y1="{Y(YMIN):.1f}" x2="{X(c):.1f}" y2="{Y(YMIN)+5:.1f}" stroke="#cbd5e1"/>')
    s.append(f'<text x="{X(c):.1f}" y="{Y(YMIN)+20:.1f}" text-anchor="middle" font-size="12" fill="#64748b">{c}×</text>')
s.append(f'<text x="{ML+PW/2:.1f}" y="{H-18:.1f}" text-anchor="middle" font-size="12.5" fill="#475569">relative cost (× a single model call)</text>')
# y axis label (directional, no numbers — relative quality)
s.append(f'<text x="22" y="{MT+PH/2:.1f}" text-anchor="middle" font-size="12.5" fill="#475569" transform="rotate(-90 22 {MT+PH/2:.1f})">relative quality →</text>')
# connecting trend line
pts = " ".join(f"{X(c):.1f},{Y(q):.1f}" for (_, c, q, _, _) in P)
s.append(f'<polyline points="{pts}" fill="none" stroke="#cbd5e1" stroke-width="2.5" stroke-dasharray="2 5"/>')
# points + labels (labels to the right, stacked clear)
for (lab, c, q, col, note) in P:
    s.append(f'<circle cx="{X(c):.1f}" cy="{Y(q):.1f}" r="9" fill="{col}"/>')
    lx = X(c) + 16
    s.append(f'<text x="{lx:.1f}" y="{Y(q)-2:.1f}" font-size="13.5" font-weight="700" fill="#111">{lab}</text>')
    s.append(f'<text x="{lx:.1f}" y="{Y(q)+14:.1f}" font-size="11.5" fill="#64748b">{note}</text>')
s.append('</svg>')

out = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "cost-performance.svg")
open(out, "w").write("\n".join(s))
print("wrote", out)
for (lab, c, q, _, note) in P:
    print(f"  {lab:32s} {c}×  q~{q}  ({note})")
