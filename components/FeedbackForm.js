"use client";

import { useState } from "react";
import { createClient } from "@/libs/supabase/client";
import toast from "react-hot-toast";

// Validation rules
const VALIDATION_RULES = {
  title: {
    required: true,
    minLength: 3,
    maxLength: 200,
    message: "Title must be between 3 and 200 characters",
  },
  content: {
    required: true,
    minLength: 10,
    maxLength: 2000,
    message: "Content must be between 10 and 2000 characters",
  },
  userEmail: {
    required: false,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: "Please enter a valid email address",
  },
  tags: {
    required: false,
    maxLength: 500,
    message: "Tags cannot exceed 500 characters",
  },
  metadata: {
    required: false,
    maxLength: 1000,
    message: "Metadata cannot exceed 1000 characters",
  },
};

export default function FeedbackForm({ onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    content: "",
    source: "manual",
    priority: "medium",
    category: "feature",
    title: "",
    userEmail: "",
    tags: "",
    metadata: "",
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const supabase = createClient();

  const sources = [
    { value: "manual", label: "Manual Entry", icon: "✏️" },
    { value: "email", label: "Email", icon: "📧" },
    { value: "twitter", label: "Twitter", icon: "🐦" },
    { value: "discord", label: "Discord", icon: "💬" },
    { value: "slack", label: "Slack", icon: "📱" },
    { value: "github", label: "GitHub", icon: "🐙" },
    { value: "website", label: "Website", icon: "🌐" },
    { value: "survey", label: "Survey", icon: "📋" },
    { value: "support", label: "Support", icon: "🎧" },
    { value: "other", label: "Other", icon: "📝" },
  ];

  const priorities = [
    { value: "low", label: "Low", color: "badge-info", icon: "🟢" },
    { value: "medium", label: "Medium", color: "badge-warning", icon: "🟡" },
    { value: "high", label: "High", color: "badge-error", icon: "🔴" },
    { value: "urgent", label: "Urgent", color: "badge-error", icon: "🚨" },
  ];

  const categories = [
    { value: "feature", label: "Feature Request", icon: "✨" },
    { value: "bug", label: "Bug Report", icon: "🐛" },
    { value: "improvement", label: "Improvement", icon: "🔧" },
    { value: "complaint", label: "Complaint", icon: "😤" },
    { value: "praise", label: "Praise", icon: "👏" },
    { value: "question", label: "Question", icon: "❓" },
    { value: "suggestion", label: "Suggestion", icon: "💡" },
    { value: "other", label: "Other", icon: "📝" },
  ];

  // Validation functions
  const validateField = (name, value) => {
    const rule = VALIDATION_RULES[name];
    if (!rule) return "";

    // Required field validation
    if (rule.required && (!value || value.trim() === "")) {
      return `${name.charAt(0).toUpperCase() + name.slice(1)} is required`;
    }

    // Skip other validations if field is empty and not required
    if (!value || value.trim() === "") {
      return "";
    }

    // Length validations
    if (rule.minLength && value.length < rule.minLength) {
      return rule.message;
    }
    if (rule.maxLength && value.length > rule.maxLength) {
      return rule.message;
    }

    // Pattern validation (for email)
    if (rule.pattern && !rule.pattern.test(value)) {
      return rule.message;
    }

    // JSON validation for metadata
    if (name === "metadata" && value.trim()) {
      try {
        JSON.parse(value);
      } catch (e) {
        return "Invalid JSON format";
      }
    }

    return "";
  };

  const validateForm = () => {
    const newErrors = {};

    Object.keys(VALIDATION_RULES).forEach((field) => {
      const error = validateField(field, formData[field]);
      if (error) {
        newErrors[field] = error;
      }
    });

    // Additional validation for tags format
    if (formData.tags && formData.tags.trim()) {
      const tags = formData.tags.split(",").map((tag) => tag.trim());
      if (tags.some((tag) => tag.length > 50)) {
        newErrors.tags = "Individual tags cannot exceed 50 characters";
      }
      if (tags.length > 10) {
        newErrors.tags = "Maximum 10 tags allowed";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Real-time validation
    const error = validateField(name, value);
    setErrors((prev) => ({
      ...prev,
      [name]: error,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate form
      if (!validateForm()) {
        toast.error("Please fix the validation errors before submitting");
        return;
      }

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Prepare feedback data
      const feedbackData = {
        ...formData,
        content: formData.content.trim(),
        title: formData.title.trim(),
        userEmail: formData.userEmail.trim() || null,
        tags: formData.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag),
        metadata: (() => {
          try {
            return formData.metadata && formData.metadata.trim()
              ? JSON.parse(formData.metadata)
              : null;
          } catch (e) {
            console.warn("Invalid JSON in metadata field:", e);
            return null;
          }
        })(),
        submittedBy: user?.id || null,
        submittedAt: new Date().toISOString(),
        processed: false,
        id: Date.now(), // Temporary ID for demo
      };

      // Submit to API
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(feedbackData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to submit feedback");
      }

      // Call onSubmit callback with the response data
      if (onSubmit) {
        await onSubmit(result.data);
      }

      toast.success("Feedback submitted successfully!");

      // Reset form
      setFormData({
        content: "",
        source: "manual",
        priority: "medium",
        category: "feature",
        title: "",
        userEmail: "",
        tags: "",
        metadata: "",
      });

      setErrors({});
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast.error(
        error.message || "Failed to submit feedback. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFieldError = (fieldName) => {
    return errors[fieldName] || "";
  };

  return (
    <div className="card bg-base-200 shadow-xl">
      <div className="card-body">
        <h2 className="card-title text-2xl mb-6">
          <span className="text-2xl">📝</span>
          Add Manual Feedback
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Title *</span>
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Brief title for this feedback"
              className={`input input-bordered w-full ${
                getFieldError("title") ? "input-error" : ""
              }`}
              required
            />
            <label className="label">
              <span className="label-text-alt text-error">
                {getFieldError("title")}
              </span>
              <span className="label-text-alt">
                {formData.title.length}/200
              </span>
            </label>
          </div>

          {/* Content */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Feedback Content *</span>
            </label>
            <textarea
              name="content"
              value={formData.content}
              onChange={handleInputChange}
              placeholder="Enter the feedback content here..."
              className={`textarea textarea-bordered h-32 w-full ${
                getFieldError("content") ? "textarea-error" : ""
              }`}
              required
            />
            <label className="label">
              <span className="label-text-alt text-error">
                {getFieldError("content")}
              </span>
              <span className="label-text-alt">
                {formData.content.length}/2000
              </span>
            </label>
          </div>

          {/* Source and Priority Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Source */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Source *</span>
              </label>
              <select
                name="source"
                value={formData.source}
                onChange={handleInputChange}
                className="select select-bordered w-full"
                required
              >
                {sources.map((source) => (
                  <option key={source.value} value={source.value}>
                    {source.icon} {source.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Priority *</span>
              </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleInputChange}
                className="select select-bordered w-full"
                required
              >
                {priorities.map((priority) => (
                  <option key={priority.value} value={priority.value}>
                    {priority.icon} {priority.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Category */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Category *</span>
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className="select select-bordered w-full"
              required
            >
              {categories.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.icon} {category.label}
                </option>
              ))}
            </select>
          </div>

          {/* User Email */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">User Email</span>
            </label>
            <input
              type="email"
              name="userEmail"
              value={formData.userEmail}
              onChange={handleInputChange}
              placeholder="Email of the user who provided this feedback (optional)"
              className={`input input-bordered w-full ${
                getFieldError("userEmail") ? "input-error" : ""
              }`}
            />
            <label className="label">
              <span className="label-text-alt text-error">
                {getFieldError("userEmail")}
              </span>
            </label>
          </div>

          {/* Tags */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Tags</span>
            </label>
            <input
              type="text"
              name="tags"
              value={formData.tags}
              onChange={handleInputChange}
              placeholder="Enter tags separated by commas (e.g., ui, mobile, performance)"
              className={`input input-bordered w-full ${
                getFieldError("tags") ? "input-error" : ""
              }`}
            />
            <label className="label">
              <span className="label-text-alt text-error">
                {getFieldError("tags")}
              </span>
              <span className="label-text-alt">Max 10 tags, 50 chars each</span>
            </label>
          </div>

          {/* Metadata */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">
                Additional Metadata (JSON)
              </span>
            </label>
            <textarea
              name="metadata"
              value={formData.metadata}
              onChange={handleInputChange}
              placeholder='{"version": "1.0", "platform": "web", "userAgent": "..."}'
              className={`textarea textarea-bordered h-20 w-full font-mono text-sm ${
                getFieldError("metadata") ? "textarea-error" : ""
              }`}
            />
            <label className="label">
              <span className="label-text-alt text-error">
                {getFieldError("metadata")}
              </span>
              <span className="label-text-alt">Valid JSON format required</span>
            </label>
          </div>

          {/* Preview */}
          <div className="card bg-base-300 shadow-sm">
            <div className="card-body p-4">
              <h3 className="card-title text-lg">Preview</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Source:</span>
                  <span className="badge badge-outline">
                    {sources.find((s) => s.value === formData.source)?.icon}{" "}
                    {sources.find((s) => s.value === formData.source)?.label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Priority:</span>
                  <span
                    className={`badge ${
                      priorities.find((p) => p.value === formData.priority)
                        ?.color
                    }`}
                  >
                    {
                      priorities.find((p) => p.value === formData.priority)
                        ?.icon
                    }{" "}
                    {
                      priorities.find((p) => p.value === formData.priority)
                        ?.label
                    }
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Category:</span>
                  <span className="badge badge-outline">
                    {
                      categories.find((c) => c.value === formData.category)
                        ?.icon
                    }{" "}
                    {
                      categories.find((c) => c.value === formData.category)
                        ?.label
                    }
                  </span>
                </div>
                {formData.tags && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Tags:</span>
                    <div className="flex flex-wrap gap-1">
                      {formData.tags.split(",").map((tag, index) => (
                        <span
                          key={index}
                          className="badge badge-sm badge-ghost"
                        >
                          {tag.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="card-actions justify-end gap-2">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="btn btn-ghost"
                disabled={isSubmitting}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={
                isSubmitting ||
                !formData.content.trim() ||
                !formData.title.trim() ||
                Object.keys(errors).some((key) => errors[key])
              }
            >
              {isSubmitting ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Submitting...
                </>
              ) : (
                <>
                  <span className="text-lg">📤</span>
                  Submit Feedback
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
