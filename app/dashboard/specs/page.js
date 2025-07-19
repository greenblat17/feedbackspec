"use client";

import { createClient } from "../../../libs/supabase/client.js";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import SpecGenerator from "../../../components/SpecGenerator.js";

export const dynamic = "force-dynamic";

export default function SpecsPage() {
  const supabase = createClient();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/signin");
        return;
      }

      setUser(user);
      setLoading(false);
    };

    getUser();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg"></div>
          <p className="mt-4 text-base-content/70">Loading spec generator...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 lg:pl-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">
              Specification Generator
            </h1>
            <p className="text-base-content/70 mt-2">
              Generate development specifications from your feedback clusters
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push("/dashboard")}
              className="btn btn-outline"
            >
              <span className="text-lg">🏠</span>
              Dashboard
            </button>
            <button
              onClick={() => router.push("/dashboard/feedback")}
              className="btn btn-outline"
            >
              <span className="text-lg">💬</span>
              Feedback
            </button>
          </div>
        </div>

        {/* Spec Generator Component */}
        <SpecGenerator />
      </div>
    </div>
  );
}
