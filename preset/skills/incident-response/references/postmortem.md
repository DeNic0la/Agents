# Postmortem template

```markdown
## Postmortem: <incident title>
**Date:** <date> | **Duration:** <time to resolution> | **Severity:** SEV<X>
**Authors:** <names> | **Status:** Draft | Reviewed

### Summary
<2-3 sentences in plain language: what happened, the impact, how it was resolved.>

### Impact
- Users affected
- Duration of impact
- Business impact, if it can be measured

### Timeline
| Time (UTC) | Event |
|---|---|
| <HH:MM> | <event: detection, escalation, each action and its effect, resolution> |

### Root cause
<What caused it, and why the system allowed it.>

### Five whys
1. Why did <symptom>? Because ...
2. Why did <cause 1>? Because ...
3. Why did <cause 2>? Because ...
4. Why did <cause 3>? Because ...
5. Why did <cause 4>? Because <root cause>

### What went well
- ...

### What went poorly
- ...

### Where we got lucky
- ...

### Action items
| Action | Owner | Priority | Due date |
|---|---|---|---|
| <action> | <person> | P0 / P1 / P2 | <date> |

### Lessons learned
<Key takeaways for the team.>
```

Also note the time to detect and the time to mitigate: action items that shorten either are as valuable as ones that prevent recurrence.
