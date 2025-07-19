'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/libs/supabase/client';

export default function GmailSetup() {
  const [gmailIntegration, setGmailIntegration] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  
  // Новые состояния компонента
  const [isConnected, setIsConnected] = useState(false);
  const [keywords, setKeywords] = useState(['feedback', 'bug', 'feature request']);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSync, setLastSync] = useState(null);

  const supabase = createClient();

  useEffect(() => {
    checkGmailIntegration();
  }, []);

  const checkGmailIntegration = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: integration } = await supabase
          .from('integrations')
          .select('*')
          .eq('user_id', user.id)
          .eq('platform', 'gmail')
          .eq('is_active', true)
          .single();
        
        if (integration) {
          setGmailIntegration(integration);
          setIsConnected(true);
          
          // Загружаем ключевые слова из конфигурации если есть
          if (integration.config?.keywords) {
            setKeywords(integration.config.keywords);
          }
          
          // Устанавливаем время последней синхронизации
          if (integration.config?.last_sync) {
            setLastSync(integration.config.last_sync);
          }
        } else {
          setIsConnected(false);
        }
      }
    } catch (error) {
      console.error('Error checking Gmail integration:', error);
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectGmail = () => {
    setConnecting(true);
    window.location.href = '/api/auth/gmail';
  };

  const handleDisconnectGmail = async () => {
    if (!gmailIntegration) return;

    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('integrations')
        .update({ is_active: false })
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
    if (!gmailIntegration) return;

    try {
      setIsLoading(true);
      const updatedConfig = {
        ...gmailIntegration.config,
        keywords: newKeywords
      };

      const { error } = await supabase
        .from('integrations')
        .update({ 
          config: updatedConfig,
          updated_at: new Date().toISOString()
        })
        .eq('id', gmailIntegration.id);

      if (error) throw error;

      setKeywords(newKeywords);
      setGmailIntegration({
        ...gmailIntegration,
        config: updatedConfig
      });
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
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
            <svg
              className="w-6 h-6 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819L11.18 12l7.365-9.002h3.819A1.636 1.636 0 0 1 24 5.457Z"/>
              <path d="M10.715 12 2.05 21.002H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-.904.732-1.636 1.636-1.636h.414L10.715 12Z"/>
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Gmail</h3>
            <p className="text-sm text-gray-500">
              Подключите Gmail для автоматического сбора обратной связи
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {isConnected ? (
            <div className="flex items-center space-x-2">
              <span className="px-2 py-1 text-xs font-medium text-green-600 bg-green-100 rounded-full">
                Подключено
              </span>
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
              onClick={handleConnectGmail}
              disabled={connecting || isLoading}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
            >
              {connecting ? 'Подключение...' : 'Подключить Gmail'}
            </button>
          )}
        </div>
      </div>

      {isConnected && gmailIntegration && (
        <>
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Настройки синхронизации</h4>
            <div className="space-y-2 text-sm text-gray-600">
              <div>
                <span className="font-medium">Папка:</span> {gmailIntegration.config?.default_folder || 'INBOX'}
              </div>
              <div>
                <span className="font-medium">Автосинхронизация:</span> {gmailIntegration.config?.auto_sync ? 'Включена' : 'Отключена'}
              </div>
              <div>
                <span className="font-medium">Частота:</span> {gmailIntegration.config?.sync_frequency || 'hourly'}
              </div>
              <div>
                <span className="font-medium">Подключено:</span> {new Date(gmailIntegration.created_at).toLocaleDateString()}
              </div>
              {lastSync && (
                <div>
                  <span className="font-medium">Последняя синхронизация:</span> {new Date(lastSync).toLocaleString()}
                </div>
              )}
            </div>
          </div>

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
                className="flex-1 px-3 py-1 border rounded-md text-sm"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddKeyword(e.target.value);
                    e.target.value = '';
                  }
                }}
                disabled={isLoading}
              />
              <button
                onClick={() => {
                  const input = document.querySelector('input[type="text"]');
                  if (input.value) {
                    handleAddKeyword(input.value);
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
        </>
      )}

      {!gmailIntegration && (
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