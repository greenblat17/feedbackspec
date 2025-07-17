import ButtonAccount from "@/components/ButtonAccount";
import UserProfile from "@/components/UserProfile";
import config from "@/config";

export const dynamic = "force-dynamic";

// This is a private page: It's protected by the layout.js component which ensures the user is authenticated.
// It's a server compoment which means you can fetch data (like the user profile) before the page is rendered.
// See https://shipfa.st/docs/tutorials/private-page
export default async function Dashboard() {
  return (
    <main className="min-h-screen p-8 pb-24">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-extrabold mb-2">
            {config.appName} Dashboard
          </h1>
          <p className="text-base-content/70">
            Welcome to your private dashboard! Your authentication is working
            perfectly.
          </p>
        </div>

        {/* Dashboard Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* User Profile Section */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Your Profile</h2>
            <UserProfile />
          </div>

          {/* Quick Actions Section */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Quick Actions</h2>

            <div className="card bg-base-200 shadow-xl">
              <div className="card-body">
                <h3 className="card-title">Account Settings</h3>
                <p className="text-base-content/70 mb-4">
                  Manage your account settings and preferences.
                </p>
                <div className="card-actions">
                  <ButtonAccount />
                </div>
              </div>
            </div>

            <div className="card bg-base-200 shadow-xl">
              <div className="card-body">
                <h3 className="card-title">Getting Started</h3>
                <p className="text-base-content/70 mb-4">
                  Your Supabase authentication is working! Here&apos;s what you
                  can do next:
                </p>
                <ul className="list-disc list-inside space-y-2 text-sm text-base-content/70">
                  <li>Set up your database tables</li>
                  <li>Configure row-level security</li>
                  <li>Add user profiles and preferences</li>
                  <li>Implement real-time features</li>
                </ul>
              </div>
            </div>

            <div className="card bg-base-200 shadow-xl">
              <div className="card-body">
                <h3 className="card-title">Resources</h3>
                <div className="space-y-2">
                  <a
                    href="https://supabase.com/docs"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-outline btn-sm w-full"
                  >
                    Supabase Documentation
                  </a>
                  <a
                    href="https://github.com/supabase/supabase"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-outline btn-sm w-full"
                  >
                    Supabase GitHub
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
