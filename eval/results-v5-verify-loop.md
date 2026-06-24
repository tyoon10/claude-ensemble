# v5 — Auto verify-loop (the kit's strongest quality lever)

The biggest correctness gain in the kit doesn't come from the panel — it comes from **iterating**. After the judge
synthesizes an answer, the kit (on *checkable* tasks) runs a short **verify→revise loop**: a harsh verifier *runs code
and checks* against the task's success criteria, lists the concrete defects it can confirm, a reviser fixes exactly those,
and it re-verifies — up to 3 rounds or until a genuinely clean pass.

This is **automatic and model-determined** — the user never sets a flag. The triage gate decides whether the task is
*checkable* (has verifiable/technical content — code, math, logic, a design with correctness criteria — vs open-ended
judgment or creative work), and the loop runs only when it is.

## What it buys

On hard, checkable tasks (systems design, algorithmic assessment, API evolution, data modeling, ML-eval methodology):

- **Pairwise:** the refined answer was judged **more correct than the un-refined judge output on 100%** of comparisons
  (both answer-orders, correctness-only grading).
- **Defect count (length-independent):** a blind audit counting *concrete, verifiable* defects found the refined answer
  carried **roughly half** the defects of the un-refined one (≈50% fewer; larger with deeper/harsher settings). This
  holds when length is controlled — the refined answer is more correct, not just longer.

Two design findings drive it:
1. **Gate framing is decisive.** A *prosecutorial* verifier ("assume defects exist, hunt for them by running code") is
   several times more effective than a lenient "is this acceptable?" check, which tends to wave answers through.
2. **Tool-grounded verification is the lever.** Running code/checks against the *finished* answer catches errors a single
   generating pass — even a strong, tool-using one — structurally can't, because you can't fully verify an answer while
   you're still writing it.

## Why it's gated, and how the gate behaves

The loop only helps where there's something to *check*. On open-ended/judgment tasks there's no executable ground truth,
so the loop is skipped (and the verifier is told to treat "nothing concrete to execute" as clean, so it self-limits even
if a borderline task slips through). A quick validation of the triage gate on a labeled mix found it **never mis-routed a
genuinely checkable task as non-checkable** (it errs only toward *running* the loop on borderline mixed tasks, where the
cost is small and the verification still catches real sub-claims). That's the safe error direction for this feature.

## Cost & honest limits

- **Cost lands only where it pays:** easy tasks single-pass; non-checkable tasks skip the loop; checkable tasks pay for
  the extra verify/revise rounds (depth is the cost↔quality dial — more rounds, fewer defects, more usage).
- **Defect counts are noisy** — absolute magnitudes vary run-to-run; treat "roughly halves defects" as directional, with
  the *direction* confirmed by two independent methods (pairwise + defect-count).
- **Convergent only.** This is a *checkable*-task lever. On divergent/judgment work it does nothing (by design) — see
  [`results-v4-length-controlled.md`](results-v4-length-controlled.md) for why automated quality scoring saturates there.
