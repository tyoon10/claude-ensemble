// claude-ensemble — Phase A: judge-essentials ablation (Claude Code Dynamic Workflow).
//
// Question: which judge interventions actually matter? Keep the judge open; find the
// MINIMAL essentials. Hold the panel fixed (3 Sonnet drafts, generated once per task) and
// run 6 judge variants on the IDENTICAL drafts, then blind-score all six (rotated A–F,
// strict calibration) with two judges. Reproduce: run this workflow (no args).
//
// Arms: J0 control · J1 light verify-nudge · J2 show-the-rubric · J3 one self-revision pass
//       · J4 effort xhigh (prompt held) · J5 deliberately rigid 7-step procedure.
// Output: { legend, summary, rows }. See results-phaseA.md for the finding and the decision.

export const meta = {
  name: 'phaseA-judge-essentials',
  description: 'Judge-essentials ablation: 6 judge variants on IDENTICAL Sonnet drafts, blind-scored',
  phases: [{ title: 'Judges' }, { title: 'Score' }],
}

const PANEL = [
  { tag: 'drafter', instruction: 'Give your single best, complete first-principles answer. State key assumptions. Commit; do not hedge.' },
  { tag: 'adversary', instruction: 'First name the tempting-but-wrong approach in one sentence and why it fails; then give your best answer that sidesteps it, hunting edge cases and hidden assumptions.' },
  { tag: 'alt-method', instruction: 'Solve via a deliberately DIFFERENT method than the obvious one. Name the method in one line, then give the complete answer.' },
]
const COMMON = 'Ground every claim; never fabricate facts, APIs, citations, or numbers. Be thorough and complete; depth and breadth matter.'

// 8 harder, open/synthesis-leaning tasks (subset of the v2 set — where judge quality bites most).
const TASKS = [
  { id: 'scaling-plateau', prompt: 'Synthesize the current evidence on whether LLM scaling laws have plateaued. Cover pretraining-compute scaling, data constraints, and inference-time/test-time scaling; take a defensible position and give the strongest counterargument to it.',
    rubric: ['Accurately characterizes pretraining/compute-optimal scaling', 'Addresses the data-wall argument', 'Covers inference-time/test-time compute as a distinct axis', 'Cites specific evidence without fabrication', 'Takes a position AND steelmans the counter', 'Acknowledges genuine uncertainty'] },
  { id: 'global-counter', prompt: 'Design a globally-distributed counter for ad-impression billing: ~1M increments/sec, must survive a full region failure, and must never over- or under-count. Specify the consistency model, the data path, and failure handling, and justify every trade-off.',
    rubric: ['Confronts the consistency-vs-throughput tension honestly', 'Gives a concrete workable architecture', 'Handles exactly-once / idempotency', 'Specifies region-failure recovery without loss or double-count', 'Addresses the 1M/sec throughput strategy', 'Honest about the impossibility tensions'] },
  { id: 'build-vs-api', prompt: 'A company building an LLM product must choose: fine-tune an open model, use a frontier API, or do RAG over a base model. Give the decision framework across cost, quality, latency, control, and data-moat, and the conditions that flip each choice.',
    rubric: ['Frames the decision across all five axes', 'Correctly characterizes each option', 'Identifies the conditions that flip the decision', 'Avoids a context-free single recommendation', 'Notes hybrids', 'Ties recommendation to assumptions'] },
  { id: 'passkey-threat', prompt: 'Threat-model a "sign in with passkeys" (WebAuthn) flow for a consumer web app. Enumerate the realistic attack surfaces, which WebAuthn mitigates vs does not, and the residual risks you would still defend against.',
    rubric: ['States what WebAuthn mitigates (phishing via origin binding, reuse, server secret theft)', 'Identifies account-recovery/fallback as the primary residual surface', 'Covers device loss / sync-fabric compromise', 'Covers registration-time and post-auth session risks', 'Distinguishes mitigated vs residual accurately', 'Proposes concrete residual defenses'] },
  { id: 'rag-paradigms', prompt: 'Compare the main RAG paradigms — naive RAG, re-ranking, query rewriting, agentic/iterative retrieval, and graph RAG — by mechanism and failure mode, and assess where each is appropriate.',
    rubric: ['Characterizes each mechanism accurately', 'Gives each a distinct correct failure mode', 'Assesses appropriateness by conditions', 'Notes trade-offs', 'No fabricated method names', 'Synthesizes rather than lists'] },
  { id: 'long-context', prompt: 'Assess the main approaches to long-context LLMs — larger attention windows, retrieval, recurrence/state-space models, and compression/memory — by their scaling behavior and what each sacrifices. Which is most promising, and why?',
    rubric: ['Characterizes each mechanism and scaling cost accurately', 'States what each sacrifices', 'Compares on scaling behavior', 'Takes a defensible position', 'No fabricated architectures', 'Acknowledges the question is unsettled'] },
  { id: 'contamination-eval', prompt: 'Design an evaluation to detect whether a code-generation model has memorized a benchmark versus genuinely generalizes. Specify the methodology, the confounds, and how you would quantify contamination.',
    rubric: ['Proposes a sound methodology (held-out/perturbed, post-cutoff, canaries, n-gram overlap)', 'Identifies confounds', 'Quantifies contamination', 'Distinguishes memorization from generalization operationally', 'Considers a control', 'Honest about limits'] },
  { id: 'micro-monolith', prompt: 'A mid-size SaaS is deciding whether to rebuild its monolith as microservices over 18 months. Give the decision framework, the migration failure modes, the conditions under which it is the wrong call, and what you would measure to decide.',
    rubric: ['Frames around the actual problem (org vs load scaling)', 'Names concrete migration failure modes', 'States conditions where it is the WRONG call', 'Specifies what to measure', 'Considers incremental alternatives', 'Avoids cargo-cult microservices'] },
]

const SCORE6 = {
  type: 'object', additionalProperties: false,
  properties: {
    scoreA: { type: 'number' }, scoreB: { type: 'number' }, scoreC: { type: 'number' },
    scoreD: { type: 'number' }, scoreE: { type: 'number' }, scoreF: { type: 'number' },
    best: { type: 'string', enum: ['A', 'B', 'C', 'D', 'E', 'F'] },
    reasoning: { type: 'string' },
  },
  required: ['scoreA', 'scoreB', 'scoreC', 'scoreD', 'scoreE', 'scoreF', 'best', 'reasoning'],
}

const ARMS = ['J0', 'J1', 'J2', 'J3', 'J4', 'J5']
const SCORERS = ['opus', 'sonnet']
function avg(a) { return a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0 }
function round1(x) { return Math.round(x * 10) / 10 }
function hash(s) { return [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 1000000007, 7) }
function rubricText(task) { return task.rubric.map((c, i) => `${i + 1}. ${c}`).join('\n') }

const results = await pipeline(TASKS,
  // Stage 1 — drafts once, then 6 judge variants on the SAME drafts.
  async (task) => {
    const drafts = (await parallel(PANEL.map((p) => () =>
      agent(`${p.instruction}\n\n${COMMON}\n\nTASK:\n${task.prompt}`,
        { model: 'sonnet', effort: 'high', label: `draft:${task.id}:${p.tag}`, phase: 'Judges' })
    ))).filter(Boolean)
    if (drafts.length < 2) return null

    const tags = ['A', 'B', 'C', 'D', 'E']
    const off = hash(task.prompt) % drafts.length
    const dlab = drafts.map((_, i) => `--- Candidate ${tags[i]} ---\n${drafts[(i + off) % drafts.length]}`).join('\n\n')
    const tail = `\n\n${dlab}\n\nORIGINAL TASK:\n${task.prompt}`
    const base = `You are the judge of an ensemble. Below are independent candidate answers under blind labels — do not guess which produced which. Treat each as a claim to verify, resolve contradictions, discard unsupported claims, and synthesise ONE final answer better than any single candidate. Lead with the final answer.`

    const j1Prompt = `You are the judge of an ensemble. Below are independent candidate answers under blind labels — do not guess which produced which. Before synthesizing, briefly verify each candidate's key claims and discard any that are unsupported or wrong. Then synthesise ONE final answer better than any single candidate. Lead with the final answer.` + tail
    const j2Prompt = base + `\n\nJudge against these SUCCESS CRITERIA:\n${rubricText(task)}` + tail
    const j5Prompt = `You are the judge of an ensemble. Follow these steps EXACTLY and in order, then output only the final answer:\n1. List every distinct claim made across the candidates.\n2. Mark each claim supported / unsupported / contradicted.\n3. Build a comparison of the candidates across the task's criteria.\n4. Select the best-supported position for each criterion.\n5. Draft a merged outline from those selections.\n6. Write the synthesis strictly from the outline.\n7. Re-read and remove anything not traceable to a verified claim.` + tail

    const [j0, j1, j2, j4, j5] = await parallel([
      () => agent(base + tail, { model: 'opus', effort: 'high', label: `J0:${task.id}`, phase: 'Judges' }),
      () => agent(j1Prompt, { model: 'opus', effort: 'high', label: `J1:${task.id}`, phase: 'Judges' }),
      () => agent(j2Prompt, { model: 'opus', effort: 'high', label: `J2:${task.id}`, phase: 'Judges' }),
      () => agent(base + tail, { model: 'opus', effort: 'xhigh', label: `J4:${task.id}`, phase: 'Judges' }),
      () => agent(j5Prompt, { model: 'opus', effort: 'high', label: `J5:${task.id}`, phase: 'Judges' }),
    ])
    // J3 = one self-revision pass over J0's synthesis (tests "an extra round").
    const j3 = await agent(
      `Improve this draft answer to the task: fix any errors, fill gaps against the task, tighten. Output ONLY the improved final answer.\n\nDRAFT:\n${j0}\n\nTASK:\n${task.prompt}`,
      { model: 'opus', effort: 'high', label: `J3:${task.id}`, phase: 'Judges' })

    return { task, finals: { J0: j0, J1: j1, J2: j2, J3: j3, J4: j4, J5: j5 } }
  },
  // Stage 2 — blind-score all 6 finals (rotated A–F) with two judges, strict calibration.
  async (r) => {
    if (!r) return null
    const off = hash(r.task.id) % 6
    const order = ARMS.map((_, p) => (p + off) % 6) // display position p shows arm index order[p]
    const shown = order.map((armIdx) => r.finals[ARMS[armIdx]])
    const labels = ['A', 'B', 'C', 'D', 'E', 'F']
    const block = shown.map((it, p) => `--- Candidate ${labels[p]} ---\n${it}`).join('\n\n')
    const verdicts = (await parallel(SCORERS.map((m) => () =>
      agent(
        `Score six candidate answers to a task strictly against the rubric, criterion by criterion. You do not know which system produced which — do not guess. Be a hard grader: full 0-100 range; reserve 90+ for genuinely excellent, near-complete answers; competent-but-incomplete = 60-80. Score each independently.\n\nRUBRIC:\n${rubricText(r.task)}\n\n${block}\n\nTASK:\n${r.task.prompt}\n\nReturn scoreA..scoreF (0-100 each) and the single best (A-F).`,
        { model: m, effort: 'high', schema: SCORE6, label: `score:${r.task.id}:${m}`, phase: 'Score' }
      ).then((v) => ({ m, v }))
    ))).filter(Boolean)

    const armScores = {}; ARMS.forEach((a) => { armScores[a] = [] })
    const bestVotes = {}; ARMS.forEach((a) => { bestVotes[a] = 0 })
    const posKey = ['scoreA', 'scoreB', 'scoreC', 'scoreD', 'scoreE', 'scoreF']
    const posOf = { A: 0, B: 1, C: 2, D: 3, E: 4, F: 5 }
    for (const { v } of verdicts) {
      order.forEach((armIdx, p) => { armScores[ARMS[armIdx]].push(v[posKey[p]]) })
      bestVotes[ARMS[order[posOf[v.best]]]]++
    }
    const row = { id: r.task.id }
    ARMS.forEach((a) => { row[a] = round1(avg(armScores[a])) })
    row.bestVotes = bestVotes
    return row
  }
)

const rows = results.filter(Boolean)
const summary = { n: rows.length, means: {}, deltaVsJ0: {}, bestCounts: {} }
ARMS.forEach((a) => {
  summary.means[a] = round1(avg(rows.map((r) => r[a])))
  summary.bestCounts[a] = rows.reduce((s, r) => s + (r.bestVotes[a] || 0), 0)
})
ARMS.forEach((a) => { summary.deltaVsJ0[a] = round1(summary.means[a] - summary.means.J0) })
const legend = 'J0=control J1=verify-nudge J2=show-rubric J3=self-revise J4=xhigh-effort J5=rigid-multistep'
log(legend)
log(`means ${ARMS.map((a) => `${a} ${summary.means[a]}`).join(' | ')}`)
log(`Δ vs J0 ${ARMS.map((a) => `${a} ${summary.deltaVsJ0[a]}`).join(' | ')}`)

return { legend, summary, rows }
