# Development Guide  
AI Prompting Guide – Chrome Extension

*Last updated: 2025-07-21*

---

## 1. Project Architecture & File Structure

```
ai-prompting-guide-extension/
├─ background/                 # Service-worker scripts
│  └─ background.js
├─ content/                    # Injected UI (JS + CSS)
│  ├─ content.js
│  └─ content.css
├─ popup/                      # Toolbar popup
│  ├─ popup.html
│  └─ popup.js
├─ data/                       # JSON knowledge bases
│  ├─ specialists.json
│  └─ models.json
├─ images/                     # Icons (svg + pngs)
├─ manifest.json               # Chrome Manifest V3
├─ README.md                   # User-facing intro
├─ INSTALLATION_TESTING.md     # Manual test checklist
└─ DEVELOPMENT_GUIDE.md        # ← you are here
```

High-level components  
1. **Content Script** – mounts the draggable chat window, handles UI state, sends messages to background.  
2. **Background Service-Worker** – single source of truth for data, storage persistence, keyboard command routing, placeholder “AI” logic.  
3. **Popup** – lightweight settings & quick actions, communicates with background and active tab.  

Communication relies on `chrome.runtime.sendMessage` (content ↔ background) and `chrome.tabs.sendMessage` (popup/background ↔ tabs).

---

## 2. Adding a New Specialist

1. Open `data/specialists.json`.
2. Duplicate an existing object and change:
   * `id` – **kebab-case unique** identifier  
   * `name` – Human-readable label  
   * `description` – Short capability line (shown in placeholder responses)  
   * `welcomeMessage` & `placeholderText` – First UI messages  
   * `icon` – Any emoji or small text icon  
   * Optional arrays:  
     `defaultPromptingTechniques`, `commonPatterns`, `pitfallAvoidance`, `outputOptimization`
3. Save the file – no rebuild required.  
4. Reload the extension (chrome://extensions → **⟳ Reload**) – the new specialist appears in both the popup and main UI.

> ⚠️  Keep arrays short; large blobs slow initial JSON load.  
> 💡  If you need richer markdown or dynamic content, store a short key here and map to a separate markdown file in future iterations.

---

## 3. Adding a New Model Category

1. Open `data/models.json`.
2. Add an object with:
   * `id`, `name`, `description`, `icon`
   * Optional arrays: `optimizations`, `considerations`, `bestPractices`
3. Save & reload.  
4. Model instantly appears in the dropdown, and its arrays will be passed to the response generator.

---

## 4. Modifying the Response-Generation Logic

*File:* `background/background.js`

1. Locate `generateAdvice()` – entry point called by content script.
2. Currently it:
   * Fetches selected specialist + model objects  
   * Merges applicable rules  
   * Calls `generatePlaceholderResponse()` for a static HTML reply
3. To integrate real AI:
   * Replace `generatePlaceholderResponse()` with an async function that:
     ```js
     const completion = await fetch("https://api.example.ai/generate", {
       method: "POST",
       body: JSON.stringify({
         model: model.name,
         specialist: specialist.id,
         rules,
         message: userMessage
       })
     }).then(r => r.json());
     return completion.text;
     ```
   * Be sure to handle errors and fallback to the placeholder to avoid UI dead-ends.
4. Update manifest permissions if you call external APIs (`"https://api.example.ai/*"`).

---

## 5. Extending / Modifying the UI

*File:* `content/content.js` (React-less vanilla DOM for zero-bundle size)

Common entry points:
| Task | Location / Function |
|------|--------------------|
| Add settings panel sections | `showSettings()` placeholder |
| Add sidebars / tabs | Inside `injectInterface()` – create new DOM nodes after `selectionArea` |
| Change theme | `content/content.css` root variables (`--ai-pg-*`) |
| Add keyboard shortcuts | `manifest.json` → `commands` + `handleKeyboardShortcut()` |

Remember to update both **keyboard command** (`manifest.json`) _and_ **local listener** (`chrome.commands.onCommand` in background).

---

## 6. Data Flow Diagram (textual)

1. **User action** → content script  
2. content.js dispatches `chrome.runtime.sendMessage({ action, payload })`  
3. background.js:
   - Reads / writes `chrome.storage.local`
   - Executes business logic  
4. background.js sends **response** back to content script → UI update  
5. Popup communicates **only** with background (never directly with content)  
6. background forwards instructions to all tabs when needed (`toggleInterface`, `updateGlobalRules`).

---

## 7. Best Practices for Extending the System

1. **Keep everything JSON-driven** – no hard-coded strings in JS whenever possible.  
2. **Namespacing:** Prefix storage keys with `aiPromptingGuide_` to avoid collisions with other extensions.  
3. **CSP Safety:** Avoid inline `<script>` tags; use bundled or external files referenced in manifest.  
4. **Performance:**  
   * Use lazy loading – the heavy UI is injected only when toggled.  
   * Keep background service-worker stateless where possible (it can be terminated anytime).  
5. **Accessibility:** Maintain tab order, `aria-labels`, and contrast in CSS.  
6. **No personal data leaves the browser** – if you add remote calls, make it opt-in and document thoroughly.

---

## 8. Preparing for Production Deployment

1. **Icon set** – Provide crisp PNGs (16, 32, 48, 128). Verify against light/dark backgrounds.  
2. **Manifest** – Increment `"version"` and add a meaningful `"update_url"` if you host autoupdates.  
3. **Assets audit** – remove dev helpers (`create_icons.py`, demo HTML) or exclude via `.crxignore`.  
4. **Minify** – (optional) run `esbuild` or `rollup` to minify JS/CSS; update file references.  
5. **Testing** – execute all steps in `INSTALLATION_TESTING.md` on Windows, macOS, Linux.  
6. **Privacy Policy + TOS** – required by Chrome Web Store; clarify “all data stays local”.  
7. **Store Listing** – screenshots: popup, chat window, specialist chooser.  
8. **Upload & Publish** – zip the extension root **without** `.git/`, then upload via https://chrome.google.com/webstore/devconsole.  
9. **Post-publish** – monitor Chrome Developer Dashboard for crash analytics (JavaScript errors) and user feedback.

---

### Questions / Support

Open an issue in the repository or email dev@your-domain.com with logs (chrome://extensions → *AI Prompting Guide* → “Errors”).

Happy building! 🚀
