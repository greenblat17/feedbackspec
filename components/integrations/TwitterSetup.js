'use client';

import { useState, useEffect } from 'react';
import { createClient } from '../../libs/supabase/client.js';

export default function TwitterSetup() {
  // Состояния компонента
  const [productName, setProductName] = useState('');
  const [handle, setHandle] = useState('');
  const [customKeywords, setCustomKeywords] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  // useEffect для проверки подключения при монтировании компонента
  useEffect(() => {
    checkConnection();
  }, []);

  /**
   * Проверить существующее подключение Twitter
   */
  const checkConnection = async () => {
    try {
      // Получаем текущего пользователя
      const { data: { user } } = await supabase.auth.getUser();
      
      // Если нет пользователя, выходим из функции
      if (!user) {
        setIsConnected(false);
        return;
      }
      
      // Запрос к таблице integrations для Twitter платформы
      const { data: integration, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('user_id', user.id)
        .eq('platform', 'twitter')
        .eq('status', 'connected')
        .single();
        
      if (error && error.code !== 'PGRST116') {
        // PGRST116 = No rows found
        console.error('Error checking Twitter connection:', error);
      }
      
      if (integration) {
        // Устанавливаем isConnected в true
        setIsConnected(true);
        
        // Обновляем состояния из config
        if (integration.config) {
          setProductName(integration.config.product_name || '');
          setHandle(integration.config.handle || '');
          setCustomKeywords(integration.config.custom_keywords || '');
        }
        
        // Устанавливаем lastSync
        if (integration.last_sync) {
          setLastSync(integration.last_sync);
        }
      } else {
        // Нет активной интеграции
        setIsConnected(false);
        setLastSync(null);
      }
    } catch (error) {
      console.error('Error in checkConnection:', error);
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Генерировать ключевые слова для поиска Twitter
   */
  const generateKeywords = () => {
    const keywords = [];
    
    // Если указан handle, добавить его
    if (handle.trim()) {
      const cleanHandle = handle.trim().replace('@', '');
      keywords.push(`@${cleanHandle}`);
    }
    
    // Если указан productName, добавить его в разных вариантах
    if (productName.trim()) {
      keywords.push(productName.trim());
      keywords.push(`"${productName.trim()}"`);
    }
    
    // Если указаны customKeywords, добавить их
    if (customKeywords.trim()) {
      const customWords = customKeywords
        .split(',')
        .map(word => word.trim())
        .filter(word => word.length > 0);
      keywords.push(...customWords);
    }
    
    // Отфильтровать пустые значения и убрать дубликаты
    return [...new Set(keywords.filter(keyword => keyword.length > 0))];
  };

  /**
   * Настроить Twitter интеграцию
   */
  const handleSetup = async () => {
    try {
      setIsLoading(true);
      
      // Получить пользователя через supabase
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('User not found');
      }

      // Сгенерировать keywords
      const keywords = generateKeywords();
      
      if (keywords.length === 0) {
        throw new Error('Please provide at least one search parameter');
      }

      // Выполнить upsert в integrations
      const { error } = await supabase
        .from('integrations')
        .upsert({
          user_id: user.id,
          platform: 'twitter',
          status: 'connected',
          config: {
            product_name: productName.trim(),
            handle: handle.trim(),
            custom_keywords: customKeywords.trim(),
            keywords: keywords
          },
          last_sync: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,platform'
        });

      if (error) throw error;

      // Установить isConnected: true
      setIsConnected(true);
      alert('Twitter integration setup successfully!');
      
    } catch (error) {
      console.error('Error setting up Twitter integration:', error);
      alert(`Error setting up Twitter: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Синхронизировать Twitter
   */
  const handleSync = async () => {
    try {
      setIsLoading(true);
      
      // Выполнить POST запрос к /api/sync/twitter
      const response = await fetch('/api/sync/twitter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle rate limiting specifically
        if (response.status === 429) {
          throw new Error(`Twitter API rate limit exceeded. ${errorData.message || 'Please wait before trying again.'}`);
        }
        
        throw new Error(errorData.error || 'Twitter sync failed');
      }
      
      const data = await response.json();
      
      // Обновить состояние
      await checkConnection();
      
      alert(`Twitter sync completed! Processed ${data.processed || 0} tweets.`);
    } catch (error) {
      console.error('Error in handleSync:', error);
      alert('Error during Twitter sync');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Отключить Twitter интеграцию
   */
  const handleDisconnect = async () => {
    try {
      setIsLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('integrations')
        .update({ 
          status: 'disconnected',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('platform', 'twitter');

      if (error) throw error;

      setIsConnected(false);
      setLastSync(null);
      alert('Twitter disconnected successfully');
    } catch (error) {
      console.error('Error disconnecting Twitter:', error);
      alert('Error disconnecting Twitter');
    } finally {
      setIsLoading(false);
    }
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

  // Получить сгенерированные keywords для превью
  const previewKeywords = generateKeywords();

  return (
    <div className="p-6 bg-white rounded-lg border">
      {/* Header с иконкой Twitter, названием и описанием */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="text-2xl">🐦</div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Twitter</h3>
            <p className="text-sm text-gray-500">
              Monitor Twitter for mentions and feedback about your product
            </p>
          </div>
        </div>
        
        {/* Условный рендеринг: если подключен - показать статус и кнопку Sync, иначе - кнопку Setup */}
        <div className="flex items-center space-x-2">
          {isConnected ? (
            <div className="flex items-center space-x-2">
              <span className="px-2 py-1 text-xs font-medium text-blue-600 bg-blue-100 rounded-full">
                Connected
              </span>
              <button
                onClick={handleSync}
                disabled={isLoading}
                className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {isLoading ? 'Syncing...' : 'Sync Now'}
              </button>
              <button
                onClick={handleDisconnect}
                disabled={isLoading}
                className="px-3 py-1 text-sm text-red-600 border border-red-300 rounded hover:bg-red-50 disabled:opacity-50"
              >
                {isLoading ? 'Disconnecting...' : 'Disconnect'}
              </button>
            </div>
          ) : (
            <button
              onClick={handleSetup}
              disabled={isLoading || !productName.trim()}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {isLoading ? 'Setting up...' : 'Setup Twitter'}
            </button>
          )}
        </div>
      </div>

      {/* Если не подключен: форма настройки */}
      {!isConnected && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-4">Twitter Monitoring Setup</h4>
          
          <div className="space-y-4">
            {/* Product Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product Name *
              </label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g., MyApp, Product Name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isLoading}
              />
              <p className="text-xs text-gray-500 mt-1">
                The name of your product to monitor mentions for
              </p>
            </div>

            {/* Twitter Handle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Twitter Handle (optional)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500 text-sm">@</span>
                <input
                  type="text"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="username"
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isLoading}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Your company/product Twitter handle to monitor mentions
              </p>
            </div>

            {/* Additional Keywords */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Additional Keywords (optional)
              </label>
              <input
                type="text"
                value={customKeywords}
                onChange={(e) => setCustomKeywords(e.target.value)}
                placeholder="feedback, bug report, feature request"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isLoading}
              />
              <p className="text-xs text-gray-500 mt-1">
                Comma-separated keywords to search for (in addition to product name)
              </p>
            </div>

            {/* Preview Keywords */}
            {previewKeywords.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Preview
                </label>
                <div className="flex flex-wrap gap-2">
                  {previewKeywords.map((keyword, index) => (
                    <span 
                      key={index}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Twitter will be searched for tweets containing any of these terms
                </p>
              </div>
            )}
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
          
          {/* Show current keywords */}
          {previewKeywords.length > 0 && (
            <div className="mt-3">
              <span className="text-sm font-medium text-gray-700">Monitoring keywords:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {previewKeywords.map((keyword, index) => (
                  <span 
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Информация о подключении для неподключенных пользователей */}
      {!isConnected && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">What will be monitored:</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Recent tweets mentioning your product</li>
            <li>• Replies and mentions of your Twitter handle</li>
            <li>• Custom keywords you specify</li>
            <li>• Automatic feedback categorization</li>
          </ul>
        </div>
      )}
    </div>
  );
}