-- Feedback Clusters Table
-- This table stores cached AI-generated feedback groupings for performance optimization
-- Run this SQL in your Supabase database to enable cluster caching

CREATE TABLE IF NOT EXISTS feedback_clusters (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign key to users (Supabase auth.users)
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- The complete cluster data from AI analysis (JSON)
  cluster_data JSONB NOT NULL,
  
  -- Array of feedback IDs that were included in this clustering
  feedback_ids TEXT[] NOT NULL DEFAULT '{}',
  
  -- Number of feedback items when this clustering was generated
  total_feedback_count INTEGER NOT NULL DEFAULT 0,
  
  -- When this cluster was created
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- When this cache expires (24 hours by default)
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_feedback_clusters_user_id ON feedback_clusters(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_clusters_expires_at ON feedback_clusters(expires_at);
CREATE INDEX IF NOT EXISTS idx_feedback_clusters_user_count ON feedback_clusters(user_id, total_feedback_count);

-- Row Level Security (RLS) policies
ALTER TABLE feedback_clusters ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own clusters
CREATE POLICY "Users can access own clusters" ON feedback_clusters
  FOR ALL USING (auth.uid() = user_id);

-- Policy: Users can insert their own clusters
CREATE POLICY "Users can insert own clusters" ON feedback_clusters
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own clusters
CREATE POLICY "Users can update own clusters" ON feedback_clusters
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own clusters
CREATE POLICY "Users can delete own clusters" ON feedback_clusters
  FOR DELETE USING (auth.uid() = user_id);

-- Optional: Add a trigger to automatically clean up expired clusters
CREATE OR REPLACE FUNCTION cleanup_expired_clusters()
RETURNS void AS $$
BEGIN
  DELETE FROM feedback_clusters WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Optional: Schedule cleanup to run periodically (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-expired-clusters', '0 2 * * *', 'SELECT cleanup_expired_clusters();');

-- Verify table creation
SELECT 
  table_name, 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'feedback_clusters' 
ORDER BY ordinal_position; 