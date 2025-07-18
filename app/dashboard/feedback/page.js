"use client";

import { useState, useEffect } from "react";
import FeedbackForm from "@/components/FeedbackForm";
import toast from "react-hot-toast";

export default function FeedbackPage() {
  const [feedbackList, setFeedbackList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);

  // Fetch feedback from API
  useEffect(() => {
    fetchFeedback();
  }, []);

  const fetchFeedback = async () => {
    try {
      const response = await fetch("/api/feedback");
      const result = await response.json();

      if (result.success) {
        setFeedbackList(result.data);
      } else {
        toast.error("Failed to load feedback");
      }
    } catch (error) {
      console.error("Error fetching feedback:", error);
      toast.error("Failed to load feedback");
    } finally {
      setLoading(false);
    }
  };

  const handleFeedbackSubmit = async (feedbackData) => {
    // Add the new feedback to the list
    setFeedbackList((prev) => [feedbackData, ...prev]);
    setShowForm(false);
    console.log("New feedback submitted:", feedbackData);
  };

  const handleFeedbackClick = (feedback) => {
    setSelectedFeedback(feedback);
  };

  const handleMarkAsProcessed = async (id) => {
    try {
      const response = await fetch("/api/feedback", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, processed: true }),
      });

      const result = await response.json();

      if (result.success) {
        setFeedbackList((prev) =>
          prev.map((feedback) =>
            feedback.id === id ? { ...feedback, processed: true } : feedback
          )
        );
        toast.success("Feedback marked as processed");
      } else {
        toast.error("Failed to update feedback");
      }
    } catch (error) {
      console.error("Error updating feedback:", error);
      toast.error("Failed to update feedback");
    }
  };

  const handleDeleteFeedback = async (id) => {
    try {
      const response = await fetch(`/api/feedback?id=${id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        setFeedbackList((prev) =>
          prev.filter((feedback) => feedback.id !== id)
        );
        setSelectedFeedback(null);
        toast.success("Feedback deleted");
      } else {
        toast.error("Failed to delete feedback");
      }
    } catch (error) {
      console.error("Error deleting feedback:", error);
      toast.error("Failed to delete feedback");
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

  const stats = {
    total: feedbackList.length,
    processed: feedbackList.filter((f) => f.processed).length,
    pending: feedbackList.filter((f) => !f.processed).length,
    highPriority: feedbackList.filter(
      (f) => f.priority === "high" || f.priority === "urgent"
    ).length,
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
          </p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn btn-primary">
          <span className="text-lg">➕</span>
          Add Feedback
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Feedback List */}
        <div className="lg:col-span-2">
          <div className="card bg-base-200 shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-xl mb-4">Recent Feedback</h2>

              {feedbackList.length === 0 ? (
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
                            <span className="text-lg" title={feedback.category}>
                              {getCategoryIcon(feedback.category)}
                            </span>
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

                  <div className="divider"></div>

                  <div className="space-y-2">
                    {!selectedFeedback.processed && (
                      <button
                        onClick={() =>
                          handleMarkAsProcessed(selectedFeedback.id)
                        }
                        className="btn btn-success btn-sm w-full"
                      >
                        <span className="text-sm">✅</span>
                        Mark as Processed
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteFeedback(selectedFeedback.id)}
                      className="btn btn-error btn-sm w-full"
                    >
                      <span className="text-sm">🗑️</span>
                      Delete Feedback
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
    </div>
  );
}
