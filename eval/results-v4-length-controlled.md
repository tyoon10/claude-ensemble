# v4 — Length-controlled verification (the most honest read)

v3 moved the metric to blind **pairwise win-rate** + a non-Claude grader. But pairwise grading turns out to carry a
**residual length/completeness bias**: shorter answers lose even when they're equally correct, *despite* the judge being
told to ignore length. To separate genuine **correctness** from mere **completeness**, v4 runs **length-controlled
adversarial audits** — per task, a *prosecutor* lens (hunt for real errors / omitted required points) and a *defender*
lens (steelman the other answer), each explicitly told: a longer answer is not better unless the extra content is correct
*and* required; a shorter correct answer is not worse for being shorter.

## What was compared (three arms, all on the same 8 hard tasks)

- **Single** — one Opus pass at **`effort: max`** with a verify-then-answer instruction (a *matched-effort* baseline).
- **Sonnet panel** — three Sonnet drafts → a `max` verifying Opus judge.
- **Opus panel** — three Opus drafts → a `max` verifying Opus judge.

The Opus/Sonnet drafts run at `high`; every synthesizer/judge and the single baseline run at `max` — so the single pass
is **not** under-powered relative to the panel.

## Result — genuine correctness, length controlled (16 verdicts per audit)

| audit | correctness verdicts | length-driven | raw pairwise had said… |
|---|---|--:|---|
| **Sonnet panel vs single** | tie 10 · single 5 · panel 1 | **0/16** | single 79% (Sonnet judge), 100% (Gemini) |
| **Opus panel vs Sonnet panel** | tie 12 · Opus-panel 3 · Sonnet-panel 1 | **6/16** | Opus-panel 72–100% |

Both collapse to **near-ties** once length is controlled. The dramatic pairwise gaps were **length/completeness
artifacts**.

## What it means

1. **On genuine correctness, the three arms are roughly tied** — single Opus ≈ Sonnet panel ≈ Opus panel, with the Opus
   panel only *marginally* ahead. The large pairwise win-rates over-stated the gaps.
2. **Blind LLM pairwise grading systematically over-states panel advantages** via a residual length/completeness bias,
   even when instructed to ignore length. A real correctness comparison needs length-controlled verification, not raw
   win-rate. *(This is the most useful methodological takeaway here.)*
3. **The Opus panel is not uniformly better.** On one task the *Sonnet* panel was more correct — it closed an oversell
   durability hole (synchronous replica ack) that the Opus panel left open while claiming "never oversold," and got a
   Redis Lua guard right that the Opus panel got wrong. Panels do not *guarantee* correctness.
4. **Practical optimum: a single Opus pass at `effort: max` + a verify-then-answer prompt.** It's within mostly-tied
   correctness of the Opus panel at ~1/3.5 the cost. The Opus panel buys a *marginal* real edge — worth it only on the
   highest-stakes, checkable work. The **Sonnet panel ≈ a single pass** on genuine correctness, so it isn't worth its
   extra cost over a single Opus pass.

## Caveats

- **n = 8 tasks / 16 verdicts per audit, these tasks only.** Directional.
- **Opus verifiers** (same family as the panel) and a **tie-permissive** audit — both bias *toward* finding ties, which
  is the conservative direction for this claim.
- This refines, not erases, v3: the ~60% Opus-panel-vs-single pairwise edge is real (and not length-confounded, since
  those two answers are the same length) — but it is a *mild forced-choice preference* that mostly reduces to ties under
  a strict correctness audit.
