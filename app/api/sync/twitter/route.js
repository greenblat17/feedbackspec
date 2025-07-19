import { NextResponse } from 'next/server';
import { createClient } from '../../../../libs/supabase/server.js';
const { TwitterService } = require('../../../../libs/services/twitter.js');

/**
 * Twitter sync route
 * POST /api/sync/twitter - Synchronizes Twitter tweets and saves as feedback
 */
export async function POST(request) {
  try {
    // Создаем Supabase клиент
    const supabase = createClient();
    
    // Проверить авторизацию пользователя
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    // Если нет user, вернуть 401 ошибку
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Получить Twitter интеграцию
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'twitter')
      .eq('status', 'connected')
      .single();
    
    // Если нет integration, вернуть 400 ошибку
    if (integrationError || !integration) {
      return NextResponse.json({ error: 'Twitter not connected' }, { status: 400 });
    }
    
    // Проверить наличие keywords в config
    const keywords = integration.config?.keywords || [];
    if (!keywords || keywords.length === 0) {
      return NextResponse.json({ error: 'No keywords configured for Twitter monitoring' }, { status: 400 });
    }
    
    console.log('Starting Twitter sync...');
    console.log('Keywords:', keywords);
    
    // Инициализировать TwitterService
    const twitterService = new TwitterService();
    
    // Проверить конфигурацию Twitter сервиса
    if (!twitterService.isConfigured()) {
      return NextResponse.json({ 
        error: 'Twitter service not configured. Please set TWITTER_BEARER_TOKEN in environment variables.' 
      }, { status: 500 });
    }
    
    // Получить твиты
    console.log('Fetching tweets from Twitter...');
    let tweetsResult;
    try {
      tweetsResult = await twitterService.searchTweets(keywords, 50);
      console.log('Retrieved tweets successfully:', tweetsResult);
    } catch (twitterError) {
      console.error('Twitter API error details:', twitterError);
      console.error('Twitter API error message:', twitterError.message);
      
      // Handle specific Twitter API errors
      if (twitterError.message && twitterError.message.includes('rate limit exceeded')) {
        return NextResponse.json({ 
          error: 'Twitter API rate limit exceeded',
          message: twitterError.message,
          retryAfter: 'Please wait before trying again'
        }, { status: 429 });
      }
      
      if (twitterError.message && twitterError.message.includes('401')) {
        return NextResponse.json({ 
          error: 'Twitter authentication failed. Please check TWITTER_BEARER_TOKEN.' 
        }, { status: 401 });
      }
      
      if (twitterError.message && twitterError.message.includes('403')) {
        return NextResponse.json({ 
          error: 'Twitter API access forbidden. Please check your Twitter API permissions.' 
        }, { status: 403 });
      }
      
      throw twitterError; // Re-throw to be caught by outer catch
    }
    
    if (!tweetsResult || !tweetsResult.tweets) {
      console.log('No tweets found');
      return NextResponse.json({
        success: true,
        processed: 0,
        total: 0,
        message: 'No tweets found for the specified keywords'
      });
    }
    
    const tweets = tweetsResult.tweets;
    console.log(`Processing ${tweets.length} tweets...`);
    
    // Инициализировать счетчик
    let processedCount = 0;
    
    // Для каждого твита проверить дубликаты и сохранить
    for (const tweet of tweets) {
      try {
        console.log(`Processing tweet: ${tweet.id}`);
        
        // Запрос к raw_feedback для проверки дубликатов
        const { data: existing } = await supabase
          .from('raw_feedback')
          .select('id')
          .eq('platform', 'twitter')
          .eq('source_id', tweet.id)
          .single();
        
        // Если existing, пропустить итерацию
        if (existing) {
          console.log(`Tweet ${tweet.id} already exists, skipping`);
          continue;
        }
        
        // Format the date properly
        let formattedDate;
        try {
          if (tweet.created_at) {
            formattedDate = new Date(tweet.created_at).toISOString();
          } else {
            formattedDate = new Date().toISOString();
          }
        } catch (dateError) {
          formattedDate = new Date().toISOString();
        }
        
        // Вставить в raw_feedback
        const { error: insertError } = await supabase
          .from('raw_feedback')
          .insert({
            user_id: user.id,
            platform: 'twitter',
            source_id: tweet.id,
            content: tweet.text || '',
            metadata: {
              author: tweet.author?.username || 'unknown',
              author_id: tweet.author?.id || '',
              followers: tweet.author?.followers || 0,
              created_at: formattedDate,
              retweets: tweet.metrics?.retweet_count || 0,
              likes: tweet.metrics?.like_count || 0,
              replies: tweet.metrics?.reply_count || 0,
              quotes: tweet.metrics?.quote_count || 0,
              keywords_searched: keywords
            }
          });
        
        if (!insertError) {
          // Увеличить processedCount только если вставка успешна
          processedCount++;
          console.log(`Successfully processed tweet: ${tweet.id}`);
        } else {
          console.error('Error inserting tweet:', insertError);
        }
      } catch (tweetError) {
        console.error('Error processing tweet:', tweetError);
        // Continue with next tweet instead of failing the entire sync
        continue;
      }
    }
    
    console.log(`Processed ${processedCount} new tweets out of ${tweets.length} total`);
    
    // Обновить время последней синхронизации
    await supabase
      .from('integrations')
      .update({
        last_sync: new Date().toISOString(),
        status: 'connected'
      })
      .eq('id', integration.id);
    
    // Вернуть результат
    return NextResponse.json({
      success: true,
      processed: processedCount,
      total: tweets.length,
      searchQuery: tweetsResult.searchQuery,
      message: `Successfully processed ${processedCount} new tweets`
    });
    
  } catch (error) {
    // Обработить ошибки в catch блоке
    console.error('Twitter sync error:', error);
    
    // Provide more detailed error information
    let errorMessage = 'Twitter sync failed';
    if (error.message) {
      errorMessage = `Twitter sync failed: ${error.message}`;
    }
    
    // Вернуть 500 ошибку
    return NextResponse.json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}