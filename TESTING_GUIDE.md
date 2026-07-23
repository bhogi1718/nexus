# Nexus Responsive Refactor — Testing Guide

This guide walks through manual testing of the responsive refactor across all breakpoints (mobile, tablet, desktop).

---

## Test Environment Setup

### Start the Dev Server
```bash
cd client
npm run dev
```

The app will be available at `http://localhost:5173` (or similar).

### Open DevTools Device Emulation
1. Press `F12` to open Chrome DevTools
2. Press `Ctrl+Shift+M` (or `Cmd+Shift+M` on Mac) to toggle device emulation
3. Use the dropdown to select predefined device sizes or input custom widths

### Test Viewports
- **Mobile:** 375px (iPhone SE, iPhone 12, etc.)
- **Tablet:** 800px (iPad in portrait, Android tablet)
- **Desktop:** 1280px (laptop/monitor)

---

## Pre-Test Checklist

- [ ] Server is running (`npm run dev`)
- [ ] No pending changes in Git (commit or stash first)
- [ ] Browser cache cleared (or use incognito mode)
- [ ] DevTools console is open (check for JS errors)

---

## Test Flows

### FLOW 1: Mobile (375px) — Tab-Based UI

#### Login Screen
1. **Viewport:** Set to 375px width
2. **Action:** Navigate to `http://localhost:5173/login`
3. **Expect:**
   - Login form fills the screen
   - No sidebar visible
   - Responsive text sizes (`text-sm` or `text-base`)
   - No horizontal scroll

#### Chat List (Chats Tab)
1. **Action:** Log in with valid credentials
2. **Expect:**
   - Bottom tab bar appears with 3 tabs (Chats, Contacts, Profile icons)
   - "Chats" tab is active (highlighted blue)
   - Conversation list fills the screen above the tab bar
   - No sidebar
   - Each conversation item is ~70px tall (touch-friendly)
   - Unread badges show count
   - Search input at top

#### Open Conversation
1. **Action:** Tap any conversation from the list
2. **Expect:**
   - Chats list disappears (full-screen chat view)
   - Back arrow button appears in header
   - Conversation name and online status shown
   - No tab bar visible (replaced with header)
   - Messages display with avatars and names (smaller sizes: `w-6 h-6` avatars)
   - Message bubbles wrap appropriately (`max-w-[85%]`)
   - Message input at bottom with media upload button

#### Send Message
1. **Action:** Type "Hello from mobile!" and press Send
2. **Expect:**
   - Message appears in chat with:
     - Blue bubble (current user)
     - Timestamp
     - Delivery tick (✓, ✓✓, or pending 🕓)
   - Input clears
   - Auto-scroll to latest message

#### Send Media
1. **Action:** Tap media upload icon
2. **Expect:**
   - File picker opens (native browser)
3. **Action:** Select an image
4. **Expect:**
   - Media message appears with:
     - Image thumbnail
     - File name
     - Download link (if previewable)

#### Typing Indicator
1. **Action:** Open chat on another browser tab/device and send typing indicator
2. **Expect:**
   - "Someone is typing..." with animated dots appears above input
   - Small dot sizes (`w-1 h-1` or `w-2 h-2` scaled for mobile)

#### Back Button
1. **Action:** Tap back arrow button
2. **Expect:**
   - Returns to Chats tab list
   - Chat closes, no messages visible
   - Tab bar reappears at bottom

#### Contacts Tab
1. **Action:** Tap Contacts icon (center of tab bar)
2. **Expect:**
   - Contacts list appears
   - Add contact form at top
   - List of known contacts with message button and delete button
   - No "Chats" list visible

#### Profile Tab
1. **Action:** Tap Profile icon (right of tab bar)
2. **Expect:**
   - Profile card appears with:
     - User avatar (large, `w-16 h-16`)
     - User name
     - Email address
     - Online status (green dot + "Online")
   - No chats list or contacts visible

#### Safe-Area Padding (iPhone)
1. **Device:** Use iPhone 14 Pro emulation in DevTools
2. **Expect:**
   - Tab bar clears the home indicator (not hidden behind it)
   - Bottom padding visible below tab bar

---

### FLOW 2: Tablet (800px) — Sidebar + Chat Layout

#### Initial Load
1. **Viewport:** Set to 800px width
2. **Action:** Log in
3. **Expect:**
   - **Left sidebar:** Visible (narrower than desktop: `md:w-72`)
     - Profile section at top
     - Add contact + Search inputs
     - Conversation list
   - **Right chat area:** Main pane for active conversation
   - **Bottom tab bar:** HIDDEN (changed from `lg:hidden` to `md:hidden`)
   - No tabs; sidebar + chat layout instead

#### Sidebar Navigation
1. **Action:** Click a conversation in sidebar
2. **Expect:**
   - Chat area on right opens that conversation
   - Sidebar persists (doesn't collapse)
   - Header in chat area shows conversation name + online status
   - No back button in header (back button is mobile-only: `md:hidden`)

#### Send Message (Tablet)
1. **Action:** Type a message in the chat area
2. **Expect:**
   - Message appears with appropriate sizing:
     - Avatars: `md:w-8 md:h-8` (larger than mobile's `w-6 h-6`)
     - Bubble width: `md:max-w-sm` (wider than mobile's `max-w-[85%]`)
     - Padding: `md:p-4` (more spacious than mobile's `p-3`)
   - Message input field is responsive

#### Sidebar Search
1. **Action:** Type a user name/email in the Search input
2. **Expect:**
   - Conversation list is replaced with search results
   - Results are clickable to start new conversation
   - Can click existing conversation to return to list

#### Resize to Desktop
1. **Action:** Resize window from 800px to 1280px (drag DevTools resize handle or change device width)
2. **Expect:**
   - Layout stays the same (sidebar + chat)
   - Sidebar gets wider: `lg:w-80` (was `md:w-72`)
   - Padding increases: `lg:p-6` (was `md:p-4`)
   - Gaps increase: `lg:gap-6` (was `md:gap-4`)
   - **No layout jump or flicker**

#### Drag-Drop File Upload (if wider than 1024px)
1. **Resize:** Expand to 1280px (full desktop)
2. **Action:** Drag an image onto the chat area
3. **Expect:**
   - Semi-transparent blue overlay appears over chat area
   - Upload icon appears in center
   - Drop the file → media message is created and sent

---

### FLOW 3: Desktop (1280px) — Full-Featured Layout

#### Landing
1. **Viewport:** Set to 1280px width
2. **Action:** Log in
3. **Expect:**
   - Full layout:
     - **Left sidebar:** Full width (`lg:w-80`)
       - Profile card with gradient background
       - Add contact form
       - Search bar
       - Conversation list with ample spacing
     - **Right chat area:** Large pane
       - Can see full conversation messages without horizontal scroll
     - **No tabs or bottom nav**
     - **No back button in header**

#### Message Rendering (Desktop)
1. **Action:** Open a conversation with multiple messages
2. **Expect:**
   - Message bubbles are wide (`max-w-sm`)
   - Avatars are larger (`w-8 h-8`)
   - Ample padding around text (`p-4`)
   - Message spacing is generous (`space-y-4`)
   - Read/delivery ticks visible and clear

#### Typing Indicator (Desktop)
1. **Action:** Trigger typing indicator (from another tab/device)
2. **Expect:**
   - Animated dots are larger than mobile version
   - Spacing (`px-4 py-2`) is more generous

#### Drag-Drop Upload (Desktop)
1. **Action:** Drag an image file from file explorer/Finder onto the chat area
2. **Expect:**
   - Semi-transparent blue overlay appears immediately
   - "+" icon in center
   - File can be dropped; message is uploaded
   - Overlay disappears

#### Profile Sidebar Button (Desktop)
1. **Action:** Look for button in sidebar profile section (contacts icon)
2. **Expect:**
   - Button exists but is desktop-only styling
   - Clicking it should perform some action (if implemented)

#### No Mobile Features
1. **Expect:**
   - No bottom tab bar (`md:hidden` hides it)
   - No back button in header (`md:hidden` hides it)
   - No tabs (Chats/Contacts/Profile) visible
   - All existing desktop features work

---

## Cross-Breakpoint Tests

### Responsive Typography
Test at 375px, 800px, and 1280px:
- [ ] Conversation names readable (font size increases at breakpoints)
- [ ] Message timestamps readable
- [ ] Input placeholder text readable
- [ ] Button text readable (all buttons have `min-h-[40px]` for touch)

### Responsive Touch Targets
Test at 375px (mobile):
- [ ] All buttons are ≥40px tall (`min-h-[40px]`)
- [ ] Conversation items are ≥70px tall (easy to tap)
- [ ] Tab bar buttons are comfortable to tap (no accidental taps)

### No Horizontal Scroll
Test at all viewports:
- [ ] Resize and scroll horizontally — no content should be off-screen
- [ ] Message bubbles wrap properly (max-width classes work)
- [ ] Input field doesn't overflow
- [ ] Sidebar doesn't overflow

### Keyboard Handling
Test on mobile and tablet:
- [ ] On-screen keyboard appears when tapping input
- [ ] Input field is NOT hidden behind keyboard
- [ ] When keyboard appears, scroll adjusts (native browser behavior)

---

## Socket.IO & Real-Time Features

### Connection
Test at all breakpoints:
- [ ] Socket.IO connects (check network tab in DevTools → WS)
- [ ] User appears as "Online" in conversation headers
- [ ] Unread badges update when messages arrive

### Typing Indicator
Test at all breakpoints:
- [ ] Open chat in two browser windows (same user or different)
- [ ] Type in one window → "Someone is typing..." appears in other
- [ ] Animated dots work at all sizes

### Message Delivery
Test at all breakpoints:
- [ ] Sent message shows ✓ (sent)
- [ ] Other user receives it → tick shows ✓✓ (delivered + read)
- [ ] Unread badge decreases when you read messages

### E2E Encryption
Test at all breakpoints:
- [ ] Send text message → should be encrypted before sending
- [ ] Receive message → should be decrypted on arrival
- [ ] If encryption fails, 🔒 "Encrypted" placeholder appears
- [ ] Media messages also encrypted (file metadata, not file itself)

---

## PWA Features

### Install Prompt
Test at all breakpoints:
- [ ] Install prompt banner appears at top of Chat
- [ ] "Install" button is clickable at 375px, 800px, 1280px
- [ ] Clicking prompts browser install flow
- [ ] Prompt also appears on `/` and `/chat` routes

### Service Worker / Offline
Test on desktop:
1. **Action:** Open DevTools → Application → Service Workers
2. **Expect:** `sw.js` is registered and active
3. **Action:** Set network to "Offline" in DevTools
4. **Expect:**
   - Static assets still load (CSS, JS)
   - API calls show "offline" or timeout (expected)
   - Refresh page → content stays (cached)

### Manifest / Add to Home Screen
Test on mobile:
1. **Action:** Tap share/menu button in browser
2. **Expect:** "Add to home screen" option appears (on Chrome, Firefox)
3. **Action:** Tap it → app icon appears on home screen
4. **Action:** Launch from home screen
5. **Expect:**
   - Appears fullscreen (no URL bar) — `display: "standalone"` works
   - Splash screen shows app name + icon
   - Theme color is correct (`#2563eb` or current theme)

---

## Performance Checks

### Bundle Size
```bash
cd client
npm run build
```

**Expect:**
- `index.js` should be ~390 KB (gzipped ~120 KB)
- No increase from before (device-detection hook removed, should be smaller or same)

### No Console Errors
Test at all breakpoints:
- [ ] DevTools Console → no red error messages
- [ ] Warnings are pre-existing (unused variables, hook deps)

### Render Performance
Test at 375px with slow network (DevTools → Network → Slow 3G):
- [ ] Page doesn't freeze while loading
- [ ] Messages appear incrementally
- [ ] No layout shifts (CLS) as messages load
- [ ] Typing indicator animate smoothly

---

## Regression Tests (Make Sure Nothing Broke)

### Features That Should Still Work
- [ ] Login/Signup (no changes to Auth)
- [ ] Conversations load (no changes to chatService)
- [ ] Messages send and receive (Socket.IO unchanged)
- [ ] E2E encryption (cryptoService unchanged)
- [ ] Media upload (MediaUploader unchanged)
- [ ] Add contact (API unchanged)
- [ ] Search users (API unchanged)
- [ ] Logout (Auth unchanged)

### Edge Cases
- [ ] Empty conversation list — should show "No conversations yet"
- [ ] Empty message list — should show "No messages yet"
- [ ] Typing with very long message — should wrap and not overflow
- [ ] Media upload with large file — should show progress or error
- [ ] Receive message while chat is minimized — unread badge updates
- [ ] Switch conversations quickly — should load messages correctly
- [ ] Add same contact twice — should error with friendly message

---

## Sign-Off Checklist

After completing all tests, verify:

- [ ] No console errors at any breakpoint
- [ ] Layout is correct at 375px (mobile), 800px (tablet), 1280px (desktop)
- [ ] All buttons are touch-friendly (≥40px)
- [ ] No horizontal scroll at any breakpoint
- [ ] Socket.IO works (typing, delivery, read ticks)
- [ ] E2E encryption works
- [ ] Media upload works
- [ ] Install prompt appears
- [ ] Service worker is registered
- [ ] No regressions from before refactor
- [ ] Build succeeds without errors

**Ready to ship:** ✅ Once all checks pass, the refactor is production-ready.

---

## Troubleshooting

### Layout is jumpy/flickering
- **Cause:** Tailwind breakpoint classes not applying correctly
- **Fix:** Clear browser cache (`Ctrl+Shift+Delete`), hard refresh (`Ctrl+Shift+R`)

### Messages not encrypting
- **Cause:** cryptoService error (should see 🔒 placeholder)
- **Check:** DevTools console for decryption errors
- **Verify:** cryptoService.js was not modified during refactor

### Tab bar hides content on iPhone
- **Cause:** Safe-area padding not applied
- **Fix:** Ensure `pb-[env(safe-area-inset-bottom)]` classes are on mobile containers
- **Check:** index.html has `viewport-fit=cover` meta tag

### Install prompt doesn't appear
- **Cause:** Not HTTPS (local dev uses HTTP, OK; but production must be HTTPS)
- **Check:** Browser allows PWA install on localhost and HTTPS sites
- **Verify:** InstallPrompt.jsx is imported in Chat.jsx

### Socket.IO not connecting at mobile
- **Cause:** Network tab shows pending WebSocket
- **Check:** Is `initializeSocket` being called? (In AuthContext)
- **Verify:** No changes to socket.js or services
- **Debug:** Look for CORS errors in console

---

## Notes for Test Report

When testing, note:
- Browser and OS (Chrome on Windows, Safari on iPhone, etc.)
- Viewport width tested
- Any visual glitches or alignment issues
- Performance observations (fast/slow loading)
- Any console errors or warnings

**Report template:**
```
✅ Tested on: [Browser] [OS] [Device]
   - Mobile (375px): [PASS/FAIL] [Notes]
   - Tablet (800px): [PASS/FAIL] [Notes]
   - Desktop (1280px): [PASS/FAIL] [Notes]
   - Socket.IO: [PASS/FAIL] [Notes]
   - Encryption: [PASS/FAIL] [Notes]
   - PWA: [PASS/FAIL] [Notes]
```

---

**Happy testing! 🧪**
