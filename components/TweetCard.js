import React from 'react';

const TweetCard = ({ tweet }) => {
  const { content, metadata, created_at } = tweet;

  const author = metadata?.author || 'unknown';
  const authorId = metadata?.author_id || '';
  const followers = metadata?.followers || 0;
  const likes = metadata?.likes || 0;
  const retweets = metadata?.retweets || 0;
  const tweetUrl = `https://twitter.com/${author}/status/${tweet.source_id}`;

  return (
    <div className="card bg-base-200 shadow-md hover:shadow-xl transition-shadow duration-200">
      <div className="card-body">
        <div className="flex items-start justify-between">
          <div>
            <a href={`https://twitter.com/${author}`} target="_blank" rel="noopener noreferrer" className="font-bold link link-hover">
              @{author}
            </a>
            <p className="text-xs text-base-content/70">{followers.toLocaleString()} followers</p>
          </div>
          <a href={tweetUrl} target="_blank" rel="noopener noreferrer" className="text-xs link link-hover">
            {new Date(created_at).toLocaleDateString()}
          </a>
        </div>
        <p className="my-4 text-base-content/90">{content}</p>
        <div className="card-actions justify-end items-center">
          <div className="flex items-center gap-4 text-sm">
            <span>❤️ {likes}</span>
            <span>🔁 {retweets}</span>
          </div>
          <button className="btn btn-sm btn-primary">Create Feedback</button>
        </div>
      </div>
    </div>
  );
};

export default TweetCard;
