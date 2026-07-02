// claude-ensemble eval v8 — P1: Fable + Opus SOLVE traces on hard checkable tasks.
//
// Purpose: generate behavioral traces (tool calls, code run, revisions) of Fable vs Opus solving
// the same hard tasks, to mine in P2 against the P0 taxonomy — does Fable's SOLVE trace exhibit the
// mechanism-tracing + small-case-testing it shows when it GRADES, and does Opus already do it?
//
// Controls: IDENTICAL minimal, NEUTRAL prompt for both models (no "check your work" — that would
// scaffold the behavior under test); MATCHED effort (high) for both (no Fable-high-vs-Opus-max
// confound); tools available to both (agentType general-purpose). Serial, subscription-only.
//
// Attribution: the answer TEXT is persisted per (task, model, sample); P2 maps each on-disk
// transcript to a solve by matching its final answer text (no model field needed in the transcript).
//
// args: { smoke: true } runs 1 task x 2 models x 1 sample (preflight). Otherwise 3 tasks x 2 x 2.

export const meta = {
  name: 'ensemble-eval-v8-p1-solve',
  description: 'v8 P1: Fable + Opus solve traces on hard checkable tasks (matched effort, tools, minimal prompt)',
  phases: [{ title: 'Solve' }],
}

// --- v8 safety guard: no call may inherit the session model; Fable is ledger-capped ---
let FABLE_SPENT = 0
const FABLE_CAP = 40
async function A(prompt, opts) {
  if (!opts || !opts.model) throw new Error(`unpinned agent() [${opts && opts.label}] — model is mandatory`)
  if (!opts.effort) throw new Error(`un-efforted agent() [${opts.label}] — effort is mandatory`)
  let o = opts
  if (o.model === 'claude-fable-5') {
    if (FABLE_SPENT >= FABLE_CAP) { log(`FABLE CAP ${FABLE_CAP} hit — degrading ${o.label} to opus`); o = { ...o, model: 'opus' } }
    else FABLE_SPENT++
  }
  return agent(prompt, o)
}

// NOTE: the live P1 run executed the FULL matrix — args arrived JSON-STRINGIFIED ('{"smoke":true}'),
// so the old check saw a string and defaulted SMOKE=false. Parse defensively (fixed for future runs).
let A0 = args
if (typeof A0 === 'string') { try { A0 = JSON.parse(A0) } catch (e) { A0 = { raw: A0 } } }
const SMOKE = !!(A0 && (A0.smoke === true || A0.raw === 'smoke'))
const N = SMOKE ? 1 : 2
const MODELS = ['claude-fable-5', 'opus']  // matched effort below
const EFFORT = 'high'                       // MATCHED across models — no effort-mismatch confound

// Minimal, NEUTRAL solve prompt: invites tool use, does NOT instruct checking (the behavior under test).
const SOLVE = 'You have tools available (you may write and run code). Solve the task below and give your single best, complete final answer.'

const ALL = [
  { id: 'global-counter', family: 'design',
    prompt: 'Design a globally-distributed counter for ad-impression billing: ~1M increments/sec, must survive a full region failure, and must never over- or under-count. Specify the consistency model, the data path, and failure handling, and justify every trade-off.' },
  { id: 'sort-lower-bound', family: 'proof',
    prompt: 'Prove that any comparison-based sort of n elements requires Omega(n log n) comparisons in the worst case. Then explain precisely why radix sort does not violate this bound.' },
  { id: 'coupon-collector', family: 'proof',
    prompt: 'Derive the expected number of DISTINCT coupons collected after k draws (with replacement) from n equally-likely coupons, and give its asymptotics. Then state and explain the expected time to collect ALL n coupons.' },
]
const TASKS = SMOKE ? [ALL[1]] : ALL  // smoke: sort-lower-bound only

const out = { smoke: SMOKE, effort: EFFORT, n: N, agentType: 'general-purpose', solves: [] }
for (const task of TASKS) {
  for (const model of MODELS) {
    for (let s = 0; s < N; s++) {
      const ans = await A(`${SOLVE}\n\nTASK:\n${task.prompt}`,
        { model, effort: EFFORT, agentType: 'general-purpose', label: `solve:${model}:${task.id}:${s}`, phase: 'Solve' })
      out.solves.push({ task: task.id, family: task.family, model, sample: s, chars: (ans || '').length, answer: ans || '' })
      log(`solved ${task.id} by ${model} #${s} — ${(ans || '').length} chars`)
    }
  }
}
out.fableSpent = FABLE_SPENT
log(`P1 done. solves=${out.solves.length} (${MODELS.length} models x ${TASKS.length} tasks x ${N}) fableSpent=${FABLE_SPENT}`)
return out
