
---

## ✅ **ENHANCED PROMPT — AI ASSISTANT APP UI (PRODUCTION READY)**

Design a **modern, production-ready AI assistant application UI** inspired by **OpenAI ChatGPT, Google Gemini, and Perplexity AI Perplexity.

The output must include a **complete design system + responsive app layouts** for:

* Web (1440px)
* Windows Desktop App
* Android Mobile

Focus on **real-world usability, complete UX flows, and developer handoff readiness**.

---

# 🎨 DESIGN PRINCIPLES

* Minimal, modern, distraction-free
* High contrast, accessibility compliant (WCAG AA+)
* Dark mode primary, light mode optional
* Neutral base (slate/gray) + subtle accent (blue/violet)
* 8–12px border radius
* 4px spacing grid system
* Soft shadows + thin borders (no heavy elevation)
* Smooth micro-interactions (150–250ms ease-in-out)

---

# 🎯 DESIGN SYSTEM (MANDATORY)

### 🎨 Color Tokens

Define semantic tokens (not raw hex only):

* Background: `bg-primary`, `bg-secondary`, `bg-elevated`
* Text: `text-primary`, `text-secondary`, `text-muted`
* Accent: `accent-primary`, `accent-hover`
* Status:

  * Success
  * Warning
  * Error
  * Info
* Border: subtle + strong
* Overlay / backdrop
* Selection highlight

Include **dark + light variants**

---

### 🔤 Typography

* Font: Inter (fallback: system-ui)
* Define:

  * H1–H6
  * Body (regular + medium)
  * Caption
  * Code font (monospace)

Include:

* Line height system
* Letter spacing rules
* Truncation behavior

---

### 🧩 Core Components

Define reusable, auto-layout enabled components:

* Buttons:

  * Primary
  * Secondary
  * Ghost
  * Icon-only
  * Loading state
* Inputs:

  * Default / Focus / Error / Disabled
  * With icons + actions
* Chat bubbles (user + AI)
* Code blocks:

  * Syntax highlight placeholder
  * Copy button
  * Expand/collapse
* Cards (sources/tools/files)
* Tabs (underline + pill styles)
* Toggle switches
* Dropdowns (with search)
* Modals (settings, confirmations)
* Tooltips
* Toast notifications
* Scrollbars (minimal modern)

---

# 🖥️ WEB / DESKTOP LAYOUT (1440px)

### 🧱 STRUCTURE: 3-PANEL SYSTEM

---

## 📂 LEFT SIDEBAR (280px fixed)

Top:

* App logo + name
* “New Chat” primary button

Middle:

* Search chats
* Chat history grouped:

  * Today
  * Yesterday
  * Older
* Pinned chats section
* Hover actions:

  * Rename
  * Delete
  * Pin

Bottom:

* User profile (avatar + email)
* Settings
* Theme toggle
* Collapse sidebar button

---

## 💬 MAIN CHAT AREA

### Header:

* Model selector dropdown:

  * Chat
  * Agent
  * Search
  * Code
* Editable chat title
* Actions:

  * Share
  * Export
  * Clear chat

---

### Chat Thread:

* User messages (right)
* AI messages (left)

Each message supports:

* Markdown
* Code blocks
* Tables
* Images
* File previews

Actions per AI message:

* Copy
* Regenerate
* Edit prompt
* Like / Dislike
* Expand

---

### AI STATES:

* Typing animation
* Streaming text effect
* “Thinking…” expandable reasoning block
* Error state (retry button)

---

### INPUT AREA (Sticky Bottom)

Main row:

* Multiline input
* Attach button
* Voice input
* Send button

Secondary row:

* Tool toggles:

  * Search
  * Files
  * Memory
  * Code execution

---

## ⚙️ SMART PANELS (IMPORTANT ADDITION)

### 📎 FILE UPLOAD FLOW (MISSING IN ORIGINAL → NOW FIXED)

When user clicks **Attach**:

👉 A **right-side panel OR modal opens** with:

* Drag & drop upload zone
* File list with:

  * Preview
  * Remove option
* Supported formats:

  * PDF, DOCX, TXT, Images, Code files
* Upload progress indicator

After upload:

* Files appear as **chips in input area**
* Clicking file opens preview panel

---

## 📊 RIGHT PANEL (COLLAPSIBLE)

Tabs:

### Sources

* List of links with:

  * Title
  * Snippet
  * Domain
* Click opens preview

### Tools

* Agent actions:

  * API calls
  * Code execution
* Status indicators

### Memory

* Stored context:

  * Editable
  * Delete option

---

# 🤖 AGENT MODE (ADVANCED UI)

Toggle Chat ↔ Agent Mode

When Agent mode is active:

Show **Execution Timeline Panel**:

Steps:

1. Planning
2. Tool usage
3. Intermediate results
4. Final output

Each step:

* Expandable
* Shows logs / reasoning
* Status:

  * Running
  * Completed
  * Failed

---

# 📱 ANDROID MOBILE

### Layout:

Top bar:

* App name
* Model selector

Main:

* Chat thread

Bottom:

* Input bar (fixed)

Bottom navigation (4 tabs):

* Chats
* Agent
* Files
* Settings

---

### Mobile Enhancements:

* Swipe to open sidebar
* Long-press message actions
* File upload opens bottom sheet
* Voice input expands full screen

---

# 🪟 WINDOWS APP

Same as web + desktop-native features:

* Draggable title bar
* Window controls
* System tray support
* Compact mode:

  * Floating assistant panel
* Keyboard shortcuts panel

---

# ⚡ INTERACTIONS (CRITICAL)

* Hover + active states for all components
* Smooth transitions (150–250ms)
* Message streaming animation
* Sidebar collapse animation
* Right panel slide-in
* Drag & drop feedback
* Loading skeletons

---

# 🚨 EDGE CASES (IMPORTANT ADDITIONS)

Include UI for:

* Empty state (no chats)
* No internet
* API error
* Rate limit reached
* File upload failure
* Long message overflow
* Very long code blocks
* Multi-file uploads

---

# 🔧 DEVELOPER HANDOFF REQUIREMENTS

* Auto layout enabled
* Constraints defined
* Responsive resizing rules
* Component variants structured
* Token-based design (not hardcoded values)
* Naming conventions clean and scalable

---

# 📦 OUTPUT REQUIRED

* Full design system page
* Component library
* Web app screens
* Mobile screens
* Desktop screens
* Interaction states

---

## 🔥 OPTIONAL (HIGH VALUE ADDITIONS)

* Prompt templates UI
* Chat branching (tree structure)
* Multi-chat tabs
* AI personality selector
* Plugin marketplace UI

---

# 🔧 **ADD THIS SECTION TO YOUR PROMPT (CRITICAL UI BEHAVIOR)**

## ⚡ DYNAMIC OUTPUT / STREAMING

AI responses must support **real-time streaming output**:

* Text appears **token-by-token (typing effect)**
* Cursor indicator (blinking caret) at end of streaming text
* Ability to:

  * Pause generation
  * Stop generation
  * Resume (if applicable)

### States:

* `idle`
* `thinking` (before output)
* `streaming`
* `completed`
* `error`

### UI Requirements:

* Smooth text fade-in per line
* Maintain scroll position intelligently
* Auto-scroll toggle (on/off)

---

## 📦 RICH CONTENT BLOCK SYSTEM (VERY IMPORTANT)

AI responses must render structured outputs in **distinct block containers**, not plain text.

### 🧾 Supported Block Types:

---

### 1. CODE BLOCK

* Monospace font

* Syntax highlighting (language label top-left)

* Header bar with:

  * Language name
  * Copy button
  * Expand / collapse
  * “Open in Editor” (for dev mode)

* Scrollable horizontally if long

* Line numbers (optional toggle)

---

### 2. MARKDOWN BLOCK

Render properly:

* Headings
* Lists
* Tables
* Quotes
* Inline code

---

### 3. FILE BLOCK

For generated/downloadable files:

Display as a **card**:

* File name
* File type icon
* Size (optional)
* Actions:

  * Download
  * Preview
  * Open in panel

---

### 4. IMAGE / MEDIA BLOCK

* Rounded preview
* Click → open full preview modal
* Zoom support

---

## 🧠 SMART BLOCK DETECTION

System should automatically detect:

* Code → render as code block
* Tables → render as structured table
* JSON → formatted block
* Links → preview cards (optional)

---

## 🧪 CANVAS / PREVIEW PANEL (MAJOR ADDITION)

When AI generates **renderable content**, show a **live preview panel**.

### Trigger conditions:

* HTML / React / UI code
* Charts / structured visuals
* Design output
* Documents

---

### Behavior:

👉 Opens **right-side panel OR split view**

Modes:

* Preview
* Code
* Split (both)

---

### Canvas Features:

* Live rendering
* Refresh button
* Fullscreen toggle
* Device preview:

  * Desktop
  * Tablet
  * Mobile

---

### For Developers:

* “Edit in sandbox” button
* Console/log output section
* Error overlay if rendering fails

---

## 🔄 INTERACTIVE RESPONSE ACTIONS

Each AI response should support:

* Copy
* Regenerate
* Edit prompt
* Continue generation
* Convert to:

  * Code
  * Document
  * File

---

## 📁 FILE GENERATION FLOW

If AI generates files:

1. Show file block
2. Add to **Files panel**
3. Allow:

   * Download
   * Reopen
   * Reuse in chat

---

## 🧩 MULTI-OUTPUT HANDLING

If response contains:

* Text + code + file

👉 Render as **stacked modular blocks**, not one blob.

---

## 🎯 UX DETAILING (IMPORTANT)

* Blocks have:

  * Subtle borders
  * Background contrast
  * Padding (12–16px)
* Maintain consistent spacing between blocks
* Avoid visual clutter

---

## 🚨 EDGE CASES

* Very large code → collapsible
* Streaming interrupted → partial state UI
* Preview crash → fallback message
* Unsupported file → download-only mode

---

# ✅ RESULT

With this addition, your design will now properly support:

* ChatGPT-style streaming
* Perplexity-style structured answers
* Gemini-style multimodal output
* Developer-grade canvas preview (like v0 / CodeSandbox)

---


# 🔥 FINAL MISSING PIECES (ADD THESE)

## 1. 🧠 CONTEXT WINDOW / TOKEN MANAGEMENT (VERY IMPORTANT for Ollama)

Local models have strict limits.

### Add UI:

* Context usage bar (like storage meter)
* Example:

  * `12K / 32K tokens used`
* When nearing limit:

  * Warning state
  * Suggest:

    * “Summarize chat”
    * “Start new chat”

### Actions:

* Trim history
* Auto-summarize toggle

---

## 2. 🧩 SYSTEM PROMPT / ROLE CONTROL

Currently missing but essential.

### Add:

* Hidden **System Prompt panel**
* Editable instructions:

  * “You are a coding assistant…”
* Presets:

  * Developer
  * Analyst
  * Writer

---

## 3. 🔄 RESPONSE RE-RUN CONTROL (ADVANCED UX)

Not just “Regenerate”

### Add options:

* Regenerate with:

  * Same model
  * Different model
* “Improve answer”
* “Shorten / Expand”
* “Explain like I’m 5”

---

## 4. 🧪 MULTI-MODE OUTPUT SWITCHING

For same response:

* Text view
* Code view
* Structured (table/json)
* Preview (canvas)

👉 Toggle buttons per response

---

## 5. 🧵 CHAT BRANCHING UI (IMPORTANT)

Instead of linear chat:

* Allow branching from any message
* Visual tree (like Git)

This is used in advanced tools but rarely designed properly.

---

## 6. 📊 LOGS / DEBUG PANEL (FOR OLLAMA USERS)

Since you're using local models:

### Add hidden dev panel:

* Raw request
* Raw response
* Token count
* Latency

---

## 7. ⚙️ BACKGROUND TASKS / QUEUE SYSTEM

Local models = slower sometimes.

### Add:

* Queue indicator:

  * “1 task running, 2 queued”
* Ability to cancel tasks

---

## 8. 🧠 MULTI-MODEL PARALLEL RESPONSE (ADVANCED)

Optional but powerful:

* Ask multiple models at once
* Show side-by-side responses

---

## 9. 🔐 PERMISSION & SECURITY UI

Important for local + tools:

* When tool is used:

  * Show confirmation:

    * “Allow file access?”
    * “Allow code execution?”
* Toggle:

  * Always allow
  * Ask every time

---

## 10. 💾 EXPORT SYSTEM (NOT JUST SHARE)

Add full export options:

* Markdown
* PDF
* JSON
* Code bundle

---

## 11. 🧭 GLOBAL SEARCH (VERY IMPORTANT)

Search across:

* Chats
* Files
* Messages

With:

* Filters
* Highlighted matches

---

## 12. 🪄 QUICK ACTION COMMAND BAR (POWER FEATURE)

Like VS Code / Raycast

Shortcut: `Ctrl + K`

Actions:

* New chat
* Switch model
* Toggle agent mode
* Open settings

---

## 13. 🧠 OFFLINE-FIRST UX (FOR OLLAMA)

Show clearly:

* “Running locally”
* No internet dependency

Handle:

* Model not loaded
* Service not running

---

## 14. 📉 PERFORMANCE FALLBACK UX

If system is weak:

* Suggest:

  * Smaller model
  * Lower context
* Show:

  * “This model may be slow on your system”

---

## 15. 🎛️ UI CUSTOMIZATION (ADVANCED USERS)

Add settings for:

* Density (compact / comfortable)
* Font size
* Code theme
* Animation toggle (important for low-end PCs)

---

## 16. 🧠 SESSION RESTORE / CRASH RECOVERY

Local apps need this.

* Restore last session
* “Recovered draft” UI

---

## 17. 🔁 AUTO TITLE GENERATION

* AI generates chat title
* Editable
* Updates dynamically

---

## 18. 📌 PIN IMPORTANT MESSAGES (NOT JUST CHATS)

Inside chat:

* Pin key responses
* Quick access panel

---

# ⚠️ CRITICAL GAP YOU ALREADY FIXED (GOOD)

Your uploaded prompt already includes:

* Streaming ✅
* Rich blocks ✅
* Canvas preview ✅
* File handling ✅

That’s why you're already ahead of most designs 

---

