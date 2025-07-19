# 📧 Тестирование Gmail интеграции

## 🚀 Быстрый старт

### 1. Настройка Google OAuth

1. Перейдите в [Google Cloud Console](https://console.cloud.google.com/)
2. Создайте новый проект или выберите существующий
3. Включите Gmail API:
   - Перейдите в APIs & Services > Library
   - Найдите "Gmail API" и включите его
4. Создайте OAuth 2.0 credentials:
   - Перейдите в APIs & Services > Credentials
   - Нажмите "Create Credentials" > "OAuth 2.0 Client ID"
   - Выберите "Web application"
   - Добавьте redirect URI: `http://localhost:3000/api/auth/gmail/callback`

### 2. Настройка переменных окружения

Добавьте в `.env.local`:

```env
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/gmail/callback
```

### 3. Подготовка тестовых данных

В вашем Gmail аккаунте создайте несколько писем с ключевыми словами:
- Отправьте себе письмо с темой "Bug report"
- Отправьте письмо с текстом "This is feedback about your product"
- Создайте письмо с словом "feature request"

## 🧪 Тестирование через UI

### Шаг 1: Откройте страницу интеграций
1. Запустите приложение: `npm run dev`
2. Войдите в систему
3. Перейдите в Dashboard → Integrations (`/dashboard/integrations`)

### Шаг 2: Подключите Gmail
1. Найдите карточку "Email интеграции"
2. Нажмите кнопку "Connect" в компоненте Gmail
3. Вас перенаправит на Google OAuth
4. Авторизуйтесь и дайте разрешения
5. Вас вернет обратно с сообщением об успехе

### Шаг 3: Настройте ключевые слова
1. После подключения увидите форму для управления ключевыми словами
2. По умолчанию: `['feedback', 'bug', 'feature request']`
3. Добавьте/удалите ключевые слова по необходимости

### Шаг 4: Выполните синхронизацию
1. Нажмите кнопку "Sync"
2. Подождите завершения (кнопка покажет "Синхронизация...")
3. Увидите уведомление об успехе

### Шаг 5: Проверьте результаты
1. Перейдите в Supabase Dashboard
2. Откройте таблицу `raw_feedback`
3. Проверьте новые записи:
   ```sql
   SELECT * FROM raw_feedback WHERE platform = 'gmail' ORDER BY created_at DESC;
   ```

## 🔍 Структура данных

### Таблица `integrations`
```sql
{
  "user_id": "uuid",
  "platform": "gmail", 
  "status": "connected",
  "access_token": "...",
  "refresh_token": "...",
  "config": {
    "keywords": ["feedback", "bug", "feature request"],
    "default_folder": "INBOX",
    "auto_sync": true,
    "sync_frequency": "hourly"
  },
  "last_sync": "2024-01-01T12:00:00Z"
}
```

### Таблица `raw_feedback`
```sql
{
  "user_id": "uuid",
  "platform": "gmail",
  "source_id": "gmail_message_id",
  "content": "email body text",
  "metadata": {
    "subject": "Email subject",
    "from": "sender@example.com", 
    "date": "2024-01-01T12:00:00Z"
  }
}
```

## 🎯 API Endpoints для тестирования

### Инициация OAuth
```bash
GET http://localhost:3000/api/auth/gmail
```

### Callback (автоматический)
```bash
GET http://localhost:3000/api/auth/gmail/callback?code=...
```

### Синхронизация
```bash
POST http://localhost:3000/api/sync/gmail
# Требует авторизации пользователя
```

## 🐛 Отладка

### Проверьте логи браузера
Откройте Developer Tools и проверьте:
- Network tab для HTTP запросов
- Console для JavaScript ошибок

### Проверьте серверные логи
В терминале где запущен `npm run dev` смотрите:
- OAuth errors
- Database errors
- Gmail API errors

### Типичные проблемы

1. **OAuth ошибки**
   - Проверьте GOOGLE_CLIENT_ID и GOOGLE_CLIENT_SECRET
   - Убедитесь что redirect URI точно совпадает

2. **Права доступа**
   - Gmail API должен быть включен
   - Scope должен включать 'gmail.readonly'

3. **Database ошибки**
   - Проверьте что таблицы integrations и raw_feedback существуют
   - Убедитесь в правильности схемы

## ✅ Чек-лист успешного тестирования

- [ ] Google OAuth настроен
- [ ] Переменные окружения установлены
- [ ] Приложение запущено на localhost:3000
- [ ] Пользователь авторизован в системе
- [ ] Gmail успешно подключен (статус "Подключено")
- [ ] Ключевые слова настроены
- [ ] Синхронизация выполнена без ошибок
- [ ] Данные появились в таблице raw_feedback
- [ ] Время последней синхронизации обновилось

## 🎉 Готово!

Если все шаги выполнены успешно, Gmail интеграция работает корректно!