// claude-ensemble eval v7 — judge/verifier tier swaps + the cheap+deep loop question.
//
// Two questions:
//  (J) On the SAME fixed Sonnet-5 panel drafts, does a max Sonnet-5 JUDGE synthesise as correctly as
//      a max Opus judge? (the judge fires on every complex run — the biggest recurring cost.)
//  (D) Cheap+deep vs expensive+shallow: a Sonnet-5 judge + Sonnet-5 verify-loop @ cap 5 vs an Opus
//      judge + Opus verify-loop @ cap 3, on checkable tasks — does more (cheap) depth match fewer
//      (pricey) rounds? Compared by final CONFIRMED-defect count + rounds used (a cost proxy).
//
// GRADING: tries Fable 5 FIRST (the user's priority grader), then Opus, then Sonnet 5 — each grader
// that resolves votes; unavailable ones (Fable is currently blocked on this account) are skipped and
// reported. FULL answer texts are persisted to raw-v7.json so a Fable re-grade is cheap once Fable is
// callable (no re-generation). Every judge-pair audit is length-controlled, both answer orders.
//
// Task set: 3 open-ended/divergent + 3 checkable (so Fable can later grade the divergent ones too, per
// the ask). Serial (rate-limit-safe). Subscription-only.

export const meta = {
  name: 'ensemble-eval-v7-judge-verify',
  description: 'judge/verifier Sonnet-5-vs-Opus swaps + cheap+deep loop; Fable-primary grading with Opus/Sonnet fallback',
  phases: [{ title: 'Answer' }, { title: 'Loop' }, { title: 'Grade' }],
}

const PANEL_N = 3
const GRADERS = ['claude-fable-5', 'opus', 'sonnet']  // Fable primary (user priority); falls back if unavailable
const OPUS_CAP = 3    // shipped verify-loop depth
const SONNET_CAP = 5  // cheap + deeper

const PANELIST = 'Give your single best, complete answer to the task. Reason from first principles, state key assumptions, and commit to one answer; do not hedge.'
const JUDGE = 'You are the judge of an ensemble. Below are independent candidate answers under blind labels — do not state or guess which model wrote which. Treat each as a claim to verify — run code/computations to check load-bearing technical claims where useful — and score per-criterion against the task\'s real success criteria (not tone, length, or label order), resolve contradictions explicitly, discard unsupported or fabricated claims, and synthesise ONE final answer better than any single candidate. You may override all candidates if they are all wrong. Prefer correctness over splitting the difference. Output ONLY that final answer, written as a single authoritative response to the ORIGINAL TASK as if you wrote it from scratch: do NOT reference the candidates, the labels, the comparison, or your verification process anywhere in the output (no "Candidate A/B/C", no "verification notes"). Just the clean, self-contained answer.'
const VERIFY = 'You are a harsh adversarial verifier. ASSUME the answer below has defects and hunt for them by RUNNING code, computations, or checks against the task\'s explicit success criteria. Flag ONLY concrete, VERIFIABLE defects you can actually confirm — real factual/technical errors, wrong or unsupported claims, mishandled edge cases, or violations of the task\'s stated requirements — confirmed by execution/computation or a clear criterion. Do NOT flag subjective/stylistic/opinion issues, and do NOT invent defects. Set clean=true if, after genuinely checking, you find no verifiable defects. List every verified defect otherwise.'
const REVISE = 'Correct the answer below to fix the listed checked defects while preserving everything already correct; do not pad or add unrelated content. Output ONLY the corrected final answer.'

const VERIFY_SCHEMA = { type: 'object', additionalProperties: false, required: ['clean', 'defects'],
  properties: { clean: { type: 'boolean' }, defects: { type: 'array', items: { type: 'string' } } } }
const AUDIT_SCHEMA = { type: 'object', additionalProperties: false, required: ['winner', 'lengthDriven', 'reasoning'],
  properties: { winner: { type: 'string', enum: ['A', 'B', 'tie'] }, lengthDriven: { type: 'boolean' }, reasoning: { type: 'string' } } }

const TASKS = [
  { id: 'scaling-plateau', family: 'open-ended',
    prompt: 'Synthesize the current evidence on whether LLM scaling laws have plateaued. Cover pretraining-compute scaling, data constraints, and inference-time/test-time scaling; take a defensible position and give the strongest counterargument to it.',
    rubric: ['Characterizes compute-optimal (Chinchilla) scaling', 'Addresses the data wall', 'Covers test-time compute as a distinct axis', 'Cites specific evidence without fabrication', 'Clear position + steelman', 'Acknowledges uncertainty'] },
  { id: 'build-vs-api', family: 'open-ended',
    prompt: 'A company building an LLM product must choose: fine-tune an open model, use a frontier API, or do RAG over a base model. Give the decision framework across cost, quality, latency, control, and data-moat, and the conditions that flip each choice.',
    rubric: ['Frames all five axes', 'Characterizes each option correctly', 'Identifies flip conditions', 'No context-free single rec', 'Notes hybrids', 'Ties rec to assumptions'] },
  { id: 'micro-monolith', family: 'open-ended',
    prompt: 'A mid-size SaaS is deciding whether to rebuild its monolith as microservices over 18 months. Give the decision framework, the migration failure modes, the conditions under which it is the wrong call, and what you would measure to decide.',
    rubric: ['Frames the real problem (org vs load scaling)', 'Concrete migration failure modes', 'When it is the WRONG call', 'What to measure', 'Incremental alternatives', 'No cargo-cult'] },
  { id: 'global-counter', family: 'checkable',
    prompt: 'Design a globally-distributed counter for ad-impression billing: ~1M increments/sec, must survive a full region failure, and must never over- or under-count. Specify the consistency model, the data path, and failure handling, and justify every trade-off.',
    rubric: ['Confronts consistency vs throughput', 'Concrete workable architecture', 'Exactly-once / idempotency', 'Region-failure recovery without loss/double-count', '1M/sec throughput strategy', 'Honest about impossibility tensions'] },
  { id: 'exactly-once', family: 'checkable',
    prompt: 'A distributed job queue occasionally processes the same job twice despite an "exactly-once" claim. Enumerate the distinct mechanisms that could cause this; for each give the detection signal and the fix. Which is most likely, and why?',
    rubric: ['At-least-once + non-idempotent handler', 'Visibility-timeout / lease expiry', 'Crash after work before ack', 'Missing dedup/fencing/idempotency key', 'Detection + fix per mechanism', 'Ranks likelihood'] },
  { id: 'sort-lower-bound', family: 'checkable',
    prompt: 'Prove that any comparison-based sort of n elements requires Omega(n log n) comparisons in the worst case. Then explain precisely why radix sort does not violate this bound.',
    rubric: ['Decision-tree model', 'n! leaves required', 'height >= log2(n!) = Omega(n log n)', 'Radix is not comparison-based', 'Radix complexity outside the comparison model'] },
]

function hash(s) { return [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 1000000007, 7) }

function judge(task, drafts, model) {
  if (drafts.length < 2) return Promise.resolve(drafts[0] || '')
  const tags = ['A', 'B', 'C', 'D', 'E']; const off = hash(task.prompt) % drafts.length
  const lab = drafts.map((_, i) => ({ tag: tags[i], text: drafts[(i + off) % drafts.length] }))
  return agent(`${JUDGE}\n\n` + lab.map((d) => `--- Candidate ${d.tag} ---\n${d.text}`).join('\n\n') + `\n\nORIGINAL TASK:\n${task.prompt}`,
    { model, effort: 'max', label: `judge:${model}:${task.id}`, phase: 'Answer' })
}

// verify -> (if defects) revise -> repeat, up to cap. Returns {final, rounds, finalDefects, cleanAt}.
async function verifyLoop(task, answer, model, cap) {
  let cur = answer, rounds = 0, finalDefects = null, cleanAt = null
  for (let k = 0; k < cap; k++) {
    const v = await agent(`${VERIFY}\n\nORIGINAL TASK:\n${task.prompt}\n\nANSWER:\n${cur}`,
      { model, effort: 'high', schema: VERIFY_SCHEMA, label: `verify:${model}:${task.id}:${k + 1}`, phase: 'Loop' })
    rounds++
    if (!v || v.clean || !v.defects.length) { finalDefects = v ? v.defects.length : null; cleanAt = v && v.clean ? rounds : cleanAt; break }
    finalDefects = v.defects.length
    const rev = await agent(`${REVISE}\n\nORIGINAL TASK:\n${task.prompt}\n\nDEFECTS TO FIX:\n${v.defects.map((d, i) => `${i + 1}. ${d}`).join('\n')}\n\nANSWER:\n${cur}`,
      { model, effort: 'high', label: `revise:${model}:${task.id}:${k + 1}`, phase: 'Loop' })
    if (rev) cur = rev
  }
  return { final: cur, rounds, finalDefects, cleanAt }
}

// neutral final-defect grade (Fable primary, falls back) — a fair, SAME-grader count on each final answer.
async function neutralDefects(task, answer) {
  for (const g of GRADERS) {
    const v = await agent(`${VERIFY}\n\nORIGINAL TASK:\n${task.prompt}\n\nANSWER:\n${answer}`,
      { model: g, effort: 'high', schema: VERIFY_SCHEMA, label: `neutral:${g}:${task.id}`, phase: 'Grade' })
    if (v) return { grader: g.replace('claude-fable-5', 'fable'), clean: v.clean, defects: v.defects.length }
  }
  return { grader: null, clean: null, defects: null }
}

// length-controlled correctness audit of a pair, per grader, both orders. Fable-first; skips unavailable graders.
async function audit(task, aText, bText) {
  const prompt = (x, y) =>
    `Audit two candidate answers (A and B) to the same task for GENUINE CORRECTNESS. Decide which is MORE CORRECT, or a TIE.\n` +
    `Length control: a LONGER answer is NOT better unless the extra content is correct AND required; a shorter correct answer is not worse. Ignore tone/fluency/length. Prosecute (hunt real errors + omitted required points) and defend (steelman) each.\n` +
    `Set lengthDriven=true if length/completeness is the main reason one looks better.\n\nSUCCESS CRITERIA:\n${task.rubric.map((c, i) => `${i + 1}. ${c}`).join('\n')}\n\nTASK:\n${task.prompt}\n\n--- Answer A ---\n${x}\n\n--- Answer B ---\n${y}\n\nReturn winner (A/B/tie), lengthDriven, reasoning.`
  const out = {}
  for (const g of GRADERS) {
    const o1 = await agent(prompt(aText, bText), { model: g, effort: 'high', schema: AUDIT_SCHEMA, label: `audit:${g}:${task.id}:1`, phase: 'Grade' })
    const o2 = await agent(prompt(bText, aText), { model: g, effort: 'high', schema: AUDIT_SCHEMA, label: `audit:${g}:${task.id}:2`, phase: 'Grade' })
    if (!o1 && !o2) { out[g] = { available: false }; continue }
    let a = 0, b = 0, t = 0, ld = 0
    const tally = (v, aFirst) => { if (!v) return; if (v.lengthDriven) ld++; if (v.winner === 'tie') t++; else if ((v.winner === 'A') === aFirst) a++; else b++ }
    tally(o1, true); tally(o2, false)
    out[g] = { available: true, aWin: a, bWin: b, tie: t, lengthDriven: ld }  // a = first arg (opus-judge), b = second (sonnet-judge)
  }
  return out
}

const rows = []
for (const task of TASKS) {
  // fixed Sonnet-5 panel drafts (shared by both judges)
  const drafts = (await parallel(Array.from({ length: PANEL_N }, (_, i) => () =>
    agent(`${PANELIST}\n\nTASK:\n${task.prompt}`, { model: 'sonnet', effort: 'high', label: `draft${i}:${task.id}`, phase: 'Answer' })))).filter(Boolean)
  const opusJ = (await judge(task, drafts, 'opus')) || ''
  const sonJ = (await judge(task, drafts, 'sonnet')) || ''
  // (J) judge-swap audit: opus-judge (A) vs sonnet-judge (B)
  const judgeAudit = await audit(task, opusJ, sonJ)
  const row = { id: task.id, family: task.family, answers: { opusJudge: opusJ, sonnetJudge: sonJ }, judgeAudit }
  // (D) cheap+deep, checkable only
  if (task.family === 'checkable') {
    const opusStd = await verifyLoop(task, opusJ, 'opus', OPUS_CAP)
    const sonDeep = await verifyLoop(task, sonJ, 'sonnet', SONNET_CAP)
    // fair, SAME-grader final-defect count on both finals (Fable primary)
    const opusStdND = await neutralDefects(task, opusStd.final)
    const sonDeepND = await neutralDefects(task, sonDeep.final)
    row.answers.opusStd = opusStd.final
    row.answers.sonnetDeep = sonDeep.final
    row.loop = {
      opusStd: { rounds: opusStd.rounds, ownDefects: opusStd.finalDefects, neutral: opusStdND },
      sonnetDeep: { rounds: sonDeep.rounds, ownDefects: sonDeep.finalDefects, neutral: sonDeepND },
    }
    log(`${task.id} [D] opus-std ${opusStd.rounds}r neutralDefects=${opusStdND.defects} | sonnet-deep ${sonDeep.rounds}r neutralDefects=${sonDeepND.defects} (grader ${opusStdND.grader})`)
  }
  const g = judgeAudit
  const gsum = GRADERS.map((x) => g[x] && g[x].available ? `${x.replace('claude-fable-5', 'fable')}:opusJ${g[x].aWin}/tie${g[x].tie}/sonJ${g[x].bWin}` : `${x.replace('claude-fable-5', 'fable')}:NA`).join(' ')
  log(`${task.id} [J] ${gsum}`)
  rows.push(row)
}

// aggregate the judge swap per grader (opus-judge win / tie / sonnet-judge win)
function aggGrader(g) {
  const set = rows.filter((r) => r.judgeAudit[g] && r.judgeAudit[g].available)
  if (!set.length) return { available: false }
  return { available: true, n: set.length,
    opusJudgeWin: set.reduce((s, r) => s + r.judgeAudit[g].aWin, 0),
    sonnetJudgeWin: set.reduce((s, r) => s + r.judgeAudit[g].bWin, 0),
    tie: set.reduce((s, r) => s + r.judgeAudit[g].tie, 0),
    lengthDriven: set.reduce((s, r) => s + r.judgeAudit[g].lengthDriven, 0) }
}
const cheapDeep = rows.filter((r) => r.loop).map((r) => ({ id: r.id, grader: r.loop.opusStd.neutral.grader,
  opusStdDefects: r.loop.opusStd.neutral.defects, opusOwnDefects: r.loop.opusStd.ownDefects, opusRounds: r.loop.opusStd.rounds,
  sonnetDeepDefects: r.loop.sonnetDeep.neutral.defects, sonnetOwnDefects: r.loop.sonnetDeep.ownDefects, sonnetRounds: r.loop.sonnetDeep.rounds }))
const summary = {
  judgeSwapByGrader: Object.fromEntries(GRADERS.map((g) => [g.replace('claude-fable-5', 'fable'), aggGrader(g)])),
  cheapDeep,
  fableAvailable: !!(rows[0] && rows[0].judgeAudit['claude-fable-5'] && rows[0].judgeAudit['claude-fable-5'].available),
}
log(`v7 done. Fable available: ${summary.fableAvailable}. Judge-swap (opus-judge/tie/sonnet-judge) per grader: ` +
  GRADERS.map((g) => { const a = summary.judgeSwapByGrader[g.replace('claude-fable-5', 'fable')]; return a.available ? `${g.replace('claude-fable-5', 'fable')} ${a.opusJudgeWin}/${a.tie}/${a.sonnetJudgeWin}` : `${g.replace('claude-fable-5', 'fable')} NA` }).join(' | '))

return { summary, rows }
