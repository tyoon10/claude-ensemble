// claude-ensemble eval v6 — BACKFILL for the knowledge tasks that hit server rate limits in the
// first run-v6 pass. Same arms / prompts / audit as run-v6.js, but processes tasks SERIALLY
// (one task fully completed before the next, audits awaited in sequence) to keep the sustained
// request rate well under the server's burst limit. Output rows are MERGED into raw-v6.json.

export const meta = {
  name: 'ensemble-eval-v6-backfill',
  description: 'v6 backfill: the 5 rate-limited knowledge tasks, run serially to avoid the burst limit',
  phases: [{ title: 'Answer' }, { title: 'Audit' }],
}

const PANEL_N = 3
const DRAFT_EFFORT = 'high'
const JUDGE_EFFORT = 'max'
const AUDIT_MODEL = 'opus'
const RAW_GRADERS = ['opus', 'sonnet']

const PANELIST = 'Give your single best, complete answer to the task. Reason from first principles, state key assumptions, and commit to one answer; do not hedge.'
const JUDGE = 'You are the judge of an ensemble. Below are independent candidate answers under blind labels — do not state or guess which model wrote which. Treat each as a claim to verify — run code/computations to check load-bearing technical claims where useful — and score per-criterion against the task\'s real success criteria (not tone, length, or label order), resolve contradictions explicitly, discard unsupported or fabricated claims, and synthesise ONE final answer better than any single candidate. You may override all candidates if they are all wrong. Prefer correctness over splitting the difference. Lead with the final answer; do not narrate your verification process before it — put any short dissent or verification notes after the answer.'
const BASELINE = 'Answer this task as well as you can. First, internally verify your reasoning and check for errors, gaps, omitted requirements, and unsupported claims; then give your single best, complete, corrected answer. Output ONLY the final answer.'

// the 5 knowledge tasks that did not complete in the first pass (verbatim from run-v6.js)
const TASKS = [
  { id: 'build-vs-api', domain: 'analysis', family: 'knowledge',
    prompt: 'A company building an LLM product must choose: fine-tune an open model, use a frontier API, or do RAG over a base model. Give the decision framework across cost, quality, latency, control, and data-moat, and the conditions that flip each choice.',
    rubric: ['Frames the decision across all five axes meaningfully', 'Correctly characterizes each option\'s strengths/weaknesses', 'Identifies the conditions that flip the decision (volume, domain-shift, data ownership, etc.)', 'Avoids a context-free single recommendation', 'Notes these are not mutually exclusive (hybrids)', 'Ties recommendation to stated assumptions'] },
  { id: 'passkey-threat', domain: 'security', family: 'knowledge',
    prompt: 'Threat-model a "sign in with passkeys" (WebAuthn) flow for a consumer web app. Enumerate the realistic attack surfaces, which WebAuthn mitigates vs does not, and the residual risks you would still defend against.',
    rubric: ['Correctly states what WebAuthn mitigates (phishing via origin binding, credential reuse, server-side secret theft)', 'Identifies account-recovery / fallback as the primary residual attack surface', 'Covers device loss / sync-fabric (passkey provider) compromise', 'Covers registration-time and session-after-auth risks', 'Distinguishes mitigated vs residual accurately', 'Proposes concrete defenses for the residuals'] },
  { id: 'prompt-to-token', domain: 'conceptual', family: 'knowledge',
    prompt: 'Explain end-to-end, and mechanistically, what happens from the moment a user submits a prompt to an LLM API to the first returned token: tokenization, the prefill forward pass, the KV cache, sampling, and why time-to-first-token differs from inter-token latency.',
    rubric: ['Tokenization → token IDs → embeddings, accurately', 'Distinguishes prefill (parallel over prompt) from decode (one token at a time)', 'Explains the KV cache and why it makes decode O(1)-per-token in context', 'Explains sampling (logits → distribution → token) correctly', 'Explains TTFT (dominated by prefill over the whole prompt) vs inter-token (single-token decode)', 'Mechanistically accurate, no hand-waving'] },
  { id: 'long-context', domain: 'deep-research', family: 'knowledge',
    prompt: 'Assess the main approaches to long-context LLMs — larger attention windows, retrieval, recurrence/state-space models, and compression/memory — by their scaling behavior and what each sacrifices. Which is most promising, and why?',
    rubric: ['Characterizes each approach\'s mechanism and scaling cost accurately (e.g. attention O(n^2))', 'States what each sacrifices (cost, recall, exactness, training complexity)', 'Compares on scaling behavior, not just features', 'Takes a defensible position on most-promising with reasoning', 'No fabricated architectures or results', 'Acknowledges the question is unsettled'] },
  { id: 'micro-monolith', domain: 'analysis', family: 'knowledge',
    prompt: 'A mid-size SaaS is deciding whether to rebuild its monolith as microservices over 18 months. Give the decision framework, the migration failure modes, the conditions under which it is the wrong call, and what you would measure to decide.',
    rubric: ['Frames the decision around the actual problem (scaling org/teams vs scaling load)', 'Names concrete migration failure modes (distributed monolith, ops burden, data consistency)', 'States conditions where it is the WRONG call', 'Specifies what to measure to decide', 'Considers incremental alternatives (modular monolith, strangler-fig)', 'Avoids cargo-cult "microservices = better"'] },
]

const AUDIT_SCHEMA = { type: 'object', additionalProperties: false, required: ['winner', 'lengthDriven', 'reasoning'],
  properties: { winner: { type: 'string', enum: ['A', 'B', 'tie'] }, lengthDriven: { type: 'boolean' }, reasoning: { type: 'string' } } }
const RAW_SCHEMA = { type: 'object', additionalProperties: false, required: ['winner', 'reason'],
  properties: { winner: { type: 'string', enum: ['A', 'B'] }, reason: { type: 'string' } } }

function words(s) { return (s || '').trim().split(/\s+/).filter(Boolean).length }
function hash(s) { return [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 1000000007, 7) }
function round1(x) { return Math.round(x * 10) / 10 }

function judge(task, drafts) {
  if (drafts.length < 2) return Promise.resolve(drafts[0] || '')
  const tags = ['A', 'B', 'C', 'D', 'E']; const off = hash(task.prompt) % drafts.length
  const lab = drafts.map((_, i) => ({ tag: tags[i], text: drafts[(i + off) % drafts.length] }))
  return agent(`${JUDGE}\n\n` + lab.map((d) => `--- Candidate ${d.tag} ---\n${d.text}`).join('\n\n') + `\n\nORIGINAL TASK:\n${task.prompt}`,
    { model: 'opus', effort: JUDGE_EFFORT, label: `judge:${task.id}`, phase: 'Answer' })
}

async function audit(task, aText, bText) {
  const run = (x, y) => agent(
    `You are auditing two candidate answers (A and B) to the same task for GENUINE CORRECTNESS, criterion by criterion. Decide which is MORE CORRECT, or whether they TIE.\n` +
    `CRITICAL length control: a LONGER answer is NOT better unless its extra content is both correct AND required by the task; a SHORTER answer that is correct is NOT worse for being shorter. Ignore tone, fluency, formatting, and length. Act as a prosecutor (hunt for real errors and omitted REQUIRED points in each) and a defender (steelman each). Base the verdict ONLY on correctness against the success criteria.\n` +
    `Set lengthDriven=true if the main reason one looks better is length/completeness rather than correctness.\n\n` +
    `SUCCESS CRITERIA:\n${task.rubric.map((c, i) => `${i + 1}. ${c}`).join('\n')}\n\nTASK:\n${task.prompt}\n\n` +
    `--- Answer A ---\n${x}\n\n--- Answer B ---\n${y}\n\nReturn winner (A / B / tie), lengthDriven (bool), reasoning.`,
    { model: AUDIT_MODEL, effort: 'high', schema: AUDIT_SCHEMA, label: `audit:${task.id}`, phase: 'Audit' })
  const o1 = await run(aText, bText)   // serial (not parallel) to stay gentle on the rate limit
  const o2 = await run(bText, aText)
  let a = 0, b = 0, t = 0, ld = 0
  const tally = (v, aIsFirst) => { if (!v) return; if (v.lengthDriven) ld++; if (v.winner === 'tie') t++; else if ((v.winner === 'A') === aIsFirst) a++; else b++ }
  tally(o1, true); tally(o2, false)
  return { a, b, t, lengthDriven: ld, verdicts: [o1, o2] }
}

async function rawPair(task, aText, bText) {
  const run = (x, y, m) => agent(
    `Which answer is better overall for this task? Forced choice, no ties.\n\nTASK:\n${task.prompt}\n\n--- Answer A ---\n${x}\n\n--- Answer B ---\n${y}\n\nReturn winner (A or B) and a one-line reason.`,
    { model: m, effort: 'high', schema: RAW_SCHEMA, label: `raw:${task.id}:${m}`, phase: 'Audit' })
  let aWins = 0, n = 0
  for (const m of RAW_GRADERS) {
    for (const [x, y, first] of [[aText, bText, true], [bText, aText, false]]) {
      const v = await run(x, y, m)   // serial
      if (!v) continue; n++; if ((v.winner === 'A') === first) aWins++
    }
  }
  return { aWinRate: n ? round1(100 * aWins / n) : 0, n }
}

const rows = []
for (const task of TASKS) {
  // Stage 1 — Answer (7 answer calls in parallel, then the 2 judges)
  const calls = [
    () => agent(`${BASELINE}\n\nTASK:\n${task.prompt}`, { model: 'opus', effort: 'max', label: `base:${task.id}`, phase: 'Answer' }),
    ...Array.from({ length: PANEL_N }, (_, i) => () => agent(`${PANELIST}\n\nTASK:\n${task.prompt}`, { model: 'sonnet', effort: DRAFT_EFFORT, label: `s${i}:${task.id}`, phase: 'Answer' })),
    ...Array.from({ length: PANEL_N }, (_, i) => () => agent(`${PANELIST}\n\nTASK:\n${task.prompt}`, { model: 'opus', effort: DRAFT_EFFORT, label: `o${i}:${task.id}`, phase: 'Answer' })),
  ]
  const out = await parallel(calls)
  const base = out[0] || ''
  const sDrafts = out.slice(1, 1 + PANEL_N).filter(Boolean)
  const oDrafts = out.slice(1 + PANEL_N, 1 + 2 * PANEL_N).filter(Boolean)
  const sPanel = (await judge(task, sDrafts)) || sDrafts[0] || base
  const oPanel = (await judge(task, oDrafts)) || oDrafts[0] || base
  // Stage 2 — audits + raw, all SERIAL
  const sVsSingle = await audit(task, sPanel, base)
  const sVsOpus = await audit(task, sPanel, oPanel)
  const rawS = await rawPair(task, sPanel, base)
  const rawO = await rawPair(task, sPanel, oPanel)
  rows.push({
    id: task.id, domain: task.domain, family: task.family,
    words: { single: words(base), sonnet5Panel: words(sPanel), opusPanel: words(oPanel) },
    sVsSingle, sVsOpus,
    raw: { sonnet5PanelOverSingle: rawS.aWinRate, sonnet5PanelOverOpusPanel: rawO.aWinRate },
  })
  log(`backfilled ${task.id}: vsSingle ${sVsSingle.a}/${sVsSingle.t}/${sVsSingle.b}, vsOpus ${sVsOpus.a}/${sVsOpus.t}/${sVsOpus.b}`)
}

return { rows }
