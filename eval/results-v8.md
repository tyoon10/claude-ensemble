# claude-ensemble eval v8 — raising the verifier ceiling (the Fable window)

Running log for the v8 campaign, pre-registered in [`PLAN-v8.md`](PLAN-v8.md). Fable 5 is used
as a **teacher** — it solves, grades, and authors — but is **never shipped** (the kit stays
"Fable not used or required"). Phases land here as they complete.

The one question: v7 found the **self-verification ceiling** — verify-loops self-reported *clean*
while a neutral Fable grader still found 2–4 confirmed defects ([results-v7.md](results-v7.md)).
Can the Opus verifier's *effective* ceiling be raised without a stronger model?

---

## P0 — Missed-defect taxonomy & Gate A (zero Fable)

**Recover before spending.** The v7 harness persisted only defect *counts*, but the full defect
*strings* survive in the v7 workflow journal on disk. Recovered and attributed each `{clean,
defects[]}` verdict to `(task, final, which verifier missed it)`; raw at
[`raw-v8-p0-missed-defects.json`](raw-v8-p0-missed-defects.json).

| Final graded | Shipped verifier (loop) | Verifier said | Fable found |
|---|---|---|---|
| `global-counter` / opusStd | **Opus**, cap 3 | clean | **2 defects** |
| `sort-lower-bound` / opusStd | **Opus**, cap 3 | clean | **2 defects** |
| `exactly-once` / opusStd | Opus, cap 3 | clean | 0 (genuinely clean) |
| `global-counter` / sonnetDeep | Sonnet, cap 5 (4 rounds) | clean | 4 defects |
| `sort-lower-bound` / sonnetDeep | Sonnet, cap 5 | clean | 2 defects |

The Opus-loop misses (4 defects across 2 tasks) are the decision-relevant set — Opus is the
shipped verifier. They are not nitpicks: on `global-counter` the answer's "no data loss under
region failure" guarantee is contradicted by its own data path (the retry actor is co-located in
the failed region; the billed number's ground-truth store isn't the one replicated at ack). On
`sort-lower-bound`, an odd-n parity slip ("≥ n/2 factors" is actually ⌊n/2⌋) and a literal-vs-
asymptotic overstatement ("≥ n log n" is false; ≥ log₂(n!), falsifiable at n=4).

### Failure taxonomy

All 10 recovered defects fall into five classes, and they **split cleanly by answer type** — a
strong signal the misses are structural, not idiosyncratic:

- **T1 — Guarantee-fails-under-own-mechanism** (design answers). A headline guarantee breaks when
  its recovery actor / sole data holder / ground-truth store is localized to the stipulated
  failure domain; includes the probabilistic-structure-on-an-absolute-path subvariant.
- **T2 — Cross-section self-contradiction.** The headline is contradicted by the answer's own
  "limits / honest / bottom-line" section (usually co-occurs with T1).
- **T3 — Severity / irreducibility misframing.** A single-point or reducible failure dressed as a
  rare compound catastrophe or "physical limit," ignoring mitigations the answer itself describes.
- **T4 — True-conclusion / invalid-derivation-step** (proof answers). The final claim is correct
  but the stated step doesn't establish it (parity/small-case slip, literal-vs-asymptotic, false
  conditional, over-strong induction).
- **T5 — Justification-claim gap.** The cited justification bounds a *different* quantity than the
  claim (one "minor" instance).

**The decisive observation:** all 6 `global-counter` misses are T1/T2/T3 (mechanism / data-path);
all 4 `sort-lower-bound` misses are T4 (step-vs-conclusion). The current verifier checks
*endpoints* — "does the headline hold / is the theorem's conclusion right?" — and every miss lives
in the **mechanism or derivation step behind a correct-looking endpoint**.

### The check-set (ranked)

Each is one behavior-eliciting instruction, **not** a procedure — the kit's worst-ever arm was
over-instructing the judge with a rigid script (−4.7), so scaffolds must elicit a behavior, not
script numbered steps.

1. **Trace every load-bearing guarantee through the answer's own data path under the exact
   stipulated failure** — localize each dependency (recovery actor, sole data holder, ground-truth
   store, *every distinct artifact* the guarantee touches) to a failure domain; treat any
   probabilistic/lossy structure on an absolute-guarantee path as a violation. Catches **5**
   (incl. both `global-counter`/opus misses). Over-instruction risk: medium.
2. **Verify each derivation step, not just the conclusion** — instantiate general/counting/
   inductive claims at small and boundary cases (an odd n, an irregular structure), read bounds
   literally (distinguish ≥ f(n) from Ω(f(n))), confirm the step *establishes* the claim. Catches
   **4** (all `sort` defects, incl. both opus misses). Over-instruction risk: low.
3. **Cross-check each headline claim against the answer's own limits/bottom-line sections.**
   Catches 3; nearly free. Over-instruction risk: low.
4. **Challenge every "rare / irreducible / physical-limit" framing** (derive the minimal trigger,
   scan for unused mitigations the design already contains) and **check each quantitative claim's
   justification bounds the claimed quantity.** Catches 3. Over-instruction risk: low–medium.

Checks **1 and 2 alone cover 9 of 10 misses — and 4 of 4 Opus-loop misses.** The unifying reframe
behind both: *do not verify the endpoint — verify the mechanism and each step that reaches it.*

### Gate A verdict — **PROCEED**

**4 of 4** Opus-loop defects (≈10/10 overall) are check-addressable, not capability-bound. Not one
miss required insight the model lacks: each is a mechanical data-path trace (T1/T2/T3) or a
small-case/step audit (T4) Opus-4.8-high can execute once its attention is redirected. Root cause
is **attention-direction, not capability** — which is exactly what a revised VERIFY prompt can fix,
and why prompt work can lift the effective ceiling here without a stronger model.

**One residual-risk flag** (not enough to downgrade to SPLIT): `global-counter`/opusStd defect 2
(dual-path artifact divergence) is the deepest multi-hop trace and the likeliest to survive a
prompt fix if check #1 doesn't force per-artifact decomposition. **Acceptance test:** a
prompt-revised rerun of `global-counter`/opusStd must catch it; if it still slips, revisit as a
targeted SPLIT (route only the deepest design traces to a stronger verifier) rather than reopening
the gate.

**Carry-forward to P3.** The interventions nearly write themselves: checks #1 and #2 cover all
Opus-loop misses. V2 (trace-derived) seeds directly from this taxonomy; V1 (Fable-authored) gets
this taxonomy as input; `global-counter`/opusStd defect 2 is the acceptance test. P1 next: do
Fable's *solve* traces actually exhibit these checks, or is mechanism-tracing only visible when it
*grades*? (see [`how-fable-works.md`](how-fable-works.md)).

---

## P1 — Solve traces: no tool use, and solving ≠ the grading stance (6 Fable + 6 Opus solves)

Fable 5 and Opus 4.8 each solved the 3 checkable archetypes (`global-counter`/design,
`sort-lower-bound` + `coupon-collector`/proof), 2 samples each, **matched effort (high)**, tools
available, minimal neutral prompt. Answers + attribution manifest in
[`raw-v8-p1.json`](raw-v8-p1.json) / [`raw-v8-p1-manifest.json`](raw-v8-p1-manifest.json). *(Pre-reg
deviation: `args` arrived JSON-stringified, so the intended 2-solve smoke preflight ran as the full
12-solve matrix. No over-spend — full P1 was the planned next step; 6 Fable calls, ledger at 6/40;
harness arg-parsing fixed.)*

**Finding 1 — neither model ran code.** **1 tool call across all 12 solves**, despite tools and a
"you may write and run code" prompt. Both solved these design/proof tasks analytically. So the
pre-registered P2 premise (mine tool-execution *traces*) is **void** — there are no tool traces to
mine; the only signal is the answer's reasoning structure. It also flags a kit assumption to check
in P4: the shipped VERIFY prompt says "hunt by RUNNING code," but if verify agents behave like
these solve agents, the verifier isn't actually executing either.

**Finding 2 — solving is not the grading stance.** The mechanism-tracing + small-case-testing Fable
shows when it GRADES (P0) is not what either model does when it SOLVES — first evidence the lever is
the verifier *posture*, not the solver. Sharpened decisively in P2.

## P2 — Capability vs. stance: **STANCE** (zero Fable)

The load-bearing question: when the Fable-grader catches a defect the Opus verifier missed, is that
**(CAPABILITY)** Fable being a stronger reasoner (a prompt won't transplant it) or **(STANCE)** an
adversarial-posture effect a VERIFY prompt can install? Tested by reading the 8 P1 solve answers
(Fable×2, Opus×2 on `sort-lower-bound` + `global-counter`) for the exact P0 defect classes.

| Defect class | Fable solves exhibiting | Opus solves exhibiting | Read |
|---|---|---|---|
| (A) odd-n parity slip | 0 (1 partial) | 0 (1 partial) | symmetric; **opus#0 the most rigorous** (explicit ⌈n/2⌉) |
| (B) literal ≥ n log n | 0 | 0 | absent everywhere; both write `log₂(n!) = Ω(n log n)` — non-discriminating |
| (C) guarantee-vs-mechanism | 0 (1 partial) | 0 | both confront the RPO gap honestly; Opus marginally cleaner |

**Verdict: STANCE. Capability is decisively refuted.** In no defect class do Fable's solves beat
Opus's; in 2 of 3, Opus's are equal-or-cleaner. **Opus already possesses the reasoning the
Fable-grader surfaces** — the v7 "CLEAN" verdict was a posture deficit, not a reasoning ceiling. So
a VERIFY-prompt change should transplant to Opus.

**Honesty caveat.** The textbook stance signal ("both solvers openly commit the defect") is only
*weakly* present — at high effort both models largely AVOID all three classes (2 mild partials:
fable#1's parity gloss, fable#0's closing overreach). The verdict rests on **refuting capability**
(Opus solves clean/cleanest), not on catching both red-handed. Presented that way.

**Design constraint for P3 (the real residual).** The risk is prompt **coverage**, not capability.
Because the parity slip is subtle enough that the *solvers themselves* glossed it, a vague "look for
errors" VERIFY prompt will reproduce the v7 miss. The stance must be **pointed** — prime the
specific behaviors (parity / odd-even / off-by-one in inequality justifications; "does the stated
guarantee survive the described failure *co-location*?") — while staying minimal enough to dodge the
over-instruction hazard (−4.7). Threading that needle is exactly what the P0 check-set
(behavior-eliciting, not step-scripted) is shaped for.

**P2 status.** Pre-registered as tool-trace mining; premise void (no traces). Pivoted to answer-text
capability-vs-stance analysis, which answered the transferability question directly. Heavy
trace-mining closed → **proceed to P3** (author VERIFY variants: V1 Fable-authored, V2 taxonomy /
check-set derived, V3 multi-lens).

---

## P3 — Three VERIFY arms (all in [`run-v8-p4a-detect.js`](run-v8-p4a-detect.js))

Candidate replacements for the shipped `VERIFY` prompt, from the P0 check-set under the P2 constraint
(pointed yet minimal):

- **V1 (Fable-authored)** — Fable's own rewrite, given the actual missed-defect strings + the
  constraints. Reframes to "hunt one level below the headline," installs both checks as prose, and
  rules that a literally-false precise claim is a defect (not a style nitpick). The AUTHOR
  teacher-execution (~1 Fable call).
- **V2 (minimal, human)** — the same two checks at ~half V1's length; a dose-control on the
  over-instruction axis.
- **V3 (multi-lens)** — two *single-lens* Opus verifiers (one traces guarantees through the
  mechanism, one audits steps/boundary-cases), union of confirmed defects. Tests whether the ceiling
  is attention *coverage* rather than wording.

## P4a — Detection A/B: do the arms catch what baseline missed? (n=1; zero Fable)

Each arm run as a single verify pass on the exact two v7 finals baseline declared *clean*; an Opus
matcher scored catches against the 4 cataloged P0 defects. Raw: [`raw-v8-p4a.json`](raw-v8-p4a.json).

| Arm | global-counter | sort-lower-bound | known caught |
|---|---|---|---|
| baseline (shipped) | 0/2 (0 flags) | 0/2 (0 flags) | **0/4** ✓ reproduces v7 blindness |
| V1 (Fable) | 0/2 (0 flags) | 1/2 (parity) | 1/4 |
| V2 (minimal) | 0/2 (**+2 other real defects**) | 1/2 (parity) | 1/4 |
| V3 (multi-lens) | **1/2** (dual-path — the acceptance test) | 1/2 (parity) | **2/4** |

Per known defect: `sort-K1` (odd-n parity) — caught by all three interventions, missed by baseline;
`global-K2` (dual-path divergence, the acceptance test) — caught **only by V3**; `global-K1`
(retrier co-location) and `sort-K2` (literal ≥ n log n) — **missed by all**.

**Reads.** (1) **Pointed prompts beat baseline** (0/4 → 1–2/4); baseline reproduces its v7 blindness
(sanity check passed) — the stance transplants. (2) **V3 (multi-lens) is best** (2/4) and uniquely
catches the acceptance-test defect — the attention-coverage hypothesis is supported: a dedicated
mechanism-tracing pass surfaces what a combined prosecutor misses. (3) **Not a full fix** — 2/4
missed by all; the ceiling is *raised, not eliminated*. (4) The known-defect metric **under-counts**:
V2 flagged 2 *other* genuine defects on global-counter (a TTL/retry over-count race; a >10× literal
error) — the arms hunt effectively, just don't always surface the specific cataloged defect.

### n=3 robustness (zero Fable) — [`raw-v8-p4a-n3.json`](raw-v8-p4a-n3.json)

Re-ran each arm ×3 on both finals. Per-known-defect detection rate (caught / 3):

| Known defect | baseline | V1 (Fable) | V2 (min) | V3 (lens) |
|---|---|---|---|---|
| global-K1 (retrier co-location / self-contradiction) | 0/3 | 1/3 | 1/3 | **0/3** |
| global-K2 (dual-path divergence — the acceptance test) | 0/3 | 1/3 | 1/3 | **3/3** |
| sort-K1 (odd-n parity) | 0/3 | 3/3 | 3/3 | 2/3 |
| sort-K2 (literal ≥ n log n) | 0/3 | 0/3 | 0/3 | 0/3 |
| **mean known caught / run (of 4)** | **0.0** | **1.67** | **1.67** | **1.67** |

Refined reads:
- **All three arms tie on aggregate (1.67/4) vs baseline 0** — pointed prompts robustly help, but no
  arm dominates on volume.
- **Profiles differ and matter more than the aggregate.** V3 catches the acceptance-test defect
  (`global-K2`) **reliably (3/3)** — its edge is real, not n=1 noise — but has a **blind spot on
  `global-K1`** (0/3: its mechanism lens locks onto the dual-path and never the self-contradiction).
  V1/V2 spread: reliable on parity (3/3), intermittent on both global defects (1/3).
- **Two stable residual limits.** `global-K1` is only intermittently caught (1/3) by any arm;
  `sort-K2` (literal ≥ n log n) is **robustly missed by ALL** (0/3) despite every arm priming "read
  bounds literally" — the verifier charitably reads ≥ as ≈. **The ceiling is raised, not closed.**
- **Implication for P4b.** V3's multi-lens is the strongest direction for the deepest defects but
  needs a cross-section-consistency lens to close its `global-K1` gap; single-pass V1 is the cheapest
  comparable. Both go into the Fable-graded end-to-end residual test — the metric that decides what
  ships, since detection is only a proxy for the loop's actual residual reduction.
