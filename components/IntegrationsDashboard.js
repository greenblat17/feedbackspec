'use client';

import { useState, useEffect } from 'react';
import { createClient } from '../libs/supabase/client.js';
import GmailSetup from './integrations/GmailSetup.js';
import TwitterSetup from './integrations/TwitterSetup.js';

export default function IntegrationsDashboard() {
  const [activeTab, setActiveTab] = useState('gmail');
  const [integrationStats, setIntegrationStats] = useState({
    gmail: { connected: false, lastSync: null, feedbackCount: 0 },
    twitter: { connected: false, lastSync: null, feedbackCount: 0 }
  });
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    fetchIntegrationStats();
  }, []);

  const fetchIntegrationStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get integrations status
      const { data: integrations } = await supabase
        .from('integrations')
        .select('platform, status, last_sync')
        .eq('user_id', user.id);

      // Get feedback counts per platform
      const { data: gmailFeedback } = await supabase
        .from('raw_feedback')
        .select('id')
        .eq('user_id', user.id)
        .eq('platform', 'gmail');

      const { data: twitterFeedback } = await supabase
        .from('raw_feedback')
        .select('id')
        .eq('user_id', user.id)
        .eq('platform', 'twitter');

      const gmailIntegration = integrations?.find(i => i.platform === 'gmail');
      const twitterIntegration = integrations?.find(i => i.platform === 'twitter');

      setIntegrationStats({
        gmail: {
          connected: gmailIntegration?.status === 'connected',
          lastSync: gmailIntegration?.last_sync,
          feedbackCount: gmailFeedback?.length || 0
        },
        twitter: {
          connected: twitterIntegration?.status === 'connected',
          lastSync: twitterIntegration?.last_sync,
          feedbackCount: twitterFeedback?.length || 0
        }
      });
    } catch (error) {
      console.error('Error fetching integration stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { 
      id: 'gmail', 
      label: 'Gmail', 
      icon: '📧',
      status: integrationStats.gmail.connected ? 'connected' : 'disconnected',
      description: 'Connect Gmail to collect feedback from emails'
    },
    { 
      id: 'twitter', 
      label: 'Twitter', 
      icon: '🐦',
      status: integrationStats.twitter.connected ? 'connected' : 'disconnected',
      description: 'Monitor Twitter for mentions and feedback'
    },
    { 
      id: 'coming-soon', 
      label: 'More Integrations', 
      icon: '🚀',
      status: 'coming-soon',
      description: 'Discover upcoming integrations'
    }
  ];

  const comingSoonIntegrations = [
    {
      name: 'Discord',
      icon: '💬',
      description: 'Monitor servers and channels for feedback',
      category: 'Communication',
      features: ['Server monitoring', 'Channel tracking', 'User mentions']
    },
    {
      name: 'Reddit',
      icon: '📱',
      description: 'Track subreddit discussions and comments',
      category: 'Social Media',
      features: ['Subreddit monitoring', 'Post tracking', 'Comment analysis']
    },
    {
      name: 'Product Hunt',
      icon: '🚀',
      description: 'Collect feedback from product launches',
      category: 'Product Discovery',
      features: ['Launch tracking', 'Comment monitoring', 'Vote analysis']
    },
    {
      name: 'Slack',
      icon: '🔗',
      description: 'Monitor workspace channels and DMs',
      category: 'Communication',
      features: ['Channel monitoring', 'Direct messages', 'Thread tracking']
    },
    {
      name: 'GitHub',
      icon: '🐙',
      description: 'Track issues, PRs, and discussions',
      category: 'Development',
      features: ['Issue tracking', 'PR comments', 'Discussion monitoring']
    },
    {
      name: 'Zendesk',
      icon: '🎫',
      description: 'Import support tickets and responses',
      category: 'Customer Support',
      features: ['Ticket import', 'Response tracking', 'Satisfaction scores']
    }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'connected':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'disconnected':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      case 'coming-soon':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'connected':
        return '✅';
      case 'disconnected':
        return '⚪';
      case 'coming-soon':
        return '🚧';
      default:
        return '⚪';
    }
  };

  const totalConnected = Object.values(integrationStats).filter(stat => stat.connected).length;
  const totalSynced = Object.values(integrationStats).reduce((sum, stat) => sum + stat.feedbackCount, 0);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header with Overview Stats */}
      <div>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Integrations
            </h1>
            <p className="text-lg text-gray-600">
              Connect your platforms to automatically collect and analyze feedback
            </p>
          </div>
          
          {!loading && (
            <div className="flex gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{totalConnected}</div>
                <div className="text-sm text-gray-500">Connected</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{totalSynced}</div>
                <div className="text-sm text-gray-500">Items Synced</div>
              </div>
            </div>
          )}
        </div>

        {/* Integration Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-xl shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Gmail Integration</p>
                <p className="text-2xl font-bold">
                  {loading ? '...' : integrationStats.gmail.connected ? 'Connected' : 'Not Connected'}
                </p>
                <p className="text-blue-200 text-sm mt-1">
                  {integrationStats.gmail.feedbackCount} emails synced
                </p>
              </div>
              <div className="text-4xl opacity-80">📧</div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-cyan-500 to-cyan-600 text-white p-6 rounded-xl shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-cyan-100 text-sm">Twitter Integration</p>
                <p className="text-2xl font-bold">
                  {loading ? '...' : integrationStats.twitter.connected ? 'Connected' : 'Not Connected'}
                </p>
                <p className="text-cyan-200 text-sm mt-1">
                  {integrationStats.twitter.feedbackCount} tweets synced
                </p>
              </div>
              <div className="text-4xl opacity-80">🐦</div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-xl shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Total Feedback</p>
                <p className="text-3xl font-bold">{loading ? '...' : totalSynced}</p>
                <p className="text-purple-200 text-sm mt-1">
                  From all sources
                </p>
              </div>
              <div className="text-4xl opacity-80">📊</div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Tab Navigation */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <nav className="flex space-x-0 overflow-x-auto">
          {tabs.map((tab, index) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-0 py-4 px-6 text-center transition-all duration-200 relative ${
                activeTab === tab.id
                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              } ${index === 0 ? 'rounded-tl-xl' : ''} ${index === tabs.length - 1 ? 'rounded-tr-xl' : ''}`}
            >
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{tab.icon}</span>
                  <span className="font-medium">{tab.label}</span>
                  {tab.status !== 'coming-soon' && (
                    <span className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(tab.status)}`}>
                      {getStatusIcon(tab.status)} {tab.status === 'connected' ? 'Connected' : 'Setup Required'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 hidden sm:block">{tab.description}</p>
              </div>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[500px]">
        {activeTab === 'gmail' && (
          <div className="space-y-6">
            {/* Gmail Integration Header */}
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="text-4xl">📧</div>
                <div>
                  <h2 className="text-2xl font-bold text-blue-900">Gmail Integration</h2>
                  <p className="text-blue-700">Connect your Gmail account to automatically collect feedback from emails</p>
                </div>
                <div className="ml-auto">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    integrationStats.gmail.connected 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {integrationStats.gmail.connected ? '✅ Connected' : '⚪ Not Connected'}
                  </span>
                </div>
              </div>
              
              {integrationStats.gmail.connected && (
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="bg-white/50 rounded-lg p-3">
                    <div className="text-sm text-blue-600">Emails Synced</div>
                    <div className="text-xl font-bold text-blue-900">{integrationStats.gmail.feedbackCount}</div>
                  </div>
                  <div className="bg-white/50 rounded-lg p-3">
                    <div className="text-sm text-blue-600">Last Sync</div>
                    <div className="text-sm font-medium text-blue-900">
                      {integrationStats.gmail.lastSync 
                        ? new Date(integrationStats.gmail.lastSync).toLocaleDateString()
                        : 'Never'
                      }
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Gmail Setup Component */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
              <GmailSetup />
            </div>

            {/* Gmail Integration Tips */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
              <div className="flex items-start gap-3">
                <span className="text-2xl">💡</span>
                <div>
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">
                    Gmail Integration Tips
                  </h3>
                  <div className="text-blue-800 space-y-2">
                    <p><strong>📧 Email Filtering:</strong> Use keywords like "feedback", "bug", "feature request" to capture relevant emails</p>
                    <p><strong>🔒 Security:</strong> Your Gmail access is secure - we only read emails, never send or modify them</p>
                    <p><strong>⏱️ Sync Schedule:</strong> Emails are checked regularly for new feedback automatically</p>
                    <p><strong>🎯 Accuracy:</strong> Review and refine your keywords to improve feedback detection</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'twitter' && (
          <div className="space-y-6">
            {/* Twitter Integration Header */}
            <div className="bg-gradient-to-r from-cyan-50 to-cyan-100 border border-cyan-200 rounded-xl p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="text-4xl">🐦</div>
                <div>
                  <h2 className="text-2xl font-bold text-cyan-900">Twitter Integration</h2>
                  <p className="text-cyan-700">Monitor Twitter for mentions, feedback, and discussions about your product</p>
                </div>
                <div className="ml-auto">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    integrationStats.twitter.connected 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {integrationStats.twitter.connected ? '✅ Connected' : '⚪ Setup Required'}
                  </span>
                </div>
              </div>
              
              {integrationStats.twitter.connected && (
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="bg-white/50 rounded-lg p-3">
                    <div className="text-sm text-cyan-600">Tweets Collected</div>
                    <div className="text-xl font-bold text-cyan-900">{integrationStats.twitter.feedbackCount}</div>
                  </div>
                  <div className="bg-white/50 rounded-lg p-3">
                    <div className="text-sm text-cyan-600">Last Sync</div>
                    <div className="text-sm font-medium text-cyan-900">
                      {integrationStats.twitter.lastSync 
                        ? new Date(integrationStats.twitter.lastSync).toLocaleDateString()
                        : 'Never'
                      }
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Twitter Setup Component */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
              <TwitterSetup />
            </div>

            {/* Twitter Integration Tips */}
            <div className="bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 rounded-xl p-6">
              <div className="flex items-start gap-3">
                <span className="text-2xl">💡</span>
                <div>
                  <h3 className="text-lg font-semibold text-cyan-900 mb-2">
                    Twitter Integration Tips
                  </h3>
                  <div className="text-cyan-800 space-y-2">
                    <p><strong>🎯 Smart Keywords:</strong> Include your product name, brand handles, and common feedback terms</p>
                    <p><strong>📊 Engagement Metrics:</strong> Track likes, retweets, and replies to gauge feedback importance</p>
                    <p><strong>⚡ Rate Limits:</strong> Twitter API has limits - sync regularly but not too frequently</p>
                    <p><strong>🌍 Public Content:</strong> Only public tweets are collected - private accounts are not accessed</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'coming-soon' && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                Coming Soon
              </h3>
              <p className="text-gray-600">
                We're working on these exciting integrations to help you collect feedback from everywhere
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {comingSoonIntegrations.map((integration, index) => (
                <div
                  key={integration.name}
                  className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-200 relative overflow-hidden"
                >
                  {/* Coming Soon Badge */}
                  <div className="absolute top-4 right-4">
                    <span className="bg-gradient-to-r from-orange-400 to-orange-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                      Coming Soon
                    </span>
                  </div>

                  <div className="flex items-start gap-4 mb-4">
                    <div className="text-4xl">{integration.icon}</div>
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-gray-900">{integration.name}</h4>
                      <span className="text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                        {integration.category}
                      </span>
                    </div>
                  </div>

                  <p className="text-gray-600 mb-4">{integration.description}</p>

                  <div className="space-y-2">
                    <h5 className="text-sm font-medium text-gray-900">Features:</h5>
                    <div className="flex flex-wrap gap-1">
                      {integration.features.map((feature, featureIndex) => (
                        <span
                          key={featureIndex}
                          className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Progress indicator */}
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Development Progress</span>
                      <span className="text-gray-600">{Math.floor(Math.random() * 40) + 20}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div 
                        className="bg-gradient-to-r from-blue-400 to-blue-500 h-2 rounded-full"
                        style={{ width: `${Math.floor(Math.random() * 40) + 20}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Newsletter Signup */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-8 text-center">
              <h3 className="text-xl font-semibold text-purple-900 mb-2">
                🔔 Get Notified
              </h3>
              <p className="text-purple-700 mb-4">
                Be the first to know when new integrations are available
              </p>
              <div className="flex max-w-md mx-auto gap-2">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 px-4 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <button className="bg-purple-500 text-white px-6 py-2 rounded-lg hover:bg-purple-600 transition-colors">
                  Notify Me
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-xl p-8 text-center">
        <h3 className="text-2xl font-bold mb-2">
          Need a Custom Integration?
        </h3>
        <p className="text-gray-300 mb-4">
          We can help you connect any platform to collect feedback from your unique workflow
        </p>
        <button className="bg-white text-gray-900 px-6 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors">
          Contact Us
        </button>
      </div>
    </div>
  );
}