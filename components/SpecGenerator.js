"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/libs/supabase/client";
import ReactMarkdown from "react-markdown";

export default function SpecGenerator() {
  const [clusters, setClusters] = useState([]);
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [generatedSpec, setGeneratedSpec] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const supabase = createClient();

  useEffect(() => {
    loadClusters();
  }, []);

  const loadClusters = async () => {
    try {
      setLoading(true);
      setError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Please sign in to view clusters");
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("feedback_clusters")
        .select("*")
        .eq("user_id", user.id)
        .order("priority", { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setClusters(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateSpec = async (cluster) => {
    try {
      setIsGenerating(true);
      setSelectedCluster(cluster);
      setError(null);

      const response = await fetch("/api/generate-spec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clusterId: cluster.id }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate specification");
      }

      const data = await response.json();
      setGeneratedSpec(data.spec);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedSpec);
      // Use a simple alert for now - can be replaced with toast notification
      alert("Spec copied to clipboard!");
    } catch (err) {
      alert("Failed to copy to clipboard");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg"></div>
          <p className="mt-4 text-base-content/70">Loading clusters...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <div className="flex-1">
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.96-.833-2.73 0L3.084 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
          <span>{error}</span>
        </div>
        <button onClick={loadClusters} className="btn btn-sm btn-outline">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Generate Specifications</h2>
        <button onClick={loadClusters} className="btn btn-sm btn-outline">
          <span className="text-lg">🔄</span>
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Clusters List */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Feedback Clusters</h3>
          {clusters.length === 0 ? (
            <div className="card bg-base-200 shadow-xl">
              <div className="card-body text-center">
                <div className="text-4xl mb-4">📊</div>
                <h4 className="text-lg font-medium">No clusters found</h4>
                <p className="text-base-content/70">
                  Clusters will appear here once you have feedback data
                  processed
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {clusters.map((cluster) => (
                <div key={cluster.id} className="card bg-base-200 shadow-xl">
                  <div className="card-body">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-semibold text-lg">{cluster.theme}</h4>
                      <div className="badge badge-primary">
                        Priority: {cluster.priority}
                      </div>
                    </div>
                    <p className="text-base-content/80 mb-3">
                      {cluster.summary}
                    </p>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-base-content/70">
                          {cluster.feedback_count} feedback items
                        </span>
                        <div className="badge badge-sm badge-outline">
                          {cluster.category || "General"}
                        </div>
                      </div>
                      <button
                        onClick={() => generateSpec(cluster)}
                        disabled={isGenerating}
                        className="btn btn-primary btn-sm disabled:loading"
                      >
                        {isGenerating && selectedCluster?.id === cluster.id
                          ? "Generating..."
                          : "Generate Spec"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Generated Spec Display */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Generated Specification</h3>
            {generatedSpec && (
              <button
                onClick={copyToClipboard}
                className="btn btn-sm btn-outline"
              >
                <span className="text-lg">📋</span>
                Copy
              </button>
            )}
          </div>

          <div className="card bg-base-200 shadow-xl min-h-96">
            <div className="card-body">
              {isGenerating ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="loading loading-spinner loading-lg"></div>
                    <p className="mt-4 text-base-content/70">
                      Generating specification...
                    </p>
                  </div>
                </div>
              ) : generatedSpec ? (
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown>{generatedSpec}</ReactMarkdown>
                </div>
              ) : selectedCluster ? (
                <div className="text-center py-20">
                  <div className="text-4xl mb-4">📝</div>
                  <p className="text-base-content/70">
                    Specification for &quot;{selectedCluster.theme}&quot; will
                    appear here
                  </p>
                </div>
              ) : (
                <div className="text-center py-20">
                  <div className="text-4xl mb-4">🎯</div>
                  <p className="text-base-content/70">
                    Select a cluster to generate specification
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
