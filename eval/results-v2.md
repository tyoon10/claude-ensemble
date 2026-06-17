# Results — v2, 3-arm eval on harder tasks

A follow-up to [`results.md`](results.md). The v1 eval showed only a +4.2 ensemble edge — but its baseline already scored ~90/100, so the rubric had saturated. v2 uses **harder, higher-headroom tasks** and adds a third arm to test whether a **stronger (Opus) panel** closes the gap to the fusion literature.

- **A — baseline:** one Opus pass (high effort).
- **B — Sonnet panel:** the default ensemble (3 Sonnet objective-diverse drafts → Opus judge).
- **C — Opus panel:** the "max" preset (3 Opus drafts → critique-first Opus judge, xhigh).

12 harder tasks (deep research, distributed-systems design, security threat-modeling, proofs, methodology). Each of the three answers blind-scored 0–100 by two judges (Opus + Sonnet) under a randomized X/Y/Z permutation, with a strict anti-saturation calibration. Method + caveats: [README](README.md). Raw: [raw-v2.json](raw-v2.json).

![3-arm results](results-v2.svg)

## Headline (measured — this set only)

| Arm | Mean rubric | Δ vs single Opus | Tasks won |
|---|--:|--:|--:|
| Single Opus | 82.2 | — | 0 / 12 |
| **Sonnet panel** (default) | **90.8** | **+8.6** | 7 / 12 |
| Opus panel ("max") | 91.7 | +9.5 | 5 / 12 |

## Two findings

**1. The ceiling hypothesis holds — the real lift is ~+9, not +4.2.** On harder tasks the single-Opus baseline fell to **82.2** (vs ~90 in v1), and the ensemble edge widened to **+8.6 / +9.5**. Single Opus won **0 of 12**. v1's small margin was a saturated-rubric artifact, not a weak system — the lift is in line with the fusion literature once there is headroom to measure it.

**2. A pricier Opus panel barely helps — and is not the lever.** The Opus panel beat the Sonnet panel by only **+0.9** in aggregate and won **fewer** tasks (5 vs 7), at ~2× the usage. The most likely reason is the project's own thesis turned on itself: three Opus drafts correlate more with each other *and* with the Opus judge, so individual draft quality rises but **panel diversity falls**, and the two roughly cancel. The value of the ensemble is the **judge + objective-diversity**, not the panel's model tier. (Note `scaling-plateau`, where the Opus panel scored *worse*, 84.5 vs 91.5 — consistent with reduced diversity producing a narrower, weaker synthesis.)

The Opus panel does win the hardest **design / systems / methodology** tasks (`global-counter` +7, `contamination-eval` +9.5, `micro-monolith`, `passkey`, `coupon`) — so "max" is situational, not a general upgrade.

## Per task (sorted by baseline, most headroom first)

| Task | Domain | Single Opus | Sonnet panel | Opus panel | Best |
|---|---|--:|--:|--:|:--|
| build-vs-api | analysis | 77.0 | 92.0 | 88.5 | sonnet |
| global-counter | systems-design | 79.5 | 88.0 | 95.0 | opus |
| exactly-once | debugging | 79.5 | 91.5 | 90.5 | sonnet |
| passkey-threat | security | 80.5 | 90.5 | 93.0 | opus |
| long-context | deep-research | 81.0 | 92.0 | 91.5 | sonnet |
| micro-monolith | analysis | 81.5 | 90.0 | 93.5 | opus |
| contamination-eval | methodology | 82.0 | 84.0 | 93.5 | opus |
| scaling-plateau | deep-research | 82.5 | 91.5 | 84.5 | sonnet |
| rag-paradigms | deep-research | 82.5 | 90.0 | 89.5 | sonnet |
| prompt-to-token | conceptual | 86.5 | 94.0 | 93.5 | sonnet |
| sort-lower-bound | math | 86.5 | 94.5 | 92.5 | sonnet |
| coupon-collector | math | 87.0 | 91.5 | 94.5 | opus |

## What this means for the kit

- **Keep the Sonnet panel as the default.** It captures essentially all the lift at a fraction of the Opus-panel cost.
- **`tier: "max"` is situational, not recommended by default.** +0.9 aggregate at ~2× usage; reach for it only on the hardest design/systems work.
- **The lever for more lift is diversity + the judge, not panel tier** — which, on a subscription, means objective-role diversity and a stronger judging step, since true cross-lab diversity needs API keys.

## Caveats (unchanged)

n=12, this set only; Claude judges (same-family preference possible — note both judges still ranked single Opus last on every task, which is reassuring); directional, not a general benchmark. Reproduce/extend via [`run-v2.js`](run-v2.js).
