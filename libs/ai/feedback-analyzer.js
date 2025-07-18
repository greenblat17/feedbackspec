import { openAIClient } from "./openai-client.js";
import { createValidationError } from "../errors/error-handler.js";

/**
 * Centralized feedback analysis utilities
 */
export class FeedbackAnalyzer {
  constructor() {
    this.client = openAIClient;
  }

  /**
   * Analyze individual feedback entry
   */
  async analyzeFeedback(feedback, userId = null) {
    if (!feedback || typeof feedback !== "string" || !feedback.trim()) {
      throw createValidationError("Feedback content is required");
    }

    const systemPrompt = `You are an expert feedback analyst. Analyze the provided feedback and return a structured JSON response with the following format:
{
  "sentiment": "positive" | "negative" | "neutral",
  "sentimentScore": number between -1 and 1,
  "themes": [array of key themes/topics mentioned],
  "categories": [array of feedback categories like "ui", "performance", "feature_request", "bug", "general"],
  "priority": "low" | "medium" | "high",
  "actionableInsights": [array of specific actionable insights],
  "summary": "brief summary of the feedback",
  "suggestedActions": [array of suggested actions to address the feedback]
}

Be precise and objective in your analysis. Focus on extracting actionable insights.`;

    const userPrompt = `Please analyze this feedback: "${feedback}"`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    try {
      const response = await this.client.makeRequest(messages, {
        max_tokens: 500,
        temperature: 0.3,
        userId,
        context: "Feedback analysis",
      });

      const analysis = this.client.parseJsonResponse(response, {
        sentiment: "neutral",
        sentimentScore: 0,
        themes: [],
        categories: ["general"],
        priority: "medium",
        actionableInsights: [],
        summary: "Analysis completed",
        suggestedActions: [],
      });

      return analysis;
    } catch (error) {
      console.error("Error analyzing feedback:", error);
      throw error;
    }
  }

  /**
   * Analyze multiple feedback entries in batch
   */
  async analyzeFeedbackBatch(feedbackList, userId = null) {
    if (!Array.isArray(feedbackList) || feedbackList.length === 0) {
      throw createValidationError("Feedback list is required and cannot be empty");
    }

    const systemPrompt = `You are an expert feedback analyst. Analyze the provided batch of feedback entries and return a structured JSON response with aggregated insights in the following format:
{
  "overallSentiment": "positive" | "negative" | "neutral",
  "averageSentimentScore": number between -1 and 1,
  "totalFeedback": number,
  "sentimentDistribution": {
    "positive": number,
    "negative": number,
    "neutral": number
  },
  "topThemes": [array of most frequent themes],
  "categoryBreakdown": {
    "ui": number,
    "performance": number,
    "feature_request": number,
    "bug": number,
    "general": number
  },
  "priorityBreakdown": {
    "high": number,
    "medium": number,
    "low": number
  },
  "keyInsights": [array of key insights from all feedback],
  "recommendedActions": [array of recommended actions based on all feedback],
  "summary": "comprehensive summary of all feedback analyzed"
}

Provide meaningful aggregated insights that help understand overall user sentiment and priorities.`;

    const feedbackText = feedbackList
      .map((fb, index) => `${index + 1}. "${fb}"`)
      .join("\n");

    const userPrompt = `Please analyze this batch of feedback entries:\n\n${feedbackText}`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    try {
      const response = await this.client.makeRequest(messages, {
        max_tokens: 800,
        temperature: 0.3,
        userId,
        context: "Batch feedback analysis",
      });

      const analysis = this.client.parseJsonResponse(response, {
        overallSentiment: "neutral",
        averageSentimentScore: 0,
        totalFeedback: feedbackList.length,
        sentimentDistribution: {
          positive: 0,
          negative: 0,
          neutral: feedbackList.length,
        },
        topThemes: [],
        categoryBreakdown: {
          ui: 0,
          performance: 0,
          feature_request: 0,
          bug: 0,
          general: feedbackList.length,
        },
        priorityBreakdown: { high: 0, medium: feedbackList.length, low: 0 },
        keyInsights: [],
        recommendedActions: [],
        summary: "Batch analysis completed",
      });

      return analysis;
    } catch (error) {
      console.error("Error analyzing feedback batch:", error);
      throw error;
    }
  }

  /**
   * Group similar feedback entries by themes
   */
  async groupSimilarFeedback(feedbackList, userId = null) {
    if (!Array.isArray(feedbackList) || feedbackList.length < 2) {
      throw createValidationError("At least 2 feedback entries are required for grouping");
    }

    const systemPrompt = `You are an expert at analyzing user feedback and identifying patterns. Group similar feedback entries that address the same underlying issues, even if they are worded differently.

Return a JSON response with the following format:
{
  "groups": [
    {
      "theme": "Main theme/issue this group addresses",
      "description": "Brief description of the common issue",
      "severity": "low" | "medium" | "high" | "critical",
      "category": "bug" | "feature_request" | "ui" | "performance" | "general",
      "feedbackIds": [array of feedback IDs that belong to this group],
      "commonKeywords": [array of key terms that appear across these feedback items],
      "suggestedAction": "What should be done to address this group of feedback"
    }
  ],
  "ungrouped": [array of feedback IDs that don't fit into any group],
  "summary": {
    "totalGroups": number,
    "largestGroupSize": number,
    "mostCommonTheme": "theme of the largest group"
  }
}

Focus on semantic similarity rather than exact word matches. Group feedback that addresses the same user need or problem.`;

    const feedbackText = feedbackList
      .map(
        (fb, index) =>
          `${index + 1}. "${fb.content || fb}" (ID: ${fb.id || index + 1})`
      )
      .join("\n");

    const userPrompt = `Analyze and group these feedback entries by similarity:

${feedbackText}

Group feedback items that address the same underlying issues, problems, or requests, even if worded differently.`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    try {
      const response = await this.client.makeRequest(messages, {
        max_tokens: 1200,
        temperature: 0.3,
        userId,
        context: "Feedback grouping",
      });

      const grouping = this.client.parseJsonResponse(response, {
        groups: [],
        ungrouped: feedbackList.map((fb, index) => fb.id || index + 1),
        summary: {
          totalGroups: 0,
          largestGroupSize: 0,
          mostCommonTheme: "None",
        },
      });

      return grouping;
    } catch (error) {
      console.error("Error grouping similar feedback:", error);
      throw error;
    }
  }

  /**
   * Detect duplicate feedback
   */
  async findDuplicateFeedback(newFeedback, existingFeedback, userId = null) {
    if (!newFeedback || !Array.isArray(existingFeedback) || existingFeedback.length === 0) {
      return {
        isDuplicate: false,
        similarityScore: 0,
        mostSimilarId: null,
        explanation: "No existing feedback to compare against",
        suggestedAction: "keep_separate",
      };
    }

    const systemPrompt = `You are an expert at detecting duplicate or very similar feedback. Analyze if the new feedback is essentially the same as any existing feedback, even if worded differently.

Return a JSON response:
{
  "isDuplicate": true/false,
  "similarityScore": number between 0-1,
  "mostSimilarId": "ID of most similar existing feedback",
  "explanation": "Brief explanation of why they are/aren't similar",
  "suggestedAction": "merge" | "keep_separate" | "flag_for_review"
}

Consider semantic meaning, not just word matches. Focus on whether they describe the same problem or request.`;

    const existingText = existingFeedback
      .map((fb, index) => `${fb.id || index + 1}. "${fb.content || fb}"`)
      .join("\n");

    const userPrompt = `New feedback: "${newFeedback}"

Existing feedback:
${existingText}

Is the new feedback a duplicate or very similar to any existing feedback?`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    try {
      const response = await this.client.makeRequest(messages, {
        max_tokens: 500,
        temperature: 0.2,
        userId,
        context: "Duplicate detection",
        enableCache: false, // Don't cache duplicate detection as it's context-specific
      });

      const duplicate = this.client.parseJsonResponse(response, {
        isDuplicate: false,
        similarityScore: 0,
        mostSimilarId: null,
        explanation: "Could not analyze for duplicates",
        suggestedAction: "keep_separate",
      });

      return duplicate;
    } catch (error) {
      console.error("Error detecting duplicate feedback:", error);
      throw error;
    }
  }
}

// Export singleton instance
export const feedbackAnalyzer = new FeedbackAnalyzer();