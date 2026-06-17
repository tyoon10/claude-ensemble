// claude-ensemble — optional deterministic engine, built on Claude Code Dynamic Workflows.
// Docs: https://code.claude.com/docs/en/workflows
//
// Plain JavaScript. This mirrors the /ensemble command but as a scripted workflow:
// deterministic control flow, no orchestration-token tax, reproducible runs. It uses
// only Claude models, so it runs on your Pro/Max subscription with no API key.
//
// Invoke with args = { task: "<your hard task>" } — accepts an object, a JSON
// string, or the bare task text.
// The panelist/judge prompts here mirror .claude/agents/ensemble-*.md — keep them in sync.

export const meta = {
  name: 'ensemble',
  description: 'Best-of-N Claude panel drafts in parallel; an Opus judge verifies and synthesizes one best answer — subscription-only, no API keys',
  phases: [
    { title: 'Triage' },
    { title: 'Panel' },
    { title: 'Judge' },
  ],
}

// Model TIER aliases (not pinned version IDs): 'haiku' | 'sonnet' | 'opus' each
// resolve to the latest release of that tier, so the kit tracks new Claude models with
// no edit. Pin a version (e.g. 'claude-opus-4-8') only when you want reproducibility.
const GATE_MODEL = 'haiku'    // fast, cheap triage
const PANEL_MODEL = 'sonnet'  // diverse, cost-efficient panel drafts
const JUDGE_MODEL = 'opus'    // strongest available judge
const JUDGE_EFFORT = 'xhigh'  // judge effort is the biggest measured lever — see eval/results-phaseA.md
const MIN_QUORUM = 2

const ROUTE_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    complex: { type: 'boolean' },
    reason: { type: 'string' },
  },
  required: ['complex', 'reason'],
}

// Best-of-N: N independent drafts of the SAME task. Measured: objective-role "diversity"
// did not beat a homogeneous panel, and intra-Claude diversity doesn't predict lift — the
// lift is best-of-N + a strong judge. See eval/results-panel.md and eval/results-phaseB.md.
const PANEL_N = 3
const PANELIST = 'Give your single best, complete answer to the task. Reason from first principles, state key assumptions, and commit to one answer; do not hedge.'

const COMMON = 'Ground every claim; never fabricate facts, APIs, citations, or numbers. Your answer is one of several an independent judge will compare and synthesize — optimize for correctness and completeness, not length.'

// Accept args as { task }, as a JSON string, or as the bare task string —
// a workflow's args can arrive object-shaped or stringified depending on the caller.
function resolveTask(a) {
  if (!a) return ''
  if (typeof a === 'object') return a.task || ''
  const s = String(a).trim()
  if (s.startsWith('{')) {
    try { return JSON.parse(s).task || '' } catch (e) { /* fall through to raw string */ }
  }
  return s
}
const task = resolveTask(args)
if (!task) {
  return 'Provide a task: run this workflow with args = { task: "<your question>" } (object, JSON string, or bare text).'
}

phase('Triage')
const gate = await agent(
  `Decide whether this task needs a multi-agent ensemble or whether a single pass answers it well. "complex" = multi-step reasoning, design, analysis, hard debugging, research, or trade-off calls; otherwise not.\n\nTASK:\n${task}`,
  { model: GATE_MODEL, effort: 'low', schema: ROUTE_SCHEMA, phase: 'Triage' }
)
log(`complex=${gate.complex} — ${gate.reason}`)

if (!gate.complex) {
  return await agent(`Answer this directly and well.\n\nTASK:\n${task}`, { model: PANEL_MODEL, effort: 'medium', label: 'single-pass' })
}

phase('Panel')
const drafts = (await parallel(
  Array.from({ length: PANEL_N }, (_, i) => () =>
    agent(`${PANELIST}\n\n${COMMON}\n\nTASK:\n${task}`,
      { model: PANEL_MODEL, effort: 'high', label: `panel-${i + 1}`, phase: 'Panel' })
  )
)).filter(Boolean) // a panelist that errors resolves to null and is dropped

if (drafts.length < MIN_QUORUM) {
  log(`only ${drafts.length} draft(s) returned — below quorum; answering with the strongest single model`)
  return await agent(`Answer this as well as you can.\n\nTASK:\n${task}`, { model: JUDGE_MODEL, effort: 'high', label: 'quorum-fallback' })
}

// Blind, provenance-stripped, order-rotated labels. Order derives from the task text
// because Math.random()/Date.now() are unavailable inside a workflow script.
const tags = ['A', 'B', 'C', 'D', 'E']
const offset = [...task].reduce((h, c) => (h + c.charCodeAt(0)) % drafts.length, 0)
const labelled = drafts.map((_, pos) => ({ tag: tags[pos], text: drafts[(pos + offset) % drafts.length] }))

phase('Judge')
return await agent(
  `You are the judge of an ensemble. Below are independent candidate answers under blind labels — do not state or guess which model wrote which. Treat each as a claim to verify: score per-criterion against the task's real success criteria (not tone, length, or label order), resolve contradictions explicitly, discard unsupported or fabricated claims, and synthesise ONE final answer better than any single candidate. You may override all candidates if they are all wrong. Prefer correctness over splitting the difference. Lead with the final answer; do not narrate your verification process before it — put any short dissent or verification notes after the answer.\n\n` +
  labelled.map((d) => `--- Candidate ${d.tag} ---\n${d.text}`).join('\n\n') +
  `\n\nORIGINAL TASK:\n${task}`,
  { model: JUDGE_MODEL, effort: JUDGE_EFFORT, label: 'judge', phase: 'Judge' }
)
