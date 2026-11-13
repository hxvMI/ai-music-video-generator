CREATE TABLE IF NOT EXISTS app_ai_daily_usage (
  day TEXT PRIMARY KEY,
  used INTEGER NOT NULL DEFAULT 0 CHECK (used >= 0),
  provider_exhausted INTEGER NOT NULL DEFAULT 0 CHECK (provider_exhausted IN (0, 1))
);
