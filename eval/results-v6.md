# v6 — PANEL_MODEL re-decision with Sonnet 5

Claude Sonnet 5 (2026-06-30) reopened the kit's most load-bearing decision. The shipped kit runs an
**Opus** panel and *skips* the Sonnet panel because, on **Sonnet 4.6**, a Sonnet panel measured ≈ a
single pass (v2/v4 — no real gain). Sonnet 5 matches Opus 4.8 on GDPval knowledge work and near-ties
HLE-with-tools at ~0.4× the price, so v6 re-runs v4's **length-controlled** audit with the `sonnet`
tier alias now resolving to **Sonnet 5**.

## What was compared (three arms, 12 hard tasks, both answer orders)

Mirrors the **shipped** pipeline so this tests the real decision: homogeneous best-of-N drafts → a
`max` verifying **Opus** judge. The judge is held **fixed** at max Opus across both panels, so any
panel difference is *purely the draft tier*.

- **Single** — one Opus pass @ `max`, verify-then-answer (matched-effort baseline).
- **Sonnet-5 panel** — 3× Sonnet 5 @ `high` → max Opus judge.
- **Opus panel** — 3× Opus @ `high` → max Opus judge (shipped).

Primary metric: **length-controlled** adversarial audit (prosecutor/defender; a longer answer is not
better unless the extra content is correct *and* required). Secondary: raw forced-choice pairwise
(the artifact delta). Every read stratified by task family (knowledge ×8 / reasoning ×4). Auditor =
Opus (grader hygiene: never a Sonnet-5 grader on a Sonnet-5 candidate). n = 12; the knowledge half
was backfilled serially after the first pass hit a **server** rate limit (not a usage cap). Raw:
[raw-v6.json](raw-v6.json). Harness: [run-v6.js](run-v6.js) (+ [run-v6-backfill.js](run-v6-backfill.js)).

## Result — genuine correctness, length controlled (24 verdicts per audit)

| audit | correctness verdicts | length-driven | raw pairwise said |
|---|---|--:|---|
| **Sonnet-5 panel vs Opus panel** | tie 17 · Opus-panel 4 · Sonnet-5-panel 3 | 0/24 | 45.8% |
| **Sonnet-5 panel vs single Opus@max** | tie 12 · single 8 · panel 4 | 2/24 | 68.8% |

By family — vs single: **knowledge** single 6 / tie 8 / panel 2 (single ahead); **reasoning** 2 / tie 4
/ 2 (even). Mean words: single 1303, Sonnet-5 panel 2065 (**+58%**), Opus panel 1868.

## Findings

1. **A Sonnet-5 panel ties an Opus panel** (17/24 ties; Opus +1, within noise), on both families —
   unlike the Sonnet-**4.6** panel, which trailed. So *if a panel runs*, Sonnet-5 drafts match Opus
   drafts at ~0.4× the price: **`PANEL_MODEL='sonnet'` is the cost-efficient panel**, and the Opus
   panel becomes a marginal opt-in. This is the clean, tier-decoupled result.
2. **The length confound is the dominant artifact, again.** Raw pairwise says the Sonnet-5 panel beats
   a single pass **68.8%**; length-controlled it *loses* (4 win / 8 loss). The panel just writes +58%
   more (on reasoning: raw 87.5% → a dead tie, at +69% words). Re-validates v4's central
   methodological finding on the new model.
3. **On the leaky judge single looked ahead — but that was the artifact below, and it *reverses* under a
   clean judge.** v6's raw read was single 8 / panel 4 / tie 12 (single ahead, all in knowledge). A
   re-check ([v6b](run-v6b.js), the fixed judge, the 8 knowledge tasks) flips it: **the single pass wins
   0 of 32 verdicts** across both panels — Opus panel vs single = **0/16/0 (a dead tie)**, Sonnet-5 panel
   vs single = **5/11/0** (panel ahead; 3 of the 5 length-driven). Corrected: **a single Opus@max pass
   never beats a clean-judge panel; the arms are tied** (Opus panel matches single exactly; the Sonnet-5
   panel ties-to-slightly-ahead, partly on length).

## Methodological catch — the judge leaks its scaffolding

v6's audits repeatedly penalized the *panel* answers (both tiers) for grader-facing meta-commentary:
"Candidate A/B/C", "verification notes", "the three candidates converge". The `max` Opus judge was
**echoing its blind-candidate framing into the synthesis**, which a clean single pass never does — so
the leak disadvantaged *both panels vs the single pass* and drove v6's apparent "single ahead."

**Confirmed and fixed.** The judge prompt was tightened to emit a clean, standalone answer (no
candidate/verification scaffolding; shipped in [`ensemble.js`](../.claude/workflows/ensemble.js)), and
the re-check ([v6b](run-v6b.js), [raw-v6b.json](raw-v6b.json)) re-ran the single-vs-panel audit on the 8
knowledge tasks with that clean judge. Decisive: **single went from winning 6/16 verdicts (leaky) to
0/16 (clean)** vs the Sonnet-5 panel, and **0/16** vs the Opus panel. The leak fully drove v6's "single
ahead"; length-controlled correctness is a **tie**. (The fix also improves the answer users see.)

## What it means for the kit (after the v6b re-check)

- **`PANEL_MODEL='sonnet'` (Sonnet 5) is the cost-efficient panel** (ties the Opus panel at ~0.4× cost).
  The README "a Sonnet panel ≈ a single pass, skip it" line is now wrong for Sonnet 5 — a *Sonnet-5*
  panel ties the *Opus* panel.
- **On genuine correctness the three arms are tied** (clean judge): single Opus@max ≈ Opus panel ≈
  Sonnet-5 panel; no arm loses. A panel neither clearly *beats* nor *trails* a single strong pass on
  correctness alone — its real payoff is the **verify-loop** on checkable tasks (v5), not the panel tier.
  The triage gate (route most to a single pass; reserve the panel for where the loop can act) stays
  well-justified.
- **Remaining open item** before a flat `PANEL_MODEL` flip / any cost-performance chart change: the
  Opus-panel residual-edge probe on hard *checkable* tasks (flat-default vs gate-routed panel tier). The
  judge-format confound is now cleared.

## Residual-edge probe (v6c) — the Opus panel is cleaner on hard checkable work

v6/v6b measured panels by pairwise correctness (they tied). But a pairwise tie can hide a real gap on the
hardest *checkable* work, where Sonnet 5 trails Opus most on benchmarks. So v6c uses a length-independent
metric: run the kit's prosecutorial verifier (the one the verify-loop uses) on each panel's clean-judge
answer and count **confirmed defects**. Tasks: the 4 checkable/reasoning tasks (systems / debugging /
proof / probability). Harness [run-v6c-residual.js](run-v6c-residual.js), raw
[raw-v6c-residual.json](raw-v6c-residual.json).

**Result: Opus panel 0 confirmed defects, Sonnet-5 panel 3 (across 4 tasks).** The Opus panel was clean
on all four; the Sonnet-5 panel introduced confirmed technical errors on two — `global-counter` (two
order-of-magnitude mistakes in the throughput/consensus math) and `sort-lower-bound` (a false claim that
radix sort "lands back at Ω(n log n)"). So on hard checkable work the Opus panel produces cleaner
*drafts*, even though the two panels tie on the general pairwise audit.

**But the verify-loop mitigates this on checkable tasks** — these are exactly the defects the loop is
built to catch and fix, and it runs on checkable tasks. So the shipped pipeline (Sonnet-5 panel → Opus
judge → verify-loop) likely cleans up the Sonnet-5 panel's extra defects on checkable work; the residual
edge bites hardest where the loop doesn't run or caps out. Whether the loop fully closes the gap
(Sonnet-5-panel + loop vs Opus-panel + loop, final-defect count) is **untested**.

**Implication.** The flat `PANEL_MODEL='sonnet'` default leans on the verify-loop as the safety net on
checkable tasks; `PANEL_MODEL='opus'` (or a future gate-routing of hard-checkable work to an Opus panel)
buys cleaner drafts on that narrow class. n = 4 — directional.

## Caveats

- **n = 12, these tasks only.** Directional. Families uneven (knowledge 8 / reasoning 4).
- **Opus auditor** (same family as the single-Opus and Opus-panel arms) and a tie-permissive audit —
  both bias toward ties, the conservative direction for this claim. Run a manual Gemini cross-audit for
  an out-of-family anchor.
- **Knowledge backfilled** serially after the first pass hit a server-side request throttle (a burst of
  ~250 `max`-effort calls); the backfill ran one task at a time to stay under it.
- The **judge-format confound** is resolved (fixed in `ensemble.js` + re-checked in v6b); the
  single-vs-panel result is a tie. The v6b re-check covered the 8 knowledge tasks only (where v6's gap
  was largest); reasoning was already even under the leaky judge.
