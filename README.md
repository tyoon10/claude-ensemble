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
- **Claude Code v2.1.154 or later.** `/ensemble` runs as a Dynamic Workflow (`.claude/workflows/ensemble.js`), which requires that version.

> Claude Fable 5 is **not** used or required.

## To start using Claude Ensemble

```bash
git clone https://github.com/tyoon10/claude-ensemble
# into one project (then launch Claude Code FROM this project):
mkdir -p /path/to/your/project/.claude
cp -r claude-ensemble/.claude/* /path/to/your/project/.claude/
# …or make it available everywhere (works from any project). Writes into your global
# config; -n avoids overwriting same-named files (collisions are unlikely):
mkdir -p ~/.claude
cp -rn claude-ensemble/.claude/* ~/.claude/
```

The `/ensemble` command loads when Claude Code starts, so after copying either **restart Claude Code** or run `/reload-skills` so it picks it up. Confirm by typing `/` and checking that `ensemble` appears in the list.

Then ensure dynamic workflows are enabled (one-time configuration):

```
/config workflows=true
```

Then run the ensemble:

```
/ensemble <Describe your task — add your context, goals, constraints, etc.>
```

### Troubleshooting

- **`Unknown command: /ensemble`** — Claude Code hasn't registered the command. Check, in order: you're in a project that has `.claude/workflows/ensemble.js` (run Claude Code from the project you installed into, or do the global `~/.claude/` install above); the session was started or `/reload-skills`-ed *after* you copied the files; dynamic workflows are enabled (`/config workflows=true`); and you're on Claude Code v2.1.154+. Type `/` and confirm `ensemble` is listed. (This is a Claude Code feature; it doesn't exist in claude.ai web chat.)
- **It runs but reports the Workflow tool isn't available** — dynamic workflows are off: run `/config workflows=true`, then retry.

## How it works

![How it works](assets/how_it_works.png)

- **Triage** skips the panel for easy tasks, so you don't spend usage limits where a single pass already wins.
- The **panel** is **three independent best-effort drafts of the same task** (best-of-N). We tested designed "diversity" — objective roles, tier mixes — and it didn't beat this; the lift comes from the judge synthesizing several attempts, not from making them differ (see [`eval/`](eval/)).
- The **judge** sees the drafts under blind, shuffled labels (no model names) to cut judge bias, verifies rather than trusts, and synthesizes one answer better than any single draft.
- The **verify-loop** runs only on **checkable** tasks (the triage gate decides — no flag): a harsh verifier **runs code** to find confirmed defects in the judge's answer, a reviser fixes exactly those, repeating up to 3× or until clean. This is the kit's biggest measured correctness lever — specifically on **long-form checkable reasoning** (systems designs, proofs, quantitative analyses). On *self-contained executable* tasks (write-a-function, exact numerics) a single high-effort pass is already at ceiling and the loop has nothing to fix (oracle-measured, [`eval/results-v9.md`](eval/results-v9.md)) — the triage gate keeps such tasks on the cheap path. On open-ended/judgment tasks it's skipped (nothing to verify against).

## Cost & performance

**Cost is structural, not a price.** On a subscription you spend usage, not dollars — and the gatekeeper keeps easy work off the panel, so you only pay the ensemble premium on genuinely hard tasks:

| Path | Model calls | Relative spend\* |
|---|---|---|
| Single model (baseline) | 1× Opus | 1× |
| Ensemble — simple (gated out) | 1× Haiku + 1× Sonnet | < 1× |
| Ensemble — complex | 1× Haiku + 3× Sonnet-5 panel + 1× Opus judge (+ verify-loop on checkable) | ~2–5× |

<sub>\*Indicative, from the call structure and per-tier token rates — **not a measurement**. Actual spend depends on task and output length.</sub>

![Cost vs correctness](assets/cost-performance.svg)
<sub>Each design at its real cost and correctness (length-controlled). The panel **tier** is a lateral move — a Sonnet-5 panel matches an Opus panel, so the kit runs Sonnet 5 and gate-routes only the hardest checkable tasks to an Opus panel; the **verify-loop** is the lever on checkable reasoning. y is illustrative (the arms tie on correctness), not an absolute score — full data in [`eval/`](eval/).</sub>

**Performance (honest).** We A/B-tested this on a subscription — blind pairwise win-rate, length-controlled, with an independent non-Claude cross-grader (and, in the latest round, **Fable 5** as the strongest independent grader). Three findings shaped the design: (1) **length-controlled, the panel tier barely moves correctness** — a single Opus@max pass ≈ a Sonnet-5 panel ≈ an Opus panel (the large raw win-rates are mostly a length artifact; see [`eval/results-v6.md`](eval/results-v6.md)). A Sonnet-5 panel *ties* the Opus panel at ~0.4× the cost, so the panel uses **Sonnet 5**; (2) the **verify-loop** — on checkable tasks, where a harsh verifier runs code to fix real defects — is the **biggest lever**; (3) the **judge and verifier are load-bearing** — on identical drafts an Opus judge modestly but robustly beats a Sonnet-5 judge (Fable-graded, and *not* a length artifact: the Sonnet-judge answers were the *longer* ones), and piling on cheap verify rounds doesn't substitute for the Opus stack on hard checkable work — self-verification even has a ceiling (a loop reports "clean" while a stronger neutral grader still finds defects), so a stronger verifier leaves fewer (see [`eval/results-v7.md`](eval/results-v7.md)). So the panel **saves with Sonnet 5**, the **judge and verify-loop stay Opus** because that's where correctness is made, and the gate keeps cheap work away. Full method, per-version results, per-task data, and caveats live in **[`eval/`](eval/)**.

**Honest limits:**
- **Claude-only panel = correlated errors.** Every panelist is a Claude model, so they share blind spots — more correlated than a true cross-vendor panel. Whether genuine cross-vendor diversity would help *more* is untested (it needs non-Claude API keys — out of scope here).
- **It still spends real Opus usage.** A complex run is a Sonnet-5 panel + an **Opus** judge + the verify-loop (Opus on the load-bearing judge/verify stages), so **Max is recommended**. The triage gate keeps easy tasks on a cheap single pass and **auto-escalates the hardest checkable tasks to an Opus panel** (`PANEL_MODEL_HARD`) for cleaner drafts — no flag needed.
- **Not a benchmarked guarantee.** A pragmatic pattern — strongest on decomposable, deep-reasoning, and checkable work; weakest where you needed truly independent opinions on one indivisible question. Directional on these task sets (n = 6–12), not a general benchmark.

## Built on Claude Code

This is pure Claude Code configuration — no server, no SDK, no external service:

- the `/ensemble` command runs a **[Dynamic Workflow](https://code.claude.com/docs/en/workflows)** — `agent()` / `parallel()` in a local JavaScript script that owns the control flow;
- the panel + judge run as **[sub-agents](https://code.claude.com/docs/en/sub-agents)** the workflow spawns programmatically — their prompts live inline in the script.

**Staying on the latest models.** The workflow selects models by **tier alias** — `opus`, `sonnet`, `haiku` — and each alias resolves to the newest release of that tier, so the kit follows new Claude models with no edit. Pin a specific version (e.g. `claude-opus-4-8`) only when you want reproducibility.

## Configure

It's all plain Markdown plus one JS file — edit to taste:

- **Models / panel size / effort:** edit the constants in `.claude/workflows/ensemble.js` — `PANEL_MODEL` (panel tier, default `sonnet` = Sonnet 5), `PANEL_MODEL_HARD` (the gate escalates the hardest checkable tasks to this, default `opus`), `SIMPLE_MODEL` (the gated single pass, default `sonnet`), `JUDGE_MODEL`, `GATE_MODEL`, `JUDGE_EFFORT`, and `PANEL_N`. **Prompts** (panelist, judge, verifier) live inline in the same file.
- **Panel tiers / gate-routing:** most panels use `PANEL_MODEL` (Sonnet 5); the gate escalates the hardest checkable tasks to `PANEL_MODEL_HARD` (Opus) for cleaner drafts. Set the two equal to disable gate-routing, or drop `PANEL_N` to two for a lighter run.
- **Deterministic engine:** `.claude/workflows/ensemble.js` runs the pipeline as a scripted Dynamic Workflow (no orchestration-token tax, reproducible). The judge runs at `max` effort — the biggest quality lever we measured (see [`eval/results-phaseA.md`](eval/results-phaseA.md)).

## Files

```
.claude/
  workflows/ensemble.js           # provides /ensemble — self-contained engine (triage · panel · judge · verify-loop; prompts inline)
```

## License

MIT © 2026 Taewan Yoon. See [LICENSE](LICENSE).

> It's an *ensemble* (independent models combined), not a Mixture-of-Experts (sparse routing inside one model) — the name is deliberate.
