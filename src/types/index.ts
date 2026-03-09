export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  plan: 'free' | 'pro' | 'enterprise';
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
  // Feature 1
  ai_context: string | null;
  ai_context_enhanced: boolean;
  // Feature 6
  alert_threshold_percent: number;
  // Feature 9
  digest_slack_webhook_url: string | null;
  digest_slack_enabled: boolean;
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
  message_timestamp: string;
  embedding: number[] | null;
  sentiment: 'positive' | 'negative' | 'neutral' | null;
  created_at: string;
  // Feature 4
  source_id: string | null;
  source_label: string | null;
  // Feature 7
  metadata: Record<string, any> | null;
}

export interface Theme {
  id: string;
  channel_id: string;
  workspace_id: string;
  name: string;
  summary: string;
  data_point_count: number;
  sentiment_breakdown: Record<string, number> | null;
  is_pinned: boolean;
  created_at: string;
  last_updated_at: string;
  data_points?: DataPoint[];
  // Feature 2
  topic_id: string | null;
  topic_name?: string;
  // Feature 3
  description: string | null;
  is_manual: boolean;
  // Feature 5
  trend_data?: { date: string; count: number }[];
  trend_direction?: 'rising' | 'falling' | 'stable';
  trend_percent_change?: number;
}

export interface DataPointTheme {
  id: string;
  data_point_id: string;
  theme_id: string;
  relevance_score: number | null;
  created_at: string;
}

// Feature 2: Topics
export interface Topic {
  id: string;
  channel_id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  is_ai_generated: boolean;
  display_order: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  theme_count?: number;
}

// Feature 4: Sources
export interface ChannelSource {
  id: string;
  channel_id: string;
  workspace_id: string;
  source_type: 'slack' | 'csv';
  source_label: string;
  slack_channel_id: string | null;
  slack_channel_name: string | null;
  slack_team_id: string | null;
  is_active: boolean;
  data_point_count: number;
  last_synced_at: string | null;
  created_at: string;
}

// Feature 5: Snapshots
export interface ThemeSnapshot {
  id: string;
  theme_id: string;
  channel_id: string;
  snapshot_date: string;
  data_point_count: number;
  sentiment_breakdown: Record<string, number> | null;
  created_at: string;
}

// Feature 6: Alerts
export interface AnomalyAlert {
  id: string;
  channel_id: string;
  workspace_id: string;
  theme_id: string;
  theme_name: string;
  alert_type: 'spike' | 'drop';
  current_count: number;
  previous_count: number;
  percent_change: number;
  is_read: boolean;
  created_at: string;
  channel_name?: string; // from join
}

// Feature 7: Fields
export interface ChannelField {
  id: string;
  channel_id: string;
  workspace_id: string;
  source_column: string;
  display_name: string;
  field_type: 'text' | 'select' | 'date' | 'number';
  options: string[] | null;
  is_active: boolean;
  created_at: string;
}
