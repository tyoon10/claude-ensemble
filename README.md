# claude-ensemble

```
/ensemble <your most challenging task>
```

---

Claude Ensemble is an open source agentic tool for Claude Code to push the model capability to tackle the hardest challenges.
Claude Ensemble leverages agentic orchestration and [dynamic workflows](https://code.claude.com/docs/en/workflows) to achieve the model's maximum intellectual capabilities, made accessible through a Claude subscription (Pro, Max) alone.
It runs entirely inside Claude Code on your Pro/Max subscription — **no API key needed.**

---

## Why this matters to you

1. It is built for **the most challenging tasks**

> Whether it is designing a software architecture or solving a business problem, the *ensemble* pattern — multi-layer orchestration of autonomous agents — can match or approach a single frontier model on the most challenging problems and ambitious tasks.

2. It is built for **Claude Code**

> With [Claude Pro or Max subscription](https://claude.ai/settings/billing), you can capture the benefit of maximum intelligence of Claude at the expense of extra [usage](https://claude.ai/settings/usage). No need to commit an API key, so you won't be billed on token-based pricing.

3. It is built to **adapt to new model release**

> Unlike model-dependent tools that gets dominated by a more intelligent model, the ensemble is designed to push the most intelligent model's capability even further, so you're ensured to have the most frontier model capability at any point in time.

## What you need

- **Claude Code**, logged in with a **Claude Pro or Max** account
- Opus access for the judge — best on **Max** (Opus is the default and limits are higher); Pro works, but Opus usage is tighter.
- The optional deterministic engine (`.claude/workflows/ensemble.js`) needs the Dynamic Workflows feature (Claude Code 2.1.x+). The default `/ensemble` command needs only sub-agents, which are universal.

> Claude Fable 5 is **not** used or required.

## To start using Claude Ensemble

```bash
git clone https://github.com/tyoon10/claude-ensemble
# into one project:
cp -r claude-ensemble/.claude/* /path/to/your/project/.claude/
# …or make it available everywhere. This writes into your global config; -n avoids
# overwriting same-named files (the kit's files are all ensemble-* namespaced, so
# collisions are unlikely):
cp -rn claude-ensemble/.claude/* ~/.claude/
```

Then, in Claude Code:

```
/ensemble <Describe your task — add your context, goals, constraints, etc.>
```

## How it works

```
/ensemble <task>
      │
      ▼
  ┌─ triage ─┐  simple → answer directly (no panel; saves your usage)
  └────┬─────┘
       │ complex
       ▼
  ┌──────────── panel (parallel, Sonnet) ────────────┐
  │ panelist       panelist        panelist          │   3 independent
  │ best answer    best answer     best answer        │   drafts (best-of-N)
  └───────┬────────────┬───────────────┬─────────────┘
          └──── blind, shuffled labels ─┘
                       ▼
              ┌──── judge (Opus) ────┐
              │ verify · resolve ·   │
              │ discard · synthesize │
              └──────────┬───────────┘
                         ▼
                   one best answer
```

- **Triage** skips the panel for easy tasks, so you don't spend usage limits where a single pass already wins.
- The **panel** is **three independent best-effort drafts of the same task** (best-of-N). We tested designed "diversity" — objective roles, tier mixes — and it didn't beat this; the lift comes from the judge synthesizing several attempts, not from making them differ (see [`eval/`](eval/)).
- The **judge** sees the drafts under blind, shuffled labels (no model names) to cut judge bias, verifies rather than trusts, and synthesizes one answer better than any single draft.

## Cost & performance

**Cost is structural, not a price.** On a subscription you spend usage, not dollars — and the gatekeeper keeps easy work off the panel, so you only pay the ensemble premium on genuinely hard tasks:

| Path | Model calls | Relative spend\* |
|---|---|---|
| Single model (baseline) | 1× Opus | 1× |
| Ensemble — simple (gated out) | 1× Haiku + 1× Sonnet | < 1× |
| Ensemble — complex | 1× Haiku + 3× Sonnet + 1× Opus | ~3–5× |

<sub>\*Indicative, from the call structure and per-tier token rates — **not a measurement**. Actual spend depends on task and output length.</sub>

**Performance — measured, blind A/B evals (run on a subscription).** Full method, per-task data, charts, and caveats in [`eval/`](eval/). The metric of record is **blind pairwise win-rate** with an **independent non-Claude cross-grader**; the early absolute-rubric runs (v1/v2, below) *saturated* on strong answers and over-stated the gap.

- **v3 — pairwise, three-grader (current):** the quality-max ensemble (Opus panel + a `max` *verifying* judge) beats a single **matched-effort** Opus pass **~60%** of the time, and an independent **non-Claude grader (Gemini-Flash) confirms it (62%)**. Real and cross-grader-robust — but a **modest** edge, at **~3.5× the cost**, and it **requires guided drafts** (a *bare*-draft panel ties the single baseline to the neutral grader). See [`results-v3-pairwise.md`](eval/results-v3-pairwise.md).

- **v4 — length-controlled (most honest):** pairwise grading carries a residual **length bias** — shorter answers lose even when equally correct. A length-controlled correctness audit shows the ~60% mostly reduces to **ties**, a **Sonnet panel ≈ a single Opus pass**, and the **Opus panel only marginally ahead**. The real correctness edge of the panel is **small**. See [`results-v4-length-controlled.md`](eval/results-v4-length-controlled.md).

- **v5 — the auto verify-loop (the real lever):** the biggest correctness gain isn't the panel — it's *iterating*. On **checkable** tasks the kit now auto-runs a verify→revise loop after the judge (a harsh verifier **runs code** to find confirmed defects, a reviser fixes exactly those, repeat ≤3×), which **roughly halves real defects** (length-controlled; the refined answer was preferred on **100%** of pairwise comparisons). It's **model-determined** — the triage gate decides checkability, no flag — so users get it automatically on the hard work that benefits and pay nothing on tasks that don't. See [`results-v5-verify-loop.md`](eval/results-v5-verify-loop.md).

![Ensemble vs single Opus — pairwise win-rate, three graders](eval/results-v3-pairwise.svg)

- **v1 / v2 — absolute rubric (superseded magnitude):** earlier 0–100 rubric runs reported +4.2 (v1) and +8.6 / +9.5 (v2). That rubric saturates near the ceiling, so those deltas over-state the real gap — kept as a methodology trail, magnitude superseded by v3.

Three honest takeaways:

1. **The edge over a single model is real and survives an out-of-family grader — but small.** The blind-pairwise three-grader number is ~60% (Opus, Sonnet, and a non-Claude Gemini grader all agree), not the "+9" the saturated rubric implied — and a later **length-controlled** audit ([v4](eval/results-v4-length-controlled.md)) shows even that ~60% mostly reduces to **ties** on genuine correctness, because pairwise grading over-states panel gains via a residual length bias. ***A single Opus pass at `effort: max` with a verify-then-answer prompt is the performance-per-cost frontier*** *— see "Honest limits."*
2. **It isn't diversity or the panel's roles — it's draft *tier*, and even that is marginal.** A dedicated test ([`results-phaseB.md`](eval/results-phaseB.md)) found **no diversity→lift relationship (r = −0.11)** — the *lowest*-diversity panel had the *highest* lift — and a homogeneous best-of-N panel even **beat** an objective-role panel ([`results-panel.md`](eval/results-panel.md), +3.0, 8/12). Draft **tier** is the axis that matters, but length-controlled ([v4](eval/results-v4-length-controlled.md)) the gaps are small: a **Sonnet panel ≈ a single Opus pass** on genuine correctness (no lift over single), while only the **Opus panel** is even marginally ahead. So the honest guidance is **a single Opus-`max` verify pass by default; escalate to an Opus panel + `max` verifying judge only for the highest-stakes, checkable work** — a *Sonnet* panel doesn't beat a single Opus pass, so it isn't worth its extra cost over one.
3. **The judge's *effort* is the real lever — not the panel's diversity, tier, or rigid instructions.** A focused ablation ([`eval/results-phaseA.md`](eval/results-phaseA.md)) found raising the judge to `xhigh` adds **+2.4** (the biggest single lever), while a deliberately rigid multi-step judge *subtracts* 4.7. So the default judge runs at `xhigh` and stays prompt-light — and on hard technical work it pays to push it to **`max`**, where the judge stops paraphrasing and starts *verifying* the drafts (and, given tools, actually runs the checks). Fact-checking cheap drafts is where the clearest wins over a single model come from.

Caveats: n=6–12 per eval, Claude judges (same-family preference possible — though both judges ranked single Opus *last* on every v2 task), these task sets only. Directional, not a general benchmark. Reproduce via [`eval/run.js`](eval/run.js) / [`run-v2.js`](eval/run-v2.js) / [`phaseA.js`](eval/phaseA.js) / [`phaseB.js`](eval/phaseB.js) / [`panel.js`](eval/panel.js).

## Honest limits

- **The edge is small once you compare fairly, and pairwise scores over-state it.** Against a single model at *standard* effort the gap looks largest; against a single model at the *same* effort (`max`) **+ a verify-then-answer prompt**, the blind-pairwise edge is ~60% — and a **length-controlled** correctness audit ([v4](eval/results-v4-length-controlled.md)) shows even that mostly reduces to **ties**, because pairwise grading penalizes shorter answers via a residual length/completeness bias. On genuine correctness the arms are roughly tied (Opus panel marginally ahead; a **Sonnet panel ≈ a single pass**). It is not a blanket "ensembles beat single models" — it's a small, real, fact-checking-driven edge on hard checkable work, at ~3.5× the cost. The robust requirement is **guided, self-verifying drafts feeding a verifying judge**, not the panel structure alone.
- **Claude-only panel = correlated errors.** Every panelist is a Claude model, so they share a training lineage and some blind spots — more correlated than a true cross-vendor panel. Our evals found this doesn't dent the lift on the tasks tested (the judge does the work), but whether genuine cross-vendor diversity would help *more* is **untested** — it needs non-Claude models (= API keys), deliberately out of scope here.
- **It spends real usage.** A complex run is up to ~5 model calls — a cheap Haiku triage call, 3 Sonnet panel drafts, and the Opus judge — several with extended thinking. Use it for genuinely hard tasks; the triage step keeps it off easy ones. Heavy use will hit Pro/Max limits.
- **Not a benchmarked guarantee.** It is a pragmatic pattern — strongest on decomposable, deep-reasoning work, weakest where you needed truly independent opinions on one indivisible question.

## Built on Claude Code

This is pure Claude Code configuration — no server, no SDK, no external service:

- the `/ensemble` command and the panelist + judge are **[sub-agents](https://code.claude.com/docs/en/sub-agents)**;
- the optional deterministic engine is a **[Dynamic Workflow](https://code.claude.com/docs/en/workflows)** — `agent()` / `parallel()` in a local JavaScript script that owns the control flow.

**Staying on the latest models.** The agents and the workflow select models by **tier alias** — `opus`, `sonnet`, `haiku` — and each alias resolves to the newest release of that tier, so the kit follows new Claude models with no edit. Pin a specific version (e.g. `claude-opus-4-8`) only when you want reproducibility.

## Configure

It's all plain Markdown plus one JS file — edit to taste:

- **Models / panel size:** edit the `model:` in `.claude/agents/ensemble-*.md` (`sonnet` / `opus` / `haiku`); change panel size via `PANEL_N` in `.claude/workflows/ensemble.js` (or the spawn count in `.claude/commands/ensemble.md`).
- **Cheaper runs:** move the panelist to `haiku`, or drop the panel to two.
- **Deterministic engine:** `.claude/workflows/ensemble.js` runs the same pipeline as a scripted Dynamic Workflow (no orchestration-token tax, reproducible). Invoke it with `args = { task: "…" }`. The judge runs at `xhigh` effort — the biggest quality lever we measured (see [`eval/results-phaseA.md`](eval/results-phaseA.md)).

## Files

```
.claude/
  commands/ensemble.md            # the /ensemble entry point (default path)
  agents/ensemble-panelist.md     # panel: one independent best answer (run 3×, best-of-N)
  agents/ensemble-judge.md        # Opus judge / synthesizer
  workflows/ensemble.js           # optional deterministic engine
```

## License

MIT © 2026 Taewan Yoon. See [LICENSE](LICENSE).

> It's an *ensemble* (independent models combined), not a Mixture-of-Experts (sparse routing inside one model) — the name is deliberate.
