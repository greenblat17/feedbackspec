"use client";

import { useState } from "react";
import { useFeedback, useFeedbackFilters, useSpecs } from "@/hooks";
import { 
  LoadingSpinner, 
  ErrorBoundary, 
  EmptyFeedback, 
  EmptySearchResults,
  FeedbackCard,
  Card,
  CardHeader,
  CardBody 
} from "@/components/ui";
import FeedbackForm from "@/components/FeedbackForm";
import ReactMarkdown from "react-markdown";
import toast from "react-hot-toast";

export default function FeedbackPage() {
  const [showForm, setShowForm] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [viewMode, setViewMode] = useState("list"); // 'list' or 'groups'
  const [showSpecModal, setShowSpecModal] = useState(false);
  const [currentSpec, setCurrentSpec] = useState(null);

  // Use centralized hooks
  const {
    feedback,
    feedbackGroups,
    aiStats,
    loading,
    error,
    addFeedback,
    updateFeedback,
    deleteFeedback,
    refetchFeedback,
  } = useFeedback();

  const {
    filters,
    filteredFeedback,
    updateFilter,
    resetFilters,
  } = useFeedbackFilters(feedback);

  const {
    generateSpecFromFeedback,
    generateSpecFromCluster,
    generatingIndividualSpec,
    generatingClusterSpec,
  } = useSpecs();

  // Handle feedback form submission
  const handleFormSubmit = async (formData) => {
    try {
      await addFeedback(formData);
      setShowForm(false);
      toast.success("Feedback added successfully!");
    } catch (error) {
      toast.error("Failed to add feedback");
    }
  };

  // Handle feedback deletion
  const handleDeleteFeedback = async (feedbackItem) => {
    try {
      await deleteFeedback(feedbackItem.id);
      toast.success("Feedback deleted successfully!");
    } catch (error) {
      toast.error("Failed to delete feedback");
    }
  };

  // Handle spec generation from individual feedback
  const handleGenerateSpec = async (feedbackItem) => {
    try {
      const result = await generateSpecFromFeedback(feedbackItem);
      setCurrentSpec(result.spec);
      setShowSpecModal(true);
      toast.success("Specification generated successfully!");
    } catch (error) {
      toast.error("Failed to generate specification");
    }
  };

  // Handle spec generation from cluster
  const handleGenerateClusterSpec = async (cluster) => {
    try {
      const result = await generateSpecFromCluster(cluster);
      setCurrentSpec(result.spec);
      setShowSpecModal(true);
      toast.success("Cluster specification generated successfully!");
    } catch (error) {
      toast.error("Failed to generate cluster specification");
    }
  };

  // Handle feedback processing toggle
  const handleProcessFeedback = async (feedbackItem) => {
    try {
      await updateFeedback(feedbackItem.id, {
        processed: !feedbackItem.processed,
      });
      toast.success("Feedback updated successfully!");
    } catch (error) {
      toast.error("Failed to update feedback");
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <LoadingSpinner size="lg" text="Loading feedback..." />
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardBody>
            <div className="text-center">
              <h3 className="text-lg font-medium text-red-900 mb-2">
                Failed to load feedback
              </h3>
              <p className="text-red-700 mb-4">{error.message}</p>
              <button
                onClick={refetchFeedback}
                className="bg-red-100 text-red-800 px-4 py-2 rounded-md hover:bg-red-200 transition-colors"
              >
                Try Again
              </button>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Feedback</h1>
            <p className="text-gray-600 mt-2">
              {feedback.length} feedback items
              {filters.search && ` matching "${filters.search}"`}
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors"
          >
            Add Feedback
          </button>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center space-x-4 mb-6">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewMode === "list"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              List View
            </button>
            <button
              onClick={() => setViewMode("groups")}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewMode === "groups"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Groups View
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardBody>
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-64">
                <input
                  type="text"
                  placeholder="Search feedback..."
                  value={filters.search}
                  onChange={(e) => updateFilter("search", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <select
                value={filters.category}
                onChange={(e) => updateFilter("category", e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Categories</option>
                <option value="bug">Bug</option>
                <option value="feature">Feature</option>
                <option value="improvement">Improvement</option>
                <option value="complaint">Complaint</option>
                <option value="praise">Praise</option>
                <option value="question">Question</option>
                <option value="suggestion">Suggestion</option>
                <option value="other">Other</option>
              </select>
              <select
                value={filters.priority}
                onChange={(e) => updateFilter("priority", e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
              <button
                onClick={resetFilters}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </CardBody>
        </Card>

        {/* Content */}
        {viewMode === "list" ? (
          <div className="space-y-4">
            {filteredFeedback.length === 0 ? (
              filters.search ? (
                <EmptySearchResults 
                  searchTerm={filters.search}
                  onClearSearch={() => updateFilter("search", "")}
                />
              ) : (
                <EmptyFeedback onAddFeedback={() => setShowForm(true)} />
              )
            ) : (
              filteredFeedback.map((feedbackItem) => (
                <FeedbackCard
                  key={feedbackItem.id}
                  feedback={feedbackItem}
                  onEdit={(feedback) => {
                    setSelectedFeedback(feedback);
                    setShowForm(true);
                  }}
                  onDelete={handleDeleteFeedback}
                  onGenerateSpec={handleGenerateSpec}
                />
              ))
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {feedbackGroups?.groups?.length > 0 ? (
              feedbackGroups.groups.map((group) => (
                <Card key={group.theme} className="p-6">
                  <CardHeader
                    title={group.theme}
                    subtitle={`${group.feedbackIds?.length || 0} feedback items`}
                    action={
                      <button
                        onClick={() => handleGenerateClusterSpec(group)}
                        disabled={generatingClusterSpec}
                        className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors disabled:opacity-50"
                      >
                        {generatingClusterSpec ? "Generating..." : "Generate Spec"}
                      </button>
                    }
                  />
                  <CardBody>
                    <p className="text-gray-700 mb-4">{group.description}</p>
                    <div className="space-y-2">
                      {group.feedbackIds?.slice(0, 3).map((feedbackId) => {
                        const feedbackItem = feedback.find(f => f.id === feedbackId);
                        return feedbackItem ? (
                          <div key={feedbackId} className="bg-gray-50 p-3 rounded-md">
                            <p className="text-sm text-gray-800">{feedbackItem.content}</p>
                          </div>
                        ) : null;
                      })}
                    </div>
                  </CardBody>
                </Card>
              ))
            ) : (
              <EmptyFeedback onAddFeedback={() => setShowForm(true)} />
            )}
          </div>
        )}

        {/* Feedback Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-lg font-semibold mb-4">
                {selectedFeedback ? "Edit Feedback" : "Add New Feedback"}
              </h2>
              <FeedbackForm
                initialData={selectedFeedback}
                onSubmit={handleFormSubmit}
                onCancel={() => {
                  setShowForm(false);
                  setSelectedFeedback(null);
                }}
              />
            </div>
          </div>
        )}

        {/* Spec Modal */}
        {showSpecModal && currentSpec && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Generated Specification</h2>
                <button
                  onClick={() => setShowSpecModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <div className="prose max-w-none">
                <ReactMarkdown>{currentSpec}</ReactMarkdown>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}