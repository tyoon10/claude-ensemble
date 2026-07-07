#!/usr/bin/env python3
"""Published cost-vs-correctness chart, matching the settled config (v6-v9).
Length-controlled: the panel TIER is a lateral move; the verify-loop is the lever on checkable work.
The kit runs a cheap Sonnet-5 panel and spends Opus where correctness is made (judge + verify-loop);
the gate escalates only the hardest checkable tasks to an Opus panel. y is illustrative (length-
controlled the arms tie on correctness), not an absolute score. Writes assets/cost-performance.svg."""
import os

W, H = 940, 520
ML, MR, MT, MB = 92, 54, 108, 74
PW, PH = W - ML - MR, H - MT - MB
XMIN, XMAX, YMIN, YMAX = 0.0, 7.0, 40.0, 102.0
def X(c): return ML + PW * (c - XMIN) / (XMAX - XMIN)
def Y(q): return MT + PH * (YMAX - q) / (YMAX - YMIN)
FT, FS, FAX, FTK, FPL, FNO, FAN = 26, 15.5, 15, 14, 16.5, 14, 14.5

# label, cost, correctness, color, (dx,dy,anchor), note, (ndx,ndy), hollow
P = [
    ("Single strong pass", 1.0, 50, "#64748b", (-4, -30, "start"),  "one high-effort pass",                    (-4, -12), False),
    ("Sonnet-5 panel",     2.2, 51, "#2563eb", (0,  30, "middle"),  "≈ single, ~0.4× cost → the default", (0, 48), False),
    ("Opus panel",         4.2, 52, "#7c3aed", (0, -30, "middle"),  "gate-routed: hardest checkable only",      (0, -12), True),
    ("+ verify-loop",      5.4, 66, "#16a34a", (14, 4, "start"),    "checkable reasoning — the lever",       (14, 22), False),
]
PATH = [(1.0, 50), (2.2, 51), (5.4, 66)]

s = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" font-family="-apple-system,Segoe UI,Roboto,sans-serif">',
     f'<rect width="{W}" height="{H}" fill="#ffffff"/>',
     f'<text x="{ML}" y="42" font-size="{FT}" font-weight="700" fill="#111"><tspan font-family="ui-monospace,SFMono-Regular,Menlo,Consolas,monospace">claude-ensemble</tspan>: cost vs correctness</text>',
     f'<text x="{ML}" y="70" font-size="{FS}" fill="#666">Length-controlled: the panel tier is a lateral move; the verify-loop is the lever on checkable work.</text>']
s.append(f'<line x1="{ML}" y1="{Y(YMIN):.1f}" x2="{X(XMAX):.1f}" y2="{Y(YMIN):.1f}" stroke="#333" stroke-width="1.3"/>')
s.append(f'<line x1="{ML}" y1="{MT-6}" x2="{ML}" y2="{Y(YMIN):.1f}" stroke="#333" stroke-width="1.3"/>')
for c in range(0, 8):
    s.append(f'<line x1="{X(c):.1f}" y1="{Y(YMIN):.1f}" x2="{X(c):.1f}" y2="{Y(YMIN)+5:.1f}" stroke="#333"/>')
    s.append(f'<text x="{X(c):.1f}" y="{Y(YMIN)+23:.1f}" text-anchor="middle" font-size="{FTK}" fill="#555">{c}×</text>')
s.append(f'<text x="{ML+PW/2:.1f}" y="{H-22:.1f}" text-anchor="middle" font-size="{FAX}" fill="#475569">relative cost (compute units, indicative)</text>')
for q in [40, 50, 60, 70, 80, 90, 100]:
    s.append(f'<line x1="{ML-5:.1f}" y1="{Y(q):.1f}" x2="{ML}" y2="{Y(q):.1f}" stroke="#333"/>')
    s.append(f'<text x="{ML-11:.1f}" y="{Y(q)+5:.1f}" text-anchor="end" font-size="{FTK}" fill="#555">{q}</text>')
s.append(f'<text x="26" y="{MT+PH/2:.1f}" text-anchor="middle" font-size="{FAX}" fill="#475569" transform="rotate(-90 26 {MT+PH/2:.1f})">relative correctness (illustrative)</text>')
s.append(f'<line x1="{ML}" y1="{Y(50):.1f}" x2="{X(XMAX):.1f}" y2="{Y(50):.1f}" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="4 4"/>')
s.append(f'<text x="{X(XMAX):.1f}" y="{Y(50)-8:.1f}" text-anchor="end" font-size="{FNO}" fill="#cbd5e1">single-pass baseline</text>')
fp = " ".join(f"{X(c):.1f},{Y(q):.1f}" for c, q in PATH)
s.append(f'<polyline points="{fp}" fill="none" stroke="#16a34a" stroke-width="2.4" opacity="0.5" stroke-dasharray="6 4"/>')
s.append(f'<text x="{X(2.55):.1f}" y="{Y(72):.1f}" font-size="{FAN}" font-weight="700" font-style="italic" fill="#16a34a">verify-loop: the real lever</text>')
s.append(f'<text x="{X(2.55):.1f}" y="{Y(72)+19:.1f}" font-size="{FNO}" fill="#16a34a">~halves defects on checkable reasoning</text>')
for (lab, c, q, col, (dx, dy, anc), note, (ndx, ndy), hollow) in P:
    if hollow:
        s.append(f'<circle cx="{X(c):.1f}" cy="{Y(q):.1f}" r="8" fill="#fff" stroke="{col}" stroke-width="2.6"/>'); lc = "#94a3b8"
    else:
        s.append(f'<circle cx="{X(c):.1f}" cy="{Y(q):.1f}" r="9" fill="{col}"/>'); lc = "#111"
    s.append(f'<text x="{X(c)+dx:.1f}" y="{Y(q)+dy:.1f}" text-anchor="{anc}" font-size="{FPL}" font-weight="700" fill="{lc}">{lab}</text>')
    s.append(f'<text x="{X(c)+ndx:.1f}" y="{Y(q)+ndy:.1f}" text-anchor="{anc}" font-size="{FNO}" fill="#94a3b8">{note}</text>')
s.append(f'<text x="{ML}" y="{H-6:.1f}" font-size="{FNO}" fill="#94a3b8">Gate: simple work → one pass; complex → Sonnet-5 panel + Opus judge + verify-loop. y is illustrative, not an absolute score.</text>')
s.append('</svg>')

out = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "cost-performance.svg")
open(out, "w").write("\n".join(s))
print("wrote", out)
