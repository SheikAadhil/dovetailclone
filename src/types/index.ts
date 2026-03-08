export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  plan: 'free' | 'pro' | 'enterprise'; // Assuming plan values, default 'free'
  created_at: string;
}

export interface Channel {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  slack_channel_id: string | null;
  slack_channel_name: string | null;
  slack_team_id: string | null;
  is_active: boolean;
  last_synced_at: string | null;
  last_analyzed_at: string | null;
  created_at: string;
  created_by: string;
}

export interface SlackConnection {
  id: string;
  workspace_id: string;
  slack_team_id: string;
  slack_team_name: string;
  bot_token: string;
  bot_user_id: string;
  scope: string;
  installed_by: string;
  installed_at: string;
  is_active: boolean;
}

export interface DataPoint {
  id: string;
  channel_id: string;
  workspace_id: string;
  source: string;
  external_id: string;
  content: string;
  sender_name: string | null;
  sender_slack_id: string | null;
  slack_channel_id: string | null;
  message_timestamp: string; // ISO string
  embedding: number[] | null;
  sentiment: 'positive' | 'negative' | 'neutral' | null;
  created_at: string;
}

export interface Theme {
  id: string;
  channel_id: string;
  workspace_id: string;
  name: string;
  summary: string;
  data_point_count: number;
  sentiment_breakdown: Record<string, number> | null; // e.g. { positive: 10, negative: 2 }
  is_pinned: boolean;
  created_at: string;
  last_updated_at: string;
  // Optional join field
  data_points?: DataPoint[];
}

export interface DataPointTheme {
  id: string;
  data_point_id: string;
  theme_id: string;
  relevance_score: number | null;
  created_at: string;
}
