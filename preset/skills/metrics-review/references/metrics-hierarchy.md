# Product metrics hierarchy

## North Star

The one metric that best captures the core value users get. It must be:

- **value-aligned:** moves when users get more value
- **leading:** predicts long-term revenue and retention
- **actionable:** the product team can influence it
- **understandable:** everyone in the company knows what it means

Examples: weekly active teams with 3+ contributing members (collaboration), weekly completed transactions (marketplace), weekly users completing the core workflow (SaaS), weekly engaged reading or viewing time (content), weekly deployments using the tool (developer tool).

## L1: health metrics

5-7 metrics across the user lifecycle:

- **Acquisition:** new signups or trials, visitor-to-signup rate, channel mix, cost per acquisition.
- **Activation:** activation rate (the key action that predicts retention), time to activate, onboarding completion, first value moment.
- **Engagement:** DAU/WAU/MAU, DAU/MAU stickiness, core action frequency, session depth, feature adoption.
- **Retention:** D1/D7/D30 retention, cohort curves, churn rate, resurrection rate.
- **Monetization:** free-to-paid conversion, MRR/ARR, ARPU/ARPA, expansion revenue, net revenue retention.
- **Satisfaction:** NPS, CSAT, support ticket volume and resolution time, app store ratings and review sentiment.

## L2: diagnostic metrics

Used to explain L1 changes: funnel step conversion, feature-level usage, segment breakdowns (plan, company size, geography, role), performance (load time, error rate, API latency), content-level engagement.

## Common metrics

### DAU / WAU / MAU

Unique users doing a qualifying action per day, week or month.

- Define "active" carefully: login, page view or core action tell different stories.
- Pick the timeframe that fits usage: DAU for daily products (messaging), WAU for weekly (project management), MAU for occasional (tax, travel).
- DAU/MAU above 0.5 means a daily habit; below 0.2 means infrequent use.
- Trend beats absolute value. Segment power users from casual ones.

### Retention

Of users who started in period X, the share still active in period Y. D1: was the first experience good enough? D7: is there a habit? D30: retained long-term? D90: durable?

- Plot cohort curves. Initial drop-off means an activation problem; steady decline an engagement problem; a flattening curve a stable retained base.
- Newer cohorts retaining better means product improvements work.
- Segment by activation behavior (onboarded or not, used feature X or not).

### Conversion

Share of users moving from one stage to the next: visitor to signup, signup to activation, free or trial to paid, monthly to annual.

- Map the whole funnel. The biggest drop-off is the highest-leverage fix.
- Segment by source, plan and user type, and track over time.

### Activation

Share of new users reaching the first moment of core value.

- Find it by comparing retained and churned users: what did retained users do that churned ones didn't?
- It must predict long-term retention and be reachable in the first session or days. Examples: first project created, teammate invited, first workflow completed, integration connected.
- Track it per cohort, minimize time to activate, and A/B test onboarding on retention, not just activation rate.
