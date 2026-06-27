// claude-ensemble — 3-arm A/B/C evaluation (Claude Code Dynamic Workflow).
//
// Tests two hypotheses about why v1's lift was small:
//   (ceiling)  v1 tasks saturated the rubric (~90) — use HARDER, high-headroom tasks here.
//   (config)   v1 panel was Sonnet, not the self-ensemble Opus config — add an Opus-panel arm.
//
// Arms (all subscription-only, Claude models):
//   A baseline      — one Opus pass (high effort).
//   B ensemble-sonnet — 3 Sonnet objective-diverse drafts → Opus judge.            (then-default; now superseded)
//   C ensemble-opus   — 3 Opus objective-diverse drafts → Opus judge, critique-first. (now the kit's default panel tier)
//
// Each task's three answers are blind-scored by two independent judges (Opus + Sonnet) under a
// randomized X/Y/Z permutation, with a strict anti-saturation calibration. Reproduce: run this
// workflow (no args). Output: { summary, rows }.

export const meta = {
  name: 'ensemble-eval-v2',
  description: '3-arm: single-Opus vs Sonnet-panel vs Opus-panel ensemble, on harder tasks, blind-scored',
  phases: [{ title: 'Answer' }, { title: 'Score' }],
}

const PANEL = [
  { tag: 'drafter', instruction: 'Give your single best, complete first-principles answer. State key assumptions. Commit; do not hedge.' },
  { tag: 'adversary', instruction: 'First name the tempting-but-wrong approach in one sentence and why it fails; then give your best answer that sidesteps it, hunting edge cases and hidden assumptions.' },
  { tag: 'alt-method', instruction: 'Solve via a deliberately DIFFERENT method than the obvious one. Name the method in one line, then give the complete answer.' },
]
const COMMON = 'Ground every claim; never fabricate facts, APIs, citations, or numbers. Be thorough and complete; depth and breadth matter.'

const TASKS = [
  { id: 'scaling-plateau', domain: 'deep-research',
    prompt: 'Synthesize the current evidence on whether LLM scaling laws have plateaued. Cover pretraining-compute scaling, data constraints, and inference-time/test-time scaling; take a defensible position and give the strongest counterargument to it.',
    rubric: ['Accurately characterizes pretraining/compute-optimal scaling (e.g. Chinchilla data-optimality)', 'Addresses the data-wall / data-constraint argument', 'Covers inference-time / test-time compute scaling as a distinct axis', 'Cites specific evidence/results accurately without fabrication', 'Takes a clear position AND steelmans the counterargument', 'Acknowledges genuine uncertainty / what would change the answer'] },
  { id: 'global-counter', domain: 'systems-design',
    prompt: 'Design a globally-distributed counter for ad-impression billing: ~1M increments/sec, must survive a full region failure, and must never over- or under-count. Specify the consistency model, the data path, and failure handling, and justify every trade-off.',
    rubric: ['Confronts the consistency-vs-availability/throughput tension honestly', 'Gives a concrete, workable architecture (e.g. sharded/region-local aggregation + reconciliation, or consensus, or CRDT)', 'Handles exactly-once / idempotency of increments', 'Specifies region-failure recovery without loss or double-count', 'Addresses the 1M/sec throughput strategy concretely', 'Is honest about the impossibility tensions / where guarantees soften'] },
  { id: 'exactly-once', domain: 'debugging',
    prompt: 'A distributed job queue occasionally processes the same job twice despite an "exactly-once" claim. Enumerate the distinct mechanisms that could cause this; for each give the detection signal and the fix. Which is most likely, and why?',
    rubric: ['Identifies at-least-once delivery + non-idempotent handler as the core issue', 'Covers visibility-timeout / lease expiry causing redelivery', 'Covers consumer crash after doing work but before ack', 'Covers missing dedup/fencing token or idempotency key', 'Gives a detection signal AND a fix for each mechanism', 'Ranks likelihood with reasoning'] },
  { id: 'sort-lower-bound', domain: 'math',
    prompt: 'Prove that any comparison-based sort of n elements requires Omega(n log n) comparisons in the worst case. Then explain precisely why radix sort does not violate this bound.',
    rubric: ['States the decision-tree model (each comparison = a branch)', 'Argues n! distinct leaves are required for correctness', 'Concludes height >= log2(n!) = Omega(n log n) (e.g. via Stirling)', 'Correctly explains radix sort is NOT comparison-based (uses digit/key structure)', 'Notes radix complexity (O(d(n+k))) lives outside the comparison model'] },
  { id: 'rag-paradigms', domain: 'deep-research',
    prompt: 'Compare the main RAG paradigms — naive RAG, re-ranking, query rewriting, agentic/iterative retrieval, and graph RAG — by mechanism and failure mode, and assess where each is appropriate.',
    rubric: ['Characterizes each paradigm\'s mechanism accurately', 'Gives each a distinct, correct failure mode', 'Assesses appropriateness by task/data conditions, not just a list', 'Notes trade-offs (cost/latency/complexity vs quality)', 'No fabricated method names or citations', 'Synthesizes rather than enumerates'] },
  { id: 'build-vs-api', domain: 'analysis',
    prompt: 'A company building an LLM product must choose: fine-tune an open model, use a frontier API, or do RAG over a base model. Give the decision framework across cost, quality, latency, control, and data-moat, and the conditions that flip each choice.',
    rubric: ['Frames the decision across all five axes meaningfully', 'Correctly characterizes each option\'s strengths/weaknesses', 'Identifies the conditions that flip the decision (volume, domain-shift, data ownership, etc.)', 'Avoids a context-free single recommendation', 'Notes these are not mutually exclusive (hybrids)', 'Ties recommendation to stated assumptions'] },
  { id: 'passkey-threat', domain: 'security',
    prompt: 'Threat-model a "sign in with passkeys" (WebAuthn) flow for a consumer web app. Enumerate the realistic attack surfaces, which WebAuthn mitigates vs does not, and the residual risks you would still defend against.',
    rubric: ['Correctly states what WebAuthn mitigates (phishing via origin binding, credential reuse, server-side secret theft)', 'Identifies account-recovery / fallback as the primary residual attack surface', 'Covers device loss / sync-fabric (passkey provider) compromise', 'Covers registration-time and session-after-auth risks', 'Distinguishes mitigated vs residual accurately', 'Proposes concrete defenses for the residuals'] },
  { id: 'coupon-collector', domain: 'math',
    prompt: 'Derive the expected number of DISTINCT coupons collected after k draws (with replacement) from n equally-likely coupons, and give its asymptotics. Then state and explain the expected time to collect ALL n coupons.',
    rubric: ['Derives E[distinct] = n(1 - (1 - 1/n)^k) via indicator variables', 'Gives correct asymptotic behavior of that expression', 'States coupon-collector expected time ~ n·H_n ~ n ln n', 'Derives/justifies the n·H_n result (sum of geometric waiting times)', 'Reasoning is rigorous, not hand-waved'] },
  { id: 'prompt-to-token', domain: 'conceptual',
    prompt: 'Explain end-to-end, and mechanistically, what happens from the moment a user submits a prompt to an LLM API to the first returned token: tokenization, the prefill forward pass, the KV cache, sampling, and why time-to-first-token differs from inter-token latency.',
    rubric: ['Tokenization → token IDs → embeddings, accurately', 'Distinguishes prefill (parallel over prompt) from decode (one token at a time)', 'Explains the KV cache and why it makes decode O(1)-per-token in context', 'Explains sampling (logits → distribution → token) correctly', 'Explains TTFT (dominated by prefill over the whole prompt) vs inter-token (single-token decode)', 'Mechanistically accurate, no hand-waving'] },
  { id: 'long-context', domain: 'deep-research',
    prompt: 'Assess the main approaches to long-context LLMs — larger attention windows, retrieval, recurrence/state-space models, and compression/memory — by their scaling behavior and what each sacrifices. Which is most promising, and why?',
    rubric: ['Characterizes each approach\'s mechanism and scaling cost accurately (e.g. attention O(n^2))', 'States what each sacrifices (cost, recall, exactness, training complexity)', 'Compares on scaling behavior, not just features', 'Takes a defensible position on most-promising with reasoning', 'No fabricated architectures or results', 'Acknowledges the question is unsettled'] },
  { id: 'contamination-eval', domain: 'methodology',
    prompt: 'Design an evaluation to detect whether a code-generation model has memorized a benchmark versus genuinely generalizes. Specify the methodology, the confounds, and how you would quantify contamination.',
    rubric: ['Proposes a sound methodology (held-out/perturbed variants, post-cutoff data, canaries, n-gram overlap)', 'Identifies confounds (legitimate familiarity, near-duplicates, difficulty shifts)', 'Quantifies contamination (perturbation-gap, perplexity/membership signals)', 'Distinguishes memorization from generalization operationally', 'Considers a control to validate the metric', 'Honest about what the eval cannot prove'] },
  { id: 'micro-monolith', domain: 'analysis',
    prompt: 'A mid-size SaaS is deciding whether to rebuild its monolith as microservices over 18 months. Give the decision framework, the migration failure modes, the conditions under which it is the wrong call, and what you would measure to decide.',
    rubric: ['Frames the decision around the actual problem (scaling org/teams vs scaling load)', 'Names concrete migration failure modes (distributed monolith, ops burden, data consistency)', 'States conditions where it is the WRONG call', 'Specifies what to measure to decide', 'Considers incremental alternatives (modular monolith, strangler-fig)', 'Avoids cargo-cult "microservices = better"'] },
]

const SCORE_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    scoreX: { type: 'number' }, scoreY: { type: 'number' }, scoreZ: { type: 'number' },
    best: { type: 'string', enum: ['X', 'Y', 'Z'] },
    reasoning: { type: 'string' },
  },
  required: ['scoreX', 'scoreY', 'scoreZ', 'best', 'reasoning'],
}

const SCORERS = ['opus', 'sonnet']
const PERMS = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]]
const NAMES = ['baseline', 'sonnet', 'opus']
function avg(a) { return a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0 }
function round1(x) { return Math.round(x * 10) / 10 }
function hash(s) { return [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 1000000007, 7) }

function judgeAnswer(task, drafts, effort, critiqueFirst) {
  if (drafts.length < 2) return Promise.resolve(drafts[0] || '')
  const tags = ['A', 'B', 'C', 'D', 'E']
  const off = hash(task.prompt) % drafts.length
  const lab = drafts.map((_, i) => ({ tag: tags[i], text: drafts[(i + off) % drafts.length] }))
  const critique = critiqueFirst
    ? 'First, internally verify each candidate for errors, gaps, and unsupported claims. '
    : ''
  return agent(
    `You are the judge of an ensemble. Below are independent candidate answers under blind labels — do not guess which produced which. ${critique}Resolve contradictions, discard unsupported claims, and synthesise ONE final answer better than any single candidate. Output ONLY the final answer (no commentary about candidates).\n\n` +
    lab.map((d) => `--- Candidate ${d.tag} ---\n${d.text}`).join('\n\n') +
    `\n\nORIGINAL TASK:\n${task.prompt}`,
    { model: 'opus', effort, label: `judge`, phase: 'Answer' })
}

const results = await pipeline(TASKS,
  // Stage 1 — all three arms answer.
  async (task) => {
    const calls = [
      () => agent(`Answer this as well as you can. Be complete and correct.\n\nTASK:\n${task.prompt}`,
        { model: 'opus', effort: 'high', label: `base:${task.id}`, phase: 'Answer' }),
      ...PANEL.map((p) => () => agent(`${p.instruction}\n\n${COMMON}\n\nTASK:\n${task.prompt}`,
        { model: 'sonnet', effort: 'high', label: `s:${task.id}:${p.tag}`, phase: 'Answer' })),
      ...PANEL.map((p) => () => agent(`${p.instruction}\n\n${COMMON}\n\nTASK:\n${task.prompt}`,
        { model: 'opus', effort: 'high', label: `o:${task.id}:${p.tag}`, phase: 'Answer' })),
    ]
    const out = await parallel(calls)
    const base = out[0] || ''
    const sDrafts = out.slice(1, 4).filter(Boolean)
    const oDrafts = out.slice(4, 7).filter(Boolean)
    const [sonnetEns, opusEns] = await parallel([
      () => judgeAnswer(task, sDrafts, 'high', false),
      () => judgeAnswer(task, oDrafts, 'xhigh', true),
    ])
    return { task, base, sonnetEns: sonnetEns || (sDrafts[0] || base), opusEns: opusEns || (oDrafts[0] || base) }
  },
  // Stage 2 — two blind judges score the 3 arms under a randomized X/Y/Z permutation, strict calibration.
  async (r) => {
    if (!r) return null
    const arms = [r.base, r.sonnetEns, r.opusEns]
    const perm = PERMS[hash(r.task.id) % 6]
    const labels = ['X', 'Y', 'Z']
    const shown = perm.map((armIdx, pos) => ({ label: labels[pos], text: arms[armIdx] }))
    const verdicts = (await parallel(SCORERS.map((m) => () =>
      agent(
        `Score three candidate answers to a task strictly against the rubric, criterion by criterion. You do not know which system produced which — do not guess. Be a hard grader: use the FULL 0-100 range; reserve 90+ for genuinely excellent, near-complete answers; a competent-but-incomplete or partially-flawed answer should land 60-80; serious gaps below 60. Score each candidate independently.\n\nRUBRIC:\n${r.task.rubric.map((c, i) => `${i + 1}. ${c}`).join('\n')}\n\n` +
        shown.map((s) => `--- Candidate ${s.label} ---\n${s.text}`).join('\n\n') +
        `\n\nTASK:\n${r.task.prompt}\n\nReturn scoreX, scoreY, scoreZ (0-100 each) and the single best (X / Y / Z).`,
        { model: m, effort: 'high', schema: SCORE_SCHEMA, label: `score:${r.task.id}:${m}`, phase: 'Score' }
      ).then((v) => ({ m, v }))
    ))).filter(Boolean)

    const armScores = [[], [], []]
    const bestVotes = { baseline: 0, sonnet: 0, opus: 0 }
    for (const { v } of verdicts) {
      const sc = [v.scoreX, v.scoreY, v.scoreZ]
      perm.forEach((armIdx, pos) => armScores[armIdx].push(sc[pos]))
      const bestPos = { X: 0, Y: 1, Z: 2 }[v.best]
      bestVotes[NAMES[perm[bestPos]]]++
    }
    const mean = armScores.map((a) => round1(avg(a)))
    let best = 'tie', top = -1
    NAMES.forEach((n, i) => { if (mean[i] > top) { top = mean[i]; best = n } })
    return { id: r.task.id, domain: r.task.domain, base: mean[0], sonnet: mean[1], opus: mean[2], bestVotes, best }
  }
)

const rows = results.filter(Boolean)
const summary = {
  n: rows.length,
  baseMean: round1(avg(rows.map((r) => r.base))),
  sonnetMean: round1(avg(rows.map((r) => r.sonnet))),
  opusMean: round1(avg(rows.map((r) => r.opus))),
}
summary.sonnetDelta = round1(summary.sonnetMean - summary.baseMean)
summary.opusDelta = round1(summary.opusMean - summary.baseMean)
summary.opusOverSonnet = round1(summary.opusMean - summary.sonnetMean)
summary.bestCounts = {
  baseline: rows.filter((r) => r.best === 'baseline').length,
  sonnet: rows.filter((r) => r.best === 'sonnet').length,
  opus: rows.filter((r) => r.best === 'opus').length,
}
log(`base ${summary.baseMean} | sonnet ${summary.sonnetMean} (Δ${summary.sonnetDelta}) | opus ${summary.opusMean} (Δ${summary.opusDelta}); best base/sonnet/opus = ${summary.bestCounts.baseline}/${summary.bestCounts.sonnet}/${summary.bestCounts.opus}`)

return { summary, rows }
