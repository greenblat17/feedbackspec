import OpenAI from 'openai';

/**
 * Enhanced Feedback Analyzer with improved AI analysis capabilities
 * Provides detailed analysis including sentiment, priority, impact, and clustering
 */
export class EnhancedFeedbackAnalyzer {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Analyze individual feedback with enhanced metadata and platform context
   * @param {string} feedback - The feedback content to analyze
   * @param {string} platform - Platform source (gmail, twitter, etc.)
   * @param {Object} metadata - Additional metadata about the feedback
   * @returns {Promise<Object>} Enhanced analysis results
   */
  async analyzeFeedback(feedback, platform, metadata = {}) {
    try {
      // Build context from platform and metadata
      let platformContext = `Platform: ${platform}`;
      
      if (metadata) {
        if (metadata.author) {
          platformContext += `\nAuthor: ${metadata.author}`;
        }
        if (metadata.followers) {
          platformContext += `\nFollowers: ${metadata.followers}`;
        }
        if (metadata.retweets || metadata.likes) {
          platformContext += `\nEngagement: ${metadata.retweets || 0} retweets, ${metadata.likes || 0} likes`;
        }
        if (metadata.subject) {
          platformContext += `\nSubject: ${metadata.subject}`;
        }
        if (metadata.from) {
          platformContext += `\nFrom: ${metadata.from}`;
        }
      }

      const prompt = `You are an advanced feedback analyst. Analyze the following user feedback and provide a comprehensive analysis.

${platformContext}

Feedback Content:
"${feedback}"

IMPORTANT: Be very strict about what constitutes genuine user feedback. The following are NOT feedback:
- Marketing emails (newsletters, promotions, advertisements)
- Automated notifications (password resets, confirmations, alerts)
- Unsubscribe links and legal footers
- Social media notifications (likes, follows, recommendations)
- Spam or commercial messages
- Third-party service emails (Pinterest, Facebook, etc.)
- System-generated messages

Only classify as feedback if the content contains:
- Direct user opinions about a product/service
- Bug reports or technical issues
- Feature requests or suggestions
- Complaints about specific functionality
- Praise for specific features
- Questions about how to use a product

Please analyze this content and return a JSON object with the following structure:
{
  "sentiment": "positive|negative|neutral",
  "priority": "low|medium|high|urgent",
  "category": "bug|feature|improvement|complaint|praise|question|suggestion|general",
  "confidence": 0.95,
  "keywords": ["keyword1", "keyword2"],
  "user_intent": "Brief description of what the user wants/needs",
  "business_impact": "low|medium|high",
  "urgency": "low|medium|high",
  "reasoning": "Brief explanation of the analysis",
  "suggested_action": "Recommended next steps"
}

Analysis Guidelines:
- Use "general" category for non-feedback content (marketing, notifications, spam)
- Set low confidence (< 0.8) for unclear or non-feedback content
- Be conservative - when in doubt, classify as "general"
- Marketing emails should ALWAYS be "general" with low confidence
- Automated system emails should ALWAYS be "general" with low confidence
- Only high-confidence genuine feedback should get specific categories
- Confidence should be between 0.0 and 1.0`;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an expert feedback analyst. Always respond with valid JSON that matches the requested schema exactly."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 1000
      });

      const analysis = JSON.parse(completion.choices[0].message.content);
      
      // Validate and ensure all required fields are present
      const enhancedAnalysis = {
        sentiment: analysis.sentiment || 'neutral',
        priority: analysis.priority || 'medium',
        category: analysis.category || 'general',
        confidence: Math.min(Math.max(analysis.confidence || 0.8, 0.0), 1.0),
        keywords: analysis.keywords || [],
        user_intent: analysis.user_intent || 'Not specified',
        business_impact: analysis.business_impact || 'medium',
        urgency: analysis.urgency || 'medium',
        reasoning: analysis.reasoning || 'Analysis completed',
        suggested_action: analysis.suggested_action || 'Review and categorize',
        platform_context: {
          platform,
          metadata
        }
      };

      console.log(`✅ Enhanced analysis completed for ${platform} feedback with ${enhancedAnalysis.confidence} confidence`);
      return enhancedAnalysis;

    } catch (error) {
      console.error('Enhanced feedback analysis failed:', error);
      
      // Return fallback analysis
      return {
        sentiment: 'neutral',
        priority: 'medium',
        category: 'general',
        confidence: 0.5,
        keywords: [],
        user_intent: 'Analysis failed - manual review needed',
        business_impact: 'medium',
        urgency: 'medium',
        reasoning: `Analysis failed: ${error.message}`,
        suggested_action: 'Manual review required',
        platform_context: { platform, metadata },
        error: true
      };
    }
  }

  /**
   * Cluster feedback items into related groups with enhanced business context
   * @param {Array} feedbackList - Array of feedback objects to cluster
   * @returns {Promise<Object>} Clustering results with business insights
   */
  async clusterFeedback(feedbackList) {
    try {
      // Check minimum required items for clustering
      if (!feedbackList || feedbackList.length < 2) {
        console.log('📊 Insufficient feedback items for clustering (minimum 2 required)');
        return {
          groups: [],
          summary: {
            totalGroups: 0,
            totalItems: feedbackList?.length || 0,
            message: 'Need at least 2 feedback items for clustering'
          }
        };
      }

      console.log(`📊 Starting enhanced clustering for ${feedbackList.length} feedback items`);

      // Prepare feedback data with enhanced context
      const feedbackData = feedbackList.map((f, index) => {
        const platformInfo = f.platform ? `[${f.platform.toUpperCase()}]` : '[UNKNOWN]';
        const priority = f.ai_analysis?.priority || f.priority || 'N/A';
        const sentiment = f.ai_analysis?.sentiment || 'N/A';
        const businessImpact = f.ai_analysis?.business_impact || 'N/A';
        
        return `${index + 1}. ${platformInfo} "${f.content}" (Priority: ${priority}, Sentiment: ${sentiment}, Impact: ${businessImpact})`;
      }).join('\n');

      const prompt = `You are an expert product manager analyzing user feedback. Group the following feedback items into logical clusters that will help prioritize product development.

Feedback Items:
${feedbackData}

Please analyze and group this feedback into clusters, returning a JSON object with this structure:
{
  "groups": [
    {
      "id": "cluster_1",
      "theme": "Brief theme description",
      "description": "Detailed description of what this cluster represents",
      "feedback_ids": [1, 3, 5],
      "priority": "high|medium|low",
      "business_impact": "high|medium|low",
      "estimated_effort": "1-5 story points",
      "suggested_solution": "High-level solution approach",
      "affected_platforms": ["twitter", "gmail"]
    }
  ],
  "summary": {
    "totalGroups": 3,
    "recommendedOrder": [1, 2, 3],
    "insights": "Key insights about the feedback patterns"
  }
}

Clustering Guidelines:
- Group by product components, features, or user workflows
- Consider business impact and technical feasibility
- Prioritize based on frequency and user impact
- Look for patterns across different platforms
- Identify quick wins vs major initiatives
- Consider user types and use cases
- Group similar pain points together
- Separate bugs from feature requests
- Consider implementation complexity

Effort Estimation:
- 1 point: Minor fixes, copy changes
- 2 points: Small features, UI improvements  
- 3 points: Medium features, integrations
- 4 points: Major features, complex workflows
- 5 points: Large initiatives, architectural changes`;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert product manager and data analyst. Always respond with valid JSON that matches the requested schema exactly."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.4,
        max_tokens: 3000
      });

      const clusterResult = JSON.parse(completion.choices[0].message.content);
      
      // Validate and enhance cluster results
      const enhancedResult = {
        groups: (clusterResult.groups || []).map((group, index) => ({
          id: group.id || `cluster_${index + 1}`,
          theme: group.theme || `Theme ${index + 1}`,
          description: group.description || 'No description provided',
          feedback_ids: group.feedback_ids || [],
          priority: group.priority || 'medium',
          business_impact: group.business_impact || 'medium',
          estimated_effort: group.estimated_effort || '3 story points',
          suggested_solution: group.suggested_solution || 'Needs analysis',
          affected_platforms: group.affected_platforms || [],
          item_count: (group.feedback_ids || []).length
        })),
        summary: {
          totalGroups: (clusterResult.groups || []).length,
          totalItems: feedbackList.length,
          recommendedOrder: clusterResult.summary?.recommendedOrder || [],
          insights: clusterResult.summary?.insights || 'Clustering completed successfully',
          clustered_items: (clusterResult.groups || []).reduce((sum, g) => sum + (g.feedback_ids || []).length, 0),
          unclustered_items: feedbackList.length - (clusterResult.groups || []).reduce((sum, g) => sum + (g.feedback_ids || []).length, 0)
        }
      };

      console.log(`✅ Enhanced clustering completed: ${enhancedResult.summary.totalGroups} groups created`);
      return enhancedResult;

    } catch (error) {
      console.error('Enhanced clustering failed:', error);
      
      // Return fallback clustering
      return {
        groups: [],
        summary: {
          totalGroups: 0,
          totalItems: feedbackList?.length || 0,
          error: `Clustering failed: ${error.message}`,
          message: 'Manual grouping recommended'
        }
      };
    }
  }

  /**
   * Generate insights from feedback analysis
   * @param {Array} feedbackList - Array of analyzed feedback
   * @returns {Promise<Object>} Business insights and recommendations
   */
  async generateInsights(feedbackList) {
    try {
      if (!feedbackList || feedbackList.length === 0) {
        return {
          insights: [],
          recommendations: [],
          summary: 'No feedback available for analysis'
        };
      }

      // Calculate metrics
      const sentimentDistribution = feedbackList.reduce((acc, f) => {
        const sentiment = f.ai_analysis?.sentiment || 'neutral';
        acc[sentiment] = (acc[sentiment] || 0) + 1;
        return acc;
      }, {});

      const priorityDistribution = feedbackList.reduce((acc, f) => {
        const priority = f.ai_analysis?.priority || 'medium';
        acc[priority] = (acc[priority] || 0) + 1;
        return acc;
      }, {});

      const platformDistribution = feedbackList.reduce((acc, f) => {
        const platform = f.platform || 'unknown';
        acc[platform] = (acc[platform] || 0) + 1;
        return acc;
      }, {});

      return {
        metrics: {
          total_feedback: feedbackList.length,
          sentiment_distribution: sentimentDistribution,
          priority_distribution: priorityDistribution,
          platform_distribution: platformDistribution
        },
        insights: [
          `Analyzed ${feedbackList.length} feedback items across ${Object.keys(platformDistribution).length} platforms`,
          `Sentiment breakdown: ${Math.round((sentimentDistribution.positive || 0) / feedbackList.length * 100)}% positive, ${Math.round((sentimentDistribution.negative || 0) / feedbackList.length * 100)}% negative`,
          `Priority breakdown: ${priorityDistribution.high || 0} high priority, ${priorityDistribution.urgent || 0} urgent items`
        ],
        recommendations: [
          priorityDistribution.urgent > 0 ? 'Address urgent items immediately' : null,
          priorityDistribution.high > 5 ? 'High priority backlog needs attention' : null,
          (sentimentDistribution.negative || 0) > (sentimentDistribution.positive || 0) ? 'Focus on addressing negative feedback' : null
        ].filter(Boolean)
      };

    } catch (error) {
      console.error('Insights generation failed:', error);
      return {
        insights: [],
        recommendations: [],
        summary: `Insights generation failed: ${error.message}`
      };
    }
  }
}