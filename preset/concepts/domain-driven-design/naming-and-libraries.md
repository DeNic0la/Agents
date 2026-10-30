# Naming and libraries

Rules 8 and 10: name modules after the domain, and don't reimplement what an established library already does.

## Name modules after the domain

Generic names (`utils`, `helpers`, `common`, `shared`, `misc`) attract unrelated functions until the file is a dumping ground with no owner. Reaching for one usually means a domain module hasn't been identified yet. A domain name enforces cohesion: a function that doesn't fit `order-pricing` visibly doesn't belong there.

- Use the project's ubiquitous language (`GLOSSARY.md`), not synonyms. If the glossary says "Booking", don't add a `ReservationService`.
- One module, one clear purpose, named after it: `order-pricing`, `user-authentication`, `invoice-numbering`.
- Follow the bounded context: the same word may mean different things in two contexts, and each context names its own modules.
- Technical modules with a real single purpose are fine when named for it: `retry-policy`, `date-parsing`, `http-client`.

### Incorrect

```typescript
// utils.ts: three contexts in one file
export function calculateOrderTotal(items: OrderItem[]): number { /* ... */ }
export function formatUserDisplayName(user: User): string { /* ... */ }
export function generateInvoiceNumber(): string { /* ... */ }
```

### Correct

```typescript
// order-pricing.ts
export function calculateOrderTotal(items: OrderItem[]): number { /* ... */ }

// user-display.ts
export function formatUserDisplayName(user: User): string { /* ... */ }

// invoice-numbering.ts
export function generateInvoiceNumber(): string { /* ... */ }
```

When an existing `utils` file needs a new function, add it to the right domain module instead, and mention the `utils` file as a candidate for splitting rather than splitting it unasked.

## Library first

Every line of custom code has to be maintained, tested and documented. Hand-rolled versions of solved problems (retries, validation, date math, auth, state management) usually miss the edge cases a mature library handles.

Before writing general-purpose or infrastructure code:

1. Check whether the project already depends on something that does it.
2. Check the ecosystem's established packages (npm, PyPI, Maven Central, crates.io, NuGet, ...), and look at maintenance and adoption, not just existence.
3. Consider a managed service or third-party API for a whole capability (auth, payments, email).

Custom code is justified for:

- business logic unique to the domain
- performance-critical paths with measured requirements
- cases where the dependency would be heavier than the code
- security-sensitive code that needs full control
- needs no existing solution meets after a real evaluation

Adding a dependency is a project decision. Propose it to the user with the package, the reason and the alternative you'd otherwise write.

### Incorrect

```typescript
// Hand-rolled retry: fixed delay, no backoff, no jitter, retries every error
async function retry<T>(fn: () => Promise<T>, maxRetries = 3, delay = 1000): Promise<T> {
  let lastError: Error
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try { return await fn() }
    catch (error) {
      lastError = error as Error
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }
  throw lastError!
}
```

### Correct

```typescript
import { retry, handleAll, ExponentialBackoff } from "cockatiel"

const retryPolicy = retry(handleAll, { maxAttempts: 3, backoff: new ExponentialBackoff() })
const data = await retryPolicy.execute(() => fetchFromApi("/users"))
```

## References

- [Domain-Driven Design](https://www.domainlanguage.com/ddd/), Eric Evans: ubiquitous language and bounded contexts
