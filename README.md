# claude-ensemble

![claude-ensemble running in Claude Code](assets/banner.png)

---

Claude Ensemble is an open source agentic tool for Claude Code to push the model capability to tackle the hardest challenges.
Claude Ensemble leverages agentic orchestration and [Dynamic Workflows](https://code.claude.com/docs/en/workflows) to achieve the model's maximum intellectual capabilities, made accessible through a Claude subscription (Pro, Max) alone.
It runs entirely inside Claude Code on your Pro/Max subscription — **no API key needed.**

---

## Why this matters to you

1. It is built for **the most challenging tasks**

> Whether it is designing a software architecture or solving a business problem, the *ensemble* pattern (multi-layer orchestration of autonomous agents) can match or approach a single frontier model on the most challenging problems and ambitious tasks.

2. It is built for **Claude Code**

> With Claude Pro or Max subscription, you can capture the benefit of maximum intelligence of Claude at the expense of extra [usage](https://claude.ai/settings/usage). No need to commit an API key, so you won't be billed on token-based pricing.

3. It is built to **adapt to new model release**

> The ensemble is designed to push the newest model's capability even further. The kit follows new Claude models with no edit, so you're ensured to have the most frontier model capability at any point in time.

## What you need

- **Claude Pro or Max subscription.** Max is recommended for sufficient Opus usage.
- **Claude Code v2.1.154 or later.** The deterministic engine (`.claude/workflows/ensemble.js`) requires the Dynamic Workflows feature

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

Then, in Claude Code, ensure you have enabled dynamic workflows (one-time configuration):

```
/config workflows=true
```

Then run the ensemble:

```
/ensemble <Describe your task — add your context, goals, constraints, etc.>
```

## How it works

![How it works](assets/how_it_works.png)

- **Triage** skips the panel for easy tasks, so you don't spend usage limits where a single pass already wins.
- The **panel** is **three independent best-effort drafts of the same task** (best-of-N). We tested designed "diversity" — objective roles, tier mixes — and it didn't beat this; the lift comes from the judge synthesizing several attempts, not from making them differ (see [`eval/`](eval/)).
- The **judge** sees the drafts under blind, shuffled labels (no model names) to cut judge bias, verifies rather than trusts, and synthesizes one answer better than any single draft.
- The **verify-loop** runs only on **checkable** tasks (the triage gate decides — no flag): a harsh verifier **runs code** to find confirmed defects in the judge's answer, a reviser fixes exactly those, repeating up to 3× or until clean. This is the kit's biggest measured correctness lever; on open-ended/judgment tasks it's skipped (nothing to verify against).

## Cost & performance

**Cost is structural, not a price.** On a subscription you spend usage, not dollars — and the gatekeeper keeps easy work off the panel, so you only pay the ensemble premium on genuinely hard tasks:

| Path | Model calls | Relative spend\* |
|---|---|---|
| Single model (baseline) | 1× Opus | 1× |
| Ensemble — simple (gated out) | 1× Haiku + 1× Sonnet | < 1× |
| Ensemble — complex | 1× Haiku + 3× Sonnet + 1× Opus (+ verify-loop on checkable tasks) | ~3–5× |

<sub>\*Indicative, from the call structure and per-tier token rates — **not a measurement**. Actual spend depends on task and output length.</sub>

**Performance (honest).** We A/B-tested this on a subscription — blind pairwise win-rate, with an independent non-Claude cross-grader. The headline: the panel's edge over a single strong pass is **modest and length-sensitive**; the real correctness lever is the **auto verify-loop** on checkable tasks, where a harsh verifier runs code to catch and fix real defects. It's a small, real, fact-checking-driven edge on hard *checkable* work — **not** a blanket "ensembles beat single models." Full method, per-version results (v1–v5, including the length-controlled audit and the cross-grader), per-task data, charts, and caveats live in **[`eval/`](eval/)**.

**Honest limits:**
- **Claude-only panel = correlated errors.** Every panelist is a Claude model, so they share blind spots — more correlated than a true cross-vendor panel. Whether genuine cross-vendor diversity would help *more* is untested (it needs non-Claude API keys — out of scope here).
- **It spends real usage.** A complex run is up to ~5 model calls plus the verify-loop, several with extended thinking. The triage step keeps it off easy tasks, but heavy use will hit Pro/Max limits — so reach for it on genuinely hard work.
- **Not a benchmarked guarantee.** A pragmatic pattern — strongest on decomposable, deep-reasoning, and checkable work; weakest where you needed truly independent opinions on one indivisible question. Directional on these task sets (n = 6–12), not a general benchmark.

## Built on Claude Code

This is pure Claude Code configuration — no server, no SDK, no external service:

- the `/ensemble` command is a **[Dynamic Workflow](https://code.claude.com/docs/en/workflows)** — `agent()` / `parallel()` in a local JavaScript script that owns the control flow;
- the panelist + judge are **[sub-agents](https://code.claude.com/docs/en/sub-agents)** orchestrated programmatically by the workflow.

**Staying on the latest models.** The agents and the workflow select models by **tier alias** — `opus`, `sonnet`, `haiku` — and each alias resolves to the newest release of that tier, so the kit follows new Claude models with no edit. Pin a specific version (e.g. `claude-opus-4-8`) only when you want reproducibility.

## Configure

It's all plain Markdown plus one JS file — edit to taste:

- **Models / panel size:** edit the `model:` in `.claude/agents/ensemble-*.md` (`sonnet` / `opus` / `haiku`); change panel size via `PANEL_N` in `.claude/workflows/ensemble.js`.
- **Cheaper runs:** move the panelist to `haiku`, or drop the panel to two.
- **Deterministic engine:** `.claude/workflows/ensemble.js` runs the pipeline as a scripted Dynamic Workflow (no orchestration-token tax, reproducible). The judge runs at `max` effort — the biggest quality lever we measured (see [`eval/results-phaseA.md`](eval/results-phaseA.md)).

## Files

```
.claude/
  workflows/ensemble.js           # the /ensemble entry point (deterministic engine)
  agents/ensemble-panelist.md     # panel: one independent best answer (run 3×, best-of-N)
  agents/ensemble-judge.md        # Opus judge / synthesizer
```

## License

MIT © 2026 Taewan Yoon. See [LICENSE](LICENSE).

> It's an *ensemble* (independent models combined), not a Mixture-of-Experts (sparse routing inside one model) — the name is deliberate.
