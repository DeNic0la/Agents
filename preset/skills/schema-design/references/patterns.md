# Patterns

PostgreSQL syntax. Translate types and drop unenforced constraints for other engines (see [engines.md](engines.md)). Adapt names to the project's conventions and domain terms.

## Contents

- [Entity table (users)](#entity-table-users)
- [High-volume append (events)](#high-volume-append-events)
- [History (slowly changing dimension, type 2)](#history-slowly-changing-dimension-type-2)
- [Audit log](#audit-log)

## Entity table (users)

```sql
CREATE TABLE users (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email        TEXT NOT NULL,
  -- Derived, for "all users of a domain" queries; can't drift from email
  email_domain TEXT GENERATED ALWAYS AS (lower(split_part(email, '@', 2))) STORED,
  display_name TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'active'
               CHECK (status IN ('active', 'suspended', 'closed')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Business key: case-insensitive unique email. This is also the lookup index.
CREATE UNIQUE INDEX users_email_key ON users (lower(email));
CREATE INDEX users_email_domain_idx ON users (email_domain);
```

No separate index on `id` or `email`: the primary key and the unique index already cover them. `updated_at` needs a trigger or the ORM.

## High-volume append (events)

```sql
CREATE TABLE events (
  id         BIGINT GENERATED ALWAYS AS IDENTITY,
  user_id    BIGINT NOT NULL REFERENCES users (id),
  event_type TEXT NOT NULL,
  properties JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- The partition key must be part of the primary key
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE TABLE events_2026_11 PARTITION OF events
  FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');

-- "Recent events of a user" and "recent events of a type"
CREATE INDEX events_user_created_idx ON events (user_id, created_at DESC);
CREATE INDEX events_type_created_idx ON events (event_type, created_at DESC);
```

Partition only when the table will reach tens of millions of rows and most queries filter by time. Old partitions are detached or dropped instead of deleted row by row. Append-only, so no `updated_at`.

## History (slowly changing dimension, type 2)

```sql
CREATE TABLE subscription_versions (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES users (id),
  tier            TEXT NOT NULL,
  monthly_price   NUMERIC(10, 2) NOT NULL CHECK (monthly_price >= 0),
  valid_from      TIMESTAMPTZ NOT NULL,
  valid_to        TIMESTAMPTZ,            -- NULL: the current version
  CHECK (valid_to IS NULL OR valid_to > valid_from)
);

-- At most one current version per user
CREATE UNIQUE INDEX subscription_versions_current_key
  ON subscription_versions (user_id) WHERE valid_to IS NULL;
-- "Version valid at time T"
CREATE INDEX subscription_versions_user_validity_idx
  ON subscription_versions (user_id, valid_from DESC);
```

Rows are never updated except to close `valid_to`, so the current version is `valid_to IS NULL` and no separate `is_current` flag can drift. To forbid overlapping periods, use an exclusion constraint on `tstzrange(valid_from, valid_to)` with `btree_gist`.

## Audit log

```sql
CREATE TABLE audit_log (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  table_name  TEXT NOT NULL,
  record_id   BIGINT NOT NULL,
  operation   TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  old_values  JSONB,
  new_values  JSONB,
  changed_by  BIGINT,                      -- no FK: audit rows outlive users
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX audit_log_record_idx ON audit_log (table_name, record_id, changed_at DESC);
CREATE INDEX audit_log_changed_by_idx ON audit_log (changed_by, changed_at DESC);
```

Fill it from triggers or from the application in the same transaction. If it holds personal data, it needs the same retention and deletion rules as the source tables.
