# v9 pre-registration — the executable oracle: measurement, not opinion

*Committed before execution (2026-07-04). v8's blocker was the measurement instrument, not the
mechanism: the Fable residual grade swings 0–3 on identical long text, so the CBR/V1 verify-ship
decision could not be adjudicated. v9 replaces the LLM grader with a **deterministic executable
oracle** and re-runs the decisive A/B.*

## Design

**Task suite.** ~10 hard checkable tasks with **strict output contracts** (a single ` ```python `
block with a named function, or a single ` ```json ` block with exact keys) so extraction is regex,
not LLM. Families: edge-case-prone code (interval merge, binary-search insertion on duplicates, LRU,
next_permutation, string/KMP), exact numerics (coupon-collector values — continuity with v6c/v8;
probability traps; modular arithmetic), algorithmic counts (merge lower-bound m+n−1 — continuity with
v8 held-out). Tasks are designed so a strong-but-unchecked answer plausibly fails ≥1 hidden check —
the trap sits where produce-mode glosses (empty/odd/boundary cases).

**Oracle.** Per task, a Python script: answer text in → extract deliverable → run 5–10 independent
hidden checks → JSON defect list out. Same input → same verdict, always.

**Oracle validation protocol (before any A/B data).** Every task ships with a reference solution and
a subtly-sabotaged variant; an oracle is admitted only if it scores **reference = 0 defects** and
**sabotage ≥ 1**. Tasks failing validation are fixed or dropped (target ≥ 8 admitted).

**Phase A — initials + headroom (then a local go/no-go).** One produce-mode initial answer per task
(Opus, high) + one **Fable-solo** answer per task (the metered window closes ~Jul 7; this is the last
cheap chance at the kit-vs-Fable headroom number, now on a noise-free metric). Score locally. If
initial answers are ~0-defect across the suite (no headroom), harden tasks before Phase B. Tasks where
the initial scores 0 become **oracle-scored do-no-harm probes** for Phase B.

**Phase B — the A/B (all Opus; zero Fable).** On the *same* initial answer per task, run four arms:
`none` (initial as-is) · `baseline` verify-loop · `V1` verify-loop · `CBR` (V1 + confirm gate), cap 3.
Score finals with the oracle.

**Pre-registered ship gate (Gate C).** An arm ships into `ensemble.js` iff, vs baseline: (a) strictly
fewer **total oracle defects** across the suite; (b) better-or-equal on more tasks than worse; (c) no
regression on the zero-defect (do-no-harm) tasks; (d) the P7 flag-rate do-no-harm result stands. If V1
and CBR both pass, prefer CBR only if it beats V1 or the confirm gate demonstrably filtered a false
positive; otherwise ship the cheaper V1.

**Honest scope limit.** The oracle only measures mechanically-checkable defect classes (edge cases,
numerics, counts) — the T4-style families. Prose-design defects (T1 guarantee-vs-mechanism) stay
outside the oracle's reach; v8's evidence remains the word on those. A Gate-C ship claims improvement
on checkable-executable work, no more.

**Budget.** Fable: ~10–12 calls (Phase A solo arm only; all measurement is free and deterministic).
Everything else Opus/Sonnet. Phase B is fully repeatable post-window.
