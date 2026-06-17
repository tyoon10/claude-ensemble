# claude-ensemble

**Frontier-style answers from a Claude subscription alone.** A small, diverse panel of Claude sub-agents drafts answers to a hard task in parallel; an Opus judge then synthesizes them into one best answer. It runs entirely inside Claude Code on your Pro/Max subscription — **no Anthropic API key, no other provider keys, nothing metered separately.**

```
/ensemble <your hard task>
```
→ panel drafts in parallel → Opus judge synthesizes → you get one answer.

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
  │ drafter        adversary       alt-method        │   diversity by JOB,
  │ best answer    avoid the trap  different method   │   not persona
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
- The **panel** diverges by *objective* — a drafter, an adversary that avoids the tempting-but-wrong approach, and an alt-method solver. Different jobs de-correlate errors more than three copies wearing different "personas" do.
- The **judge** sees the drafts under blind, shuffled labels (no model names) to cut judge bias, verifies rather than trusts, and synthesizes one answer better than any single draft.

## Cost & performance

**Cost is structural, not a price.** On a subscription you spend usage, not dollars — and the gatekeeper keeps easy work off the panel, so you only pay the ensemble premium on genuinely hard tasks:

| Path | Model calls | Relative spend\* |
|---|---|---|
| Single model (baseline) | 1× Opus | 1× |
| Ensemble — simple (gated out) | 1× Haiku + 1× Sonnet | < 1× |
| Ensemble — complex | 1× Haiku + 3× Sonnet + 1× Opus | ~3–5× |

<sub>\*Indicative, from the call structure and per-tier token rates — **not a measurement**. Actual spend depends on task and output length.</sub>

**Performance is an empirical question — so this kit ships no quality numbers it hasn't measured.** The ensemble/fusion pattern is well-motivated, but whether it beats a single Opus pass on *your* tasks is something to test, not assert. To get tested-and-verified numbers, run an A/B eval: the same task set through `/ensemble` and through one Opus pass, blind-scored against a rubric. A benchmark harness and a results chart are planned. Until those numbers exist, treat any "X% better" claim — here or anywhere — with suspicion.

## Honest limits

- **Claude-only panel = correlated errors.** Every panelist is a Claude model, so they share a training lineage and therefore some blind spots — more correlated than a true cross-vendor panel. The judge and the objective-diverse roles mitigate this; they do not erase it. Genuine cross-lab de-correlation needs non-Claude models, which needs API keys — deliberately out of scope here.
- **It spends real usage.** A complex run is up to ~5 model calls — a cheap Haiku triage call, 3 Sonnet panel drafts, and the Opus judge — several with extended thinking. Use it for genuinely hard tasks; the triage step keeps it off easy ones. Heavy use will hit Pro/Max limits.
- **Not a benchmarked guarantee.** It is a pragmatic pattern — strongest on decomposable, deep-reasoning work, weakest where you needed truly independent opinions on one indivisible question.

## Built on Claude Code

This is pure Claude Code configuration — no server, no SDK, no external service:

- the `/ensemble` command and the four panel/judge roles are **[sub-agents](https://code.claude.com/docs/en/sub-agents)**;
- the optional deterministic engine is a **[Dynamic Workflow](https://code.claude.com/docs/en/workflows)** — `agent()` / `parallel()` in a local JavaScript script that owns the control flow.

**Staying on the latest models.** The agents and the workflow select models by **tier alias** — `opus`, `sonnet`, `haiku` — and each alias resolves to the newest release of that tier, so the kit follows new Claude models with no edit. Pin a specific version (e.g. `claude-opus-4-8`) only when you want reproducibility.

## Configure

It's all plain Markdown plus one JS file — edit to taste:

- **Models / panel size:** edit the `model:` line in `.claude/agents/ensemble-*.md` (`sonnet` / `opus` / `haiku`), or add/remove panel members and update the list in `.claude/commands/ensemble.md`.
- **Cheaper runs:** move a panel member to `haiku`, or drop the panel to two.
- **Deterministic engine:** `.claude/workflows/ensemble.js` runs the same pipeline as a scripted Dynamic Workflow (no orchestration-token tax, reproducible). Invoke it with `args = { task: "…" }`.

## Files

```
.claude/
  commands/ensemble.md            # the /ensemble entry point (default path)
  agents/ensemble-drafter.md      # panel: best first-principles answer
  agents/ensemble-adversary.md    # panel: avoid the tempting-but-wrong approach
  agents/ensemble-alt-method.md   # panel: deliberately different method
  agents/ensemble-judge.md        # Opus judge / synthesizer
  workflows/ensemble.js           # optional deterministic engine
```

## License

MIT © 2026 Taewan Yoon. See [LICENSE](LICENSE).

> It's an *ensemble* (independent models combined), not a Mixture-of-Experts (sparse routing inside one model) — the name is deliberate.
