import { NextResponse } from 'next/server';
import { createClient } from '../../../../../libs/supabase/server.js';

/**
 * Gmail OAuth initiation with user-specific state
 * POST /api/auth/gmail/initiate - Creates OAuth URL with user context
 */
export async function POST(request) {
  try {
    const supabase = createClient();
    
    // Verify user authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { userId, userEmail } = body;
    
    // Verify the user ID matches
    if (userId !== user.id) {
      return NextResponse.json({ error: 'Invalid user' }, { status: 403 });
    }
    
    // Create state parameter with user context
    const state = JSON.stringify({
      userId: user.id,
      userEmail: user.email,
      timestamp: Date.now()
    });
    
    // Check if required environment variables are set
    const clientId = process.env.GMAIL_INTEGRATION_CLIENT_ID;
    const redirectUri = process.env.GMAIL_INTEGRATION_REDIRECT_URI || 'http://localhost:3000/api/auth/gmail/callback';
    
    if (!clientId) {
      console.error('GMAIL_INTEGRATION_CLIENT_ID is not set');
      return NextResponse.json({ 
        error: 'Google OAuth not configured. Please set GMAIL_INTEGRATION_CLIENT_ID in your environment variables.' 
      }, { status: 500 });
    }
    
    // Create OAuth URL with Google's public OAuth endpoint
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/gmail.readonly',
      access_type: 'offline',
      prompt: 'consent',
      state: encodeURIComponent(state)
    });
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    
    return NextResponse.json({ authUrl });
    
  } catch (error) {
    console.error('Error creating Gmail OAuth URL:', error);
    return NextResponse.json({ error: 'Failed to create authorization URL' }, { status: 500 });
  }
}