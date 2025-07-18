import { withAuthAPI } from "@/libs/auth-utils";
import { NextResponse } from "next/server";

// GET /api/user/profile
async function handler(request) {
  const user = request.user; // Added by withAuthAPI middleware

  try {
    // Return user profile information
    const userProfile = {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
      user_metadata: user.user_metadata,
      app_metadata: user.app_metadata,
    };

    return NextResponse.json({
      success: true,
      data: userProfile,
      message: "Profile retrieved successfully",
    });
  } catch (error) {
    console.error("[Profile API Error]", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve profile",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

// PUT /api/user/profile
async function updateHandler(request) {
  const user = request.user; // Added by withAuthAPI middleware

  try {
    const updates = await request.json();

    // Validate updates (only allow certain fields)
    const allowedFields = ["display_name", "avatar_url", "bio"];
    const validUpdates = {};

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        validUpdates[key] = value;
      }
    }

    // In a real app, you'd update the user profile in your database
    // For now, we'll just return a success response
    return NextResponse.json({
      success: true,
      data: { ...user, ...validUpdates },
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("[Profile Update API Error]", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update profile",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

// Export protected handlers
export const GET = withAuthAPI(handler);
export const PUT = withAuthAPI(updateHandler);
