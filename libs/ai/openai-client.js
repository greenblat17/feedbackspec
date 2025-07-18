import axios from "axios";
import { createExternalServiceError, logErrorToMonitoring } from "../errors/error-handler.js";

/**
 * Centralized OpenAI client with rate limiting, caching, and error handling
 */
export class OpenAIClient {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.baseUrl = "https://api.openai.com/v1";
    this.defaultModel = "gpt-4";
    this.cache = new Map();
    this.rateLimitTracker = new Map();
    this.defaultTimeout = 30000; // 30 seconds
  }

  /**
   * Check if OpenAI API key is configured
   */
  isConfigured() {
    return !!this.apiKey;
  }

  /**
   * Generate cache key for request
   */
  generateCacheKey(messages, options = {}) {
    const key = JSON.stringify({
      messages,
      model: options.model || this.defaultModel,
      temperature: options.temperature || 0.7,
      max_tokens: options.max_tokens || 1000,
    });
    return Buffer.from(key).toString('base64');
  }

  /**
   * Check rate limiting for user
   */
  checkRateLimit(userId) {
    if (!userId) return true;

    const now = Date.now();
    const userLimits = this.rateLimitTracker.get(userId) || { 
      requests: [], 
      lastReset: now 
    };

    // Reset counter every hour
    if (now - userLimits.lastReset > 3600000) {
      userLimits.requests = [];
      userLimits.lastReset = now;
    }

    // Remove requests older than 1 hour
    userLimits.requests = userLimits.requests.filter(
      timestamp => now - timestamp < 3600000
    );

    // Check if user has exceeded rate limit (100 requests per hour)
    if (userLimits.requests.length >= 100) {
      return false;
    }

    // Add current request
    userLimits.requests.push(now);
    this.rateLimitTracker.set(userId, userLimits);

    return true;
  }

  /**
   * Get cached response if available
   */
  getCachedResponse(cacheKey) {
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 3600000) { // 1 hour cache
      return cached.response;
    }
    return null;
  }

  /**
   * Cache response
   */
  setCachedResponse(cacheKey, response) {
    // Limit cache size to prevent memory issues
    if (this.cache.size >= 1000) {
      // Remove oldest entries
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(cacheKey, {
      response,
      timestamp: Date.now(),
    });
  }

  /**
   * Create timeout promise
   */
  createTimeoutPromise(timeoutMs) {
    return new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error(`OpenAI request timeout after ${timeoutMs}ms`)),
        timeoutMs
      );
    });
  }

  /**
   * Make OpenAI API request with comprehensive error handling
   */
  async makeRequest(messages, options = {}) {
    const {
      model = this.defaultModel,
      max_tokens = 1000,
      temperature = 0.7,
      userId = null,
      timeout = this.defaultTimeout,
      enableCache = true,
      context = "OpenAI request",
    } = options;

    // Check if API key is configured
    if (!this.isConfigured()) {
      throw createExternalServiceError(
        "openai",
        "OpenAI API key not configured",
        "OPENAI_API_KEY environment variable is missing"
      );
    }

    // Check rate limiting
    if (!this.checkRateLimit(userId)) {
      throw createExternalServiceError(
        "openai",
        "Rate limit exceeded",
        "User has exceeded OpenAI rate limit (100 requests per hour)"
      );
    }

    // Check cache if enabled
    if (enableCache) {
      const cacheKey = this.generateCacheKey(messages, { model, temperature, max_tokens });
      const cachedResponse = this.getCachedResponse(cacheKey);
      if (cachedResponse) {
        console.log(`📦 Using cached OpenAI response for ${context}`);
        return cachedResponse;
      }
    }

    // Log request details
    console.log(`🤖 Making OpenAI request for ${context}:`);
    console.log(`  Model: ${model}`);
    console.log(`  Messages: ${messages.length}`);
    console.log(`  User ID: ${userId || "anonymous"}`);
    console.log(`  Temperature: ${temperature}`);
    console.log(`  Max tokens: ${max_tokens}`);

    // Prepare request
    const requestBody = {
      model,
      messages,
      max_tokens,
      temperature,
      user: userId,
    };

    const requestOptions = {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: timeout,
    };

    try {
      // Make request with timeout
      const response = await Promise.race([
        axios.post(`${this.baseUrl}/chat/completions`, requestBody, requestOptions),
        this.createTimeoutPromise(timeout),
      ]);

      // Extract response data
      const content = response.data.choices[0]?.message?.content;
      const usage = response.data.usage;

      if (!content) {
        throw createExternalServiceError(
          "openai",
          "Empty response from OpenAI",
          "OpenAI returned no content in response"
        );
      }

      // Log usage information
      console.log(`✅ OpenAI response received for ${context}:`);
      console.log(`  Response length: ${content.length} characters`);
      console.log(`  Tokens used: ${usage?.total_tokens || 0} (prompt: ${usage?.prompt_tokens || 0}, completion: ${usage?.completion_tokens || 0})`);

      // Cache response if enabled
      if (enableCache) {
        const cacheKey = this.generateCacheKey(messages, { model, temperature, max_tokens });
        this.setCachedResponse(cacheKey, content);
      }

      return content;

    } catch (error) {
      // Handle different types of errors
      let errorMessage = "Unknown OpenAI error";
      let errorDetails = error.message;

      if (error.response) {
        // HTTP error from OpenAI API
        const status = error.response.status;
        const data = error.response.data;

        switch (status) {
          case 400:
            errorMessage = "Invalid request to OpenAI";
            errorDetails = data?.error?.message || "Bad request";
            break;
          case 401:
            errorMessage = "OpenAI authentication failed";
            errorDetails = "Invalid API key or unauthorized access";
            break;
          case 429:
            errorMessage = "OpenAI rate limit exceeded";
            errorDetails = data?.error?.message || "Too many requests";
            break;
          case 500:
            errorMessage = "OpenAI server error";
            errorDetails = "Internal server error from OpenAI";
            break;
          default:
            errorMessage = `OpenAI API error (${status})`;
            errorDetails = data?.error?.message || error.message;
        }
      } else if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
        errorMessage = "OpenAI request timeout";
        errorDetails = `Request timed out after ${timeout}ms`;
      } else if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
        errorMessage = "OpenAI connection failed";
        errorDetails = "Unable to connect to OpenAI API";
      }

      // Log error for monitoring
      await logErrorToMonitoring(error, context, userId);

      // Throw structured error
      throw createExternalServiceError("openai", errorMessage, errorDetails);
    }
  }

  /**
   * Parse JSON response with fallback
   */
  parseJsonResponse(response, fallbackValue = null) {
    try {
      return JSON.parse(response);
    } catch (parseError) {
      console.error("Failed to parse OpenAI JSON response:", parseError);
      console.log("Raw response:", response);
      return fallbackValue;
    }
  }

  /**
   * Clean up cache and rate limit tracking
   */
  cleanup() {
    const now = Date.now();
    
    // Clean up cache entries older than 1 hour
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > 3600000) {
        this.cache.delete(key);
      }
    }

    // Clean up rate limit tracking for inactive users
    for (const [userId, data] of this.rateLimitTracker.entries()) {
      if (now - data.lastReset > 7200000) { // 2 hours
        this.rateLimitTracker.delete(userId);
      }
    }
  }

  /**
   * Get cache and rate limit statistics
   */
  getStats() {
    return {
      cacheSize: this.cache.size,
      activeUsers: this.rateLimitTracker.size,
      isConfigured: this.isConfigured(),
    };
  }
}

// Export singleton instance
export const openAIClient = new OpenAIClient();

// Cleanup cache and rate limits every hour
setInterval(() => {
  openAIClient.cleanup();
}, 3600000);