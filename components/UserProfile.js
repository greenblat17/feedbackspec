"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../libs/supabase/client";
import toast from "react-hot-toast";
import config from "../config.js";

export default function UserProfile() {
  const supabase = createClient();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user || null);
      setLoading(false);
    };

    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);

      if (event === "SIGNED_OUT") {
        router.push("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth, router]);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success("Signed out successfully");
      router.push("/");
    } catch (error) {
      toast.error("Error signing out: " + error.message);
    } finally {
      setSigningOut(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold mb-4">Not Authenticated</h2>
        <p className="text-base-content/70 mb-4">
          You need to sign in to access this page.
        </p>
        <button
          onClick={() => router.push("/auth")}
          className="btn btn-primary"
        >
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* User Info Card */}
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">
            <div className="avatar placeholder">
              <div className="bg-neutral text-neutral-content rounded-full w-12">
                <span className="text-lg">
                  {user.email?.charAt(0).toUpperCase() || "U"}
                </span>
              </div>
            </div>
            Profile Information
          </h2>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-medium">Email:</span>
              <span className="text-base-content/70">{user.email}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="font-medium">User ID:</span>
              <span className="text-base-content/70 font-mono text-sm">
                {user.id}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="font-medium">Last Sign In:</span>
              <span className="text-base-content/70">
                {new Date(user.last_sign_in_at).toLocaleDateString()}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="font-medium">Email Verified:</span>
              <span
                className={`badge ${
                  user.email_confirmed_at ? "badge-success" : "badge-warning"
                }`}
              >
                {user.email_confirmed_at ? "Verified" : "Unverified"}
              </span>
            </div>

            {user.app_metadata?.provider && (
              <div className="flex justify-between items-center">
                <span className="font-medium">Sign-in Method:</span>
                <span className="badge badge-outline capitalize">
                  {user.app_metadata.provider}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions Card */}
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body">
          <h3 className="card-title">Account Actions</h3>

          <div className="space-y-3">
            <button
              onClick={() => router.push("/auth")}
              className="btn btn-outline btn-sm w-full"
            >
              Manage Account
            </button>

            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="btn btn-error btn-sm w-full"
            >
              {signingOut ? (
                <>
                  <span className="loading loading-spinner loading-xs"></span>
                  Signing Out...
                </>
              ) : (
                "Sign Out"
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Debug Info (Development Only) */}
      {process.env.NODE_ENV === "development" && (
        <div className="card bg-base-300 shadow-xl">
          <div className="card-body">
            <h3 className="card-title">Debug Info</h3>
            <pre className="text-xs overflow-x-auto bg-base-100 p-4 rounded">
              {JSON.stringify(user, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
