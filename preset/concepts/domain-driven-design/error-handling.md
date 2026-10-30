# Error handling

Rule 9: never swallow an error; handle it by type, with context.

A generic `catch` that returns `null` or a default hides the root cause and turns a failure into wrong data further down. Every catch block does one of three things:

1. **Handles it** because the failure is expected and there's a defined fallback, and logs it at the right level.
2. **Translates it** into an error the caller's layer understands (a domain error, an infrastructure error), keeping the original as the `cause`.
3. **Rethrows it** unchanged when it isn't one it knows.

In each case, log with enough context to trace it: the operation and the relevant IDs, never secrets or personal data.

## Distinguish by type

- **Expected domain errors** (payment declined, insufficient stock, validation failed) are part of the business flow. Give them their own types, log them as warnings, and let callers branch on them.
- **Unexpected system failures** (network, database, bugs) are infrastructure. Wrap them with context or let them propagate to the shell, which logs them as errors.
- Where the language or project prefers result types (`Result`, `Either`, error return values) over exceptions, follow it: return a typed failure rather than throwing, under the same rules.

## Incorrect

```typescript
async function processPayment(orderId: string, amount: number) {
  try {
    const result = await paymentGateway.charge(orderId, amount)
    await db.orders.update(orderId, { status: "paid" })
    return result
  } catch (e) {
    return null  // swallowed: no log, no type, the caller can't tell what failed
  }
}
```

## Correct

```typescript
async function processPayment(orderId: string, amount: number) {
  try {
    const result = await paymentGateway.charge(orderId, amount)
    await db.orders.update(orderId, { status: "paid" })
    return result
  } catch (error) {
    if (error instanceof PaymentDeclinedError) {
      logger.warn("Payment declined", { orderId, amount, reason: error.reason })
      throw new DomainError(`Payment declined for order ${orderId}`, { cause: error })
    }
    if (error instanceof NetworkError) {
      logger.error("Payment gateway unreachable", { orderId, amount, cause: error })
      throw new InfrastructureError("Payment service unavailable", { cause: error })
    }
    logger.error("Unexpected payment failure", { orderId, amount, error })
    throw error
  }
}
```

When several functions need the same translation, extract it into one handler (`toPaymentError(error, context)`) that returns the translated error, and keep the `throw` at the call site, like every other policy decision.

## Red flags

- `catch` with an empty body, or one that only returns `null`, `false`, `[]` or a default
- `catch (e) { console.log(e) }` and execution carries on as if nothing failed
- rethrowing a new error without the original as `cause`
- catching broadly at a low level only to satisfy the compiler

## References

- [Narrowing in TypeScript](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
