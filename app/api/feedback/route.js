import { NextResponse } from "next/server";
import {
  createAuthenticatedSupabaseClient,
  getAuthenticatedUser,
} from "../../../libs/auth/server-auth.js";
import {
  analyzeFeedback,
  findDuplicateFeedback,
  groupSimilarFeedback,
} from "../../../libs/ai/index.js";
import { EnhancedFeedbackAnalyzer } from "../../../lib/ai/enhanced-analyzer.js";
import {
  withErrorHandler,
  createValidationError,
  createAuthError,
  createDatabaseError,
  createExternalServiceError,
  logErrorToMonitoring,
} from "../../../libs/errors/error-handler.js";
import {
  validateFeedback,
  validateRequired,
  validateUUID,
} from "../../../libs/validation/validators.js";
import { feedbackDB } from "../../../libs/database/db-utils.js";


// Helper function to update feedback clusters automatically
async function updateFeedbackClusters(supabase, userId) {
  const { isAIConfigured } = await import("../../../libs/ai/index.js");
  if (!isAIConfigured()) {
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

    // Check if we already have valid clusters and whether they need updating
    console.log("🔍 Checking for existing clusters for user:", userId);
    const { data: existingClusters, error: checkError } = await supabase
      .from("feedback_clusters")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    console.log("🔍 Existing clusters check result:", {
      count: existingClusters?.length || 0,
      error: checkError?.message || null,
      clusters:
        existingClusters?.map((c) => ({
          id: c.id,
          theme: c.cluster_data?.theme,
        })) || [],
    });

    // Determine if we should update clusters
    let shouldUpdateClusters = false;
    
    if (!existingClusters || existingClusters.length === 0) {
      console.log("🔍 No existing clusters found, will generate new ones");
      shouldUpdateClusters = true;
    } else {
      // Check if the feedback count has changed since last clustering
      const lastCluster = existingClusters[0];
      const lastClusterFeedbackCount = lastCluster.total_feedback_count || 0;
      const currentFeedbackCount = transformedFeedback.length;
      
      // Check if clusters are older than 24 hours
      const lastClusterTime = new Date(lastCluster.created_at).getTime();
      const now = new Date().getTime();
      const hoursSinceLastCluster = (now - lastClusterTime) / (1000 * 60 * 60);
      
      console.log("🔍 Cluster freshness check:", {
        lastClusterFeedbackCount,
        currentFeedbackCount,
        hoursSinceLastCluster: Math.round(hoursSinceLastCluster * 100) / 100,
        feedbackCountChange: currentFeedbackCount - lastClusterFeedbackCount,
      });
      
      // Update clusters if:
      // 1. Feedback count has increased by 1 or more items
      // 2. Clusters are older than 24 hours and feedback count has changed
      const feedbackCountIncrease = currentFeedbackCount - lastClusterFeedbackCount;
      
      if (feedbackCountIncrease >= 1) {
        console.log("🔄 Updating clusters due to new feedback");
        shouldUpdateClusters = true;
      } else if (hoursSinceLastCluster > 24 && feedbackCountIncrease > 0) {
        console.log("🔄 Updating clusters due to age and feedback changes");
        shouldUpdateClusters = true;
      }
    }
    
    // If clusters don't need updating, return them
    if (!shouldUpdateClusters && existingClusters && existingClusters.length > 0) {
      console.log(`✅ Using existing ${existingClusters.length} clusters`);
      return {
        groups: existingClusters.map((cluster) => ({
          ...cluster.cluster_data,
          clusterId: cluster.id,
        })),
        summary: {
          totalGroups: existingClusters.length,
          largestGroupSize: Math.max(
            ...existingClusters.map((c) => c.feedback_ids?.length || 0)
          ),
          mostCommonTheme:
            existingClusters[0]?.cluster_data?.theme || "Unknown",
        },
        ungrouped: [],
        storedClusters: existingClusters,
      };
    }

    console.log("🔍 Generating updated clusters with AI");

    const feedbackGroups = await Promise.race([
      groupSimilarFeedback(transformedFeedback, userId),
      clusteringTimeout,
    ]);

    if (!feedbackGroups || !feedbackGroups.groups) {
      console.log("ℹ️ No clusters generated by AI");
      return null;
    }

    // Update existing clusters or create new ones
    const newClusters = feedbackGroups.groups.filter((group) => group && group.theme);
    
    if (newClusters.length > 0) {
      if (existingClusters && existingClusters.length > 0) {
        console.log("🔄 Updating existing clusters with new feedback");
        
        // Update existing clusters with new feedback data
        const updatePromises = newClusters.map(async (newCluster, index) => {
          const existingCluster = existingClusters[index];
          
          if (existingCluster) {
            // Update existing cluster
            const { error: updateError } = await supabase
              .from("feedback_clusters")
              .update({
                cluster_data: newCluster,
                feedback_ids: newCluster.feedbackIds || [],
                total_feedback_count: transformedFeedback.length,
              })
              .eq("id", existingCluster.id);
              
            if (updateError) {
              console.error("❌ Failed to update cluster:", updateError.message);
              return null;
            }
            
            return { ...existingCluster, cluster_data: newCluster };
          } else {
            // Create new cluster if we have more new clusters than existing ones
            const { data: newClusterData, error: insertError } = await supabase
              .from("feedback_clusters")
              .insert({
                user_id: userId,
                cluster_data: newCluster,
                feedback_ids: newCluster.feedbackIds || [],
                total_feedback_count: transformedFeedback.length,
              })
              .select()
              .single();
              
            if (insertError) {
              console.error("❌ Failed to create new cluster:", insertError.message);
              return null;
            }
            
            return newClusterData;
          }
        });
        
        const updatedClusters = await Promise.all(updatePromises);
        const successfulUpdates = updatedClusters.filter(Boolean);
        
        console.log(`✅ Successfully updated ${successfulUpdates.length} clusters`);
      } else {
        // Create all new clusters
        console.log("🔄 Creating new clusters");
        
        const clusterInserts = newClusters.map((group) => ({
          user_id: userId,
          cluster_data: group,
          feedback_ids: group.feedbackIds || [],
          total_feedback_count: transformedFeedback.length,
        }));

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

        console.log(`✅ Successfully created ${clusterInserts.length} new clusters`);
      }
    } else {
      console.log("ℹ️ No valid clusters to create or update");
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
      groups: (storedClusters || []).map((cluster) => ({
        ...cluster.cluster_data,
        clusterId: cluster.id,
      })),
      summary: feedbackGroups.summary,
      ungrouped: feedbackGroups.ungrouped,
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
          groups: storedClusters.map((cluster) => ({
            ...cluster.cluster_data,
            clusterId: cluster.id,
          })),
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
export const GET = withErrorHandler(async (request) => {
  const supabase = createAuthenticatedSupabaseClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    throw createAuthError();
  }

  // Get feedback using centralized database utilities
  const feedbackResult = await feedbackDB.instance.getAllForUser(user.id);
  const transformedFeedback = feedbackResult.data;

  // Get feedback clusters from database
  const feedbackGroups = await updateFeedbackClusters(supabase, user.id);

  // Get AI-powered statistics using centralized database utilities
  const aiStats = await feedbackDB.instance.getStats(user.id);
  
  // Add top themes from clusters
  aiStats.topThemes = feedbackGroups?.groups?.map((g) => g.theme) || [];

  return NextResponse.json({
    success: true,
    data: transformedFeedback,
    feedbackGroups: feedbackGroups,
    aiStats: aiStats,
    message: "Feedback retrieved successfully",
  });
});

// POST /api/feedback - Create new feedback
export const POST = withErrorHandler(async (request) => {
  const supabase = createAuthenticatedSupabaseClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    throw createAuthError();
  }

  const body = await request.json();

  // Debug log the received data
  console.log("Received feedback data:", body);

  // Validate and sanitize the data using centralized validation
  const sanitizedData = validateFeedback(body);

  // Process tags (already sanitized by validateFeedback)
  let processedTags = [];
  if (sanitizedData.tags) {
    if (Array.isArray(sanitizedData.tags)) {
      processedTags = sanitizedData.tags
        .filter((tag) => tag && typeof tag === "string")
        .map((tag) => tag.trim())
        .filter((tag) => tag);
    } else if (
      typeof sanitizedData.tags === "string" &&
      sanitizedData.tags.trim()
    ) {
      processedTags = sanitizedData.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag);
    }
  }

  let processedMetadata = null;
  if (sanitizedData.metadata) {
    if (typeof sanitizedData.metadata === "string") {
      try {
        processedMetadata = JSON.parse(sanitizedData.metadata);
      } catch (e) {
        throw createValidationError("Invalid JSON in metadata field");
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
  const { isAIConfigured } = await import("../../../libs/ai/index.js");
  if (isAIConfigured()) {
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

  // Save to database using centralized database utilities
  const insertedData = await feedbackDB.instance.create("raw_feedback", feedbackData, "Create feedback");

    // Update feedback clusters after adding new feedback
    await updateFeedbackClusters(supabase, user.id);

    // Perform Enhanced AI Analysis on the feedback
    let aiAnalysis = null;
    if (isAIConfigured() && insertedData.content) {
      console.log("🧠 Performing enhanced AI analysis on feedback...");

      try {
        // Validate content before analysis
        if (!insertedData.content.trim()) {
          console.warn("⚠️ Empty content - skipping AI analysis");
        } else {
          // Create timeout for AI analysis
          const aiTimeout = new Promise((_, reject) => {
            setTimeout(
              () => reject(new Error("Enhanced AI analysis timeout after 20 seconds")),
              20000
            );
          });

          // Initialize enhanced analyzer
          const enhancedAnalyzer = new EnhancedFeedbackAnalyzer();

          // Analyze the feedback content with enhanced analysis and timeout
          aiAnalysis = await Promise.race([
            enhancedAnalyzer.analyzeFeedback(
              insertedData.content, 
              insertedData.platform, 
              insertedData.metadata
            ),
            aiTimeout,
          ]);

          if (aiAnalysis) {
            console.log(
              `✅ Enhanced AI Analysis completed: ${aiAnalysis.sentiment} sentiment, ${aiAnalysis.priority} priority, ${aiAnalysis.confidence} confidence, ${aiAnalysis.business_impact} business impact`
            );

            // Enhanced analysis already includes validation and fallback values
            // No need to modify the structure as it's handled by EnhancedFeedbackAnalyzer

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
      if (!isAIConfigured()) {
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
    } else if (isAIConfigured()) {
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
});

// PUT /api/feedback - Update existing feedback
export const PUT = withErrorHandler(async (request) => {
  const supabase = createAuthenticatedSupabaseClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    throw createAuthError();
  }

  const body = await request.json();

  validateRequired(body, ["id"]);
  validateUUID(body.id, "Feedback ID");

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

  // Update the feedback in database using centralized database utilities
  const updatedData = await feedbackDB.instance.update("raw_feedback", body.id, user.id, updateData, "Update feedback");

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
});

// DELETE /api/feedback - Delete feedback
export const DELETE = withErrorHandler(async (request) => {
  const supabase = createAuthenticatedSupabaseClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    throw createAuthError();
  }

  const url = new URL(request.url);
  const feedbackId = url.searchParams.get("id");

  if (!feedbackId) {
    throw createValidationError("Feedback ID is required");
  }

  validateUUID(feedbackId, "Feedback ID");

  // Delete the feedback from database using centralized database utilities
  await feedbackDB.instance.delete("raw_feedback", feedbackId, user.id, "Delete feedback");

  // Update feedback clusters after feedback was deleted
  await updateFeedbackClusters(supabase, user.id);

  return NextResponse.json({
    success: true,
    message: "Feedback deleted successfully",
  });
});
