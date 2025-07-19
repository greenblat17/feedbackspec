import { NextResponse } from 'next/server';
import { createAuthenticatedSupabaseClient } from '../../../../../libs/auth/server-auth';
import { createValidationError, logErrorToMonitoring } from '../../../../../libs/errors/error-handler';
import { gmailService } from '../../../../../lib/services/gmail';

/**
 * Gmail Connection Status API Route
 * GET /api/auth/gmail/status - Проверяет статус подключения Gmail аккаунта
 */
export async function GET(request) {
  try {
    console.log('🔄 Checking Gmail connection status...');

    // Получаем аутентифицированного пользователя
    const supabase = createAuthenticatedSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      throw createValidationError('User must be authenticated to check Gmail status');
    }

    console.log(`👤 Checking Gmail status for user ${user.id}`);

    // Получаем информацию о токенах из базы данных
    const { data: tokenData, error: tokenError } = await supabase
      .from('gmail_tokens')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    const isConnected = !tokenError && tokenData && tokenData.access_token;

    // Получаем информацию о профиле Gmail если подключен
    let profileInfo = null;
    let connectionValid = false;

    if (isConnected) {
      try {
        // Устанавливаем токены в сервис
        gmailService.setCredentials({
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_type: tokenData.token_type,
          expiry_date: tokenData.expires_at ? new Date(tokenData.expires_at).getTime() : null
        });

        // Проверяем валидность подключения запросом к API
        const profile = await gmailService.getProfile();
        connectionValid = true;
        
        profileInfo = {
          emailAddress: profile.emailAddress,
          messagesTotal: profile.messagesTotal,
          threadsTotal: profile.threadsTotal
        };

        console.log(`✅ Gmail connection valid for ${profile.emailAddress}`);

      } catch (apiError) {
        console.warn('⚠️ Gmail API call failed:', apiError.message);
        connectionValid = false;
        
        // Если токен истек, помечаем его как неактивный
        if (apiError.message.includes('unauthorized') || apiError.message.includes('invalid_grant')) {
          await supabase
            .from('gmail_tokens')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('user_id', user.id)
            .eq('is_active', true);
          
          console.log('🔄 Marked expired Gmail tokens as inactive');
        }
      }
    }

    // Получаем дополнительную статистику из базы данных
    const { data: profileData } = await supabase
      .from('gmail_profiles')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    // Получаем статистику последних синхронизаций
    const { data: syncHistory, error: syncError } = await supabase
      .from('gmail_sync_history')
      .select('*')
      .eq('user_id', user.id)
      .order('completed_at', { ascending: false })
      .limit(5);

    const response = {
      isConnected,
      connectionValid,
      profile: profileInfo || (profileData ? {
        emailAddress: profileData.email_address,
        messagesTotal: profileData.messages_total,
        threadsTotal: profileData.threads_total
      } : null),
      connectionDetails: isConnected ? {
        connectedAt: tokenData.created_at,
        lastUpdated: tokenData.updated_at,
        tokenExpiresAt: tokenData.expires_at,
        scope: tokenData.scope || 'gmail.readonly'
      } : null,
      syncHistory: syncHistory || [],
      serviceStatus: {
        isConfigured: gmailService.isConfigured(),
        lastCheck: new Date().toISOString()
      }
    };

    console.log(`✅ Gmail status check completed for user ${user.id}`);

    return NextResponse.json({
      success: true,
      data: response,
      timestamp: new Date().toISOString()
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'private, max-age=30', // Кеш на 30 секунд
      }
    });

  } catch (error) {
    console.error('❌ Error checking Gmail status:', error);
    
    logErrorToMonitoring(error, 'Gmail status check failed', {
      url: request.url
    });

    let statusCode = 500;
    let errorMessage = 'Failed to check Gmail connection status';

    if (error.code === 'VALIDATION_ERROR') {
      statusCode = 401;
      errorMessage = error.message;
    }

    return NextResponse.json({
      error: true,
      message: errorMessage,
      code: error.code || 'GMAIL_STATUS_ERROR',
      timestamp: new Date().toISOString()
    }, { 
      status: statusCode,
      headers: {
        'Cache-Control': 'no-store'
      }
    });
  }
}

/**
 * DELETE /api/auth/gmail/status - Отключает Gmail аккаунт
 */
export async function DELETE(request) {
  try {
    console.log('🔄 Disconnecting Gmail account...');

    // Получаем аутентифицированного пользователя
    const supabase = createAuthenticatedSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      throw createValidationError('User must be authenticated to disconnect Gmail');
    }

    console.log(`👤 Disconnecting Gmail for user ${user.id}`);

    // Деактивируем токены
    const { error: tokenError } = await supabase
      .from('gmail_tokens')
      .update({ 
        is_active: false, 
        updated_at: new Date().toISOString(),
        disconnected_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (tokenError) {
      throw tokenError;
    }

    // Деактивируем профиль
    const { error: profileError } = await supabase
      .from('gmail_profiles')
      .update({ 
        is_active: false, 
        disconnected_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (profileError) {
      console.warn('⚠️ Failed to deactivate Gmail profile:', profileError.message);
    }

    // Логируем отключение
    await supabase
      .from('gmail_disconnections')
      .insert({
        user_id: user.id,
        disconnected_at: new Date().toISOString(),
        reason: 'user_request'
      });

    console.log('✅ Gmail account disconnected successfully');

    return NextResponse.json({
      success: true,
      message: 'Gmail account disconnected successfully',
      timestamp: new Date().toISOString()
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store'
      }
    });

  } catch (error) {
    console.error('❌ Error disconnecting Gmail:', error);
    
    logErrorToMonitoring(error, 'Gmail disconnection failed', {
      url: request.url
    });

    return NextResponse.json({
      error: true,
      message: 'Failed to disconnect Gmail account',
      code: error.code || 'GMAIL_DISCONNECT_ERROR',
      timestamp: new Date().toISOString()
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store'
      }
    });
  }
}

/**
 * OPTIONS - Поддержка CORS preflight запросов
 */
export async function OPTIONS(request) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
}