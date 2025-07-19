'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/libs/supabase/client';

export default function GmailSetup() {
  const [gmailIntegration, setGmailIntegration] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Состояния компонента
  const [isConnected, setIsConnected] = useState(false);
  const [keywords, setKeywords] = useState(['feedback', 'bug', 'feature request']);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSync, setLastSync] = useState(null);

  const supabase = createClient();

  // useEffect для проверки подключения при монтировании компонента
  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      // Получаем текущего пользователя
      const { data: { user } } = await supabase.auth.getUser();
      
      // Если нет пользователя, выходим из функции
      if (!user) {
        setIsConnected(false);
        return;
      }
      
      // Запрос к таблице integrations
      const { data: integration, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('user_id', user.id)
        .eq('platform', 'gmail')
        .eq('status', 'connected')
        .single();
        
      if (error && error.code !== 'PGRST116') {
        // PGRST116 = No rows found
        console.error('Error checking connection:', error);
      }
      
      if (integration) {
        // Устанавливаем isConnected в true
        setIsConnected(true);
        
        // Сохраняем данные интеграции
        setGmailIntegration(integration);
        
        // Обновляем keywords из config
        if (integration.config?.keywords && Array.isArray(integration.config.keywords)) {
          setKeywords(integration.config.keywords);
        }
        
        // Устанавливаем lastSync
        if (integration.last_sync) {
          setLastSync(integration.last_sync);
        }
      } else {
        // Нет активной интеграции
        setIsConnected(false);
        setGmailIntegration(null);
        setLastSync(null);
      }
    } catch (error) {
      console.error('Error in checkConnection:', error);
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  // Для обратной совместимости оставляем старое имя функции
  const checkGmailIntegration = checkConnection;

  const handleConnect = () => {
    // Установить isLoading: true
    setIsLoading(true);
    
    // Выполнить редирект
    window.location.href = '/api/auth/gmail';
  };
  
  // Для обратной совместимости оставляем старое имя функции
  const handleConnectGmail = handleConnect;

  const handleSync = async () => {
    try {
      // Установить isLoading: true
      setIsLoading(true);
      
      // Выполнить POST запрос к /api/sync/gmail
      const response = await fetch('/api/sync/gmail', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Ошибка синхронизации');
      }
      
      // Вызвать checkConnection() для обновления статуса
      await checkConnection();
      
      alert('Синхронизация выполнена успешно');
    } catch (error) {
      console.error('Error in handleSync:', error);
      alert('Ошибка при синхронизации');
    } finally {
      // Установить isLoading: false
      setIsLoading(false);
    }
  };

  const handleDisconnectGmail = async () => {
    if (!gmailIntegration) return;

    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('integrations')
        .update({ 
          status: 'disconnected',
          updated_at: new Date().toISOString()
        })
        .eq('id', gmailIntegration.id);

      if (error) throw error;

      setGmailIntegration(null);
      setIsConnected(false);
      setLastSync(null);
      alert('Gmail отключен успешно');
    } catch (error) {
      console.error('Error disconnecting Gmail:', error);
      alert('Ошибка при отключении Gmail');
    } finally {
      setIsLoading(false);
    }
  };

  const updateKeywords = async (newKeywords) => {
    try {
      setIsLoading(true);
      
      // Получить пользователя через supabase.auth.getUser()
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('Пользователь не найден');
      }

      // Обновить config в integrations
      const { error } = await supabase
        .from('integrations')
        .update({ 
          config: { keywords: newKeywords },
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('platform', 'gmail');

      if (error) throw error;

      setKeywords(newKeywords);
      
      // Обновляем локальное состояние gmailIntegration
      if (gmailIntegration) {
        setGmailIntegration({
          ...gmailIntegration,
          config: { ...gmailIntegration.config, keywords: newKeywords }
        });
      }
    } catch (error) {
      console.error('Error updating keywords:', error);
      alert('Ошибка при обновлении ключевых слов');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddKeyword = (keyword) => {
    if (keyword && !keywords.includes(keyword)) {
      updateKeywords([...keywords, keyword]);
    }
  };

  const handleRemoveKeyword = (keyword) => {
    updateKeywords(keywords.filter(k => k !== keyword));
  };

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-lg border">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg border">
      {/* Header с иконкой Gmail, названием и описанием */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="text-2xl">📧</div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Gmail</h3>
            <p className="text-sm text-gray-500">
              Подключите Gmail для автоматического сбора обратной связи
            </p>
          </div>
        </div>
        
        {/* Условный рендеринг: если подключен - показать статус и кнопку Sync, иначе - кнопку Connect */}
        <div className="flex items-center space-x-2">
          {isConnected ? (
            <div className="flex items-center space-x-2">
              <span className="px-2 py-1 text-xs font-medium text-green-600 bg-green-100 rounded-full">
                Подключено
              </span>
              <button
                onClick={handleSync}
                disabled={isLoading}
                className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {isLoading ? 'Синхронизация...' : 'Sync'}
              </button>
              <button
                onClick={handleDisconnectGmail}
                disabled={isLoading}
                className="px-3 py-1 text-sm text-red-600 border border-red-300 rounded hover:bg-red-50 disabled:opacity-50"
              >
                {isLoading ? 'Отключение...' : 'Отключить'}
              </button>
            </div>
          ) : (
            <button
              onClick={handleConnect}
              disabled={isLoading}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
            >
              {isLoading ? 'Подключение...' : 'Connect'}
            </button>
          )}
        </div>
      </div>

      {/* Если подключен: форма для редактирования keywords с onBlur вызовом updateKeywords */}
      {isConnected && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Ключевые слова для поиска</h4>
          <div className="flex flex-wrap gap-2 mb-3">
            {keywords.map((keyword, index) => (
              <span 
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-700"
              >
                {keyword}
                <button
                  onClick={() => handleRemoveKeyword(keyword)}
                  disabled={isLoading}
                  className="ml-2 text-blue-500 hover:text-blue-700 disabled:opacity-50"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Добавить ключевое слово"
              className="flex-1 px-3 py-1 border rounded-md text-sm disabled:opacity-50"
              onBlur={(e) => {
                if (e.target.value.trim()) {
                  handleAddKeyword(e.target.value.trim());
                  e.target.value = '';
                }
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  if (e.target.value.trim()) {
                    handleAddKeyword(e.target.value.trim());
                    e.target.value = '';
                  }
                }
              }}
              disabled={isLoading}
            />
            <button
              onClick={() => {
                const input = document.querySelector('input[type="text"]');
                if (input.value.trim()) {
                  handleAddKeyword(input.value.trim());
                  input.value = '';
                }
              }}
              disabled={isLoading}
              className="px-4 py-1 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 disabled:opacity-50"
            >
              Добавить
            </button>
          </div>
        </div>
      )}

      {/* Показ времени последней синхронизации если есть */}
      {isConnected && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Статус синхронизации</h4>
          <div className="text-sm text-gray-600">
            {lastSync ? (
              <div>
                <span className="font-medium">Последняя синхронизация:</span> {new Date(lastSync).toLocaleString()}
              </div>
            ) : (
              <div>
                <span className="font-medium">Последняя синхронизация:</span> <span className="text-gray-400">Еще не выполнялась</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Информация о подключении для неподключенных пользователей */}
      {!isConnected && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Что будет подключено:</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Чтение писем из папки INBOX</li>
            <li>• Автоматический поиск обратной связи</li>
            <li>• Синхронизация каждый час</li>
            <li>• Безопасное хранение токенов</li>
          </ul>
        </div>
      )}
    </div>
  );
}