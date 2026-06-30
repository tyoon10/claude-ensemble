// claude-ensemble eval v6 — PANEL_MODEL re-decision now that `sonnet` resolves to Sonnet 5.
//
// Experiment #1 from the Sonnet-5 plan. Question: with Sonnet 5 as the panelist, does a 3-draft
// Sonnet-5 best-of-N panel now (a) BEAT a single matched-effort Opus pass, and (b) TIE the shipped
// Opus panel — once length is controlled? If yes on both for most families, PANEL_MODEL flips to
// 'sonnet' (Sonnet 5) and the README "a Sonnet panel ~= a single pass" claim is rewritten.
//
// Design (mirrors the SHIPPED pipeline so this tests the real decision):
//   - Single   — one Opus pass @ max, verify-then-answer (matched-effort baseline, a la v4).
//   - Sonnet-5 panel — 3x `sonnet`(=Sonnet 5) drafts @ high -> a max verifying Opus judge.
//   - Opus panel     — 3x `opus` drafts @ high       -> a max verifying Opus judge (shipped).
//   Panel TIER is the ONLY variable: the judge is held FIXED at a max Opus judge across both panels,
//   and the drafts are the kit's HOMOGENEOUS best-of-N (not objective-diverse roles — roles didn't
//   help, see results-panel.md / results-phaseB.md). Panelist + judge prompts are copied verbatim
//   from .claude/workflows/ensemble.js.
//
// Primary metric: v4 LENGTH-CONTROLLED adversarial audit (correctness; longer != better), BOTH
//   answer orders, per task. Two audits/task: Sonnet-5-panel vs single, Sonnet-5-panel vs Opus-panel.
// Secondary: raw forced-choice pairwise (Opus + Sonnet-5 graders, both orders) to expose the
//   raw-vs-controlled artifact delta. Answer word-counts recorded for the length analysis.
// EVERY read is STRATIFIED BY TASK FAMILY (knowledge/judgment vs reasoning/coding) — the launch
//   benchmarks predict the Sonnet-5 flip is domain-dependent, so averaging the families would hide it.
//
// Grader hygiene: the auditor/grader is OPUS — never a Sonnet-5 grader on a Sonnet-5 candidate.
//   (Opus IS same-family with the single-Opus and Opus-panel arms; that bias is tie-permissive, the
//   conservative direction for this claim, exactly as in v4. Run a manual Gemini cross-audit for an
//   out-of-family anchor, per the kit's eval tradition.)
//
// Subscription-only (every model runs as a Claude Code sub-agent; no API key). Reuses the canonical
// run-v2 hard-task set (a superset of v4's 8). Save the returned JSON to raw-v6.json.

export const meta = {
  name: 'ensemble-eval-v6',
  description: 'PANEL_MODEL re-decision: Sonnet-5 panel vs Opus panel vs single Opus, length-controlled, family-stratified',
  phases: [{ title: 'Answer' }, { title: 'Audit' }],
}

const PANEL_N = 3
const DRAFT_EFFORT = 'high'   // panel drafts
const JUDGE_EFFORT = 'max'    // the verifying judge (the kit's biggest lever) — held fixed across both panels
const AUDIT_MODEL = 'opus'    // length-controlled correctness auditor (out-of-family vs the Sonnet-5 panel)
const RAW_GRADERS = ['opus', 'sonnet']  // secondary raw-pairwise triangulation; `sonnet` here = Sonnet 5

// --- prompts copied verbatim from .claude/workflows/ensemble.js so v6 tests the REAL pipeline ---
const PANELIST = 'Give your single best, complete answer to the task. Reason from first principles, state key assumptions, and commit to one answer; do not hedge.'
const JUDGE = 'You are the judge of an ensemble. Below are independent candidate answers under blind labels — do not state or guess which model wrote which. Treat each as a claim to verify — run code/computations to check load-bearing technical claims where useful — and score per-criterion against the task\'s real success criteria (not tone, length, or label order), resolve contradictions explicitly, discard unsupported or fabricated claims, and synthesise ONE final answer better than any single candidate. You may override all candidates if they are all wrong. Prefer correctness over splitting the difference. Lead with the final answer; do not narrate your verification process before it — put any short dissent or verification notes after the answer.'
// matched-effort single-pass baseline (verify-then-answer): a FAIR reference, not the kit's cheap simple path.
const BASELINE = 'Answer this task as well as you can. First, internally verify your reasoning and check for errors, gaps, omitted requirements, and unsupported claims; then give your single best, complete, corrected answer. Output ONLY the final answer.'

// family: 'knowledge' = knowledge/judgment/design (Sonnet 5 ~ ties Opus); 'reasoning' = hard reasoning/proofs/systems (Opus predicted to lead)
const TASKS = [
  { id: 'scaling-plateau', domain: 'deep-research', family: 'knowledge',
    prompt: 'Synthesize the current evidence on whether LLM scaling laws have plateaued. Cover pretraining-compute scaling, data constraints, and inference-time/test-time scaling; take a defensible position and give the strongest counterargument to it.',
    rubric: ['Accurately characterizes pretraining/compute-optimal scaling (e.g. Chinchilla data-optimality)', 'Addresses the data-wall / data-constraint argument', 'Covers inference-time / test-time compute scaling as a distinct axis', 'Cites specific evidence/results accurately without fabrication', 'Takes a clear position AND steelmans the counterargument', 'Acknowledges genuine uncertainty / what would change the answer'] },
  { id: 'global-counter', domain: 'systems-design', family: 'reasoning',
    prompt: 'Design a globally-distributed counter for ad-impression billing: ~1M increments/sec, must survive a full region failure, and must never over- or under-count. Specify the consistency model, the data path, and failure handling, and justify every trade-off.',
    rubric: ['Confronts the consistency-vs-availability/throughput tension honestly', 'Gives a concrete, workable architecture (e.g. sharded/region-local aggregation + reconciliation, or consensus, or CRDT)', 'Handles exactly-once / idempotency of increments', 'Specifies region-failure recovery without loss or double-count', 'Addresses the 1M/sec throughput strategy concretely', 'Is honest about the impossibility tensions / where guarantees soften'] },
  { id: 'exactly-once', domain: 'debugging', family: 'reasoning',
    prompt: 'A distributed job queue occasionally processes the same job twice despite an "exactly-once" claim. Enumerate the distinct mechanisms that could cause this; for each give the detection signal and the fix. Which is most likely, and why?',
    rubric: ['Identifies at-least-once delivery + non-idempotent handler as the core issue', 'Covers visibility-timeout / lease expiry causing redelivery', 'Covers consumer crash after doing work but before ack', 'Covers missing dedup/fencing token or idempotency key', 'Gives a detection signal AND a fix for each mechanism', 'Ranks likelihood with reasoning'] },
  { id: 'sort-lower-bound', domain: 'math', family: 'reasoning',
    prompt: 'Prove that any comparison-based sort of n elements requires Omega(n log n) comparisons in the worst case. Then explain precisely why radix sort does not violate this bound.',
    rubric: ['States the decision-tree model (each comparison = a branch)', 'Argues n! distinct leaves are required for correctness', 'Concludes height >= log2(n!) = Omega(n log n) (e.g. via Stirling)', 'Correctly explains radix sort is NOT comparison-based (uses digit/key structure)', 'Notes radix complexity (O(d(n+k))) lives outside the comparison model'] },
  { id: 'rag-paradigms', domain: 'deep-research', family: 'knowledge',
    prompt: 'Compare the main RAG paradigms — naive RAG, re-ranking, query rewriting, agentic/iterative retrieval, and graph RAG — by mechanism and failure mode, and assess where each is appropriate.',
    rubric: ['Characterizes each paradigm\'s mechanism accurately', 'Gives each a distinct, correct failure mode', 'Assesses appropriateness by task/data conditions, not just a list', 'Notes trade-offs (cost/latency/complexity vs quality)', 'No fabricated method names or citations', 'Synthesizes rather than enumerates'] },
  { id: 'build-vs-api', domain: 'analysis', family: 'knowledge',
    prompt: 'A company building an LLM product must choose: fine-tune an open model, use a frontier API, or do RAG over a base model. Give the decision framework across cost, quality, latency, control, and data-moat, and the conditions that flip each choice.',
    rubric: ['Frames the decision across all five axes meaningfully', 'Correctly characterizes each option\'s strengths/weaknesses', 'Identifies the conditions that flip the decision (volume, domain-shift, data ownership, etc.)', 'Avoids a context-free single recommendation', 'Notes these are not mutually exclusive (hybrids)', 'Ties recommendation to stated assumptions'] },
  { id: 'passkey-threat', domain: 'security', family: 'knowledge',
    prompt: 'Threat-model a "sign in with passkeys" (WebAuthn) flow for a consumer web app. Enumerate the realistic attack surfaces, which WebAuthn mitigates vs does not, and the residual risks you would still defend against.',
    rubric: ['Correctly states what WebAuthn mitigates (phishing via origin binding, credential reuse, server-side secret theft)', 'Identifies account-recovery / fallback as the primary residual attack surface', 'Covers device loss / sync-fabric (passkey provider) compromise', 'Covers registration-time and session-after-auth risks', 'Distinguishes mitigated vs residual accurately', 'Proposes concrete defenses for the residuals'] },
  { id: 'coupon-collector', domain: 'math', family: 'reasoning',
    prompt: 'Derive the expected number of DISTINCT coupons collected after k draws (with replacement) from n equally-likely coupons, and give its asymptotics. Then state and explain the expected time to collect ALL n coupons.',
    rubric: ['Derives E[distinct] = n(1 - (1 - 1/n)^k) via indicator variables', 'Gives correct asymptotic behavior of that expression', 'States coupon-collector expected time ~ n·H_n ~ n ln n', 'Derives/justifies the n·H_n result (sum of geometric waiting times)', 'Reasoning is rigorous, not hand-waved'] },
  { id: 'prompt-to-token', domain: 'conceptual', family: 'knowledge',
    prompt: 'Explain end-to-end, and mechanistically, what happens from the moment a user submits a prompt to an LLM API to the first returned token: tokenization, the prefill forward pass, the KV cache, sampling, and why time-to-first-token differs from inter-token latency.',
    rubric: ['Tokenization → token IDs → embeddings, accurately', 'Distinguishes prefill (parallel over prompt) from decode (one token at a time)', 'Explains the KV cache and why it makes decode O(1)-per-token in context', 'Explains sampling (logits → distribution → token) correctly', 'Explains TTFT (dominated by prefill over the whole prompt) vs inter-token (single-token decode)', 'Mechanistically accurate, no hand-waving'] },
  { id: 'long-context', domain: 'deep-research', family: 'knowledge',
    prompt: 'Assess the main approaches to long-context LLMs — larger attention windows, retrieval, recurrence/state-space models, and compression/memory — by their scaling behavior and what each sacrifices. Which is most promising, and why?',
    rubric: ['Characterizes each approach\'s mechanism and scaling cost accurately (e.g. attention O(n^2))', 'States what each sacrifices (cost, recall, exactness, training complexity)', 'Compares on scaling behavior, not just features', 'Takes a defensible position on most-promising with reasoning', 'No fabricated architectures or results', 'Acknowledges the question is unsettled'] },
  { id: 'contamination-eval', domain: 'methodology', family: 'knowledge',
    prompt: 'Design an evaluation to detect whether a code-generation model has memorized a benchmark versus genuinely generalizes. Specify the methodology, the confounds, and how you would quantify contamination.',
    rubric: ['Proposes a sound methodology (held-out/perturbed variants, post-cutoff data, canaries, n-gram overlap)', 'Identifies confounds (legitimate familiarity, near-duplicates, difficulty shifts)', 'Quantifies contamination (perturbation-gap, perplexity/membership signals)', 'Distinguishes memorization from generalization operationally', 'Considers a control to validate the metric', 'Honest about what the eval cannot prove'] },
  { id: 'micro-monolith', domain: 'analysis', family: 'knowledge',
    prompt: 'A mid-size SaaS is deciding whether to rebuild its monolith as microservices over 18 months. Give the decision framework, the migration failure modes, the conditions under which it is the wrong call, and what you would measure to decide.',
    rubric: ['Frames the decision around the actual problem (scaling org/teams vs scaling load)', 'Names concrete migration failure modes (distributed monolith, ops burden, data consistency)', 'States conditions where it is the WRONG call', 'Specifies what to measure to decide', 'Considers incremental alternatives (modular monolith, strangler-fig)', 'Avoids cargo-cult "microservices = better"'] },
]

const AUDIT_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['winner', 'lengthDriven', 'reasoning'],
  properties: {
    winner: { type: 'string', enum: ['A', 'B', 'tie'] },
    lengthDriven: { type: 'boolean' },
    reasoning: { type: 'string' },
  },
}
const RAW_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['winner', 'reason'],
  properties: { winner: { type: 'string', enum: ['A', 'B'] }, reason: { type: 'string' } },
}

function words(s) { return (s || '').trim().split(/\s+/).filter(Boolean).length }
function hash(s) { return [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 1000000007, 7) }
function avg(a) { return a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0 }
function round1(x) { return Math.round(x * 10) / 10 }

// shipped-style judge: blind, shuffled labels, max Opus verifying judge.
function judge(task, drafts) {
  if (drafts.length < 2) return Promise.resolve(drafts[0] || '')
  const tags = ['A', 'B', 'C', 'D', 'E']
  const off = hash(task.prompt) % drafts.length
  const lab = drafts.map((_, i) => ({ tag: tags[i], text: drafts[(i + off) % drafts.length] }))
  return agent(
    `${JUDGE}\n\n` + lab.map((d) => `--- Candidate ${d.tag} ---\n${d.text}`).join('\n\n') +
    `\n\nORIGINAL TASK:\n${task.prompt}`,
    { model: 'opus', effort: JUDGE_EFFORT, label: `judge:${task.id}`, phase: 'Answer' })
}

// length-controlled correctness audit of two answers, BOTH orders. Returns win/tie/loss for the FIRST arg.
async function audit(task, aText, bText) {
  const run = (x, y) => agent(
    `You are auditing two candidate answers (A and B) to the same task for GENUINE CORRECTNESS, criterion by criterion. Decide which is MORE CORRECT, or whether they TIE.\n` +
    `CRITICAL length control: a LONGER answer is NOT better unless its extra content is both correct AND required by the task; a SHORTER answer that is correct is NOT worse for being shorter. Ignore tone, fluency, formatting, and length. Act as a prosecutor (hunt for real errors and omitted REQUIRED points in each) and a defender (steelman each). Base the verdict ONLY on correctness against the success criteria.\n` +
    `Set lengthDriven=true if the main reason one looks better is length/completeness rather than correctness.\n\n` +
    `SUCCESS CRITERIA:\n${task.rubric.map((c, i) => `${i + 1}. ${c}`).join('\n')}\n\nTASK:\n${task.prompt}\n\n` +
    `--- Answer A ---\n${x}\n\n--- Answer B ---\n${y}\n\nReturn winner (A / B / tie), lengthDriven (bool), reasoning.`,
    { model: AUDIT_MODEL, effort: 'high', schema: AUDIT_SCHEMA, label: `audit:${task.id}`, phase: 'Audit' })
  const [o1, o2] = await parallel([() => run(aText, bText), () => run(bText, aText)])
  let a = 0, b = 0, t = 0, ld = 0
  const tally = (v, aIsFirst) => {
    if (!v) return
    if (v.lengthDriven) ld++
    if (v.winner === 'tie') t++
    else if ((v.winner === 'A') === aIsFirst) a++
    else b++
  }
  tally(o1, true); tally(o2, false)
  return { a, b, t, lengthDriven: ld, verdicts: [o1, o2] }
}

// raw forced-choice pairwise, both orders, multiple graders. Returns the FIRST arg's win-rate (0-100).
async function rawPair(task, aText, bText) {
  const run = (x, y, m) => agent(
    `Which answer is better overall for this task? Forced choice, no ties.\n\nTASK:\n${task.prompt}\n\n` +
    `--- Answer A ---\n${x}\n\n--- Answer B ---\n${y}\n\nReturn winner (A or B) and a one-line reason.`,
    { model: m, effort: 'high', schema: RAW_SCHEMA, label: `raw:${task.id}:${m}`, phase: 'Audit' })
  const calls = []
  for (const m of RAW_GRADERS) {
    calls.push(() => run(aText, bText, m).then((v) => ({ v, first: true })))
    calls.push(() => run(bText, aText, m).then((v) => ({ v, first: false })))
  }
  const out = (await parallel(calls)).filter(Boolean)
  let aWins = 0, n = 0
  for (const { v, first } of out) { if (!v) continue; n++; if ((v.winner === 'A') === first) aWins++ }
  return { aWinRate: n ? round1(100 * aWins / n) : 0, n }
}

const rows = await pipeline(TASKS,
  // Stage 1 — Answer: three arms (single Opus@max, Sonnet-5 panel, Opus panel). Judge held fixed at max Opus.
  async (task) => {
    const calls = [
      () => agent(`${BASELINE}\n\nTASK:\n${task.prompt}`, { model: 'opus', effort: 'max', label: `base:${task.id}`, phase: 'Answer' }),
      ...Array.from({ length: PANEL_N }, (_, i) => () => agent(`${PANELIST}\n\nTASK:\n${task.prompt}`, { model: 'sonnet', effort: DRAFT_EFFORT, label: `s${i}:${task.id}`, phase: 'Answer' })),
      ...Array.from({ length: PANEL_N }, (_, i) => () => agent(`${PANELIST}\n\nTASK:\n${task.prompt}`, { model: 'opus', effort: DRAFT_EFFORT, label: `o${i}:${task.id}`, phase: 'Answer' })),
    ]
    const out = await parallel(calls)
    const base = out[0] || ''
    const sDrafts = out.slice(1, 1 + PANEL_N).filter(Boolean)
    const oDrafts = out.slice(1 + PANEL_N, 1 + 2 * PANEL_N).filter(Boolean)
    const [sPanel, oPanel] = await parallel([() => judge(task, sDrafts), () => judge(task, oDrafts)])
    return { task, base, sPanel: sPanel || sDrafts[0] || base, oPanel: oPanel || oDrafts[0] || base }
  },
  // Stage 2 — length-controlled audits (primary) + raw pairwise (secondary), both orders.
  async (r) => {
    if (!r) return null
    const { task, base, sPanel, oPanel } = r
    const [sVsSingle, sVsOpus, rawS, rawO] = await parallel([
      () => audit(task, sPanel, base),     // Sonnet-5 panel vs single Opus
      () => audit(task, sPanel, oPanel),   // Sonnet-5 panel vs Opus panel
      () => rawPair(task, sPanel, base),   // raw: Sonnet-5 panel win-rate over single
      () => rawPair(task, sPanel, oPanel), // raw: Sonnet-5 panel win-rate over Opus panel
    ])
    return {
      id: task.id, domain: task.domain, family: task.family,
      words: { single: words(base), sonnet5Panel: words(sPanel), opusPanel: words(oPanel) },
      sVsSingle, sVsOpus,
      raw: { sonnet5PanelOverSingle: rawS.aWinRate, sonnet5PanelOverOpusPanel: rawO.aWinRate },
    }
  }
)

// ----- aggregate: overall + stratified by family -----
const data = rows.filter(Boolean)
function sumAudit(set, sel) {
  return set.reduce((acc, r) => { const x = sel(r); acc.panelWin += x.a; acc.otherWin += x.b; acc.tie += x.t; acc.lengthDriven += x.lengthDriven; return acc },
    { panelWin: 0, otherWin: 0, tie: 0, lengthDriven: 0 })
}
function agg(set) {
  return {
    n: set.length,
    sonnet5PanelVsSingle: sumAudit(set, (r) => r.sVsSingle),       // panelWin = Sonnet-5 panel more correct; otherWin = single more correct
    sonnet5PanelVsOpusPanel: sumAudit(set, (r) => r.sVsOpus),
    rawSonnet5PanelOverSingle: round1(avg(set.map((r) => r.raw.sonnet5PanelOverSingle))),
    rawSonnet5PanelOverOpusPanel: round1(avg(set.map((r) => r.raw.sonnet5PanelOverOpusPanel))),
    medianWords: {
      single: round1(avg(set.map((r) => r.words.single))),
      sonnet5Panel: round1(avg(set.map((r) => r.words.sonnet5Panel))),
      opusPanel: round1(avg(set.map((r) => r.words.opusPanel))),
    },
  }
}
const families = [...new Set(data.map((r) => r.family))]
const summary = { overall: agg(data), byFamily: Object.fromEntries(families.map((f) => [f, agg(data.filter((r) => r.family === f))])) }

const o = summary.overall
log(`v6 length-controlled (n=${o.n}): Sonnet5-panel vs single  win/tie/loss = ${o.sonnet5PanelVsSingle.panelWin}/${o.sonnet5PanelVsSingle.tie}/${o.sonnet5PanelVsSingle.otherWin} (length-driven ${o.sonnet5PanelVsSingle.lengthDriven}); vs Opus-panel = ${o.sonnet5PanelVsOpusPanel.panelWin}/${o.sonnet5PanelVsOpusPanel.tie}/${o.sonnet5PanelVsOpusPanel.otherWin} (ld ${o.sonnet5PanelVsOpusPanel.lengthDriven}). Raw pairwise: over single ${o.rawSonnet5PanelOverSingle}%, over Opus-panel ${o.rawSonnet5PanelOverOpusPanel}%`)

return { summary, rows: data }
