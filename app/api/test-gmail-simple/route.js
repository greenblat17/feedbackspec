import { NextResponse } from 'next/server';
import { createClient } from '../../../libs/supabase/server.js';
const { google } = require('googleapis');

/**
 * Simple Gmail API test
 */
export async function POST(request) {
  try {
    const supabase = createClient();
    
    // Get user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get integration
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'gmail')
      .eq('status', 'connected')
      .single();
    
    if (integrationError || !integration) {
      return NextResponse.json({ error: 'Gmail not connected' }, { status: 400 });
    }
    
    console.log('=== GMAIL API TEST START ===');
    console.log('Access token exists:', !!integration.access_token);
    console.log('Refresh token exists:', !!integration.refresh_token);
    console.log('Access token length:', integration.access_token?.length);
    
    // Setup OAuth client directly
    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_INTEGRATION_CLIENT_ID,
      process.env.GMAIL_INTEGRATION_CLIENT_SECRET,
      process.env.GMAIL_INTEGRATION_REDIRECT_URI || 'http://localhost:3000/api/auth/gmail/callback'
    );
    
    // Set credentials
    oauth2Client.setCredentials({
      access_token: integration.access_token,
      refresh_token: integration.refresh_token
    });
    
    console.log('OAuth client configured');
    console.log('Credentials set:', !!oauth2Client.credentials?.access_token);
    
    // Create Gmail API instance
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    
    console.log('Gmail API instance created');
    
    // Try to get profile first (simple call)
    console.log('Testing Gmail profile...');
    const profileResponse = await gmail.users.getProfile({
      userId: 'me'
    });
    
    console.log('Profile response:', profileResponse.data);
    
    // Now try to list messages
    console.log('Testing messages list...');
    const messagesResponse = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 5,
      labelIds: ['INBOX']
    });
    
    console.log('Messages response:', messagesResponse.data);
    
    return NextResponse.json({
      success: true,
      profile: profileResponse.data,
      messages: messagesResponse.data
    });
    
  } catch (error) {
    console.error('=== GMAIL API ERROR ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error status:', error.status);
    console.error('Error details:', error.response?.data);
    console.error('Full error:', error);
    console.error('=== END ERROR ===');
    
    return NextResponse.json({ 
      error: 'Gmail API test failed',
      message: error.message,
      code: error.code,
      status: error.status,
      details: error.response?.data
    }, { status: 500 });
  }
}