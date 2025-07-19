import { NextResponse } from 'next/server';
import { createClient } from '../../../../libs/supabase/server.js';
import { EnhancedFeedbackAnalyzer } from '../../../../libs/ai/enhanced-analyzer.js';
const { GmailService } = require('../../../../libs/services/gmail.js');
const { google } = require('googleapis');

/**
 * Check if email is obviously not feedback (marketing, notifications, etc.)
 */
function checkObviousNonFeedback(emailDetails) {
  const subject = (emailDetails.subject || '').toLowerCase();
  const body = (emailDetails.body || emailDetails.snippet || '').toLowerCase();
  const from = (emailDetails.from || '').toLowerCase();

  // Common marketing/notification patterns
  const marketingPatterns = [
    'unsubscribe', 'newsletter', 'promotion', 'sale', 'discount', 'offer',
    'marketing', 'advertisement', 'spam', 'noreply', 'no-reply',
    'password reset', 'verify', 'confirmation', 'welcome to',
    'thank you for signing up', 'activate your account',
    'privacy policy', 'terms of service', 'terms & conditions',
    'pinterest.com', 'facebook.com', 'twitter.com', 'instagram.com',
    'linkedin.com', 'youtube.com', 'tiktok.com',
    'to view this content', 'open the following url',
    'help centre', 'support@', 'notifications@'
  ];

  // Check subject and body for marketing patterns
  const hasMarketingPattern = marketingPatterns.some(pattern => 
    subject.includes(pattern) || body.includes(pattern) || from.includes(pattern)
  );

  // Check for excessive URLs (typical in marketing emails)
  const urlCount = (body.match(/https?:\/\//g) || []).length;
  const hasExcessiveUrls = urlCount > 5;

  // Check if it's mostly links with little actual content
  const textContent = body.replace(/https?:\/\/[^\s]+/g, '').trim();
  const isMainlyLinks = urlCount > 3 && textContent.length < 200;

  return hasMarketingPattern || hasExcessiveUrls || isMainlyLinks;
}

/**
 * Test auto-sync route
 * POST /api/test/auto-sync - Test the automatic Gmail sync functionality
 * This endpoint is for testing purposes only and should be used manually
 */
export async function POST(request) {
  try {
    console.log('🧪 Starting test auto-sync...');
    
    const supabase = createClient();
    
    // Check user authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const analyzer = new EnhancedFeedbackAnalyzer();
    
    // Get user's Gmail integration
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

    console.log(`👤 Testing auto-sync for user ${user.id}...`);
    
    // Validate tokens
    if (!integration.access_token) {
      return NextResponse.json({ error: 'No access token found' }, { status: 400 });
    }

    // Initialize Gmail service with proper OAuth configuration
    const gmailService = new GmailService();
    
    // Setup OAuth client with the correct environment variables
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
      gmailService.isAuthenticated = true;
      
      // Re-initialize Gmail API with the updated auth
      gmailService.gmail = google.gmail({ version: 'v1', auth: gmailService.oauth2Client });
    } else {
      console.error('❌ Gmail OAuth credentials not configured');
      return NextResponse.json({ error: 'Gmail OAuth not configured' }, { status: 500 });
    }

    // Calculate time filter based on last sync
    let timeFilter;
    if (integration.last_sync) {
      // Use last sync time, but add 1 minute buffer to avoid missing emails
      const lastSyncTime = new Date(integration.last_sync);
      lastSyncTime.setMinutes(lastSyncTime.getMinutes() - 1);
      timeFilter = Math.floor(lastSyncTime.getTime() / 1000);
      console.log(`📅 Fetching emails since last sync: ${lastSyncTime.toISOString()}`);
    } else {
      // First sync - get emails from last 7 days
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      timeFilter = Math.floor(weekAgo.getTime() / 1000);
      console.log(`📅 First sync - fetching emails from last 7 days: ${weekAgo.toISOString()}`);
    }
    
    const emailsResult = await gmailService.getEmails({ 
      maxResults: 50, // Increased limit since we're filtering by time
      labelIds: ['INBOX'],
      query: `after:${timeFilter}`
    });

    if (!emailsResult || !emailsResult.messages) {
      const message = integration.last_sync 
        ? 'No new emails since last sync'
        : 'No emails found in the last 7 days';
      
      return NextResponse.json({
        success: true,
        message,
        processed: 0,
        time_filter: new Date(timeFilter * 1000).toISOString(),
        last_sync: integration.last_sync
      });
    }

    const messages = emailsResult.messages;
    let processedCount = 0;
    const processedEmails = [];

    // Process each email
    for (const message of messages) {
      try {
        // Check if email already processed
        const { data: existing } = await supabase
          .from('raw_feedback')
          .select('id')
          .eq('platform', 'gmail')
          .eq('source_id', message.id)
          .eq('user_id', user.id)
          .single();
        
        if (existing) {
          processedEmails.push({
            id: message.id,
            status: 'already_processed'
          });
          continue;
        }

        // Get email details
        const emailDetails = await gmailService.getEmail(message.id);

        // Pre-filter obvious non-feedback emails
        const isObviousNonFeedback = checkObviousNonFeedback(emailDetails);
        if (isObviousNonFeedback) {
          processedEmails.push({
            id: message.id,
            status: 'filtered_out',
            subject: emailDetails.subject,
            reason: 'Obvious non-feedback (marketing/spam/notification)'
          });
          continue;
        }

        // Analyze email content with AI
        console.log(`🤖 Analyzing email ${message.id}...`);
        const analysis = await analyzer.analyzeFeedback(
          emailDetails.body || emailDetails.snippet || '',
          'gmail',
          {
            subject: emailDetails.subject,
            from: emailDetails.from,
            date: emailDetails.date
          }
        );

        // Determine if this is actually feedback (stricter criteria)
        const feedbackCategories = ['bug', 'feature', 'improvement', 'complaint', 'praise', 'suggestion'];
        const isFeedback = feedbackCategories.includes(analysis.category) && analysis.confidence > 0.8;

        if (!isFeedback) {
          processedEmails.push({
            id: message.id,
            status: 'not_feedback',
            subject: emailDetails.subject,
            category: analysis.category,
            confidence: analysis.confidence
          });
          continue;
        }

        // Format date
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

        // Insert analyzed feedback
        const { error: insertError } = await supabase
          .from('raw_feedback')
          .insert({
            user_id: user.id,
            platform: 'gmail',
            source_id: message.id,
            content: emailDetails.body || emailDetails.snippet || '',
            ai_analysis: analysis,
            priority: analysis.priority,
            sentiment: analysis.sentiment,
            category: analysis.category,
            metadata: {
              subject: emailDetails.subject || 'No Subject',
              from: emailDetails.from || 'Unknown Sender',
              to: emailDetails.to || '',
              date: formattedDate,
              threadId: emailDetails.threadId,
              ai_analyzed: true,
              auto_processed: true,
              processed_at: new Date().toISOString(),
              test_mode: true
            }
          });
        
        if (!insertError) {
          processedCount++;
          processedEmails.push({
            id: message.id,
            status: 'processed',
            subject: emailDetails.subject,
            category: analysis.category,
            priority: analysis.priority,
            sentiment: analysis.sentiment,
            confidence: analysis.confidence
          });
          console.log(`✅ Successfully processed email ${message.id}`);
        } else {
          console.error(`❌ Error inserting email ${message.id}:`, insertError);
          processedEmails.push({
            id: message.id,
            status: 'error',
            error: insertError.message
          });
        }

      } catch (emailError) {
        console.error(`❌ Error processing email ${message.id}:`, emailError);
        processedEmails.push({
          id: message.id,
          status: 'error',
          error: emailError.message
        });
      }
    }

    // Update last sync time
    await supabase
      .from('integrations')
      .update({
        last_sync: new Date().toISOString(),
        status: 'connected'
      })
      .eq('id', integration.id);

    console.log(`✅ Test auto-sync completed: ${processedCount} emails processed`);

    return NextResponse.json({
      success: true,
      processed: processedCount,
      total_emails: messages.length,
      processed_emails: processedEmails,
      time_filter: new Date(timeFilter * 1000).toISOString(),
      last_sync_before: integration.last_sync,
      last_sync_after: new Date().toISOString(),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Test auto-sync error:', error);
    
    return NextResponse.json({ 
      error: `Test auto-sync failed: ${error.message}`,
      test_mode: true,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}