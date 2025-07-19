"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../libs/supabase/client.js";
import ButtonAccount from "../../components/ButtonAccount.js";
import FeedbackForm from "../../components/FeedbackForm.js";
import SpecGenerator from "../../components/SpecGenerator.js";
import toast from "react-hot-toast";
import ReactMarkdown from "react-markdown";

export const dynamic = "force-dynamic";

// Mock data for demo - replace with real data fetching
const mockStats = {
  totalFeedback: 1247,
  processedThisMonth: 89,
  integrations: 3,
  specsGenerated: 24,
};

const mockIntegrations = [
  { name: "Twitter", status: "connected", lastSync: "2024-01-15T10:00:00Z" },
  { name: "Discord", status: "connected", lastSync: "2024-01-15T09:30:00Z" },
  { name: "Email", status: "connected", lastSync: "2024-01-15T08:00:00Z" },
  { name: "Slack", status: "disconnected", lastSync: null },
];

export default function Dashboard() {
  const supabase = createClient();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");

  // States for feedback management
  const [feedbackList, setFeedbackList] = useState([]);
  const [feedbackGroups, setFeedbackGroups] = useState(null);
  const [aiStats, setAiStats] = useState(null);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [viewMode, setViewMode] = useState("list");
  const [showForm, setShowForm] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [generatingSpecId, setGeneratingSpecId] = useState(null);
  const [generatedSpecs, setGeneratedSpecs] = useState({});
  const [showSpecModal, setShowSpecModal] = useState(false);
  const [currentSpec, setCurrentSpec] = useState(null);

  // Loading states
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [specGenerating, setSpecGenerating] = useState(false);
  const [clusteringInProgress, setClusteringInProgress] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: "🏠" },
    { id: "feedback", label: "Feedback", icon: "💬" },
    { id: "add-feedback", label: "Add Feedback", icon: "📝" },
    { id: "specs", label: "Generate Specs", icon: "📋" },
  ];

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    getUser();
  }, []);

  useEffect(() => {
    if (activeTab === "feedback") {
      fetchFeedback();
    }
  }, [activeTab]);

  // Initial load of feedback data
  useEffect(() => {
    fetchFeedback();
  }, []);

  // Enhanced error handling helper
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
    } else if (error.message.includes("503")) {
      toast.error("Service temporarily unavailable");
    } else {
      toast.error(`Failed to complete ${context} - please try again`);
    }
  };

  // Enhanced feedback fetching with better error handling
  const fetchFeedback = async (preserveAiAnalysis = false) => {
    try {
      setFeedbackLoading(true);

      const response = await fetch("/api/feedback", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

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

        // Show clustering status
        if (result.feedbackGroups?.groups?.length > 0) {
          console.log(
            `🔗 Loaded ${result.feedbackGroups.groups.length} feedback clusters`
          );
          if (result.feedbackGroups.groups.length > 0 && !preserveAiAnalysis) {
            toast.success(
              `🔗 Organized ${result.feedbackGroups.groups.length} feedback clusters`
            );
          }
        }
      } else {
        const errorMessage =
          result.message || result.error || "Unknown error occurred";
        console.error("API Error:", errorMessage);
        handleApiError(new Error(errorMessage), "loading feedback");
      }
    } catch (error) {
      handleApiError(error, "loading feedback");
    } finally {
      setFeedbackLoading(false);
      setInitialLoad(false);
    }
  };

  // Enhanced feedback submission with progress tracking
  const handleFeedbackSubmit = async (feedbackData) => {
    try {
      // Show processing status
      toast.loading("Processing feedback...", { id: "feedback-processing" });

      // Add to list immediately for instant feedback
      setFeedbackList((prev) => [feedbackData, ...prev]);
      setShowForm(false);
      setActiveTab("feedback");

      // Update toast for AI analysis
      toast.loading("🤖 AI analysis in progress...", {
        id: "feedback-processing",
      });

      // Check for duplicate warnings
      if (
        feedbackData.duplicateCheck?.isDuplicate &&
        feedbackData.duplicateCheck.similarityScore > 0.7
      ) {
        toast.warning(
          `Similar feedback detected: ${feedbackData.duplicateCheck.explanation}`,
          { duration: 5000 }
        );
      }

      // Show AI analysis result
      if (feedbackData.aiAnalysis) {
        toast.success(
          `Feedback submitted! AI detected ${feedbackData.aiAnalysis.sentiment} sentiment.`,
          { id: "feedback-processing" }
        );
      } else {
        toast.success("Feedback submitted successfully!", {
          id: "feedback-processing",
        });
        // Continue showing AI analysis progress
        toast.loading("🤖 AI analysis in progress...", {
          id: "ai-analysis",
          duration: 10000,
        });
      }

      // Refresh data to get updated grouping with delay for AI processing
      setTimeout(() => {
        fetchFeedback(true);
        toast.dismiss("ai-analysis");
      }, 3000);

      console.log("✅ Feedback submitted successfully:", feedbackData);
    } catch (error) {
      handleApiError(error, "submitting feedback");
      // Remove from list if submission failed
      setFeedbackList((prev) =>
        prev.filter((item) => item.id !== feedbackData.id)
      );
    }
  };

  const handleFeedbackClick = (feedback) => {
    setSelectedFeedback(feedback);
  };

  // Enhanced mark as processed with optimistic updates
  const handleMarkAsProcessed = async (id) => {
    if (!id || processingId === id) return;

    setProcessingId(id);

    // Optimistic update
    const previousFeedback = feedbackList.find((f) => f.id === id);
    setFeedbackList((prev) =>
      prev.map((feedback) =>
        feedback.id === id ? { ...feedback, processed: true } : feedback
      )
    );

    try {
      const response = await fetch("/api/feedback", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, processed: true }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        toast.success("Feedback marked as processed");
      } else {
        throw new Error(result.message || "Failed to update feedback");
      }
    } catch (error) {
      // Revert optimistic update on error
      setFeedbackList((prev) =>
        prev.map((feedback) =>
          feedback.id === id
            ? { ...feedback, processed: previousFeedback?.processed || false }
            : feedback
        )
      );
      handleApiError(error, "marking feedback as processed");
    } finally {
      setProcessingId(null);
    }
  };

  // Enhanced delete with confirmation and optimistic updates
  const handleDeleteFeedback = async (id) => {
    if (!id || deletingId === id) return;

    const feedbackToDelete = feedbackList.find((f) => f.id === id);
    if (!feedbackToDelete) return;

    if (
      !confirm(
        `Are you sure you want to delete "${feedbackToDelete.title}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    setDeletingId(id);

    // Optimistic update
    setFeedbackList((prev) => prev.filter((feedback) => feedback.id !== id));
    setSelectedFeedback(null);

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
        toast.success("Feedback deleted successfully");
      } else {
        throw new Error(result.message || "Failed to delete feedback");
      }
    } catch (error) {
      // Revert optimistic update on error
      setFeedbackList((prev) => [feedbackToDelete, ...prev]);
      handleApiError(error, "deleting feedback");
    } finally {
      setDeletingId(null);
    }
  };

  // Enhanced spec generation with better error handling
  const handleGenerateSpec = async (feedback) => {
    if (!feedback || generatingSpecId === feedback.id) return;

    // Check if already generated
    if (generatedSpecs[feedback.id]) {
      setCurrentSpec({
        feedbackId: feedback.id,
        feedbackTitle: feedback.title,
        spec: generatedSpecs[feedback.id],
      });
      setShowSpecModal(true);
      return;
    }

    setGeneratingSpecId(feedback.id);

    try {
      toast.loading(`Generating specification for "${feedback.title}"...`, {
        id: `spec-gen-${feedback.id}`,
      });

      const response = await fetch("/api/generate-individual-spec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedbackId: feedback.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
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
        toast.success("Specification generated successfully!", {
          id: `spec-gen-${feedback.id}`,
        });
      } else {
        throw new Error(result.message || "Failed to generate specification");
      }
    } catch (error) {
      toast.error(`Failed to generate specification: ${error.message}`, {
        id: `spec-gen-${feedback.id}`,
      });
      handleApiError(error, "generating specification");
    } finally {
      setGeneratingSpecId(null);
    }
  };

  // Enhanced clipboard copy with better feedback
  const copySpecToClipboard = async (spec) => {
    try {
      await navigator.clipboard.writeText(spec);
      toast.success("Specification copied to clipboard!");
    } catch (err) {
      // Fallback for older browsers
      try {
        const textArea = document.createElement("textarea");
        textArea.value = spec;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        toast.success("Specification copied to clipboard!");
      } catch (fallbackError) {
        toast.error("Failed to copy to clipboard. Please copy manually.");
      }
    }
  };

  // Helper functions
  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high":
        return "badge-error";
      case "medium":
        return "badge-warning";
      case "low":
        return "badge-info";
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

  const getIntegrationIcon = (name) => {
    switch (name.toLowerCase()) {
      case "twitter":
        return "🐦";
      case "discord":
        return "💬";
      case "email":
        return "📧";
      case "slack":
        return "📱";
      default:
        return "🔗";
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
          <p className="mt-4 text-base-content/70">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 lg:pl-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">
              FeedbackSpec Dashboard
            </h1>
            <p className="text-base-content/70 mt-2">
              Manage feedback and generate specifications
            </p>
          </div>
          <div className="flex gap-2">
            <ButtonAccount />
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="border-b border-base-300 mb-6">
          <nav className="flex space-x-4 md:space-x-8 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 px-2 md:px-4 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-base-content/60 hover:text-base-content hover:border-base-content/30"
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="min-h-[600px]">
          {activeTab === "dashboard" && (
            <div className="space-y-8">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="card bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-xl">
                  <div className="card-body">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-100 text-sm">Total Feedback</p>
                        <p className="text-3xl font-bold">{stats.total}</p>
                      </div>
                      <div className="text-4xl opacity-80">💬</div>
                    </div>
                  </div>
                </div>

                <div className="card bg-gradient-to-r from-green-500 to-green-600 text-white shadow-xl">
                  <div className="card-body">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-100 text-sm">Processed</p>
                        <p className="text-3xl font-bold">{stats.processed}</p>
                      </div>
                      <div className="text-4xl opacity-80">✅</div>
                    </div>
                  </div>
                </div>

                <div className="card bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-xl">
                  <div className="card-body">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-purple-100 text-sm">
                          Active Integrations
                        </p>
                        <p className="text-3xl font-bold">
                          {mockStats.integrations}
                        </p>
                      </div>
                      <div className="text-4xl opacity-80">🔗</div>
                    </div>
                  </div>
                </div>

                <div className="card bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-xl">
                  <div className="card-body">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-orange-100 text-sm">
                          Specs Generated
                        </p>
                        <p className="text-3xl font-bold">
                          {mockStats.specsGenerated}
                        </p>
                      </div>
                      <div className="text-4xl opacity-80">📋</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Quick Actions */}
                <div className="card bg-base-200 shadow-xl">
                  <div className="card-body">
                    <h3 className="card-title text-lg">Quick Actions</h3>
                    <div className="space-y-3">
                      <button
                        onClick={() => setActiveTab("add-feedback")}
                        className="btn btn-primary btn-sm w-full"
                      >
                        <span className="text-lg">📝</span>
                        Add Feedback
                      </button>
                      <button
                        onClick={() => setActiveTab("feedback")}
                        className="btn btn-outline btn-sm w-full"
                      >
                        <span className="text-lg">💬</span>
                        Manage Feedback
                      </button>
                      <button
                        onClick={() => setActiveTab("specs")}
                        className="btn btn-outline btn-sm w-full"
                      >
                        <span className="text-lg">🎯</span>
                        Generate Spec
                      </button>
                    </div>
                  </div>
                </div>

                {/* Integration Status */}
                <div className="card bg-base-200 shadow-xl">
                  <div className="card-body">
                    <h3 className="card-title text-lg">Integrations</h3>
                    <div className="space-y-3">
                      {mockIntegrations.map((integration) => (
                        <div
                          key={integration.name}
                          className="flex items-center justify-between p-2 rounded border border-base-300"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-lg">
                              {getIntegrationIcon(integration.name)}
                            </span>
                            <div>
                              <div className="font-medium text-sm">
                                {integration.name}
                              </div>
                              {integration.lastSync && (
                                <div className="text-xs text-base-content/60">
                                  Last sync:{" "}
                                  {new Date(
                                    integration.lastSync
                                  ).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          </div>
                          <div
                            className={`badge badge-xs ${
                              integration.status === "connected"
                                ? "badge-success"
                                : "badge-error"
                            }`}
                          >
                            {integration.status}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* User Profile */}
                <div className="card bg-base-200 shadow-xl">
                  <div className="card-body">
                    <h3 className="card-title text-lg">Account</h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="avatar placeholder">
                          <div className="bg-primary text-primary-content rounded-full w-10">
                            <span className="text-sm font-medium">
                              {user?.email?.charAt(0).toUpperCase() || "U"}
                            </span>
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            {user?.email}
                          </div>
                          <div className="text-xs text-base-content/60">
                            Pro Plan
                          </div>
                        </div>
                      </div>
                      <div className="divider my-2"></div>
                      <ButtonAccount />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "add-feedback" && (
            <div className="max-w-4xl mx-auto">
              <FeedbackForm
                onSubmit={handleFeedbackSubmit}
                onCancel={() => setActiveTab("dashboard")}
              />
            </div>
          )}

          {activeTab === "feedback" && (
            <div className="space-y-6">
              {/* Feedback Stats */}
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                <div className="card bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                  <div className="card-body p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-100 text-sm">Total</p>
                        {feedbackLoading ? (
                          <div className="loading loading-spinner loading-sm"></div>
                        ) : (
                          <p className="text-2xl font-bold">{stats.total}</p>
                        )}
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
                        {feedbackLoading ? (
                          <div className="loading loading-spinner loading-sm"></div>
                        ) : (
                          <p className="text-2xl font-bold">
                            {stats.processed}
                          </p>
                        )}
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
                        {feedbackLoading ? (
                          <div className="loading loading-spinner loading-sm"></div>
                        ) : (
                          <p className="text-2xl font-bold">{stats.pending}</p>
                        )}
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
                        {feedbackLoading ? (
                          <div className="loading loading-spinner loading-sm"></div>
                        ) : (
                          <p className="text-2xl font-bold">
                            {stats.highPriority}
                          </p>
                        )}
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
                        {feedbackLoading ? (
                          <div className="loading loading-spinner loading-sm"></div>
                        ) : (
                          <p className="text-2xl font-bold">
                            {stats.aiAnalyzed}
                          </p>
                        )}
                      </div>
                      <div className="text-3xl opacity-80">🤖</div>
                    </div>
                  </div>
                </div>

                <div className="card bg-gradient-to-r from-pink-500 to-pink-600 text-white">
                  <div className="card-body p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-pink-100 text-sm">Groups</p>
                        {feedbackLoading ? (
                          <div className="loading loading-spinner loading-sm"></div>
                        ) : (
                          <p className="text-2xl font-bold">{stats.groups}</p>
                        )}
                      </div>
                      <div className="text-3xl opacity-80">🔗</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Feedback Content */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Feedback List */}
                <div className="lg:col-span-2">
                  <div className="card bg-base-200 shadow-xl">
                    <div className="card-body">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="card-title text-xl">Recent Feedback</h2>
                        <button
                          onClick={() => setActiveTab("add-feedback")}
                          className="btn btn-primary btn-sm"
                        >
                          <span className="text-lg">➕</span>
                          Add Feedback
                        </button>
                      </div>

                      {feedbackLoading ? (
                        <div className="text-center py-8">
                          <div className="loading loading-spinner loading-lg"></div>
                          <p className="text-base-content/70 mt-4">
                            Loading feedback...
                          </p>
                        </div>
                      ) : feedbackList.length === 0 ? (
                        <div className="text-center py-8">
                          <div className="text-6xl mb-4">📝</div>
                          <p className="text-base-content/70">
                            No feedback yet. Add your first feedback item!
                          </p>
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
                                    <span
                                      className="text-lg"
                                      title={feedback.category}
                                    >
                                      {getCategoryIcon(feedback.category)}
                                    </span>
                                    {feedback.aiAnalysis && (
                                      <span
                                        className={`badge badge-xs ${getSentimentColor(
                                          feedback.aiAnalysis.sentiment
                                        )}`}
                                        title={`AI: ${feedback.aiAnalysis.sentiment} sentiment`}
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
                                      {getSourceIcon(feedback.source)}{" "}
                                      {feedback.source}
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
                                      {feedback.processed
                                        ? "Processed"
                                        : "Pending"}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex flex-col gap-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleGenerateSpec(feedback);
                                    }}
                                    disabled={generatingSpecId === feedback.id}
                                    className={`btn btn-xs btn-primary ${
                                      generatingSpecId === feedback.id
                                        ? "loading"
                                        : ""
                                    }`}
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
                                {selectedFeedback.processed
                                  ? "Processed"
                                  : "Pending"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-medium">Submitted:</span>
                              <span className="text-sm">
                                {new Date(
                                  selectedFeedback.submittedAt
                                ).toLocaleString()}
                              </span>
                            </div>
                          </div>

                          <div className="divider"></div>

                          <div className="space-y-2">
                            <button
                              onClick={() =>
                                handleGenerateSpec(selectedFeedback)
                              }
                              disabled={
                                generatingSpecId === selectedFeedback.id
                              }
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
                                  processingId === selectedFeedback.id
                                    ? "loading"
                                    : ""
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
                              onClick={() =>
                                handleDeleteFeedback(selectedFeedback.id)
                              }
                              disabled={deletingId === selectedFeedback.id}
                              className={`btn btn-error btn-sm w-full ${
                                deletingId === selectedFeedback.id
                                  ? "loading"
                                  : ""
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
            </div>
          )}

          {activeTab === "specs" && (
            <div className="max-w-7xl mx-auto">
              <SpecGenerator />
            </div>
          )}
        </div>

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
    </div>
  );
}
