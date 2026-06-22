#!/usr/bin/env python3
"""Render eval/results-v3-pairwise.svg — ensemble win-rate vs a single Opus pass, three graders.
Pure stdlib (no matplotlib). Run from eval/:  python3 chart-v3-pairwise.py"""

# clean-run win-rates (per grader); Opus/Sonnet shown as the mid of their two runs, Gemini as graded.
graders = [("Opus judge", 60), ("Sonnet judge", 61), ("Gemini-Flash (non-Claude)", 62)]

W, H = 660, 250
ml, mr, mt = 220, 50, 70
plot_w = W - ml - mr
x0 = ml
def x(v): return x0 + plot_w * (v / 100.0)

bh, gap = 32, 24
y = mt
parts = []
for name, v in graders:
    cy = y + bh / 2
    parts.append(f'<rect x="{x0:.1f}" y="{y}" width="{x(v)-x0:.1f}" height="{bh}" rx="4" fill="#4f46e5"/>')
    parts.append(f'<text x="{x0-12}" y="{cy+5:.1f}" text-anchor="end" font-size="15" fill="#111">{name}</text>')
    parts.append(f'<text x="{x(v)+8:.1f}" y="{cy+5:.1f}" font-size="15" font-weight="700" fill="#111">{v}%</text>')
    y += bh + gap

ref = x(50)
bottom = y - gap + 10
svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" font-family="-apple-system,Segoe UI,Roboto,sans-serif">
<rect width="{W}" height="{H}" fill="#ffffff"/>
<text x="{ml}" y="30" font-size="17" font-weight="700" fill="#111">Ensemble vs single Opus — pairwise win-rate</text>
<text x="{ml}" y="50" font-size="12.5" fill="#666">Opus panel + max verifying judge vs one matched-effort Opus pass · n=8 · both answer-orders</text>
<line x1="{ref:.1f}" y1="{mt-10}" x2="{ref:.1f}" y2="{bottom}" stroke="#9ca3af" stroke-width="1.5" stroke-dasharray="4 3"/>
<text x="{ref:.1f}" y="{bottom+18}" text-anchor="middle" font-size="12" fill="#9ca3af">50% = tie</text>
{chr(10).join(parts)}
</svg>'''

open("results-v3-pairwise.svg", "w").write(svg)
print("wrote results-v3-pairwise.svg")
