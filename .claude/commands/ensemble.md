---
description: Run claude-ensemble (best-of-N panel + a verifying Opus judge) on a hard task.
argument-hint: <a hard question or task>
---

Run the **`ensemble` Dynamic Workflow** (`.claude/workflows/ensemble.js`) on the task below. The workflow owns the whole pipeline — triage → parallel best-of-N panel → a blind Opus judge that verifies and synthesizes → an automatic verify→revise loop on checkable tasks. **Do not orchestrate the panel or judge by hand; delegate to the workflow** (it's deterministic and avoids the orchestration-token tax).

Invoke it with the **Workflow** tool:

- `name`: `"ensemble"`
- `args`: `{ "task": "<the full text of the task below>" }`

<task>
$ARGUMENTS
</task>

Do not narrate launching or waiting for the workflow. When it returns, output its final answer directly, with no preamble (no "running…", no "here is the answer"). Add at most one short line only if the workflow surfaced a real caveat or dissent.

If the Workflow tool isn't available, Dynamic Workflows aren't enabled in this Claude Code — tell the user to run `/config workflows=true` and retry.
