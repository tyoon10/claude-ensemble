# Results — Phase A: what makes the judge better?

> **Methodology trail — findings stand, but any "default/shipped" config named below is superseded.** The shipped kit now defaults to a best-of-N **Opus** panel → **max-effort Opus judge** → verify→revise loop. See the [eval index](README.md) and the [top-level README](../README.md).

The judge is the highest-leverage part of the ensemble, so this ablation asks: **which judge interventions actually matter — and does over-instructing it help or hurt?** We hold the panel fixed (the same 3 Sonnet drafts per task, generated once) and run **six judge variants on the identical drafts**, then blind-score all six (rotated A–F, strict calibration) with two judges (Opus + Sonnet). 8 harder/open tasks. Harness: [`phaseA.js`](phaseA.js); raw: [`raw-phaseA.json`](raw-phaseA.json).

| Arm | Judge variant | Mean | Δ vs control | best-votes (of 16) |
|---|---|--:|--:|--:|
| **J4** | **effort `xhigh`** (no prompt change) | **89.2** | **+2.4** | 5 |
| J3 | + one self-revision pass | 87.9 | +1.1 | 2 |
| J1 | + light "verify claims first" nudge | 87.8 | +1.0 | 3 |
| J2 | + show the rubric | 87.8 | +1.0 | 6 |
| J0 | control (one-shot synthesize) | 86.8 | — | 0 |
| **J5** | **rigid 7-step procedure** | **82.1** | **−4.7** | 0 |

## Verdict by lever

| Lever | What it changes | Δ vs control | Verdict |
|---|---|--:|---|
| **Judge effort `xhigh`** | reasoning depth on the judge call — **no prompt change** | **+2.4** | **Essential — *the* lever (the kit now ships `max`)** |
| Show the rubric | judge sees the explicit success-criteria | +1.0 (most best-votes, flat mean) | Marginal / uncertain — revisit |
| Verify-first nudge | one open line: "verify claims before synthesizing" | +1.0 | Marginal |
| Self-revision round | a second judge pass over its own draft | +1.1 (costs +1 model call) | Marginal — not worth the extra call |
| One-shot synthesize | the plain judge | 0 | Control |
| **Rigid 7-step procedure** | a prescribed, step-by-step judge process | **−4.7** | **Harmful — over-discipline backfires; avoid** |

> **Lesson: the lever is effort, not instruction.** Give the judge more thinking budget and keep its prompt open; do not script its process.

## Findings

1. **The judge's *effort* is the lever — not its instructions.** Raising the judge to `xhigh` effort, with **no prompt change at all**, is the single biggest improvement (+2.4). The simplest intervention is the most effective.
2. **Over-instructing the judge *hurts*, clearly.** The rigid 7-step procedure was the worst arm by a wide margin (−4.7, below even the control, 0 best-votes). Disciplining the judge into a fixed process makes it worse, not better. Keep the judge open.
3. **Prompt micro-interventions are marginal.** A light verify-nudge, showing the rubric, or a self-revision round each add ~+1 and are statistically indistinguishable (within noise at n=8). The extra self-revision round costs an extra model call for roughly a one-line nudge's effect — not worth it. (Showing the rubric won the most best-votes but at a flat mean — it sharpens individual wins without lifting the average; flagged for a future look.)

## Why this also explains the "Opus panel" result

The [3-arm eval](results-v2.md) found an Opus panel + xhigh judge beat the Sonnet panel + `high` judge by only **+0.9**. Phase A decomposes that: the xhigh judge alone adds **~+2.4**, so at an `xhigh` judge the Opus panel was roughly break-even. The best configuration *measured here* is **Sonnet panel + `xhigh` judge** — cheaper than an Opus panel.

> **Update (2026-06-19):** this "Opus panel ≈ break-even" conclusion held only at an `xhigh` *paraphrasing* judge under a saturating absolute rubric. A later pairwise, `max`-*verifying*-judge, externally cross-graded eval found the **Opus panel pulls clearly ahead** on verification-heavy work (see the update in [`results-v2.md`](results-v2.md)). The Opus-panel advantage needs a *verifying* judge to surface; **`xhigh` judge is the throughput default, but a `max` judge — and, for the hardest checkable work, an Opus panel — is the quality-max path.**

## Decision (applied)

- **The judge runs at high effort by design — the kit ships `max`** (`JUDGE_EFFORT` in [`../.claude/workflows/ensemble.js`](../.claude/workflows/ensemble.js)). Effort is the largest measured quality lever; this ablation found `xhigh` the biggest single win, and a later verifying-judge pass pushed the shipped default to `max`.
- **The judge prompt stays open and light** — no rigid multi-step procedure (it measurably hurts).
- **Default judge = `xhigh`; a `max` judge is the quality-max lever on hard work.** *(Updated 2026-06-19.)* An earlier `tier:"max"` Opus-panel preset was dropped because it didn't beat Sonnet + `xhigh`-judge *under this eval's xhigh-paraphrasing-judge regime*. A later, better-instrumented pass (pairwise + `max` verifying judge + non-Claude cross-grader) reversed that for verification-heavy work — the Opus panel + `max` judge is the quality-max config. The Sonnet panel + `xhigh` judge remains the cost/throughput default; re-adding an opt-in Opus-panel/`max` preset is the natural follow-up.

## Caveats

n=8, this task set only; both judges are Claude models (same-family preference possible). Only the J4 (+2.4) and J5 (−4.7) effects clear the noise at this n; J1/J2/J3 (~+1) are indistinguishable. A larger-n confirmation is a sensible follow-up. Reproduce via [`phaseA.js`](phaseA.js).
