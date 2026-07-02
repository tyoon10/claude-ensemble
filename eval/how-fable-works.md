# How Fable works — a living model

A **behavioral** model of Claude Fable 5, built to guide (and be corrected by) the v8 campaign.
It is a hypothesis under test, not settled fact. Every claim here is inferred from **observable
behavior** — tool calls, code executed, defects produced, prompts authored — never from raw
chain-of-thought (Fable never returns it). A refuted claim is a finding; strike it and log why.

## Baseline — Fable-as-teacher does three kinds of work

The kit never runs Fable. In v8 it acts as a teacher through exactly three executions, each
yielding a different artifact we distill into an Opus/Sonnet-run prompt:

| # | Execution | What we observe | Artifact distilled | Status |
|---|---|---|---|---|
| **SOLVE** | Fable solves a hard task with tools | tool-call sequence: code written + run, edge cases exercised, revisions | the *checks* it ran that our verifier didn't | baseline — P1 tests it |
| **GRADE** | Fable adversarially verifies an answer | the confirmed-defect strings it emits | the missed-defect taxonomy → VERIFY intervention | **refined in P0** |
| **AUTHOR** | Fable rewrites a kit prompt | the revised prompt text | a transplantable prompt edit | untested — P3 |

## Refinement log

### P0 (2026-07-02) — GRADE behavior, inferred from the defects it found

Fable graded ensemble answers the Opus/Sonnet loops had declared *clean* and found real defects
in them ([results-v8.md](results-v8.md) §P0). The **kind** of defect reveals the checks Fable
actually runs when it verifies — a concrete refinement of the GRADE row:

- **It traces guarantees through the mechanism, not the headline.** Every `global-counter` miss
  came from Fable localizing a guarantee's dependency (retry actor, ground-truth store) to the
  stipulated failure domain and finding it doesn't survive. It verifies the *data path*, not the
  claim.
- **It instantiates general claims at small and boundary cases.** The `sort-lower-bound` misses
  came from Fable computing at n=4 and n=5 — catching an odd-n parity slip and a literal `≥ n log
  n` overstatement (optimal at n=4 is 5, not 8). It doesn't trust asymptotic prose; it plugs in.
- **It cross-checks a claim against the rest of the same answer.** Several defects were headline
  vs. "honest-limits-section" contradictions the author (and our verifier) glossed.
- **It reads bounds literally** (≥ f(n) vs Ω(f(n))) and **challenges severity framing**
  ("irreducible", "physical limit") by deriving the minimal trigger.

**Inference (hold loosely):** Fable's verification edge over Opus here looks like *technique and
attention-direction, not raw capability* — Gate A found 4/4 Opus-loop misses are checks Opus can
execute once pointed at them. If that holds, the edge is transplantable via prompt. **Risk:** this
is inferred from *outputs*, so it may over-credit technique and under-credit capability; P1's solve
traces and P4's A/B are the real tests. The deepest miss (dual-path artifact divergence) may be the
capability-bound exception.

**Open question for P1:** does Fable's *SOLVE* trace show the same moves it applies when *grading*
— i.e., does it solve by tracing its own mechanism and testing small cases *before* committing —
or is mechanism-tracing only elicited in the adversarial GRADE posture? If the latter, the lesson
is about the *verifier stance*, not about solving, and the intervention stays squarely on VERIFY.

## Standing cautions

- Behavioral inference only; no CoT. "Fable does X" always means "Fable's observable trace shows X."
- Capability-vs-technique is the recurring trap: a behavior that helps *because Fable is stronger*
  won't transfer as a prompt to Opus. Promote a behavior to an intervention only with a
  within-model transfer signal (P2) or a direct A/B win (P4).
- n is tiny (P0: 2 tasks, 10 defects). Treat every claim as directional until P4.
