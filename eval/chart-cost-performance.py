#!/usr/bin/env python3
"""Public cost-vs-quality scatter for the README.
Each design plotted at its real cost (structural compute units) and relative quality
(length-controlled, single self-verify pass = 50). Panel tiers shown as separate points.
Pure-stdlib SVG. Regenerate: python3 eval/chart-cost-performance.py -> assets/cost-performance.svg

cost units (u): Sonnet draft 0.3 · Opus draft 1.0 · Opus-max call 1.2
"""
import os

# label, cost_u, quality, color, label-placement (dx, dy, anchor)
P = [
    ("Single pass",                 1.2, 50, "#64748b", (-8, -14, "start")),
    ("Sonnet panel",                2.1, 50, "#ea580c", (-8,  22, "start")),
    ("Opus panel",                  4.2, 84, "#7c3aed", (14,   5, "start")),
    ("Opus panel + verify-loop",   11.4, 96, "#16a34a", (-14, 18, "end")),
]
FRONTIER = [(1.2, 50), (4.2, 84), (11.4, 96)]

W, H = 800, 470
ML, MR, MT, MB = 66, 48, 80, 70
PW, PH = W - ML - MR, H - MT - MB
XMIN, XMAX, YMIN, YMAX = 0.0, 12.5, 40.0, 102.0
def X(c): return ML + PW * (c - XMIN) / (XMAX - XMIN)
def Y(q): return MT + PH * (YMAX - q) / (YMAX - YMIN)

s = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" font-family="-apple-system,Segoe UI,Roboto,sans-serif">',
     f'<rect width="{W}" height="{H}" fill="#ffffff"/>',
     f'<text x="{ML}" y="34" font-size="19" font-weight="700" fill="#111">Cost vs quality</text>',
     f'<text x="{ML}" y="54" font-size="12.5" fill="#666">Each design at its true cost and quality — the panel tier and the verify-loop are the levers.</text>']
# axes
s.append(f'<line x1="{ML}" y1="{Y(YMIN):.1f}" x2="{X(XMAX):.1f}" y2="{Y(YMIN):.1f}" stroke="#333" stroke-width="1.2"/>')
s.append(f'<line x1="{ML}" y1="{MT-4}" x2="{ML}" y2="{Y(YMIN):.1f}" stroke="#333" stroke-width="1.2"/>')
# x ticks (cost u)
for c in [0, 2, 4, 6, 8, 10, 12]:
    s.append(f'<line x1="{X(c):.1f}" y1="{Y(YMIN):.1f}" x2="{X(c):.1f}" y2="{Y(YMIN)+5:.1f}" stroke="#333"/>')
    s.append(f'<text x="{X(c):.1f}" y="{Y(YMIN)+19:.1f}" text-anchor="middle" font-size="11.5" fill="#555">{c}u</text>')
s.append(f'<text x="{ML+PW/2:.1f}" y="{H-30:.1f}" text-anchor="middle" font-size="12.5" fill="#475569">relative cost (compute units)</text>')
s.append(f'<text x="{ML+PW/2:.1f}" y="{H-14:.1f}" text-anchor="middle" font-size="10.5" fill="#94a3b8">u: Sonnet draft 0.3 · Opus draft 1.0 · Opus-max call 1.2</text>')
# y ticks
for q in [40, 50, 60, 70, 80, 90, 100]:
    s.append(f'<line x1="{ML-5:.1f}" y1="{Y(q):.1f}" x2="{ML}" y2="{Y(q):.1f}" stroke="#333"/>')
    s.append(f'<text x="{ML-9:.1f}" y="{Y(q)+4:.1f}" text-anchor="end" font-size="11.5" fill="#555">{q}</text>')
s.append(f'<text x="22" y="{MT+PH/2:.1f}" text-anchor="middle" font-size="12.5" fill="#475569" transform="rotate(-90 22 {MT+PH/2:.1f})">relative quality</text>')
# baseline line at 50
s.append(f'<line x1="{ML}" y1="{Y(50):.1f}" x2="{X(XMAX):.1f}" y2="{Y(50):.1f}" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="4 4"/>')
s.append(f'<text x="{X(XMAX):.1f}" y="{Y(50)-6:.1f}" text-anchor="end" font-size="10" fill="#94a3b8">single self-verify pass = 50</text>')
# frontier line
fp = " ".join(f"{X(c):.1f},{Y(q):.1f}" for c, q in FRONTIER)
s.append(f'<polyline points="{fp}" fill="none" stroke="#16a34a" stroke-width="2" opacity="0.55" stroke-dasharray="6 4"/>')
# points + labels
for (lab, c, q, col, (dx, dy, anc)) in P:
    s.append(f'<circle cx="{X(c):.1f}" cy="{Y(q):.1f}" r="8" fill="{col}"/>')
    s.append(f'<text x="{X(c)+dx:.1f}" y="{Y(q)+dy:.1f}" text-anchor="{anc}" font-size="13" font-weight="700" fill="#111">{lab}</text>')
s.append('</svg>')

out = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "cost-performance.svg")
open(out, "w").write("\n".join(s))
print("wrote", out)
for (lab, c, q, _, _) in P:
    print(f"  {lab:28s} {c:5.1f}u  q={q}")
