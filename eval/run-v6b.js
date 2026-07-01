// claude-ensemble eval v6b — confound re-check: does the CLEAN judge change single-vs-panel?
//
// v6 caught the max Opus judge leaking its blind-candidate scaffolding ("Candidate A/B/C",
// "verification notes") into the synthesis, which penalized BOTH panel arms vs a clean single pass.
// The judge prompt is now fixed (ensemble.js: "output ONLY a clean, self-contained answer"). v6b
// re-runs the single-vs-panel audit with that fixed judge, on the 8 KNOWLEDGE tasks (where v6's
// gap was largest: Sonnet-5 panel lost to single 2/8/6; reasoning was already an even 2/4/2).
//
// Both panels are audited vs the single pass, so we see if a clean-judge panel now ties/beats it.
// Serial (one task at a time) to stay under the server burst limit. Compare to v6's knowledge rows.

export const meta = {
  name: 'ensemble-eval-v6b',
  description: 'v6 confound re-check: clean judge, single vs Sonnet-5-panel & Opus-panel, 8 knowledge tasks, serial',
  phases: [{ title: 'Answer' }, { title: 'Audit' }],
}

const PANEL_N = 3
const AUDIT_MODEL = 'opus'
const PANELIST = 'Give your single best, complete answer to the task. Reason from first principles, state key assumptions, and commit to one answer; do not hedge.'
// FIXED judge (matches the patched ensemble.js) — clean standalone output, no leaked scaffolding.
const JUDGE = 'You are the judge of an ensemble. Below are independent candidate answers under blind labels — do not state or guess which model wrote which. Treat each as a claim to verify — run code/computations to check load-bearing technical claims where useful — and score per-criterion against the task\'s real success criteria (not tone, length, or label order), resolve contradictions explicitly, discard unsupported or fabricated claims, and synthesise ONE final answer better than any single candidate. You may override all candidates if they are all wrong. Prefer correctness over splitting the difference. Output ONLY that final answer, written as a single authoritative response to the ORIGINAL TASK as if you wrote it from scratch: do NOT reference the candidates, the labels, the comparison, or your verification process anywhere in the output (no "Candidate A/B/C", no "the answers agree/differ", no "verification notes" section). Just the clean, self-contained answer.'
const BASELINE = 'Answer this task as well as you can. First, internally verify your reasoning and check for errors, gaps, omitted requirements, and unsupported claims; then give your single best, complete, corrected answer. Output ONLY the final answer.'

const TASKS = [
  { id: 'scaling-plateau', family: 'knowledge',
    prompt: 'Synthesize the current evidence on whether LLM scaling laws have plateaued. Cover pretraining-compute scaling, data constraints, and inference-time/test-time scaling; take a defensible position and give the strongest counterargument to it.',
    rubric: ['Accurately characterizes pretraining/compute-optimal scaling (e.g. Chinchilla data-optimality)', 'Addresses the data-wall / data-constraint argument', 'Covers inference-time / test-time compute scaling as a distinct axis', 'Cites specific evidence/results accurately without fabrication', 'Takes a clear position AND steelmans the counterargument', 'Acknowledges genuine uncertainty / what would change the answer'] },
  { id: 'rag-paradigms', family: 'knowledge',
    prompt: 'Compare the main RAG paradigms — naive RAG, re-ranking, query rewriting, agentic/iterative retrieval, and graph RAG — by mechanism and failure mode, and assess where each is appropriate.',
    rubric: ['Characterizes each paradigm\'s mechanism accurately', 'Gives each a distinct, correct failure mode', 'Assesses appropriateness by task/data conditions, not just a list', 'Notes trade-offs (cost/latency/complexity vs quality)', 'No fabricated method names or citations', 'Synthesizes rather than enumerates'] },
  { id: 'build-vs-api', family: 'knowledge',
    prompt: 'A company building an LLM product must choose: fine-tune an open model, use a frontier API, or do RAG over a base model. Give the decision framework across cost, quality, latency, control, and data-moat, and the conditions that flip each choice.',
    rubric: ['Frames the decision across all five axes meaningfully', 'Correctly characterizes each option\'s strengths/weaknesses', 'Identifies the conditions that flip the decision (volume, domain-shift, data ownership, etc.)', 'Avoids a context-free single recommendation', 'Notes these are not mutually exclusive (hybrids)', 'Ties recommendation to stated assumptions'] },
  { id: 'passkey-threat', family: 'knowledge',
    prompt: 'Threat-model a "sign in with passkeys" (WebAuthn) flow for a consumer web app. Enumerate the realistic attack surfaces, which WebAuthn mitigates vs does not, and the residual risks you would still defend against.',
    rubric: ['Correctly states what WebAuthn mitigates (phishing via origin binding, credential reuse, server-side secret theft)', 'Identifies account-recovery / fallback as the primary residual attack surface', 'Covers device loss / sync-fabric (passkey provider) compromise', 'Covers registration-time and session-after-auth risks', 'Distinguishes mitigated vs residual accurately', 'Proposes concrete defenses for the residuals'] },
  { id: 'prompt-to-token', family: 'knowledge',
    prompt: 'Explain end-to-end, and mechanistically, what happens from the moment a user submits a prompt to an LLM API to the first returned token: tokenization, the prefill forward pass, the KV cache, sampling, and why time-to-first-token differs from inter-token latency.',
    rubric: ['Tokenization → token IDs → embeddings, accurately', 'Distinguishes prefill (parallel over prompt) from decode (one token at a time)', 'Explains the KV cache and why it makes decode O(1)-per-token in context', 'Explains sampling (logits → distribution → token) correctly', 'Explains TTFT (dominated by prefill over the whole prompt) vs inter-token (single-token decode)', 'Mechanistically accurate, no hand-waving'] },
  { id: 'long-context', family: 'knowledge',
    prompt: 'Assess the main approaches to long-context LLMs — larger attention windows, retrieval, recurrence/state-space models, and compression/memory — by their scaling behavior and what each sacrifices. Which is most promising, and why?',
    rubric: ['Characterizes each approach\'s mechanism and scaling cost accurately (e.g. attention O(n^2))', 'States what each sacrifices (cost, recall, exactness, training complexity)', 'Compares on scaling behavior, not just features', 'Takes a defensible position on most-promising with reasoning', 'No fabricated architectures or results', 'Acknowledges the question is unsettled'] },
  { id: 'contamination-eval', family: 'knowledge',
    prompt: 'Design an evaluation to detect whether a code-generation model has memorized a benchmark versus genuinely generalizes. Specify the methodology, the confounds, and how you would quantify contamination.',
    rubric: ['Proposes a sound methodology (held-out/perturbed variants, post-cutoff data, canaries, n-gram overlap)', 'Identifies confounds (legitimate familiarity, near-duplicates, difficulty shifts)', 'Quantifies contamination (perturbation-gap, perplexity/membership signals)', 'Distinguishes memorization from generalization operationally', 'Considers a control to validate the metric', 'Honest about what the eval cannot prove'] },
  { id: 'micro-monolith', family: 'knowledge',
    prompt: 'A mid-size SaaS is deciding whether to rebuild its monolith as microservices over 18 months. Give the decision framework, the migration failure modes, the conditions under which it is the wrong call, and what you would measure to decide.',
    rubric: ['Frames the decision around the actual problem (scaling org/teams vs scaling load)', 'Names concrete migration failure modes (distributed monolith, ops burden, data consistency)', 'States conditions where it is the WRONG call', 'Specifies what to measure to decide', 'Considers incremental alternatives (modular monolith, strangler-fig)', 'Avoids cargo-cult "microservices = better"'] },
]

const AUDIT_SCHEMA = { type: 'object', additionalProperties: false, required: ['winner', 'lengthDriven', 'reasoning'],
  properties: { winner: { type: 'string', enum: ['A', 'B', 'tie'] }, lengthDriven: { type: 'boolean' }, reasoning: { type: 'string' } } }

function words(s) { return (s || '').trim().split(/\s+/).filter(Boolean).length }
function hash(s) { return [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 1000000007, 7) }

function judge(task, drafts) {
  if (drafts.length < 2) return Promise.resolve(drafts[0] || '')
  const tags = ['A', 'B', 'C', 'D', 'E']; const off = hash(task.prompt) % drafts.length
  const lab = drafts.map((_, i) => ({ tag: tags[i], text: drafts[(i + off) % drafts.length] }))
  return agent(`${JUDGE}\n\n` + lab.map((d) => `--- Candidate ${d.tag} ---\n${d.text}`).join('\n\n') + `\n\nORIGINAL TASK:\n${task.prompt}`,
    { model: 'opus', effort: 'max', label: `judge:${task.id}`, phase: 'Answer' })
}

async function audit(task, aText, bText) {   // returns win/tie/loss for aText (the panel), both orders, serial
  const run = (x, y) => agent(
    `You are auditing two candidate answers (A and B) to the same task for GENUINE CORRECTNESS, criterion by criterion. Decide which is MORE CORRECT, or whether they TIE.\n` +
    `CRITICAL length control: a LONGER answer is NOT better unless its extra content is both correct AND required by the task; a SHORTER answer that is correct is NOT worse for being shorter. Ignore tone, fluency, formatting, and length. Act as a prosecutor (hunt for real errors and omitted REQUIRED points in each) and a defender (steelman each). Base the verdict ONLY on correctness against the success criteria.\n` +
    `Set lengthDriven=true if the main reason one looks better is length/completeness rather than correctness.\n\n` +
    `SUCCESS CRITERIA:\n${task.rubric.map((c, i) => `${i + 1}. ${c}`).join('\n')}\n\nTASK:\n${task.prompt}\n\n` +
    `--- Answer A ---\n${x}\n\n--- Answer B ---\n${y}\n\nReturn winner (A / B / tie), lengthDriven (bool), reasoning.`,
    { model: AUDIT_MODEL, effort: 'high', schema: AUDIT_SCHEMA, label: `audit:${task.id}`, phase: 'Audit' })
  const o1 = await run(aText, bText); const o2 = await run(bText, aText)
  let a = 0, b = 0, t = 0, ld = 0
  const tally = (v, aFirst) => { if (!v) return; if (v.lengthDriven) ld++; if (v.winner === 'tie') t++; else if ((v.winner === 'A') === aFirst) a++; else b++ }
  tally(o1, true); tally(o2, false)
  return { a, b, t, lengthDriven: ld, verdicts: [o1, o2] }
}

const rows = []
for (const task of TASKS) {
  const calls = [
    () => agent(`${BASELINE}\n\nTASK:\n${task.prompt}`, { model: 'opus', effort: 'max', label: `base:${task.id}`, phase: 'Answer' }),
    ...Array.from({ length: PANEL_N }, (_, i) => () => agent(`${PANELIST}\n\nTASK:\n${task.prompt}`, { model: 'sonnet', effort: 'high', label: `s${i}:${task.id}`, phase: 'Answer' })),
    ...Array.from({ length: PANEL_N }, (_, i) => () => agent(`${PANELIST}\n\nTASK:\n${task.prompt}`, { model: 'opus', effort: 'high', label: `o${i}:${task.id}`, phase: 'Answer' })),
  ]
  const out = await parallel(calls)
  const base = out[0] || ''
  const s5Panel = (await judge(task, out.slice(1, 1 + PANEL_N).filter(Boolean))) || base
  const opusPanel = (await judge(task, out.slice(1 + PANEL_N, 1 + 2 * PANEL_N).filter(Boolean))) || base
  const s5VsSingle = await audit(task, s5Panel, base)
  const opusVsSingle = await audit(task, opusPanel, base)
  rows.push({ id: task.id, family: task.family, words: { single: words(base), s5Panel: words(s5Panel), opusPanel: words(opusPanel) }, s5VsSingle, opusVsSingle })
  log(`${task.id}: S5panel vs single ${s5VsSingle.a}/${s5VsSingle.t}/${s5VsSingle.b} | Opuspanel vs single ${opusVsSingle.a}/${opusVsSingle.t}/${opusVsSingle.b}`)
}

function sum(sel) { return rows.reduce((acc, r) => { const x = sel(r); acc.panelWin += x.a; acc.singleWin += x.b; acc.tie += x.t; acc.lengthDriven += x.lengthDriven; return acc }, { panelWin: 0, singleWin: 0, tie: 0, lengthDriven: 0 }) }
const summary = { n: rows.length, s5PanelVsSingle: sum((r) => r.s5VsSingle), opusPanelVsSingle: sum((r) => r.opusVsSingle) }
log(`v6b clean-judge knowledge (n=${summary.n}): S5panel vs single win/tie/loss = ${summary.s5PanelVsSingle.panelWin}/${summary.s5PanelVsSingle.tie}/${summary.s5PanelVsSingle.singleWin}; Opuspanel vs single = ${summary.opusPanelVsSingle.panelWin}/${summary.opusPanelVsSingle.tie}/${summary.opusPanelVsSingle.singleWin}  (v6 leaky-judge S5-vs-single was 2/8/6)`)

return { summary, rows }
