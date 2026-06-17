#!/usr/bin/env python3
"""Render claude-ensemble eval results to results.svg from raw.json.

Pure standard-library (no matplotlib/numpy) so any contributor can regenerate it.

Usage:  python3 eval/chart.py
Reads:  eval/raw.json  ({ "summary": {...}, "rows": [...] })  produced by eval/run.js
Writes: eval/results.svg
"""
import html
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))

with open(os.path.join(HERE, "raw.json")) as f:
    data = json.load(f)

rows = sorted(data["rows"], key=lambda r: r["delta"])  # most baseline-favored at top
s = data["summary"]

LM, RM, TOP, ROW, BARW, BH = 168, 44, 72, 34, 600, 12
W = LM + BARW + RM
H = TOP + len(rows) * ROW + 96
ENS, BASE, GRID, TXT = "#c4622d", "#9aa0a6", "#e3e3e3", "#222"


def x(v):
    return LM + BARW * (v / 100.0)


p = []
p.append(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" '
         f'font-family="-apple-system,Segoe UI,Helvetica,Arial,sans-serif">')
p.append(f'<rect width="{W}" height="{H}" fill="white"/>')
p.append(f'<text x="{LM}" y="28" font-size="17" font-weight="700" fill="{TXT}">'
         f'claude-ensemble — A/B eval (blind rubric scoring)</text>')
p.append(f'<text x="{LM}" y="48" font-size="12" fill="#666">'
         f'Mean rubric score 0–100 · two blind judges · n={s["n"]} tasks · indicative, small n</text>')

for t in (0, 25, 50, 75, 100):
    gx = x(t)
    p.append(f'<line x1="{gx:.1f}" y1="{TOP - 6}" x2="{gx:.1f}" y2="{TOP + len(rows) * ROW}" stroke="{GRID}"/>')
    p.append(f'<text x="{gx:.1f}" y="{TOP - 12}" font-size="10" fill="#999" text-anchor="middle">{t}</text>')

for i, r in enumerate(rows):
    cy = TOP + i * ROW + 8
    p.append(f'<text x="{LM - 10}" y="{cy + BH}" font-size="11" fill="{TXT}" text-anchor="end">'
             f'{html.escape(r["id"])}</text>')
    p.append(f'<rect x="{LM}" y="{cy}" width="{BARW * r["ensAvg"] / 100:.1f}" height="{BH}" fill="{ENS}"/>')
    p.append(f'<text x="{x(r["ensAvg"]) + 4:.1f}" y="{cy + BH - 1}" font-size="9" fill="{ENS}">{r["ensAvg"]:g}</text>')
    by = cy + BH + 2
    p.append(f'<rect x="{LM}" y="{by}" width="{BARW * r["baseAvg"] / 100:.1f}" height="{BH}" fill="{BASE}"/>')
    p.append(f'<text x="{x(r["baseAvg"]) + 4:.1f}" y="{by + BH - 1}" font-size="9" fill="#777">{r["baseAvg"]:g}</text>')

fy = TOP + len(rows) * ROW + 26
p.append(f'<rect x="{LM}" y="{fy - 10}" width="12" height="12" fill="{ENS}"/>'
         f'<text x="{LM + 18}" y="{fy}" font-size="12" fill="{TXT}">Ensemble</text>')
p.append(f'<rect x="{LM + 110}" y="{fy - 10}" width="12" height="12" fill="{BASE}"/>'
         f'<text x="{LM + 128}" y="{fy}" font-size="12" fill="{TXT}">Single Opus</text>')
summ = (f'mean: ensemble {s["ensMean"]:g} vs Opus {s["baseMean"]:g}  (Δ {s["meanDelta"]:+g})'
        f'   ·   W/T/L (ensemble): {s["ensembleWins"]}/{s["ties"]}/{s["baselineWins"]}')
p.append(f'<text x="{LM}" y="{fy + 30}" font-size="13" font-weight="600" fill="{TXT}">{html.escape(summ)}</text>')
p.append('</svg>')

out = os.path.join(HERE, "results.svg")
with open(out, "w") as f:
    f.write("\n".join(p))
print("wrote", out)
