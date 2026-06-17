#!/usr/bin/env python3
"""Render Phase B (diversity vs lift) to results-phaseB.svg from raw-phaseB.json. Pure stdlib.

Usage:  python3 eval/chart-phaseB.py
Reads:  eval/raw-phaseB.json   Writes: eval/results-phaseB.svg
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(HERE, "raw-phaseB.json")) as f:
    d = json.load(f)
cells, s = d["cells"], d["summary"]

COL = {"homog": "#9aa0a6", "roles": "#c4622d", "effort": "#2d9e5f", "crosstier": "#2d6ec4"}
LBL = {"homog": "homogeneous", "roles": "role-diverse", "effort": "effort-spread", "crosstier": "cross-tier"}
XMIN, XMAX, YMIN, YMAX = 0, 65, -3, 23
LM, RM, TM, BM = 66, 188, 60, 54
W, H = 770, 470
pw, ph = W - LM - RM, H - TM - BM


def X(v):
    return LM + pw * (v - XMIN) / (XMAX - XMIN)


def Y(v):
    return TM + ph * (1 - (v - YMIN) / (YMAX - YMIN))


p = []
p.append(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" font-family="-apple-system,Segoe UI,Helvetica,Arial,sans-serif">')
p.append(f'<rect width="{W}" height="{H}" fill="white"/>')
p.append(f'<text x="{LM}" y="26" font-size="16" font-weight="700" fill="#222">Phase B — does draft diversity predict lift?</text>')
p.append(f'<text x="{LM}" y="44" font-size="12" fill="#666">each point = one (arm, task) cell · n={s["cellCount"]} · Pearson r = {s["diversityLiftPearson"]} → no relationship</text>')
p.append(f'<line x1="{LM}" y1="{TM}" x2="{LM}" y2="{TM + ph}" stroke="#333"/>')
p.append(f'<line x1="{LM}" y1="{Y(0):.1f}" x2="{LM + pw}" y2="{Y(0):.1f}" stroke="#ccc" stroke-dasharray="3 3"/>')
for t in (0, 10, 20, 30, 40, 50, 60):
    p.append(f'<line x1="{X(t):.1f}" y1="{TM + ph}" x2="{X(t):.1f}" y2="{TM + ph + 4}" stroke="#999"/>')
    p.append(f'<text x="{X(t):.1f}" y="{TM + ph + 18}" font-size="10" fill="#999" text-anchor="middle">{t}</text>')
for t in (0, 5, 10, 15, 20):
    p.append(f'<line x1="{LM - 4}" y1="{Y(t):.1f}" x2="{LM}" y2="{Y(t):.1f}" stroke="#999"/>')
    p.append(f'<text x="{LM - 8}" y="{Y(t) + 3:.1f}" font-size="10" fill="#999" text-anchor="end">{t:+d}</text>')
p.append(f'<text x="{LM + pw / 2:.1f}" y="{H - 12}" font-size="12" fill="#444" text-anchor="middle">draft diversity (100 − redundancy)  →  more diverse</text>')
p.append(f'<text x="18" y="{TM + ph / 2:.1f}" font-size="12" fill="#444" text-anchor="middle" transform="rotate(-90 18 {TM + ph / 2:.1f})">lift over single Opus (rubric pts)</text>')
for c in cells:
    p.append(f'<circle cx="{X(c["diversity"]):.1f}" cy="{Y(c["lift"]):.1f}" r="5" fill="{COL[c["arm"]]}" fill-opacity="0.82"/>')
ly = TM + 8
p.append(f'<text x="{LM + pw + 26}" y="{ly - 14}" font-size="11" font-weight="600" fill="#222">arm (mean lift)</text>')
for k in ["homog", "roles", "effort", "crosstier"]:
    p.append(f'<circle cx="{LM + pw + 32}" cy="{ly}" r="5" fill="{COL[k]}"/>')
    p.append(f'<text x="{LM + pw + 44}" y="{ly + 4}" font-size="11" fill="#222">{LBL[k]} ({s["arms"][k]["lift"]:+g})</text>')
    ly += 22
p.append(f'<text x="{LM + pw + 26}" y="{ly + 10}" font-size="10.5" fill="#888">Lowest-diversity arm</text>')
p.append(f'<text x="{LM + pw + 26}" y="{ly + 24}" font-size="10.5" fill="#888">had the HIGHEST lift.</text>')
p.append("</svg>")
with open(os.path.join(HERE, "results-phaseB.svg"), "w") as f:
    f.write("\n".join(p))
print("wrote results-phaseB.svg")
