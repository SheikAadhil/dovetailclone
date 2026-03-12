-- FEATURE: Sensing (Strategic Foresight Tool)

-- Sensing queries table
CREATE TABLE IF NOT EXISTS sensing_queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  query text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  results jsonb DEFAULT '{}'::jsonb,
  error_message text,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Enable RLS on sensing_queries
ALTER TABLE sensing_queries ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own sensing queries
CREATE POLICY "Users can manage their own sensing queries" ON sensing_queries
  FOR ALL USING (user_id = (auth.jwt() ->> 'sub'));

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_sensing_queries_user_id ON sensing_queries(user_id);
CREATE INDEX IF NOT EXISTS idx_sensing_queries_workspace_id ON sensing_queries(workspace_id);
CREATE INDEX IF NOT EXISTS idx_sensing_queries_status ON sensing_queries(status);
