# AI Prompting Guide  
**Installation & Testing Manual**

This document walks you through installing the Chrome extension from source and systematically verifying that every core feature works as expected.

---

## 1. Enable Chrome Developer Mode

1. Open `chrome://extensions` in the Chrome address bar.  
2. Turn on **Developer mode** using the toggle in the top-right corner.  
   *A small toolbar with “Load unpacked”, “Pack extension”, and “Update” buttons will appear.*

---

## 2. Install the Unpacked Extension

1. Click **Load unpacked**.  
2. Browse to the project folder `ai-prompting-guide-extension/` and click **Select Folder**.  
3. Confirm you see **AI Prompting Guide** in the extension list with the purple-blue brain icon.  
4. Pin the extension (optional)  
   • Click the puzzle-piece icon → pin the brain icon for quick access.

---

## 3. Feature-by-Feature Testing Checklist

| # | Feature | Steps | Expected Result |
|---|---------|-------|-----------------|
| 3.1 | Popup & Toolbar | Click the brain icon or press **Ctrl + Shift + P** | Popup opens with status indicator “Ready/Active”. |
| 3.2 | Toggle Interface | Inside popup click **Open Interface on Current Page** **OR** press **Alt + P** | Draggable chat window appears in bottom-left corner of page. |
| 3.3 | Window Behavior | Drag header to new spot → resize from bottom-right corner | Position & size update smoothly; no interference with page; on refresh, window reopens in same spot (if “Remember position” ON). |
| 3.4 | Specialist Selection | Use dropdown → choose “Software Development Specialist” | • Welcome message updates (“I am a Software Development Specialist…”)  • Input placeholder changes  • Notes area switches to this specialist. |
| 3.5 | Model Selection | Select “OpenAI Models” | Model dropdown reflects choice; future responses mention the selected model. |
| 3.6 | Chat & Placeholder Reply | Type “Show me how to write a binary search in JavaScript” → Send | User message appears right-aligned; assistant placeholder response appears left-aligned referencing Software Development + OpenAI. |
| 3.7 | Custom Rules | Open Settings (⚙️) → add rule “Always reply in bullet points.” → save | Send a new message; assistant response lists bullet points (placeholder will echo rule list). |
| 3.8 | Global vs Specialist Rules | Toggle **Global Rules** ON; switch to “Marketing & Content Specialist”; send a message | Previously saved global rule should apply; verify rule list echoed. |
| 3.9 | User Notes | In notes panel enter text in “Personal Note 1” → switch to another specialist → return | Note persists only for original specialist. |
| 3.10 | Popup Quick Switch | In popup choose different specialist → **Apply** | Active interface (if open) switches specialist, confirmed by new welcome message. |
| 3.11 | Keyboard Shortcuts | Use **Alt + P** to hide/show window | Interface toggles visibility each time. |
| 3.12 | Cross-Tab Functionality | Open a new tab → press **Alt + P** | Interface launches in new tab with last-used specialist & model. |

---

## 4. Verify Extension Functionality on Multiple Sites

1. **Generic website** – open `https://example.com` → toggle interface → run Checklist 3.1-3.12.  
2. **AI platform** – open `https://chat.openai.com` or `https://claude.ai` → repeat toggle and tests.  
3. **Web App with heavy JS** – e.g., Google Docs → ensure interface injects without breaking site scripts.  

*Tip:* If the interface fails to appear on a site, check the console (F12 → Console) for CSP errors; most sites allow inline extension frames but some with strict CSP may block injections.

---

## 5. Data Persistence Validation

1. Change window position, resize, switch specialist, add a note, and add a rule.  
2. **Hard-refresh** the page (Ctrl + Shift + R) or close and reopen Chrome.  
3. Toggle interface again.  
4. Confirm:  
   • Window location & size are restored.  
   • Last-used specialist & model are pre-selected.  
   • Notes and rules still exist.  

All data is stored locally in `chrome.storage.local` – no external servers are contacted.

---

## 6. Troubleshooting Guide

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| Extension fails to load | Manifest or folder path incorrect | Re-select correct root in **Load unpacked**. |
| “Unchecked runtime.lastError” in console | Content script not yet injected | Reload page, then trigger interface; extension injects lazily. |
| Interface appears but CSS broken | content.css blocked by CSP | Check page CSP in console; if blocked, open DevTools → Sources → allow-listed. |
| Keyboard shortcuts do nothing | Shortcut conflict / not enabled | Visit `chrome://extensions/shortcuts` and ensure keys are mapped & not duplicated. |
| Notes or rules not saved | Storage quota exceeded (rare) | Clear some stored data via chrome://extensions → Inspect views → Application → Clear Storage. |

---

## 7. Confirming Everything Works

✓ Brain icon visible & enabled in toolbar  
✓ Popup opens without errors  
✓ Interface injects, drags, resizes, remembers state  
✓ Specialist/model dropdowns populate from JSON  
✓ Chat messages show with correct styling  
✓ Notes & rules persist between sessions  
✓ Shortcuts operate globally  
✓ No console errors on common websites

If every checkbox above is true, the AI Prompting Guide extension is installed and functioning correctly.

---

**Happy prompting! 🚀**
