"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/libs/supabase/client";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import config from "@/config";
import toast from "react-hot-toast";
import SupabaseDebugInfo from "@/components/SupabaseDebugInfo";

export default function AuthPage() {
  const supabase = createClient();
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSession(session);
      setLoading(false);

      if (session) {
        router.push(config.auth.callbackUrl);
      }
    };

    checkSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);

      if (event === "SIGNED_IN") {
        toast.success("Welcome back!");
        router.push(config.auth.callbackUrl);
      } else if (event === "SIGNED_OUT") {
        toast.success("See you later!");
      }
    });

    return () => subscription.unsubscribe();
  }, [router, supabase.auth]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  if (session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg mb-4"></div>
          <p>Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-base-100" data-theme={config.colors.theme}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="btn btn-ghost btn-sm mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-5 h-5"
            >
              <path
                fillRule="evenodd"
                d="M15 10a.75.75 0 01-.75.75H7.612l2.158 1.96a.75.75 0 11-1.04 1.08l-3.5-3.25a.75.75 0 010-1.08l3.5-3.25a.75.75 0 111.04 1.08L7.612 9.25h6.638A.75.75 0 0115 10z"
                clipRule="evenodd"
              />
            </svg>
            Back to Home
          </Link>

          <h1 className="text-4xl font-bold text-base-content mb-2">
            Welcome to {config.appName}
          </h1>
          <p className="text-base-content/70">{config.appDescription}</p>
        </div>

        {/* Auth Container */}
        <div className="max-w-md mx-auto">
          <div className="card bg-base-200 shadow-xl">
            <div className="card-body">
              <h2 className="card-title justify-center mb-6">
                Sign in to your account
              </h2>

              <div className="auth-container">
                <Auth
                  supabaseClient={supabase}
                  appearance={{
                    theme: ThemeSupa,
                    variables: {
                      default: {
                        colors: {
                          brand: "#570df8",
                          brandAccent: "#4506cb",
                        },
                      },
                    },
                    style: {
                      button: {
                        borderRadius: "8px",
                        fontSize: "14px",
                        fontWeight: "600",
                        padding: "12px 16px",
                        transition: "all 0.2s ease",
                      },
                      anchor: {
                        color: "#570df8",
                        textDecoration: "none",
                        fontWeight: "500",
                      },
                      input: {
                        borderRadius: "8px",
                        fontSize: "14px",
                        padding: "12px 16px",
                        border: "1px solid #e5e7eb",
                        transition: "all 0.2s ease",
                      },
                      label: {
                        fontSize: "14px",
                        fontWeight: "500",
                        marginBottom: "4px",
                        color: "#374151",
                      },
                      message: {
                        fontSize: "14px",
                        marginTop: "8px",
                        padding: "8px 12px",
                        borderRadius: "6px",
                      },
                    },
                  }}
                  providers={["google"]}
                  redirectTo={`${window.location.origin}/api/auth/callback`}
                  onlyThirdPartyProviders={false}
                  showLinks={true}
                  localization={{
                    variables: {
                      sign_in: {
                        email_label: "Email address",
                        password_label: "Password",
                        button_label: "Sign in",
                        loading_button_label: "Signing in...",
                        social_provider_text: "Sign in with {{provider}}",
                        link_text: "Already have an account? Sign in",
                      },
                      sign_up: {
                        email_label: "Email address",
                        password_label: "Create a password",
                        button_label: "Sign up",
                        loading_button_label: "Signing up...",
                        social_provider_text: "Sign up with {{provider}}",
                        link_text: "Don't have an account? Sign up",
                      },
                      magic_link: {
                        email_input_label: "Email address",
                        button_label: "Send magic link",
                        loading_button_label: "Sending magic link...",
                        link_text: "Send a magic link email",
                        confirmation_text:
                          "Check your email for the magic link",
                      },
                      forgotten_password: {
                        email_label: "Email address",
                        button_label: "Send reset instructions",
                        loading_button_label: "Sending reset instructions...",
                        link_text: "Forgot your password?",
                        confirmation_text:
                          "Check your email for the password reset link",
                      },
                    },
                  }}
                />
              </div>
            </div>
          </div>

          {/* Debug Info for OAuth Configuration */}
          <div className="mt-8">
            <SupabaseDebugInfo />
          </div>

          {/* Footer */}
          <div className="text-center mt-6 text-sm text-base-content/60">
            <p>
              By continuing, you agree to our{" "}
              <Link href="/tos" className="link link-primary">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy-policy" className="link link-primary">
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
