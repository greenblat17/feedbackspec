import { redirect } from "next/navigation";
import { createClient } from "@/libs/supabase/server";
import DashboardNav from "@/components/DashboardNav";
import config from "@/config";

// This is a server-side component to ensure the user is logged in.
// If not, it will redirect to the login page.
// It's applied to all subpages of /dashboard in /app/dashboard/*** pages
export default async function LayoutPrivate({ children }) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(config.auth.loginUrl);
  }

  return (
    <div className="flex h-screen bg-base-100">
      {/* Navigation Sidebar */}
      <DashboardNav />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:ml-0 overflow-hidden">
        {/* Content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
