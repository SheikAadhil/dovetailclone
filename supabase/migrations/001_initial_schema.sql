-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create workspaces table
CREATE TABLE workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id text NOT NULL, -- Clerk user ID
  plan text NOT NULL DEFAULT 'free',
  created_at timestamptz DEFAULT now()
);

-- Create channels table
CREATE TABLE channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  slack_channel_id text,
  slack_channel_name text,
  slack_team_id text,
  is_active boolean DEFAULT true,
  last_synced_at timestamptz,
  last_analyzed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  created_by text NOT NULL -- Clerk user ID
);

-- Create slack_connections table
CREATE TABLE slack_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  slack_team_id text NOT NULL UNIQUE,
  slack_team_name text NOT NULL,
  bot_token text NOT NULL,
  bot_user_id text NOT NULL,
  scope text NOT NULL,
  installed_by text NOT NULL, -- Clerk user ID
  installed_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true
);

-- Create data_points table
CREATE TABLE data_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid REFERENCES channels(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'slack',
  external_id text NOT NULL, -- Slack message ts
  content text NOT NULL,
  sender_name text,
  sender_slack_id text,
  slack_channel_id text,
  message_timestamp timestamptz NOT NULL,
  embedding vector(1536),
  sentiment text CHECK (sentiment IN ('positive', 'negative', 'neutral')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(channel_id, external_id)
);

-- Create themes table
CREATE TABLE themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid REFERENCES channels(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  summary text NOT NULL,
  data_point_count integer DEFAULT 0,
  sentiment_breakdown jsonb DEFAULT '{}',
  is_pinned boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  last_updated_at timestamptz DEFAULT now()
);

-- Create data_point_themes table
CREATE TABLE data_point_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data_point_id uuid REFERENCES data_points(id) ON DELETE CASCADE,
  theme_id uuid REFERENCES themes(id) ON DELETE CASCADE,
  relevance_score float,
  created_at timestamptz DEFAULT now(),
  UNIQUE(data_point_id, theme_id)
);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE slack_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_point_themes ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user ID from JWT
CREATE OR REPLACE FUNCTION request_user_id() RETURNS text AS $$
  SELECT auth.jwt() ->> 'sub';
$$ LANGUAGE sql STABLE;

-- RLS Policies

-- Workspaces: owner can access
CREATE POLICY "Users can access their own workspaces" ON workspaces
  FOR ALL USING (owner_id = request_user_id());

-- Channels: users can access channels belonging to their workspaces
CREATE POLICY "Users can access channels in their workspaces" ON channels
  FOR ALL USING (workspace_id IN (
    SELECT id FROM workspaces WHERE owner_id = request_user_id()
  ));

-- Slack Connections: users can access connections belonging to their workspaces
CREATE POLICY "Users can access slack connections in their workspaces" ON slack_connections
  FOR ALL USING (workspace_id IN (
    SELECT id FROM workspaces WHERE owner_id = request_user_id()
  ));

-- Data Points: users can access data points belonging to their workspaces
CREATE POLICY "Users can access data points in their workspaces" ON data_points
  FOR ALL USING (workspace_id IN (
    SELECT id FROM workspaces WHERE owner_id = request_user_id()
  ));

-- Themes: users can access themes belonging to their workspaces
CREATE POLICY "Users can access themes in their workspaces" ON themes
  FOR ALL USING (workspace_id IN (
    SELECT id FROM workspaces WHERE owner_id = request_user_id()
  ));

-- Data Point Themes: access via associated theme or data point
CREATE POLICY "Users can access data point themes via theme" ON data_point_themes
  FOR ALL USING (theme_id IN (
    SELECT id FROM themes WHERE workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = request_user_id()
    )
  ));
