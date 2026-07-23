# Nexus Messenger PWA - Verification & Testing Guide

## Overview
This module provides comprehensive testing procedures to verify all Progressive Web App (PWA) features are working correctly.

---

## ✅ PWA VERIFICATION CHECKLIST

### 1. **Service Worker Registration**
- [ ] Service worker file exists: `client/public/sw.js`
- [ ] Manifest linked in `index.html`: `<link rel="manifest" href="/manifest.json">`
- [ ] PWA register script exists: `client/src/pwa-register.js`
- [ ] No console errors about service worker

**Test on Browser:**
1. Open DevTools (F12)
2. Go to **Application** tab
3. Click **Service Workers**
4. Should show: `https://yourdomain/sw.js` with status **activated and running**

✅ **Status:** [  ] Pass [  ] Fail

---

### 2. **Manifest.json Configuration**
- [ ] File exists: `client/public/manifest.json`
- [ ] `"display": "standalone"` ✓
- [ ] `"start_url": "/"` ✓
- [ ] `"theme_color": "#2563eb"` ✓
- [ ] Icons defined with proper sizes (192x192, 512x512)
- [ ] Screenshots defined

**Test on Browser:**
1. DevTools → **Application** tab
2. Click **Manifest**
3. Should show all properties correctly loaded
4. Icons should display in preview

✅ **Status:** [  ] Pass [  ] Fail

---

### 3. **Installation on Mobile**
- [ ] Browser shows install prompt/option
- [ ] "Add to homescreen" appears in browser menu
- [ ] App can be installed
- [ ] App icon appears on home screen with app name

**Steps to Test:**
1. On mobile phone, open: `http://100.58.111.27:5000`
2. Tap browser menu (⋮ three dots)
3. Look for "Add to homescreen" or "Install app"
4. Tap and confirm installation
5. Check home screen for app icon

✅ **Status:** [  ] Pass [  ] Fail

**Issues Found:** ___________________

---

### 4. **Full-Screen Launch**
- [ ] App launches without browser chrome/address bar
- [ ] Status bar visible at top (device time, signal, etc.)
- [ ] App feels like native app

**Test:**
1. Launch app from home screen
2. Check if browser UI is hidden
3. App should fill entire screen (except device status bar)

✅ **Status:** [  ] Pass [  ] Fail

**Note:** Full-screen may not work on all browsers. This is a nice-to-have feature.

---

### 5. **Offline Functionality**
- [ ] Service worker caches app files
- [ ] Can view previously loaded pages while offline
- [ ] Can view cached messages while offline
- [ ] Messages queue for sending when back online

**Test Steps:**
1. Open app and load some messages
2. Turn on **Airplane Mode** on phone
3. App should still be accessible
4. Try scrolling through cached conversations
5. Try sending a message (should queue)
6. Turn off **Airplane Mode**
7. Message should auto-send
8. Verify message appears on other devices

✅ **Status:** [  ] Pass [  ] Fail

**Issues Found:** ___________________

---

### 6. **Login & Authentication**
- [ ] OTP sending works
- [ ] OTP verification works
- [ ] User logs in successfully
- [ ] Auth token stored correctly
- [ ] User remains logged in after app restart

**Test Steps:**
1. Open app (fresh or logged out)
2. Enter email: `spectre1718@gmail.com`
3. Click "Send OTP"
4. Check email for OTP (or check backend logs)
5. Enter OTP
6. Should redirect to chat screen
7. Close and reopen app
8. Should still be logged in (no re-login needed)

✅ **Status:** [  ] Pass [  ] Fail

**Issues Found:** ___________________

---

### 7. **Real-Time Messaging**
- [ ] Can send messages
- [ ] Messages appear instantly (no refresh needed)
- [ ] Received messages appear instantly
- [ ] Message status shows delivery status
- [ ] Conversations list updates in real-time

**Test Steps:**
1. Log in on phone
2. Log in on laptop/another device with same account
3. Send message from phone
4. Should appear instantly on laptop (no refresh)
5. Send message from laptop
6. Should appear instantly on phone
7. Check message delivery indicators

✅ **Status:** [  ] Pass [  ] Fail

**Issues Found:** ___________________

---

### 8. **Push Notifications** (Optional)
- [ ] Browser requests notification permission
- [ ] Push notifications can be enabled
- [ ] Notifications display when app is closed
- [ ] Clicking notification opens app to correct conversation

**Test Steps:**
1. Open app
2. Browser should request notification permission
3. Grant permission
4. Send message from another device
5. If app is closed, notification should appear
6. Tap notification to open app

✅ **Status:** [  ] Pass [  ] Fail

**Note:** May require additional backend setup

---

### 9. **Responsive Design**
- [ ] App works on mobile screens (small)
- [ ] App works on tablet screens (medium)
- [ ] App works on desktop screens (large)
- [ ] Layout adapts properly to screen size
- [ ] Text is readable on all sizes
- [ ] Buttons/inputs are easy to tap

**Test on Different Devices:**
- [ ] Mobile (375px - 667px width)
- [ ] Tablet (768px - 1024px width)
- [ ] Desktop (1200px+ width)

✅ **Status:** [  ] Pass [  ] Fail

**Issues Found:** ___________________

---

### 10. **Performance & Caching**
- [ ] App loads quickly on first visit
- [ ] App loads instantly from cache on subsequent visits
- [ ] No unnecessary network requests
- [ ] Service worker caches static assets

**Test:**
1. Open DevTools → **Network** tab
2. Check cache status of files:
   - `index.html` should show `(from service worker)`
   - `*.css` files should be cached
   - `*.js` files should be cached
3. Turn off network and reload
4. App should still load from cache

✅ **Status:** [  ] Pass [  ] Fail

**Issues Found:** ___________________

---

## 🔍 ADVANCED TESTING

### Lighthouse Audit
1. Open DevTools on desktop
2. Go to **Lighthouse** tab
3. Run audit for PWA
4. Check scores for:
   - Performance
   - Accessibility
   - Best Practices
   - PWA

✅ **Lighthouse Score:** _____ / 100

---

### Network Throttling Test
1. DevTools → **Network** tab
2. Set to "Slow 3G"
3. Reload app
4. Should still load and work (slower but functional)

✅ **Status:** [  ] Pass [  ] Fail

---

## 📊 OVERALL PWA STATUS

| Feature | Status | Notes |
|---------|--------|-------|
| Service Worker | [  ] ✅ [  ] ❌ | |
| Manifest | [  ] ✅ [  ] ❌ | |
| Installation | [  ] ✅ [  ] ❌ | |
| Full-Screen | [  ] ✅ [  ] ❌ | |
| Offline Mode | [  ] ✅ [  ] ❌ | |
| Login | [  ] ✅ [  ] ❌ | |
| Messaging | [  ] ✅ [  ] ❌ | |
| Responsive Design | [  ] ✅ [  ] ❌ | |
| Performance | [  ] ✅ [  ] ❌ | |
| Caching | [  ] ✅ [  ] ❌ | |

---

## 🐛 ISSUES FOUND

List any issues discovered during testing:

1. **Issue:** _______________
   - **Severity:** Critical / High / Medium / Low
   - **Steps to Reproduce:** _______________
   - **Expected:** _______________
   - **Actual:** _______________

2. **Issue:** _______________
   - **Severity:** Critical / High / Medium / Low
   - **Steps to Reproduce:** _______________
   - **Expected:** _______________
   - **Actual:** _______________

---

## ✨ NEXT STEPS

### For Production Deployment:
- [ ] Enable HTTPS on backend
- [ ] Set up proper domain/SSL certificate
- [ ] Update `VITE_API_URL` to use HTTPS backend
- [ ] Rebuild and deploy frontend
- [ ] Test on actual domain (not localhost)

### PWA Enhancements:
- [ ] Implement push notifications
- [ ] Add offline message queue
- [ ] Implement app update notifications
- [ ] Add app shortcuts to manifest
- [ ] Create better app icons
- [ ] Add splash screen

### Security Improvements:
- [ ] Implement HTTPS everywhere
- [ ] Add Content Security Policy headers
- [ ] Implement secure key storage
- [ ] Add request signing for API calls

---

## 📱 DEVICE TESTING MATRIX

| Device | Browser | OS | Status | Notes |
|--------|---------|----|---------:|--------|
| Phone | Chrome | Android | [  ] ✅ [  ] ❌ | |
| Tablet | Chrome | Android | [  ] ✅ [  ] ❌ | |
| Desktop | Chrome | Windows | [  ] ✅ [  ] ❌ | |
| Desktop | Firefox | Windows | [  ] ✅ [  ] ❌ | |
| Desktop | Safari | macOS | [  ] ✅ [  ] ❌ | |

---

## 📚 RESOURCES

- [PWA Documentation](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Manifest Specification](https://www.w3.org/TR/appmanifest/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Web App Install Banners](https://developer.chrome.com/docs/web-platform/app-install-banners/)

---

**Last Tested:** _______________  
**Tester Name:** _______________  
**Date:** _______________
