#!/usr/bin/env python3
"""Public cost-vs-quality scatter for the README.
Each design at its real cost (structural compute units) and relative quality (length-controlled,
single strong pass = 50). The kit skips the Sonnet panel (no gain over a single pass) and routes
simple tasks to one pass, hard tasks to the Opus panel + verify-loop.
Pure-stdlib SVG. Regenerate: python3 eval/chart-cost-performance.py -> assets/cost-performance.svg
cost units (u): Sonnet draft 0.3 · Opus draft 1.0 · Opus-max call 1.2
"""
import os

# label, cost_u, quality, color, (dx, dy, anchor), note, muted
P = [
    ("Single pass",               1.2, 50, "#64748b", (-6, -15, "start"), "simple tasks (gated)", False),
    ("Sonnet panel",              2.1, 50, "#94a3b8", (-6,  20, "start"), "skipped — no gain vs a single pass", True),
    ("Opus panel",                4.2, 84, "#7c3aed", (14,   0, "start"), "complex tasks", False),
    ("Opus panel + verify-loop", 11.4, 96, "#16a34a", (-14,  2, "end"),   "checkable tasks — the top", False),
]
FRONTIER = [(1.2, 50), (4.2, 84), (11.4, 96)]  # the kit's path — skips the Sonnet panel

W, H = 820, 470
ML, MR, MT, MB = 66, 48, 80, 70
PW, PH = W - ML - MR, H - MT - MB
XMIN, XMAX, YMIN, YMAX = 0.0, 12.5, 40.0, 102.0
def X(c): return ML + PW * (c - XMIN) / (XMAX - XMIN)
def Y(q): return MT + PH * (YMAX - q) / (YMAX - YMIN)

s = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" font-family="-apple-system,Segoe UI,Roboto,sans-serif">',
     f'<rect width="{W}" height="{H}" fill="#ffffff"/>',
     f'<text x="{ML}" y="34" font-size="19" font-weight="700" fill="#111">Cost vs quality</text>',
     f'<text x="{ML}" y="54" font-size="12.5" fill="#666">The kit skips the Sonnet panel (no gain): simple → single pass; hard → Opus panel + verify-loop.</text>']
s.append(f'<line x1="{ML}" y1="{Y(YMIN):.1f}" x2="{X(XMAX):.1f}" y2="{Y(YMIN):.1f}" stroke="#333" stroke-width="1.2"/>')
s.append(f'<line x1="{ML}" y1="{MT-4}" x2="{ML}" y2="{Y(YMIN):.1f}" stroke="#333" stroke-width="1.2"/>')
for c in [0, 2, 4, 6, 8, 10, 12]:
    s.append(f'<line x1="{X(c):.1f}" y1="{Y(YMIN):.1f}" x2="{X(c):.1f}" y2="{Y(YMIN)+5:.1f}" stroke="#333"/>')
    s.append(f'<text x="{X(c):.1f}" y="{Y(YMIN)+19:.1f}" text-anchor="middle" font-size="11.5" fill="#555">{c}u</text>')
s.append(f'<text x="{ML+PW/2:.1f}" y="{H-30:.1f}" text-anchor="middle" font-size="12.5" fill="#475569">relative cost (compute units)</text>')
s.append(f'<text x="{ML+PW/2:.1f}" y="{H-14:.1f}" text-anchor="middle" font-size="10.5" fill="#94a3b8">u: Sonnet draft 0.3 · Opus draft 1.0 · Opus-max call 1.2</text>')
for q in [40, 50, 60, 70, 80, 90, 100]:
    s.append(f'<line x1="{ML-5:.1f}" y1="{Y(q):.1f}" x2="{ML}" y2="{Y(q):.1f}" stroke="#333"/>')
    s.append(f'<text x="{ML-9:.1f}" y="{Y(q)+4:.1f}" text-anchor="end" font-size="11.5" fill="#555">{q}</text>')
s.append(f'<text x="22" y="{MT+PH/2:.1f}" text-anchor="middle" font-size="12.5" fill="#475569" transform="rotate(-90 22 {MT+PH/2:.1f})">relative quality</text>')
# baseline
s.append(f'<line x1="{ML}" y1="{Y(50):.1f}" x2="{X(XMAX):.1f}" y2="{Y(50):.1f}" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="4 4"/>')
s.append(f'<text x="{X(XMAX):.1f}" y="{Y(50)-6:.1f}" text-anchor="end" font-size="10" fill="#94a3b8">single strong pass = 50</text>')
# kit path (frontier)
fp = " ".join(f"{X(c):.1f},{Y(q):.1f}" for c, q in FRONTIER)
s.append(f'<polyline points="{fp}" fill="none" stroke="#16a34a" stroke-width="2.2" opacity="0.6" stroke-dasharray="6 4"/>')
s.append(f'<text x="{X(7.2):.1f}" y="{Y(93):.1f}" font-size="10.5" fill="#16a34a" font-style="italic">the kit\'s path</text>')
# points
for (lab, c, q, col, (dx, dy, anc), note, muted) in P:
    if muted:
        s.append(f'<circle cx="{X(c):.1f}" cy="{Y(q):.1f}" r="7" fill="#fff" stroke="{col}" stroke-width="2"/>')
        lc = "#94a3b8"
    else:
        s.append(f'<circle cx="{X(c):.1f}" cy="{Y(q):.1f}" r="8" fill="{col}"/>')
        lc = "#111"
    s.append(f'<text x="{X(c)+dx:.1f}" y="{Y(q)+dy:.1f}" text-anchor="{anc}" font-size="13" font-weight="700" fill="{lc}">{lab}</text>')
    if note:
        s.append(f'<text x="{X(c)+dx:.1f}" y="{Y(q)+dy+14:.1f}" text-anchor="{anc}" font-size="10.5" fill="#94a3b8">{note}</text>')
s.append('</svg>')

out = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "cost-performance.svg")
open(out, "w").write("\n".join(s))
print("wrote", out)
for (lab, c, q, *_ ) in P:
    print(f"  {lab:28s} {c:5.1f}u  q={q}")
