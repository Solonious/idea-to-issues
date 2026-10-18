---
description: Approve a gate. Stamps the stage document as approved; only you can run this.
argument-hint: concept | blueprint | tickets
disable-model-invocation: true
allowed-tools: Bash(i2i.mjs gate stamp:*)
---

The owner has approved the `$ARGUMENTS` gate. Run this once with the Bash tool, and nothing else:

```bash
i2i.mjs gate stamp $ARGUMENTS
```

Report its output verbatim. If it exits non-zero, say that the gate was not approved and why. Do not edit the document, retry with other arguments, or approve another gate.
