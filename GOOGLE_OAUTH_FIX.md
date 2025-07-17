# Fix Google OAuth redirect_uri_mismatch Error

## 🚨 Error Details

```
Error 400: redirect_uri_mismatch
Access blocked: this application sent an invalid request
```

## 🔧 Step-by-Step Solution

### 1. **Get Your Supabase Project Details**

First, find your Supabase project URL:

- Go to [Supabase Dashboard](https://app.supabase.com)
- Select your project
- Your project URL format: `https://your-project-id.supabase.co`

### 2. **Configure Google OAuth Client**

#### A. Go to Google Cloud Console

1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create a new one)
3. Go to **APIs & Services** → **Credentials**

#### B. Create or Edit OAuth 2.0 Client ID

1. Click **Create Credentials** → **OAuth 2.0 Client ID** (or edit existing)
2. Select **Application type**: Web application
3. **Name**: Your app name (e.g., "FeedbackSpec")

#### C. Configure Redirect URIs

**CRITICAL**: Add these exact URIs to **Authorized redirect URIs**:

```
https://your-project-id.supabase.co/auth/v1/callback
```

**Replace `your-project-id` with your actual Supabase project ID**

#### D. Configure Origins (Optional but Recommended)

Add to **Authorized JavaScript origins**:

```
http://localhost:3000
https://your-domain.com
```

### 3. **Configure Supabase Settings**

#### A. Go to Supabase Dashboard

1. Visit [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Authentication** → **Settings**

#### B. Configure Site URL

Set your **Site URL** to:

```
http://localhost:3000
```

(For production, use your actual domain)

#### C. Configure Redirect URLs

Add these to **Redirect URLs**:

```
http://localhost:3000/api/auth/callback
```

### 4. **Configure Google Provider in Supabase**

1. In Supabase, go to **Authentication** → **Providers**
2. Find **Google** and click **Configure**
3. Enter your Google OAuth credentials:
   - **Client ID**: From Google Cloud Console
   - **Client Secret**: From Google Cloud Console
4. **Save** the configuration

### 5. **Common Redirect URI Examples**

For development:

```
https://your-project-id.supabase.co/auth/v1/callback
```

For production:

```
https://your-project-id.supabase.co/auth/v1/callback
```

### 6. **Verify Configuration**

#### Google Cloud Console Checklist:

- [ ] OAuth 2.0 Client ID created
- [ ] Correct redirect URI added: `https://your-project-id.supabase.co/auth/v1/callback`
- [ ] JavaScript origins configured (optional)
- [ ] Client ID and Secret copied

#### Supabase Dashboard Checklist:

- [ ] Site URL configured: `http://localhost:3000`
- [ ] Redirect URLs configured: `http://localhost:3000/api/auth/callback`
- [ ] Google provider enabled
- [ ] Client ID and Secret from Google added
- [ ] Configuration saved

### 7. **Test the Configuration**

1. Clear browser cache and cookies
2. Go to `http://localhost:3000/auth`
3. Try signing in with Google
4. Should redirect properly without errors

## 🐛 Troubleshooting

### Still Getting redirect_uri_mismatch?

1. **Double-check the redirect URI** in Google Cloud Console
2. **Ensure exact match**: `https://your-project-id.supabase.co/auth/v1/callback`
3. **Wait 5-10 minutes** for Google changes to propagate
4. **Clear browser cache** completely
5. **Try incognito/private browsing** mode

### Other Common Issues:

#### Wrong Project ID

- Make sure you're using the correct Supabase project ID
- Check your project URL in Supabase dashboard

#### Multiple OAuth Clients

- Ensure you're using the correct Client ID in Supabase
- Delete old/unused OAuth clients to avoid confusion

#### Environment Variables

- Verify your `.env.local` has correct Supabase credentials
- Restart your development server after changes

### 8. **Example Configuration**

If your Supabase project URL is: `https://abcdef123456.supabase.co`

Then your Google OAuth redirect URI should be:

```
https://abcdef123456.supabase.co/auth/v1/callback
```

**NOT:**

- `http://localhost:3000/api/auth/callback` ❌
- `https://abcdef123456.supabase.co/auth/callback` ❌
- `https://abcdef123456.supabase.co/api/auth/callback` ❌

## 🎯 Quick Fix Summary

1. **Google Console**: Add `https://your-project-id.supabase.co/auth/v1/callback`
2. **Supabase**: Configure Google provider with Client ID/Secret
3. **Wait 5-10 minutes** for changes to propagate
4. **Clear browser cache** and test again

The key is ensuring the redirect URI in Google exactly matches what Supabase expects!
