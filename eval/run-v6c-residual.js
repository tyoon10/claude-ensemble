// claude-ensemble eval v6c — residual-edge probe (plan #6): does the Opus panel keep a real edge on
// hard CHECKABLE tasks even though it ties the Sonnet-5 panel on the general set?
//
// v6/v6b compared panels by pairwise correctness (they tied). This probe uses a length-independent
// metric instead: run the kit's prosecutorial verifier (the one the verify-loop uses) on EACH panel's
// clean-judge answer and count CONFIRMED defects. Sonnet 5 trails Opus most on hard agentic/reasoning
// benchmarks, so if the Opus panel leaves fewer real defects on hard checkable tasks, that argues for
// GATE-ROUTING the hardest checkable work to an Opus panel rather than a flat Sonnet-5 default.
//
// Arms (both with the FIXED clean judge): Sonnet-5 panel, Opus panel. Metric: confirmed-defect count
// (lower = better), per task + aggregate. Serial (rate-limit-safe). Tasks: the checkable/reasoning
// subset of the canonical set (systems / debugging / proofs / probability).

export const meta = {
  name: 'ensemble-eval-v6c-residual',
  description: 'residual-edge probe: Sonnet-5 vs Opus panel confirmed-defect count on hard checkable tasks',
  phases: [{ title: 'Answer' }, { title: 'Verify' }],
}

const PANEL_N = 3
const PANELIST = 'Give your single best, complete answer to the task. Reason from first principles, state key assumptions, and commit to one answer; do not hedge.'
const JUDGE = 'You are the judge of an ensemble. Below are independent candidate answers under blind labels — do not state or guess which model wrote which. Treat each as a claim to verify — run code/computations to check load-bearing technical claims where useful — and score per-criterion against the task\'s real success criteria (not tone, length, or label order), resolve contradictions explicitly, discard unsupported or fabricated claims, and synthesise ONE final answer better than any single candidate. You may override all candidates if they are all wrong. Prefer correctness over splitting the difference. Output ONLY that final answer, written as a single authoritative response to the ORIGINAL TASK as if you wrote it from scratch: do NOT reference the candidates, the labels, the comparison, or your verification process anywhere in the output (no "Candidate A/B/C", no "the answers agree/differ", no "verification notes" section). Just the clean, self-contained answer.'
const VERIFY = 'You are a harsh adversarial verifier. ASSUME the answer below has defects and hunt for them by RUNNING code, computations, or checks against the task\'s explicit success criteria. Flag ONLY concrete, VERIFIABLE defects you can actually confirm — real factual/technical errors, wrong or unsupported claims, mishandled edge cases, or violations of the task\'s stated requirements — confirmed by execution/computation or a clear criterion. Do NOT flag subjective, stylistic, or judgment/opinion issues, and do NOT invent defects. Set clean=true if, after genuinely checking, you find no verifiable defects. List every verified defect otherwise.'

const VERIFY_SCHEMA = { type: 'object', additionalProperties: false, required: ['clean', 'defects'],
  properties: { clean: { type: 'boolean' }, defects: { type: 'array', items: { type: 'string' } } } }

const TASKS = [
  { id: 'global-counter',
    prompt: 'Design a globally-distributed counter for ad-impression billing: ~1M increments/sec, must survive a full region failure, and must never over- or under-count. Specify the consistency model, the data path, and failure handling, and justify every trade-off.' },
  { id: 'exactly-once',
    prompt: 'A distributed job queue occasionally processes the same job twice despite an "exactly-once" claim. Enumerate the distinct mechanisms that could cause this; for each give the detection signal and the fix. Which is most likely, and why?' },
  { id: 'sort-lower-bound',
    prompt: 'Prove that any comparison-based sort of n elements requires Omega(n log n) comparisons in the worst case. Then explain precisely why radix sort does not violate this bound.' },
  { id: 'coupon-collector',
    prompt: 'Derive the expected number of DISTINCT coupons collected after k draws (with replacement) from n equally-likely coupons, and give its asymptotics. Then state and explain the expected time to collect ALL n coupons.' },
]

function hash(s) { return [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 1000000007, 7) }

function judge(task, drafts) {
  if (drafts.length < 2) return Promise.resolve(drafts[0] || '')
  const tags = ['A', 'B', 'C', 'D', 'E']; const off = hash(task.prompt) % drafts.length
  const lab = drafts.map((_, i) => ({ tag: tags[i], text: drafts[(i + off) % drafts.length] }))
  return agent(`${JUDGE}\n\n` + lab.map((d) => `--- Candidate ${d.tag} ---\n${d.text}`).join('\n\n') + `\n\nORIGINAL TASK:\n${task.prompt}`,
    { model: 'opus', effort: 'max', label: `judge:${task.id}`, phase: 'Answer' })
}
function verify(task, answer) {
  return agent(`${VERIFY}\n\nORIGINAL TASK:\n${task.prompt}\n\nANSWER:\n${answer}`,
    { model: 'opus', effort: 'high', schema: VERIFY_SCHEMA, label: `verify:${task.id}`, phase: 'Verify' })
}

const rows = []
for (const task of TASKS) {
  const out = await parallel(Array.from({ length: 2 * PANEL_N }, (_, i) => () =>
    agent(`${PANELIST}\n\nTASK:\n${task.prompt}`, { model: i < PANEL_N ? 'sonnet' : 'opus', effort: 'high', label: `${i < PANEL_N ? 's' : 'o'}${i % PANEL_N}:${task.id}`, phase: 'Answer' })))
  const s5Panel = (await judge(task, out.slice(0, PANEL_N).filter(Boolean))) || ''
  const opusPanel = (await judge(task, out.slice(PANEL_N).filter(Boolean))) || ''
  const s5V = await verify(task, s5Panel)
  const opusV = await verify(task, opusPanel)
  const row = {
    id: task.id,
    sonnet5: { clean: !!(s5V && s5V.clean), defectCount: s5V ? s5V.defects.length : null, defects: s5V ? s5V.defects : [] },
    opus: { clean: !!(opusV && opusV.clean), defectCount: opusV ? opusV.defects.length : null, defects: opusV ? opusV.defects : [] },
  }
  rows.push(row)
  log(`${task.id}: Sonnet-5 panel defects=${row.sonnet5.defectCount} | Opus panel defects=${row.opus.defectCount}`)
}

const s5Total = rows.reduce((s, r) => s + (r.sonnet5.defectCount || 0), 0)
const opusTotal = rows.reduce((s, r) => s + (r.opus.defectCount || 0), 0)
const opusFewer = rows.filter((r) => (r.opus.defectCount || 0) < (r.sonnet5.defectCount || 0)).length
const s5Fewer = rows.filter((r) => (r.sonnet5.defectCount || 0) < (r.opus.defectCount || 0)).length
const summary = { n: rows.length, sonnet5Defects: s5Total, opusDefects: opusTotal, tasksOpusFewerDefects: opusFewer, tasksSonnet5FewerDefects: s5Fewer }
log(`v6c residual-edge (n=${summary.n}): total confirmed defects — Sonnet-5 panel ${s5Total}, Opus panel ${opusTotal}; Opus fewer on ${opusFewer}, Sonnet-5 fewer on ${s5Fewer}. Opus edge here => gate-route hard checkable to Opus panel.`)

return { summary, rows }
