// claude-ensemble eval v8 — judge A/B: revised (mined) JUDGE prompt vs current, Fable-graded.
//
// Same 3 Sonnet-5 panel drafts -> both judges (Opus @ max) -> pairwise grade (Fable primary + Opus
// cross-check), both answer orders, length-controlled, on 4 HELD-OUT open-ended tasks chosen to invite
// specifics (so the mined fabrication/off-task discriminators are actually exercised). Neutral audit
// prompt (does NOT prime the discriminators) so the grader applies its own lens. Isolates the judge
// prompt: drafts are identical for both judges.

export const meta = {
  name: 'ensemble-eval-v8-judge-ab',
  description: 'judge A/B: mined-revised JUDGE prompt vs current, same drafts, Fable+Opus pairwise both orders on held-out open-ended tasks',
  phases: [{ title: 'Panel' }, { title: 'Judge' }, { title: 'Grade' }],
}

let FABLE_SPENT = 0
async function A(p, o) {
  if (!o || !o.model || !o.effort) throw new Error('unpinned/un-efforted agent() ' + (o && o.label))
  if (o.model === 'claude-fable-5') FABLE_SPENT++
  return agent(p, o)
}

const CFG = {"CURRENT": "You are the judge of an ensemble. Below are independent candidate answers under blind labels \u2014 do not state or guess which model wrote which. Treat each as a claim to verify \u2014 run code/computations to check load-bearing technical claims where useful \u2014 and score per-criterion against the task's real success criteria (not tone, length, or label order), resolve contradictions explicitly, discard unsupported or fabricated claims, and synthesise ONE final answer better than any single candidate. You may override all candidates if they are all wrong. Prefer correctness over splitting the difference. Output ONLY that final answer, written as a single authoritative response to the ORIGINAL TASK as if you wrote it from scratch: do NOT reference the candidates, the labels, the comparison, or your verification process anywhere in the output. Just the clean, self-contained answer.", "REVISED": "You are the judge of an ensemble. Below are independent candidate answers under blind labels \u2014 do not state or guess which model wrote which. Verify load-bearing claims (run code, computation, or lookups where it pays), discard whatever is unsupported, fabricated, or verifiably wrong, resolve contradictions, and synthesise ONE answer better than any candidate \u2014 overriding all of them if they are wrong. Prefer correctness over splitting the difference.\n\nWhen candidates are near-identical and all correct, do not reward the longer or denser one \u2014 separate them on trust: distrust invented or too-clean specificity (post-cutoff numbers, dates, citations, prices) over an equally-informative hedge, off-task or leaked orchestration content, and self-contradiction \u2014 a fabricated or self-contradictory claim corrupts trust more than inert leftover text. Extra detail counts only when it is both true and load-bearing.\n\nOutput ONLY the final answer to the ORIGINAL TASK, written from scratch and held to that same standard. Never mention the candidates, the labels, or your verification.", "PANELIST": "Give your single best, complete answer to the task. Reason from first principles, state key assumptions, and commit to one answer; do not hedge.", "COMMON": "Ground every claim; never fabricate facts, APIs, citations, or numbers. Your answer is one of several an independent judge will compare and synthesize \u2014 optimize for correctness and completeness, not length.", "AUDIT": "Compare two answers (A and B) to the same open-ended task for GENUINE quality \u2014 which is more correct and the better synthesis of the question. Length control: a LONGER answer is NOT better unless its extra content is correct AND does real work; a shorter, equally-good answer is not worse. Prosecute each (hunt real errors, unsupported claims, omissions) and defend each (steelman). Ignore tone and label order. Set lengthDriven=true if length/verbosity is the main reason one looks better.", "TASKS": [{"id": "rlhf-superseded", "prompt": "Synthesize the current evidence on whether RLHF is being superseded by newer alignment methods (RLAIF, DPO, Constitutional AI, and successors). Take a defensible position and give the strongest counterargument to it."}, {"id": "vectordb-choice", "prompt": "A startup building a RAG product must choose among a dedicated vector database (e.g. Pinecone/Weaviate), Postgres + pgvector, or a managed RAG platform. Give the decision framework across cost, scale, ops burden, and retrieval quality, and the conditions that flip each choice."}, {"id": "agents-delivered", "prompt": "Assess whether the LLM 'agent' paradigm (tool-using autonomous loops) has delivered on its promise for production software engineering, or remains mostly demos. Take a defensible position and give the strongest counterargument."}, {"id": "self-host-vs-api", "prompt": "Should a mid-size company self-host an open-weights LLM or rely on frontier APIs for an internal knowledge assistant? Give the decision framework and the conditions under which each choice is right."}]};
const AUDIT_SCHEMA = { type: 'object', additionalProperties: false, required: ['winner', 'lengthDriven', 'reasoning'],
  properties: { winner: { type: 'string', enum: ['A', 'B', 'tie'] }, lengthDriven: { type: 'boolean' }, reasoning: { type: 'string' } } }
const tags = ['A', 'B', 'C', 'D']
function hash(s) { return [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 1000000007, 7) }

async function panel(task) {
  return (await parallel([0, 1, 2].map((i) => () =>
    A(`${CFG.PANELIST}\n\n${CFG.COMMON}\n\nTASK:\n${task.prompt}`, { model: 'sonnet', effort: 'high', label: `draft${i}:${task.id}`, phase: 'Panel' })))).filter(Boolean)
}
async function judge(judgePrompt, drafts, task, tag) {
  const off = hash(task.prompt) % drafts.length
  const lab = drafts.map((_, i) => ({ tag: tags[i], text: drafts[(i + off) % drafts.length] }))
  return A(`${judgePrompt}\n\n` + lab.map((d) => `--- Candidate ${d.tag} ---\n${d.text}`).join('\n\n') + `\n\nORIGINAL TASK:\n${task.prompt}`,
    { model: 'opus', effort: 'max', label: `judge:${tag}:${task.id}`, phase: 'Judge' })
}
async function audit(task, aText, bText, grader, tag) {
  return A(`${CFG.AUDIT}\n\nTASK:\n${task.prompt}\n\n--- Answer A ---\n${aText}\n\n--- Answer B ---\n${bText}\n\nReturn winner (A/B/tie), lengthDriven, reasoning.`,
    { model: grader, effort: 'high', schema: AUDIT_SCHEMA, label: `audit:${grader}:${task.id}:${tag}`, phase: 'Grade' })
}

const rows = []
for (const task of CFG.TASKS) {
  const drafts = await panel(task)
  if (drafts.length < 2) { log(`${task.id}: <2 drafts, skip`); continue }
  const cur = (await judge(CFG.CURRENT, drafts, task, 'cur')) || ''
  const rev = (await judge(CFG.REVISED, drafts, task, 'rev')) || ''
  const graders = {}
  for (const g of ['claude-fable-5', 'opus']) {
    const o1 = await audit(task, cur, rev, g, 'curA')  // A=current, B=revised
    const o2 = await audit(task, rev, cur, g, 'revA')  // A=revised, B=current
    const revWin = (o1 && o1.winner === 'B' ? 1 : 0) + (o2 && o2.winner === 'A' ? 1 : 0)
    const curWin = (o1 && o1.winner === 'A' ? 1 : 0) + (o2 && o2.winner === 'B' ? 1 : 0)
    const tie = (o1 && o1.winner === 'tie' ? 1 : 0) + (o2 && o2.winner === 'tie' ? 1 : 0)
    const ld = (o1 && o1.lengthDriven ? 1 : 0) + (o2 && o2.lengthDriven ? 1 : 0)
    graders[g] = { revWin, curWin, tie, lengthDriven: ld, reasons: [o1 && o1.reasoning, o2 && o2.reasoning] }
  }
  rows.push({ id: task.id, curChars: cur.length, revChars: rev.length, graders })
  log(`${task.id}: revChars=${rev.length} curChars=${cur.length} | fable rev/tie/cur ${graders['claude-fable-5'].revWin}/${graders['claude-fable-5'].tie}/${graders['claude-fable-5'].curWin} | opus ${graders['opus'].revWin}/${graders['opus'].tie}/${graders['opus'].curWin}`)
}

const agg = {}
for (const g of ['claude-fable-5', 'opus']) {
  agg[g] = { revWin: 0, curWin: 0, tie: 0, lengthDriven: 0 }
  for (const r of rows) { agg[g].revWin += r.graders[g].revWin; agg[g].curWin += r.graders[g].curWin; agg[g].tie += r.graders[g].tie; agg[g].lengthDriven += r.graders[g].lengthDriven }
}
const meanRev = rows.reduce((s, r) => s + r.revChars, 0) / (rows.length || 1)
const meanCur = rows.reduce((s, r) => s + r.curChars, 0) / (rows.length || 1)
log(`JUDGE A/B done. Fable: revised ${agg['claude-fable-5'].revWin} / tie ${agg['claude-fable-5'].tie} / current ${agg['claude-fable-5'].curWin} (of ${rows.length * 2} votes, ld ${agg['claude-fable-5'].lengthDriven}). Opus: revised ${agg['opus'].revWin} / tie ${agg['opus'].tie} / current ${agg['opus'].curWin}. mean chars revised=${Math.round(meanRev)} current=${Math.round(meanCur)}. fableSpent=${FABLE_SPENT}`)
return { rows, agg, meanRevChars: meanRev, meanCurChars: meanCur, fableSpent: FABLE_SPENT }
