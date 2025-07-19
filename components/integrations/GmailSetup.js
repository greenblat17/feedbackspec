'use client';

import { useState, useEffect } from 'react';
import { createClient } from '../../libs/supabase/client.js';

export default function GmailSetup() {
  const [gmailIntegration, setGmailIntegration] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Состояния компонента
  const [isConnected, setIsConnected] = useState(false);
  const [keywords, setKeywords] = useState(['feedback', 'bug', 'feature request']);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [testEmails, setTestEmails] = useState([]);
  const [showTestEmails, setShowTestEmails] = useState(false);

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

  const handleConnect = async () => {
    try {
      setIsLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Please log in first');
        return;
      }
      
      // Create OAuth URL with user context
      const response = await fetch('/api/auth/gmail/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          userEmail: user.email
        })
      });
      
      const data = await response.json();
      
      if (data.authUrl) {
        // Redirect to Google OAuth
        window.location.href = data.authUrl;
      } else {
        throw new Error('Failed to get authorization URL');
      }
    } catch (error) {
      console.error('Error initiating Gmail connection:', error);
      alert('Error connecting to Gmail');
      setIsLoading(false);
    }
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
      
      alert('Sync completed successfully');
    } catch (error) {
      console.error('Error in handleSync:', error);
      alert('Error during sync');
    } finally {
      // Установить isLoading: false
      setIsLoading(false);
    }
  };

  const handleAutoSync = async () => {
    try {
      setIsLoading(true);
      
      // Выполнить POST запрос к новому auto-sync endpoint
      const response = await fetch('/api/test/auto-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка автоматической синхронизации');
      }
      
      const data = await response.json();
      
      // Показать результаты
      if (data.success) {
        const timeInfo = data.last_sync_before 
          ? `с ${new Date(data.time_filter).toLocaleString()}`
          : 'за последние 7 дней (первая синхронизация)';
          
        const message = `✅ Анализ завершен!\n\n📊 Обработано: ${data.processed} из ${data.total_emails} писем\n📅 Период: ${timeInfo}\n⏰ Время: ${new Date(data.timestamp).toLocaleString()}`;
        
        if (data.processed_emails && data.processed_emails.length > 0) {
          const processed = data.processed_emails.filter(email => email.status === 'processed');
          const filtered = data.processed_emails.filter(email => email.status === 'filtered_out');
          
          let details = '';
          if (processed.length > 0) {
            const summary = processed
              .map(email => `• ${email.subject} → ${email.category} (${email.priority})`)
              .join('\n');
            details += `\n\n📧 Найден фидбек:\n${summary}`;
          }
          if (filtered.length > 0) {
            details += `\n\n🚫 Отфильтровано: ${filtered.length} маркетинговых/уведомительных писем`;
          }
          if (processed.length === 0) {
            details += '\n\n📭 Новых писем с фидбеком не найдено';
          }
          
          alert(message + details);
        } else {
          alert(message);
        }
      }
      
      // Обновить статус подключения
      await checkConnection();
      
    } catch (error) {
      console.error('Error in handleAutoSync:', error);
      alert(`❌ Ошибка автосинхронизации: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestEmails = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/test/gmail', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch test emails');
      }
      
      const data = await response.json();
      setTestEmails(data.emails || []);
      setShowTestEmails(true);
      
    } catch (error) {
      console.error('Error fetching test emails:', error);
      alert('Error fetching emails');
    } finally {
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
      alert('Gmail disconnected successfully');
    } catch (error) {
      console.error('Error disconnecting Gmail:', error);
      alert('Error disconnecting Gmail');
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
        throw new Error('User not found');
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
      alert('Error updating keywords');
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
              Connect Gmail to automatically collect feedback from emails
            </p>
          </div>
        </div>
        
        {/* Условный рендеринг: если подключен - показать статус и кнопку Sync, иначе - кнопку Connect */}
        <div className="flex items-center space-x-2">
          {isConnected ? (
            <div className="flex items-center space-x-2">
              <span className="px-2 py-1 text-xs font-medium text-green-600 bg-green-100 rounded-full">
                Connected
              </span>
              <button
                onClick={handleSync}
                disabled={isLoading}
                className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {isLoading ? 'Syncing...' : 'Sync'}
              </button>
              <button
                onClick={handleAutoSync}
                disabled={isLoading}
                className="px-3 py-1 text-sm bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
              >
                {isLoading ? 'Анализируем...' : '🤖 AI Анализ'}
              </button>
              <button
                onClick={handleTestEmails}
                disabled={isLoading}
                className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
              >
                {isLoading ? 'Loading...' : 'Test Emails'}
              </button>
              <button
                onClick={async () => {
                  try {
                    setIsLoading(true);
                    const response = await fetch('/api/test-gmail-simple', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' }
                    });
                    const data = await response.json();
                    console.log('Simple test result:', data);
                    alert(response.ok ? 'Gmail API test passed!' : `Test failed: ${data.error}`);
                  } catch (error) {
                    console.error('Test error:', error);
                    alert('Test failed');
                  } finally {
                    setIsLoading(false);
                  }
                }}
                disabled={isLoading}
                className="px-3 py-1 text-sm bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
              >
                Debug Test
              </button>
              <button
                onClick={handleDisconnectGmail}
                disabled={isLoading}
                className="px-3 py-1 text-sm text-red-600 border border-red-300 rounded hover:bg-red-50 disabled:opacity-50"
              >
                {isLoading ? 'Disconnecting...' : 'Disconnect'}
              </button>
            </div>
          ) : (
            <button
              onClick={handleConnect}
              disabled={isLoading}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
            >
              {isLoading ? 'Connecting...' : 'Connect Gmail'}
            </button>
          )}
        </div>
      </div>

      {/* AI Analysis Info */}
      {isConnected && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-2">🤖 AI-Powered Manual Analysis</h4>
          <p className="text-sm text-gray-600">
            Click "🤖 AI Анализ" to manually analyze emails for feedback. The system:
          </p>
          <ul className="mt-2 text-sm text-gray-600 space-y-1">
            <li>• Analyzes only new emails since last sync</li>
            <li>• Identifies bug reports, feature requests, complaints</li>
            <li>• Filters out marketing emails and notifications</li>
            <li>• Saves only genuine feedback to database</li>
            <li>• Remembers last sync time to avoid duplicates</li>
          </ul>
          <div className="mt-3 p-2 bg-blue-50 rounded border-l-4 border-blue-400">
            <p className="text-xs text-blue-700">
              <strong>Manual Control:</strong> Run analysis whenever you want - no automatic background processing
            </p>
          </div>
        </div>
      )}

      {/* Показ времени последней синхронизации если есть */}
      {isConnected && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Sync Status</h4>
          <div className="text-sm text-gray-600">
            {lastSync ? (
              <div>
                <span className="font-medium">Last sync:</span> {new Date(lastSync).toLocaleString()}
              </div>
            ) : (
              <div>
                <span className="font-medium">Last sync:</span> <span className="text-gray-400">Never</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Test Emails Display */}
      {showTestEmails && testEmails.length > 0 && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-900">Last 5 Emails from Gmail</h4>
            <button
              onClick={() => setShowTestEmails(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          <div className="space-y-3">
            {testEmails.map((email, index) => (
              <div key={email.id} className="p-3 bg-white rounded border">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h5 className="text-sm font-medium text-gray-900 truncate">
                      {email.subject}
                    </h5>
                    <p className="text-xs text-gray-600 mt-1">
                      From: {email.from}
                    </p>
                    <p className="text-xs text-gray-500">
                      {email.date}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 ml-2">#{index + 1}</span>
                </div>
                {email.snippet && (
                  <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded mt-2">
                    {email.snippet}
                  </p>
                )}
                {email.body && email.body !== email.snippet && (
                  <p className="text-xs text-gray-700 mt-2 line-clamp-3">
                    {email.body}
                  </p>
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 text-xs text-gray-500 text-center">
            Showing last {testEmails.length} emails from your Gmail inbox
          </div>
        </div>
      )}

      {/* Информация о подключении для неподключенных пользователей */}
      {!isConnected && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">What will be connected:</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Read emails from INBOX folder</li>
            <li>• Automatic feedback search</li>
            <li>• Sync every hour</li>
            <li>• Secure token storage</li>
          </ul>
        </div>
      )}
    </div>
  );
}