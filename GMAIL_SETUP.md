# 📧 Gmail Integration Setup (User-Specific)

## 🎯 Overview

Each user connects their own Gmail account - no global OAuth setup needed in environment files!

## 🔧 Required Environment Variables

Add these to your `.env.local` (one-time setup):

```env
# Google OAuth (Public - can be exposed to client)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id_here
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Google OAuth (Private - server only)
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
```

## 🚀 Google Cloud Console Setup

1. **Create/Select Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create new project or select existing one

2. **Enable Gmail API**
   - Go to APIs & Services > Library
   - Search for "Gmail API"
   - Click "Enable"

3. **Create OAuth Credentials**
   - Go to APIs & Services > Credentials
   - Click "Create Credentials" > "OAuth 2.0 Client ID"
   - Choose "Web application"
   - Add redirect URI: `http://localhost:3000/api/auth/gmail/callback`
   - For production: `https://yourdomain.com/api/auth/gmail/callback`

4. **Copy Credentials**
   - Copy Client ID → `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
   - Copy Client Secret → `GOOGLE_CLIENT_SECRET`

## ✅ How It Works

1. **User clicks "Connect Gmail"**
   - System creates user-specific OAuth URL
   - User redirects to Google OAuth
   - User signs in with their Gmail account

2. **Google redirects back**
   - System receives authorization code
   - Exchanges code for user-specific tokens
   - Stores tokens in database per user

3. **User-specific sync**
   - Each user's tokens are used for their emails
   - No shared credentials between users
   - Secure and isolated per user

## 🔐 Security Benefits

- ✅ Each user authorizes their own Gmail
- ✅ Tokens stored per user in database
- ✅ No shared OAuth credentials between users
- ✅ Users can revoke access individually
- ✅ Follows OAuth best practices

## 🧪 Testing

1. Set environment variables
2. Go to `/dashboard/integrations`
3. Click "Connect Gmail"
4. Sign in with any Gmail account
5. Test sync functionality
6. Check `integrations` and `raw_feedback` tables

## 📊 Database Schema

**integrations table:**
```sql
{
  user_id: "uuid-of-current-user",
  platform: "gmail",
  status: "connected", 
  access_token: "user-specific-token",
  refresh_token: "user-specific-refresh-token",
  config: {
    keywords: ["feedback", "bug", "feature request"]
  }
}
```

**raw_feedback table:**
```sql
{
  user_id: "same-user-uuid",
  platform: "gmail",
  source_id: "gmail-message-id", 
  content: "email body text",
  metadata: {
    subject: "Email subject",
    from: "sender@example.com",
    date: "2024-01-01T12:00:00Z"
  }
}
```

## 🎉 Ready!

No global setup needed - each user connects their own Gmail! 🚀