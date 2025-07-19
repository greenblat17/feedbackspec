"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import GmailSetup from "../../../components/integrations/GmailSetup.js";

export default function IntegrationsPage() {
  const searchParams = useSearchParams();
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    
    if (success === 'gmail_connected') {
      setNotification({ type: 'success', message: 'Gmail connected successfully!' });
    } else if (error === 'gmail_auth_failed') {
      setNotification({ type: 'error', message: 'Gmail connection failed. Please try again.' });
    } else if (error === 'oauth_not_configured') {
      setNotification({ 
        type: 'error', 
        message: 'Google OAuth not configured. Please set up GMAIL_INTEGRATION_CLIENT_ID and GMAIL_INTEGRATION_CLIENT_SECRET in your environment variables.' 
      });
    }
    
    // Clear notification after 5 seconds
    if (success || error) {
      setTimeout(() => setNotification(null), 5000);
    }
  }, [searchParams]);
  return (
    <div className="p-6">
      {/* Notification */}
      {notification && (
        <div className={`mb-6 p-4 rounded-lg border ${
          notification.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-700' 
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          <div className="flex items-center">
            <span className="mr-2">
              {notification.type === 'success' ? '✅' : '❌'}
            </span>
            {notification.message}
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Integrations
        </h1>
        <p className="text-gray-600">
          Connect external services to automatically collect feedback
        </p>
      </div>

      {/* Integration Cards */}
      <div className="space-y-6">
        {/* Gmail Integration */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6 border-b">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">📧</span>
              <h2 className="text-xl font-semibold text-gray-900">
                Email Integrations
              </h2>
            </div>
            <p className="text-gray-600">
              Connect Gmail to automatically collect feedback from emails
            </p>
          </div>
          <div className="p-6">
            <GmailSetup />
          </div>
        </div>

        {/* Future Integrations Preview */}
        <div className="bg-white rounded-lg shadow-md opacity-60">
          <div className="p-6 border-b">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">🔮</span>
              <h2 className="text-xl font-semibold text-gray-900">
                Coming Soon
              </h2>
            </div>
            <p className="text-gray-600">
              More integrations will be available soon
            </p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Slack */}
              <div className="p-4 border border-gray-200 rounded-lg text-center">
                <div className="text-2xl mb-2">💬</div>
                <h3 className="font-medium text-gray-900 mb-1">Slack</h3>
                <p className="text-sm text-gray-500">Collect feedback from channels</p>
                <div className="mt-2">
                  <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                    Coming Soon
                  </span>
                </div>
              </div>

              {/* Discord */}
              <div className="p-4 border border-gray-200 rounded-lg text-center">
                <div className="text-2xl mb-2">🎮</div>
                <h3 className="font-medium text-gray-900 mb-1">Discord</h3>
                <p className="text-sm text-gray-500">Monitor servers</p>
                <div className="mt-2">
                  <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                    Coming Soon
                  </span>
                </div>
              </div>

              {/* Telegram */}
              <div className="p-4 border border-gray-200 rounded-lg text-center">
                <div className="text-2xl mb-2">✈️</div>
                <h3 className="font-medium text-gray-900 mb-1">Telegram</h3>
                <p className="text-sm text-gray-500">Bots and channels</p>
                <div className="mt-2">
                  <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                    Coming Soon
                  </span>
                </div>
              </div>

              {/* Jira */}
              <div className="p-4 border border-gray-200 rounded-lg text-center">
                <div className="text-2xl mb-2">🎯</div>
                <h3 className="font-medium text-gray-900 mb-1">Jira</h3>
                <p className="text-sm text-gray-500">Tickets and bugs</p>
                <div className="mt-2">
                  <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                    Coming Soon
                  </span>
                </div>
              </div>

              {/* GitHub */}
              <div className="p-4 border border-gray-200 rounded-lg text-center">
                <div className="text-2xl mb-2">🐙</div>
                <h3 className="font-medium text-gray-900 mb-1">GitHub</h3>
                <p className="text-sm text-gray-500">Issues and PRs</p>
                <div className="mt-2">
                  <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                    Coming Soon
                  </span>
                </div>
              </div>

              {/* Zendesk */}
              <div className="p-4 border border-gray-200 rounded-lg text-center">
                <div className="text-2xl mb-2">🎫</div>
                <h3 className="font-medium text-gray-900 mb-1">Zendesk</h3>
                <p className="text-sm text-gray-500">Support tickets</p>
                <div className="mt-2">
                  <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                    Coming Soon
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Help Section */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <div>
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              How to test Gmail integration
            </h3>
            <div className="text-blue-700 space-y-2">
              <p><strong>1.</strong> Click "Connect Gmail" above</p>
              <p><strong>2.</strong> Sign in with your Gmail account</p>
              <p><strong>3.</strong> Grant permission to read your emails</p>
              <p><strong>4.</strong> Configure search keywords</p>
              <p><strong>5.</strong> Click "Sync" to synchronize emails</p>
              <p><strong>6.</strong> Check raw_feedback table in Supabase</p>
              <p className="text-sm italic">Note: Each user connects their own Gmail account - no global setup needed!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}