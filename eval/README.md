# claude-ensemble — evaluation

An honest, reproducible A/B comparison of the two systems on a fixed task set, run entirely on a Claude subscription.

## What's compared

- **Baseline** — a single Claude Opus pass (high effort).
- **Ensemble** — the claude-ensemble pipeline: three objective-diverse Sonnet drafts (drafter / adversary / alt-method) synthesized by an Opus judge. The triage gate is skipped here — every eval task is "complex" by construction, which is the regime where the ensemble is meant to help.

## Task set

12 deliberately hard tasks across domains (systems design, debugging, math, coding, security, analysis, reasoning, data modeling, deep-research synthesis, conceptual precision). Each carries an explicit rubric. The full set is embedded in [`run.js`](run.js).

## Scoring

For each task, both answers are scored by **two independent judges** (Opus and Sonnet), each:

- shown the two answers under **blind, randomized X/Y labels** with provenance stripped (so neither label nor order correlates with the system),
- scoring **per-criterion against the rubric** to a 0–100 total per answer,
- and picking a winner (X / Y / tie).

Per task, the two judges' scores are averaged and the majority winner is taken.

## Reproduce

Run the workflow (no args — the task set is embedded in `run.js`), then render the chart:

```
# 1. run the eval workflow → returns { summary, rows }
#    (Claude Code: invoke the Workflow on eval/run.js)
# 2. save that JSON to eval/raw.json
# 3. python3 eval/chart.py   → writes eval/results.svg (pure stdlib, no matplotlib)
```

## Honest caveats (read these)

- **Small n, this set only.** 12 tasks is an indication, not a benchmark; results do not generalize beyond these tasks.
- **Same-family scoring.** The judges are Claude models, and the ensemble's own synthesizer is Opus — so some same-family preference is possible. Mitigated by blind labels, an explicit rubric, and a cross-tier (Sonnet) second judge, but not eliminated. Treat deltas as directional.
- **Subscription-only ensemble.** The panel is Claude-tier (no cross-lab diversity), per the project's design constraint.
- **Cost is structural, not metered.** Per-system token usage isn't separately measured here; the cost picture is the call-structure model in the top-level README.

## Results

- [`results.md`](results.md) · `results.svg` — v1 (ensemble vs single Opus).
- [`results-v2.md`](results-v2.md) · `results-v2.svg` — v2 (3-arm: single Opus vs Sonnet-panel vs Opus-panel, harder tasks).
- [`results-phaseA.md`](results-phaseA.md) — Phase A (judge-essentials ablation: what actually improves the judge).
- [`results-phaseB.md`](results-phaseB.md) · `results-phaseB.svg` — Phase B (does draft diversity predict the lift? — the answer is no).
- [`results-panel.md`](results-panel.md) · `results-panel.svg` — panel design (homogeneous best-of-N vs objective roles — homog wins, so the kit dropped the roles).
