-- ДОБАВЛЕНИЕ ПОЛЯ SOURCE_ID ДЛЯ ПРЕДОТВРАЩЕНИЯ ДУБЛИКАТОВ
-- Выполните в Supabase SQL Editor

-- 1. Добавить поле source_id в таблицу raw_feedback
ALTER TABLE raw_feedback ADD COLUMN IF NOT EXISTS source_id TEXT;

-- 2. Добавить комментарий к полю
COMMENT ON COLUMN raw_feedback.source_id IS 'Уникальный ID из внешней платформы (Gmail message ID, Tweet ID и т.д.)';

-- 3. Создать индекс для быстрого поиска дубликатов
CREATE INDEX IF NOT EXISTS idx_raw_feedback_source_platform_user 
ON raw_feedback (user_id, platform, source_id);

-- 4. Создать уникальный индекс для предотвращения дубликатов
CREATE UNIQUE INDEX IF NOT EXISTS idx_raw_feedback_unique_source 
ON raw_feedback (user_id, platform, source_id) 
WHERE source_id IS NOT NULL;

-- 5. Проверить структуру таблицы
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'raw_feedback' 
ORDER BY ordinal_position;

-- 6. Проверить индексы
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'raw_feedback';

-- 7. Обновить существующие записи (опционально - добавить фиктивные source_id)
-- ВНИМАНИЕ: Выполните только если нужно обновить существующие записи
/*
UPDATE raw_feedback 
SET source_id = id::text 
WHERE source_id IS NULL AND platform IS NOT NULL;
*/

-- Готово! Теперь система может отслеживать дубликаты по source_id