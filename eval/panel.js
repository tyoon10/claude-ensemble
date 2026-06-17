// claude-ensemble — panel-design test: homogeneous best-of-N vs objective-role panel (Dynamic Workflow).
//
// single Opus baseline vs homog (3× Sonnet, identical best-answer prompt) vs roles
// (drafter/adversary/alt-method), all → Opus `xhigh` judge; blind 3-way scoring, n=12.
// Tests whether the kit's objective roles are load-bearing. Result: the homogeneous best-of-N
// panel BEAT the role panel (+3.0 mean, 8/12) → the kit now ships best-of-N. See results-panel.md.
// Reproduce: run this workflow (no args). Output: { summary, rows }.

export const meta = {
  name: 'panel-homog-vs-roles',
  description: 'Does the objective-role panel beat a homogeneous best-of-N panel? single Opus vs homog vs roles, blind-scored, n=12',
  phases: [{ title: 'Drafts' }, { title: 'Score' }],
}

const COMMON = 'Ground every claim; never fabricate facts, APIs, citations, or numbers. Be thorough and complete; depth and breadth matter.'
const GENERIC = 'Give your single best, complete answer to the task. State key assumptions; be thorough and complete.'
const ROLES = [
  'Give your single best, complete first-principles answer. State key assumptions. Commit; do not hedge.',
  'First name the tempting-but-wrong approach in one sentence and why it fails; then give your best answer that deliberately sidesteps it, hunting edge cases and hidden assumptions.',
  'Solve via a deliberately DIFFERENT method than the obvious one (work backwards, a sub-case first, or a different framework). Name the method in one line, then give the complete answer.',
]

const TASKS = [
  { id: 'scaling-plateau', prompt: 'Synthesize the current evidence on whether LLM scaling laws have plateaued. Cover pretraining-compute scaling, data constraints, and inference-time/test-time scaling; take a defensible position and give the strongest counterargument to it.',
    rubric: ['Characterizes pretraining/compute-optimal scaling accurately', 'Addresses the data-wall argument', 'Covers inference-time/test-time compute as a distinct axis', 'Cites specific evidence without fabrication', 'Takes a position AND steelmans the counter', 'Acknowledges uncertainty'] },
  { id: 'global-counter', prompt: 'Design a globally-distributed counter for ad-impression billing: ~1M increments/sec, must survive a full region failure, and must never over- or under-count. Specify the consistency model, the data path, and failure handling, and justify every trade-off.',
    rubric: ['Confronts consistency-vs-throughput honestly', 'Concrete workable architecture', 'Handles exactly-once / idempotency', 'Region-failure recovery without loss or double-count', 'Addresses the 1M/sec throughput strategy', 'Honest about impossibility tensions'] },
  { id: 'exactly-once', prompt: 'A distributed job queue occasionally processes the same job twice despite an "exactly-once" claim. Enumerate the distinct mechanisms that could cause this; for each give the detection signal and the fix. Which is most likely, and why?',
    rubric: ['At-least-once delivery + non-idempotent handler', 'Visibility-timeout / lease expiry redelivery', 'Crash after work before ack', 'Missing dedup/fencing token', 'Detection + fix for each', 'Ranks likelihood with reasoning'] },
  { id: 'sort-lower-bound', prompt: 'Prove that any comparison-based sort of n elements requires Omega(n log n) comparisons in the worst case. Then explain precisely why radix sort does not violate this bound.',
    rubric: ['States the decision-tree model', 'Argues n! leaves required', 'Concludes height >= log2(n!) = Omega(n log n)', 'Explains radix is not comparison-based', 'Notes radix complexity lives outside the model'] },
  { id: 'rag-paradigms', prompt: 'Compare the main RAG paradigms — naive RAG, re-ranking, query rewriting, agentic/iterative retrieval, and graph RAG — by mechanism and failure mode, and assess where each is appropriate.',
    rubric: ['Each mechanism accurate', 'Each a distinct correct failure mode', 'Appropriateness by conditions', 'Trade-offs', 'No fabricated method names', 'Synthesizes rather than lists'] },
  { id: 'build-vs-api', prompt: 'A company building an LLM product must choose: fine-tune an open model, use a frontier API, or do RAG over a base model. Give the decision framework across cost, quality, latency, control, and data-moat, and the conditions that flip each choice.',
    rubric: ['Frames across all five axes', 'Characterizes each option correctly', 'Conditions that flip the decision', 'Avoids a context-free single pick', 'Notes hybrids', 'Ties to assumptions'] },
  { id: 'passkey-threat', prompt: 'Threat-model a "sign in with passkeys" (WebAuthn) flow for a consumer web app. Enumerate the realistic attack surfaces, which WebAuthn mitigates vs does not, and the residual risks you would still defend against.',
    rubric: ['States what WebAuthn mitigates (phishing/origin binding, reuse, server secret theft)', 'Account-recovery/fallback as primary residual', 'Device loss / sync-fabric compromise', 'Registration + post-auth session risks', 'Mitigated vs residual accurate', 'Concrete residual defenses'] },
  { id: 'coupon-collector', prompt: 'Derive the expected number of DISTINCT coupons collected after k draws (with replacement) from n equally-likely coupons, and give its asymptotics. Then state and explain the expected time to collect ALL n coupons.',
    rubric: ['E[distinct] = n(1-(1-1/n)^k) via indicators', 'Correct asymptotics of that expression', 'Coupon-collector ~ n*H_n ~ n ln n', 'Justifies the n*H_n result', 'Rigorous, not hand-waved'] },
  { id: 'prompt-to-token', prompt: 'Explain end-to-end and mechanistically what happens from prompt submission to the first returned token in an LLM API: tokenization, the prefill forward pass, the KV cache, sampling, and why TTFT differs from inter-token latency.',
    rubric: ['Tokenization -> IDs -> embeddings', 'Prefill (parallel) vs decode (one token at a time)', 'KV cache and why decode is O(1)/token', 'Sampling correctly', 'TTFT (prefill) vs inter-token (decode)', 'Mechanistically accurate'] },
  { id: 'long-context', prompt: 'Assess the main approaches to long-context LLMs — larger attention windows, retrieval, recurrence/state-space models, and compression/memory — by their scaling behavior and what each sacrifices. Which is most promising, and why?',
    rubric: ['Each mechanism + scaling cost accurate', 'What each sacrifices', 'Compares on scaling behavior', 'Defensible position', 'No fabricated architectures', 'Acknowledges unsettled'] },
  { id: 'contamination-eval', prompt: 'Design an evaluation to detect whether a code-generation model has memorized a benchmark versus genuinely generalizes. Specify the methodology, the confounds, and how you would quantify contamination.',
    rubric: ['Sound methodology (held-out/perturbed, post-cutoff, canaries, n-gram)', 'Identifies confounds', 'Quantifies contamination', 'Memorization vs generalization operationally', 'Considers a control', 'Honest about limits'] },
  { id: 'micro-monolith', prompt: 'A mid-size SaaS is deciding whether to rebuild its monolith as microservices over 18 months. Give the decision framework, the migration failure modes, the conditions under which it is the wrong call, and what you would measure to decide.',
    rubric: ['Frames around the real problem (org vs load)', 'Concrete migration failure modes', 'Conditions where it is WRONG', 'What to measure', 'Incremental alternatives', 'Avoids cargo-cult'] },
]

const SCORE3 = {
  type: 'object', additionalProperties: false,
  properties: { scoreA: { type: 'number' }, scoreB: { type: 'number' }, scoreC: { type: 'number' }, reasoning: { type: 'string' } },
  required: ['scoreA', 'scoreB', 'scoreC', 'reasoning'],
}
const PERMS = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]]
const SCORERS = ['opus', 'sonnet']
function avg(a) { return a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0 }
function round1(x) { return Math.round(x * 10) / 10 }
function hash(s) { return [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 1000000007, 7) }
function rubricText(t) { return t.rubric.map((c, i) => `${i + 1}. ${c}`).join('\n') }

function judge(task, drafts) {
  const tags = ['A', 'B', 'C', 'D', 'E']
  const off = hash(task.prompt) % drafts.length
  const lab = drafts.map((_, i) => `--- Candidate ${tags[i]} ---\n${drafts[(i + off) % drafts.length]}`).join('\n\n')
  return agent(
    `You are the judge of an ensemble. Below are independent candidate answers under blind labels — do not guess which produced which. Treat each as a claim to verify, resolve contradictions, discard unsupported claims, and synthesise ONE final answer better than any single candidate. Lead with the final answer.\n\n${lab}\n\nORIGINAL TASK:\n${task.prompt}`,
    { model: 'opus', effort: 'xhigh', label: `judge:${task.id}`, phase: 'Drafts' })
}

const results = await pipeline(TASKS,
  async (task) => {
    const calls = [
      () => agent(`Answer this as well as you can. Be complete and correct.\n\nTASK:\n${task.prompt}`, { model: 'opus', effort: 'high', label: `base:${task.id}`, phase: 'Drafts' }),
      ...[0, 1, 2].map(() => () => agent(`${GENERIC}\n\n${COMMON}\n\nTASK:\n${task.prompt}`, { model: 'sonnet', effort: 'high', label: `homog:${task.id}`, phase: 'Drafts' })),
      ...ROLES.map((ins) => () => agent(`${ins}\n\n${COMMON}\n\nTASK:\n${task.prompt}`, { model: 'sonnet', effort: 'high', label: `roles:${task.id}`, phase: 'Drafts' })),
    ]
    const out = await parallel(calls)
    const baseline = out[0] || ''
    const homogDrafts = out.slice(1, 4).filter(Boolean)
    const roleDrafts = out.slice(4, 7).filter(Boolean)
    const [homog, roles] = await parallel([
      () => homogDrafts.length >= 2 ? judge(task, homogDrafts) : Promise.resolve(homogDrafts[0] || baseline),
      () => roleDrafts.length >= 2 ? judge(task, roleDrafts) : Promise.resolve(roleDrafts[0] || baseline),
    ])
    return { task, baseline, homog: homog || baseline, roles: roles || baseline }
  },
  async (r) => {
    if (!r) return null
    const arms = [r.baseline, r.homog, r.roles] // 0=baseline 1=homog 2=roles
    const perm = PERMS[hash(r.task.id) % 6]
    const labels = ['A', 'B', 'C']
    const block = perm.map((idx, p) => `--- Candidate ${labels[p]} ---\n${arms[idx]}`).join('\n\n')
    const verdicts = (await parallel(SCORERS.map((m) => () =>
      agent(
        `Score three candidate answers to a task strictly against the rubric, criterion by criterion. You do not know which system produced which — do not guess. Be a hard grader: full 0-100 range; reserve 90+ for genuinely excellent near-complete answers; competent-but-incomplete = 60-80. Score each independently.\n\nRUBRIC:\n${rubricText(r.task)}\n\n${block}\n\nTASK:\n${r.task.prompt}\n\nReturn scoreA, scoreB, scoreC (0-100 each).`,
        { model: m, effort: 'high', schema: SCORE3, label: `score:${r.task.id}:${m}`, phase: 'Score' }
      ).then((v) => ({ m, v }))
    ))).filter((x) => x && x.v)
    if (verdicts.length === 0) return null
    const sc = [[], [], []]
    const posKey = ['scoreA', 'scoreB', 'scoreC']
    for (const { v } of verdicts) { perm.forEach((idx, p) => sc[idx].push(v[posKey[p]])) }
    const mean = sc.map((a) => round1(avg(a)))
    return { id: r.task.id, baseline: mean[0], homog: mean[1], roles: mean[2], homogVsRoles: round1(mean[1] - mean[2]) }
  }
)

const rows = results.filter(Boolean)
const baseMean = round1(avg(rows.map((r) => r.baseline)))
const homogMean = round1(avg(rows.map((r) => r.homog)))
const rolesMean = round1(avg(rows.map((r) => r.roles)))
const summary = {
  n: rows.length, baseMean, homogMean, rolesMean,
  homogLift: round1(homogMean - baseMean), rolesLift: round1(rolesMean - baseMean),
  homogMinusRolesMean: round1(homogMean - rolesMean),
  headToHead: {
    homogWins: rows.filter((r) => r.homog > r.roles).length,
    rolesWins: rows.filter((r) => r.roles > r.homog).length,
    ties: rows.filter((r) => r.homog === r.roles).length,
  },
}
log(`base ${baseMean} | homog ${homogMean} (+${summary.homogLift}) | roles ${rolesMean} (+${summary.rolesLift}) | homog-roles ${summary.homogMinusRolesMean}`)
log(`head-to-head homog/roles wins: ${summary.headToHead.homogWins}/${summary.headToHead.rolesWins} (ties ${summary.headToHead.ties})`)

return { summary, rows }
