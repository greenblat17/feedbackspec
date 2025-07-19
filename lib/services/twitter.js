/**
 * Twitter Service for searching tweets and interacting with Twitter API v2
 * Основные методы для работы с Twitter API и поиска твитов
 */
class TwitterService {
  constructor() {
    this.bearerToken = process.env.TWITTER_BEARER_TOKEN;
    this.lastRequestTime = 0;
    this.minRequestInterval = 1000; // Minimum 1 second between requests
    
    if (!this.bearerToken) {
      console.warn('Twitter Bearer Token not found. Twitter integration will not work.');
    }
  }

  /**
   * Поиск твитов по ключевым словам
   * @param {string[]} keywords - Массив ключевых слов для поиска
   * @param {number} maxResults - Максимальное количество результатов (по умолчанию 100)
   * @returns {Promise<Object[]>} Массив твитов с информацией об авторах
   */
  async searchTweets(keywords, maxResults = 100) {
    try {
      if (!this.bearerToken) {
        throw new Error('Twitter Bearer Token is not configured. Please set TWITTER_BEARER_TOKEN in your environment variables.');
      }

      if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
        throw new Error('Keywords parameter is required and must be a non-empty array');
      }

      console.log(`🔍 Searching Twitter for keywords: ${keywords.join(', ')}`);

      // Simple rate limiting - wait if necessary
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      if (timeSinceLastRequest < this.minRequestInterval) {
        const waitTime = this.minRequestInterval - timeSinceLastRequest;
        console.log(`⏳ Rate limiting: waiting ${waitTime}ms before request`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      this.lastRequestTime = Date.now();

      // Создать поисковый запрос
      const query = keywords.join(' OR ');
      
      // Создать URL для Twitter API v2
      const url = new URL('https://api.twitter.com/2/tweets/search/recent');
      
      // Добавить параметры запроса
      url.searchParams.append('query', query);
      url.searchParams.append('max_results', maxResults.toString());
      url.searchParams.append('tweet.fields', 'created_at,author_id,public_metrics');
      url.searchParams.append('user.fields', 'username,public_metrics');
      url.searchParams.append('expansions', 'author_id');

      console.log(`📡 Twitter API URL: ${url.toString()}`);

      // Выполнить запрос к Twitter API
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.bearerToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('Twitter API error response:', errorData);
        
        // Handle rate limiting specifically
        if (response.status === 429) {
          const resetTime = response.headers.get('x-rate-limit-reset');
          const resetDate = resetTime ? new Date(parseInt(resetTime) * 1000) : new Date(Date.now() + 15 * 60 * 1000);
          const waitMinutes = Math.ceil((resetDate - new Date()) / 60000);
          
          throw new Error(`Twitter API rate limit exceeded. Please wait ${waitMinutes} minutes before trying again. Rate limit resets at ${resetDate.toLocaleTimeString()}.`);
        }
        
        // Handle other common errors
        if (response.status === 401) {
          throw new Error('Twitter API authentication failed. Please check your TWITTER_BEARER_TOKEN.');
        }
        
        if (response.status === 403) {
          throw new Error('Twitter API access forbidden. Your app may not have the required permissions or the bearer token is invalid.');
        }
        
        throw new Error(`Twitter API request failed with status ${response.status}: ${errorData?.title || errorData?.detail || response.statusText}`);
      }

      // Получить JSON ответ
      const data = await response.json();
      console.log(`📊 Twitter API response received, processing ${data.data?.length || 0} tweets`);

      // Обработать ответ API
      const tweets = data.data || [];
      const users = data.includes?.users || [];

      // Обработать каждый твит и добавить информацию об авторе
      const processedTweets = tweets.map(tweet => {
        // Найти автора твита
        const author = users.find(user => user.id === tweet.author_id);

        return {
          id: tweet.id,
          text: tweet.text,
          created_at: tweet.created_at,
          author: {
            id: tweet.author_id,
            username: author?.username || 'unknown',
            followers: author?.public_metrics?.followers_count || 0
          },
          metrics: {
            retweet_count: tweet.public_metrics?.retweet_count || 0,
            like_count: tweet.public_metrics?.like_count || 0,
            reply_count: tweet.public_metrics?.reply_count || 0,
            quote_count: tweet.public_metrics?.quote_count || 0
          }
        };
      });

      console.log(`✅ Successfully processed ${processedTweets.length} tweets from Twitter`);

      return {
        tweets: processedTweets,
        totalFound: processedTweets.length,
        searchQuery: query,
        nextToken: data.meta?.next_token || null
      };

    } catch (error) {
      console.error('Failed to search tweets:', error);
      throw new Error(`Failed to search tweets: ${error.message}`);
    }
  }

  /**
   * Получить информацию о пользователе по username
   * @param {string} username - Имя пользователя Twitter (без @)
   * @returns {Promise<Object>} Информация о пользователе
   */
  async getUserByUsername(username) {
    try {
      if (!this.bearerToken) {
        throw new Error('Twitter Bearer Token is not configured');
      }

      if (!username) {
        throw new Error('Username parameter is required');
      }

      const url = new URL(`https://api.twitter.com/2/users/by/username/${username}`);
      url.searchParams.append('user.fields', 'username,public_metrics,description,verified');

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.bearerToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(`Twitter API request failed with status ${response.status}: ${errorData?.title || response.statusText}`);
      }

      const data = await response.json();
      return data.data;

    } catch (error) {
      console.error(`Failed to get user ${username}:`, error);
      throw new Error(`Failed to get user information: ${error.message}`);
    }
  }

  /**
   * Извлечь фидбек из твита
   * @param {Object} tweet - Объект твита
   * @returns {Object} Форматированный объект фидбека
   */
  extractFeedbackFromTweet(tweet) {
    return {
      title: `Tweet from @${tweet.author.username}`,
      content: tweet.text,
      source: 'twitter',
      metadata: {
        tweetId: tweet.id,
        authorId: tweet.author.id,
        username: tweet.author.username,
        createdAt: tweet.created_at,
        metrics: tweet.metrics,
        followers: tweet.author.followers
      },
      tags: ['twitter', 'social'],
      priority: this.determinePriority(tweet),
      category: this.categorizeTweet(tweet)
    };
  }

  /**
   * Определить приоритет твита на основе метрик
   * @param {Object} tweet - Объект твита
   * @returns {string} Уровень приоритета (low, medium, high)
   */
  determinePriority(tweet) {
    const { like_count, retweet_count, reply_count } = tweet.metrics;
    const totalEngagement = like_count + retweet_count + reply_count;
    
    // Высокий приоритет для твитов с большой активностью
    if (totalEngagement > 100 || tweet.author.followers > 10000) {
      return 'high';
    }
    
    // Средний приоритет для твитов с умеренной активностью
    if (totalEngagement > 10 || tweet.author.followers > 1000) {
      return 'medium';
    }
    
    return 'low';
  }

  /**
   * Категоризировать твит на основе содержимого
   * @param {Object} tweet - Объект твита
   * @returns {string} Категория твита
   */
  categorizeTweet(tweet) {
    const text = tweet.text.toLowerCase();
    
    if (text.includes('bug') || text.includes('error') || text.includes('issue') || text.includes('problem')) {
      return 'bug';
    }
    
    if (text.includes('feature') || text.includes('suggestion') || text.includes('improve') || text.includes('enhancement')) {
      return 'feature';
    }
    
    if (text.includes('question') || text.includes('help') || text.includes('support') || text.includes('how')) {
      return 'support';
    }
    
    if (text.includes('love') || text.includes('great') || text.includes('awesome') || text.includes('amazing')) {
      return 'praise';
    }
    
    return 'general';
  }

  /**
   * Проверить конфигурацию сервиса
   * @returns {boolean} Статус конфигурации
   */
  isConfigured() {
    return !!this.bearerToken;
  }

  /**
   * Получить статистику работы сервиса
   * @returns {Object} Статистика сервиса
   */
  getStats() {
    return {
      isConfigured: this.isConfigured(),
      hasBearerToken: !!this.bearerToken
    };
  }
}

// Создать и экспортировать singleton экземпляр
const twitterService = new TwitterService();

module.exports = {
  TwitterService,
  twitterService
};