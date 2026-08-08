-- Bounded runtime snapshot observed at 2026-08-08T20:07:54.499Z.
-- The VALUES projection is intentionally reproducible and does not claim to
-- be a live connector or a trend series.
WITH autonomy_debt(gate, count, scope, snapshot_at, meaning) AS (
  VALUES
    ('Intent', 129, 'company', '2026-08-08T20:07:54.499Z', 'missing or stale durable intent'),
    ('Dependency stale', 262, 'relations', '2026-08-08T20:07:54.499Z', 'freshness cannot be established'),
    ('Dependency unowned', 262, 'relations', '2026-08-08T20:07:54.499Z', 'no accountable relation owner'),
    ('Dependency untyped', 262, 'relations', '2026-08-08T20:07:54.499Z', 'no typed blocking semantics'),
    ('Verification', 3, 'outcomes', '2026-08-08T20:07:54.499Z', 'insufficiently independent evidence'),
    ('Policy', 0, 'policies', '2026-08-08T20:07:54.499Z', 'active policy lifecycle debt')
)
SELECT gate, count, scope, snapshot_at, meaning
FROM autonomy_debt;
