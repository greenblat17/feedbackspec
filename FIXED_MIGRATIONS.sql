-- ИСПРАВЛЕННЫЕ МИГРАЦИИ ДЛЯ SUPABASE
-- Выполните в Supabase SQL Editor

-- 1. Добавить отсутствующее поле ai_analysis в raw_feedback
ALTER TABLE raw_feedback ADD COLUMN ai_analysis JSONB;

-- 2. Пересоздать таблицу feedback_clusters с правильной структурой
DROP TABLE IF EXISTS feedback_clusters CASCADE;

CREATE TABLE feedback_clusters (
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

-- 3. Создать индексы для производительности
CREATE INDEX IF NOT EXISTS idx_feedback_clusters_user_id ON feedback_clusters(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_clusters_expires_at ON feedback_clusters(expires_at);
CREATE INDEX IF NOT EXISTS idx_feedback_clusters_user_count ON feedback_clusters(user_id, total_feedback_count);

-- 4. Включить Row Level Security (RLS)
ALTER TABLE feedback_clusters ENABLE ROW LEVEL SECURITY;

-- 5. Создать политики RLS
CREATE POLICY "Users can access own clusters" ON feedback_clusters
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own clusters" ON feedback_clusters
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own clusters" ON feedback_clusters
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own clusters" ON feedback_clusters
  FOR DELETE USING (auth.uid() = user_id);

-- 6. Создать функцию для автоматической очистки устаревших кластеров
CREATE OR REPLACE FUNCTION cleanup_expired_clusters()
RETURNS void AS $$
BEGIN
  DELETE FROM feedback_clusters WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- 7. Проверить структуру таблиц
SELECT 
  table_name, 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name IN ('raw_feedback', 'feedback_clusters') 
ORDER BY table_name, ordinal_position;

-- 8. Проверить политики RLS
SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'feedback_clusters'; 