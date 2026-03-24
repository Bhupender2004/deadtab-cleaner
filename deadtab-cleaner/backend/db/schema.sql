-- =====================================================
-- DeadTab Cleaner – Supabase Database Schema
-- =====================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────────────
-- USERS table
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email       TEXT UNIQUE NOT NULL,
  api_key     TEXT UNIQUE NOT NULL,
  plan        TEXT NOT NULL DEFAULT 'free',
  habit_score INTEGER NOT NULL DEFAULT 50,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────
-- ARCHIVES table
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS archives (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url               TEXT NOT NULL,
  title             TEXT NOT NULL DEFAULT 'Untitled',
  domain            TEXT,
  focus_seconds     INTEGER DEFAULT 0,
  scroll_depth      INTEGER DEFAULT 0,
  page_text_snippet TEXT,
  archived_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status            TEXT NOT NULL DEFAULT 'auto'
);

CREATE INDEX IF NOT EXISTS idx_archives_user_id ON archives(user_id);
CREATE INDEX IF NOT EXISTS idx_archives_domain ON archives(domain);
CREATE INDEX IF NOT EXISTS idx_archives_archived_at ON archives(archived_at);

-- ─────────────────────────────────────────────────────
-- NOTES table
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notes (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  archive_id       UUID NOT NULL REFERENCES archives(id) ON DELETE CASCADE,
  summary          TEXT,
  intent_tag       TEXT,
  topic_tags       TEXT[] DEFAULT '{}',
  read_time_seconds INTEGER DEFAULT 0,
  ai_model         TEXT,
  generated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notes_archive_id ON notes(archive_id);

-- ─────────────────────────────────────────────────────
-- SETTINGS table
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  inactivity_threshold_days INTEGER NOT NULL DEFAULT 3,
  whitelist_domains         TEXT[] DEFAULT '{}',
  notifications_enabled     BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_settings_user_id ON settings(user_id);

-- ─────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE archives ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Users: can only see/modify own row
CREATE POLICY users_select_own ON users
  FOR SELECT USING (id = auth.uid());

CREATE POLICY users_update_own ON users
  FOR UPDATE USING (id = auth.uid());

-- Archives: can only access own archives
CREATE POLICY archives_select_own ON archives
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY archives_insert_own ON archives
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY archives_delete_own ON archives
  FOR DELETE USING (user_id = auth.uid());

-- Notes: can only access notes on own archives
CREATE POLICY notes_select_own ON notes
  FOR SELECT USING (
    archive_id IN (SELECT id FROM archives WHERE user_id = auth.uid())
  );

CREATE POLICY notes_insert_own ON notes
  FOR INSERT WITH CHECK (
    archive_id IN (SELECT id FROM archives WHERE user_id = auth.uid())
  );

-- Settings: can only access own settings
CREATE POLICY settings_select_own ON settings
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY settings_insert_own ON settings
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY settings_update_own ON settings
  FOR UPDATE USING (user_id = auth.uid());
