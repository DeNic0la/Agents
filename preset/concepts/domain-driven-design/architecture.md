# Architecture

Rules 1-3: separate layers, functional core with an imperative shell, and bounded contexts.

## Separate the layers

Each layer has one responsibility. When business rules live in a controller, they can't be reused from another entry point (API, CLI, event handler), and infrastructure changes leak into domain logic.

| Layer | Owns | Never contains |
|---|---|---|
| Transport (controller, UI, CLI) | parsing input, status codes, rendering | business rules, queries |
| Domain (service, pure functions) | business rules and decisions | HTTP, SQL, framework types |
| Data access (repository, gateway) | queries, external APIs, persistence | business rules |

### Incorrect

HTTP handling, a pricing rule and SQL are tangled in one method. None of it can be tested or reused on its own.

```typescript
export class OrderController {
  async createOrder(req: Request, res: Response) {
    const { items, customerId } = req.body;
    const customer = await db.query("SELECT * FROM customers WHERE id = $1", [customerId]);
    if (!customer) return res.status(404).json({ error: "Customer not found" });

    let total = 0;
    for (const item of items) {
      const product = await db.query("SELECT * FROM products WHERE id = $1", [item.productId]);
      total += product.price * item.quantity;
    }
    if (total > 10000) total = total * 0.9; // large-order discount

    const order = await db.query(
      "INSERT INTO orders (customer_id, total) VALUES ($1, $2) RETURNING *",
      [customerId, total]
    );
    return res.status(201).json(order);
  }
}
```

### Correct

```typescript
// order-controller.ts: HTTP only
export class OrderController {
  constructor(private orderService: OrderService) {}

  async createOrder(req: Request, res: Response) {
    const { items, customerId } = req.body;
    const order = await this.orderService.createOrder(customerId, items);
    return res.status(201).json(order);
  }
}

// order-service.ts: business flow only
export class OrderService {
  constructor(
    private customers: CustomerRepository,
    private products: ProductRepository,
    private orders: OrderRepository
  ) {}

  async createOrder(customerId: string, items: OrderItem[]): Promise<Order> {
    const customer = await this.customers.findById(customerId);
    if (!customer) throw new NotFoundError("Customer not found");

    const prices = await this.products.findPrices(items.map((i) => i.productId));
    return this.orders.create({ customerId, total: orderTotal(items, prices) });
  }
}

// order-pricing.ts: the rule itself, pure
export function orderTotal(items: OrderItem[], prices: Map<string, number>): number {
  const total = items.reduce((sum, i) => sum + prices.get(i.productId)! * i.quantity, 0);
  return total > 10000 ? total * 0.9 : total;
}
```

## Functional core, imperative shell

Pure functions are deterministic, so they test with plain assertions and compose safely. When I/O is mixed into a calculation, tests need stubs and spies, and a refactor can silently change when I/O happens.

The test: can the function be called in a unit test with literal values and no mocks? If not, the I/O belongs in the shell.

### Incorrect

```typescript
async function applySubscriptionRenewal(customerId: string, logger: Logger, db: Database, mailer: Mailer) {
  const customer = await db.customers.findById(customerId);
  const plan = await db.plans.findById(customer.planId);

  let price = plan.basePrice;
  if (customer.loyaltyYears >= 3) {
    price = price * 0.85;
    logger.info(`Applied loyalty discount for ${customerId}`);
  }
  if (customer.referralCount >= 5) {
    price = price - 10;
    logger.info(`Applied referral credit for ${customerId}`);
  }
  const tax = price * customer.taxRate;

  await db.invoices.create({ customerId, total: price + tax, tax });
  await mailer.send(customer.email, `Your renewal total is $${price + tax}`);
}
```

### Correct

```typescript
// Core: pure, no side effects
function calculateRenewal(input: RenewalInput): RenewalResult {
  const discounts: string[] = [];
  let price = input.basePrice;
  if (input.loyaltyYears >= 3) { price *= 0.85; discounts.push("loyalty_15pct"); }
  if (input.referralCount >= 5) { price -= 10; discounts.push("referral_credit_10"); }
  const tax = price * input.taxRate;
  return { price, tax, total: price + tax, appliedDiscounts: discounts };
}

// Shell: fetch, compute, then perform every effect
async function processRenewal(customerId: string, db: Database, mailer: Mailer, logger: Logger) {
  const customer = await db.customers.findById(customerId);
  const plan = await db.plans.findById(customer.planId);

  const result = calculateRenewal({
    basePrice: plan.basePrice,
    loyaltyYears: customer.loyaltyYears,
    referralCount: customer.referralCount,
    taxRate: customer.taxRate,
  });

  await db.invoices.create({ customerId, total: result.total, tax: result.tax });
  await mailer.send(customer.email, `Your renewal total is $${result.total}`);
  logger.info("Renewal processed", { customerId, ...result });
}
```

The decisions that used to be log lines are now data (`appliedDiscounts`) the shell can log, store or show.

## Bounded contexts

- One module, one context. `billing` and `ordering` may both have a "customer", and the two needn't be the same type.
- Cross a context boundary only through the other context's public interface (its exported service or API), never by importing its internals or querying its tables.
- Translate at the boundary: map the other context's model into your own instead of letting its types spread through your code.
- Where the project records contexts (`GLOSSARY-MAP.md`, one folder per context), place new code in the context whose language it uses.

## References

- [The Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html), Robert C. Martin
- [Functional Core, Imperative Shell](https://www.destroyallsoftware.com/screencasts/catalog/functional-core-imperative-shell) and [Boundaries](https://www.destroyallsoftware.com/talks/boundaries), Gary Bernhardt
- [Domain-Driven Design](https://www.domainlanguage.com/ddd/), Eric Evans
