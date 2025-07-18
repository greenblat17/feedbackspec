import axios from "axios";

// Use this if you want to make a call to OpenAI GPT-4 for instance. userId is used to identify the user on openAI side.
export const sendOpenAi = async (messages, userId, max = 100, temp = 1) => {
  const url = "https://api.openai.com/v1/chat/completions";

  console.log("Ask GPT >>>");
  messages.map((m) =>
    console.log(" - " + m.role.toUpperCase() + ": " + m.content)
  );

  const body = JSON.stringify({
    model: "gpt-4",
    messages,
    max_tokens: max,
    temperature: temp,
    user: userId,
  });

  const options = {
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
  };

  try {
    const res = await axios.post(url, body, options);

    const answer = res.data.choices[0].message.content;
    const usage = res?.data?.usage;

    console.log(">>> " + answer);
    console.log(
      "TOKENS USED: " +
        usage?.total_tokens +
        " (prompt: " +
        usage?.prompt_tokens +
        " / response: " +
        usage?.completion_tokens +
        ")"
    );
    console.log("\n");

    return answer;
  } catch (e) {
    console.error("GPT Error: " + e?.response?.status, e?.response?.data);
    return null;
  }
};

// Analyze feedback using OpenAI GPT-4
export const analyzeFeedback = async (feedback, userId = null) => {
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
    const response = await sendOpenAi(messages, userId, 500, 0.3);

    if (!response) {
      return null;
    }

    // Try to parse the JSON response
    try {
      const analysis = JSON.parse(response);
      return analysis;
    } catch (parseError) {
      console.error("Failed to parse GPT response as JSON:", parseError);
      // Return a fallback structure if JSON parsing fails
      return {
        sentiment: "neutral",
        sentimentScore: 0,
        themes: [],
        categories: ["general"],
        priority: "medium",
        actionableInsights: [],
        summary: response,
        suggestedActions: [],
      };
    }
  } catch (error) {
    console.error("Error analyzing feedback:", error);
    return null;
  }
};

// Analyze multiple feedback entries and provide aggregated insights
export const analyzeFeedbackBatch = async (feedbackList, userId = null) => {
  if (!feedbackList || feedbackList.length === 0) {
    return null;
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
    const response = await sendOpenAi(messages, userId, 800, 0.3);

    if (!response) {
      return null;
    }

    // Try to parse the JSON response
    try {
      const analysis = JSON.parse(response);
      return analysis;
    } catch (parseError) {
      console.error("Failed to parse GPT batch response as JSON:", parseError);
      // Return a fallback structure if JSON parsing fails
      return {
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
        summary: response,
      };
    }
  } catch (error) {
    console.error("Error analyzing feedback batch:", error);
    return null;
  }
};

// Generate detailed development specification based on feedback theme and user feedback
export const generateSpec = async (theme, feedbackList, userId = null) => {
  if (!theme || !feedbackList || feedbackList.length === 0) {
    return null;
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
    const response = await sendOpenAi(messages, userId, 1500, 0.7);

    if (!response) {
      return null;
    }

    return response;
  } catch (error) {
    console.error("Error generating spec:", error);
    return null;
  }
};

// Generate focused implementation spec for a specific feature or bug fix
export const generateImplementationSpec = async (
  issueType,
  description,
  priority,
  userId = null
) => {
  if (!issueType || !description) {
    return null;
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
    const response = await sendOpenAi(messages, userId, 1000, 0.5);

    if (!response) {
      return null;
    }

    return response;
  } catch (error) {
    console.error("Error generating implementation spec:", error);
    return null;
  }
};

// Group similar feedback entries by meaning and themes
export const groupSimilarFeedback = async (feedbackList, userId = null) => {
  if (!feedbackList || feedbackList.length < 2) {
    return null;
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
    const response = await sendOpenAi(messages, userId, 1200, 0.3);

    if (!response) {
      return null;
    }

    try {
      const grouping = JSON.parse(response);
      return grouping;
    } catch (parseError) {
      console.error("Failed to parse grouping response as JSON:", parseError);
      return null;
    }
  } catch (error) {
    console.error("Error grouping similar feedback:", error);
    return null;
  }
};

// Find duplicate or very similar feedback based on content similarity
export const findDuplicateFeedback = async (
  newFeedback,
  existingFeedback,
  userId = null
) => {
  if (!newFeedback || !existingFeedback || existingFeedback.length === 0) {
    return null;
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
    const response = await sendOpenAi(messages, userId, 500, 0.2);

    if (!response) {
      return null;
    }

    try {
      const duplicate = JSON.parse(response);
      return duplicate;
    } catch (parseError) {
      console.error(
        "Failed to parse duplicate detection response as JSON:",
        parseError
      );
      return null;
    }
  } catch (error) {
    console.error("Error detecting duplicate feedback:", error);
    return null;
  }
};
