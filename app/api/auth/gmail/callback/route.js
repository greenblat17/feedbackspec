import { NextResponse } from 'next/server';
const { GmailService } = require('../../../../../lib/services/gmail');
import { createClient } from '@/libs/supabase/server';

/**
 * Gmail OAuth callback route
 * GET /api/auth/gmail/callback - Handles Google OAuth callback
 */
export async function GET(request) {
  try {
    // Извлекаем параметры из URL
    const { searchParams } = request.nextUrl;
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    
    // Проверяем на ошибки или отсутствие кода
    if (error || !code) {
      console.error('OAuth error or missing code:', error);
      return NextResponse.redirect(new URL('/dashboard?error=gmail_auth_failed', request.url));
    }
    
    // Создаем экземпляр GmailService
    const gmailService = new GmailService();
    
    // Обмениваем код на токены
    const tokens = await gmailService.getTokens(code);
    
    // Создаем Supabase клиент
    const supabase = createClient();
    
    // Получаем текущего пользователя
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('User authentication error:', userError);
      return NextResponse.redirect(new URL('/dashboard?error=gmail_auth_failed', request.url));
    }
    
    // Сохраняем интеграцию в таблицу integrations
    const { error: insertError } = await supabase
      .from('integrations')
      .insert({
        user_id: user.id,
        platform: 'gmail',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_type: tokens.token_type || 'Bearer',
        scope: tokens.scope || '',
        expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
        config: {
          default_folder: 'INBOX',
          auto_sync: true,
          sync_frequency: 'hourly'
        },
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    
    if (insertError) {
      console.error('Error saving integration:', insertError);
      return NextResponse.redirect(new URL('/dashboard?error=gmail_auth_failed', request.url));
    }
    
    // Успешный редирект
    return NextResponse.redirect(new URL('/dashboard?success=gmail_connected', request.url));
    
  } catch (error) {
    console.error('Gmail OAuth callback error:', error);
    return NextResponse.redirect(new URL('/dashboard?error=gmail_auth_failed', request.url));
  }
}