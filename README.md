# License API Deployment Guide (Render)

## Step 1: Download Service Account Key

1. Go to Firebase Console: https://console.firebase.google.com/project/m-maintena/settings/serviceaccounts/adminsdk
2. Click "Generate New Private Key"
3. Save the file as `service-account-key.json`
4. **DO NOT commit this file to git!**

## Step 2: Deploy to Render

### Option A: Using Render Dashboard (Easier)

1. Go to https://render.com
2. Sign up / Login
3. Click "New +" → "Web Service"
4. Connect your GitHub repository (or upload files)
5. Build Command: `npm install`
6. Start Command: `node server.js`
7. Environment Variables:
   - **FIREBASE_SERVICE_ACCOUNT_KEY**: Paste the entire content of `service-account-key.json` (as a string)
8. Click "Deploy Web Service"

### Option B: Using Render CLI

1. Install Render CLI:
   ```bash
   npm install -g render
   ```

2. Login:
   ```bash
   render login
   ```

3. Deploy:
   ```bash
   cd license-api
   render deploy
   ```

## Step 3: Get the API URL

After deployment, Render will give you a URL like:
`https://pm-maintena-license-api.onrender.com`

## Step 4: Update Python Client

Update the file: `C:\Users\BexlBinAtef\Desktop\maintenance_Srab\ملف_البايثون\license_manager.py`

Replace the Firestore API calls with Render API calls.

## Step 5: Test

1. Test the API:
   ```bash
   curl https://your-api-url.onrender.com/
   ```

2. Test activation:
   ```bash
   curl -X POST https://your-api-url.onrender.com/api/activate \
     -H "Content-Type: application/json" \
     -d '{"licenseKey":"3MOH-T2VN-AJW2-7JXR","hwid":"test-hwid","os":"Win32"}'
   ```

## Notes:

- Render Free Tier:
  - 750 hours/month (enough for license API)
  - 512MB RAM
  - 0.1 CPU
  - Automatic sleeping after 15 minutes of inactivity
  - Takes ~30 seconds to wake up

- This is perfect for license validation:
  - Low traffic (only when app opens)
  - Fast enough for license checks
  - Completely free
