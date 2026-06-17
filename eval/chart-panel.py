#!/usr/bin/env python3
"""Render the panel-design test (homog vs roles) to results-panel.svg from raw-panel.json. Pure stdlib.

Usage:  python3 eval/chart-panel.py
Reads:  eval/raw-panel.json   Writes: eval/results-panel.svg
"""
import html
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(HERE, "raw-panel.json")) as f:
    d = json.load(f)
rows = sorted(d["rows"], key=lambda r: -r["homogVsRoles"])  # homog's biggest wins first
s = d["summary"]

LM, RM, TOP, ROW, BARW, BH = 168, 46, 80, 46, 600, 11
W = LM + BARW + RM
H = TOP + len(rows) * ROW + 104
BASE, HOMOG, ROLES, GRID, TXT = "#9aa0a6", "#c4622d", "#2d6ec4", "#e3e3e3", "#222"


def x(v):
    return LM + BARW * (v / 100.0)


p = []
p.append(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" '
         f'font-family="-apple-system,Segoe UI,Helvetica,Arial,sans-serif">')
p.append(f'<rect width="{W}" height="{H}" fill="white"/>')
p.append(f'<text x="{LM}" y="26" font-size="16" font-weight="700" fill="#222">'
         f'Panel design — homogeneous best-of-N vs objective roles</text>')
p.append(f'<text x="{LM}" y="44" font-size="12" fill="#666">'
         f'Mean rubric 0–100 · two blind judges · n={s["n"]} · single Opus vs homog vs role-diverse panel</text>')

for t in (0, 25, 50, 75, 100):
    gx = x(t)
    p.append(f'<line x1="{gx:.1f}" y1="{TOP - 6}" x2="{gx:.1f}" y2="{TOP + len(rows) * ROW}" stroke="{GRID}"/>')
    p.append(f'<text x="{gx:.1f}" y="{TOP - 12}" font-size="10" fill="#999" text-anchor="middle">{t}</text>')

for i, r in enumerate(rows):
    cy = TOP + i * ROW + 6
    p.append(f'<text x="{LM - 10}" y="{cy + 18}" font-size="11" fill="{TXT}" text-anchor="end">{html.escape(r["id"])}</text>')
    for j, (val, col) in enumerate([(r["baseline"], BASE), (r["homog"], HOMOG), (r["roles"], ROLES)]):
        by = cy + j * (BH + 1)
        p.append(f'<rect x="{LM}" y="{by}" width="{BARW * val / 100:.1f}" height="{BH}" fill="{col}"/>')
        p.append(f'<text x="{x(val) + 4:.1f}" y="{by + BH - 1}" font-size="8" fill="#666">{val:g}</text>')

fy = TOP + len(rows) * ROW + 28
for k, (lab, col) in enumerate([("Single Opus", BASE), ("Homogeneous best-of-N", HOMOG), ("Role-diverse", ROLES)]):
    lx = LM + k * 168
    p.append(f'<rect x="{lx}" y="{fy - 10}" width="12" height="12" fill="{col}"/>'
             f'<text x="{lx + 18}" y="{fy}" font-size="12" fill="{TXT}">{lab}</text>')
summ = (f'mean: Opus {s["baseMean"]:g} · homog {s["homogMean"]:g} (+{s["homogLift"]:g}) · '
        f'roles {s["rolesMean"]:g} (+{s["rolesLift"]:g})   ·   homog − roles {s["homogMinusRolesMean"]:+g} · '
        f'head-to-head {s["headToHead"]["homogWins"]}–{s["headToHead"]["rolesWins"]}')
p.append(f'<text x="{LM}" y="{fy + 30}" font-size="12.5" font-weight="600" fill="{TXT}">{html.escape(summ)}</text>')
p.append("</svg>")
with open(os.path.join(HERE, "results-panel.svg"), "w") as f:
    f.write("\n".join(p))
print("wrote results-panel.svg")
