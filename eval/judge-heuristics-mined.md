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

## Validation result (Fable + Opus A/B) — **REFUTED: keep the current judge**

Ran the pre-registered A/B ([`run-v8-judge-ab.js`](run-v8-judge-ab.js), raw
[`raw-v8-judge-ab.json`](raw-v8-judge-ab.json)): same 3 Sonnet-5 drafts → **current judge vs revised
judge** (Opus @ max) → **Fable (primary) + Opus (cross-check)** pairwise, both orders, length-controlled,
on 4 held-out open-ended tasks (`rlhf-superseded`, `vectordb-choice`, `agents-delivered`,
`self-host-vs-api`). Neutral audit (did not prime the discriminators).

| Grader | revised | tie | current |
|---|---|---|---|
| **Fable 5** | 2 | 0 | **6** |
| **Opus 4.8** | 2 | 0 | **6** |

`lengthDriven = 0` for both. Mean synthesis length: revised **8,501** vs current **9,277** chars — the
revised judge *was* leaner (as designed), and it didn't help.

**The revised judge lost 6-2 under BOTH graders — including Fable, the grader whose own criteria the
revision was distilled from.** That agreement makes the refutation robust rather than a circularity
artifact: even the "home" grader rejected it.

**Why it lost — grading criteria ≠ judging instructions:**
1. **It trimmed load-bearing content.** `vectordb-choice`: the *current* judge "adds three things that
   do real work and survive verification" (filtered-search resolution, checkable capacity math, ops
   attribution) that the revised judge dropped — the "extra detail only if load-bearing" line made it
   cut content that *was* load-bearing.
2. **It induced the very leakage it screened for (ironic).** `agents-delivered`: the revised judge
   *opened with* leaked process narration ("All four load-bearing facts check out… I'll write the
   synthesis from verified ground, drop the self-referential…"). Telling the judge to "verify
   load-bearing claims… held to that same standard" made it *more* prone to narrating its verification
   — the exact process-leakage that discriminators #2/#5 were meant to catch.
3. **Weaker dialectic.** `rlhf-superseded`: the current judge's synthesis had a "genuinely stronger"
   counterargument and a "crisp resolving argument"; the revised judge's was more conciliatory/trimmed.

The **one** revised win (`self-host-vs-api`, Fable 2-0) came where the revised judge was much shorter
(7,152 vs 9,881) and Fable preferred the leaner answer — so the trimming helps *only* where the current
judge over-produces, which was the minority case.

**The lesson (the real finding):** what a strong **grader** rewards when *comparing* answers (lean,
trustworthy, no fabrication/leakage) is **not** what a **judge** should *do* when *synthesizing*
(produce the richest, sharpest, most complete answer). Injecting grading-penalty criteria as judging
*instructions* made the judge risk-averse and self-conscious — it trimmed value and performed
verification hygiene instead of writing the best answer. The current judge's simpler mandate
("synthesise the best, most correct answer; don't leak process") wins.

**Ship decision: do NOT ship the revised judge. `ensemble.js` unchanged.** The mining was method-
sound and the discriminators are real *as grading signals*; the error was the **transplant hypothesis**
(grading criteria → judging instructions). This is the do-no-harm validation working as intended: the
candidate looked well-grounded and sharp, and the A/B showed it degrades the judge. (Corollary for the
[fable-loop](../../fable-loop/RESEARCH-PLAN.md) open-ended lane: mine Fable's grading to build better
*graders/verifiers*, not to script the *synthesis* step.)
