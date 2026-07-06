# Mining strong-grader judging heuristics → an improved JUDGE prompt (open-ended track)

The v8 **open-ended JUDGE track** ([PLAN-v8.md](PLAN-v8.md) pre-registered it; executed here). We
recovered the strong graders' *judging rationales* from the v7 journal — their pairwise comparisons of
the two judge syntheses (`opusJudge` vs `sonnetJudge`) on the 3 divergent tasks — distilled the
discriminators, and drafted a revised JUDGE prompt. **Zero new Fable calls** (all recovered from disk;
distillation + critique on Opus). Raw in [`raw-judge-heuristics.json`](raw-judge-heuristics.json).

**Provenance & honesty.** 18 divergent audit rationales (3 tasks × 3 strong graders — Fable 5, Opus
4.8, Sonnet 5 — × 2 orders), recovered from the v7 run journal (`raw-v7.json` kept only the win/tie
*tallies* and dropped the reasoning). Per-record grader attribution isn't clean, so these are **"what
strong graders reward,"** with Fable's contribution woven in — Fable was the grader that credited the
*longer-but-better* answer on merit (zero length-driven verdicts), which surfaces as the anti-length
discriminator below. Cross-grader convergence is a feature (more reliable than one model's quirks), not
a pure "Fable fingerprint."

## The core finding: on open-ended tasks, correctness SATURATES

Of the 18 comparisons, **8 were ties, and every non-tie turned on a NEGATIVE trust/relevance defect** —
never on which synthesis had more content. The graders repeatedly found both syntheses "near-isomorphic"
and "hitting all criteria." So on divergent work the judge's real job is not *"which is more correct"*
(they tie) but **"which is more trustworthy / on-task."** The shipped judge prompt is correctness-first
and goes *silent* exactly at that saturation point — the gap this fills.

## The discriminators (priority order, data-grounded)

1. **Fabrication risk** — invented / too-clean specificity (post-cutoff numbers, dates, citations,
   prices; "suspiciously clean precise numbers," implausible venues) loses to an equally-informative
   **hedged range**. *The heaviest tie-breaker.*
2. **Off-task / leaked content in the deliverable** — including **orchestration/process preambles**
   ("Verification complete…", references to unseen "candidates"). *The most frequently deciding
   discriminator.*
3. **Brittle over-precise claims** where a hedged range carries equal analytical load.
4. **Verified-wrong or internally-inconsistent magnitudes** (e.g., an answer's own numbers imply ~20×
   but it states "~5×").
5. **Self-contradiction within one answer** (quick-reference table vs. detailed prose).
6. **(+) Demonstrated self-verification** — the rare *positive* tie-breaker (an answer that visibly
   catches and fixes its own error is credited).
7. **Severity meta-rule** — fabricated/contradictory *evidence* corrupts trust more than *inert*
   off-task noise; rank competing defects by this.
8. **Counter-pattern guardrail** — extra detail tips a verdict *only* when verified true **and**
   load-bearing; raw density/length never does.

## Notable meta-observation (a real, actionable defect the data surfaced)

The current judge prompt already says *"do NOT reference … your verification process."* Yet v7's
`opusJudge` outputs **leaked it anyway** ("Verification complete… one candidate's claim…"), and some
panel drafts carried an **off-task "Gmail/Calendar connectors" paragraph** — an eval-environment
system-reminder bleeding into the synthesis. So the anti-leakage instruction was under-obeyed and an
off-task screen was missing entirely — both now addressed in the revision.

## Current vs. revised JUDGE prompt

**Current (shipped):**
> You are the judge of an ensemble. … Treat each as a claim to verify … and **score per-criterion**
> against the task's real success criteria (not tone, length, or label order), resolve contradictions
> explicitly, discard unsupported or fabricated claims, and synthesise ONE final answer better than any
> single candidate. … Output ONLY that final answer … do NOT reference the candidates, the labels, or
> your verification process …

**Revised (candidate — UNVALIDATED):**
> You are the judge of an ensemble. Below are independent candidate answers under blind labels — do not
> state or guess which model wrote which. Verify load-bearing claims (run code, computation, or lookups
> where it pays), discard whatever is unsupported, fabricated, or verifiably wrong, resolve
> contradictions, and synthesise ONE answer better than any candidate — overriding all of them if they
> are wrong. Prefer correctness over splitting the difference.
>
> When candidates are near-identical and all correct, do not reward the longer or denser one — separate
> them on trust: distrust invented or too-clean specificity (post-cutoff numbers, dates, citations,
> prices) over an equally-informative hedge, off-task or leaked orchestration content, and
> self-contradiction — a fabricated or self-contradictory claim corrupts trust more than inert leftover
> text. Extra detail counts only when it is both true and load-bearing.
>
> Output ONLY the final answer to the ORIGINAL TASK, written from scratch and held to that same
> standard. Never mention the candidates, the labels, or your verification.

**What changed, each tied to a discriminator:** (1) added the **saturation + anti-length rule** (the
gap); (2) gave "fabricated" a **detection heuristic** (#1, #3); (3) added an **off-task / leaked-preamble
screen** (#2, #5); (4) extended contradiction-handling to **within one answer** + a **severity ranking**
(#5, #7); (5) broadened verification to catch **verified-wrong magnitudes** (#4) and applied the standard
to the **judge's own output**. Notably *dropped* "score per-criterion" — the over-instruction critic
flagged it as literal scoring-rubric language (the −4.7 failure mode).

## Guardrail: the over-instruction hazard was enforced

The −4.7 finding (over-instructing the judge with a rigid procedure = worst arm ever) was hard-wired as
a constraint, and two adversarial critics pruned the draft: the **over-instruction critic** cut
"per-criterion" scoring language and compressed an enumerated suspicion-triad into one flat sentence;
the **groundedness critic** confirmed 7 of ~9 additions trace to a real discriminator. The final is
~150 words, behavior-eliciting, not a checklist.

## Status: UNVALIDATED — not shipped

Distilled from **n=3 divergent tasks**, and because correctness saturates these discriminators are
inherently **soft, low-separation signals**, not hard rules. `ensemble.js` is **unchanged.** The next
step to justify shipping is a **Fable-graded A/B**: revised judge vs current judge, synthesizing the
same panel drafts on held-out open-ended tasks, checking the revision wins (or ties) without regressing
the cases where correctness alone already decides. Until then this is a documented, reproducible
finding, not a change.
