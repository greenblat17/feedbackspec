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
 * Scheduled Gmail sync route
 * POST /api/cron/gmail-sync - Automatically syncs Gmail emails for all connected users
 * This endpoint should be called by a cron service (like Vercel Cron, GitHub Actions, or external cron)
 */
export async function POST(request) {
  try {
    console.log('🕐 Starting scheduled Gmail sync...');
    
    // Verify cron authorization (optional - add secret key verification)
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.log('❌ Unauthorized cron request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient();
    const analyzer = new EnhancedFeedbackAnalyzer();
    
    // Get all connected Gmail integrations
    const { data: integrations, error: integrationsError } = await supabase
      .from('integrations')
      .select('*')
      .eq('platform', 'gmail')
      .eq('status', 'connected');
    
    if (integrationsError) {
      console.error('❌ Error fetching integrations:', integrationsError);
      return NextResponse.json({ error: 'Failed to fetch integrations' }, { status: 500 });
    }

    if (!integrations || integrations.length === 0) {
      console.log('ℹ️ No Gmail integrations found');
      return NextResponse.json({ 
        success: true, 
        message: 'No Gmail integrations to sync',
        processed_users: 0,
        total_emails: 0
      });
    }

    console.log(`📬 Found ${integrations.length} Gmail integrations to sync`);
    
    let totalProcessedUsers = 0;
    let totalProcessedEmails = 0;
    const userResults = [];

    // Process each user's Gmail integration
    for (const integration of integrations) {
      try {
        console.log(`👤 Processing user ${integration.user_id}...`);
        
        // Validate tokens
        if (!integration.access_token) {
          console.log(`⚠️ User ${integration.user_id}: No access token, skipping`);
          userResults.push({
            user_id: integration.user_id,
            status: 'skipped',
            reason: 'No access token',
            processed: 0
          });
          continue;
        }

        // Initialize Gmail service with proper OAuth configuration
        const gmailService = new GmailService();
        
        // Setup OAuth client with integration credentials
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
          console.warn(`⚠️ Gmail OAuth credentials not configured for user ${integration.user_id}`);
          userResults.push({
            user_id: integration.user_id,
            status: 'skipped',
            reason: 'OAuth not configured',
            processed: 0
          });
          continue;
        }

        // Get keywords for filtering
        const keywords = integration.config?.keywords || ['feedback'];
        
        // Fetch recent emails (last hour to avoid processing too many emails)
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const emailsResult = await gmailService.getEmails({ 
          maxResults: 50,
          labelIds: ['INBOX'],
          query: `after:${Math.floor(oneHourAgo.getTime() / 1000)}`
        });

        if (!emailsResult || !emailsResult.messages) {
          console.log(`📭 User ${integration.user_id}: No new emails found`);
          userResults.push({
            user_id: integration.user_id,
            status: 'success',
            processed: 0,
            message: 'No new emails'
          });
          continue;
        }

        const messages = emailsResult.messages;
        let userProcessedCount = 0;

        // Process each email
        for (const message of messages) {
          try {
            // Check if email already processed
            const { data: existing } = await supabase
              .from('raw_feedback')
              .select('id')
              .eq('platform', 'gmail')
              .eq('source_id', message.id)
              .eq('user_id', integration.user_id)
              .single();
            
            if (existing) {
              continue; // Skip already processed emails
            }

            // Get email details
            const emailDetails = await gmailService.getEmail(message.id);

            // Pre-filter obvious non-feedback emails
            const isObviousNonFeedback = checkObviousNonFeedback(emailDetails);
            if (isObviousNonFeedback) {
              console.log(`📧 Email ${message.id} filtered out as non-feedback`);
              continue;
            }

            // Analyze email content with AI
            console.log(`🤖 Analyzing email ${message.id} for user ${integration.user_id}...`);
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
              console.log(`❌ Email ${message.id} not identified as feedback, skipping`);
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
                user_id: integration.user_id,
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
                  processed_at: new Date().toISOString()
                }
              });
            
            if (!insertError) {
              userProcessedCount++;
              totalProcessedEmails++;
              console.log(`✅ Successfully processed email ${message.id} for user ${integration.user_id}`);
            } else {
              console.error(`❌ Error inserting email ${message.id}:`, insertError);
            }

          } catch (emailError) {
            console.error(`❌ Error processing email ${message.id}:`, emailError);
            continue;
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

        totalProcessedUsers++;
        userResults.push({
          user_id: integration.user_id,
          status: 'success',
          processed: userProcessedCount
        });

        console.log(`✅ User ${integration.user_id}: Processed ${userProcessedCount} emails`);

      } catch (userError) {
        console.error(`❌ Error processing user ${integration.user_id}:`, userError);
        
        // Handle token expiration
        if (userError.message && userError.message.includes('invalid_grant')) {
          await supabase
            .from('integrations')
            .update({ status: 'disconnected' })
            .eq('id', integration.id);
        }

        userResults.push({
          user_id: integration.user_id,
          status: 'error',
          error: userError.message,
          processed: 0
        });
      }
    }

    console.log(`🎉 Scheduled sync completed: ${totalProcessedUsers} users, ${totalProcessedEmails} emails processed`);

    return NextResponse.json({
      success: true,
      processed_users: totalProcessedUsers,
      total_emails: totalProcessedEmails,
      user_results: userResults,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Scheduled Gmail sync error:', error);
    
    return NextResponse.json({ 
      error: `Scheduled sync failed: ${error.message}`,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}