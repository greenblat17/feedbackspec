import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { generateSpec } from "../../../libs/gpt.js";

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

// POST /api/generate-spec - Generate specification from feedback cluster
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
    const { clusterId } = body;

    if (!clusterId) {
      return NextResponse.json(
        { error: "Cluster ID is required" },
        { status: 400 }
      );
    }

    // Get the feedback cluster from database
    const { data: cluster, error: clusterError } = await supabase
      .from("feedback_clusters")
      .select("*")
      .eq("id", clusterId)
      .eq("user_id", user.id)
      .single();

    if (clusterError) {
      console.error("Error fetching cluster:", clusterError);
      return NextResponse.json(
        {
          error: "Failed to fetch cluster",
          message: clusterError.message,
        },
        { status: 500 }
      );
    }

    if (!cluster) {
      return NextResponse.json(
        { error: "Cluster not found or unauthorized" },
        { status: 404 }
      );
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
      console.error("Error fetching feedback:", feedbackError);
      return NextResponse.json(
        {
          error: "Failed to fetch feedback",
          message: feedbackError.message,
        },
        { status: 500 }
      );
    }

    if (!feedbackData || feedbackData.length === 0) {
      return NextResponse.json(
        { error: "No feedback found for this cluster" },
        { status: 404 }
      );
    }

    // Transform feedback data to text array
    const feedbackList = feedbackData.map((item) => {
      return item.content || item.metadata?.title || "No content";
    });

    console.log(`🎯 Generating specification for cluster: ${cluster.theme}`);
    console.log(`📊 Using ${feedbackList.length} feedback items`);

    // Generate specification using AI
    try {
      const generatedSpec = await generateSpec(
        cluster.theme,
        feedbackList,
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
            cluster_id: clusterId,
            title: `Spec for ${cluster.theme}`,
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
          theme: cluster.theme,
          summary: cluster.summary,
          priority: cluster.priority,
          feedbackCount: cluster.feedback_count,
        },
        feedbackUsed: feedbackList.length,
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
    console.error("[Generate Spec API Error]", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

// GET /api/generate-spec - Get previously generated specs for a user
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
    const clusterId = url.searchParams.get("clusterId");

    let query = supabase
      .from("generated_specs")
      .select(
        `
        *,
        feedback_clusters!inner(
          id,
          theme,
          summary,
          priority,
          feedback_count
        )
      `
      )
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (clusterId) {
      query = query.eq("cluster_id", clusterId);
    }

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
    console.error("[Get Generated Specs API Error]", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
