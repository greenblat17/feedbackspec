import { NextResponse } from "next/server";
import {
  createAuthenticatedSupabaseClient,
  getAuthenticatedUser,
} from "../../../libs/auth/server-auth.js";
import { createCustomerPortal } from "@/libs/stripe";
import {
  withErrorHandler,
  createAuthError,
  createValidationError,
  createDatabaseError,
  createExternalServiceError,
  logErrorToMonitoring,
} from "../../../libs/errors/error-handler.js";
import {
  validateStripeRequest,
  validateRequired,
} from "../../../libs/validation/validators.js";

export const POST = withErrorHandler(async (req) => {
  const supabase = createAuthenticatedSupabaseClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    throw createAuthError("You must be logged in to view billing information.");
  }

  const body = await req.json();

  // Validate Stripe portal request
  validateStripeRequest(body, "portal");

  const { data, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user?.id)
    .single();

  if (profileError) {
    await logErrorToMonitoring(profileError, "POST /api/stripe/create-portal - profile fetch", user.id);
    throw createDatabaseError("Failed to fetch user profile", profileError.message);
  }

  if (!data?.customer_id) {
    throw createValidationError("You don't have a billing account yet. Make a purchase first.");
  }

  try {
    const stripePortalUrl = await createCustomerPortal({
      customerId: data.customer_id,
      returnUrl: body.returnUrl,
    });

    return NextResponse.json({
      url: stripePortalUrl,
    });
  } catch (stripeError) {
    await logErrorToMonitoring(stripeError, "POST /api/stripe/create-portal - stripe", user.id);
    throw createExternalServiceError("stripe", "Failed to create customer portal", stripeError.message);
  }
});
