import { NextResponse } from 'next/server';
import { createClient } from '../../../../../libs/supabase/server.js';

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
    const state = searchParams.get('state');
    
    // Проверяем на ошибки или отсутствие кода
    if (error || !code) {
      console.error('OAuth error or missing code:', error);
      return NextResponse.redirect(new URL('/dashboard/integrations?error=gmail_auth_failed', request.url));
    }
    
    // Parse state to get user context
    let userContext;
    try {
      userContext = JSON.parse(decodeURIComponent(state));
    } catch (e) {
      console.error('Invalid state parameter:', e);
      return NextResponse.redirect(new URL('/dashboard/integrations?error=gmail_auth_failed', request.url));
    }
    
    // Check environment variables
    const clientId = process.env.GMAIL_INTEGRATION_CLIENT_ID;
    const clientSecret = process.env.GMAIL_INTEGRATION_CLIENT_SECRET;
    const redirectUri = process.env.GMAIL_INTEGRATION_REDIRECT_URI || 'http://localhost:3000/api/auth/gmail/callback';
    
    if (!clientId || !clientSecret) {
      console.error('Google OAuth credentials not properly configured');
      return NextResponse.redirect(new URL('/dashboard/integrations?error=oauth_not_configured', request.url));
    }
    
    // Exchange code for tokens using Google's OAuth endpoint
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });
    
    const tokens = await tokenResponse.json();
    
    if (!tokens.access_token) {
      console.error('Failed to get access token:', tokens);
      return NextResponse.redirect(new URL('/dashboard/integrations?error=gmail_auth_failed', request.url));
    }
    
    // Создаем Supabase клиент
    const supabase = createClient();
    
    // Verify the user from state matches current session
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user || user.id !== userContext.userId) {
      console.error('User authentication error or mismatch:', userError);
      return NextResponse.redirect(new URL('/dashboard/integrations?error=gmail_auth_failed', request.url));
    }
    
    // Сохраняем интеграцию в таблицу integrations
    const { error: insertError } = await supabase
      .from('integrations')
      .upsert({
        user_id: user.id,
        platform: 'gmail',
        status: 'connected',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        config: {
          default_folder: 'INBOX',
          auto_sync: true,
          sync_frequency: 'hourly',
          keywords: ['feedback', 'bug', 'feature request'],
          token_type: tokens.token_type || 'Bearer',
          scope: tokens.scope || '',
          expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null
        },
        last_sync: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,platform'
      });
    
    if (insertError) {
      console.error('Error saving integration:', insertError);
      return NextResponse.redirect(new URL('/dashboard/integrations?error=gmail_auth_failed', request.url));
    }
    
    // Успешный редирект
    return NextResponse.redirect(new URL('/dashboard/integrations?success=gmail_connected', request.url));
    
  } catch (error) {
    console.error('Gmail OAuth callback error:', error);
    return NextResponse.redirect(new URL('/dashboard/integrations?error=gmail_auth_failed', request.url));
  }
}