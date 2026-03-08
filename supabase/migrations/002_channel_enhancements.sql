-- FEATURE 1: AI Context
ALTER TABLE channels 
ADD COLUMN IF NOT EXISTS ai_context text,
ADD COLUMN IF NOT EXISTS ai_context_enhanced boolean DEFAULT false;

-- FEATURE 2: Topics System
CREATE TABLE IF NOT EXISTS topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid REFERENCES channels(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_ai_generated boolean DEFAULT false,
  display_order integer DEFAULT 0,
  created_by text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE themes ADD COLUMN IF NOT EXISTS topic_id uuid REFERENCES topics(id) ON DELETE SET NULL;

-- Enable RLS on topics
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access topics in their workspaces" ON topics
  FOR ALL USING (workspace_id IN (
    SELECT id FROM workspaces WHERE owner_id = (auth.jwt() ->> 'sub')
  ));

-- FEATURE 3: Theme Management
ALTER TABLE themes 
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS is_manual boolean DEFAULT false;

-- FEATURE 4: Multiple Sources
CREATE TABLE IF NOT EXISTS channel_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid REFERENCES channels(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  source_type text NOT NULL CHECK (source_type IN ('slack', 'csv')),
  source_label text NOT NULL,
  slack_channel_id text,
  slack_channel_name text,
  slack_team_id text,
  is_active boolean DEFAULT true,
  data_point_count integer DEFAULT 0,
  last_synced_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE data_points ADD COLUMN IF NOT EXISTS source_id uuid REFERENCES channel_sources(id) ON DELETE SET NULL;
ALTER TABLE data_points ADD COLUMN IF NOT EXISTS source_label text;

-- Data Migration for Feature 4: Create source for existing Slack channels
DO $$
DECLARE
    chan RECORD;
    source_id uuid;
BEGIN
    FOR chan IN SELECT id, workspace_id, slack_channel_id, slack_channel_name, slack_team_id FROM channels WHERE slack_channel_id IS NOT NULL LOOP
        -- Check if source already exists to prevent duplicates
        IF NOT EXISTS (SELECT 1 FROM channel_sources WHERE channel_id = chan.id AND slack_channel_id = chan.slack_channel_id) THEN
            INSERT INTO channel_sources (channel_id, workspace_id, source_type, source_label, slack_channel_id, slack_channel_name, slack_team_id, is_active)
            VALUES (chan.id, chan.workspace_id, 'slack', '#' || chan.slack_channel_name, chan.slack_channel_id, chan.slack_channel_name, chan.slack_team_id, true)
            RETURNING id INTO source_id;

            -- Backfill source_id on existing data_points
            UPDATE data_points SET source_id = source_id, source_label = '#' || chan.slack_channel_name
            WHERE channel_id = chan.id AND slack_channel_id = chan.slack_channel_id;
        END IF;
    END FOR;
END $$;

-- Enable RLS on channel_sources
ALTER TABLE channel_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access sources in their workspaces" ON channel_sources
  FOR ALL USING (workspace_id IN (
    SELECT id FROM workspaces WHERE owner_id = (auth.jwt() ->> 'sub')
  ));

-- FEATURE 5: Trend View
CREATE TABLE IF NOT EXISTS theme_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id uuid REFERENCES themes(id) ON DELETE CASCADE,
  channel_id uuid REFERENCES channels(id) ON DELETE CASCADE,
  snapshot_date date NOT NULL,
  data_point_count integer DEFAULT 0,
  sentiment_breakdown jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  UNIQUE(theme_id, snapshot_date)
);

-- FEATURE 6: Anomaly Alerts
CREATE TABLE IF NOT EXISTS anomaly_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid REFERENCES channels(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  theme_id uuid REFERENCES themes(id) ON DELETE CASCADE,
  theme_name text NOT NULL,
  alert_type text NOT NULL CHECK (alert_type IN ('spike', 'drop')),
  current_count integer NOT NULL,
  previous_count integer NOT NULL,
  percent_change float NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE channels 
ADD COLUMN IF NOT EXISTS alert_threshold_percent integer DEFAULT 50;

-- Enable RLS on anomaly_alerts
ALTER TABLE anomaly_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access alerts in their workspaces" ON anomaly_alerts
  FOR ALL USING (workspace_id IN (
    SELECT id FROM workspaces WHERE owner_id = (auth.jwt() ->> 'sub')
  ));

-- FEATURE 7: Metadata Fields
CREATE TABLE IF NOT EXISTS channel_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid REFERENCES channels(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  source_column text NOT NULL,
  display_name text NOT NULL,
  field_type text NOT NULL CHECK (field_type IN ('text', 'select', 'date', 'number')),
  options jsonb DEFAULT '[]',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE data_points ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';

-- Enable RLS on channel_fields
ALTER TABLE channel_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access fields in their workspaces" ON channel_fields
  FOR ALL USING (workspace_id IN (
    SELECT id FROM workspaces WHERE owner_id = (auth.jwt() ->> 'sub')
  ));

-- FEATURE 9: Slack Digest
ALTER TABLE channels 
ADD COLUMN IF NOT EXISTS digest_slack_webhook_url text,
ADD COLUMN IF NOT EXISTS digest_slack_enabled boolean DEFAULT false;
