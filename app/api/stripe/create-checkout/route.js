import { createCheckout } from "@/libs/stripe";
import {
  createAuthenticatedSupabaseClient,
  getAuthenticatedUser,
} from "../../../libs/auth/server-auth.js";
import { NextResponse } from "next/server";
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

// This function is used to create a Stripe Checkout Session (one-time payment or subscription)
// It's called by the <ButtonCheckout /> component
// Users must be authenticated. It will prefill the Checkout data with their email and/or credit card (if any)
export const POST = withErrorHandler(async (req) => {
  const body = await req.json();

  // Validate Stripe checkout request
  validateStripeRequest(body, "checkout");

  const supabase = createAuthenticatedSupabaseClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    throw createAuthError("You must be logged in to create a checkout session");
  }

  const { priceId, mode, successUrl, cancelUrl } = body;

  const { data, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user?.id)
    .single();

  if (profileError) {
    await logErrorToMonitoring(profileError, "POST /api/stripe/create-checkout - profile fetch", user.id);
    throw createDatabaseError("Failed to fetch user profile", profileError.message);
  }

  try {
    const stripeSessionURL = await createCheckout({
      priceId,
      mode,
      successUrl,
      cancelUrl,
      // If user is logged in, it will pass the user ID to the Stripe Session so it can be retrieved in the webhook later
      clientReferenceId: user?.id,
      user: {
        email: data?.email,
        // If the user has already purchased, it will automatically prefill it's credit card
        customerId: data?.customer_id,
      },
      // If you send coupons from the frontend, you can pass it here
      // couponId: body.couponId,
    });

    return NextResponse.json({ url: stripeSessionURL });
  } catch (stripeError) {
    await logErrorToMonitoring(stripeError, "POST /api/stripe/create-checkout - stripe", user.id);
    throw createExternalServiceError("stripe", "Failed to create checkout session", stripeError.message);
  }
});
