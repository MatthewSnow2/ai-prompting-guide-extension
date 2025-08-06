# AI Prompting Guide

An intelligent, specialist-driven prompting advisor and workflow assistant for anyone working with large-language-models and AI tools.

---

## 1. Project Overview & Purpose
AI Prompting Guide is a Chrome extension that:
* Embeds a chat-style window on any webpage  
* Offers tailored advice from 10 domain specialists (research & analysis, AI solution definition, workflow automation, prompt engineering, voice agents, SaaS planning, website creation, outreach messaging, data-analysis support, documentation writing)  
* Provides model-aware suggestions for Claude, GPT-4o, Gemini, and more  
* Lets you store personal notes and custom rules for consistent, high-quality outputs  

Its goal is to shorten the “prompt → iterate → success” loop when interacting with LLMs, making every AI session faster, clearer, and more effective.

---

## 2. Installation – Chrome

1. Download or clone this repository.  
2. Open **chrome://extensions** in Chrome.  
3. Enable **Developer mode** (top-right switch).  
4. Click **Load unpacked** and select the project’s root folder.  
5. The brain-icon will appear in the toolbar – click it to open the popup.

---

## 3. Core Features & Capabilities

| Category | Highlights |
|----------|------------|
| Specialist Selection | 10 pre-defined specialists (Research & Analysis, AI Solution Definition, Workflow Automation Design, Prompt Engineering, Conversational/Voice Agents, SaaS Product Planning, Website Creation, Client Outreach Messaging, Data Analysis Support, Documentation Writing) — each with welcome prompt, notes, rules & advice. |
| Model-Aware Advice | Claude, OpenAI, Google, Thinking, Standard & Generic categories. |
| Custom Rules Engine | Per-specialist or global rules, editable in-app. |
| Intelligent Suggestions | Prompting techniques, next steps, common patterns, pitfalls to avoid. |
| User Notes | Three 200-character sticky notes per specialist, auto-saved. |
| UI/UX | Draggable, resizable chat window; position memory; responsive design. |
| Persistence | All data stored locally via `chrome.storage`; import/export ready. |
| Popup Access | Quick specialist switch & settings without opening the full UI. |
| Robust Error Handling | Automatic context-loss detection, exponential-back-off recovery and offline fall-backs. |
| LLM Integration Framework | Pluggable connector (OpenAI / Anthropic ready) with short-history prompts and API-key storage. |

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

## 5. Testing the Extension

The repository ships with **`test-extension.html`** – a self-contained page that exercises every feature.

1. Load the extension (see Installation).  
2. Open `test-extension.html` in your browser.  
3. Click **“Check Extension”** – you should see a success banner.  
4. Use **“Manually Initialize Extension”** if the interface is hidden.  
5. Follow on-page instructions to:  
   * Select a specialist & model  
   * Walk through the 7-step Research workflow  
   * Drag, resize, clear chat and close the window  
   * Refresh the page to confirm state persistence  

---

## 6. Troubleshooting

| Symptom | Fix |
|---------|-----|
| Extension icon missing | Ensure Developer-Mode is ON and the folder is still loaded. |
| “Extension context invalid” message | Chrome occasionally unloads service-workers – the guide auto-recovers; otherwise **Reload** the extension from `chrome://extensions`. |
| Empty dropdowns | Check console for JSON parse errors in `data/*.json`; ensure quotes are escaped properly. |
| No LLM responses | Set your API-key in dev-console → `aipg.llmEnabled = true; aipg.llmApiKey='sk-...'`. |

---

## 7. Technical Architecture

```
ai-prompting-guide-extension/
├─ manifest.json           # MV3 definition
├─ background/             # Service-worker – storage & messaging
├─ content/                # content.js – draggable chat UI
├─ popup/                  # lightweight toolbar popup
├─ data/                   # specialists.json, models.json
└─ docs/                   # workflow methodology
```

Key design points:

* **Content Script UI** – rendered in-page, < 30 KB vanilla JS/CSS, themed `#e6f3ff`.
* **Service-Worker** – single source of truth for data & long-lived storage.
* **Message Bus** – `chrome.runtime.sendMessage` with retry / back-off.
* **LLM Adapter** – generic `callLLMAPI()` wrapper (OpenAI schema), history trimmed to 10 turns.
* **Context Recovery** – detects worker invalidation, re-registers listeners, retries failed calls.

---

## 8. Configuration & Customisation

| Option | Where | Notes |
|--------|-------|-------|
| Default size/position | localStorage (`AIPG_prefs`) | Cleared via *Clear Chat*. |
| Enable LLM | Dev-console `aipg.llmEnabled=true` | UI toggle coming soon. |
| API Endpoint / Key | `aipg.llmEndpoint`, `aipg.llmApiKey` | Supports any GPT-style completion endpoint. |
| Specialists & Models | `data/*.json` | Hot-reloaded on refresh. |
| Keyboard Shortcuts | `chrome://extensions/shortcuts` | Change or disable. |

---

## 9. Known Issues & Limitations

* LLM intent-parsing stub is heuristic; complex commands may fall through.  
* No OAuth flow – API-keys are stored only in `localStorage`.  
* Dark-mode styling is basic.  
* Firefox support untested (Manifest V3 parity pending).

---

## 10. Future Roadmap

* ⚡ GUI settings panel to manage API keys and themes.  
* 🌙 Native dark-mode & custom colour palettes.  
* 📦 Import / export zipped configuration & notes.  
* 🤝 Team sync via optional Firebase backend.  
* 🧩 Plugin system for additional workflows / tools.  

---

## 11. Development Setup

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

## 12. Framework for Adding / Editing Specialist Content

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

## 13. Keyboard Shortcuts

| Action | Windows / Linux | macOS |
|--------|-----------------|-------|
| Toggle interface on current page | **Alt + P** | **⌥ P** |
| Open popup | **Ctrl + Shift + P** | **⌘ + Shift + P** |

You can adjust these in `chrome://extensions/shortcuts`.

---

## 14. Development & Git Workflow

This project follows a production-ready Git workflow with automated testing, security scanning, and release management.

### Quick Start for Developers

```bash
# Clone the repository
git clone https://github.com/MatthewSnow2/ai-prompting-guide-extension.git
cd ai-prompting-guide-extension

# Install dependencies
npm install

# Run tests
npm test

# Validate extension
npm run validate

# Format code
npm run format

# Start development
npm run test:watch
```

### Git Workflow Overview

We use **GitHub Flow** with production-ready releases:

- `main` - Production-ready code (protected)
- `feature/*` - Feature development branches
- `hotfix/*` - Critical production fixes

### Commit Message Format

Follow **Conventional Commits** specification:

```bash
git commit -m "feat(popup): add dark mode toggle"
git commit -m "fix(security): resolve XSS vulnerability"
git commit -m "docs: update installation guide"
```

### Quality Gates

Every commit and PR is automatically checked for:

- ✅ **Code Quality** - ESLint, Prettier formatting
- ✅ **Security** - Vulnerability scanning, secret detection
- ✅ **Testing** - Unit, integration, E2E, and security tests
- ✅ **Chrome Extension Compliance** - Manifest validation, permission analysis
- ✅ **Performance** - Memory usage, bundle size monitoring

### Pre-commit Hooks

Automated checks run before each commit:
- Code formatting and linting
- Security scanning
- Unit tests
- Extension manifest validation
- Permission analysis

### Automated Release Process

Releases are automated using semantic versioning:
1. Push commits with conventional commit messages
2. Semantic release analyzes commits and determines version
3. Automated testing runs full test suite
4. Extension package is built and validated
5. GitHub release is created with Chrome Web Store package
6. Security validation and integrity checks complete

### Security Practices

- **Commit Signing** - GPG signatures recommended
- **Secret Scanning** - Pre-commit hooks detect secrets
- **Dependency Updates** - Dependabot auto-updates dependencies
- **Vulnerability Scanning** - CodeQL and security audits
- **Permission Monitoring** - Chrome extension permissions are analyzed

### Testing Strategy

- **Unit Tests** - Individual function testing
- **Integration Tests** - Chrome API integration
- **Security Tests** - XSS prevention, input validation
- **Performance Tests** - Memory usage, DOM impact
- **E2E Tests** - Full user workflow testing

### Available Scripts

```bash
npm run lint          # Lint code
npm run lint:fix      # Fix linting issues
npm run format        # Format code with Prettier
npm run test          # Run all tests
npm run test:unit     # Run unit tests only
npm run test:security # Run security tests
npm run validate      # Validate extension
npm run build         # Full build and validation
npm run package       # Create extension package
```

For detailed workflow information, see [GIT_WORKFLOW.md](GIT_WORKFLOW.md).

---

## 15. Contributing Guidelines

1. Fork the repo & create your branch: `git checkout -b feature/my-awesome-thing`  
2. Commit your changes: `git commit -m 'Add awesome thing'`  
3. Push to the branch: `git push origin feature/my-awesome-thing`  
4. Open a pull request describing **why** and **what**.  
5. Follow the existing code style; keep UI accessible and lightweight.  
6. All contributions are reviewed under the **Contributor Covenant** Code of Conduct.

---

## 16. License

MIT License © 2025 AI Factory & Contributors  
See [`LICENSE`](LICENSE) for full text.

Happy prompting! 🚀
