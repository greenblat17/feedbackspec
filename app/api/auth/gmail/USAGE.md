# Gmail OAuth API Routes - Простое использование

## 📁 Структура файлов

```
app/api/auth/gmail/
├── route.ts           # Инициация OAuth
├── callback/
│   └── route.ts       # Обработка callback
└── USAGE.md          # Это руководство
```

## 🚀 Быстрое использование

### 1. Инициация OAuth потока

```javascript
// Простое перенаправление на Gmail OAuth
window.location.href = '/api/auth/gmail';
```

### 2. Обработка результата

После авторизации пользователь будет перенаправлен на dashboard с параметрами:

```javascript
// Успешное подключение
// URL: /dashboard?success=gmail_connected

// Ошибка подключения  
// URL: /dashboard?error=gmail_auth_failed

// Обработка в компоненте Dashboard
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const success = urlParams.get('success');
  const error = urlParams.get('error');
  
  if (success === 'gmail_connected') {
    showNotification('Gmail подключен успешно!', 'success');
  }
  
  if (error === 'gmail_auth_failed') {
    showNotification('Ошибка подключения Gmail', 'error');
  }
}, []);
```

## 📊 Структура данных в integrations таблице

После успешной авторизации в таблице `integrations` создается запись:

```json
{
  "user_id": "uuid-пользователя",
  "platform": "gmail",
  "access_token": "токен-доступа",
  "refresh_token": "токен-обновления",
  "token_type": "Bearer",
  "scope": "gmail-разрешения",
  "expires_at": "2023-01-01T01:00:00Z",
  "config": {
    "default_folder": "INBOX",
    "auto_sync": true,
    "sync_frequency": "hourly"
  },
  "is_active": true,
  "created_at": "2023-01-01T00:00:00Z",
  "updated_at": "2023-01-01T00:00:00Z"
}
```

## 🔧 Требуемые переменные окружения

```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/auth/gmail/callback
```

## 🗄️ Требуемая структура таблицы integrations

```sql
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  platform TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_type TEXT DEFAULT 'Bearer',
  scope TEXT,
  expires_at TIMESTAMPTZ,
  config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🔄 Простой React компонент

```tsx
import { useState } from 'react';

export function GmailConnectButton() {
  const [connecting, setConnecting] = useState(false);
  
  const handleConnect = () => {
    setConnecting(true);
    window.location.href = '/api/auth/gmail';
  };
  
  return (
    <button 
      onClick={handleConnect}
      disabled={connecting}
      className="bg-red-500 text-white px-4 py-2 rounded"
    >
      {connecting ? 'Подключение...' : 'Подключить Gmail'}
    </button>
  );
}
```

## ✅ Проверка статуса подключения

```javascript
// Проверить есть ли активная интеграция Gmail
const checkGmailIntegration = async () => {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    const { data: integration } = await supabase
      .from('integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'gmail')
      .eq('is_active', true)
      .single();
    
    return !!integration;
  }
  
  return false;
};
```

## 🚨 Обработка ошибок

API routes автоматически обрабатывают основные ошибки:

- Отсутствие кода авторизации
- Ошибки от Google OAuth
- Проблемы с аутентификацией пользователя
- Ошибки сохранения в базу данных

Все ошибки приводят к редиректу на `/dashboard?error=gmail_auth_failed`.