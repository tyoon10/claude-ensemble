# claude-ensemble

**Frontier-style answers from a Claude subscription alone.** Several Claude sub-agents answer a hard task independently in parallel (best-of-N); an Opus judge then verifies and synthesizes one best answer. It runs entirely inside Claude Code on your Pro/Max subscription — **no Anthropic API key, no other provider keys, nothing metered separately.**

```
/ensemble <your hard task>
```
→ N panelists answer in parallel → Opus judge verifies &amp; synthesizes → you get one answer.

## Why this exists

The *ensemble* (a.k.a. fusion) pattern — several models answer, a judge synthesizes — can match or approach a single frontier model on hard, open-ended reasoning. Much of that lift appears to come from the **judge/synthesis step itself** rather than from how many models sit on the panel — that's the bet this kit makes. If it holds, you can capture most of the benefit with Claude models only, which is exactly what a subscription gives you without any API key.

`claude-ensemble` wires this up as a drop-in Claude Code kit: a few sub-agent definitions and one slash command.

## What you need

- **Claude Code**, logged in with a **Claude Pro or Max** account (`/login` → subscription, not an API key).
- **No `ANTHROPIC_API_KEY`** set, and no other provider keys.
- Opus access for the judge — best on **Max** (Opus is the default and limits are higher); Pro works, but Opus usage is tighter.
- The optional deterministic engine (`.claude/workflows/ensemble.js`) needs the Dynamic Workflows feature (Claude Code 2.1.x+). The default `/ensemble` command needs only sub-agents, which are universal.

> Claude Fable 5 is **not** used or required.

## Install (drop-in)

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
/ensemble Design a rate limiter that stays fair under bursty multi-tenant traffic, and justify the trade-offs.
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

**Performance — measured, two A/B evals (run on a subscription).** Full method, per-task scores, chart, and caveats in [`eval/`](eval/).

- **v1 — 12 hard tasks:** ensemble **94.2 vs 90.0** single Opus (**+4.2 / 100**), 11/12 wins. The small margin was mostly a *ceiling* effect — single Opus already scored ~90, leaving little to win.
- **v2 — 12 harder, high-headroom tasks, 3 arms:** single Opus drops to **82.2**; the ensemble lift widens to **+8.6** (Sonnet panel) / **+9.5** (Opus panel), and single Opus wins **0 of 12**.

![A/B eval results (v2)](eval/results-v2.svg)

Three honest takeaways:

1. **On genuinely hard tasks the lift is ~+9 to +11** — the panel→judge process earning its keep, in line with the fusion literature. v1's small number was a saturated-rubric artifact, not a weak system.
2. **It isn't diversity, model tier, or even the panel's roles.** A dedicated test ([`results-phaseB.md`](eval/results-phaseB.md)) found **no diversity→lift relationship (r = −0.11)** — the *lowest*-diversity panel had the *highest* lift; an Opus panel adds only +0.9 over Sonnet ([v2](eval/results-v2.md)); and a homogeneous best-of-N panel even **beat** an objective-role panel ([`results-panel.md`](eval/results-panel.md), +3.0, 8/12). So the kit uses a plain **best-of-N Sonnet panel** — simplest *and* measured-best.
3. **The judge's *effort* is the real lever — not the panel's diversity, tier, or rigid instructions.** A focused ablation ([`eval/results-phaseA.md`](eval/results-phaseA.md)) found raising the judge to `xhigh` adds **+2.4** (the biggest single lever), while a deliberately rigid multi-step judge *subtracts* 4.7. So the default judge runs at `xhigh` and stays prompt-light.

Caveats: n=6–12 per eval, Claude judges (same-family preference possible — though both judges ranked single Opus *last* on every v2 task), these task sets only. Directional, not a general benchmark. Reproduce via [`eval/run.js`](eval/run.js) / [`run-v2.js`](eval/run-v2.js) / [`phaseA.js`](eval/phaseA.js) / [`phaseB.js`](eval/phaseB.js) / [`panel.js`](eval/panel.js).

## Honest limits

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
