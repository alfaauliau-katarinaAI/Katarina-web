-- KATARINA cloud-first, free-tier-budgeted durable snapshots.
CREATE TABLE IF NOT EXISTS headlines (
 url TEXT PRIMARY KEY,
 title TEXT NOT NULL,
 source TEXT NOT NULL,
 published_at TEXT NOT NULL,
 category TEXT NOT NULL,
 collected_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_headlines_published ON headlines(published_at DESC);
CREATE TABLE IF NOT EXISTS h4_analyses (
 symbol TEXT NOT NULL,
 last_closed_at TEXT NOT NULL,
 status TEXT NOT NULL,
 direction TEXT,
 trigger REAL,
 invalidation REAL,
 objective REAL,
 source TEXT,
 recorded_at TEXT NOT NULL,
 evidence_json TEXT NOT NULL,
 PRIMARY KEY(symbol,last_closed_at)
);
CREATE INDEX IF NOT EXISTS idx_h4_analysis_time ON h4_analyses(recorded_at DESC);
CREATE TABLE IF NOT EXISTS ingestion_status (
 key TEXT PRIMARY KEY,
 last_checked_at TEXT NOT NULL,
 last_success_at TEXT,
 accepted_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS headline_translations (
 url TEXT PRIMARY KEY,
 original_title TEXT NOT NULL,
 title_id TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_translations_at ON headline_translations(updated_at DESC);
