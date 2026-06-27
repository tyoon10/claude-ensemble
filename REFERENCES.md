# References

This kit's design was *informed by* external work on multi-model orchestration and inference-time scaling. The repo's architecture descriptions stay self-contained and name these systems only here — none of the kit's code is derived from them; they are conceptual references.

**Sakana AI** — orchestration & inference-time search:
- [Fugu](https://sakana.ai/fugu/) — orchestrate-and-verify can beat a single model; quality/cost tiering.
- [AB-MCTS](https://sakana.ai/ab-mcts/) — search *wider* (new draft) vs *deeper* (refine one); the basis for the verify-loop's "go deeper" lever.
- [TRINITY](https://arxiv.org/abs/2512.04695) — a verifier-gated loop: verify → revise → stop when clean.
- [The Conductor](https://arxiv.org/abs/2512.04388) — a *learned* coordinator; this kit approximates it with prompting only (no training).

**OpenRouter — Fusion** — a cross-vendor benchmark: adding a different-vendor model to a panel yields a small gain. That cross-vendor branch is the one this subscription-only kit doesn't test (see [`eval/results-phaseB.md`](eval/results-phaseB.md)).

**What ports, and what doesn't.** The edge these systems get from *cross-vendor diversity*, a *trained coordinator*, and *learned cost-control* isn't replicable in a subscription-only, no-API-key, no-training kit. What ports cleanly is the **control flow** — a best-of-N panel, a verifying judge, and a tool-grounded verify→revise loop — which is what this kit implements and what [`eval/`](eval/) measures.
