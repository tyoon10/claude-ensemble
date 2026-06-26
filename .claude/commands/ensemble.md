---
description: Run claude-ensemble — a best-of-N Claude panel + an Opus judge, with an automatic verify-loop on checkable tasks, on a hard task. Subscription-only, no API keys.
argument-hint: <a hard question or task>
---

Run the **`ensemble` Dynamic Workflow** (`.claude/workflows/ensemble.js`) on the task below. The workflow owns the whole pipeline — triage → parallel best-of-N panel → a blind Opus judge that verifies and synthesizes → an automatic verify→revise loop on checkable tasks. **Do not orchestrate the panel or judge by hand; delegate to the workflow** (it's deterministic and avoids the orchestration-token tax).

Invoke it with the **Workflow** tool:

- `name`: `"ensemble"`
- `args`: `{ "task": "<the full text of the task below>" }`

<task>
$ARGUMENTS
</task>

When the workflow returns, give the user its final answer. You may add at most one short line if the workflow surfaced a caveat or dissent.

If the Workflow tool isn't available, Dynamic Workflows aren't enabled in this Claude Code — tell the user to run `/config workflows=true` and retry.
