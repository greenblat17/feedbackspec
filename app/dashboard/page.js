"use client";

import ButtonAccount from "@/components/ButtonAccount";
import UserProfile from "@/components/UserProfile";
import config from "@/config";
import { createClient } from "@/libs/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export const dynamic = "force-dynamic";

// Mock data for demo - replace with real data fetching
const mockStats = {
  totalFeedback: 1247,
  processedThisMonth: 89,
  integrations: 3,
  specsGenerated: 24,
};

const mockRecentFeedback = [
  {
    id: 1,
    source: "Twitter",
    content:
      "The mobile app crashes when trying to upload images. Really frustrating!",
    priority: "high",
    category: "bug",
    timestamp: "2024-01-15T10:30:00Z",
    processed: true,
  },
  {
    id: 2,
    source: "Email",
    content:
      "Love the new dashboard but would be great to have dark mode option",
    priority: "medium",
    category: "feature",
    timestamp: "2024-01-15T09:15:00Z",
    processed: true,
  },
  {
    id: 3,
    source: "Discord",
    content: "Export functionality is missing from the analytics page",
    priority: "medium",
    category: "feature",
    timestamp: "2024-01-15T08:45:00Z",
    processed: false,
  },
  {
    id: 4,
    source: "Twitter",
    content:
      "The search function doesn't work properly with special characters",
    priority: "high",
    category: "bug",
    timestamp: "2024-01-14T16:20:00Z",
    processed: true,
  },
];

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
      default:
        return "💭";
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
    <div className="p-6 space-y-8 lg:pl-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">Welcome back! 👋</h1>
            <p className="text-base-content/70 mt-2">
              Here&apos;s what&apos;s happening with your feedback today
            </p>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-primary">
              <span className="text-lg">📊</span>
              View Analytics
            </button>
            <button className="btn btn-outline">
              <span className="text-lg">⚙️</span>
              Settings
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-xl">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Total Feedback</p>
                  <p className="text-3xl font-bold">
                    {mockStats.totalFeedback.toLocaleString()}
                  </p>
                </div>
                <div className="text-4xl opacity-80">💬</div>
              </div>
            </div>
          </div>

          <div className="card bg-gradient-to-r from-green-500 to-green-600 text-white shadow-xl">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Processed This Month</p>
                  <p className="text-3xl font-bold">
                    {mockStats.processedThisMonth}
                  </p>
                </div>
                <div className="text-4xl opacity-80">✅</div>
              </div>
            </div>
          </div>

          <div className="card bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-xl">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Active Integrations</p>
                  <p className="text-3xl font-bold">{mockStats.integrations}</p>
                </div>
                <div className="text-4xl opacity-80">🔗</div>
              </div>
            </div>
          </div>

          <div className="card bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-xl">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm">Specs Generated</p>
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
          {/* Recent Feedback */}
          <div className="lg:col-span-2">
            <div className="card bg-base-200 shadow-xl">
              <div className="card-body">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="card-title text-xl">Recent Feedback</h2>
                  <button className="btn btn-sm btn-outline">View All</button>
                </div>

                <div className="space-y-4">
                  {mockRecentFeedback.map((feedback) => (
                    <div
                      key={feedback.id}
                      className="border border-base-300 rounded-lg p-4 hover:bg-base-300/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-medium">
                              {feedback.source}
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
                          <p className="text-sm text-base-content/80 mb-2">
                            {feedback.content}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-base-content/60">
                            <span>
                              {new Date(
                                feedback.timestamp
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
                        </div>
                        <button className="btn btn-xs btn-ghost">
                          <span className="text-sm">📝</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="card bg-base-200 shadow-xl">
              <div className="card-body">
                <h3 className="card-title text-lg">Quick Actions</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => router.push("/dashboard/feedback")}
                    className="btn btn-primary btn-sm w-full"
                  >
                    <span className="text-lg">📝</span>
                    Add Feedback
                  </button>
                  <button
                    onClick={() => router.push("/dashboard/feedback")}
                    className="btn btn-outline btn-sm w-full"
                  >
                    <span className="text-lg">💬</span>
                    Manage Feedback
                  </button>
                  <button
                    onClick={() => router.push("/dashboard/specs")}
                    className="btn btn-outline btn-sm w-full"
                  >
                    <span className="text-lg">🎯</span>
                    Generate Spec
                  </button>
                  <button className="btn btn-outline btn-sm w-full">
                    <span className="text-lg">📊</span>
                    View Analytics
                  </button>
                  <button className="btn btn-outline btn-sm w-full">
                    <span className="text-lg">📤</span>
                    Export Data
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
                <button className="btn btn-sm btn-outline w-full mt-3">
                  <span className="text-lg">➕</span>
                  Add Integration
                </button>
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
                      <div className="font-medium text-sm">{user?.email}</div>
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

        {/* Bottom Section - Recent Activity */}
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body">
            <h3 className="card-title text-lg">Recent Activity</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-3 bg-base-300/50 rounded">
                <div className="text-2xl">📊</div>
                <div>
                  <div className="font-medium text-sm">New spec generated</div>
                  <div className="text-xs text-base-content/60">
                    2 hours ago
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-base-300/50 rounded">
                <div className="text-2xl">🔗</div>
                <div>
                  <div className="font-medium text-sm">
                    Discord integration synced
                  </div>
                  <div className="text-xs text-base-content/60">
                    4 hours ago
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-base-300/50 rounded">
                <div className="text-2xl">📈</div>
                <div>
                  <div className="font-medium text-sm">Analytics updated</div>
                  <div className="text-xs text-base-content/60">
                    6 hours ago
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
