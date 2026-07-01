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
3. **A single Opus@max pass is not beaten by the panel** — length-controlled it is *ahead* (single 8 /
   panel 4 / tie 12), concentrated in knowledge. **But this is partly a judge-output artifact** (below),
   so read it as "the panel does not beat a single strong pass," not a clean single-pass win.

## Methodological catch — the judge leaks its scaffolding

The audits repeatedly penalized the *panel* answers (both tiers) for grader-facing meta-commentary:
"Candidate A/B/C", "verification notes", "the three candidates converge". The `max` Opus judge is
**echoing the blind-candidate framing into its synthesis**, which a clean single pass never does. This
disadvantages *both panels vs the single pass* (consistent with the panels tying each other but both
losing to single), so the "single ≥ panel" gap is **partly a judge-prompt artifact, not pure
capability**. It is fixable: tighten the judge prompt to emit a clean, standalone answer with no
candidate/verification scaffolding, then re-check. Until then the single-vs-panel *magnitude* is not a
clean read.

## What it means for the kit (provisional)

- **`PANEL_MODEL='sonnet'` (Sonnet 5) is supported** as the cost-efficient panel default (ties the
  Opus panel at ~0.4× cost). The README "a Sonnet panel ≈ a single pass, skip it" line is now wrong for
  Sonnet 5 — a *Sonnet-5* panel ties the *Opus* panel.
- **The case for running any panel over a single Opus@max pass stays weak** — length-controlled, the
  single pass is at least as good. The triage gate (route most tasks to a single pass) is reinforced.
- **Hold** the flat config flip and any cost-performance chart change until (a) the judge-prompt
  confound is cleared, and (b) the Opus-panel residual-edge probe on hard *checkable* tasks settles
  flat-default vs gate-routed panel tier.

## Caveats

- **n = 12, these tasks only.** Directional. Families uneven (knowledge 8 / reasoning 4).
- **Opus auditor** (same family as the single-Opus and Opus-panel arms) and a tie-permissive audit —
  both bias toward ties, the conservative direction for this claim. Run a manual Gemini cross-audit for
  an out-of-family anchor.
- **Knowledge backfilled** serially after the first pass hit a server-side request throttle (a burst of
  ~250 `max`-effort calls); the backfill ran one task at a time to stay under it.
- The **judge-format confound** above is unresolved; the single-vs-panel result is provisional pending
  the fix + re-check.
