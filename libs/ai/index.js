/**
 * Centralized AI utilities for feedbackspec
 * 
 * This module provides a unified interface for all AI-powered functionality
 * including feedback analysis, clustering, and specification generation.
 */

// Core AI client
export { openAIClient, OpenAIClient } from "./openai-client.js";

// Feedback analysis utilities
export { feedbackAnalyzer, FeedbackAnalyzer } from "./feedback-analyzer.js";

// Specification generation utilities
export { specGenerator, SpecGenerator } from "./spec-generator.js";

// Legacy exports for backwards compatibility
export const sendOpenAi = async (messages, userId, max = 100, temp = 1) => {
  const { openAIClient } = await import("./openai-client.js");
  
  return openAIClient.makeRequest(messages, {
    max_tokens: max,
    temperature: temp,
    userId,
    context: "Legacy sendOpenAi call",
  });
};

export const analyzeFeedback = async (feedback, userId = null) => {
  const { feedbackAnalyzer } = await import("./feedback-analyzer.js");
  return feedbackAnalyzer.analyzeFeedback(feedback, userId);
};

export const analyzeFeedbackBatch = async (feedbackList, userId = null) => {
  const { feedbackAnalyzer } = await import("./feedback-analyzer.js");
  return feedbackAnalyzer.analyzeFeedbackBatch(feedbackList, userId);
};

export const groupSimilarFeedback = async (feedbackList, userId = null) => {
  const { feedbackAnalyzer } = await import("./feedback-analyzer.js");
  return feedbackAnalyzer.groupSimilarFeedback(feedbackList, userId);
};

export const findDuplicateFeedback = async (newFeedback, existingFeedback, userId = null) => {
  const { feedbackAnalyzer } = await import("./feedback-analyzer.js");
  return feedbackAnalyzer.findDuplicateFeedback(newFeedback, existingFeedback, userId);
};

export const generateSpec = async (theme, feedbackList, userId = null) => {
  const { specGenerator } = await import("./spec-generator.js");
  return specGenerator.generateSpec(theme, feedbackList, userId);
};

export const generateImplementationSpec = async (issueType, description, priority, userId = null) => {
  const { specGenerator } = await import("./spec-generator.js");
  return specGenerator.generateImplementationSpec(issueType, description, priority, userId);
};

// New utilities
export const generateClusterSpec = async (cluster, userId = null) => {
  const { specGenerator } = await import("./spec-generator.js");
  return specGenerator.generateClusterSpec(cluster, userId);
};

export const generateActionItems = async (feedbackList, userId = null) => {
  const { specGenerator } = await import("./spec-generator.js");
  return specGenerator.generateActionItems(feedbackList, userId);
};

// Utility functions
export const getAIStats = () => {
  const { openAIClient } = require("./openai-client.js");
  return openAIClient.getStats();
};

export const isAIConfigured = () => {
  const { openAIClient } = require("./openai-client.js");
  return openAIClient.isConfigured();
};