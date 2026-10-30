# Condition-Based Waiting

## Overview

Flaky tests often guess at timing: `sleep(500)`, `setTimeout(..., 1000)`, a fixed timeout before an assertion. The guess is too short on a slow CI machine and wastes time on a fast one.

**Core principle:** Wait for the condition you actually care about, not for a duration. Poll until it holds, and fail with a clear message if it never does.

## When to Use

- A test sleeps or waits a fixed time before asserting
- A test passes locally and fails in CI, or passes and fails on reruns
- Asserting on something asynchronous: a file appearing, a server listening, an event emitted, a row written

**Not for:** testing timing itself (debounce, throttle, timeouts). There, use fake timers and advance them explicitly.

## The Pattern

```typescript
// Poll until condition() is truthy; fail with a message naming what we waited for.
export async function waitFor<T>(
  condition: () => T | Promise<T>,
  description: string,
  { timeoutMs = 5000, intervalMs = 20 } = {},
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      const result = await condition();
      if (result) return result;
    } catch (err) {
      lastError = err; // condition not ready yet (e.g. file not there)
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(
    `Timed out after ${timeoutMs}ms waiting for: ${description}` +
      (lastError ? ` (last error: ${String(lastError)})` : ''),
  );
}

// Before: await sleep(1000); expect(existsSync(out)).toBe(true);
// After:
await waitFor(() => existsSync(out), `${out} to be written`);
```

## Rules

- **Wait for the observable result**, not an intermediate step: the file's content, not just its existence, when content is what you assert.
- **The timeout is a safety net, not the expected duration.** Make it generous; a passing test returns as soon as the condition holds.
- **Name what you waited for** in the failure message, so a timeout reads as a diagnosis.
- **Prefer a framework's built-in** (`waitFor` in Testing Library, `expect.poll` in Playwright and Vitest) when the project already has one.
