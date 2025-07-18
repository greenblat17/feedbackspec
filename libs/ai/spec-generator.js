import { openAIClient } from "./openai-client.js";
import { createValidationError } from "../errors/error-handler.js";

/**
 * Centralized specification generation utilities
 */
export class SpecGenerator {
  constructor() {
    this.client = openAIClient;
  }

  /**
   * Generate detailed development specification based on feedback theme
   */
  async generateSpec(theme, feedbackList, userId = null) {
    if (!theme || typeof theme !== "string" || !theme.trim()) {
      throw createValidationError("Theme is required for spec generation");
    }

    if (!Array.isArray(feedbackList) || feedbackList.length === 0) {
      throw createValidationError("Feedback list is required and cannot be empty");
    }

    const systemPrompt = `You are an expert software architect and technical writer. Create detailed development specifications for AI coding assistants like Cursor/Claude Code based on user feedback and identified themes.

Your specification should be comprehensive, actionable, and formatted as markdown. Include:
1. Clear problem description
2. Technical requirements
3. Implementation steps with code examples
4. Acceptance criteria
5. Testing considerations
6. Edge cases and error handling

Use modern web development best practices and be specific about technologies, patterns, and approaches.`;

    const feedbackText = feedbackList
      .map((fb, index) => `${index + 1}. "${fb}"`)
      .join("\n");

    const userPrompt = `Create a detailed specification for Cursor/Claude Code based on the following:

**Theme/Issue**: ${theme}

**User Feedback**:
${feedbackText}

Please create a comprehensive development specification that includes:

1. **Problem Description**
   - What issue needs to be addressed
   - User impact and business value
   - Context from feedback

2. **Technical Requirements**
   - Functional requirements
   - Non-functional requirements (performance, security, etc.)
   - Technology stack considerations

3. **Implementation Steps**
   - Detailed step-by-step approach
   - Code examples and patterns
   - File structure and organization

4. **Acceptance Criteria**
   - Definition of done
   - Success metrics
   - User experience expectations

5. **Testing Strategy**
   - Unit tests
   - Integration tests
   - User acceptance testing

6. **Edge Cases & Error Handling**
   - Potential failure scenarios
   - Error recovery mechanisms
   - User feedback for errors

7. **Additional Considerations**
   - Performance implications
   - Security considerations
   - Scalability factors
   - Future extensibility

Format the response as markdown that can be easily consumed by AI coding assistants.`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    try {
      const response = await this.client.makeRequest(messages, {
        max_tokens: 2000,
        temperature: 0.7,
        userId,
        context: "Spec generation",
      });

      return response;
    } catch (error) {
      console.error("Error generating spec:", error);
      throw error;
    }
  }

  /**
   * Generate focused implementation spec for individual feedback
   */
  async generateImplementationSpec(issueType, description, priority, userId = null) {
    if (!issueType || typeof issueType !== "string" || !issueType.trim()) {
      throw createValidationError("Issue type is required");
    }

    if (!description || typeof description !== "string" || !description.trim()) {
      throw createValidationError("Description is required");
    }

    const systemPrompt = `You are an expert software engineer and technical writer. Create focused implementation specifications for AI coding assistants based on specific issues or feature requests.

Your specification should be concise, actionable, and immediately implementable. Focus on practical code solutions and clear implementation steps.`;

    const userPrompt = `Create a focused implementation specification for:

**Type**: ${issueType}
**Description**: ${description}
**Priority**: ${priority || "medium"}

Please create a specification that includes:

1. **Quick Summary**
   - What needs to be implemented
   - Expected outcome

2. **Implementation Approach**
   - Specific files to modify/create
   - Code changes required
   - Dependencies needed

3. **Code Examples**
   - Key functions/components
   - Integration points
   - Configuration changes

4. **Testing**
   - How to verify the implementation
   - Test cases to cover

5. **Rollout Considerations**
   - Deployment steps
   - Potential risks
   - Rollback plan

Format as markdown optimized for AI coding assistants with clear, actionable instructions.`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    try {
      const response = await this.client.makeRequest(messages, {
        max_tokens: 1200,
        temperature: 0.5,
        userId,
        context: "Implementation spec generation",
      });

      return response;
    } catch (error) {
      console.error("Error generating implementation spec:", error);
      throw error;
    }
  }

  /**
   * Generate specification for a cluster of related feedback
   */
  async generateClusterSpec(cluster, userId = null) {
    if (!cluster || typeof cluster !== "object") {
      throw createValidationError("Cluster data is required");
    }

    if (!cluster.theme || !cluster.feedbackIds || cluster.feedbackIds.length === 0) {
      throw createValidationError("Cluster must have theme and feedback IDs");
    }

    const systemPrompt = `You are an expert software architect. Create a comprehensive specification for addressing a cluster of related user feedback.

Focus on creating a unified solution that addresses all feedback in the cluster while maintaining consistency and avoiding feature bloat.`;

    const userPrompt = `Create a specification for addressing this cluster of feedback:

**Theme**: ${cluster.theme}
**Description**: ${cluster.description || "No description provided"}
**Severity**: ${cluster.severity || "medium"}
**Category**: ${cluster.category || "general"}
**Feedback Count**: ${cluster.feedbackIds.length}

**Common Keywords**: ${cluster.commonKeywords?.join(", ") || "None"}
**Suggested Action**: ${cluster.suggestedAction || "Address feedback"}

Please create a unified specification that:

1. **Addresses the Root Cause**
   - What underlying issue needs solving
   - How to address all feedback in this cluster

2. **Unified Solution Approach**
   - Single cohesive implementation
   - Avoid multiple piecemeal fixes
   - Consider user experience consistency

3. **Implementation Strategy**
   - Technical approach
   - Code structure and patterns
   - Integration considerations

4. **Success Metrics**
   - How to measure if the cluster is resolved
   - User satisfaction indicators
   - Technical metrics

5. **Rollout Plan**
   - Deployment strategy
   - Testing with affected users
   - Rollback considerations

Format as markdown optimized for implementation.`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    try {
      const response = await this.client.makeRequest(messages, {
        max_tokens: 1500,
        temperature: 0.6,
        userId,
        context: "Cluster spec generation",
      });

      return response;
    } catch (error) {
      console.error("Error generating cluster spec:", error);
      throw error;
    }
  }

  /**
   * Generate quick action items from feedback
   */
  async generateActionItems(feedbackList, userId = null) {
    if (!Array.isArray(feedbackList) || feedbackList.length === 0) {
      throw createValidationError("Feedback list is required and cannot be empty");
    }

    const systemPrompt = `You are an expert product manager. Convert user feedback into actionable items for a development team.

Return a JSON response with the following format:
{
  "actionItems": [
    {
      "title": "Brief action item title",
      "description": "Detailed description of what needs to be done",
      "priority": "low" | "medium" | "high" | "urgent",
      "category": "bug" | "feature" | "improvement" | "research",
      "estimatedEffort": "hours" | "days" | "weeks",
      "relatedFeedbackIds": [array of feedback IDs that this action addresses],
      "acceptanceCriteria": [array of specific criteria for completion]
    }
  ],
  "summary": {
    "totalActions": number,
    "priorityBreakdown": {
      "urgent": number,
      "high": number,
      "medium": number,
      "low": number
    },
    "categoryBreakdown": {
      "bug": number,
      "feature": number,
      "improvement": number,
      "research": number
    }
  }
}

Focus on creating specific, actionable items that can be immediately worked on.`;

    const feedbackText = feedbackList
      .map((fb, index) => `${index + 1}. "${fb.content || fb}" (ID: ${fb.id || index + 1})`)
      .join("\n");

    const userPrompt = `Convert this feedback into actionable development items:

${feedbackText}

Create specific, actionable items that can be implemented by a development team.`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    try {
      const response = await this.client.makeRequest(messages, {
        max_tokens: 1000,
        temperature: 0.4,
        userId,
        context: "Action items generation",
      });

      const actionItems = this.client.parseJsonResponse(response, {
        actionItems: [],
        summary: {
          totalActions: 0,
          priorityBreakdown: { urgent: 0, high: 0, medium: 0, low: 0 },
          categoryBreakdown: { bug: 0, feature: 0, improvement: 0, research: 0 },
        },
      });

      return actionItems;
    } catch (error) {
      console.error("Error generating action items:", error);
      throw error;
    }
  }
}

// Export singleton instance
export const specGenerator = new SpecGenerator();