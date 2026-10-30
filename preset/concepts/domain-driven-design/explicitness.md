# Explicitness

Rules 4-7: the reader of a call site should see every branch, every side effect and where every value comes from, without opening the helpers it calls.

## Policy at the call site, mechanism in helpers

A **mechanism** computes and returns a value. A **policy** decides what happens with it: throw, branch, log, ignore. When policy hides inside a mechanism, the call site lies: it looks like a passive check but can halt execution. Keeping mechanisms pure also lets the same mechanism serve different policies.

| Mechanism (helper) | Policy (caller) |
|---|---|
| `isValid(result)` returns a boolean | caller throws |
| `applyNewFeature(data)` returns new data | caller checks the feature flag |
| `formatResult(result)` returns a string | caller logs it |

### Incorrect

```typescript
function validateResult(result: Result): void {
  if (!result.success) throw new ProcessingError(result.error)
  if (result.value < 0) throw new RangeError("Negative value")
}

const result = performProcess(param)
validateResult(result)          // looks harmless, hides two throws

function applyNewFeature(data: Data): Data {
  if (!featureFlags.isEnabled("new-feature")) return data  // flag hidden in the mechanism
  return transform(data)
}
```

### Correct

```typescript
function isValid(result: Result): boolean {
  return result.success && result.value >= 0
}

const result = performProcess(param)
if (!isValid(result))
  throw new ProcessingError(result)

const output = featureEnabled ? applyNewFeature(baseData) : baseData
```

Assertion-style helpers are fine when the name says so: `assertValid(result)` or `requireUser(id)` announces the throw. The rule targets names that read as a check or transformation but act as a decision.

## Side effects are visible where they happen

```typescript
// Incorrect: what is logged, where, in which format?
const result = performProcess(param)
logResult(result)

// Correct: the logger, message and format are visible; formatting stays a pure helper
const result = performProcess(param)
logger.log("Result of execution", formatResult(result))
```

The same holds for writes, network calls and events: a helper may build the payload, the call site sends it.

## Data flows through return values

When a function mutates its argument, the call site can't show what changed or whether other references see the change.

```typescript
// Incorrect: output communicated by mutation
const result = {}
if (featureEnabled)
  applyNewFeature(result)

// Still unclear: does applyNewFeature also mutate its input?
let result = {}
if (featureEnabled)
  result = applyNewFeature(result)

// Correct: one binding, visible origin, no hidden mutation
const result = featureEnabled ? applyNewFeature(baseData) : {}
```

Local mutation inside a function that builds and returns a new value (an accumulator, a builder) is fine; the rule is about mutating what the caller passed in.

## Return early

Guard clauses at the top keep the happy path at the outer level and readable top to bottom.

```typescript
// Incorrect: happy path five levels deep, errors scattered in trailing else branches
async function validateUser(userId: string, role: string): Promise<User> {
  if (userId) {
    const user = await db.users.findById(userId)
    if (user) {
      if (!user.isDeleted) {
        if (user.role === role) {
          if (user.emailVerified) return user
          else throw new Error("Email not verified")
        } else throw new Error("Insufficient role")
      } else throw new Error("User is deleted")
    } else throw new Error("User not found")
  } else throw new Error("User ID is required")
}

// Correct
async function validateUser(userId: string, role: string): Promise<User> {
  if (!userId) throw new Error("User ID is required")

  const user = await db.users.findById(userId)
  if (!user) throw new Error("User not found")
  if (user.isDeleted) throw new Error("User is deleted")
  if (user.role !== role) throw new Error("Insufficient role")
  if (!user.emailVerified) throw new Error("Email not verified")

  return user
}
```

## References

- [Separation of mechanism and policy](https://en.wikipedia.org/wiki/Separation_of_mechanism_and_policy)
- [Referential transparency](https://en.wikipedia.org/wiki/Referential_transparency)
- [Flattening Arrow Code](https://blog.codinghorror.com/flattening-arrow-code/), Jeff Atwood
