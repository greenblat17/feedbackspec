import { NextResponse } from 'next/server';
const { GmailService } = require('../../../../lib/services/gmail');

/**
 * Gmail OAuth initiation route
 * GET /api/auth/gmail - Redirects to Google OAuth authorization
 */
export async function GET() {
  try {
    // Создаем экземпляр GmailService
    const gmailService = new GmailService();
    
    // Получаем URL для авторизации
    const authUrl = gmailService.getAuthUrl();
    
    // Возвращаем редирект на Google OAuth
    return NextResponse.redirect(authUrl);
    
  } catch (error) {
    console.error('Error initiating Gmail OAuth:', error);
    
    // В случае ошибки редиректим на dashboard с ошибкой
    return NextResponse.redirect('/dashboard?error=gmail_auth_failed');
  }
}