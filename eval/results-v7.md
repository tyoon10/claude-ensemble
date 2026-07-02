# v7 — Judge-tier swap + cheap-vs-deep, graded Fable-first

Fable 5 came back ([redeploy, 2026-06-30](https://www.anthropic.com/news/redeploying-fable-5)), so v7 uses it as the **primary, strongest independent grader** and compares its judgement against the Opus 4.8 and Sonnet 5 graders. Two questions that v6 did not isolate, because v6 varied the *panel* tier and *held the judge/verifier fixed*:

- **(J) Judge tier.** On the *same* fixed Sonnet-5 panel drafts, does a max **Sonnet-5 judge** synthesise as correctly as a max **Opus judge**? The judge fires on every complex run and is the single biggest recurring cost after the panel.
- **(D) Cheap+deep vs expensive+shallow.** On checkable tasks, does an all-Sonnet stack (Sonnet-5 judge + Sonnet-5 verify-loop, cap 5) match an all-Opus stack (Opus judge + Opus verify-loop, cap 3)? Does more *cheap* depth substitute for a stronger, shallower stack?

## Setup

- **Tasks:** 6 — 3 open-ended/divergent (`scaling-plateau`, `build-vs-api`, `micro-monolith`) + 3 checkable (`global-counter`, `exactly-once`, `sort-lower-bound`). Divergent tasks are included so Fable grades open-ended outputs too, per the ask.
- **Controlled variable:** each task's **panel drafts are fixed** (3 Sonnet-5 drafts, shared by both judges). The only thing that changes between the two answers being audited is the **judge model** — so (J) is a clean judge-tier contrast, not a panel-tier one.
- **Grading:** every judge-pair is audited **length-controlled, both answer orders**, by **three graders — Fable 5 (priority), Opus 4.8, Sonnet 5** (12 audit votes per grader across the 6 tasks). For (D), each final answer is scored by a **single neutral Fable grader** counting confirmed defects (a prosecutorial verifier), plus rounds used as a cost proxy.
- Serial (rate-limit-safe), subscription-only. Full answer texts persisted to [`raw-v7.json`](raw-v7.json). n = 6 — directional, not a benchmark.

## (J) Judge tier — the Opus judge is modestly but *robustly* better

Judge-swap audit, opus-judge win / tie / sonnet-judge win (12 votes each):

| Grader | Opus judge | Tie | Sonnet-5 judge | Length-driven |
|---|---|---|---|---|
| **Fable 5** (priority) | **5** | 5 | 2 | **0** |
| Opus 4.8 | 6 | 5 | 1 | 3 |
| Sonnet 5 | 4 | 5 | 3 | 0 |

**Length control — the finding is not a verbosity artifact.** The Sonnet-5 judge's answers were the *longer* of the pair in 5 of 6 tasks (opus/sonnet char-length ratios: 0.85, 1.16, 0.94, 0.87, 0.91, 0.85 — mean ≈ 0.90). So a naive length bias would favour the **Sonnet** judge. It didn't: every grader leans to the shorter **Opus** judge, and Fable flagged **zero** of its 12 verdicts as length-driven. The Opus-judge edge is about correctness, not length.

**Prioritising Fable's judgement.** Fable splits 5–2 for the Opus judge on decided verdicts, with 5 ties and no length-driven calls. Per task, Fable credits the Opus judge decisively on `build-vs-api` and `global-counter`, ties on `micro-monolith` and `exactly-once`, leans Opus on `sort-lower-bound`, and — notably — credits the (longer) **Sonnet** judge 2–0 on `scaling-plateau`. So the edge is real but not uniform: on a genuinely open-ended synthesis task the Sonnet judge can win on merit.

**Cross-grader agreement.** All three graders agree that **tie is the plurality** (5 ties each) and all three lean to the Opus judge on decided votes (Fable 5–2, Opus 6–1, Sonnet 4–3). The Opus grader leans hardest **but** flagged 3 of its 12 verdicts as length-driven — and since the Opus-judge answers are the *shorter* ones, that's noise, not inflation. Fable and Sonnet flagged none. One divergence is instructive: on `scaling-plateau` the Opus grader preferred its own family's (shorter) output while Fable credited the Sonnet judge's longer-but-more-correct answer — exactly the self-preference an independent, stronger grader corrects for.

**Verdict (J):** the judge tier is **not** a lateral move (contrast the *panel* tier in v6). The Opus judge is modestly, robustly better than the Sonnet-5 judge — Fable-confirmed and not length-driven. **Keep `JUDGE_MODEL = 'opus'`.** Don't cheap out on the load-bearing stage.

## (D) Cheap+deep does not substitute for the Opus stack

Final CONFIRMED-defect count from a single neutral **Fable** grader on each final, plus rounds used:

| Task | Opus stack (judge+verify, cap 3) | Sonnet stack (judge+verify, cap 5) |
|---|---|---|
| `global-counter` | **2 defects / 1 round** | **4 defects / 4 rounds** |
| `exactly-once` | 0 defects / 1 round | 0 defects / 1 round |
| `sort-lower-bound` | 2 defects / 1 round | 2 defects / 1 round |

On the hardest task (`global-counter`) the all-Opus stack is **cleaner *and* cheaper** — four cheap Sonnet rounds still left *more* residual defects (4) than a single Opus round (2). On the other two, the stacks tie. **Cheap depth does not buy its way to the Opus stack's correctness on hard checkable work.** This supports gate-routing the hardest checkable tasks to Opus and keeping `VERIFY_MODEL = 'opus'`.

## Methodological note — self-verification has a ceiling (why v7 grades finals with a neutral grader)

Each loop's **own** verifier declared **every** final clean (`ownDefects = 0` across all three tasks, both stacks). Yet the neutral **Fable** grader still found **2–4 residual defects** on two of the three. The verify-loop converges to *"clean per its own verifier,"* not *"clean per a stronger grader"* — **the verifier model's ceiling caps the loop.** A stronger verifier leaves fewer residuals (`global-counter`: Opus 2 vs Sonnet 4). This is why v7 scores finals with a neutral grader instead of trusting each loop's self-report, and it's the correctness argument for the shipped Opus verifier. (The earlier confound-hunting in [`results-v6.md`](results-v6.md) fixed the *judge* format; this fixes the *defect-count* measurement.)

## Bottom line

Nothing here overturns v6. v7 sharpens two tier choices v6 left bundled:

- **Judge tier is load-bearing** → `JUDGE_MODEL = 'opus'` (Fable-confirmed, not length-driven). The Sonnet-5 judge is close and ties often, but the Opus judge is the safer default on the stage that fires every complex run.
- **The verify-loop's power is capped by its verifier** → `VERIFY_MODEL = 'opus'`; piling cheap Sonnet rounds does not close the gap on hard checkable tasks.

The shipped configuration — cheap **Sonnet-5 panel**, gate-routed **hard-checkable → Opus panel** (`PANEL_MODEL_HARD`), **Opus judge**, **Opus verify** — is consistent with every v7 result. **No config change.**

**Caveats.** n = 6, directional not benchmark. All graders (Fable included) are Claude models and share family blind spots, so an Opus-grader self-preference or a shared Fable/Opus blind spot can't be fully ruled out — the length-control cross-check and the both-orders design mitigate but don't eliminate it. Fable grading used the redeployed, metered Fable 5.
