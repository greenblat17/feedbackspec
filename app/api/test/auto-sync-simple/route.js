import { NextResponse } from 'next/server';
import { EnhancedFeedbackAnalyzer } from '../../../../libs/ai/enhanced-analyzer.js';

/**
 * Simple auto-sync test route
 * POST /api/test/auto-sync-simple - Test the AI analysis functionality without authentication
 */
export async function POST(request) {
  try {
    console.log('🧪 Starting simple auto-sync test...');
    
    const analyzer = new EnhancedFeedbackAnalyzer();
    
    // Test email content samples
    const testEmails = [
      {
        id: 'test-1',
        subject: 'Bug report: Login button not working',
        body: 'Hello, I found a bug in your application. The login button on the homepage is not working properly. When I click it, nothing happens. Please fix this issue as soon as possible.',
        from: 'user@example.com'
      },
      {
        id: 'test-2', 
        subject: 'Feature request: Dark mode',
        body: 'Hi team, I would love to see a dark mode feature in your app. It would be great for night-time usage and battery saving on mobile devices.',
        from: 'feedback@example.com'
      },
      {
        id: 'test-3',
        subject: 'Newsletter subscription',
        body: 'Thank you for subscribing to our newsletter! You will receive weekly updates about our products and services.',
        from: 'newsletter@company.com'
      }
    ];
    
    const processedEmails = [];
    let processedCount = 0;

    // Process each test email
    for (const email of testEmails) {
      try {
        console.log(`🤖 Analyzing test email: ${email.id}...`);
        
        // Analyze email content with AI
        const analysis = await analyzer.analyzeFeedback(
          email.body,
          'gmail',
          {
            subject: email.subject,
            from: email.from,
            date: new Date().toISOString()
          }
        );

        // Determine if this is actually feedback
        const isFeedback = analysis.category !== 'general' || 
                         analysis.confidence > 0.7 ||
                         ['bug', 'feature', 'improvement', 'complaint', 'praise', 'suggestion'].includes(analysis.category);

        if (isFeedback) {
          processedCount++;
          processedEmails.push({
            id: email.id,
            status: 'processed',
            subject: email.subject,
            category: analysis.category,
            priority: analysis.priority,
            sentiment: analysis.sentiment,
            confidence: analysis.confidence,
            business_impact: analysis.business_impact,
            urgency: analysis.urgency,
            user_intent: analysis.user_intent,
            suggested_action: analysis.suggested_action
          });
        } else {
          processedEmails.push({
            id: email.id,
            status: 'not_feedback',
            subject: email.subject,
            category: analysis.category,
            confidence: analysis.confidence
          });
        }

        console.log(`✅ Successfully analyzed email ${email.id}: ${analysis.category} (${analysis.confidence})`);

      } catch (emailError) {
        console.error(`❌ Error analyzing email ${email.id}:`, emailError);
        processedEmails.push({
          id: email.id,
          status: 'error',
          error: emailError.message
        });
      }
    }

    console.log(`✅ Simple auto-sync test completed: ${processedCount} emails processed as feedback`);

    return NextResponse.json({
      success: true,
      processed: processedCount,
      total_emails: testEmails.length,
      test_mode: true,
      simple_test: true,
      processed_emails: processedEmails,
      timestamp: new Date().toISOString(),
      message: 'AI analysis test completed successfully'
    });

  } catch (error) {
    console.error('❌ Simple auto-sync test error:', error);
    
    return NextResponse.json({ 
      error: `Simple test failed: ${error.message}`,
      test_mode: true,
      simple_test: true,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}