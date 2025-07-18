-- ФИНАЛЬНОЕ ИСПРАВЛЕНИЕ БАЗЫ ДАННЫХ
-- Выполните в Supabase SQL Editor

-- 1. Добавить отсутствующее поле ai_analysis в raw_feedback
ALTER TABLE raw_feedback ADD COLUMN IF NOT EXISTS ai_analysis JSONB;

-- 2. Проверить структуру таблицы
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'raw_feedback' 
ORDER BY ordinal_position;

-- 3. Проверить что поле добавлено
SELECT 
  COUNT(*) as total_feedback,
  COUNT(ai_analysis) as with_ai_analysis
FROM raw_feedback;

-- Готово! Теперь AI анализ будет сохраняться и не исчезнет! 