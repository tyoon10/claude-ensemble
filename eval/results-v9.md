# claude-ensemble eval v9 — the executable oracle (running log)

Pre-registered in [`PLAN-v9.md`](PLAN-v9.md): replace the noisy LLM residual grader with deterministic
per-task oracles, then re-run the verify-loop A/B (Gate C).

## Suite admission — 11/11 on the first pass

11 tasks authored ([`oracle-tasks/`](oracle-tasks/)), each with a strict output contract, a 5–10-check
oracle, a reference, and a sabotaged variant. Admission protocol (oracle(reference)=0 ∧
oracle(sabotage)≥1): **11/11 admitted**, no crashes/timeouts.

## Phase A — initials + Fable solos: **zero headroom on this suite**

One produce-mode answer per task from **Opus 4.8** and **Fable 5** (matched effort `high`), oracle-scored
locally ([`raw-v9-phaseA.json`](raw-v9-phaseA.json), [`raw-v9-phaseA-scores.json`](raw-v9-phaseA-scores.json)):

| | total oracle defects (11 tasks) |
|---|---|
| Opus initial | **0** |
| Fable solo | **0** |

**Both models aced every task** — every edge-case trap (touching intervals, odd boundaries, k=0,
duplicate runs, exponent towers) was cleared on the first pass by both.

**Finding 1 (headroom, oracle-clean).** On well-specified, contract-driven, *classic* checkable tasks,
a single high-effort Opus pass is already at ceiling — and **Fable 5 adds nothing** (0 = 0). There is
no gap for an ensemble, a verify-loop, or a stronger model to close on this task class. This is the
noise-free version of v6's "panel ≈ single" and directly validates the kit's triage-gate design (route
simple checkable work to a single pass).

**Micro-observation.** Same correctness, different styles: Opus reached for the pragmatic stdlib
(`OrderedDict` LRU); Fable hand-rolled a sentinel doubly-linked list with input validation —
first-principles construction even where a library suffices. Style, not correctness.

**Go/no-go (pre-registered): HARDEN.** The plan's Phase-A gate fired — with 0-defect initials, Phase B
would measure nothing. Diagnosis: the suite's tasks are *textbook-shaped* (merge-intervals, LRU, KMP,
coupon collector); the planted traps sit exactly where strong models' training saturates. Headroom on
executable tasks requires **counter-template** problems — specs that *look* like a classic but deviate
in a load-bearing way, unusual compositions, and anti-pattern-match numerics — where the memorized
template is the wrong answer.

**Suite disposition.** The 11 zero-defect tasks are retained as **oracle-scored do-no-harm probes** for
Phase B (does an aggressive verify-loop damage a perfect answer? — now measurable deterministically).
A hardening round authors counter-template tasks, admitted only if (reference=0 ∧ sabotage≥1 ∧ **a live
Opus produce-mode solve scores ≥1 defect**) — headroom manufactured by construction, not hoped for.

## Hardening round — 0/12 hard-admitted: counter-templates ALSO aced

12 counter-template tasks ([`oracle-tasks-hard/`](oracle-tasks-hard/)) designed to defeat memorized
templates (max-not-sum weighted coverage, *prev*-permutation with wrap, LFU-with-LRU-ties, a bespoke
ring automaton, mutating-step Josephus, a twisted urn, border-not-period, touch-conflict scheduling,
negabinary, no-double-R lattice paths, stepwise banker's-rounding netting, closed-interval XOR
counting). All 12 oracles valid (reference=0, sabotage≥1). Live produce-mode probes
([`raw-v9-hard-admission.json`](raw-v9-hard-admission.json)): **Opus 0 defects on 12/12; Fable 0 on
12/12.**

**Finding 2 — the authoring bind.** A self-authored oracle suite is hardness-bounded by its
author-model: the reference answer's existence proves the task is within the author's ceiling, so an
Opus-authored suite cannot systematically defeat an Opus solver. Self-authored executable evals
saturate at the author's capability. (Defeating the solver requires tasks *sourced beyond* it —
external benchmarks, real-repo work — which is exactly what SWE-bench-class suites are.)

## Bundle probe — attention-dilution hypothesis: REFUTED on this class

v8's real defects lived in *long compound prose*, suggesting defects come from attention dilution
across a long deliverable rather than per-task difficulty. Test (zero new authoring): all 12
counter-template tasks demanded in ONE compound answer (27K-char prompt), scored per-section by the
same oracles ([`raw-v9-bundle.json`](raw-v9-bundle.json), [`raw-v9-bundle-scores.json`](raw-v9-bundle-scores.json)):

| | bundle total (12 sections) |
|---|---|
| Opus | **0 defects** |
| Fable | **0 defects** |

Compound load *did* change behavior — visible **effort economy** (in the bundle Opus wrote a
brute-force `prev_permutation` and set-based interval counting where the individual solves engineered
proper algorithms) — but the economized solutions remained correct. Rational resource allocation, not
degradation.

## v9 conclusion — saturation, and the verify-loop's value scoped

**70 oracle-scored task-instances, zero defects** (Phase A 22 + hardening probes 24 + bundle 24), both
models, matched effort, across classic, counter-template, and compound-bundle conditions.

1. **On self-contained executable tasks, a single high-effort Opus pass is at ceiling** — no defect
   population exists for a panel, verify-loop, or stronger model to improve. The noise-free
   generalization of v6's "panel ≈ single," and the strongest validation yet of the kit's triage gate
   (route such work to a single pass; the ensemble premium buys nothing here).
2. **Headroom vs Fable 5 = zero on this entire class** (0 = 0 everywhere) — consistent with v8-P2:
   capability was never the gap.
3. **Gate C is unreachable — and that is the answer.** Phase B would measure 0 vs 0 vs 0 vs 0. The
   verify-loop's measured value (v5's halving, v8's ceiling work) is therefore **scoped to long-form
   prose-checkable reasoning** — designs and proofs where the deliverable is an *argument* execution
   can't fully grade. The irony is structural: tasks that CAN be graded by execution don't need the
   loop; the loop's home is precisely where execution can't reach. `ensemble.js` unchanged.

**Method contribution.** The oracle paradigm worked exactly as designed — deterministic, free,
instant re-scoring; admission protocol (reference=0 ∧ sabotage≥1) caught zero bad oracles out of 23
because authors self-verified against it — and it produced clean *negative* space: we now know where
the kit's premium is wasted, with a metric that cannot waver.
