import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { generateImplementationSpec } from "../../../libs/gpt.js";

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

// POST /api/generate-individual-spec - Generate specification from individual feedback
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

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          error: "AI service not configured",
          message: "OpenAI API key is not configured for spec generation",
        },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { feedbackId } = body;

    if (!feedbackId) {
      return NextResponse.json(
        { error: "Feedback ID is required" },
        { status: 400 }
      );
    }

    // Get the feedback item from database
    const { data: feedback, error: feedbackError } = await supabase
      .from("raw_feedback")
      .select("*")
      .eq("id", feedbackId)
      .eq("user_id", user.id)
      .single();

    if (feedbackError) {
      console.error("Error fetching feedback:", feedbackError);
      return NextResponse.json(
        {
          error: "Failed to fetch feedback",
          message: feedbackError.message,
        },
        { status: 500 }
      );
    }

    if (!feedback) {
      return NextResponse.json(
        { error: "Feedback not found or unauthorized" },
        { status: 404 }
      );
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
        return NextResponse.json(
          {
            error: "Failed to generate specification",
            message: "AI service returned empty response",
          },
          { status: 500 }
        );
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
      console.error("Error generating specification:", specError);
      return NextResponse.json(
        {
          error: "Failed to generate specification",
          message: "AI service encountered an error",
          details: specError.message,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[Generate Individual Spec API Error]", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

// GET /api/generate-individual-spec - Get previously generated specs for individual feedback
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
      console.error("Error fetching generated specs:", fetchError);
      return NextResponse.json(
        {
          error: "Failed to fetch generated specs",
          message: fetchError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: specs || [],
      message: "Generated specs retrieved successfully",
    });
  } catch (error) {
    console.error("[Get Generated Individual Specs API Error]", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
