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

1. **Triage (cheap).** Decide whether the task actually needs the ensemble. If it is simple — a lookup, a short factual answer, a trivial edit, or anything a single pass answers well — print `Ensemble: simple task, answering directly.` and just answer it. Don't spend the panel on easy work; it wastes the user's usage limits.

2. **Fan out the panel (parallel).** If the task is non-trivial (multi-step reasoning, design, analysis, hard debugging, research, trade-off calls), launch **three `ensemble-panelist` sub-agents in a SINGLE message** so they run in parallel, each given the full task verbatim. They answer independently — the natural variation between runs is what gives the judge material to synthesize (best-of-N).

3. **Quorum.** Collect their answers. If only two return usefully, continue. If only one does, note that and continue with it.

4. **Judge (Opus).** Launch `ensemble-judge` with the original task and the candidate answers under **blind, neutral labels** (`Candidate A`, `Candidate B`, `Candidate C`), in shuffled order, with **no indication of which sub-agent produced which**. Ask it to verify each candidate, resolve contradictions, discard unsupported claims, and produce one final answer better than any single candidate.

5. **Return.** Give the user the judge's synthesized answer as the result. You may add at most one short line noting any substantive disagreement among the candidates.

Rules:
- Keep provenance hidden from the judge (blind labels, shuffled order) — this reduces judge bias.
- Use only the two sub-agents defined in this kit: `ensemble-panelist` (run 3×) and `ensemble-judge`.
- If the user clearly wants you to *act* (apply an edit, run something) rather than just produce an answer, run the ensemble to decide the approach, then act on the synthesized plan.
