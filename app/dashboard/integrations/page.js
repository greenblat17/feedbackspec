"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import IntegrationsDashboard from "../../../components/IntegrationsDashboard.js";

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

      {/* Use the IntegrationsDashboard component */}
      <IntegrationsDashboard />
    </div>
  );
}