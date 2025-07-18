import { NextResponse } from "next/server";
import {
  createAuthenticatedSupabaseClient,
  getAuthenticatedUser,
} from "../../../libs/auth/server-auth.js";
import { generateSpec } from "../../../libs/gpt.js";
import {
  withErrorHandler,
  createAuthError,
  createValidationError,
  createDatabaseError,
  createExternalServiceError,
  logErrorToMonitoring,
} from "../../../libs/errors/error-handler.js";
import {
  validateSpecGeneration,
  validateRequired,
  validateUUID,
} from "../../../libs/validation/validators.js";


// POST /api/generate-spec - Generate specification from feedback cluster
export const POST = withErrorHandler(async (request) => {
  const supabase = createAuthenticatedSupabaseClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    throw createAuthError();
  }

  // Check if OpenAI API key is configured
  if (!process.env.OPENAI_API_KEY) {
    throw createExternalServiceError("openai", "OpenAI API key is not configured for spec generation");
  }

    const body = await request.json();
    const { clusterId, theme, feedbackList } = body;

    // Handle direct cluster spec generation (new format)
    if (theme && feedbackList && clusterId) {
      // Validate the spec generation data
      validateSpecGeneration({ theme, feedbackList, clusterId });
      
      console.log(`🎯 Generating specification for cluster theme: ${theme}`);
      console.log(`📊 Using ${feedbackList.length} feedback items`);

      // Generate specification using AI
      try {
        const generatedSpec = await generateSpec(theme, feedbackList, user.id);

        if (!generatedSpec) {
          throw createExternalServiceError("openai", "AI service returned empty response");
        }

        console.log("✅ Specification generated successfully");

        // Save the generated spec to database for caching
        try {
          const specData = {
            user_id: user.id,
            cluster_id: clusterId,
            title: `Spec for ${theme}`,
            content: generatedSpec,
          };

          console.log("💾 Saving spec to database:", {
            user_id: user.id,
            cluster_id: clusterId,
            title: specData.title,
          });

          const { error: saveError } = await supabase
            .from("generated_specs")
            .upsert(specData);

          if (saveError) {
            console.warn(
              "Failed to save generated spec to database:",
              saveError
            );
            console.warn("SaveError details:", saveError);
            // Continue anyway - the spec was generated successfully
          } else {
            console.log("✅ Generated spec saved to database successfully");
          }
        } catch (saveError) {
          console.warn("Error saving generated spec:", saveError);
          // Continue anyway
        }

        return NextResponse.json({
          success: true,
          spec: generatedSpec,
          cluster: {
            id: clusterId,
            theme: theme,
            feedbackCount: feedbackList.length,
          },
          feedbackUsed: feedbackList.length,
          message: "Specification generated successfully",
        });
      } catch (specError) {
        await logErrorToMonitoring(specError, "POST /api/generate-spec - AI generation (direct)", user.id);
        throw createExternalServiceError("openai", "AI service encountered an error", specError.message);
      }
    }

  // Original format - fetch cluster from database
  if (!clusterId) {
    throw createValidationError("Cluster ID is required");
  }

  validateUUID(clusterId, "Cluster ID");

    // Get the feedback cluster from database
    const { data: cluster, error: clusterError } = await supabase
      .from("feedback_clusters")
      .select("*")
      .eq("id", clusterId)
      .eq("user_id", user.id)
      .single();

  if (clusterError) {
    await logErrorToMonitoring(clusterError, "POST /api/generate-spec - fetch cluster", user.id);
    throw createDatabaseError("Failed to fetch cluster", clusterError.message);
  }

  if (!cluster) {
    throw createValidationError("Cluster not found or unauthorized");
  }

    // Get feedback associated with this cluster
    // Note: This assumes there's a way to link feedback to clusters
    // If not, we'll use all feedback for this user as a fallback
    const { data: feedbackData, error: feedbackError } = await supabase
      .from("raw_feedback")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20); // Limit to recent feedback

  if (feedbackError) {
    await logErrorToMonitoring(feedbackError, "POST /api/generate-spec - fetch feedback", user.id);
    throw createDatabaseError("Failed to fetch feedback", feedbackError.message);
  }

  if (!feedbackData || feedbackData.length === 0) {
    throw createValidationError("No feedback found for this cluster");
  }

    // Transform feedback data to text array
    const clusterFeedbackList = feedbackData.map((item) => {
      return item.content || item.metadata?.title || "No content";
    });

    const clusterData = cluster.cluster_data || {};
    const clusterTheme = clusterData.theme || "Untitled";

    console.log(`🎯 Generating specification for cluster: ${clusterTheme}`);
    console.log(`📊 Using ${clusterFeedbackList.length} feedback items`);

    // Generate specification using AI
    try {
      const generatedSpec = await generateSpec(
        clusterTheme,
        clusterFeedbackList,
        user.id
      );

    if (!generatedSpec) {
      throw createExternalServiceError("openai", "AI service returned empty response");
    }

      console.log("✅ Specification generated successfully");

      // Save the generated spec to database for caching
      try {
        const { error: saveError } = await supabase
          .from("generated_specs")
          .upsert({
            user_id: user.id,
            cluster_id: clusterId,
            title: `Spec for ${clusterTheme}`,
            content: generatedSpec,
          });

        if (saveError) {
          console.warn("Failed to save generated spec to database:", saveError);
          console.warn("SaveError details:", saveError);
          // Continue anyway - the spec was generated successfully
        } else {
          console.log("✅ Generated spec saved to database successfully");
        }
      } catch (saveError) {
        console.warn("Error saving generated spec:", saveError);
        // Continue anyway
      }

      return NextResponse.json({
        success: true,
        spec: generatedSpec,
        cluster: {
          id: cluster.id,
          theme: clusterTheme,
          summary:
            clusterData.description ||
            clusterData.suggestedAction ||
            "No description",
          priority: clusterData.severity || "medium",
          feedbackCount: cluster.feedback_ids?.length || 0,
        },
        feedbackUsed: clusterFeedbackList.length,
        message: "Specification generated successfully",
      });
  } catch (specError) {
    await logErrorToMonitoring(specError, "POST /api/generate-spec - AI generation", user.id);
    throw createExternalServiceError("openai", "AI service encountered an error", specError.message);
  }
});

// GET /api/generate-spec - Get previously generated specs for a user
export const GET = withErrorHandler(async (request) => {
  const supabase = createAuthenticatedSupabaseClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    throw createAuthError();
  }

    const url = new URL(request.url);
    const clusterId = url.searchParams.get("clusterId");

    let query = supabase
      .from("generated_specs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (clusterId) {
      query = query.eq("cluster_id", clusterId);
    }

    const { data: specs, error: fetchError } = await query;

  if (fetchError) {
    await logErrorToMonitoring(fetchError, "GET /api/generate-spec", user.id);
    throw createDatabaseError("Failed to fetch generated specs", fetchError.message);
  }

    console.log("📋 Fetched specs from database:", specs?.length || 0);
    console.log("🔍 Cluster IDs found:", specs?.map((s) => s.cluster_id) || []);

  return NextResponse.json({
    success: true,
    data: specs || [],
    message: "Generated specs retrieved successfully",
  });
});
