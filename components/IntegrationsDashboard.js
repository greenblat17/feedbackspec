'use client';

import GmailSetup from './integrations/GmailSetup.js';
import TwitterSetup from './integrations/TwitterSetup.js';

export default function IntegrationsDashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Integrations
        </h1>
        <p className="text-gray-600">
          Connect your platforms to automatically collect feedback
        </p>
      </div>

      {/* Grid контейнер для интеграций */}
      <div className="grid grid-cols-1 gap-6">
        {/* Gmail Integration */}
        <GmailSetup />
        
        {/* Twitter Integration */}
        <TwitterSetup />
      </div>

      {/* Coming Soon Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-blue-900 mb-2">
            Coming Soon
          </h2>
          <p className="text-blue-700">
            More integrations will be available soon to help you collect feedback from everywhere
          </p>
        </div>
        
        {/* Grid с иконками предстоящих интеграций */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Discord */}
          <div className="p-4 bg-white border border-blue-200 rounded-lg text-center">
            <div className="text-3xl mb-2">💬</div>
            <h3 className="font-medium text-gray-900 mb-1">Discord</h3>
            <p className="text-sm text-gray-500 mb-2">Monitor servers and channels</p>
            <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded">
              Coming Soon
            </span>
          </div>

          {/* Reddit */}
          <div className="p-4 bg-white border border-blue-200 rounded-lg text-center">
            <div className="text-3xl mb-2">📱</div>
            <h3 className="font-medium text-gray-900 mb-1">Reddit</h3>
            <p className="text-sm text-gray-500 mb-2">Track subreddit discussions</p>
            <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded">
              Coming Soon
            </span>
          </div>

          {/* Product Hunt */}
          <div className="p-4 bg-white border border-blue-200 rounded-lg text-center">
            <div className="text-3xl mb-2">🚀</div>
            <h3 className="font-medium text-gray-900 mb-1">Product Hunt</h3>
            <p className="text-sm text-gray-500 mb-2">Collect launch feedback</p>
            <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded">
              Coming Soon
            </span>
          </div>

          {/* Slack */}
          <div className="p-4 bg-white border border-blue-200 rounded-lg text-center">
            <div className="text-3xl mb-2">🔗</div>
            <h3 className="font-medium text-gray-900 mb-1">Slack</h3>
            <p className="text-sm text-gray-500 mb-2">Monitor workspace channels</p>
            <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded">
              Coming Soon
            </span>
          </div>
        </div>
      </div>

      {/* Help Section */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              How Integrations Work
            </h3>
            <div className="text-gray-700 space-y-2">
              <p><strong>1. Connect:</strong> Authenticate with your platforms</p>
              <p><strong>2. Configure:</strong> Set up keywords and monitoring parameters</p>
              <p><strong>3. Sync:</strong> Automatically collect feedback from all sources</p>
              <p><strong>4. Analyze:</strong> View all feedback in one unified dashboard</p>
              <p className="text-sm italic text-gray-600 mt-3">
                All data is securely stored and processed to help you understand your users better.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}