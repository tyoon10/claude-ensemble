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
