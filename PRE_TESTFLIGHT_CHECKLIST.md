# Pre-TestFlight Checklist for RollCall

## Critical Issues to Fix Before TestFlight

### 1. App Configuration (app.json) - CRITICAL ⚠️

#### Missing App Icon
- **Issue**: `"icon": ""` is empty
- **Action Required**: Create and add app icon at `./assets/icon.png`
  - Recommended size: 1024x1024px PNG
  - Should be a clean, simple icon representing your app
  - Add path to app.json: `"icon": "./assets/icon.png"`

#### Missing Adaptive Icon (Android)
- **Issue**: All adaptive icon paths are empty
- **Action Required**: Add adaptive icon files:
  - `foregroundImage`: "./assets/adaptive-icon.png"
  - `backgroundImage` or `backgroundColor`: Choose one
  - `monochromeImage`: "./assets/adaptive-icon-monochrome.png" (optional)

#### Missing Splash Screen
- **Issue**: `"image": ""` is empty in splash screen configuration
- **Action Required**: Create splash screen image
  - Recommended size: 1284x2778px (iPhone 14 Pro Max size)
  - Simple, clean design matching your brand
  - Add to assets/splash.png
  - Update app.json: `"image": "./assets/splash.png"`

#### Invalid iOS Bundle Identifier
- **Issue**: `"bundleIdentifier": "v"` is invalid
- **Action Required**: Change to proper format
  - Format: `com.yourcompany.rollcall` or `com.landonroney.rollcall`
  - Must be unique and follow reverse domain notation
  - Example: `"bundleIdentifier": "com.landonroney.rollcall"`

#### Missing Favicon (Web)
- **Issue**: `"favicon": ""` is empty
- **Action Required**: Add favicon if web support is needed
  - Or remove web configuration if not needed

---

## 2. Environment Variables - CHECK REQUIRED ✓

### Required Environment Variables
Verify these are set in your `.env.local` file:

```bash
EXPO_PUBLIC_APPWRITE_DATABASE_ID=
EXPO_PUBLIC_APPWRITE_PROFILE_CONTACTS_TABLE_ID=
EXPO_PUBLIC_APPWRITE_ENGAGEMENT_EVENTS_TABLE_ID=
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=
```

**Action**: Run `cat .env.local` to verify all required vars are set

---

## 3. TypeScript Issues - MOSTLY RESOLVED ✓

### Remaining Non-Critical Issues
- Test files have some type errors (won't affect build)
- Entity parser has minor type issues (won't affect build)
- Note editor has unused variable (won't affect build)

**Status**: App will build successfully despite these warnings

---

## 4. Build Configuration - VERIFIED ✓

### EAS Configuration
- ✓ Production build has `autoIncrement: true`
- ✓ Preview distribution is internal
- ✓ Development client configured

---

## 5. Pre-Build Steps

### Before running `eas build`:

1. **Install assets**:
   ```bash
   # Create placeholder assets if you don't have final ones
   mkdir -p assets
   # Add icon.png, splash.png, adaptive-icon.png
   ```

2. **Fix app.json**:
   - Update bundle identifier
   - Add icon paths
   - Add splash screen path

3. **Verify environment**:
   ```bash
   # Check all env vars are set
   cat .env.local
   ```

4. **Test locally first**:
   ```bash
   # Run on simulator to catch any runtime issues
   npm run ios
   ```

5. **Clean build**:
   ```bash
   # Clear any cached builds
   rm -rf .expo
   rm -rf node_modules/.cache
   ```

---

## 6. TestFlight Submission Steps

### 1. Build for iOS
```bash
eas build --platform ios --profile production
```

### 2. Wait for Build
- Monitor build progress in Expo dashboard
- Build will take 10-20 minutes
- You'll get an email when complete

### 3. Submit to App Store Connect
```bash
eas submit --platform ios
```

### 4. Configure in App Store Connect
- Log into https://appstoreconnect.apple.com
- Select your app
- Go to TestFlight tab
- Add test information:
  - What to test
  - Privacy policy URL (if required)
  - Export compliance information

### 5. Add Testers
- Internal testers (up to 100): Immediate access
- External testers (up to 10,000): Requires Apple review

---

## 7. App Store Requirements

### Required App Information
- [ ] App name
- [ ] Subtitle
- [ ] Primary category: Productivity
- [ ] Privacy policy URL
- [ ] Support URL

### Screenshots Needed (per device size)
- [ ] 6.7" iPhone (1290 x 2796 px) - Required
- [ ] 6.5" iPhone (1242 x 2688 px)
- [ ] 5.5" iPhone (1242 x 2208 px)

### App Description
- [ ] Short description (170 characters)
- [ ] Full description
- [ ] Keywords
- [ ] What's new

---

## 8. Post-Build Testing

### Critical Flows to Test
- [ ] Sign up / Sign in with Clerk
- [ ] Import contacts from device
- [ ] View daily deck
- [ ] Swipe cards
- [ ] Create engagement (SMS/call)
- [ ] Add note
- [ ] View contact details
- [ ] Set cadence
- [ ] Premium features (if applicable)
- [ ] Navigation between all tabs
- [ ] Search functionality

### Edge Cases
- [ ] No contacts imported
- [ ] Empty deck
- [ ] First-time user experience
- [ ] Permissions (contacts, notifications)
- [ ] Offline behavior

---

## 9. Pre-Launch Checklist

### Legal & Compliance
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] Export compliance determined
- [ ] Contact information valid

### Revenue (if applicable)
- [ ] RevenueCat configured
- [ ] App Store Connect in-app purchases set up
- [ ] Premium features tested
- [ ] Paywall tested

### Support
- [ ] Support email set up
- [ ] Bug reporting mechanism
- [ ] User feedback collection plan

---

## Quick Fix Commands

### Fix Bundle Identifier
```json
// In app.json
"ios": {
  "bundleIdentifier": "com.landonroney.rollcall"
}
```

### Add Assets
```bash
# If you need placeholder assets for now:
# Icon: 1024x1024 PNG
# Splash: 1284x2778 PNG
# Adaptive icon: 1024x1024 PNG
```

### Verify Build Settings
```bash
cat eas.json
cat app.json | grep -E "(icon|bundleIdentifier|splash)"
```

---

## Common Issues & Solutions

### Issue: "Invalid Bundle Identifier"
**Solution**: Must be reverse domain notation, e.g., `com.yourcompany.appname`

### Issue: "Missing Icon"
**Solution**: Create 1024x1024 PNG and add path to app.json

### Issue: "Build Failed - Environment Variables"
**Solution**: Check all EXPO_PUBLIC_ vars are set in EAS secrets or .env

### Issue: "Simulator Works, TestFlight Doesn't"
**Solution**: Check for any dev-only code, console.logs, or debug flags

---

## Current Status Summary

### ✅ Completed
- TypeScript configuration fixed
- Import errors resolved
- Unused variables cleaned up
- Build configuration verified
- Home screen implemented
- Core features functional

### ⚠️ Requires Attention
- **App icon** - Need to create and add
- **Splash screen** - Need to create and add
- **Bundle identifier** - Need to update from "v" to proper format
- **Environment variables** - Need to verify all are set

### 📝 Recommended Before TestFlight
- Test all critical flows on simulator
- Add error boundaries for production
- Enable Sentry or error tracking
- Set up analytics (if desired)
- Prepare screenshot for App Store
- Write app description

---

## Next Steps

1. **Immediate** (blocking TestFlight):
   - Create app icon
   - Create splash screen
   - Fix bundle identifier
   - Verify environment variables

2. **Before first build**:
   - Test on iOS simulator
   - Verify all core flows work
   - Check permissions are requested properly

3. **Before external testing**:
   - Prepare TestFlight testing notes
   - Add privacy policy
   - Add support contact

4. **Post-TestFlight**:
   - Gather tester feedback
   - Fix critical bugs
   - Iterate on UX issues
   - Prepare for App Store submission
