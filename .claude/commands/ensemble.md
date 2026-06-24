---
description: Run a best-of-N Claude panel + Opus judge on a hard task — frontier-style answers on your subscription, no API keys.
argument-hint: <a hard question or task>
---

You are orchestrating **claude-ensemble**: several Claude sub-agents answer the task independently in parallel, then an Opus judge verifies and synthesizes one best answer. Everything runs on the user's Claude subscription.

The task:

<task>
$ARGUMENTS
</task>

Follow this procedure exactly:

1. **Triage (cheap).** Decide two things. **(a) Complex?** If the task is simple — a lookup, a short factual answer, a trivial edit, or anything a single pass answers well — print `Ensemble: simple task, answering directly.` and just answer it. Don't spend the panel on easy work; it wastes the user's usage limits. **(b) Checkable?** Note whether the answer has *verifiable/technical* content — code, math, logic, quantitative or factual claims, or a design/protocol with explicit correctness criteria — that running code or computations could actually check (vs open-ended judgment, strategy, or creative work with no single right answer). You'll use this in step 5.

2. **Fan out the panel (parallel).** If the task is non-trivial (multi-step reasoning, design, analysis, hard debugging, research, trade-off calls), launch **three `ensemble-panelist` sub-agents in a SINGLE message** so they run in parallel, each given the full task verbatim. They answer independently — the natural variation between runs is what gives the judge material to synthesize (best-of-N).

3. **Quorum.** Collect their answers. If only two return usefully, continue. If only one does, note that and continue with it.

4. **Judge (Opus).** Launch `ensemble-judge` with the original task and the candidate answers under **blind, neutral labels** (`Candidate A`, `Candidate B`, `Candidate C`), in shuffled order, with **no indication of which sub-agent produced which**. Ask it to verify each candidate, resolve contradictions, discard unsupported claims, and produce one final answer better than any single candidate.

5. **Auto verify-loop (checkable tasks only — automatic, never a user choice).** If you flagged the task as *checkable* in step 1, harden the judge's answer before returning it. Act as a harsh adversarial verifier: assume it has defects and hunt for them by **running code, computations, or checks** against the task's success criteria. Flag only *concretely verifiable* defects (confirmed by execution or a clear criterion) — never subjective, stylistic, or judgment issues, and don't invent defects. If you find real defects, revise the answer to fix exactly those (preserving what's already correct), then re-verify; repeat up to **3 rounds** or until a genuinely clean pass. For non-checkable tasks, skip this — there's nothing to verify against. (Measured to roughly *halve* real defects on hard checkable work — the kit's strongest quality lever, and it costs nothing on tasks that don't need it.)

6. **Return.** Give the user the final answer (refined, if step 5 ran). You may add at most one short line noting any substantive disagreement among the candidates.

Rules:
- Keep provenance hidden from the judge (blind labels, shuffled order) — this reduces judge bias.
- Use the two sub-agents defined in this kit — `ensemble-panelist` (run 3×) and `ensemble-judge` — and run the step-5 verify-loop yourself with code execution (no extra sub-agent needed).
- If the user clearly wants you to *act* (apply an edit, run something) rather than just produce an answer, run the ensemble to decide the approach, then act on the synthesized plan.
