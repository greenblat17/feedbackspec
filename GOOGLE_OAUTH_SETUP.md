# 🔧 Fix Google OAuth Error (invalid_client)

## ❌ Current Error
```
Доступ заблокирован: ошибка авторизации
The OAuth client was not found.
Ошибка 401: invalid_client
```

## 🚀 Quick Fix Steps

### 1. Go to Google Cloud Console
Visit: https://console.cloud.google.com/

### 2. Create/Select Project
- Click on project dropdown (top left)
- Create new project or select existing one

### 3. Enable Gmail API
- Go to "APIs & Services" > "Library"
- Search for "Gmail API"
- Click on it and press "ENABLE"

### 4. Create OAuth 2.0 Credentials
- Go to "APIs & Services" > "Credentials"
- Click "CREATE CREDENTIALS" 
- Select "OAuth 2.0 Client IDs"
- Choose "Web application"
- Name it: "FeedbackSpec Gmail Integration"

### 5. Configure Redirect URIs
Add these authorized redirect URIs:
```
http://localhost:3000/api/auth/gmail/callback
```

For production, also add:
```
https://yourdomain.com/api/auth/gmail/callback
```

### 6. Copy Your Credentials
After creating, you'll see:
- **Client ID** (starts with something like: 123456789-abc123.apps.googleusercontent.com)
- **Client Secret** (starts with: GOCSPX-...)

### 7. Add to Your Environment File
Create/update `.env.local` in your project root:

```env
# Copy these exactly from Google Cloud Console
NEXT_PUBLIC_GOOGLE_CLIENT_ID=123456789-abc123def456.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your_actual_client_secret_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 8. Restart Your Development Server
```bash
# Stop the server (Ctrl+C)
# Then restart:
npm run dev
```

### 9. Test Again
- Go to http://localhost:3000/dashboard/integrations
- Click "Connect Gmail"
- Should now work! 🎉

## 📋 Checklist

- [ ] Google Cloud project created
- [ ] Gmail API enabled
- [ ] OAuth 2.0 credentials created
- [ ] Redirect URI configured correctly
- [ ] Environment variables set in `.env.local`
- [ ] Development server restarted
- [ ] Test Gmail connection

## 🔍 Common Issues

**1. Wrong Redirect URI**
Make sure it's exactly: `http://localhost:3000/api/auth/gmail/callback`

**2. Environment Variables Not Loaded**
Restart your dev server after adding variables

**3. Using Placeholder Values**
Don't use the example values - use your actual credentials from Google

**4. Client ID Format**
Should look like: `123456789-abc123def456.apps.googleusercontent.com`

## ✅ Success!
After setup, each user can connect their own Gmail account securely!