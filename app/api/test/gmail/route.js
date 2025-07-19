import { NextResponse } from 'next/server';
import { createClient } from '../../../../libs/supabase/server.js';
const { GmailService } = require('../../../../lib/services/gmail.js');
const { google } = require('googleapis');

/**
 * Test Gmail API route - Fetches last 5 emails from user's Gmail
 * POST /api/test/gmail - Returns last 5 emails for testing purposes
 */
export async function POST(request) {
  try {
    const supabase = createClient();
    
    // Verify user authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get user's Gmail integration
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'gmail')
      .eq('status', 'connected')
      .single();
    
    if (integrationError || !integration) {
      return NextResponse.json({ 
        error: 'Gmail not connected. Please connect your Gmail account first.' 
      }, { status: 400 });
    }
    
    // Check if we have valid tokens
    if (!integration.access_token) {
      return NextResponse.json({ 
        error: 'No valid access token found. Please reconnect your Gmail account.' 
      }, { status: 400 });
    }
    
    // Initialize Gmail service with integration-specific environment variables
    const gmailService = new GmailService(integration.access_token, integration.refresh_token);
    
    // Override the OAuth client with integration-specific credentials if needed
    if (process.env.GMAIL_INTEGRATION_CLIENT_ID && process.env.GMAIL_INTEGRATION_CLIENT_SECRET) {
      gmailService.oauth2Client = new google.auth.OAuth2(
        process.env.GMAIL_INTEGRATION_CLIENT_ID,
        process.env.GMAIL_INTEGRATION_CLIENT_SECRET,
        process.env.GMAIL_INTEGRATION_REDIRECT_URI || 'http://localhost:3000/api/auth/gmail/callback'
      );
      
      const tokens = {};
      if (integration.access_token) tokens.access_token = integration.access_token;
      if (integration.refresh_token) tokens.refresh_token = integration.refresh_token;
      gmailService.oauth2Client.setCredentials(tokens);
    }
    
    // First try to get basic emails list
    console.log('Starting email fetch...');
    const emailsResult = await gmailService.getEmails({ 
      maxResults: 5,
      labelIds: ['INBOX']
    });
    
    console.log('Emails result:', emailsResult);
    
    if (!emailsResult || !emailsResult.messages || emailsResult.messages.length === 0) {
      return NextResponse.json({ 
        emails: [],
        message: 'No emails found in your inbox'
      });
    }
    
    // Get detailed information for each email
    const emailDetails = [];
    for (const message of emailsResult.messages.slice(0, 5)) {
      try {
        console.log(`Fetching details for email: ${message.id}`);
        const email = await gmailService.getEmail(message.id);
        console.log(`Email details:`, email);
        
        emailDetails.push({
          id: email.id,
          subject: email.subject || 'No Subject',
          from: email.from || 'Unknown Sender',
          date: email.date || 'Unknown Date',
          snippet: email.snippet || '',
          body: email.body ? email.body.substring(0, 200) + '...' : (email.snippet || 'No content')
        });
      } catch (emailError) {
        console.error(`Error processing email ${message.id}:`, emailError);
        // Skip this email and continue with others
        emailDetails.push({
          id: message.id,
          subject: 'Error loading email',
          from: 'Unknown',
          date: 'Unknown',
          snippet: 'Could not load email details',
          body: 'Error occurred while loading email content'
        });
      }
    }
    
    return NextResponse.json({ 
      emails: emailDetails,
      count: emailDetails.length,
      message: `Found ${emailDetails.length} recent emails`
    });
    
  } catch (error) {
    console.error('Error in test Gmail API:', error);
    console.error('Error stack:', error.stack);
    
    // Handle specific Gmail API errors
    if (error.message && error.message.includes('invalid_grant')) {
      return NextResponse.json({ 
        error: 'Gmail access token expired. Please reconnect your Gmail account.' 
      }, { status: 401 });
    }
    
    if (error.message && error.message.includes('insufficient permissions')) {
      return NextResponse.json({ 
        error: 'Insufficient permissions to access Gmail. Please reconnect with proper permissions.' 
      }, { status: 403 });
    }
    
    if (error.message && error.message.includes('Request failed with status code 401')) {
      return NextResponse.json({ 
        error: 'Gmail authentication failed. Please reconnect your Gmail account.' 
      }, { status: 401 });
    }
    
    return NextResponse.json({ 
      error: 'Failed to fetch test emails from Gmail',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}