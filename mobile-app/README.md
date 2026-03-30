# CapyWorlds Android App

## Prerequisites
- Node.js 18+
- Android Studio (with SDK 34)
- Java 17

## Setup (First Time)

```bash
cd mobile-app
npm install
npx cap init CapyWorlds com.capyworlds.app --web-dir ../
npx cap add android
npx cap sync android
npx cap open android   # Opens in Android Studio
```

## Daily Development

```bash
npx cap sync android   # Sync web changes to Android project
npx cap run android    # Run on device/emulator
```

## IAP Setup

### 1. Google Play Console
1. Create app in [Google Play Console](https://play.google.com/console)
2. Go to Monetize → Products → In-app products
3. Add these product IDs:
   - `gems_100` — NT$30
   - `gems_500` — NT$150
   - `gems_1200` — NT$300
   - `no_ads` — NT$90
4. Add subscription:
   - `monthly` — NT$60/month

### 2. RevenueCat (Optional but Recommended)
1. Create account at [RevenueCat](https://www.revenuecat.com)
2. Add Android app with package name `com.capyworlds.app`
3. Upload Google Play service account JSON
4. Copy API key → paste in `capacitor.config.json`

### 3. Server-Side Verification
1. Create Google Cloud service account with Android Publisher API access
2. Download JSON key file
3. Add as Cloudflare Worker secret:
   ```bash
   npx wrangler secret put GOOGLE_PLAY_KEY
   # Paste the entire JSON content
   ```
4. Set package name:
   ```bash
   npx wrangler secret put ANDROID_PACKAGE
   # Enter: com.capyworlds.app
   ```

## Architecture

```
User taps "Buy 💎100"
  → Capacitor plugin opens Google Play Billing
    → User pays via Google Pay
      → App receives purchase token
        → POST /iap/verify (our Worker)
          → Worker validates with Google Play API
            → Grants gems to user account
              → App updates UI
```

## Testing
- Use Google Play's test tracks (Internal Testing) for free test purchases
- Without GOOGLE_PLAY_KEY secret, the Worker auto-verifies (sandbox mode)
- Web version at /games/shared/store.html also works in sandbox mode
