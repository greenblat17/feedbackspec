# Ручная синхронизация Gmail с AI

Система позволяет пользователям вручную анализировать почту Gmail с помощью ИИ для определения фидбека.

## Как это работает

1. **Ручной запуск**: Пользователь нажимает кнопку "🤖 AI Анализ" в интерфейсе
2. **Умная фильтрация по времени**: Система анализирует только новые письма:
   - При первом запуске: письма за последние 7 дней
   - При повторных запусках: письма с момента последней синхронизации
3. **Двухэтапная фильтрация**:
   - Предфильтрация: отсеивает маркетинговые письма и уведомления
   - ИИ анализ: определяет реальный фидбек с высокой точностью
4. **Сохранение результатов**: В базу попадает только настоящий фидбек
5. **Обновление времени**: Система запоминает время последней синхронизации

## Настройка

### 1. Environment Variables

Добавьте в `.env.local`:

```bash
# Не нужен - cron отключен

# Gmail интеграция (уже настроено)
GMAIL_INTEGRATION_CLIENT_ID=your-gmail-client-id
GMAIL_INTEGRATION_CLIENT_SECRET=your-gmail-client-secret
GMAIL_INTEGRATION_REDIRECT_URI=https://your-domain.com/api/auth/gmail/callback

# OpenAI для анализа фидбека
OPENAI_API_KEY=your-openai-api-key
```

### 2. Vercel Deployment

При деплое на Vercel файл `vercel.json` автоматически настраивает cron задачу.

### 3. Альтернативные способы запуска

#### GitHub Actions (если не используете Vercel Cron)

Создайте `.github/workflows/gmail-sync.yml`:

```yaml
name: Gmail Auto Sync
on:
  schedule:
    - cron: '*/15 * * * *'  # Каждые 15 минут
  workflow_dispatch:  # Ручной запуск

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Gmail Sync
        run: |
          curl -X POST https://your-domain.com/api/cron/gmail-sync \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

#### Внешний cron сервис

Настройте любой cron сервис для вызова:
```bash
curl -X POST https://your-domain.com/api/cron/gmail-sync \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Тестирование

### Ручное тестирование

```bash
# Тест для авторизованного пользователя
curl -X POST http://localhost:3000/api/test/auto-sync

# Тест cron endpoint (требует CRON_SECRET)
curl -X POST http://localhost:3000/api/cron/gmail-sync \
  -H "Authorization: Bearer your-cron-secret"
```

### Проверка логов

Логи автоматической синхронизации можно посмотреть в:
- Vercel Dashboard → Functions → Logs
- `console.log` выводы в runtime

## Функции ИИ анализа

### Автоматическое определение:
- **Тип фидбека**: bug, feature, improvement, complaint, praise, question, suggestion
- **Приоритет**: low, medium, high, urgent
- **Настроение**: positive, negative, neutral
- **Бизнес-влияние**: low, medium, high
- **Срочность**: low, medium, high
- **Намерение пользователя**
- **Рекомендуемые действия**

### Фильтрация

Система обрабатывает письма которые:
1. ИИ определяет как фидбек (категория не "general" или уверенность > 70%)
2. Еще не были обработаны ранее

**Важно**: Фильтрация по ключевым словам отключена - AI анализирует все письма для максимальной точности

## Безопасность

- Токены пользователей изолированы
- CRON_SECRET защищает endpoint от несанкционированного доступа
- Автоматическое отключение при истечении токенов
- Обработка ошибок не прерывает синхронизацию других пользователей

## Мониторинг

Система записывает в metadata каждого письма:
- `auto_processed: true` - обработано автоматически
- `processed_at` - время обработки
- `ai_analyzed` - письмо проанализировано AI


## Производительность

- Обрабатывает до 50 писем за запуск на пользователя
- Проверяет только письма за последний час
- Пропускает уже обработанные письма
- Таймаут на анализ ИИ: 30 секунд

## Troubleshooting

### Письма не обрабатываются
1. Проверьте подключение Gmail в UI
2. Проверьте OPENAI_API_KEY
3. Посмотрите логи в Vercel Dashboard
4. Убедитесь что письма не были обработаны ранее

### Токены истекли
Система автоматически помечает интеграцию как отключенную.
Пользователь должен переподключить Gmail.

### Cron не запускается
1. Проверьте `vercel.json` в корне проекта
2. Убедитесь что проект задеплоен на Vercel
3. Проверьте логи в Vercel Dashboard

## API Endpoints

- `POST /api/cron/gmail-sync` - Автоматическая синхронизация (защищен CRON_SECRET)
- `POST /api/test/auto-sync` - Тестирование для авторизованного пользователя
- `POST /api/sync/gmail` - Ручная синхронизация (существующий endpoint)