import { NextResponse } from 'next/server';
import { createClient } from '../../../../libs/supabase/server.js';
const { GmailService } = require('../../../../lib/services/gmail.js');
const { google } = require('googleapis');

/**
 * Gmail sync route
 * POST /api/sync/gmail - Synchronizes Gmail emails and saves as feedback
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
    
    // Получить Gmail интеграцию
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'gmail')
      .eq('status', 'connected')
      .single();
    
    // Если нет integration, вернуть 400 ошибку
    if (integrationError || !integration) {
      return NextResponse.json({ error: 'Gmail not connected' }, { status: 400 });
    }
    
    // Проверить наличие токенов
    if (!integration.access_token) {
      console.error('No access token found for integration');
      return NextResponse.json({ error: 'No access token found. Please reconnect Gmail.' }, { status: 400 });
    }
    
    console.log('Setting up Gmail service...');
    console.log('Integration access token exists:', !!integration.access_token);
    console.log('Integration refresh token exists:', !!integration.refresh_token);
    
    // Инициализировать GmailService
    const gmailService = new GmailService(integration.access_token, integration.refresh_token);
    
    // Override the OAuth client with integration-specific credentials if needed
    if (process.env.GMAIL_INTEGRATION_CLIENT_ID && process.env.GMAIL_INTEGRATION_CLIENT_SECRET) {
      console.log('Using integration-specific OAuth credentials');
      gmailService.oauth2Client = new google.auth.OAuth2(
        process.env.GMAIL_INTEGRATION_CLIENT_ID,
        process.env.GMAIL_INTEGRATION_CLIENT_SECRET,
        process.env.GMAIL_INTEGRATION_REDIRECT_URI || 'http://localhost:3000/api/auth/gmail/callback'
      );
      
      const tokens = {};
      if (integration.access_token) tokens.access_token = integration.access_token;
      if (integration.refresh_token) tokens.refresh_token = integration.refresh_token;
      gmailService.oauth2Client.setCredentials(tokens);
      gmailService.isAuthenticated = true; // Explicitly set authentication status
    }
    
    console.log('Gmail service authentication status:', gmailService.isAuthenticated);
    console.log('OAuth client credentials set:', !!gmailService.oauth2Client.credentials?.access_token);
    
    // Получить keywords из конфигурации (для будущего использования в фильтрации)
    const keywords = integration.config?.keywords || ['feedback'];
    
    // Получить письма из инбокса (используем простой подход вместо поиска)
    console.log('Fetching emails from inbox...');
    let emailsResult;
    try {
      emailsResult = await gmailService.getEmails({ 
        maxResults: 20,
        labelIds: ['INBOX']
      });
      console.log('Retrieved emails successfully:', emailsResult);
    } catch (gmailError) {
      console.error('Gmail API error details:', gmailError);
      console.error('Gmail API error message:', gmailError.message);
      console.error('Gmail API error code:', gmailError.code);
      console.error('Gmail API error status:', gmailError.status);
      
      // Handle specific Gmail API errors
      if (gmailError.message && gmailError.message.includes('invalid_grant')) {
        return NextResponse.json({ 
          error: 'Gmail access token expired. Please reconnect your Gmail account.' 
        }, { status: 401 });
      }
      
      if (gmailError.code === 401) {
        return NextResponse.json({ 
          error: 'Gmail authentication failed. Please reconnect your Gmail account.' 
        }, { status: 401 });
      }
      
      throw gmailError; // Re-throw to be caught by outer catch
    }
    
    if (!emailsResult || !emailsResult.messages) {
      console.log('No emails found in inbox');
      return NextResponse.json({
        success: true,
        processed: 0,
        total: 0,
        message: 'No emails found in inbox'
      });
    }
    
    const messages = emailsResult.messages;
    
    // Инициализировать счетчик
    let processedCount = 0;
    
    // Для каждого письма проверить дубликаты и получить детали
    for (const message of messages) {
      try {
        console.log(`Processing email: ${message.id}`);
        
        // Запрос к raw_feedback для проверки дубликатов
        const { data: existing } = await supabase
          .from('raw_feedback')
          .select('id')
          .eq('platform', 'gmail')
          .eq('source_id', message.id)
          .single();
        
        // Если existing, пропустить итерацию
        if (existing) {
          console.log(`Email ${message.id} already exists, skipping`);
          continue;
        }
        
        // Получить детали письма
        console.log(`Fetching details for email: ${message.id}`);
        const emailDetails = await gmailService.getEmail(message.id);
        console.log(`Email details retrieved for: ${message.id}`);
        
        // Проверить, содержит ли письмо ключевые слова (простая фильтрация)
        const emailContent = `${emailDetails.subject || ''} ${emailDetails.body || emailDetails.snippet || ''}`.toLowerCase();
        const containsKeywords = keywords.some(keyword => 
          emailContent.includes(keyword.toLowerCase())
        );
        
        // Если письмо не содержит ключевых слов, пропустить
        if (!containsKeywords) {
          console.log(`Email ${message.id} doesn't contain keywords, skipping`);
          continue;
        }
        
        // Format the date properly
        let formattedDate;
        try {
          if (emailDetails.date) {
            formattedDate = new Date(emailDetails.date).toISOString();
          } else if (emailDetails.internalDate) {
            formattedDate = new Date(parseInt(emailDetails.internalDate)).toISOString();
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
            platform: 'gmail',
            source_id: message.id,
            content: emailDetails.body || emailDetails.snippet || '',
            metadata: {
              subject: emailDetails.subject || 'No Subject',
              from: emailDetails.from || 'Unknown Sender',
              to: emailDetails.to || '',
              date: formattedDate,
              threadId: emailDetails.threadId,
              keywords_matched: keywords.filter(keyword => 
                emailContent.includes(keyword.toLowerCase())
              )
            }
          });
        
        if (!insertError) {
          // Увеличить processedCount только если вставка успешна
          processedCount++;
          console.log(`Successfully processed email: ${message.id}`);
        } else {
          console.error('Error inserting email:', insertError);
        }
      } catch (emailError) {
        console.error('Error processing email:', emailError);
        // Continue with next email instead of failing the entire sync
        continue;
      }
    }
    
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
      total: messages.length
    });
    
  } catch (error) {
    // Обработить ошибки в catch блоке
    console.error('Gmail sync error:', error);
    
    // Provide more detailed error information
    let errorMessage = 'Sync failed';
    if (error.message) {
      errorMessage = `Sync failed: ${error.message}`;
    }
    
    // Вернуть 500 ошибку
    return NextResponse.json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}