# Gmail OAuth API Routes

Набор API маршрутов для интеграции с Gmail через OAuth 2.0 авторизацию.

## 🔧 Настройка

Убедитесь, что у вас настроены следующие переменные окружения:

```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/auth/gmail/callback
```

## 📚 API Endpoints

### 1. Инициация OAuth потока

**GET** `/api/auth/gmail`

Запускает OAuth поток для авторизации Gmail.

#### Параметры запроса:
- `returnUrl` (optional) - URL для редиректа после успешной авторизации (по умолчанию: `/dashboard`)
- `scopes` (optional) - JSON массив дополнительных OAuth scopes

#### Пример использования:
```javascript
// Простой редирект
window.location.href = '/api/auth/gmail';

// С параметрами
window.location.href = '/api/auth/gmail?returnUrl=/settings&scopes=["https://www.googleapis.com/auth/gmail.send"]';
```

#### Ответ:
- **302** - Редирект на Google OAuth страницу
- **401** - Пользователь не аутентифицирован
- **503** - Gmail сервис недоступен

---

### 2. Получение OAuth URL (без редиректа)

**POST** `/api/auth/gmail`

Возвращает OAuth URL без автоматического редиректа.

#### Тело запроса:
```json
{
  "returnUrl": "/dashboard",
  "customScopes": ["https://www.googleapis.com/auth/gmail.readonly"]
}
```

#### Пример использования:
```javascript
const response = await fetch('/api/auth/gmail', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    returnUrl: '/settings',
    customScopes: ['https://www.googleapis.com/auth/gmail.readonly']
  })
});

const data = await response.json();
if (data.success) {
  window.location.href = data.authUrl;
}
```

#### Ответ:
```json
{
  "success": true,
  "authUrl": "https://accounts.google.com/oauth/authorize?...",
  "state": "encoded_state_data",
  "expiresIn": 600,
  "timestamp": "2023-01-01T00:00:00.000Z"
}
```

---

### 3. OAuth Callback

**GET** `/api/auth/gmail/callback`

Обрабатывает callback от Google OAuth. Этот endpoint автоматически вызывается Google.

#### Параметры запроса (автоматически добавляются Google):
- `code` - Код авторизации
- `state` - Состояние для защиты от CSRF
- `error` (optional) - Код ошибки от Google

#### Поведение:
- **302** - Редирект на `returnUrl` с параметрами успеха/ошибки
- Сохраняет токены в базу данных
- Получает и сохраняет информацию о Gmail профиле

---

### 4. Проверка статуса подключения

**GET** `/api/auth/gmail/status`

Проверяет текущий статус подключения Gmail аккаунта.

#### Пример использования:
```javascript
const response = await fetch('/api/auth/gmail/status');
const data = await response.json();

if (data.success) {
  console.log('Gmail connected:', data.data.isConnected);
  console.log('Email:', data.data.profile?.emailAddress);
}
```

#### Ответ:
```json
{
  "success": true,
  "data": {
    "isConnected": true,
    "connectionValid": true,
    "profile": {
      "emailAddress": "user@gmail.com",
      "messagesTotal": 1234,
      "threadsTotal": 567
    },
    "connectionDetails": {
      "connectedAt": "2023-01-01T00:00:00.000Z",
      "lastUpdated": "2023-01-01T00:00:00.000Z",
      "tokenExpiresAt": "2023-01-01T01:00:00.000Z",
      "scope": "https://www.googleapis.com/auth/gmail.readonly"
    },
    "syncHistory": [...],
    "serviceStatus": {
      "isConfigured": true,
      "lastCheck": "2023-01-01T00:00:00.000Z"
    }
  },
  "timestamp": "2023-01-01T00:00:00.000Z"
}
```

---

### 5. Отключение Gmail аккаунта

**DELETE** `/api/auth/gmail/status`

Отключает Gmail аккаунт и деактивирует сохраненные токены.

#### Пример использования:
```javascript
const response = await fetch('/api/auth/gmail/status', {
  method: 'DELETE'
});

const data = await response.json();
if (data.success) {
  console.log('Gmail disconnected successfully');
}
```

#### Ответ:
```json
{
  "success": true,
  "message": "Gmail account disconnected successfully",
  "timestamp": "2023-01-01T00:00:00.000Z"
}
```

## 🔄 Полный поток интеграции

### Фронтенд компонент для подключения Gmail:

```javascript
import { useState, useEffect } from 'react';

export function GmailIntegration() {
  const [gmailStatus, setGmailStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkGmailStatus();
  }, []);

  const checkGmailStatus = async () => {
    try {
      const response = await fetch('/api/auth/gmail/status');
      const data = await response.json();
      setGmailStatus(data.data);
    } catch (error) {
      console.error('Failed to check Gmail status:', error);
    } finally {
      setLoading(false);
    }
  };

  const connectGmail = () => {
    window.location.href = '/api/auth/gmail?returnUrl=/settings';
  };

  const disconnectGmail = async () => {
    try {
      const response = await fetch('/api/auth/gmail/status', {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setGmailStatus({ isConnected: false });
        alert('Gmail disconnected successfully');
      }
    } catch (error) {
      console.error('Failed to disconnect Gmail:', error);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="gmail-integration">
      <h3>Gmail Integration</h3>
      
      {gmailStatus?.isConnected ? (
        <div>
          <p>✅ Connected: {gmailStatus.profile?.emailAddress}</p>
          <p>Messages: {gmailStatus.profile?.messagesTotal}</p>
          <button onClick={disconnectGmail}>Disconnect Gmail</button>
        </div>
      ) : (
        <div>
          <p>❌ Gmail not connected</p>
          <button onClick={connectGmail}>Connect Gmail</button>
        </div>
      )}
    </div>
  );
}
```

## 🗄️ Структура базы данных

API ожидает следующие таблицы в Supabase:

### gmail_tokens
```sql
CREATE TABLE gmail_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_type TEXT DEFAULT 'Bearer',
  scope TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  disconnected_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);
```

### gmail_profiles
```sql
CREATE TABLE gmail_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL UNIQUE,
  email_address TEXT NOT NULL,
  messages_total INTEGER,
  threads_total INTEGER,
  history_id TEXT,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  last_sync_at TIMESTAMPTZ,
  disconnected_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);
```

### gmail_auth_attempts
```sql
CREATE TABLE gmail_auth_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  state TEXT NOT NULL,
  return_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  success BOOLEAN
);
```

## 🔒 Безопасность

- **CSRF Protection**: Использование state parameter для защиты от CSRF атак
- **Token Security**: Токены хранятся зашифрованными в базе данных
- **Session Validation**: Проверка аутентификации пользователя на каждом запросе
- **State Expiration**: State токены действительны только 10 минут
- **Secure Cookies**: HttpOnly cookies для хранения состояния

## 🚨 Обработка ошибок

Все ошибки логируются через систему мониторинга и возвращают структурированные ответы:

```json
{
  "error": true,
  "message": "Human-readable error message",
  "code": "ERROR_CODE",
  "timestamp": "2023-01-01T00:00:00.000Z"
}
```

Коды ошибок:
- `VALIDATION_ERROR` - Ошибки валидации (401)
- `EXTERNAL_SERVICE_ERROR` - Ошибки Gmail API (503)
- `GMAIL_AUTH_ERROR` - Общие ошибки авторизации (500)

## 📋 Требования

- Next.js 13+ с App Router
- Supabase для аутентификации и хранения данных
- Google OAuth 2.0 настройки
- Существующая система обработки ошибок (`libs/errors/error-handler`)
- Gmail сервис (`lib/services/gmail`)