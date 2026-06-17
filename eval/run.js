// claude-ensemble — A/B evaluation harness (Claude Code Dynamic Workflow).
//
// Compares two systems on a fixed task set, entirely on a Claude subscription:
//   BASELINE — one Opus pass (high effort).
//   ENSEMBLE — the claude-ensemble pipeline: 3 objective-diverse Sonnet drafts → Opus judge.
// Every task is blind-scored by TWO independent judges (Opus + Sonnet) against a rubric,
// with the two answers shown under randomized X/Y labels and provenance stripped.
//
// Reproduce:  run this workflow (no args needed — the task set is embedded below).
// Output:     { summary, rows } — per-task rubric scores (0-100) for each system + a winner.
//
// Honesty notes: n is small and these tasks only; the scorers are Claude models, so some
// same-family preference is possible (mitigated by blind labels, an explicit rubric, and a
// cross-tier scorer). This measures THIS set, not a universal benchmark.

export const meta = {
  name: 'ensemble-eval',
  description: 'A/B eval: single-Opus baseline vs the claude-ensemble pipeline, blind-scored against rubrics',
  phases: [{ title: 'Answer' }, { title: 'Score' }],
}

const PANEL = [
  { tag: 'drafter', instruction: 'Give your single best, complete first-principles answer. State key assumptions. Commit to one answer; do not hedge.' },
  { tag: 'adversary', instruction: 'First name the tempting-but-wrong approach in one sentence and why it fails; then give your best answer that deliberately sidesteps it, hunting edge cases and hidden assumptions.' },
  { tag: 'alt-method', instruction: 'Solve via a deliberately DIFFERENT method than the obvious one (work backwards, solve a sub-case first, or use a different framework). Name the method in one line, then give the complete answer.' },
]
const COMMON = 'Ground every claim; never fabricate facts, APIs, citations, or numbers. Optimize for correctness and completeness, not length.'

const TASKS = [
  { id: 'rate-limiter', domain: 'systems-design',
    prompt: 'Design a fair, concurrency-safe rate limiter for bursty multi-tenant API traffic. Specify the algorithm, the data structure, and the single most common correctness bug in naive implementations.',
    rubric: ['Chooses an appropriate algorithm (e.g. token bucket) and justifies it over alternatives', 'Addresses concurrency safety / atomicity of the read-modify-write', 'Names the check-then-act / TOCTOU race as the common bug', 'Covers multi-tenant fairness and memory bounding', 'Considers distributed/multi-node correctness'] },
  { id: 'cache-leak', domain: 'debugging',
    prompt: 'A web server caches results in a shared in-memory dict; under load it occasionally returns one user\'s data to another. The cache is read, and on miss it computes then writes. No locks. Explain the precise race and give a correct fix that does NOT serialize all requests.',
    rubric: ['Identifies the specific race (concurrent miss with interleaved compute/write, or key collision)', 'Explains why it leaks cross-user data', 'Fix preserves concurrency (per-key lock / atomic / single-flight)', 'Avoids a global lock', 'Mentions cache-stampede / single-flight correctness'] },
  { id: 'tuesday-boy', domain: 'math',
    prompt: 'You have two children. At least one is a boy born on a Tuesday. What is the probability both are boys? State your assumptions and show the calculation.',
    rubric: ['States assumptions (independence, equal sex/day priors, how the condition is interpreted)', 'Sets up the conditional correctly by counting (sex, day) outcomes', 'Arrives at 13/27 under the standard interpretation', 'Acknowledges the interpretation-dependence of the answer'] },
  { id: 'n-plus-1', domain: 'coding',
    prompt: 'An ORM endpoint loads each order, then its customer, then its line-items inside nested loops, and is slow under load. Diagnose the performance problem and rewrite the data-access strategy. Quantify why your approach is better.',
    rubric: ['Identifies the N+1 query problem and its nested compounding', 'Proposes eager loading / joins / batched IN queries', 'Quantifies the query-count reduction (O(N) → O(1)/constant)', 'Notes pagination / payload-size or indexing considerations', 'Avoids over-fetching'] },
  { id: 'raft-vs-dynamo', domain: 'systems-design',
    prompt: 'When would you choose a leader-based consensus protocol (Raft) over a leaderless quorum (Dynamo-style) for a stateful service, and when the reverse? Give the decisive factors.',
    rubric: ['Frames the consistency-vs-availability (CAP) trade-off correctly', 'Raft: strong consistency, ordered log, lower write availability under partition', 'Dynamo: high availability, eventual consistency, conflict resolution (vector clocks/CRDTs)', 'Ties the choice to concrete workload factors', 'Avoids a context-free "one is always better"'] },
  { id: 'order-by-injection', domain: 'security',
    prompt: 'Review this pattern: a web app builds a query by string-formatting a user-supplied "sort" parameter into "ORDER BY {sort}", and escapes single quotes to prevent injection. Is it safe? Explain and give the correct approach.',
    rubric: ['Recognizes that escaping quotes does NOT secure an ORDER BY identifier context', 'Explains injection is still possible (no quotes needed; subqueries/CASE)', 'Correct fix: an allowlist of sortable columns, not escaping', 'Notes that parameterization does not apply to identifiers', 'Mentions least-privilege / defense in depth'] },
  { id: 'ship-now', domain: 'analysis',
    prompt: 'A team must choose between shipping a feature now at 70% confidence it is correct, or spending two more weeks to reach 95% confidence, in a competitive market. Lay out the decision framework and what additional information would change the answer.',
    rubric: ['Frames expected value / cost-of-delay vs cost-of-error', 'Identifies reversibility of the error as decisive', 'Considers competitive / market timing', 'Names the specific information that would flip the decision', 'Avoids a context-free "just ship" or "just wait"'] },
  { id: 'three-boxes', domain: 'reasoning',
    prompt: 'Three boxes are labeled "Apples", "Oranges", and "Apples & Oranges". Every label is wrong. You may draw one fruit from one box without looking inside. How do you correctly label all three, and why does a single draw suffice?',
    rubric: ['Draws from the box labeled "Apples & Oranges"', 'Explains that box must be single-fruit (its label is wrong), so the draw reveals its true contents', 'Correctly propagates the other two by elimination given all labels are wrong', 'Explains why one draw suffices (the all-wrong constraint chains)'] },
  { id: 'custom-fields', domain: 'data-modeling',
    prompt: 'Design a relational schema for a multi-tenant SaaS where each tenant can define custom fields on a "Contact" entity. Compare at least two approaches and recommend one with trade-offs.',
    rubric: ['Presents >=2 approaches (EAV, JSONB column, per-tenant columns/tables)', 'Gives correct trade-offs (queryability, indexing, integrity, migration cost)', 'Addresses tenant isolation', 'Makes a defensible recommendation tied to assumptions', 'Notes indexing/performance of the chosen approach (e.g. JSONB GIN)'] },
  { id: 'heavy-hitters', domain: 'coding',
    prompt: 'In a stream of integers too large to store, find the k most frequent items with bounded memory. Describe an approach, its accuracy guarantees, and its limitations.',
    rubric: ['Identifies it as a heavy-hitters / frequency-estimation problem', 'Proposes a sound approach (Count-Min Sketch + heap, or Space-Saving / Misra-Gries)', 'States the accuracy guarantee or approximate nature', 'Bounds memory explicitly', 'Notes limitations (overestimation, lack of exactness)'] },
  { id: 'hallucination-survey', domain: 'deep-research',
    prompt: 'Synthesize the main approaches to reducing hallucination in LLMs, group them by mechanism, and assess which are most effective and why. Characterize the categories accurately.',
    rubric: ['Groups by mechanism (retrieval grounding/RAG, decoding/verification, training/RLHF-RLAIF, self-consistency/ensembling, abstention/calibration)', 'Characterizes each category accurately', 'Assesses effectiveness with reasoning, not just a list', 'Notes trade-offs / no silver bullet', 'Avoids fabricated citations or invented method names'] },
  { id: 'float-compare', domain: 'conceptual',
    prompt: 'Explain why 0.1 + 0.2 != 0.3 in most languages, what the result actually is, and the correct way to compare floats. Be precise about the mechanism.',
    rubric: ['Explains binary floating-point cannot represent 0.1/0.2/0.3 exactly', 'Identifies the result (~0.30000000000000004 / slightly above 0.3)', 'Mechanism: IEEE-754 double rounding of the sum', 'Correct comparison: epsilon / relative tolerance, not ==', 'Precise about base-2 vs base-10 fractions'] },
]

const SCORE_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    scoreX: { type: 'number' },
    scoreY: { type: 'number' },
    winner: { type: 'string', enum: ['X', 'Y', 'tie'] },
    reasoning: { type: 'string' },
  },
  required: ['scoreX', 'scoreY', 'winner', 'reasoning'],
}

const SCORERS = ['opus', 'sonnet']
function avg(a) { return a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0 }
function round1(x) { return Math.round(x * 10) / 10 }
function hash(s) { return [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 1000000007, 7) }

const results = await pipeline(TASKS,
  // Stage 1 — both systems answer the task (baseline + 3 panel drafts in one parallel batch, then judge).
  async (task) => {
    const calls = [
      () => agent(`Answer this as well as you can. Be complete and correct.\n\nTASK:\n${task.prompt}`,
        { model: 'opus', effort: 'high', label: `base:${task.id}`, phase: 'Answer' }),
      ...PANEL.map((p) => () => agent(`${p.instruction}\n\n${COMMON}\n\nTASK:\n${task.prompt}`,
        { model: 'sonnet', effort: 'high', label: `ens:${task.id}:${p.tag}`, phase: 'Answer' })),
    ]
    const out = await parallel(calls)
    const base = out[0] || ''
    const drafts = out.slice(1).filter(Boolean)
    let ens
    if (drafts.length >= 2) {
      const tags = ['A', 'B', 'C', 'D', 'E']
      const off = hash(task.prompt) % drafts.length
      const lab = drafts.map((_, i) => ({ tag: tags[i], text: drafts[(i + off) % drafts.length] }))
      ens = await agent(
        `You are the judge of an ensemble. Below are independent candidate answers under blind labels — do not guess which produced which. Verify each, resolve contradictions, discard unsupported claims, and synthesise ONE final answer better than any single candidate. Lead with the answer.\n\n` +
        lab.map((d) => `--- Candidate ${d.tag} ---\n${d.text}`).join('\n\n') +
        `\n\nORIGINAL TASK:\n${task.prompt}`,
        { model: 'opus', effort: 'high', label: `ens:${task.id}:judge`, phase: 'Answer' })
    } else {
      ens = drafts[0] || base
    }
    return { task, base, ens }
  },
  // Stage 2 — two blind judges score both answers against the rubric (randomized X/Y order).
  async (r) => {
    if (!r) return null
    const flip = (hash(r.task.id) % 2) === 1 // per-task: is the ensemble shown as X?
    const X = flip ? r.ens : r.base
    const Y = flip ? r.base : r.ens
    const verdicts = (await parallel(SCORERS.map((m) => () =>
      agent(
        `Score two candidate answers to a task strictly against the rubric, criterion by criterion. Be objective; do not reward length, tone, or confidence. You do not know which system produced which — do not guess.\n\nRUBRIC (rate adherence to each criterion, then give a 0-100 total per candidate):\n${r.task.rubric.map((c, i) => `${i + 1}. ${c}`).join('\n')}\n\n--- Candidate X ---\n${X}\n\n--- Candidate Y ---\n${Y}\n\nTASK:\n${r.task.prompt}\n\nReturn scoreX and scoreY (0-100 each) and the winner (X / Y / tie).`,
        { model: m, effort: 'high', schema: SCORE_SCHEMA, label: `score:${r.task.id}:${m}`, phase: 'Score' }
      ).then((v) => ({ m, v }))
    ))).filter(Boolean)

    const ensScores = [], baseScores = [], wins = []
    for (const { v } of verdicts) {
      ensScores.push(flip ? v.scoreX : v.scoreY)
      baseScores.push(flip ? v.scoreY : v.scoreX)
      wins.push(v.winner === 'tie' ? 'tie' : (v.winner === 'X' ? (flip ? 'ensemble' : 'baseline') : (flip ? 'baseline' : 'ensemble')))
    }
    const ensAvg = avg(ensScores), baseAvg = avg(baseScores)
    const tally = { ensemble: 0, baseline: 0, tie: 0 }
    wins.forEach((w) => { tally[w]++ })
    let winner = 'tie'
    if (tally.ensemble > tally.baseline) winner = 'ensemble'
    else if (tally.baseline > tally.ensemble) winner = 'baseline'
    return { id: r.task.id, domain: r.task.domain, ensAvg: round1(ensAvg), baseAvg: round1(baseAvg), delta: round1(ensAvg - baseAvg), winner, wins }
  }
)

const rows = results.filter(Boolean)
const summary = {
  n: rows.length,
  ensMean: round1(avg(rows.map((r) => r.ensAvg))),
  baseMean: round1(avg(rows.map((r) => r.baseAvg))),
  ensembleWins: rows.filter((r) => r.winner === 'ensemble').length,
  baselineWins: rows.filter((r) => r.winner === 'baseline').length,
  ties: rows.filter((r) => r.winner === 'tie').length,
}
summary.meanDelta = round1(summary.ensMean - summary.baseMean)
log(`ensemble ${summary.ensMean} vs baseline ${summary.baseMean} (Δ${summary.meanDelta}); W/T/L ensemble ${summary.ensembleWins}/${summary.ties}/${summary.baselineWins}`)

return { summary, rows }
