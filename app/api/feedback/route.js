import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  analyzeFeedback,
  findDuplicateFeedback,
  groupSimilarFeedback,
} from "../../../libs/gpt.js";

// Validation rules and constants
const VALIDATION_RULES = {
  title: {
    required: true,
    minLength: 3,
    maxLength: 200,
    type: "string",
  },
  content: {
    required: true,
    minLength: 10,
    maxLength: 2000,
    type: "string",
  },
  source: {
    required: true,
    type: "string",
    enum: [
      "manual",
      "email",
      "twitter",
      "discord",
      "slack",
      "github",
      "website",
      "survey",
      "support",
      "other",
    ],
  },
  priority: {
    required: true,
    type: "string",
    enum: ["low", "medium", "high", "urgent"],
  },
  category: {
    required: true,
    type: "string",
    enum: [
      "feature",
      "bug",
      "improvement",
      "complaint",
      "praise",
      "question",
      "suggestion",
      "other",
    ],
  },
  userEmail: {
    required: false,
    type: "string",
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    maxLength: 254,
  },
  tags: {
    required: false,
    type: "array",
    maxItems: 10,
    itemMaxLength: 50,
  },
  metadata: {
    required: false,
    type: "object",
    maxSize: 1000, // JSON string size limit
  },
};

// Helper function to create authenticated Supabase client
function createAuthenticatedClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );
}

// Input sanitization helper
function sanitizeInput(input) {
  if (typeof input !== "string") return input;

  // Basic XSS protection - remove script tags and dangerous attributes
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+="[^"]*"/gi, "")
    .trim();
}

// Validation helper functions
function validateField(fieldName, value, rule) {
  const errors = [];

  // Required field validation
  if (
    rule.required &&
    (value === null || value === undefined || value === "")
  ) {
    errors.push(`${fieldName} is required`);
    return errors;
  }

  // Skip other validations if field is empty and not required
  if (
    !rule.required &&
    (value === null || value === undefined || value === "")
  ) {
    return errors;
  }

  // Type validation
  if (rule.type === "string" && typeof value !== "string") {
    errors.push(`${fieldName} must be a string`);
  } else if (rule.type === "array" && !Array.isArray(value)) {
    errors.push(`${fieldName} must be an array`);
  } else if (
    rule.type === "object" &&
    (typeof value !== "object" || Array.isArray(value))
  ) {
    errors.push(`${fieldName} must be an object`);
  }

  // Length validation for strings
  if (rule.type === "string" && typeof value === "string") {
    if (rule.minLength && value.length < rule.minLength) {
      errors.push(
        `${fieldName} must be at least ${rule.minLength} characters long`
      );
    }
    if (rule.maxLength && value.length > rule.maxLength) {
      errors.push(`${fieldName} cannot exceed ${rule.maxLength} characters`);
    }
  }

  // Array validation
  if (rule.type === "array" && Array.isArray(value)) {
    if (rule.maxItems && value.length > rule.maxItems) {
      errors.push(`${fieldName} cannot have more than ${rule.maxItems} items`);
    }
    if (rule.itemMaxLength) {
      const invalidItems = value.filter(
        (item) => typeof item === "string" && item.length > rule.itemMaxLength
      );
      if (invalidItems.length > 0) {
        errors.push(
          `${fieldName} items cannot exceed ${rule.itemMaxLength} characters`
        );
      }
    }
  }

  // Enum validation
  if (rule.enum && !rule.enum.includes(value)) {
    errors.push(`${fieldName} must be one of: ${rule.enum.join(", ")}`);
  }

  // Pattern validation (for email)
  if (rule.pattern && typeof value === "string" && !rule.pattern.test(value)) {
    errors.push(`${fieldName} has invalid format`);
  }

  // Object size validation (for metadata)
  if (rule.type === "object" && rule.maxSize && typeof value === "object") {
    const jsonSize = JSON.stringify(value).length;
    if (jsonSize > rule.maxSize) {
      errors.push(`${fieldName} is too large (max ${rule.maxSize} characters)`);
    }
  }

  return errors;
}

// Main validation function
function validateFeedbackData(data) {
  const errors = [];

  // Validate each field according to rules
  Object.entries(VALIDATION_RULES).forEach(([fieldName, rule]) => {
    const fieldErrors = validateField(fieldName, data[fieldName], rule);
    errors.push(...fieldErrors);
  });

  // Additional custom validations
  if (data.tags && Array.isArray(data.tags)) {
    // Check for duplicate tags
    const uniqueTags = [...new Set(data.tags)];
    if (uniqueTags.length !== data.tags.length) {
      errors.push("Tags must be unique");
    }

    // Check for empty tags
    const emptyTags = data.tags.filter((tag) => !tag || tag.trim() === "");
    if (emptyTags.length > 0) {
      errors.push("Tags cannot be empty");
    }
  }

  return errors;
}

// Helper function to update feedback clusters automatically
async function updateFeedbackClusters(supabase, userId) {
  if (!process.env.OPENAI_API_KEY) {
    console.log("⚠️ OpenAI API key not configured - skipping clustering");
    return null;
  }

  if (!userId) {
    console.error("❌ User ID is required for clustering");
    return null;
  }

  try {
    // Get all feedback for this user
    const { data: feedbackData, error: fetchError } = await supabase
      .from("raw_feedback")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (fetchError) {
      console.error("❌ Failed to fetch feedback for clustering:", {
        error: fetchError.message,
        userId: userId,
        code: fetchError.code,
      });
      return null;
    }

    if (!feedbackData || feedbackData.length < 2) {
      console.log(
        `ℹ️ Not enough feedback for clustering (${
          feedbackData?.length || 0
        } items)`
      );
      return null;
    }

    // Transform feedback data with error handling
    const transformedFeedback = feedbackData
      .map((item) => {
        try {
          return {
            id: item.id,
            title: item.metadata?.title || "Untitled",
            content: item.content || "",
            source: item.platform || "unknown",
            priority: item.metadata?.priority || "medium",
            category: item.metadata?.category || "other",
            tags: Array.isArray(item.metadata?.tags) ? item.metadata.tags : [],
            aiAnalysis: item.ai_analysis || null,
          };
        } catch (transformError) {
          console.error("❌ Error transforming feedback item:", {
            itemId: item.id,
            error: transformError.message,
          });
          return null;
        }
      })
      .filter(Boolean); // Remove null items

    if (transformedFeedback.length < 2) {
      console.log("ℹ️ Not enough valid feedback after transformation");
      return null;
    }

    console.log(
      `🔗 Updating feedback clusters for ${transformedFeedback.length} items...`
    );

    // Generate new clusters using AI with timeout
    const clusteringTimeout = new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error("Clustering timeout after 30 seconds")),
        30000
      );
    });

    const feedbackGroups = await Promise.race([
      groupSimilarFeedback(transformedFeedback, userId),
      clusteringTimeout,
    ]);

    if (!feedbackGroups || !feedbackGroups.groups) {
      console.log("ℹ️ No clusters generated by AI");
      return null;
    }

    // Clear existing clusters for this user
    const { error: deleteError } = await supabase
      .from("feedback_clusters")
      .delete()
      .eq("user_id", userId);

    if (deleteError) {
      console.error("❌ Failed to clear existing clusters:", {
        error: deleteError.message,
        userId: userId,
        code: deleteError.code,
      });
      // Continue anyway - we'll try to insert new ones
    }

    // Insert new clusters with validation using correct schema
    const clusterInserts = feedbackGroups.groups
      .filter((group) => group && group.theme) // Validate groups
      .map((group) => ({
        user_id: userId,
        cluster_data: group, // Store the full cluster data as JSONB
        feedback_ids: group.feedbackIds || [], // Array of feedback IDs
        total_feedback_count: transformedFeedback.length, // Total feedback count when clustering was generated
      }));

    if (clusterInserts.length > 0) {
      const { error: insertError } = await supabase
        .from("feedback_clusters")
        .insert(clusterInserts);

      if (insertError) {
        console.error("❌ Failed to insert new clusters:", {
          error: insertError.message,
          userId: userId,
          code: insertError.code,
          clusterCount: clusterInserts.length,
        });
        return null;
      }

      console.log(
        `✅ Successfully updated ${clusterInserts.length} feedback clusters`
      );
    } else {
      console.log("ℹ️ No valid clusters to insert");
    }

    // Also try to retrieve existing clusters from database for UI
    const { data: storedClusters, error: retrieveError } = await supabase
      .from("feedback_clusters")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (retrieveError) {
      console.error("❌ Failed to retrieve stored clusters:", {
        error: retrieveError.message,
        userId: userId,
        code: retrieveError.code,
      });
    }

    // Return both the AI response and the stored clusters
    return {
      ...feedbackGroups,
      storedClusters: storedClusters || [],
    };
  } catch (error) {
    console.error("❌ Critical error in feedback clustering:", {
      error: error.message,
      stack: error.stack,
      userId: userId,
      timestamp: new Date().toISOString(),
    });

    // Try to log to a monitoring service if available
    if (process.env.MONITORING_ENDPOINT) {
      try {
        await fetch(process.env.MONITORING_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            level: "error",
            message: "Feedback clustering failed",
            error: error.message,
            userId: userId,
            timestamp: new Date().toISOString(),
          }),
        });
      } catch (monitoringError) {
        console.error(
          "Failed to send error to monitoring:",
          monitoringError.message
        );
      }
    }

    // Even if clustering fails, try to return existing clusters
    try {
      const { data: storedClusters } = await supabase
        .from("feedback_clusters")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (storedClusters && storedClusters.length > 0) {
        return {
          groups: storedClusters.map((cluster) => cluster.cluster_data),
          storedClusters: storedClusters,
          summary: {
            totalGroups: storedClusters.length,
            largestGroupSize: Math.max(
              ...storedClusters.map((c) => c.feedback_ids?.length || 0)
            ),
            mostCommonTheme:
              storedClusters[0]?.cluster_data?.theme || "Unknown",
          },
        };
      }
    } catch (fallbackError) {
      console.error(
        "❌ Failed to retrieve fallback clusters:",
        fallbackError.message
      );
    }

    return null;
  }
}

// GET /api/feedback - Get all feedback for the authenticated user
export async function GET(request) {
  try {
    const supabase = createAuthenticatedClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch feedback from database
    const { data: feedbackData, error: fetchError } = await supabase
      .from("raw_feedback")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (fetchError) {
      console.error("Error fetching feedback:", fetchError);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch feedback",
          message: fetchError.message,
        },
        { status: 500 }
      );
    }

    // Transform database data to match frontend format
    const transformedFeedback = feedbackData.map((item) => ({
      id: item.id,
      title: item.metadata?.title || "Untitled",
      content: item.content,
      source: item.platform || "unknown",
      priority: item.metadata?.priority || "medium",
      category: item.metadata?.category || "other",
      userEmail: item.metadata?.userEmail || null,
      tags: item.metadata?.tags || [],
      submittedAt: item.created_at,
      processed: item.processed,
      submittedBy: item.user_id,
      metadata: item.metadata,
      aiAnalysis: item.ai_analysis || null, // Include AI analysis if available
    }));

    // Get feedback clusters from database
    const feedbackGroups = await updateFeedbackClusters(supabase, user.id);

    // Calculate AI-powered statistics
    const aiStats = {
      totalAnalyzed: transformedFeedback.filter((f) => f.aiAnalysis).length,
      sentimentDistribution: transformedFeedback.reduce((acc, f) => {
        if (f.aiAnalysis?.sentiment) {
          acc[f.aiAnalysis.sentiment] = (acc[f.aiAnalysis.sentiment] || 0) + 1;
        }
        return acc;
      }, {}),
      aiPriorityDistribution: transformedFeedback.reduce((acc, f) => {
        if (f.aiAnalysis?.priority) {
          acc[f.aiAnalysis.priority] = (acc[f.aiAnalysis.priority] || 0) + 1;
        }
        return acc;
      }, {}),
      topThemes: feedbackGroups?.groups?.map((g) => g.theme) || [],
    };

    return NextResponse.json({
      success: true,
      data: transformedFeedback,
      feedbackGroups: feedbackGroups,
      aiStats: aiStats,
      message: "Feedback retrieved successfully",
    });
  } catch (error) {
    console.error("[Feedback API Error]", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve feedback",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

// POST /api/feedback - Create new feedback
export async function POST(request) {
  try {
    const supabase = createAuthenticatedClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Debug log the received data
    console.log("Received feedback data:", body);

    // Sanitize string inputs
    const sanitizedData = {
      title: sanitizeInput(body.title),
      content: sanitizeInput(body.content),
      source: body.source,
      priority: body.priority,
      category: body.category,
      userEmail: body.userEmail ? sanitizeInput(body.userEmail) : null,
      tags: body.tags,
      metadata: body.metadata,
    };

    // Validate the data using our comprehensive validation system
    const validationErrors = validateFeedbackData(sanitizedData);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationErrors,
          message: validationErrors.join(", "),
        },
        { status: 400 }
      );
    }

    // Process tags and metadata with additional sanitization
    let processedTags = [];
    if (sanitizedData.tags) {
      if (Array.isArray(sanitizedData.tags)) {
        processedTags = sanitizedData.tags
          .filter((tag) => tag && typeof tag === "string")
          .map((tag) => sanitizeInput(tag.trim()))
          .filter((tag) => tag);
      } else if (
        typeof sanitizedData.tags === "string" &&
        sanitizedData.tags.trim()
      ) {
        processedTags = sanitizedData.tags
          .split(",")
          .map((tag) => sanitizeInput(tag.trim()))
          .filter((tag) => tag);
      }
    }

    let processedMetadata = null;
    if (sanitizedData.metadata) {
      if (typeof sanitizedData.metadata === "string") {
        try {
          processedMetadata = JSON.parse(sanitizedData.metadata);
        } catch (e) {
          return NextResponse.json(
            { error: "Invalid JSON in metadata field" },
            { status: 400 }
          );
        }
      } else {
        processedMetadata = sanitizedData.metadata;
      }
    }

    // Prepare data for database
    const feedbackData = {
      user_id: user.id,
      platform: sanitizedData.source,
      content: sanitizedData.content.trim(),
      metadata: {
        title: sanitizedData.title.trim(),
        priority: sanitizedData.priority,
        category: sanitizedData.category,
        userEmail: sanitizedData.userEmail || null,
        tags: processedTags,
        ...processedMetadata, // Include any additional metadata from the form
      },
      processed: false,
    };

    // Check for duplicate feedback before saving
    let duplicateCheck = null;
    if (process.env.OPENAI_API_KEY) {
      try {
        // Get existing feedback to check for duplicates
        const { data: existingFeedback } = await supabase
          .from("raw_feedback")
          .select("id, content")
          .eq("user_id", user.id)
          .limit(20); // Check against recent feedback only

        if (existingFeedback && existingFeedback.length > 0) {
          duplicateCheck = await findDuplicateFeedback(
            sanitizedData.content,
            existingFeedback,
            user.id
          );
        }
      } catch (error) {
        console.error("Warning: Duplicate check failed:", error.message);
        // Continue anyway
      }
    }

    // Save to database
    const { data: insertedData, error: insertError } = await supabase
      .from("raw_feedback")
      .insert([feedbackData])
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting feedback:", insertError);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to create feedback",
          message: insertError.message,
        },
        { status: 500 }
      );
    }

    // Update feedback clusters after adding new feedback
    await updateFeedbackClusters(supabase, user.id);

    // Perform AI Analysis on the feedback
    let aiAnalysis = null;
    if (process.env.OPENAI_API_KEY && insertedData.content) {
      console.log("🧠 Performing AI analysis on feedback...");

      try {
        // Validate content before analysis
        if (!insertedData.content.trim()) {
          console.warn("⚠️ Empty content - skipping AI analysis");
        } else {
          // Create timeout for AI analysis
          const aiTimeout = new Promise((_, reject) => {
            setTimeout(
              () => reject(new Error("AI analysis timeout after 15 seconds")),
              15000
            );
          });

          // Analyze the feedback content with timeout
          aiAnalysis = await Promise.race([
            analyzeFeedback(insertedData.content, user.id),
            aiTimeout,
          ]);

          if (aiAnalysis) {
            console.log(
              `✅ AI Analysis completed: ${aiAnalysis.sentiment} sentiment, ${aiAnalysis.priority} priority`
            );

            // Validate AI analysis structure
            if (!aiAnalysis.sentiment || !aiAnalysis.priority) {
              console.warn("⚠️ AI analysis incomplete - using fallback values");
              aiAnalysis = {
                sentiment: aiAnalysis.sentiment || "neutral",
                priority: aiAnalysis.priority || "medium",
                themes: aiAnalysis.themes || [],
                categories: aiAnalysis.categories || ["general"],
                summary: aiAnalysis.summary || "AI analysis completed",
                actionableInsights: aiAnalysis.actionableInsights || [],
                suggestedActions: aiAnalysis.suggestedActions || [],
                sentimentScore: aiAnalysis.sentimentScore || 0,
              };
            }

            // Update the feedback record with AI analysis
            try {
              const { error: updateError } = await supabase
                .from("raw_feedback")
                .update({
                  ai_analysis: aiAnalysis,
                })
                .eq("id", insertedData.id);

              if (updateError) {
                console.error(
                  "❌ Failed to update feedback with AI analysis:",
                  {
                    error: updateError.message,
                    feedbackId: insertedData.id,
                    code: updateError.code,
                  }
                );
                // Continue anyway - we still have the analysis for the response
              }
            } catch (updateError) {
              console.error(
                "❌ Critical error updating feedback with AI analysis:",
                {
                  error: updateError.message,
                  feedbackId: insertedData.id,
                  stack: updateError.stack,
                }
              );
              // Continue anyway
            }
          } else {
            console.warn("⚠️ AI analysis returned empty result");
          }
        }
      } catch (aiError) {
        console.error("❌ AI analysis failed:", {
          error: aiError.message,
          feedbackId: insertedData.id,
          contentLength: insertedData.content?.length || 0,
          stack: aiError.stack,
        });

        // Try to log to monitoring service
        if (process.env.MONITORING_ENDPOINT) {
          try {
            await fetch(process.env.MONITORING_ENDPOINT, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                level: "error",
                message: "AI analysis failed",
                error: aiError.message,
                feedbackId: insertedData.id,
                userId: user.id,
                timestamp: new Date().toISOString(),
              }),
            });
          } catch (monitoringError) {
            console.error(
              "Failed to send AI error to monitoring:",
              monitoringError.message
            );
          }
        }

        // Continue anyway - feedback was saved successfully, just without AI analysis
      }
    } else {
      if (!process.env.OPENAI_API_KEY) {
        console.log("ℹ️ OpenAI API key not configured - skipping AI analysis");
      } else if (!insertedData.content) {
        console.warn("⚠️ No content provided - skipping AI analysis");
      }
    }

    // Transform the response to match frontend format
    const responseData = {
      id: insertedData.id,
      title: insertedData.metadata?.title || "Untitled",
      content: insertedData.content,
      source: insertedData.platform,
      priority: insertedData.metadata?.priority || "medium",
      category: insertedData.metadata?.category || "other",
      userEmail: insertedData.metadata?.userEmail || null,
      tags: insertedData.metadata?.tags || [],
      submittedAt: insertedData.created_at,
      processed: insertedData.processed,
      submittedBy: insertedData.user_id,
      metadata: insertedData.metadata,
      aiAnalysis: aiAnalysis, // Include AI analysis in response
      duplicateCheck: duplicateCheck, // Include duplicate check results
    };

    const response = {
      success: true,
      data: responseData,
      message: "Feedback created successfully",
    };

    // Add AI analysis status to response
    if (aiAnalysis) {
      response.message = "Feedback created and analyzed successfully";
      response.aiAnalysisStatus = "completed";
    } else if (process.env.OPENAI_API_KEY) {
      response.aiAnalysisStatus = "failed";
    } else {
      response.aiAnalysisStatus = "disabled";
    }

    // Add duplicate warning if needed
    if (duplicateCheck?.isDuplicate && duplicateCheck.similarityScore > 0.7) {
      response.duplicateWarning = {
        message: "Similar feedback already exists",
        similarityScore: duplicateCheck.similarityScore,
        explanation: duplicateCheck.explanation,
        suggestedAction: duplicateCheck.suggestedAction,
      };
    }

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("[Feedback Creation Error]", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create feedback",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

// PUT /api/feedback - Update existing feedback
export async function PUT(request) {
  try {
    const supabase = createAuthenticatedClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { error: "Feedback ID is required" },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData = {};

    // Handle processed status update
    if (typeof body.processed === "boolean") {
      updateData.processed = body.processed;
    }

    // Handle metadata updates
    if (body.metadata) {
      updateData.metadata = body.metadata;
    }

    // Update the feedback in database
    const { data: updatedData, error: updateError } = await supabase
      .from("raw_feedback")
      .update(updateData)
      .eq("id", body.id)
      .eq("user_id", user.id) // Ensure user can only update their own feedback
      .select()
      .single();

    if (updateError) {
      console.error("Error updating feedback:", updateError);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to update feedback",
          message: updateError.message,
        },
        { status: 500 }
      );
    }

    if (!updatedData) {
      return NextResponse.json(
        { error: "Feedback not found or unauthorized" },
        { status: 404 }
      );
    }

    // Update feedback clusters after feedback was updated
    await updateFeedbackClusters(supabase, user.id);

    // Transform the response to match frontend format
    const responseData = {
      id: updatedData.id,
      title: updatedData.metadata?.title || "Untitled",
      content: updatedData.content,
      source: updatedData.platform,
      priority: updatedData.metadata?.priority || "medium",
      category: updatedData.metadata?.category || "other",
      userEmail: updatedData.metadata?.userEmail || null,
      tags: updatedData.metadata?.tags || [],
      submittedAt: updatedData.created_at,
      processed: updatedData.processed,
      submittedBy: updatedData.user_id,
      metadata: updatedData.metadata,
    };

    return NextResponse.json({
      success: true,
      data: responseData,
      message: "Feedback updated successfully",
    });
  } catch (error) {
    console.error("[Feedback Update Error]", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update feedback",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

// DELETE /api/feedback - Delete feedback
export async function DELETE(request) {
  try {
    const supabase = createAuthenticatedClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const feedbackId = url.searchParams.get("id");

    if (!feedbackId) {
      return NextResponse.json(
        { error: "Feedback ID is required" },
        { status: 400 }
      );
    }

    // Delete the feedback from database
    const { error: deleteError } = await supabase
      .from("raw_feedback")
      .delete()
      .eq("id", feedbackId)
      .eq("user_id", user.id); // Ensure user can only delete their own feedback

    if (deleteError) {
      console.error("Error deleting feedback:", deleteError);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to delete feedback",
          message: deleteError.message,
        },
        { status: 500 }
      );
    }

    // Update feedback clusters after feedback was deleted
    await updateFeedbackClusters(supabase, user.id);

    return NextResponse.json({
      success: true,
      message: "Feedback deleted successfully",
    });
  } catch (error) {
    console.error("[Feedback Delete Error]", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete feedback",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
