# Gmail Auto-Sync CURL Tests

Готовые curl команды для тестирования автоматической синхронизации Gmail.

## 🚀 Быстрый старт

```bash
# Сделать скрипт исполняемым и запустить
chmod +x test-auto-sync.sh
./test-auto-sync.sh
```

## 📋 Отдельные CURL команды

### 1. Тест Cron Endpoint (без авторизации)

```bash
# Должен вернуть 401 Unauthorized
curl -X POST http://localhost:3000/api/cron/gmail-sync \
  -H "Content-Type: application/json" \
  -v
```

**Ожидаемый результат:**
```json
{"error":"Unauthorized"}
```

### 2. Тест Cron Endpoint (с секретом)

```bash
# Заменить YOUR_SECRET на реальный CRON_SECRET
curl -X POST http://localhost:3000/api/cron/gmail-sync \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SECRET" \
  -v
```

**Для продакшена:**
```bash
curl -X POST https://your-domain.vercel.app/api/cron/gmail-sync \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SECRET"
```

### 3. Тест пользовательского auto-sync

```bash
# Требует авторизацию пользователя
curl -X POST http://localhost:3000/api/test/auto-sync \
  -H "Content-Type: application/json" \
  -H "Cookie: YOUR_SESSION_COOKIE" \
  -v
```

### 4. Сравнение с существующим sync

```bash
# Ручная синхронизация (существующий endpoint)
curl -X POST http://localhost:3000/api/sync/gmail \
  -H "Content-Type: application/json" \
  -H "Cookie: YOUR_SESSION_COOKIE" \
  -v
```

## 🔐 Получение Session Cookie

### Способ 1: Браузер Dev Tools
1. Откройте http://localhost:3000 в браузере
2. Войдите в систему
3. F12 → Application → Cookies
4. Скопируйте весь cookie

### Способ 2: Автоматическое извлечение
```bash
# Получить cookie автоматически (если есть сохраненная сессия)
COOKIE=$(curl -s -c - http://localhost:3000/api/auth/session | grep -E '(sb-|session)' | awk '{print $6"="$7}' | tr '\n' ';')

# Использовать cookie в запросе
curl -X POST http://localhost:3000/api/test/auto-sync \
  -H "Content-Type: application/json" \
  -H "Cookie: $COOKIE"
```

## 📊 Ожидаемые ответы

### Успешный auto-sync (с данными)
```json
{
  "success": true,
  "processed": 3,
  "total_emails": 10,
  "test_mode": true,
  "processed_emails": [
    {
      "id": "email_id_1",
      "status": "processed",
      "subject": "User feedback about feature",
      "category": "feature",
      "priority": "medium",
      "sentiment": "neutral",
      "confidence": 0.85
    },
    {
      "id": "email_id_2", 
      "status": "not_feedback",
      "subject": "Newsletter",
      "category": "general",
      "confidence": 0.3
    }
  ],
  "keywords_used": ["feedback"],
  "timestamp": "2025-07-19T13:00:00.000Z"
}
```

### Нет новых писем
```json
{
  "success": true,
  "message": "No emails found to test",
  "processed": 0,
  "test_mode": true
}
```

### Ошибка авторизации
```json
{"error":"Unauthorized"}
```

### Gmail не подключен
```json
{"error":"Gmail not connected"}
```

## 🔍 Проверка результатов

После успешного теста проверьте в базе данных:

```sql
-- Проверить обработанные письма
SELECT 
  id,
  platform,
  source_id,
  category,
  priority,
  sentiment,
  metadata->>'auto_processed' as auto_processed,
  metadata->>'processed_at' as processed_at
FROM raw_feedback 
WHERE platform = 'gmail' 
  AND metadata->>'auto_processed' = 'true'
ORDER BY created_at DESC
LIMIT 10;
```

## 🚨 Troubleshooting

### 500 Internal Server Error
- Проверьте `OPENAI_API_KEY`
- Убедитесь что Gmail интеграция настроена
- Посмотрите логи сервера

### 401 Unauthorized
- Для cron endpoint: добавьте правильный `CRON_SECRET`
- Для user endpoint: войдите в систему и получите cookie

### No emails processed
- Проверьте ключевые слова в интеграции
- Убедитесь что в Gmail есть письма с этими словами
- Проверьте что письма не были обработаны ранее

## 💡 Дополнительные тесты

### Тест с конкретными параметрами
```bash
# Симуляция Vercel Cron вызова
curl -X POST https://your-domain.vercel.app/api/cron/gmail-sync \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "User-Agent: vercel-cron/1.0"
```

### Тест производительности
```bash
# Замерить время выполнения
time curl -X POST http://localhost:3000/api/test/auto-sync \
  -H "Cookie: $COOKIE" \
  -w "Time: %{time_total}s\n"
```

### Проверка логов
```bash
# В отдельном терминале
tail -f .next/server.js.nft.json
# или в браузере dev tools консоль
```