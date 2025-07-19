"use client";

import { useState, useEffect } from "react";
import { createClient } from "../../../libs/supabase/client.js";
import { useRouter } from "next/navigation";
import TwitterDashboard from "../../../components/TwitterDashboard.js";

export default function TwitterPage() {
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
  }, [router, supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg"></div>
          <p className="mt-4 text-base-content/70">Loading Twitter Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:pl-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">Twitter Feedback</h1>
            <p className="text-base-content/70 mt-2">
              View and manage tweets synced from your Twitter integration.
            </p>
          </div>
        </div>
        
        <TwitterDashboard user={user} />
      </div>
    </div>
  );
}
