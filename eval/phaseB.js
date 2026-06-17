// claude-ensemble — Phase B: does draft diversity predict the ensemble lift? (Dynamic Workflow).
//
// The gate experiment. Baseline = single Opus. Four panel arms span low->high diversity
// (homogeneous / role-diverse / effort-spread / cross-tier), each synthesized by an Opus
// `xhigh` judge. Per arm we measure draft diversity (= 100 - an LLM redundancy rating) and the
// lift over baseline, then correlate diversity with lift across all arm x task cells.
// Claude-only, latest model of each tier (aliases), no temperature, no version variation.
// Reproduce: run this workflow (no args). Output: { summary, rows, cells }. See results-phaseB.md.

export const meta = {
  name: 'phaseB-diversity',
  description: 'Diversity dials + the direct test: does measured draft-diversity predict ensemble lift? (Claude-only, latest models, no temperature)',
  phases: [{ title: 'Drafts' }, { title: 'Score' }],
}

const COMMON = 'Ground every claim; never fabricate facts, APIs, citations, or numbers. Be thorough and complete; depth and breadth matter.'
const GENERIC = 'Give your single best, complete answer to the task. State key assumptions; be thorough and complete.'
const ROLES = [
  { ins: 'Give your single best, complete first-principles answer. State key assumptions. Commit; do not hedge.' },
  { ins: 'First name the tempting-but-wrong approach in one sentence and why it fails; then give your best answer that deliberately sidesteps it, hunting edge cases and hidden assumptions.' },
  { ins: 'Solve via a deliberately DIFFERENT method than the obvious one (work backwards, a sub-case first, or a different framework). Name the method in one line, then give the complete answer.' },
]

// Arms span low -> high diversity. Every model is the LATEST of its tier (aliases); no version variation; no temperature.
const ARMS = [
  { key: 'homog', drafts: [{ m: 'sonnet', e: 'high', ins: GENERIC }, { m: 'sonnet', e: 'high', ins: GENERIC }, { m: 'sonnet', e: 'high', ins: GENERIC }] },
  { key: 'roles', drafts: ROLES.map((r) => ({ m: 'sonnet', e: 'high', ins: r.ins })) },
  { key: 'effort', drafts: ROLES.map((r, i) => ({ m: 'sonnet', e: ['low', 'high', 'xhigh'][i], ins: r.ins })) },
  { key: 'crosstier', drafts: ROLES.map((r, i) => ({ m: ['haiku', 'sonnet', 'opus'][i], e: 'high', ins: r.ins })) },
]
const ARMKEYS = ARMS.map((a) => a.key)

const TASKS = [
  { id: 'scaling-plateau', prompt: 'Synthesize the current evidence on whether LLM scaling laws have plateaued. Cover pretraining-compute scaling, data constraints, and inference-time/test-time scaling; take a defensible position and give the strongest counterargument to it.',
    rubric: ['Accurately characterizes pretraining/compute-optimal scaling', 'Addresses the data-wall argument', 'Covers inference-time/test-time compute as a distinct axis', 'Cites specific evidence without fabrication', 'Takes a position AND steelmans the counter', 'Acknowledges genuine uncertainty'] },
  { id: 'global-counter', prompt: 'Design a globally-distributed counter for ad-impression billing: ~1M increments/sec, must survive a full region failure, and must never over- or under-count. Specify the consistency model, the data path, and failure handling, and justify every trade-off.',
    rubric: ['Confronts the consistency-vs-throughput tension honestly', 'Gives a concrete workable architecture', 'Handles exactly-once / idempotency', 'Specifies region-failure recovery without loss or double-count', 'Addresses the 1M/sec throughput strategy', 'Honest about the impossibility tensions'] },
  { id: 'build-vs-api', prompt: 'A company building an LLM product must choose: fine-tune an open model, use a frontier API, or do RAG over a base model. Give the decision framework across cost, quality, latency, control, and data-moat, and the conditions that flip each choice.',
    rubric: ['Frames the decision across all five axes', 'Correctly characterizes each option', 'Identifies the conditions that flip the decision', 'Avoids a context-free single recommendation', 'Notes hybrids', 'Ties recommendation to assumptions'] },
  { id: 'contamination-eval', prompt: 'Design an evaluation to detect whether a code-generation model has memorized a benchmark versus genuinely generalizes. Specify the methodology, the confounds, and how you would quantify contamination.',
    rubric: ['Proposes a sound methodology (held-out/perturbed, post-cutoff, canaries, n-gram overlap)', 'Identifies confounds', 'Quantifies contamination', 'Distinguishes memorization from generalization operationally', 'Considers a control', 'Honest about limits'] },
  { id: 'rag-paradigms', prompt: 'Compare the main RAG paradigms — naive RAG, re-ranking, query rewriting, agentic/iterative retrieval, and graph RAG — by mechanism and failure mode, and assess where each is appropriate.',
    rubric: ['Characterizes each mechanism accurately', 'Gives each a distinct correct failure mode', 'Assesses appropriateness by conditions', 'Notes trade-offs', 'No fabricated method names', 'Synthesizes rather than lists'] },
  { id: 'micro-monolith', prompt: 'A mid-size SaaS is deciding whether to rebuild its monolith as microservices over 18 months. Give the decision framework, the migration failure modes, the conditions under which it is the wrong call, and what you would measure to decide.',
    rubric: ['Frames around the actual problem (org vs load scaling)', 'Names concrete migration failure modes', 'States conditions where it is the WRONG call', 'Specifies what to measure', 'Considers incremental alternatives', 'Avoids cargo-cult microservices'] },
]

const SIM_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: { redundancy: { type: 'number' }, note: { type: 'string' } },
  required: ['redundancy', 'note'],
}
const SCORE5 = {
  type: 'object', additionalProperties: false,
  properties: { scoreA: { type: 'number' }, scoreB: { type: 'number' }, scoreC: { type: 'number' }, scoreD: { type: 'number' }, scoreE: { type: 'number' }, reasoning: { type: 'string' } },
  required: ['scoreA', 'scoreB', 'scoreC', 'scoreD', 'scoreE', 'reasoning'],
}

const SCORERS = ['opus', 'sonnet']
function avg(a) { return a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0 }
function round1(x) { return Math.round(x * 10) / 10 }
function round2(x) { return Math.round(x * 100) / 100 }
function hash(s) { return [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 1000000007, 7) }
function rubricText(t) { return t.rubric.map((c, i) => `${i + 1}. ${c}`).join('\n') }
function pearson(xs, ys) {
  const n = xs.length; if (n < 2) return null
  const mx = avg(xs), my = avg(ys); let num = 0, dx = 0, dy = 0
  for (let i = 0; i < n; i++) { const a = xs[i] - mx, b = ys[i] - my; num += a * b; dx += a * a; dy += b * b }
  return (dx && dy) ? round2(num / Math.sqrt(dx * dy)) : null
}

function judgeAnswer(task, drafts) {
  const tags = ['A', 'B', 'C', 'D', 'E']
  const off = hash(task.prompt) % drafts.length
  const lab = drafts.map((_, i) => `--- Candidate ${tags[i]} ---\n${drafts[(i + off) % drafts.length]}`).join('\n\n')
  return agent(
    `You are the judge of an ensemble. Below are independent candidate answers under blind labels — do not guess which produced which. Treat each as a claim to verify, resolve contradictions, discard unsupported claims, and synthesise ONE final answer better than any single candidate. Lead with the final answer.\n\n${lab}\n\nORIGINAL TASK:\n${task.prompt}`,
    { model: 'opus', effort: 'xhigh', label: `judge:${task.id}`, phase: 'Drafts' })
}
function similarity(task, drafts) {
  return agent(
    `Below are ${drafts.length} independent answers to the same task. Rate their REDUNDANCY 0-100: 100 = they make essentially the same points / same approach (highly redundant); 0 = genuinely different approaches covering different ground. Judge content and approach, not length or wording.\n\n` +
    drafts.map((d, i) => `--- Answer ${i + 1} ---\n${d}`).join('\n\n') + `\n\nTASK:\n${task.prompt}`,
    { model: 'sonnet', effort: 'low', schema: SIM_SCHEMA, label: `sim:${task.id}`, phase: 'Drafts' })
}

const results = await pipeline(TASKS,
  async (task) => {
    // Batch 1: baseline + every arm's drafts, all in parallel.
    const specs = []
    ARMS.forEach((arm, ai) => arm.drafts.forEach((d, di) => specs.push({ ai, di, ...d })))
    const b1 = [() => agent(`Answer this as well as you can. Be complete and correct.\n\nTASK:\n${task.prompt}`,
      { model: 'opus', effort: 'high', label: `base:${task.id}`, phase: 'Drafts' })]
      .concat(specs.map((s) => () => agent(`${s.ins}\n\n${COMMON}\n\nTASK:\n${task.prompt}`,
        { model: s.m, effort: s.e, label: `d:${task.id}:${ARMS[s.ai].key}:${s.di}`, phase: 'Drafts' })))
    const out = await parallel(b1)
    const baseline = out[0] || ''
    const cleaned = ARMS.map(() => [])
    specs.forEach((s, i) => { const t = out[i + 1]; if (t) cleaned[s.ai].push(t) })

    // Batch 2: per arm, judge (xhigh) + similarity.
    const b2 = [], b2map = []
    ARMS.forEach((arm, ai) => {
      if (cleaned[ai].length >= 2) {
        b2.push(() => judgeAnswer(task, cleaned[ai])); b2map.push({ ai, kind: 'judge' })
        b2.push(() => similarity(task, cleaned[ai])); b2map.push({ ai, kind: 'sim' })
      }
    })
    const r2 = await parallel(b2)
    const armsData = {}
    ARMS.forEach((arm, ai) => { armsData[arm.key] = { ensemble: cleaned[ai][0] || baseline, diversity: null } })
    r2.forEach((res, i) => {
      if (!res) return
      const { ai, kind } = b2map[i]
      if (kind === 'judge') armsData[ARMS[ai].key].ensemble = res
      else armsData[ARMS[ai].key].diversity = round1(100 - res.redundancy)
    })
    return { task, baseline, arms: armsData }
  },
  async (r) => {
    if (!r) return null
    const arms = [r.baseline, ...ARMKEYS.map((k) => r.arms[k].ensemble)]
    const off = hash(r.task.id) % 5
    const labels = ['A', 'B', 'C', 'D', 'E']
    const order = arms.map((_, p) => (p + off) % 5)
    const block = order.map((idx, p) => `--- Candidate ${labels[p]} ---\n${arms[idx]}`).join('\n\n')
    const verdicts = (await parallel(SCORERS.map((m) => () =>
      agent(
        `Score five candidate answers to a task strictly against the rubric, criterion by criterion. You do not know which system produced which — do not guess. Be a hard grader: full 0-100 range; reserve 90+ for genuinely excellent near-complete answers; competent-but-incomplete = 60-80. Score each independently.\n\nRUBRIC:\n${rubricText(r.task)}\n\n${block}\n\nTASK:\n${r.task.prompt}\n\nReturn scoreA..scoreE (0-100 each).`,
        { model: m, effort: 'high', schema: SCORE5, label: `score:${r.task.id}:${m}`, phase: 'Score' }
      ).then((v) => ({ m, v }))
    ))).filter((x) => x && x.v)
    if (verdicts.length === 0) return null // all scorers failed (e.g. usage limit) — drop, don't fabricate
    const sc = [[], [], [], [], []]
    const posKey = ['scoreA', 'scoreB', 'scoreC', 'scoreD', 'scoreE']
    for (const { v } of verdicts) { order.forEach((idx, p) => sc[idx].push(v[posKey[p]])) }
    const mean = sc.map((a) => round1(avg(a)))
    const baseScore = mean[0]
    const row = { id: r.task.id, baseline: baseScore }
    ARMKEYS.forEach((k, ki) => { const idx = ki + 1; row[k] = { score: mean[idx], lift: round1(mean[idx] - baseScore), diversity: r.arms[k].diversity } })
    return row
  }
)

const rows = results.filter(Boolean)
const summary = { n: rows.length, baselineMean: round1(avg(rows.map((r) => r.baseline))), arms: {} }
ARMKEYS.forEach((k) => {
  summary.arms[k] = {
    score: round1(avg(rows.map((r) => r[k].score))),
    lift: round1(avg(rows.map((r) => r[k].lift))),
    diversity: round1(avg(rows.map((r) => r[k].diversity).filter((x) => x != null))),
  }
})
// The crux: pool every (arm, task) cell -> correlate diversity with lift.
const cells = []
rows.forEach((r) => ARMKEYS.forEach((k) => { if (r[k].diversity != null) cells.push({ arm: k, id: r.id, diversity: r[k].diversity, lift: r[k].lift }) }))
summary.diversityLiftPearson = pearson(cells.map((c) => c.diversity), cells.map((c) => c.lift))
summary.cellCount = cells.length

log(`baseline ${summary.baselineMean}`)
ARMKEYS.forEach((k) => log(`${k}: score ${summary.arms[k].score} lift ${summary.arms[k].lift} diversity ${summary.arms[k].diversity}`))
log(`diversity↔lift Pearson r = ${summary.diversityLiftPearson} (n=${summary.cellCount} cells)`)

return { summary, rows, cells }
