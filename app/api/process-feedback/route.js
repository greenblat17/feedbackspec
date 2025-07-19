import { NextResponse } from 'next/server';
import { createClient } from '../../../libs/supabase/server.js';
import { EnhancedFeedbackAnalyzer } from '../../../libs/ai/enhanced-analyzer.js';

/**
 * Enhanced Feedback Processing API
 * POST /api/process-feedback - Process feedback items with enhanced AI analysis
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
    const { feedbackIds, batchSize = 20 } = body;
    
    console.log(`🔄 Starting enhanced processing for ${feedbackIds?.length || 'all'} feedback items`);
    
    // Get feedback items to process
    let query = supabase
      .from('raw_feedback')
      .select('*')
      .eq('user_id', user.id);
    
    if (feedbackIds && Array.isArray(feedbackIds) && feedbackIds.length > 0) {
      query = query.in('id', feedbackIds);
    } else {
      // Process items without AI analysis first
      query = query.is('ai_analysis', null);
    }
    
    // Limit batch size to prevent timeout
    query = query.limit(Math.min(batchSize, 20));
    
    const { data: feedbackItems, error: fetchError } = await query;
    
    if (fetchError) {
      console.error('Error fetching feedback items:', fetchError);
      return NextResponse.json({ 
        error: 'Failed to fetch feedback items',
        details: fetchError.message 
      }, { status: 500 });
    }
    
    if (!feedbackItems || feedbackItems.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        total: 0,
        message: 'No feedback items to process'
      });
    }
    
    console.log(`📊 Processing ${feedbackItems.length} feedback items with enhanced analyzer`);
    
    // Initialize enhanced analyzer
    const analyzer = new EnhancedFeedbackAnalyzer();
    
    let processedCount = 0;
    let errorCount = 0;
    const errors = [];
    
    // Process items in batches to prevent overwhelming the API
    for (const item of feedbackItems) {
      try {
        console.log(`🧠 Analyzing feedback item: ${item.id}`);
        
        // Enhanced analysis with platform and metadata context
        const analysis = await analyzer.analyzeFeedback(
          item.content,
          item.platform,
          item.metadata
        );
        
        console.log(`✅ Enhanced analysis completed for ${item.id}:`, {
          sentiment: analysis.sentiment,
          priority: analysis.priority,
          confidence: analysis.confidence,
          businessImpact: analysis.business_impact,
          urgency: analysis.urgency
        });
        
        // Update feedback with enhanced analysis
        const { error: updateError } = await supabase
          .from('raw_feedback')
          .update({
            ai_analysis: analysis,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.id)
          .eq('user_id', user.id); // Security check
        
        if (updateError) {
          console.error(`❌ Failed to update feedback ${item.id}:`, updateError);
          errorCount++;
          errors.push({
            feedbackId: item.id,
            error: updateError.message
          });
        } else {
          processedCount++;
          console.log(`✅ Successfully updated feedback ${item.id} with enhanced analysis`);
        }
        
        // Add small delay to prevent rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (itemError) {
        console.error(`❌ Error processing feedback item ${item.id}:`, itemError);
        errorCount++;
        errors.push({
          feedbackId: item.id,
          error: itemError.message
        });
      }
    }
    
    console.log(`📈 Enhanced processing completed: ${processedCount} successful, ${errorCount} errors`);
    
    // Update feedback clusters with enhanced analysis
    try {
      console.log('🔗 Updating feedback clusters with enhanced analysis...');
      
      // Get updated feedback for clustering
      const { data: updatedFeedback } = await supabase
        .from('raw_feedback')
        .select('*')
        .eq('user_id', user.id)
        .not('ai_analysis', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50); // Limit for clustering performance
      
      if (updatedFeedback && updatedFeedback.length >= 2) {
        const clusterResult = await analyzer.clusterFeedback(updatedFeedback);
        
        if (clusterResult && clusterResult.groups && clusterResult.groups.length > 0) {
          // Update or create clusters in database
          const { error: deleteError } = await supabase
            .from('feedback_clusters')
            .delete()
            .eq('user_id', user.id);
          
          if (deleteError) {
            console.error('Warning: Failed to clear existing clusters:', deleteError);
          }
          
          // Insert new enhanced clusters
          const clusterInserts = clusterResult.groups.map((group, index) => ({
            user_id: user.id,
            cluster_data: group,
            feedback_ids: group.feedback_ids || [],
            total_feedback_count: updatedFeedback.length,
            created_at: new Date().toISOString()
          }));
          
          const { error: insertError } = await supabase
            .from('feedback_clusters')
            .insert(clusterInserts);
          
          if (insertError) {
            console.error('Warning: Failed to insert enhanced clusters:', insertError);
          } else {
            console.log(`✅ Created ${clusterInserts.length} enhanced clusters`);
          }
        }
      }
    } catch (clusterError) {
      console.error('Warning: Enhanced clustering failed:', clusterError);
      // Don't fail the entire operation for clustering errors
    }
    
    // Generate insights
    let insights = null;
    try {
      const { data: allFeedback } = await supabase
        .from('raw_feedback')
        .select('*')
        .eq('user_id', user.id)
        .not('ai_analysis', 'is', null);
      
      if (allFeedback && allFeedback.length > 0) {
        insights = await analyzer.generateInsights(allFeedback);
      }
    } catch (insightsError) {
      console.error('Warning: Insights generation failed:', insightsError);
    }
    
    return NextResponse.json({
      success: true,
      processed: processedCount,
      total: feedbackItems.length,
      errors: errorCount,
      errorDetails: errors.length > 0 ? errors : undefined,
      insights: insights,
      message: `Enhanced processing completed: ${processedCount}/${feedbackItems.length} items processed successfully`
    });
    
  } catch (error) {
    console.error('❌ Enhanced processing failed:', error);
    console.error('Error stack:', error.stack);
    
    return NextResponse.json({
      error: 'Enhanced processing failed',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}