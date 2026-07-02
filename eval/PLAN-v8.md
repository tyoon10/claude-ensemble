# v8 pre-registration — the Fable window: raising the verifier ceiling

*Committed before execution (2026-07-02). Hypotheses, metrics, arms, and gates below are fixed
before any v8 data exists; deviations will be reported as such in `results-v8.md`.*

## Motivation

Fable 5 is back for a limited, metered window (through ~Jul 7). The kit must stay
**"Fable not used or required"** — so Fable is a *teacher, not a component*: we use it to
(1) solve hard tasks and leave behavioral traces, (2) grade with the strongest independent
judgment available, and (3) directly author candidate prompt revisions. All improvements land
as prompt/config changes for the Opus/Sonnet/Haiku stages the kit actually ships.

**The one question.** v7's sharpest finding is the **self-verification ceiling**: every
verify-loop self-reported *clean* while a neutral Fable grader still found 2–4 confirmed
defects ([results-v7.md](results-v7.md)). The loop converges to "clean per its own verifier,"
so the verifier model caps the loop. v8 asks: **can the Opus verifier's *effective* ceiling be
raised without a stronger model** — by prompt, by lens diversity, or not at all?

**What Fable cannot give us.** Fable never returns raw chain-of-thought. What we *can* observe
is the behavioral log Claude Code keeps for every sub-agent: full tool-call sequence, the code
it writes and runs, tool results, revisions, timing, output. Trace claims below are claims
about *behavior*, never about hidden reasoning.

## Prior-driven pruning (what we deliberately do NOT study)

From v1–v7 priors, these hypotheses are dropped from the critical path:
verify-during-solve and self-adversarial passes (≈ the verify-loop itself — and *same-model*
self-checking is exactly what hits the ceiling), decompose-first scaffolds (inside the
over-instruction hazard: the rigid-procedure judge was the worst arm ever measured, −4.7),
shorter/denser style (already length-controlled away), and divergent-task process claims
(no oracle; n too small). What remains decision-relevant: **edge-case enumeration** and
**minimal-falsifying-test verification style** — both properties of a *verifier*.

## Phases

**P0 — Recover the missed-defect record (zero Fable, zero cost).** The v7 neutral grader's
defect *texts* were persisted only as counts, but the full strings survive in the v7 workflow
journal on disk. Mine them, plus the v6c confirmed-defect lists, into a **missed-defect
taxonomy**: for each defect the Opus verifier declared clean but Fable caught — what class is
it (edge case, spec violation, quantitative slip, unstated-assumption, deep-insight), and
which check *would* have caught it? **Gate A:** if the missed defects are expressible as
runnable checks → proceed. If they are pure capability (insight no checklist reaches) → the
honest conclusion is "the verifier tier is the ceiling; route harder verification to a
stronger model," and prompt work stops there.

**P1 — Fable solves + traces (the heavy Fable spend, run first).** The 3 known-residual
checkable tasks (global-counter, sort-lower-bound, coupon-collector) solved by **Fable**
(effort high, tools) and **Opus@max** (tools), n=2 samples each, identical minimal prompt
("solve; tools allowed; final answer") so the process observed is the model's own, not a
scaffold's. All transcripts snapshotted + manifest built (agent → task/model/sample).
Secondary, cheap because the solves already exist: a small **Fable-solo vs ensemble-final**
head-to-head, graded pairwise both orders by the family-disjoint grader (Sonnet grades
Opus-ensemble vs Fable pairs), length-controlled. This measures headroom for context; it is
**not** a kill gate.

**P2 — Trace mining (zero Fable).** Opus agents extract per-transcript profiles restricted to
**execution-grounded markers only**: tests written, code run per claim, revision-after-failing-run,
edge cases actually exercised. Stylistic/timing features are excluded (noise; presentation ≠
cognition). The transfer control: a *within-model* signal — when Opus samples happen to show a
marker, do they leave fewer defects? Markers promoted to intervention only if the within-model
signal agrees (this is the guard against the capability-vs-technique confound). Deliverable:
what did Fable **check** that our verifier didn't — mapped against the P0 taxonomy.

**P3 — Candidate VERIFY arms (light Fable, ≤4 calls).** All arms are minimal diffs to the
shipped `VERIFY` stage; every arm is dose-checked against the over-instruction hazard:
- **V1 — Fable-authored.** Fable gets ensemble.js, the P0 taxonomy, and the P2 diffs; it
  authors a minimal VERIFY revision (and any one-line PANELIST/REVISE suggestion it insists on).
- **V2 — Trace-derived.** Human-synthesized from P2's promoted markers (expected shape:
  enumerate-edge-cases-then-test-each; one minimal falsifying test per load-bearing claim).
- **V3 — Multi-lens verify.** Architectural: replace one prosecutor with 2–3 parallel
  *differently-lensed* verifiers (edge-case hunter / spec-compliance auditor / quantitative
  checker), union of confirmed defects. Same model tier — tests whether the ceiling is lens
  coverage rather than capability.
V1 is the benchmark: if mining-derived V2 can't beat the cold Fable rewrite, the mining detour
carried narrative, not information — and we say so.

**P4 — Validation (moderate Fable, the other big spend).** Baseline vs ≤3 arms, checkable
tasks only for the primary metric, including **freshly authored held-out tasks partitioned by
defect class** (an arm must win on defect classes it was not derived from). Primary metric:
**neutral-grader residual confirmed defects on finals** (Fable, the v7 metric — graded while it
still exists). Secondary: rounds used (cost), and a **do-no-harm regression check on 2
divergent tasks** (the −4.7 prior says scaffolds can backfire). Pre-registered decision rule,
**Gate B:** ship an arm only if it strictly reduces residual defects on the unseen-defect-class
partition and does not regress divergent quality; if all arms fail, publish the negative
result plus the n-hardened ceiling evidence — that is a shippable outcome.

**P5 — n-hardening (any remaining Fable budget).** The v7 ceiling finding rests on n=6 tasks.
Whatever budget remains before the window closes goes to widening the Fable-graded evidence
base for whichever config ships (old or new). Grading is the one thing that cannot be done
after Jul 7; mining and writing can.

## Operational safeguards (pre-committed)

- **Model pinning.** Every `agent()` call in every v8 harness pins `model:` explicitly; the
  session default is never relied on (the session model may be Fable — an unpinned call would
  silently spend the metered budget).
- **Fable ledger.** Hard cap ≈ **40 Fable calls** for the whole campaign, counted in the
  harness; on cap, grading degrades to Opus automatically and the degradation is reported.
- **Persist everything this time.** v8 raw files keep full defect *strings*, all finals, and
  per-cell metadata. Transcript dirs snapshotted with a manifest before mining.
- **Incremental + resumable.** One parametrized harness per phase; per-cell results; smoke-run
  (1 task) before each full launch; workflow resume used on stalls.
- **Serial-first**, small bounded parallelism only where prior runs proved it safe.
- **Checkpoint (Jul 3 AM):** if P1 is unfinished or the ledger is >60% spent, cut to the
  minimal trio — P0 taxonomy → V1-vs-baseline only → P4 on the 3 known-residual tasks.

## Budget & timeline

Fable calls: P1 solves ~8–10 (the heavy, irreplaceable ones) · P3 ≤4 · P4 grading ~20 ·
P5 remainder — ≈ 35 of the 40 cap. Wall-clock: P0 today; P1 launched today, completes
overnight; P2–P3 Jul 3; P4 launched Jul 3 night → read Jul 4; P5 Jul 5–6; buffer before Jul 7.

## Deliverables

`results-v8.md` (taxonomy → arms → validation, negative results included), `raw-v8*.json`
(defect strings + finals persisted), the missed-defect taxonomy, the head-to-head headroom
number, and — only if Gate B passes — a VERIFY-stage change to `ensemble.js`.
