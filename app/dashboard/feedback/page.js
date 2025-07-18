"use client";

import { useState, useEffect } from "react";
import FeedbackForm from "@/components/FeedbackForm";
import toast from "react-hot-toast";
import ReactMarkdown from "react-markdown";

export default function FeedbackPage() {
  const [feedbackList, setFeedbackList] = useState([]);
  const [feedbackGroups, setFeedbackGroups] = useState(null);
  const [aiStats, setAiStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [viewMode, setViewMode] = useState("list"); // 'list' or 'groups'
  const [processingId, setProcessingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [generatingSpecId, setGeneratingSpecId] = useState(null);
  const [generatedSpecs, setGeneratedSpecs] = useState({});
  const [showSpecModal, setShowSpecModal] = useState(false);
  const [currentSpec, setCurrentSpec] = useState(null);
  const [generatedClusterSpecs, setGeneratedClusterSpecs] = useState({});
  const [generatingClusterSpecId, setGeneratingClusterSpecId] = useState(null);

  // Helper function to handle API errors consistently
  const handleApiError = (error, context = "operation") => {
    console.error(`Error during ${context}:`, {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    if (error.name === "TypeError" && error.message.includes("fetch")) {
      toast.error("Network error - please check your connection");
    } else if (error.message.includes("401") || error.message.includes("403")) {
      toast.error("Authentication error - please sign in again");
    } else if (error.message.includes("404")) {
      toast.error("Item not found");
    } else if (error.message.includes("500")) {
      toast.error("Server error - please try again later");
    } else {
      toast.error(`Failed to complete ${context} - please try again`);
    }
  };

  // Fetch feedback and existing specs from API
  useEffect(() => {
    fetchFeedback();
    loadExistingSpecs();
    loadExistingClusterSpecs();
  }, []);

  const fetchFeedback = async (preserveAiAnalysis = false) => {
    try {
      const response = await fetch("/api/feedback");

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        if (preserveAiAnalysis) {
          // Smart merge: preserve existing AI analysis if server doesn't have it
          const mergedData = result.data.map((serverItem) => {
            const existingItem = feedbackList.find(
              (item) => item.id === serverItem.id
            );
            if (
              existingItem &&
              existingItem.aiAnalysis &&
              !serverItem.aiAnalysis
            ) {
              return { ...serverItem, aiAnalysis: existingItem.aiAnalysis };
            }
            // Check if AI analysis was just completed
            if (
              existingItem &&
              !existingItem.aiAnalysis &&
              serverItem.aiAnalysis
            ) {
              toast.dismiss("ai-analysis");
              toast.success(
                `🤖 AI analysis completed! Detected ${serverItem.aiAnalysis.sentiment} sentiment.`
              );
            }
            return serverItem;
          });
          setFeedbackList(mergedData);
        } else {
          setFeedbackList(result.data || []);
        }
        setFeedbackGroups(result.feedbackGroups);
        setAiStats(result.aiStats);
        console.log("🤖 AI Stats:", result.aiStats);
        console.log("🔗 Feedback Groups:", result.feedbackGroups);
      } else {
        const errorMessage =
          result.message || result.error || "Unknown error occurred";
        console.error("API Error:", errorMessage);
        toast.error(`Failed to load feedback: ${errorMessage}`);
      }
    } catch (error) {
      console.error("Error fetching feedback:", {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      });

      if (error.name === "TypeError" && error.message.includes("fetch")) {
        toast.error("Network error - please check your connection");
      } else if (
        error.message.includes("401") ||
        error.message.includes("403")
      ) {
        toast.error("Authentication error - please sign in again");
      } else if (error.message.includes("500")) {
        toast.error("Server error - please try again later");
      } else {
        toast.error("Failed to load feedback - please try again");
      }
    } finally {
      setLoading(false);
    }
  };

  const loadExistingSpecs = async () => {
    try {
      const response = await fetch("/api/generate-individual-spec");

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.data) {
        const specsMap = {};

        // Parse existing specs and map them to feedback IDs
        result.data.forEach((spec) => {
          // Extract feedback ID from title (format: "Spec for [title] [feedback_id:uuid]")
          const feedbackIdMatch = spec.title.match(/\[feedback_id:([^\]]+)\]/);
          if (feedbackIdMatch) {
            const feedbackId = feedbackIdMatch[1];
            specsMap[feedbackId] = spec.content;
          }
        });

        setGeneratedSpecs(specsMap);
        console.log("✅ Loaded existing specs:", Object.keys(specsMap).length);
      }
    } catch (error) {
      console.error("Error loading existing specs:", error);
      // Don't show error toast for this as it's not critical
    }
  };

  const loadExistingClusterSpecs = async () => {
    try {
      const response = await fetch("/api/generate-spec");

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log("🔍 Raw cluster specs response:", result);

      if (result.success && result.data) {
        const clusterSpecsMap = {};

        // Map cluster specs to cluster IDs
        result.data.forEach((spec) => {
          if (spec.cluster_id) {
            clusterSpecsMap[spec.cluster_id] = spec.content;
            console.log(
              `📋 Loaded cluster spec for ID: ${spec.cluster_id}, Title: ${spec.title}`
            );
          }
        });

        setGeneratedClusterSpecs(clusterSpecsMap);
        console.log(
          "✅ Total cluster specs loaded:",
          Object.keys(clusterSpecsMap).length
        );
        console.log("📊 Cluster spec IDs:", Object.keys(clusterSpecsMap));
      }
    } catch (error) {
      console.error("Error loading existing cluster specs:", error);
      // Don't show error toast for this as it's not critical
    }
  };

  const handleGenerateClusterSpec = async (group, groupIndex) => {
    if (!group) {
      toast.error("Invalid cluster group");
      return;
    }

    // Use real cluster ID from the group, fallback to theme-based ID for compatibility
    const clusterId =
      group.clusterId ||
      `theme_${group.theme.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase()}`;

    console.log(`🎯 Generating spec for cluster ID: ${clusterId}`);

    if (generatingClusterSpecId === clusterId) {
      return; // Already generating
    }

    setGeneratingClusterSpecId(clusterId);

    try {
      // Get feedback content for this cluster
      const clusterFeedback = group.feedbackIds
        .map((feedbackId) => {
          const feedback = feedbackList.find((f) => f.id === feedbackId);
          return feedback ? feedback.content : null;
        })
        .filter(Boolean);

      if (clusterFeedback.length === 0) {
        toast.error("No feedback content found for this cluster");
        return;
      }

      console.log(
        `📊 Sending ${clusterFeedback.length} feedback items for cluster: ${group.theme}`
      );

      const response = await fetch("/api/generate-spec", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          theme: group.theme,
          feedbackList: clusterFeedback,
          clusterId: clusterId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log("📋 Generate spec response:", result);

      if (result.success) {
        setGeneratedClusterSpecs((prev) => ({
          ...prev,
          [clusterId]: result.spec,
        }));
        console.log(`✅ Saved cluster spec for ID: ${clusterId}`);

        setCurrentSpec({
          clusterId: clusterId,
          clusterTheme: group.theme,
          spec: result.spec,
        });
        setShowSpecModal(true);
        toast.success("Cluster specification generated successfully!");
      } else {
        const errorMessage =
          result.message || result.error || "Unknown error occurred";
        console.error("API Error:", errorMessage);
        toast.error(`Failed to generate cluster spec: ${errorMessage}`);
      }
    } catch (error) {
      handleApiError(error, "generating cluster specification");
    } finally {
      setGeneratingClusterSpecId(null);
    }
  };

  const handleFeedbackSubmit = async (feedbackData) => {
    // Add the new feedback to the list
    setFeedbackList((prev) => [feedbackData, ...prev]);
    setShowForm(false);

    // Check for duplicate warnings
    if (
      feedbackData.duplicateCheck?.isDuplicate &&
      feedbackData.duplicateCheck.similarityScore > 0.7
    ) {
      toast(
        `Similar feedback detected: ${feedbackData.duplicateCheck.explanation}`,
        {
          icon: "⚠️",
          style: {
            borderColor: "#f59e0b",
            color: "#f59e0b",
          },
        }
      );
    }

    // Show AI analysis status
    if (feedbackData.aiAnalysis) {
      toast.success(
        `Feedback submitted and analyzed! AI detected ${feedbackData.aiAnalysis.sentiment} sentiment.`
      );
    } else {
      toast.success("Feedback submitted successfully!");
      // Show AI analysis loading message
      toast.loading("🤖 AI analysis in progress...", {
        duration: 5000,
        id: "ai-analysis",
      });
    }

    // Refresh data to get updated grouping
    // Give more time for AI analysis to be saved on server
    setTimeout(() => {
      fetchFeedback(true); // Preserve AI analysis if server doesn't have it yet
    }, 3000); // Increased from 1 second to 3 seconds

    console.log("New feedback submitted:", feedbackData);
  };

  const handleFeedbackClick = (feedback) => {
    setSelectedFeedback(feedback);
  };

  const handleMarkAsProcessed = async (id) => {
    if (!id) {
      toast.error("Invalid feedback ID");
      return;
    }

    if (processingId === id) {
      return; // Already processing
    }

    setProcessingId(id);

    try {
      const response = await fetch("/api/feedback", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, processed: true }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setFeedbackList((prev) =>
          prev.map((feedback) =>
            feedback.id === id ? { ...feedback, processed: true } : feedback
          )
        );
        toast.success("Feedback marked as processed");
      } else {
        const errorMessage =
          result.message || result.error || "Unknown error occurred";
        console.error("API Error:", errorMessage);
        toast.error(`Failed to update feedback: ${errorMessage}`);
      }
    } catch (error) {
      handleApiError(error, "marking feedback as processed");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteFeedback = async (id) => {
    if (!id) {
      toast.error("Invalid feedback ID");
      return;
    }

    if (deletingId === id) {
      return; // Already deleting
    }

    // Show confirmation dialog
    if (
      !confirm(
        "Are you sure you want to delete this feedback? This action cannot be undone."
      )
    ) {
      return;
    }

    setDeletingId(id);

    try {
      const response = await fetch(
        `/api/feedback?id=${encodeURIComponent(id)}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setFeedbackList((prev) =>
          prev.filter((feedback) => feedback.id !== id)
        );
        setSelectedFeedback(null);
        toast.success("Feedback deleted successfully");
      } else {
        const errorMessage =
          result.message || result.error || "Unknown error occurred";
        console.error("API Error:", errorMessage);
        toast.error(`Failed to delete feedback: ${errorMessage}`);
      }
    } catch (error) {
      handleApiError(error, "deleting feedback");
    } finally {
      setDeletingId(null);
    }
  };

  const handleGenerateSpec = async (feedback) => {
    if (!feedback) {
      toast.error("Invalid feedback");
      return;
    }

    if (generatingSpecId === feedback.id) {
      return; // Already generating
    }

    setGeneratingSpecId(feedback.id);

    try {
      const response = await fetch("/api/generate-individual-spec", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ feedbackId: feedback.id }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setGeneratedSpecs((prev) => ({
          ...prev,
          [feedback.id]: result.spec,
        }));
        setCurrentSpec({
          feedbackId: feedback.id,
          feedbackTitle: feedback.title,
          spec: result.spec,
        });
        setShowSpecModal(true);
        toast.success("Specification generated successfully!");
      } else {
        const errorMessage =
          result.message || result.error || "Unknown error occurred";
        console.error("API Error:", errorMessage);
        toast.error(`Failed to generate spec: ${errorMessage}`);
      }
    } catch (error) {
      handleApiError(error, "generating specification");
    } finally {
      setGeneratingSpecId(null);
    }
  };

  const copySpecToClipboard = async (spec) => {
    try {
      await navigator.clipboard.writeText(spec);
      toast.success("Specification copied to clipboard!");
    } catch (err) {
      toast.error("Failed to copy to clipboard");
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "low":
        return "badge-info";
      case "medium":
        return "badge-warning";
      case "high":
        return "badge-error";
      case "urgent":
        return "badge-error";
      default:
        return "badge-ghost";
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case "bug":
        return "🐛";
      case "feature":
        return "✨";
      case "improvement":
        return "🔧";
      case "complaint":
        return "😤";
      case "praise":
        return "👏";
      case "question":
        return "❓";
      case "suggestion":
        return "💡";
      default:
        return "📝";
    }
  };

  const getSourceIcon = (source) => {
    switch (source) {
      case "email":
        return "📧";
      case "twitter":
        return "🐦";
      case "discord":
        return "💬";
      case "slack":
        return "📱";
      case "github":
        return "🐙";
      case "website":
        return "🌐";
      case "survey":
        return "📋";
      case "support":
        return "🎧";
      case "manual":
        return "✏️";
      default:
        return "📝";
    }
  };

  const getSentimentIcon = (sentiment) => {
    switch (sentiment) {
      case "positive":
        return "😊";
      case "negative":
        return "😞";
      case "neutral":
        return "😐";
      default:
        return "🤖";
    }
  };

  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case "positive":
        return "badge-success";
      case "negative":
        return "badge-error";
      case "neutral":
        return "badge-info";
      default:
        return "badge-ghost";
    }
  };

  const getSentimentScore = (score) => {
    if (!score) return "";
    const absScore = Math.abs(score);
    if (absScore > 0.7)
      return score > 0 ? "очень положительный" : "очень негативный";
    if (absScore > 0.3) return score > 0 ? "положительный" : "негативный";
    return "нейтральный";
  };

  const stats = {
    total: feedbackList.length,
    processed: feedbackList.filter((f) => f.processed).length,
    pending: feedbackList.filter((f) => !f.processed).length,
    highPriority: feedbackList.filter(
      (f) => f.priority === "high" || f.priority === "urgent"
    ).length,
    aiAnalyzed: aiStats?.totalAnalyzed || 0,
    negativeSentiment: aiStats?.sentimentDistribution?.negative || 0,
    groups: feedbackGroups?.summary?.totalGroups || 0,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg"></div>
          <p className="mt-4 text-base-content/70">Loading feedback...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Feedback Management</h1>
          <p className="text-base-content/70">
            Manage and track feedback from all sources
            {stats.aiAnalyzed > 0 && (
              <span className="ml-2 badge badge-info badge-sm">
                🤖 AI Powered
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <div className="btn-group">
            <button
              className={`btn btn-sm ${
                viewMode === "list" ? "btn-active" : ""
              }`}
              onClick={() => setViewMode("list")}
            >
              📝 List
            </button>
            <button
              className={`btn btn-sm ${
                viewMode === "groups" ? "btn-active" : ""
              }`}
              onClick={() => setViewMode("groups")}
              disabled={!feedbackGroups || feedbackGroups.groups?.length === 0}
            >
              🔗 Groups ({stats.groups})
            </button>
          </div>
          <button onClick={() => setShowForm(true)} className="btn btn-primary">
            <span className="text-lg">➕</span>
            Add Feedback
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="card bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <div className="card-body p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Total Feedback</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <div className="text-3xl opacity-80">💬</div>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-r from-green-500 to-green-600 text-white">
          <div className="card-body p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Processed</p>
                <p className="text-2xl font-bold">{stats.processed}</p>
              </div>
              <div className="text-3xl opacity-80">✅</div>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <div className="card-body p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm">Pending</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
              <div className="text-3xl opacity-80">⏳</div>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-r from-red-500 to-red-600 text-white">
          <div className="card-body p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm">High Priority</p>
                <p className="text-2xl font-bold">{stats.highPriority}</p>
              </div>
              <div className="text-3xl opacity-80">🚨</div>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <div className="card-body p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">AI Analyzed</p>
                <p className="text-2xl font-bold">{stats.aiAnalyzed}</p>
              </div>
              <div className="text-3xl opacity-80">🤖</div>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-r from-pink-500 to-pink-600 text-white">
          <div className="card-body p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-pink-100 text-sm">Negative Sentiment</p>
                <p className="text-2xl font-bold">{stats.negativeSentiment}</p>
              </div>
              <div className="text-3xl opacity-80">😞</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Feedback List */}
        <div className="lg:col-span-2">
          <div className="card bg-base-200 shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-xl mb-4">
                {viewMode === "list" ? "Recent Feedback" : "Grouped Feedback"}
                {feedbackGroups && (
                  <span className="badge badge-sm badge-info">
                    {feedbackGroups.summary.totalGroups} groups
                  </span>
                )}
              </h2>

              {feedbackList.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">📝</div>
                  <p className="text-base-content/70">
                    No feedback yet. Add your first feedback item!
                  </p>
                </div>
              ) : viewMode === "groups" && feedbackGroups ? (
                <div className="space-y-4">
                  {console.log(
                    "🔍 Debug: feedbackGroups.groups:",
                    feedbackGroups.groups
                  )}
                  {console.log(
                    "🔍 Debug: group details:",
                    JSON.stringify(feedbackGroups.groups, null, 2)
                  )}
                  {feedbackGroups.groups.map((group, groupIndex) => (
                    <div
                      key={groupIndex}
                      className="border border-base-300 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-lg">{group.theme}</h3>
                        <div className="flex gap-2">
                          <span
                            className={`badge ${
                              group.severity === "critical"
                                ? "badge-error"
                                : group.severity === "high"
                                ? "badge-warning"
                                : group.severity === "medium"
                                ? "badge-info"
                                : "badge-ghost"
                            }`}
                          >
                            {group.severity}
                          </span>
                          <span className="badge badge-outline">
                            {group.feedbackIds.length} items
                          </span>
                        </div>
                      </div>

                      <p className="text-sm text-base-content/80 mb-3">
                        {group.description}
                      </p>

                      {group.commonKeywords &&
                        group.commonKeywords.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            <span className="text-xs font-medium">
                              Keywords:
                            </span>
                            {group.commonKeywords.map((keyword, idx) => (
                              <span
                                key={idx}
                                className="badge badge-xs badge-primary"
                              >
                                {keyword}
                              </span>
                            ))}
                          </div>
                        )}

                      <div className="bg-base-100 p-3 rounded mb-3">
                        <span className="text-xs font-medium">
                          Suggested Action:
                        </span>
                        <p className="text-sm mt-1">{group.suggestedAction}</p>
                      </div>

                      {/* Generate Spec Buttons */}
                      <div className="flex gap-2 mb-3">
                        {generatedClusterSpecs[
                          group.clusterId ||
                            `theme_${group.theme
                              .replace(/[^a-zA-Z0-9]/g, "_")
                              .toLowerCase()}`
                        ] ? (
                          <button
                            onClick={() => {
                              const clusterId =
                                group.clusterId ||
                                `theme_${group.theme
                                  .replace(/[^a-zA-Z0-9]/g, "_")
                                  .toLowerCase()}`;
                              setCurrentSpec({
                                clusterId: clusterId,
                                clusterTheme: group.theme,
                                spec: generatedClusterSpecs[clusterId],
                              });
                              setShowSpecModal(true);
                            }}
                            className="btn btn-sm btn-outline btn-primary"
                            title="View generated specification for this cluster"
                          >
                            <span className="text-xs">📋</span>
                            View Spec
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              handleGenerateClusterSpec(group, groupIndex)
                            }
                            disabled={
                              generatingClusterSpecId ===
                              (group.clusterId ||
                                `theme_${group.theme
                                  .replace(/[^a-zA-Z0-9]/g, "_")
                                  .toLowerCase()}`)
                            }
                            className={`btn btn-sm btn-primary ${
                              generatingClusterSpecId ===
                              (group.clusterId ||
                                `theme_${group.theme
                                  .replace(/[^a-zA-Z0-9]/g, "_")
                                  .toLowerCase()}`)
                                ? "loading"
                                : ""
                            }`}
                            title="Generate specification for this cluster"
                          >
                            {generatingClusterSpecId ===
                            (group.clusterId ||
                              `theme_${group.theme
                                .replace(/[^a-zA-Z0-9]/g, "_")
                                .toLowerCase()}`) ? (
                              "Generating..."
                            ) : (
                              <>
                                <span className="text-xs">🎯</span>
                                Generate Spec
                              </>
                            )}
                          </button>
                        )}
                      </div>

                      <div className="space-y-2">
                        <span className="text-xs font-medium">
                          Related Feedback:
                        </span>
                        {group.feedbackIds.map((feedbackId) => {
                          const feedback = feedbackList.find(
                            (f) => f.id === feedbackId
                          );
                          if (!feedback) return null;

                          return (
                            <div
                              key={feedbackId}
                              className={`border rounded p-2 cursor-pointer text-sm transition-all ${
                                selectedFeedback?.id === feedbackId
                                  ? "border-primary bg-primary/10"
                                  : "border-base-300 hover:bg-base-300/50"
                              }`}
                              onClick={() => handleFeedbackClick(feedback)}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium">
                                  {feedback.title}
                                </span>
                                {feedback.aiAnalysis && (
                                  <span
                                    className={`badge badge-xs ${getSentimentColor(
                                      feedback.aiAnalysis.sentiment
                                    )}`}
                                  >
                                    {getSentimentIcon(
                                      feedback.aiAnalysis.sentiment
                                    )}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-base-content/70 line-clamp-2">
                                {feedback.content}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {feedbackGroups.ungrouped &&
                    feedbackGroups.ungrouped.length > 0 && (
                      <div className="border border-dashed border-base-300 rounded-lg p-4">
                        <h3 className="font-semibold mb-3">
                          Ungrouped Feedback ({feedbackGroups.ungrouped.length})
                        </h3>
                        <div className="space-y-2">
                          {feedbackGroups.ungrouped.map((feedbackId) => {
                            const feedback = feedbackList.find(
                              (f) => f.id === feedbackId
                            );
                            if (!feedback) return null;

                            return (
                              <div
                                key={feedbackId}
                                className={`border rounded p-2 cursor-pointer text-sm transition-all ${
                                  selectedFeedback?.id === feedbackId
                                    ? "border-primary bg-primary/10"
                                    : "border-base-300 hover:bg-base-300/50"
                                }`}
                                onClick={() => handleFeedbackClick(feedback)}
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium">
                                    {feedback.title}
                                  </span>
                                  {feedback.aiAnalysis && (
                                    <span
                                      className={`badge badge-xs ${getSentimentColor(
                                        feedback.aiAnalysis.sentiment
                                      )}`}
                                    >
                                      {getSentimentIcon(
                                        feedback.aiAnalysis.sentiment
                                      )}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-base-content/70 line-clamp-2">
                                  {feedback.content}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                </div>
              ) : (
                <div className="space-y-4">
                  {feedbackList.map((feedback) => (
                    <div
                      key={feedback.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-all ${
                        selectedFeedback?.id === feedback.id
                          ? "border-primary bg-primary/10"
                          : "border-base-300 hover:bg-base-300/50"
                      }`}
                      onClick={() => handleFeedbackClick(feedback)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-medium">
                              {feedback.title}
                            </span>
                            <div
                              className={`badge badge-sm ${getPriorityColor(
                                feedback.priority
                              )}`}
                            >
                              {feedback.priority}
                            </div>
                            <span className="text-lg" title={feedback.category}>
                              {getCategoryIcon(feedback.category)}
                            </span>
                            {feedback.aiAnalysis && (
                              <span
                                className={`badge badge-xs ${getSentimentColor(
                                  feedback.aiAnalysis.sentiment
                                )}`}
                                title={`AI: ${
                                  feedback.aiAnalysis.sentiment
                                } sentiment (${getSentimentScore(
                                  feedback.aiAnalysis.sentimentScore
                                )})`}
                              >
                                {getSentimentIcon(
                                  feedback.aiAnalysis.sentiment
                                )}{" "}
                                AI
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-base-content/80 mb-2 line-clamp-2">
                            {feedback.content}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-base-content/60">
                            <span className="flex items-center gap-1">
                              {getSourceIcon(feedback.source)} {feedback.source}
                            </span>
                            <span>
                              {new Date(
                                feedback.submittedAt
                              ).toLocaleDateString()}
                            </span>
                            <span
                              className={`badge badge-xs ${
                                feedback.processed
                                  ? "badge-success"
                                  : "badge-warning"
                              }`}
                            >
                              {feedback.processed ? "Processed" : "Pending"}
                            </span>
                          </div>
                          {feedback.tags && feedback.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {feedback.tags.map((tag, index) => (
                                <span
                                  key={index}
                                  className="badge badge-xs badge-ghost"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-1 ml-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleGenerateSpec(feedback);
                            }}
                            disabled={generatingSpecId === feedback.id}
                            className={`btn btn-xs btn-primary ${
                              generatingSpecId === feedback.id ? "loading" : ""
                            }`}
                            title="Generate specification for this feedback"
                          >
                            {generatingSpecId === feedback.id ? (
                              "Generating..."
                            ) : (
                              <>
                                <span className="text-xs">🎯</span>
                                Spec
                              </>
                            )}
                          </button>
                          {generatedSpecs[feedback.id] && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setCurrentSpec({
                                  feedbackId: feedback.id,
                                  feedbackTitle: feedback.title,
                                  spec: generatedSpecs[feedback.id],
                                });
                                setShowSpecModal(true);
                              }}
                              className="btn btn-xs btn-outline"
                              title="View generated specification"
                            >
                              <span className="text-xs">📋</span>
                              View
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Feedback Details */}
        <div>
          <div className="card bg-base-200 shadow-xl">
            <div className="card-body">
              <h3 className="card-title text-lg">Feedback Details</h3>

              {selectedFeedback ? (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-lg mb-2">
                      {selectedFeedback.title}
                    </h4>
                    <p className="text-base-content/80 mb-4">
                      {selectedFeedback.content}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="font-medium">Source:</span>
                      <span className="badge badge-outline">
                        {getSourceIcon(selectedFeedback.source)}{" "}
                        {selectedFeedback.source}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Priority:</span>
                      <span
                        className={`badge ${getPriorityColor(
                          selectedFeedback.priority
                        )}`}
                      >
                        {selectedFeedback.priority}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Category:</span>
                      <span className="badge badge-outline">
                        {getCategoryIcon(selectedFeedback.category)}{" "}
                        {selectedFeedback.category}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Status:</span>
                      <span
                        className={`badge ${
                          selectedFeedback.processed
                            ? "badge-success"
                            : "badge-warning"
                        }`}
                      >
                        {selectedFeedback.processed ? "Processed" : "Pending"}
                      </span>
                    </div>
                    {selectedFeedback.userEmail && (
                      <div className="flex justify-between">
                        <span className="font-medium">User:</span>
                        <span className="text-sm">
                          {selectedFeedback.userEmail}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="font-medium">Submitted:</span>
                      <span className="text-sm">
                        {new Date(
                          selectedFeedback.submittedAt
                        ).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* AI Analysis Section */}
                  {selectedFeedback.aiAnalysis && (
                    <>
                      <div className="divider">
                        <span className="text-xs">🤖 AI Analysis</span>
                      </div>

                      <div className="bg-base-300 p-3 rounded-lg space-y-2">
                        <div className="flex justify-between">
                          <span className="font-medium">Sentiment:</span>
                          <span
                            className={`badge ${getSentimentColor(
                              selectedFeedback.aiAnalysis.sentiment
                            )}`}
                          >
                            {getSentimentIcon(
                              selectedFeedback.aiAnalysis.sentiment
                            )}{" "}
                            {selectedFeedback.aiAnalysis.sentiment}
                          </span>
                        </div>

                        <div className="flex justify-between">
                          <span className="font-medium">AI Priority:</span>
                          <span
                            className={`badge ${getPriorityColor(
                              selectedFeedback.aiAnalysis.priority
                            )}`}
                          >
                            {selectedFeedback.aiAnalysis.priority}
                          </span>
                        </div>

                        {selectedFeedback.aiAnalysis.themes &&
                          selectedFeedback.aiAnalysis.themes.length > 0 && (
                            <div>
                              <span className="font-medium">Themes:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {selectedFeedback.aiAnalysis.themes.map(
                                  (theme, index) => (
                                    <span
                                      key={index}
                                      className="badge badge-xs badge-outline"
                                    >
                                      {theme}
                                    </span>
                                  )
                                )}
                              </div>
                            </div>
                          )}

                        {selectedFeedback.aiAnalysis.summary && (
                          <div>
                            <span className="font-medium">Summary:</span>
                            <p className="text-xs mt-1 text-base-content/80">
                              {selectedFeedback.aiAnalysis.summary}
                            </p>
                          </div>
                        )}

                        {selectedFeedback.aiAnalysis.actionableInsights &&
                          selectedFeedback.aiAnalysis.actionableInsights
                            .length > 0 && (
                            <div>
                              <span className="font-medium">Insights:</span>
                              <ul className="text-xs mt-1 space-y-1">
                                {selectedFeedback.aiAnalysis.actionableInsights.map(
                                  (insight, index) => (
                                    <li
                                      key={index}
                                      className="flex items-start gap-1"
                                    >
                                      <span className="text-info">•</span>
                                      <span className="text-base-content/80">
                                        {insight}
                                      </span>
                                    </li>
                                  )
                                )}
                              </ul>
                            </div>
                          )}

                        {selectedFeedback.aiAnalysis.suggestedActions &&
                          selectedFeedback.aiAnalysis.suggestedActions.length >
                            0 && (
                            <div>
                              <span className="font-medium">
                                Suggested Actions:
                              </span>
                              <ul className="text-xs mt-1 space-y-1">
                                {selectedFeedback.aiAnalysis.suggestedActions.map(
                                  (action, index) => (
                                    <li
                                      key={index}
                                      className="flex items-start gap-1"
                                    >
                                      <span className="text-success">→</span>
                                      <span className="text-base-content/80">
                                        {action}
                                      </span>
                                    </li>
                                  )
                                )}
                              </ul>
                            </div>
                          )}
                      </div>
                    </>
                  )}

                  <div className="divider"></div>

                  <div className="space-y-2">
                    <button
                      onClick={() => handleGenerateSpec(selectedFeedback)}
                      disabled={generatingSpecId === selectedFeedback.id}
                      className={`btn btn-primary btn-sm w-full ${
                        generatingSpecId === selectedFeedback.id
                          ? "loading"
                          : ""
                      }`}
                    >
                      {generatingSpecId === selectedFeedback.id ? (
                        "Generating..."
                      ) : (
                        <>
                          <span className="text-sm">🎯</span>
                          Generate Spec
                        </>
                      )}
                    </button>
                    {generatedSpecs[selectedFeedback.id] && (
                      <button
                        onClick={() => {
                          setCurrentSpec({
                            feedbackId: selectedFeedback.id,
                            feedbackTitle: selectedFeedback.title,
                            spec: generatedSpecs[selectedFeedback.id],
                          });
                          setShowSpecModal(true);
                        }}
                        className="btn btn-outline btn-sm w-full"
                      >
                        <span className="text-sm">📋</span>
                        View Generated Spec
                      </button>
                    )}
                    {!selectedFeedback.processed && (
                      <button
                        onClick={() =>
                          handleMarkAsProcessed(selectedFeedback.id)
                        }
                        disabled={processingId === selectedFeedback.id}
                        className={`btn btn-success btn-sm w-full ${
                          processingId === selectedFeedback.id ? "loading" : ""
                        }`}
                      >
                        {processingId === selectedFeedback.id ? (
                          "Processing..."
                        ) : (
                          <>
                            <span className="text-sm">✅</span>
                            Mark as Processed
                          </>
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteFeedback(selectedFeedback.id)}
                      disabled={deletingId === selectedFeedback.id}
                      className={`btn btn-error btn-sm w-full ${
                        deletingId === selectedFeedback.id ? "loading" : ""
                      }`}
                    >
                      {deletingId === selectedFeedback.id ? (
                        "Deleting..."
                      ) : (
                        <>
                          <span className="text-sm">🗑️</span>
                          Delete Feedback
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">👆</div>
                  <p className="text-base-content/70">
                    Select a feedback item to view details
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <FeedbackForm
              onSubmit={handleFeedbackSubmit}
              onCancel={() => setShowForm(false)}
            />
          </div>
        </div>
      )}

      {/* Spec Modal */}
      {showSpecModal && currentSpec && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="card bg-base-200 shadow-xl">
              <div className="card-body">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="card-title text-xl">
                    Generated Specification
                  </h2>
                  <button
                    onClick={() => setShowSpecModal(false)}
                    className="btn btn-sm btn-ghost"
                  >
                    <span className="text-lg">✕</span>
                  </button>
                </div>

                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium">
                      {currentSpec.feedbackTitle ? "Feedback:" : "Cluster:"}
                    </span>
                    <span className="badge badge-outline">
                      {currentSpec.feedbackTitle || currentSpec.clusterTheme}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Specification</h3>
                  <button
                    onClick={() => copySpecToClipboard(currentSpec.spec)}
                    className="btn btn-sm btn-outline"
                  >
                    <span className="text-lg">📋</span>
                    Copy
                  </button>
                </div>

                <div className="bg-base-300 p-4 rounded-lg max-h-96 overflow-y-auto">
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown>{currentSpec.spec}</ReactMarkdown>
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-4">
                  <button
                    onClick={() => copySpecToClipboard(currentSpec.spec)}
                    className="btn btn-primary"
                  >
                    <span className="text-lg">📋</span>
                    Copy to Clipboard
                  </button>
                  <button
                    onClick={() => setShowSpecModal(false)}
                    className="btn btn-outline"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
