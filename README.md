# AI Prompting Guide

An intelligent, specialist-driven prompting advisor and workflow assistant for anyone working with large-language-models and AI tools.

---

## 1. Project Overview & Purpose
AI Prompting Guide is a Chrome extension that:
* Embeds a chat-style window on any webpage  
* Offers tailored advice from 10 domain specialists (marketing, software, data, etc.)  
* Provides model-aware suggestions for Claude, GPT-4o, Gemini, and more  
* Lets you store personal notes and custom rules for consistent, high-quality outputs  

Its goal is to shorten the “prompt → iterate → success” loop when interacting with LLMs, making every AI session faster, clearer, and more effective.

---

## 2. Installation (Chrome)

1. Download or clone this repository.  
2. Open **chrome://extensions** in Chrome.  
3. Enable **Developer mode** (top-right switch).  
4. Click **Load unpacked** and select the project’s root folder.  
5. The brain-icon will appear in the toolbar – click it to open the popup.

---

## 3. Features & Capabilities

| Category | Highlights |
|----------|------------|
| Specialist Selection | 10 pre-defined specialists, each with welcome prompt, notes, rules & advice. |
| Model-Aware Advice | Claude, OpenAI, Google, Thinking, Standard & Generic categories. |
| Custom Rules Engine | Per-specialist or global rules, editable in-app. |
| Intelligent Suggestions | Prompting techniques, next steps, common patterns, pitfalls to avoid. |
| User Notes | Three 200-character sticky notes per specialist, auto-saved. |
| UI/UX | Draggable, resizable chat window; position memory; responsive design. |
| Persistence | All data stored locally via `chrome.storage`; import/export ready. |
| Popup Access | Quick specialist switch & settings without opening the full UI. |

---

## 4. Usage Guide

1. **Open the Interface**  
   * Click the toolbar icon _or_ press **Alt + P** (Windows/Linux) / **⌥ P** (macOS).

2. **Pick a Specialist & Model**  
   * Use the dropdowns at the top of the window.

3. **Describe Your Task**  
   * Type in the chat box – e.g. “Draft a LinkedIn post announcing our new SaaS launch.”

4. **Review Suggestions**  
   * The assistant responds with prompting tips, next steps and rule-aware guidance.

5. **Iterate**  
   * Adjust your prompt, tweak rules, or add personal notes for future reference.

---

## 5. Development Setup

1. **Folder Structure**
   ```
   ai-prompting-guide-extension/
   ├─ background/       # service-worker (data + messaging)
   ├─ content/          # injected UI JS/CSS
   ├─ popup/            # toolbar popup
   ├─ data/             # JSON knowledge bases
   ├─ images/           # icons
   └─ manifest.json
   ```

2. **Requirements**
   * Chrome ≥ 114 (Manifest V3 support)
   * Node ⬚ (optional) – for linting or bundling if you extend the project.

3. **Live-Reload (optional)**
   * Run `npm install` then `npm run watch` to auto-build assets, and click **Refresh** on chrome://extensions.

---

## 6. Framework for Adding / Editing Specialist Content

All domain knowledge lives in simple JSON files:

* **`data/specialists.json`**  
  ```json
  {
    "id": "marketing-content",
    "name": "Marketing & Content Specialist",
    "icon": "📣",
    "welcomeMessage": "...",
    "placeholderText": "...",
    "defaultPromptingTechniques": [],
    "commonPatterns": [],
    "pitfallAvoidance": [],
    "outputOptimization": []
  }
  ```

* **`data/models.json`** — same idea for model categories.

To add content:

1. Duplicate an existing object, change `id`, `name`, and texts.  
2. Save – the extension hot-loads the new data on next refresh (or use the _Reload_ button in chrome://extensions).  

_No build step required._

---

## 7. Keyboard Shortcuts

| Action | Windows / Linux | macOS |
|--------|-----------------|-------|
| Toggle interface on current page | **Alt + P** | **⌥ P** |
| Open popup | **Ctrl + Shift + P** | **⌘ + Shift + P** |

You can adjust these in `chrome://extensions/shortcuts`.

---

## 8. Future Development Plans

* AI-generated, context-aware responses (OpenAI / Anthropic API integration).  
* Import / export settings ZIP.  
* Team-share rules & notes via secure sync.  
* Site detection for automatic specialist suggestions.  
* Dark mode & custom themes.  

Feel free to open an issue with your ideas!

---

## 9. Contributing Guidelines

1. Fork the repo & create your branch: `git checkout -b feature/my-awesome-thing`  
2. Commit your changes: `git commit -m 'Add awesome thing'`  
3. Push to the branch: `git push origin feature/my-awesome-thing`  
4. Open a pull request describing **why** and **what**.  
5. Follow the existing code style; keep UI accessible and lightweight.  
6. All contributions are reviewed under the **Contributor Covenant** Code of Conduct.

---

## 10. License

MIT License © 2025 AI Factory & Contributors  
See [`LICENSE`](LICENSE) for full text.

Happy prompting! 🚀
