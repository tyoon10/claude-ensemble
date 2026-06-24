# References

This kit's design was *informed by* external work on multi-model orchestration and inference-time scaling. To keep the
architecture descriptions in this repo clear and self-contained, those descriptions don't name external systems inline —
the attribution lives here instead. None of the code below is derived from these sources; they are conceptual references.

## Multi-model orchestration & inference-time scaling
- **Sakana AI — "Fugu" / "Fugu Ultra"** (2026): an orchestration model that routes a task across a pool of frontier LLMs.
  Reference for the "orchestrate + verify beats a single model" framing and the quality/cost tiering.
  <https://sakana.ai/fugu/>
- **Sakana AI — AB-MCTS / TreeQuest** (2025): adaptive inference-time search that balances *going wider* (new candidate)
  vs *going deeper* (refining a promising one). Reference for this kit's **verify-loop "go deeper" lever** — iterating on
  a finished answer rather than only sampling more drafts. <https://sakana.ai/ab-mcts/> · <https://github.com/SakanaAI/treequest>
- **Sakana AI — TRINITY** (ICLR 2026): an evolved coordinator that assigns Thinker / Worker / **Verifier** roles across a
  worker pool, terminating on a verifier's accept. Reference for the **verifier-gated loop** (verify → revise → re-verify
  → stop when clean). <https://arxiv.org/abs/2512.04695>
- **Sakana AI — The Conductor** (2026): a small RL-trained model that learns to orchestrate a diverse worker pool (which
  model, what instruction, what context, how many times). Reference for *learned* adaptive coordination — which this kit
  approximates only with prompting (no training). <https://arxiv.org/abs/2512.04388>

## Cross-vendor ensembles
- **OpenRouter — "Fusion" / cross-vendor benchmark** (2026): a public data point that adding a *different-vendor* model
  to a same-model panel yields a small gain, and that *same-model* self-ensemble alone beats a solo pass. Cited in
  [`eval/results-phaseB.md`](eval/results-phaseB.md) as the cross-vendor branch this subscription-only kit does not test.

## Why the kit is Claude-only
The above systems get much of their edge from **cross-vendor model diversity**, a **trained coordinator**, and
**adaptive (learned) cost-control** — none of which a subscription-only, no-API-key, no-training kit can replicate. What
*does* port cleanly is the **control flow**: a best-of-N panel, a verifying judge, and a tool-grounded verify→revise loop.
That is what this kit implements, and what its `eval/` measures.
