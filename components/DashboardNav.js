"use client";

import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/libs/supabase/client";
import { useState } from "react";

export default function DashboardNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const supabase = createClient();

  const navItems = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: "🏠",
      description: "Overview and stats",
    },
    {
      name: "Feedback",
      href: "/dashboard/feedback",
      icon: "📝",
      description: "Add and manage feedback",
    },
    {
      name: "Analytics",
      href: "/dashboard/analytics",
      icon: "📊",
      description: "View detailed analytics",
    },
    {
      name: "Integrations",
      href: "/dashboard/integrations",
      icon: "🔗",
      description: "Manage data sources",
    },
    {
      name: "Specs",
      href: "/dashboard/specs",
      icon: "📋",
      description: "Generated specifications",
    },
    {
      name: "Settings",
      href: "/dashboard/settings",
      icon: "⚙️",
      description: "Account & preferences",
    },
  ];

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="btn btn-square btn-ghost bg-base-200"
        >
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
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      </div>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Navigation Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full w-64 bg-base-200 shadow-lg transform transition-transform duration-300 ease-in-out z-50 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 lg:static lg:shadow-none`}
      >
        <div className="p-6 border-b border-base-300">
          <div className="flex items-center gap-3">
            <div className="text-2xl">📊</div>
            <div>
              <h2 className="text-xl font-bold">FeedbackSpec</h2>
              <p className="text-sm text-base-content/70">Dashboard</p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-4">
          <div className="space-y-2">
            {navItems.map((item) => (
              <button
                key={item.name}
                onClick={() => {
                  router.push(item.href);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  pathname === item.href
                    ? "bg-primary text-primary-content"
                    : "hover:bg-base-300"
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <div className="flex-1">
                  <div className="font-medium">{item.name}</div>
                  <div className="text-xs opacity-70">{item.description}</div>
                </div>
              </button>
            ))}
          </div>
        </nav>

        {/* User Section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-base-300">
          <div className="space-y-2">
            <button
              onClick={() => router.push("/dashboard/profile")}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-base-300"
            >
              <span className="text-lg">👤</span>
              <div className="flex-1">
                <div className="font-medium">Profile</div>
                <div className="text-xs opacity-70">Account details</div>
              </div>
            </button>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-base-300 text-error"
            >
              <span className="text-lg">🚪</span>
              <div className="flex-1">
                <div className="font-medium">Sign Out</div>
                <div className="text-xs opacity-70">Leave dashboard</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
