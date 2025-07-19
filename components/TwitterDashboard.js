"use client";

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import TweetCard from './TweetCard.js';

const TwitterDashboard = ({ user }) => {
  const [tweets, setTweets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('created_at');
  const [ascending, setAscending] = useState(false);

  const fetchTweets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/twitter/feedback?sortBy=${sortBy}&ascending=${ascending}`);
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch tweets');
      }
      setTweets(data.data);
    } catch (err) {
      setError(err.message);
      toast.error(`Error fetching tweets: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [sortBy, ascending]);

  useEffect(() => {
    fetchTweets();
  }, [fetchTweets]);

  const handleSync = async () => {
    setSyncing(true);
    toast.loading('Syncing with Twitter...');
    try {
      const response = await fetch('/api/sync/twitter', { method: 'POST' });
      const data = await response.json();
      toast.dismiss();

      if (!data.success) {
        throw new Error(data.error || 'Sync failed');
      }
      toast.success(`Sync complete! Found ${data.processed} new tweets.`);
      await fetchTweets();
    } catch (err) {
      toast.dismiss();
      toast.error(`Sync failed: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleSortChange = (newSortBy) => {
    if (newSortBy === sortBy) {
      setAscending(!ascending);
    } else {
      setSortBy(newSortBy);
      setAscending(false);
    }
  };
  
  if (loading) {
    return (
      <div className="text-center p-8">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 p-4 bg-base-200 rounded-lg">
        <div className="flex items-center gap-2">
            <span className="font-semibold">Sort by:</span>
            <button className={`btn btn-sm ${sortBy === 'created_at' ? 'btn-active' : ''}`} onClick={() => handleSortChange('created_at')}>Date</button>
            <button className={`btn btn-sm ${sortBy === 'metadata->>likes' ? 'btn-active' : ''}`} onClick={() => handleSortChange('metadata->>likes')}>Likes</button>
            <button className={`btn btn-sm ${sortBy === 'metadata->>followers' ? 'btn-active' : ''}`} onClick={() => handleSortChange('metadata->>followers')}>Followers</button>
        </div>
        <button className={`btn btn-primary ${syncing ? 'loading' : ''}`} onClick={handleSync} disabled={syncing}>
          {syncing ? 'Syncing...' : 'Sync Now'}
        </button>
      </div>

      {tweets.length === 0 ? (
        <div className="text-center p-12 bg-base-200 rounded-lg">
          <h3 className="text-xl font-semibold">No tweets found</h3>
          <p className="text-base-content/70 mt-2">Try syncing with Twitter or check your keywords in the Integrations settings.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tweets.map((tweet) => (
            <TweetCard key={tweet.id} tweet={tweet} />
          ))}
        </div>
      )}
    </div>
  );
};

export default TwitterDashboard;
