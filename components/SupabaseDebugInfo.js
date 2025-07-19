"use client";

import { useEffect, useState } from "react";
import { createClient } from "../libs/supabase/client";

export default function SupabaseDebugInfo() {
  const [debugInfo, setDebugInfo] = useState({});
  const [copied, setCopied] = useState("");

  useEffect(() => {
    const supabase = createClient();

    // Extract project details from environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const projectId = supabaseUrl
      ? supabaseUrl.split("//")[1]?.split(".")[0]
      : "unknown";

    setDebugInfo({
      supabaseUrl,
      projectId,
      supabaseRedirectUri: `${supabaseUrl}/auth/v1/callback`,
      nextjsRedirectUri: `${window.location.origin}/api/auth/callback`,
      currentOrigin: window.location.origin,
      environment: process.env.NODE_ENV,
    });
  }, []);

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(""), 2000);
  };

  return (
    <div className="card bg-base-200 shadow-xl">
      <div className="card-body">
        <h2 className="card-title text-error">🔧 OAuth Debug Information</h2>
        <p className="text-sm text-base-content/70 mb-4">
          Use this information to configure your Google OAuth client correctly.
        </p>

        <div className="space-y-4">
          {/* Supabase URL */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">
                Supabase Project URL:
              </span>
            </label>
            <div className="join">
              <input
                type="text"
                value={debugInfo.supabaseUrl || "Loading..."}
                readOnly
                className="input input-bordered join-item flex-1 font-mono text-sm"
              />
              <button
                className="btn btn-outline join-item"
                onClick={() => copyToClipboard(debugInfo.supabaseUrl, "url")}
              >
                {copied === "url" ? "✓" : "📋"}
              </button>
            </div>
          </div>

          {/* Project ID */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">Project ID:</span>
            </label>
            <div className="join">
              <input
                type="text"
                value={debugInfo.projectId || "Loading..."}
                readOnly
                className="input input-bordered join-item flex-1 font-mono text-sm"
              />
              <button
                className="btn btn-outline join-item"
                onClick={() =>
                  copyToClipboard(debugInfo.projectId, "projectId")
                }
              >
                {copied === "projectId" ? "✓" : "📋"}
              </button>
            </div>
          </div>

          {/* Critical: Supabase OAuth Redirect URI */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold text-error">
                🚨 CRITICAL: Google OAuth Redirect URI
              </span>
            </label>
            <div className="join">
              <input
                type="text"
                value={debugInfo.supabaseRedirectUri || "Loading..."}
                readOnly
                className="input input-bordered join-item flex-1 font-mono text-sm bg-error/10"
              />
              <button
                className="btn btn-error join-item"
                onClick={() =>
                  copyToClipboard(debugInfo.supabaseRedirectUri, "redirectUri")
                }
              >
                {copied === "redirectUri" ? "✓" : "📋"}
              </button>
            </div>
            <label className="label">
              <span className="label-text-alt text-error">
                Add this EXACT URI to your Google OAuth client!
              </span>
            </label>
          </div>

          {/* Next.js Callback URL */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">
                Next.js Callback URL (for Supabase settings):
              </span>
            </label>
            <div className="join">
              <input
                type="text"
                value={debugInfo.nextjsRedirectUri || "Loading..."}
                readOnly
                className="input input-bordered join-item flex-1 font-mono text-sm"
              />
              <button
                className="btn btn-outline join-item"
                onClick={() =>
                  copyToClipboard(debugInfo.nextjsRedirectUri, "nextjsCallback")
                }
              >
                {copied === "nextjsCallback" ? "✓" : "📋"}
              </button>
            </div>
            <label className="label">
              <span className="label-text-alt">
                Add this to Supabase → Authentication → Settings → Redirect URLs
              </span>
            </label>
          </div>

          {/* Current Origin */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">
                Current Origin (for Site URL):
              </span>
            </label>
            <div className="join">
              <input
                type="text"
                value={debugInfo.currentOrigin || "Loading..."}
                readOnly
                className="input input-bordered join-item flex-1 font-mono text-sm"
              />
              <button
                className="btn btn-outline join-item"
                onClick={() =>
                  copyToClipboard(debugInfo.currentOrigin, "origin")
                }
              >
                {copied === "origin" ? "✓" : "📋"}
              </button>
            </div>
            <label className="label">
              <span className="label-text-alt">
                Add this to Supabase → Authentication → Settings → Site URL
              </span>
            </label>
          </div>
        </div>

        {/* Instructions */}
        <div className="alert alert-warning mt-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="stroke-current shrink-0 h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
          <div>
            <h3 className="font-bold">Quick Fix Steps:</h3>
            <ol className="list-decimal list-inside text-sm mt-2 space-y-1">
              <li>
                Copy the <strong>Google OAuth Redirect URI</strong> above
              </li>
              <li>
                Go to{" "}
                <a
                  href="https://console.cloud.google.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link link-primary"
                >
                  Google Cloud Console
                </a>
              </li>
              <li>
                Add it to your OAuth client&apos;s{" "}
                <strong>Authorized redirect URIs</strong>
              </li>
              <li>Wait 5-10 minutes for changes to propagate</li>
              <li>Clear browser cache and try again</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
