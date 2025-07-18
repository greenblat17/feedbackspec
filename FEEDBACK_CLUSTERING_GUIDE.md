# Feedback Clustering System Guide

## 🎯 Overview

The Feedback Clustering System uses AI to automatically group similar feedback entries based on semantic meaning, not just exact word matches. This system now includes intelligent caching to improve performance and reduce AI API costs.

## ✨ Key Features

### 🧠 **AI-Powered Clustering**

- **Semantic Grouping**: Groups feedback that means the same thing even if worded differently
- **Intelligent Analysis**: Each group gets themes, severity levels, and suggested actions
- **Smart Categorization**: Automatically categorizes feedback by type (bug, feature, etc.)

### 📦 **Intelligent Caching**

- **Performance Optimization**: Stores clustering results for 24 hours
- **Cost Reduction**: Avoids expensive AI calls for repeated requests
- **Smart Invalidation**: Automatically clears cache when feedback changes
- **Cache Management**: UI controls to refresh or clear cache manually

### 🔄 **Real-time Updates**

- **Auto-refresh**: Cache invalidates when feedback is added/updated/deleted
- **Background Processing**: Clustering happens asynchronously
- **Status Indicators**: Shows cache status and cluster freshness

## 🛠️ Technical Implementation

### **Database Schema**

```sql
-- Run FEEDBACK_CLUSTERS_TABLE.sql to create this table
feedback_clusters (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  cluster_data JSONB,           -- Full AI clustering results
  feedback_ids TEXT[],          -- Array of feedback IDs included
  total_feedback_count INTEGER, -- Feedback count when generated
  created_at TIMESTAMP,
  expires_at TIMESTAMP          -- 24-hour expiry
)
```

### **API Endpoints**

#### **GET /api/feedback**

- Returns feedback with cached clusters if available
- Generates new clusters if cache is stale/missing
- Includes cluster cache status in response

#### **GET /api/feedback/clusters**

- Returns cluster cache status and metadata
- Shows current vs cached feedback counts
- Indicates if cache is fresh or stale

#### **POST /api/feedback/clusters**

- Forces regeneration of clusters using AI
- Clears existing cache and creates new one
- Returns newly generated clustering results

#### **DELETE /api/feedback/clusters**

- Clears all cached clusters for user
- Forces fresh generation on next request

### **Caching Logic**

```javascript
// 1. Check for valid cache
const cachedClusters = await getCachedClusters(userId, feedbackCount);

if (cachedClusters && !isExpired(cachedClusters)) {
  return cachedClusters; // Use cache
}

// 2. Generate new clusters
const newClusters = await generateClusters(feedback);

// 3. Cache results
await cacheResults(newClusters, { expiresIn: "24 hours" });
```

## 🎮 User Interface

### **Dashboard Features**

#### **Cluster Cache Status Panel**

```
📦 Cluster Cache Status
Cache: ✅ Active | ⚠️ Stale
Feedback: 15
Expires: 12/15/2024
[🔄 Refresh] [🗑️ Clear]
```

#### **View Mode Switcher**

- **List View**: Traditional feedback list with AI analysis
- **Groups View**: Clustered feedback with themes and actions

#### **Smart Indicators**

- Cache status badges
- Cluster freshness indicators
- AI analysis completion status

## 📊 Clustering Algorithm

### **Input Processing**

```javascript
// Transform feedback for AI analysis
const feedbackData = feedback.map((item) => ({
  id: item.id,
  content: item.content,
  title: item.title,
  category: item.category,
  // ... other metadata
}));
```

### **AI Prompt Structure**

```
System: You are an expert at analyzing user feedback and identifying patterns.
Group similar feedback entries that address the same underlying issues.

User: Analyze and group these feedback entries:
1. "App crashes when I try to upload photos"
2. "The photo upload feature doesn't work"
3. "Uploading images causes the app to freeze"
...

Response Format:
{
  "groups": [
    {
      "theme": "Photo Upload Issues",
      "description": "Users experiencing crashes during photo upload",
      "severity": "high",
      "category": "bug",
      "feedbackIds": [1, 2, 3],
      "commonKeywords": ["upload", "photo", "crash"],
      "suggestedAction": "Fix photo upload stability issues"
    }
  ],
  "summary": {
    "totalGroups": 1,
    "largestGroupSize": 3,
    "mostCommonTheme": "Photo Upload Issues"
  }
}
```

### **Response Processing**

- Validates AI response structure
- Handles malformed JSON gracefully
- Provides fallback structures if needed
- Caches successful results

## 🚀 Usage Examples

### **Basic Usage**

```javascript
// Fetch feedback with clustering
const response = await fetch("/api/feedback");
const { data: feedback, feedbackGroups } = await response.json();

// Display groups
feedbackGroups?.groups?.forEach((group) => {
  console.log(`Theme: ${group.theme}`);
  console.log(`Items: ${group.feedbackIds.length}`);
  console.log(`Action: ${group.suggestedAction}`);
});
```

### **Force Refresh Clusters**

```javascript
// Manually refresh clusters
const response = await fetch("/api/feedback/clusters", {
  method: "POST",
});
const result = await response.json();
console.log(`Generated ${result.data.totalGroups} new groups`);
```

### **Check Cache Status**

```javascript
// Get cache information
const response = await fetch("/api/feedback/clusters");
const { data: cacheInfo } = await response.json();

console.log(`Cache valid: ${cacheInfo.hasValidCache}`);
console.log(`Feedback count: ${cacheInfo.currentFeedbackCount}`);
```

## ⚡ Performance Optimizations

### **Cache Strategy**

- **24-hour expiry**: Balances freshness with performance
- **User-specific**: Each user has their own cache
- **Count-based validation**: Invalidates when feedback count changes
- **Automatic cleanup**: Expired entries are cleaned up automatically

### **AI Cost Optimization**

- **Batch processing**: Groups multiple feedback items in single API call
- **Smart caching**: Avoids redundant AI calls
- **Fallback handling**: Graceful degradation if AI fails

### **Database Indexes**

```sql
-- Performance indexes
CREATE INDEX idx_feedback_clusters_user_id ON feedback_clusters(user_id);
CREATE INDEX idx_feedback_clusters_expires_at ON feedback_clusters(expires_at);
CREATE INDEX idx_feedback_clusters_user_count ON feedback_clusters(user_id, total_feedback_count);
```

## 🔧 Configuration

### **Environment Variables**

```bash
# Required for clustering
OPENAI_API_KEY=your-openai-api-key

# Optional: Customize cache duration (default 24 hours)
CLUSTER_CACHE_HOURS=24
```

### **Supabase Setup**

1. Run `FEEDBACK_CLUSTERS_TABLE.sql` in your Supabase SQL editor
2. Verify Row Level Security policies are active
3. Test table access with your application user

## 📈 Monitoring & Analytics

### **Cache Performance Metrics**

- Cache hit/miss ratios
- AI API call frequency
- Cluster generation time
- Cache storage usage

### **Clustering Quality Metrics**

- Average group size
- Number of ungrouped items
- User feedback on grouping accuracy

### **Cost Tracking**

- AI API calls per user/day
- Cache effectiveness
- Cost per clustering operation

## 🚨 Troubleshooting

### **Common Issues**

#### **Cache Not Working**

```bash
# Check table exists
SELECT * FROM feedback_clusters LIMIT 1;

# Verify RLS policies
SELECT * FROM pg_policies WHERE tablename = 'feedback_clusters';
```

#### **AI Clustering Fails**

```javascript
// Check API key configuration
console.log("OpenAI API Key:", process.env.OPENAI_API_KEY ? "Set" : "Missing");

// Monitor API responses
console.log("AI Response:", response);
```

#### **Clusters Not Updating**

- Check if cache invalidation is working
- Verify feedback count changes trigger refresh
- Manual refresh using dashboard controls

### **Debugging Tips**

```javascript
// Enable detailed logging
console.log("🔗 Grouping similar feedback...");
console.log("📦 Using cached feedback clusters");
console.log("🗑️ Feedback clusters cache invalidated");
```

## 🔮 Future Enhancements

### **Planned Features**

- **Adaptive caching**: Longer cache for stable feedback sets
- **Incremental clustering**: Add new feedback to existing clusters
- **Machine learning**: Improve grouping based on user feedback
- **Real-time clustering**: WebSocket-based live updates

### **Advanced Analytics**

- **Trend analysis**: Track feedback themes over time
- **Sentiment evolution**: Monitor sentiment changes within groups
- **Priority prediction**: AI-driven priority recommendations

## 📝 Best Practices

### **For Developers**

1. **Always handle AI failures gracefully**
2. **Monitor cache hit rates**
3. **Test with various feedback volumes**
4. **Implement proper error boundaries**

### **For Users**

1. **Use cache refresh sparingly** (costs money)
2. **Monitor cluster quality** and provide feedback
3. **Clear cache when feedback patterns change significantly**

### **For System Administrators**

1. **Monitor AI API costs**
2. **Set up automated cache cleanup**
3. **Track clustering performance metrics**
4. **Regular database maintenance**

## 💡 Tips for Better Clustering

### **Feedback Quality**

- Encourage detailed feedback descriptions
- Use consistent terminology across feedback
- Include context and specific examples

### **Cache Management**

- Refresh clusters after major product updates
- Clear cache when feedback patterns shift
- Monitor cache effectiveness regularly

### **Cost Optimization**

- Group similar feedback submissions in batches
- Use cache refresh strategically
- Monitor AI API usage patterns
