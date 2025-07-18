import { NextResponse } from "next/server";
import {
  createAuthenticatedSupabaseClient,
  getAuthenticatedUser,
} from "../../../libs/auth/server-auth.js";
import { generateImplementationSpec } from "../../../libs/gpt.js";
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


// POST /api/generate-individual-spec - Generate specification from individual feedback
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
    const { feedbackId } = body;

  validateRequired(body, ["feedbackId"]);
  validateUUID(feedbackId, "Feedback ID");

    // Get the feedback item from database
    const { data: feedback, error: feedbackError } = await supabase
      .from("raw_feedback")
      .select("*")
      .eq("id", feedbackId)
      .eq("user_id", user.id)
      .single();

  if (feedbackError) {
    await logErrorToMonitoring(feedbackError, "POST /api/generate-individual-spec - fetch feedback", user.id);
    throw createDatabaseError("Failed to fetch feedback", feedbackError.message);
  }

  if (!feedback) {
    throw createValidationError("Feedback not found or unauthorized");
  }

    // Extract relevant information for spec generation
    const issueType = feedback.metadata?.category || "general";
    const description = feedback.content || "No description provided";
    const priority = feedback.metadata?.priority || "medium";
    const title = feedback.metadata?.title || "Untitled";

    console.log(`🎯 Generating specification for feedback: ${title}`);
    console.log(`📋 Type: ${issueType}, Priority: ${priority}`);

    // Generate specification using AI
    try {
      const generatedSpec = await generateImplementationSpec(
        issueType,
        description,
        priority,
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
            cluster_id: null, // Individual specs don't have a cluster
            title: `Spec for ${title} [feedback_id:${feedbackId}]`,
            content: generatedSpec,
          });

        if (saveError) {
          console.warn("Failed to save generated spec to database:", saveError);
          console.warn("SaveError details:", saveError);
          // Continue anyway - the spec was generated successfully
        } else {
          console.log(
            "✅ Generated individual spec saved to database successfully"
          );
        }
      } catch (saveError) {
        console.warn("Error saving generated spec:", saveError);
        // Continue anyway
      }

      return NextResponse.json({
        success: true,
        spec: generatedSpec,
        feedback: {
          id: feedback.id,
          title: title,
          content: description,
          category: issueType,
          priority: priority,
          source: feedback.platform,
        },
        message: "Specification generated successfully",
      });
  } catch (specError) {
    await logErrorToMonitoring(specError, "POST /api/generate-individual-spec - AI generation", user.id);
    throw createExternalServiceError("openai", "AI service encountered an error", specError.message);
  }
});

// GET /api/generate-individual-spec - Get previously generated specs for individual feedback
export const GET = withErrorHandler(async (request) => {
  const supabase = createAuthenticatedSupabaseClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    throw createAuthError();
  }

    const url = new URL(request.url);
    const feedbackId = url.searchParams.get("feedbackId");

    let query = supabase
      .from("generated_specs")
      .select("*")
      .eq("user_id", user.id)
      .is("cluster_id", null) // Only individual specs (not cluster specs)
      .order("created_at", { ascending: false });

    // Note: Individual specs don't have a direct relationship to feedback items
    // since the generated_specs table doesn't have a feedback_id column
    // If you need to track which feedback item the spec was generated from,
    // you'll need to add a feedback_id column to the generated_specs table

    const { data: specs, error: fetchError } = await query;

  if (fetchError) {
    await logErrorToMonitoring(fetchError, "GET /api/generate-individual-spec", user.id);
    throw createDatabaseError("Failed to fetch generated specs", fetchError.message);
  }

  return NextResponse.json({
    success: true,
    data: specs || [],
    message: "Generated specs retrieved successfully",
  });
});
