---
description: Run a diverse Claude panel + Opus judge on a hard task — frontier-style answers on your subscription, no API keys.
argument-hint: <a hard question or task>
---

You are orchestrating **claude-ensemble**: a panel of diverse Claude sub-agents draft answers in parallel, then an Opus judge synthesizes one best answer. Everything runs on the user's Claude subscription.

The task:

<task>
$ARGUMENTS
</task>

Follow this procedure exactly:

1. **Triage (cheap).** Decide whether the task actually needs the ensemble. If it is simple — a lookup, a short factual answer, a trivial edit, or anything a single pass answers well — print `Ensemble: simple task, answering directly.` and just answer it. Do not spawn the panel for easy work; it wastes the user's usage limits.

2. **Fan out the panel (parallel).** If the task is non-trivial (multi-step reasoning, design, analysis, hard debugging, research, trade-off calls), launch all THREE panel members in a SINGLE message so they run in parallel, each given the full task verbatim:
   - `ensemble-drafter` — the best first-principles answer.
   - `ensemble-adversary` — an answer that deliberately avoids the tempting-but-wrong approach.
   - `ensemble-alt-method` — an answer reached via a deliberately different method or decomposition.

3. **Quorum.** Collect their answers. If only two return usefully, continue. If only one does, note that and continue with it.

4. **Judge (Opus).** Launch `ensemble-judge` with the original task and the candidate answers presented under **blind, neutral labels** (`Candidate A`, `Candidate B`, `Candidate C`), in shuffled order, with **no indication of which sub-agent wrote which**. Ask it to verify each candidate, score per-criterion, resolve contradictions, discard unsupported claims, and produce one final answer better than any single candidate.

5. **Return.** Give the user the judge's synthesized answer as the result. You may add at most one short line noting any substantive disagreement the panel had (useful signal), but lead with the answer.

Rules:
- Keep provenance hidden from the judge (blind labels, shuffled order) — this reduces judge bias.
- Do not invent any sub-agents or models beyond the four defined in this kit (ensemble-drafter, ensemble-adversary, ensemble-alt-method, ensemble-judge).
- If the user clearly wants you to *act* (apply an edit, run something) rather than just produce an answer, run the ensemble to decide the approach, then act on the synthesized plan.
