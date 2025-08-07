class AIPromptingGuide {
  constructor() {
    // Initialize security utilities with fallback
    try {
      this.security = typeof SecurityUtils !== 'undefined' ? new SecurityUtils() : null;
    } catch (e) {
      console.warn('[AIPG] SecurityUtils not available:', e);
      this.security = null;
    }

    // Initialize accessibility utilities with fallback
    try {
      this.accessibility = typeof AccessibilityUtils !== 'undefined' ? new AccessibilityUtils() : null;
    } catch (e) {
      console.warn('[AIPG] AccessibilityUtils not available:', e);
      this.accessibility = null;
    }

    // Initialize storage manager with fallback
    try {
      this.storage = typeof storageManager !== 'undefined' ? storageManager : null;
    } catch (e) {
      console.warn('[AIPG] StorageManager not available:', e);
      this.storage = null;
    }

    // Initialize properties
    this.isVisible = false;
    this.position = { x: 20, y: 20 };
    this.size = { width: 400, height: 600 };
    this.isDragging = false;
    this.isResizing = false;
    this.dragOffset = { x: 0, y: 0 };
    this.specialists = [];
    this.models = [];
    this.currentSpecialist = null;
    this.currentModel = null;
    this.specialistData = null;
    this.workflowActive = false;
    this.currentStep = null;
    this.currentQuestion = null;
    this.stepResponses = {};
    this.awaitingConfirmation = false;
    this.confirmationCallback = null;
    this.customRules = [];
    this.userNotes = {};

    // Progress tracking properties
    this.progressVisible = false;
    this.progressExpanded = false;
    this.stepStates = {}; // stepNumber -> 'not-started', 'in-progress', 'completed'
    this.specialistProgress = {}; // specialist_id -> { stepStates: {}, currentStep: number }
    this.totalSteps = 0;
    this.completedSteps = 0;
    this.contextRecoveryAttempts = 0;
    this.maxRecoveryAttempts = 3;
    this.lastContextValidation = 0;
    this.contextValidationInterval = 60000; // 1 minute
    this.extensionContextValid = true;
    
    // Error recovery system
    this.errorRecoveryState = {
      errorCount: 0,
      lastError: null,
      recoveryAttempts: 0,
      maxErrors: 5,
      recoveryInProgress: false
    };

    // LLM integration properties (required for full functionality)
    this.llmEnabled = false;
    this.llmApiKey = null;
    this.llmProvider = 'openai'; // 'openai', 'anthropic', 'google'
    this.llmModel = 'gpt-4';
    this.llmEndpoint = 'https://api.openai.com/v1/chat/completions';
    this.llmConversationHistory = [];
    this.llmMaxHistoryLength = 10;
    this.llmContext = {};
    this.settingsVisible = false;

    // Event listener cleanup tracking
    this.eventListeners = [];
    this.isDestroyed = false;

    // Onboarding system properties
    this.onboardingActive = false;
    this.onboardingStep = 1;
    this.onboardingCompleted = false;
    this.onboardingData = {
      primaryGoal: '',
      experienceLevel: '',
      industry: '',
      workType: '',
    };
    this.recommendedSpecialist = null;

    // Debounced functions with fallback
    if (this.security && this.security.debounce) {
      this.debouncedSendMessage = this.security.debounce(
        this.handleSendMessage.bind(this),
        300
      );
    } else {
      // Simple fallback debounce implementation
      let timeout;
      this.debouncedSendMessage = (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => this.handleSendMessage.apply(this, args), 300);
      };
    }

    // Create utility methods for fallback operations
    this.safeStorageGet = async (key, fallback = null) => {
      try {
        if (this.storage && this.storage.getItem) {
          return await this.storage.getItem(key);
        } else {
          return localStorage.getItem(key) || fallback;
        }
      } catch (e) {
        console.warn(`[AIPG] Storage get failed for ${key}:`, e);
        return fallback;
      }
    };

    this.safeStorageSet = async (key, value) => {
      try {
        if (this.storage && this.storage.setItem) {
          return await this.storage.setItem(key, value);
        } else {
          localStorage.setItem(key, value);
          return true;
        }
      } catch (e) {
        console.warn(`[AIPG] Storage set failed for ${key}:`, e);
        return false;
      }
    };

    // Bind methods to this
    this.initialize = this.initialize.bind(this);
    this.createInterface = this.createInterface.bind(this);
    this.toggleVisibility = this.toggleVisibility.bind(this);
    this.handleDragStart = this.handleDragStart.bind(this);
    this.handleDrag = this.handleDrag.bind(this);
    this.handleDragEnd = this.handleDragEnd.bind(this);
    this.handleResizeStart = this.handleResizeStart.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.handleResizeEnd = this.handleResizeEnd.bind(this);
    this.handleSendMessage = this.handleSendMessage.bind(this);
    this.loadSpecialists = this.loadSpecialists.bind(this);
    this.loadModels = this.loadModels.bind(this);
    this.handleSpecialistChange = this.handleSpecialistChange.bind(this);
    this.handleModelChange = this.handleModelChange.bind(this);
    this.generateResponse = this.generateResponse.bind(this);
    this.startWorkflow = this.startWorkflow.bind(this);
    this.displayCurrentStep = this.displayCurrentStep.bind(this);
    this.moveToNextStep = this.moveToNextStep.bind(this);
    this.collectStepResponse = this.collectStepResponse.bind(this);
    this.handleWorkflowResponse = this.handleWorkflowResponse.bind(this);
    this.isStepComplete = this.isStepComplete.bind(this);

    // Progress system method bindings
    this.initializeProgress = this.initializeProgress.bind(this);
    this.updateStepStatus = this.updateStepStatus.bind(this);
    this.renderProgressIndicator = this.renderProgressIndicator.bind(this);
    this.renderStepOverview = this.renderStepOverview.bind(this);
    this.toggleProgressOverview = this.toggleProgressOverview.bind(this);
    this.handleStepClick = this.handleStepClick.bind(this);
    this.getSpecialistStepCount = this.getSpecialistStepCount.bind(this);
    this.calculateProgress = this.calculateProgress.bind(this);
    this.saveProgressToStorage = this.saveProgressToStorage.bind(this);
    this.loadProgressFromStorage = this.loadProgressFromStorage.bind(this);
    this.generateFinalPrompt = this.generateFinalPrompt.bind(this);
    this.isExtensionContextValid = this.isExtensionContextValid.bind(this);
    this.validateExtensionContext = this.validateExtensionContext.bind(this);
    this.attemptContextRecovery = this.attemptContextRecovery.bind(this);
    this.sendMessageWithRetry = this.sendMessageWithRetry.bind(this);
    this.clearChat = this.clearChat.bind(this);
    this.closeInterface = this.closeInterface.bind(this);
    this.showSettings = this.showSettings.bind(this);
    this.hideSettings = this.hideSettings.bind(this);
    this.testConnection = this.testConnection.bind(this);
    this.saveSettings = this.saveSettings.bind(this);
    this.cleanup = this.cleanup.bind(this);
    this.addEventListenerTracked = this.addEventListenerTracked.bind(this);

    // Onboarding method bindings
    this.startOnboarding = this.startOnboarding.bind(this);
    this.createOnboardingInterface = this.createOnboardingInterface.bind(this);
    this.showOnboardingStep = this.showOnboardingStep.bind(this);
    this.handleOnboardingNext = this.handleOnboardingNext.bind(this);
    this.handleOnboardingBack = this.handleOnboardingBack.bind(this);
    this.handleOnboardingSkip = this.handleOnboardingSkip.bind(this);
    this.calculateSpecialistRecommendation =
      this.calculateSpecialistRecommendation.bind(this);
    this.completeOnboarding = this.completeOnboarding.bind(this);
    this.saveOnboardingProgress = this.saveOnboardingProgress.bind(this);
    this.loadOnboardingProgress = this.loadOnboardingProgress.bind(this);
    this.restartOnboarding = this.restartOnboarding.bind(this);
  }

  /**
   * Add event listener and track for cleanup
   * @param {Element} element - Element to add listener to
   * @param {string} event - Event type
   * @param {Function} handler - Event handler
   * @param {boolean|object} options - Event options
   */
  addEventListenerTracked(element, event, handler, options = false) {
    if (!element || this.isDestroyed) return;

    element.addEventListener(event, handler, options);
    this.eventListeners.push({ element, event, handler, options });
  }

  /**
   * Clean up all event listeners and resources
   */
  cleanup() {
    if (this.isDestroyed) return;

    console.log('[AIPG] Cleaning up event listeners and resources');
    this.isDestroyed = true;

    // Remove all tracked event listeners
    this.eventListeners.forEach(({ element, event, handler, options }) => {
      try {
        element.removeEventListener(event, handler, options);
      } catch (error) {
        console.warn('[AIPG] Failed to remove event listener:', error);
      }
    });
    this.eventListeners = [];

    // Remove interface from DOM
    const container = document.getElementById('ai-prompting-guide-container');
    if (container) {
      container.remove();
    }

    // Clear any timeouts/intervals
    if (this.contextValidationInterval) {
      clearInterval(this.contextValidationInterval);
    }
  }

  /**
   * Initialize the AI Prompting Guide (runs ONCE on first load)
   */
  async initialize() {
    console.log('[AIPG] Initializing AI Prompting Guide …');

    /* ------------------------------------------------------------
     * 0. Initialize storage system first
     * ------------------------------------------------------------ */
    const storageReady = await this.initializeStorage();
    if (!storageReady) {
      console.warn(
        '[AIPG] Storage initialization failed, continuing with limited functionality'
      );
    }

    /* ------------------------------------------------------------
     * 1. Check onboarding status
     * ------------------------------------------------------------ */
    await this.loadOnboardingProgress();

    /* ------------------------------------------------------------
     * 2. Load persisted user data (prefs / notes) before UI build
     * ------------------------------------------------------------ */
    await this.loadUserPreferences();
    await this.loadUserNotes();

    // Load progress data (will be used when specialist is selected)
    this.loadProgressFromStorage();

    /* ------------------------------------------------------------
     * 3. Create the interface (only if it does not already exist)
     * ------------------------------------------------------------ */
    if (!document.getElementById('ai-prompting-guide-container')) {
      this.createInterface();
    }

    /* ------------------------------------------------------------
     * 2a. Check if we're on an LLM site - only activate extension on LLM sites
     * ------------------------------------------------------------ */
    if (!this.isLLMSite()) {
      console.log('[AIPG] Not on an LLM site, skipping initialization');
      return;
    }

    /* ------------------------------------------------------------
     * 2b. Show onboarding if first time user
     * ------------------------------------------------------------ */
    if (!this.onboardingCompleted) {
      this.startOnboarding();
      return; // Skip normal initialization until onboarding is complete
    }

    /* ------------------------------------------------------------
     * 3. Populate dropdowns
     * ------------------------------------------------------------ */
    await this.loadSpecialists();
    await this.loadModels();

    /* ------------------------------------------------------------
     * 4. Load LLM settings
     * ------------------------------------------------------------ */
    await this.loadLLMSettings();
    
    // Initialize LLM Request Manager after settings are loaded
    if (typeof LLMRequestManager !== 'undefined') {
      this.llmRequestManager = new LLMRequestManager(this);
    }

    /* ------------------------------------------------------------
     * 5. Validate extension context (fire & forget)
     * ------------------------------------------------------------ */
    this.validateExtensionContext();

    /* ------------------------------------------------------------
     * 6. Apply visibility from saved prefs
     * ------------------------------------------------------------ */
    const container = document.getElementById('ai-prompting-guide-container');
    if (container) {
      container.style.display = this.isVisible ? 'flex' : 'none';
    }

    console.log('[AIPG] Initialization complete');
  }

  /* --------------------------------------------------------------
   * Interface builder  (extracted unchanged from previous code)
   * -------------------------------------------------------------- */
  createInterface() {
    // Create skip link for keyboard navigation with fallback
    if (this.accessibility && this.accessibility.createSkipLink) {
      const skipLink = this.accessibility.createSkipLink(
        'ai-prompting-guide-main',
        'Skip to AI Guide main content'
      );
      document.body.insertBefore(skipLink, document.body.firstChild);
    }

    // Create container with accessibility attributes
    const container = document.createElement('div');
    container.id = 'ai-prompting-guide-container';

    // Add comprehensive ARIA attributes
    // Add ARIA labels with fallback
    if (this.accessibility && this.accessibility.addAriaLabel) {
      this.accessibility.addAriaLabel(container, {
        role: 'application',
        label: 'AI Prompting Guide Assistant Interface',
        describedBy: 'ai-guide-description',
      });
    } else {
      // Fallback ARIA attributes
      container.setAttribute('role', 'application');
      container.setAttribute('aria-label', 'AI Prompting Guide Assistant Interface');
      container.setAttribute('aria-describedby', 'ai-guide-description');
    }

    container.style.position = 'fixed';
    container.style.top = `${this.position.y}px`;
    container.style.left = `${this.position.x}px`;
    container.style.width = `${this.size.width}px`;
    container.style.height = `${this.size.height}px`;
    container.style.backgroundColor = '#e6f3ff'; // Light blue background
    container.style.border = '1px solid #ccc';
    container.style.borderRadius = '8px';
    container.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
    container.style.zIndex = '9999';
    container.style.fontFamily = 'Arial, sans-serif';
    container.style.display = this.isVisible ? 'flex' : 'none';
    container.style.flexDirection = 'column';
    container.style.overflow = 'hidden';

    // Add hidden description for screen readers
    const description = document.createElement('div');
    description.id = 'ai-guide-description';
    description.className = 'sr-only';
    description.textContent =
      'Interactive AI prompting assistant with specialist guidance, workflow management, and chat interface. Use Tab to navigate, Escape to close.';
    container.appendChild(description);

    // Create header with accessibility
    const header = document.createElement('header');
    this.accessibility.addAriaLabel(header, {
      role: 'banner',
      label: 'AI Prompting Guide Header',
    });

    header.style.padding = '10px';
    header.style.backgroundColor = '#3498db';
    header.style.color = 'white';
    header.style.fontWeight = 'bold';
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.cursor = 'move';
    header.style.flexShrink = '0'; // Prevent header from shrinking

    // Create title with proper heading structure
    const title = document.createElement('h1');
    title.textContent = 'AI Prompting Guide';
    title.style.margin = '0';
    title.style.fontSize = '14px';
    title.style.fontWeight = 'bold';
    header.appendChild(title);

    // Add event listeners for dragging with keyboard support
    this.addEventListenerTracked(header, 'mousedown', this.handleDragStart);
    this.addEventListenerTracked(header, 'keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        // Enable keyboard dragging mode
        header.setAttribute('data-keyboard-drag', 'true');
        this.accessibility.announceToScreenReader(
          'Drag mode activated. Use arrow keys to move, Escape to cancel, Enter to confirm position.'
        );
      }
    });
    this.addEventListenerTracked(document, 'mousemove', this.handleDrag);
    this.addEventListenerTracked(document, 'mouseup', this.handleDragEnd);

    // Create close button with accessibility
    const closeButton = document.createElement('button');
    this.accessibility.addAriaLabel(closeButton, {
      label: 'Close AI Prompting Guide',
      describedBy: 'close-btn-desc',
    });

    closeButton.innerText = '×';
    closeButton.type = 'button';
    closeButton.style.backgroundColor = '#3498db';
    closeButton.style.color = 'white';
    closeButton.style.border = '1px solid white';
    closeButton.style.borderRadius = '50%';
    closeButton.style.width = '20px';
    closeButton.style.height = '20px';
    closeButton.style.display = 'flex';
    closeButton.style.justifyContent = 'center';
    closeButton.style.alignItems = 'center';
    closeButton.style.cursor = 'pointer';
    closeButton.style.fontWeight = 'bold';
    closeButton.style.fontSize = '12px';
    closeButton.style.padding = '0';

    // Add hidden description for close button
    const closeDesc = document.createElement('span');
    closeDesc.id = 'close-btn-desc';
    closeDesc.className = 'sr-only';
    closeDesc.textContent =
      'Closes the AI Prompting Guide interface and returns focus to the page';
    closeButton.appendChild(closeDesc);

    this.addEventListenerTracked(closeButton, 'click', this.closeInterface);

    // Add close button to header
    header.appendChild(closeButton);

    // Create dropdown container
    const dropdownContainer = document.createElement('div');
    dropdownContainer.style.padding = '10px';
    dropdownContainer.style.display = 'flex';
    dropdownContainer.style.justifyContent = 'space-between';
    dropdownContainer.style.backgroundColor = '#f5f5f5';
    dropdownContainer.style.flexShrink = '0'; // Prevent dropdown area from shrinking

    // Create specialist dropdown
    const specialistContainer = document.createElement('div');
    specialistContainer.style.flex = '1';
    specialistContainer.style.marginRight = '5px';

    const specialistLabel = document.createElement('label');
    specialistLabel.htmlFor = 'ai-prompting-guide-specialist';
    specialistLabel.innerText = 'Specialist:';
    specialistLabel.style.display = 'block';
    specialistLabel.style.marginBottom = '5px';
    specialistLabel.style.fontSize = '12px';

    const specialistDropdown = document.createElement('select');
    specialistDropdown.id = 'ai-prompting-guide-specialist';
    this.accessibility.addAriaLabel(specialistDropdown, {
      describedBy: 'specialist-help',
      states: { expanded: false },
    });

    specialistDropdown.style.width = '100%';
    specialistDropdown.style.padding = '5px';

    // Add help text for screen readers
    const specialistHelp = document.createElement('div');
    specialistHelp.id = 'specialist-help';
    specialistHelp.className = 'sr-only';
    specialistHelp.textContent =
      'Select an AI specialist to guide your workflow. Each specialist provides tailored prompting techniques and step-by-step guidance.';

    this.addEventListenerTracked(specialistDropdown, 'change', e => {
      this.handleSpecialistChange(e);
      // Announce selection to screen reader
      const selectedText = e.target.options[e.target.selectedIndex].text;
      this.accessibility.announceToScreenReader(
        `Selected specialist: ${selectedText}`
      );
    });

    specialistContainer.appendChild(specialistLabel);
    specialistContainer.appendChild(specialistDropdown);
    specialistContainer.appendChild(specialistHelp);

    // Create model dropdown
    const modelContainer = document.createElement('div');
    modelContainer.style.flex = '1';
    modelContainer.style.marginLeft = '5px';

    const modelLabel = document.createElement('label');
    modelLabel.htmlFor = 'ai-prompting-guide-model';
    modelLabel.innerText = 'Model:';
    modelLabel.style.display = 'block';
    modelLabel.style.marginBottom = '5px';
    modelLabel.style.fontSize = '12px';

    const modelDropdown = document.createElement('select');
    modelDropdown.id = 'ai-prompting-guide-model';
    this.accessibility.addAriaLabel(modelDropdown, {
      describedBy: 'model-help',
      states: { expanded: false },
    });

    modelDropdown.style.width = '100%';
    modelDropdown.style.padding = '5px';

    // Add help text for screen readers
    const modelHelp = document.createElement('div');
    modelHelp.id = 'model-help';
    modelHelp.className = 'sr-only';
    modelHelp.textContent =
      'Choose the AI model for generating responses. Different models have varying capabilities and response styles.';

    this.addEventListenerTracked(modelDropdown, 'change', e => {
      this.handleModelChange(e);
      // Announce selection to screen reader
      const selectedText = e.target.options[e.target.selectedIndex].text;
      this.accessibility.announceToScreenReader(
        `Selected model: ${selectedText}`
      );
    });

    modelContainer.appendChild(modelLabel);
    modelContainer.appendChild(modelDropdown);
    modelContainer.appendChild(modelHelp);

    // Add dropdowns to dropdown container
    dropdownContainer.appendChild(specialistContainer);
    dropdownContainer.appendChild(modelContainer);

    // Create main content area with accessibility
    const mainContent = document.createElement('main');
    mainContent.id = 'ai-prompting-guide-main';
    mainContent.style.flex = '1';
    mainContent.style.display = 'flex';
    mainContent.style.flexDirection = 'column';
    mainContent.style.minHeight = '0'; // Critical for flex child to shrink
    mainContent.style.overflow = 'hidden'; // Prevent overflow from mainContent itself
    this.accessibility.addAriaLabel(mainContent, {
      role: 'main',
      label: 'Chat conversation area',
    });

    // Create messages container with ARIA live region
    const messagesContainer = document.createElement('div');
    messagesContainer.id = 'ai-prompting-guide-messages';
    this.accessibility.addAriaLabel(messagesContainer, {
      role: 'log',
      label: 'Chat messages',
      describedBy: 'messages-help',
      states: { live: 'polite', atomic: false },
    });

    messagesContainer.style.flex = '1';
    messagesContainer.style.overflowY = 'auto';
    messagesContainer.style.padding = '10px';
    messagesContainer.style.backgroundColor = '#fff';
    messagesContainer.style.minHeight = '0'; // Critical for flex shrinking

    // Add help text for messages area
    const messagesHelp = document.createElement('div');
    messagesHelp.id = 'messages-help';
    messagesHelp.className = 'sr-only';
    messagesHelp.textContent =
      'Conversation history between you and the AI assistant. New messages will be announced automatically.';
    messagesContainer.appendChild(messagesHelp);

    // Create input container with accessibility
    const inputContainer = document.createElement('form');
    this.accessibility.addAriaLabel(inputContainer, {
      role: 'form',
      labelledBy: 'input-heading',
    });

    inputContainer.style.padding = '10px';
    inputContainer.style.borderTop = '1px solid #ccc';
    inputContainer.style.display = 'flex';
    inputContainer.style.flexShrink = '0'; // Prevent input area from shrinking

    // Add form heading for screen readers
    const inputHeading = document.createElement('h3');
    inputHeading.id = 'input-heading';
    inputHeading.textContent = 'Message Input';
    inputHeading.className = 'sr-only';
    inputContainer.appendChild(inputHeading);

    // Create text input with accessibility
    const textInput = document.createElement('input');
    textInput.id = 'ai-prompting-guide-input';
    textInput.type = 'text';
    textInput.placeholder = 'Type your message...';
    this.accessibility.addAriaLabel(textInput, {
      label: 'Message to AI assistant',
      describedBy: 'input-help',
      states: { required: false, multiline: false },
    });

    textInput.style.flex = '1';
    textInput.style.padding = '8px';
    textInput.style.border = '1px solid #ccc';
    textInput.style.borderRadius = '4px';
    textInput.style.marginRight = '5px';

    // Add input help text
    const inputHelp = document.createElement('div');
    inputHelp.id = 'input-help';
    inputHelp.className = 'sr-only';
    inputHelp.textContent =
      'Type your message or question for the AI assistant. Press Enter to send, or use the Send button.';

    const handleKeydown = e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        // SECURITY FIX: Use debounced send message to prevent spam
        this.debouncedSendMessage();
      }
    };
    this.addEventListenerTracked(textInput, 'keydown', handleKeydown);

    // Create send button with accessibility
    const sendButton = document.createElement('button');
    sendButton.type = 'submit';
    sendButton.innerText = 'Send';
    this.accessibility.addAriaLabel(sendButton, {
      label: 'Send message to AI assistant',
      describedBy: 'send-help',
    });

    sendButton.style.padding = '8px 12px';
    sendButton.style.backgroundColor = '#3498db';
    sendButton.style.color = 'white';
    sendButton.style.border = 'none';
    sendButton.style.borderRadius = '4px';
    sendButton.style.cursor = 'pointer';

    // Add send button help text
    const sendHelp = document.createElement('span');
    sendHelp.id = 'send-help';
    sendHelp.className = 'sr-only';
    sendHelp.textContent =
      'Sends your message to the AI assistant for processing and response';
    sendButton.appendChild(sendHelp);

    // Handle form submission
    this.addEventListenerTracked(inputContainer, 'submit', e => {
      e.preventDefault();
      this.debouncedSendMessage();
    });

    this.addEventListenerTracked(sendButton, 'click', e => {
      e.preventDefault();
      this.debouncedSendMessage();
    });

    // Add elements to input container
    inputContainer.appendChild(textInput);
    inputContainer.appendChild(sendButton);
    inputContainer.appendChild(inputHelp);

    // Create button container
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '5px';
    buttonContainer.style.marginTop = '5px';

    // Create clear chat button with accessibility
    const clearButton = document.createElement('button');
    clearButton.type = 'button';
    clearButton.innerText = 'Clear Chat';
    this.accessibility.addAriaLabel(clearButton, {
      label: 'Clear chat conversation',
      describedBy: 'clear-help',
    });

    clearButton.style.padding = '8px 12px';
    clearButton.style.backgroundColor = '#e74c3c';
    clearButton.style.color = 'white';
    clearButton.style.border = 'none';
    clearButton.style.borderRadius = '4px';
    clearButton.style.cursor = 'pointer';
    clearButton.style.flex = '1';

    // Add help text for clear button
    const clearHelp = document.createElement('span');
    clearHelp.id = 'clear-help';
    clearHelp.className = 'sr-only';
    clearHelp.textContent =
      'Removes all messages from the current conversation history';
    clearButton.appendChild(clearHelp);

    this.addEventListenerTracked(clearButton, 'click', e => {
      this.clearChat(e);
      this.accessibility.announceToScreenReader('Chat conversation cleared');
    });

    // Create settings button with accessibility
    const settingsButton = document.createElement('button');
    settingsButton.type = 'button';
    settingsButton.innerHTML =
      '<span aria-hidden="true">⚙️</span><span class="sr-only">Settings</span>';
    this.accessibility.addAriaLabel(settingsButton, {
      label: 'Open settings for LLM integration',
      describedBy: 'settings-help',
    });

    settingsButton.style.padding = '8px 12px';
    settingsButton.style.backgroundColor = '#95a5a6';
    settingsButton.style.color = 'white';
    settingsButton.style.border = 'none';
    settingsButton.style.borderRadius = '4px';
    settingsButton.style.cursor = 'pointer';
    settingsButton.style.width = '40px';

    // Add help text for settings button
    const settingsHelp = document.createElement('span');
    settingsHelp.id = 'settings-help';
    settingsHelp.className = 'sr-only';
    settingsHelp.textContent =
      'Configure API keys and advanced LLM integration settings';
    settingsButton.appendChild(settingsHelp);

    this.addEventListenerTracked(settingsButton, 'click', this.showSettings);

    buttonContainer.appendChild(clearButton);
    buttonContainer.appendChild(settingsButton);

    // Create resize handle
    const resizeHandle = document.createElement('div');
    resizeHandle.style.position = 'absolute';
    resizeHandle.style.bottom = '0';
    resizeHandle.style.right = '0';
    resizeHandle.style.width = '10px';
    resizeHandle.style.height = '10px';
    resizeHandle.style.cursor = 'nwse-resize';
    resizeHandle.style.backgroundColor = '#ccc';

    // Add event listeners for resizing
    this.addEventListenerTracked(
      resizeHandle,
      'mousedown',
      this.handleResizeStart
    );
    this.addEventListenerTracked(document, 'mousemove', this.handleResize);
    this.addEventListenerTracked(document, 'mouseup', this.handleResizeEnd);

    // Create chat container wrapper (CRITICAL FIX: This was missing!)
    const chatContainer = document.createElement('div');
    chatContainer.className = 'ai-prompting-guide-chat';
    chatContainer.style.flex = '1';
    chatContainer.style.display = 'flex';
    chatContainer.style.flexDirection = 'column';
    chatContainer.style.minHeight = '0'; // Critical for flex child to shrink
    chatContainer.style.overflow = 'hidden'; // Prevent overflow from chat container
    chatContainer.appendChild(messagesContainer);

    // Assemble the main content area
    mainContent.appendChild(chatContainer);

    // Add all elements to container
    container.appendChild(header);
    container.appendChild(dropdownContainer);
    container.appendChild(mainContent);
    container.appendChild(inputContainer);
    container.appendChild(buttonContainer);
    container.appendChild(resizeHandle);

    // Set up keyboard navigation and focus management
    this.setupKeyboardNavigation(container);

    // Add escape key handler for closing interface
    document.addEventListener('ai-guide-escape', e => {
      if (this.isVisible) {
        this.closeInterface();
        e.stopPropagation();
      }
    });

    // Add container to document
    document.body.appendChild(container);

    // Add welcome message with accessibility
    this.addAssistantMessage(
      'Welcome to AI Prompting Guide! Please configure your LLM settings using the settings button and select a specialist to get started. Use Tab to navigate between controls.'
    );

    // Announce interface availability to screen readers
    this.accessibility.announceToScreenReader(
      'AI Prompting Guide interface is now available. Use Tab to navigate, Escape to close.',
      false,
      500
    );
  }

  /**
   * Setup keyboard navigation for the interface
   * @param {Element} container - The main container element
   */
  setupKeyboardNavigation(container) {
    // Get all focusable elements in order
    const updateFocusableElements = () => {
      this.focusableElements =
        this.accessibility.getFocusableElements(container);
    };

    // Initial setup
    updateFocusableElements();

    // Set up keyboard event handling for the container
    this.addEventListenerTracked(container, 'keydown', e => {
      // Update focusable elements in case DOM has changed
      updateFocusableElements();

      const currentIndex = this.focusableElements.indexOf(
        document.activeElement
      );

      switch (e.key) {
        case 'Tab':
          // Let browser handle normal tab navigation
          // Just update our internal tracking
          setTimeout(updateFocusableElements, 10);
          break;

        case 'Escape':
          e.preventDefault();
          e.stopPropagation();
          this.closeInterface();
          break;

        case 'F1':
          e.preventDefault();
          this.showHelpDialog();
          break;

        case 'ArrowUp':
        case 'ArrowDown':
          // Arrow key navigation for dropdowns and lists
          if (e.target.tagName === 'SELECT') {
            // Let browser handle select navigation
            return;
          }

          if (currentIndex !== -1) {
            e.preventDefault();
            const nextIndex =
              e.key === 'ArrowUp'
                ? Math.max(0, currentIndex - 1)
                : Math.min(this.focusableElements.length - 1, currentIndex + 1);

            if (this.focusableElements[nextIndex]) {
              this.accessibility.manageFocus(this.focusableElements[nextIndex]);
            }
          }
          break;

        case 'Home':
          if (currentIndex !== -1 && this.focusableElements.length > 0) {
            e.preventDefault();
            this.accessibility.manageFocus(this.focusableElements[0]);
          }
          break;

        case 'End':
          if (currentIndex !== -1 && this.focusableElements.length > 0) {
            e.preventDefault();
            this.accessibility.manageFocus(
              this.focusableElements[this.focusableElements.length - 1]
            );
          }
          break;
      }
    });

    // Set up focus trap when interface becomes visible
    if (this.isVisible) {
      this.accessibility.trapKeyboardFocus(container);
    }
  }

  /**
   * Show help dialog for accessibility
   */
  showHelpDialog() {
    const helpText = `AI Prompting Guide Keyboard Shortcuts:
    
Navigation:
- Tab/Shift+Tab: Navigate between controls
- Arrow Up/Down: Navigate through focusable elements
- Home/End: Jump to first/last control
- Escape: Close interface
- F1: Show this help

Interface:
- Enter: Activate buttons or send message
- Space: Activate buttons or toggle switches
- Alt+P: Toggle interface (global shortcut)
- Ctrl+Shift+P: Open popup (global shortcut)

Tips:
- Use Tab to move through all controls
- Screen reader users will hear descriptions for all elements
- All functionality is available via keyboard`;

    this.accessibility.announceToScreenReader(helpText);

    // You could also create a modal dialog here
    alert(helpText);
  }

  /**
   * Toggle visibility of the interface
   */
  toggleVisibility(preSelectedSpecialist = null) {
    this.isVisible = !this.isVisible;

    const container = document.getElementById('ai-prompting-guide-container');
    if (container) {
      container.style.display = this.isVisible ? 'flex' : 'none';
    }

    // If pre-selected specialist is provided and interface is now visible
    if (preSelectedSpecialist && this.isVisible) {
      this.setSpecialistFromPopup(preSelectedSpecialist);
    }

    // Persist preference
    this.saveUserPreferencesSync();

    // If we have never validated the context, do it now (async)
    if (this.lastContextValidation === 0) {
      this.validateExtensionContext();
    }

    return this.extensionContextValid;
  }

  /**
   * Set specialist from popup selection (no duplicate prompt)
   */
  async setSpecialistFromPopup(specialistId) {
    // Find specialist by ID in the loaded specialists
    const specialist = this.specialists.find(s => s.id === specialistId);
    if (!specialist) {
      console.warn(`[AIPG] Specialist with ID ${specialistId} not found`);
      return;
    }

    // Set the specialist directly
    this.currentSpecialist = specialist.name;
    this.specialistData = specialist;

    // Update dropdown if it exists
    const specialistDropdown = document.getElementById(
      'ai-prompting-guide-specialist'
    );
    if (specialistDropdown) {
      specialistDropdown.value = specialist.name;
    }

    // Load session data for this specialist
    await this.loadSessionData();

    // Clear previous messages and show appropriate message
    const messagesContainer = document.getElementById(
      'ai-prompting-guide-messages'
    );
    if (messagesContainer) {
      messagesContainer.innerHTML = '';

      // Check if there's an active workflow to restore
      if (this.workflowActive && this.currentStep) {
        this.addAssistantMessage(
          `<div style="background: #fff3cd; padding: 10px; border-radius: 5px; border-left: 4px solid #ffc107; margin: 10px 0;">` +
            `<strong>🔄 Session Restored!</strong><br><br>` +
            `I found your previous ${specialist.name} session in progress.<br>` +
            `You were on <strong>Step ${this.currentStep} of 7</strong>.<br><br>` +
            `Would you like to continue where you left off or start fresh?<br><br>` +
            `• Type "<em>continue</em>" to resume your progress<br>` +
            `• Type "<em>start over</em>" to begin a new workflow` +
            `</div>`
        );
      } else {
        // No previous session, show welcome message
        this.addAssistantMessage(
          specialist.welcomeMessage ||
            `Welcome! I'm your ${specialist.name} coach. Let's get started.`
        );

        // Auto-start workflow for any specialist with defined techniques
        if (
          specialist.defaultPromptingTechniques &&
          specialist.defaultPromptingTechniques.length > 0
        ) {
          setTimeout(() => {
            this.startWorkflow();
          }, 1000);
        }
      }
    }

    // Save preferences
    this.saveUserPreferencesSync();
  }

  /**
   * Close the interface completely (remove from DOM)
   */
  closeInterface() {
    const container = document.getElementById('ai-prompting-guide-container');
    if (container) {
      container.remove();
    }
  }

  /**
   * Handle drag start event
   */
  handleDragStart(e) {
    if (e.target.tagName.toLowerCase() === 'button') return;

    this.isDragging = true;
    const container = document.getElementById('ai-prompting-guide-container');
    const rect = container.getBoundingClientRect();
    this.dragOffset = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    e.preventDefault();
  }

  /**
   * Handle drag event
   */
  handleDrag(e) {
    if (!this.isDragging) return;

    const container = document.getElementById('ai-prompting-guide-container');
    const newX = e.clientX - this.dragOffset.x;
    const newY = e.clientY - this.dragOffset.y;

    container.style.left = `${newX}px`;
    container.style.top = `${newY}px`;

    this.position = { x: newX, y: newY };

    e.preventDefault();
  }

  /**
   * Handle drag end event
   */
  handleDragEnd() {
    this.isDragging = false;

    // Save user preferences
    this.saveUserPreferencesSync();
  }

  /**
   * Handle resize start event
   */
  handleResizeStart(e) {
    this.isResizing = true;
    e.preventDefault();
  }

  /**
   * Handle resize event
   */
  handleResize(e) {
    if (!this.isResizing) return;

    const container = document.getElementById('ai-prompting-guide-container');
    const rect = container.getBoundingClientRect();
    const newWidth = e.clientX - rect.left;
    const newHeight = e.clientY - rect.top;

    if (newWidth >= 300 && newHeight >= 400) {
      container.style.width = `${newWidth}px`;
      container.style.height = `${newHeight}px`;

      this.size = { width: newWidth, height: newHeight };
    }

    e.preventDefault();
  }

  /**
   * Handle resize end event
   */
  handleResizeEnd() {
    this.isResizing = false;

    // Save user preferences
    this.saveUserPreferencesSync();
  }

  /**
   * Clear the chat messages
   */
  clearChat() {
    const messagesContainer = document.getElementById(
      'ai-prompting-guide-messages'
    );
    if (messagesContainer) {
      // Remove all messages
      messagesContainer.innerHTML = '';

      // Add welcome message back
      if (this.currentSpecialist && this.specialistData) {
        this.addAssistantMessage(
          this.specialistData.welcomeMessage ||
            `Welcome to AI Prompting Guide! I'm your ${this.currentSpecialist} coach.`
        );
      } else {
        this.addAssistantMessage(
          'Welcome to AI Prompting Guide! Please select a specialist to get started. The model selection helps optimize your final prompt but is optional for the basic workflow.'
        );
      }

      // Reset workflow state
      this.workflowActive = false;
      this.currentStep = null;
      this.currentQuestion = null;
      this.stepResponses = {};
      this.awaitingConfirmation = false;
      this.confirmationCallback = null;

      // Reset LLM conversation history
      this.llmConversationHistory = [];

      // Clear session data
      this.clearSessionDataSync();
    }
  }

  /**
   * Handle send message event
   */
  async handleSendMessage() {
    const textInput = document.getElementById('ai-prompting-guide-input');
    if (!textInput) return;

    const userMessage = textInput.value.trim();
    if (!userMessage) return;

    // Clear input
    textInput.value = '';

    // Add user message to chat
    const messagesContainer = document.getElementById(
      'ai-prompting-guide-messages'
    );
    if (messagesContainer) {
      const msg = document.createElement('div');
      msg.className = 'ai-prompting-guide-message user';
      msg.textContent = userMessage;
      msg.style.backgroundColor = '#dcf8c6';
      msg.style.padding = '10px';
      msg.style.borderRadius = '5px';
      msg.style.marginBottom = '10px';
      msg.style.alignSelf = 'flex-end';
      msg.style.maxWidth = '80%';

      messagesContainer.appendChild(msg);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Add to LLM conversation history
    this.llmConversationHistory.push({ role: 'user', content: userMessage });

    // Limit conversation history length
    if (this.llmConversationHistory.length > this.llmMaxHistoryLength * 2) {
      this.llmConversationHistory = this.llmConversationHistory.slice(
        -this.llmMaxHistoryLength
      );
    }

    // Process the message and generate a response
    this.generateResponse(userMessage);
  }

  /**
   * Load specialists from the background script
   */
  async loadSpecialists() {
    try {
      console.log('[AIPG] Loading specialists...');

      // Use the retry-enabled message sender
      const response = await this.sendMessageWithRetry({
        action: 'getSpecialists',
      });

      if (
        response &&
        response.specialists &&
        response.specialists.length > 0 &&
        !response.fallback
      ) {
        console.log(
          '[AIPG] Received specialists data:',
          response.specialists.length,
          'specialists'
        );
        this.specialists = response.specialists;
      } else {
        console.warn('[AIPG] Using fallback specialists due to communication issues');
        // Use enhanced fallback specialists with proper structure
        this.specialists = [
          {
            id: 'research-analysis',
            name: 'Research & Analysis',
            description:
              'Background studies, competitor research, insights extraction',
            welcomeMessage:
              "🔬 Research & Analysis Coach activated! I'll guide you through a 7-step process to conduct focused, actionable research.",
            icon: '🔍',
            defaultPromptingTechniques: [
              {
                step: 1,
                title: 'Define Research Scope & Questions',
                description:
                  'Establish research parameters and 5-7 key questions',
              },
              {
                step: 2,
                title: 'Gather Raw Data',
                description: 'Collect information from web sources & APIs',
              },
              {
                step: 3,
                title: 'Summarize & Extract Key Insights',
                description: 'Process and structure collected information',
              },
              {
                step: 4,
                title: 'Analyze Competitors & Market Landscape',
                description: 'Evaluate competitive environment and positioning',
              },
              {
                step: 5,
                title: 'Identify Market Gaps & Opportunities',
                description: 'Discover unmet needs and potential solutions',
              },
              {
                step: 6,
                title: 'Validate Findings with Data & Visualization',
                description: 'Support insights with quantitative analysis',
              },
              {
                step: 7,
                title: 'Compile Final Research Report',
                description: 'Create comprehensive professional document',
              },
            ],
          },
          {
            id: 'ai-solution-definition',
            name: 'AI Solution Definition',
            description:
              'Identify business cases, scope features, select models/tools',
            welcomeMessage:
              "I am an AI Solution Definition specialist. Let's scope your next AI feature or product.",
            icon: '🧩',
            defaultPromptingTechniques: [],
          },
          {
            id: 'prompt-engineering',
            name: 'Prompt Engineering',
            description:
              'Craft, refine, and evaluate effective prompts for LLMs',
            welcomeMessage:
              "Prompt Engineering specialist here. Tell me the outcome you need and we'll design the right prompts.",
            icon: '📝',
            defaultPromptingTechniques: [],
          },
        ];
      }

      // Always populate the dropdown, regardless of data source
      this.populateSpecialistDropdown();
    } catch (error) {
      console.error('[AIPG] Error loading specialists:', error);
      // Even on error, provide basic functionality
      this.specialists = [
        {
          id: 'research-analysis',
          name: 'Research & Analysis',
          description: 'Research and analysis specialist',
          welcomeMessage:
            "Welcome! I'm here to help with research and analysis.",
          icon: '🔍',
          defaultPromptingTechniques: [],
        },
      ];
      this.populateSpecialistDropdown();
    }
  }

  /**
   * Populate the specialist dropdown
   */
  populateSpecialistDropdown() {
    const specialistDropdown = document.getElementById(
      'ai-prompting-guide-specialist'
    );
    if (!specialistDropdown) return;

    // Clear existing options
    specialistDropdown.innerHTML = '';

    // Add default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = '-- Select Specialist --';
    specialistDropdown.appendChild(defaultOption);

    // Add specialists
    this.specialists.forEach(specialist => {
      const option = document.createElement('option');
      option.value = specialist.name;
      option.textContent = specialist.name;
      specialistDropdown.appendChild(option);
    });

    // Set current specialist if available
    if (this.currentSpecialist) {
      specialistDropdown.value = this.currentSpecialist;
    }
  }

  /**
   * Load models from the background script
   */
  async loadModels() {
    try {
      console.log('[AIPG] Loading models...');

      // Use the retry-enabled message sender
      const response = await this.sendMessageWithRetry({ action: 'getModels' });

      if (
        response &&
        response.models &&
        response.models.length > 0 &&
        !response.fallback
      ) {
        console.log(
          '[AIPG] Received models data:',
          response.models.length,
          'models'
        );
        this.models = response.models;
      } else {
        console.warn(
          '[AIPG] Using fallback models due to communication issues'
        );
        // Use enhanced fallback models
        this.models = [
          {
            id: 'claude-models',
            name: 'Claude Models',
            description: 'Claude 3.5 Sonnet, Claude 3 Opus',
            icon: '🧠',
          },
          {
            id: 'openai-models',
            name: 'OpenAI Models',
            description: 'GPT-4o, GPT-4, o1-preview',
            icon: '🤖',
          },
          {
            id: 'google-models',
            name: 'Google Models',
            description: 'Gemini Pro, Gemini Ultra',
            icon: '🌐',
          },
          {
            id: 'thinking-models',
            name: 'Thinking Models',
            description: 'Reasoning-capable models',
            icon: '💭',
          },
        ];
      }

      // Always populate the dropdown
      this.populateModelDropdown();
    } catch (error) {
      console.error('[AIPG] Error loading models:', error);
      // Even on error, provide basic functionality
      this.models = [
        {
          id: 'claude-models',
          name: 'Claude Models',
          description: 'Claude AI models',
          icon: '🧠',
        },
        {
          id: 'openai-models',
          name: 'OpenAI Models',
          description: 'GPT models',
          icon: '🤖',
        },
      ];
      this.populateModelDropdown();
    }
  }

  /**
   * Populate the model dropdown
   */
  populateModelDropdown() {
    const modelDropdown = document.getElementById('ai-prompting-guide-model');
    if (!modelDropdown) return;

    // Clear existing options
    modelDropdown.innerHTML = '';

    // Add default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = '-- Select Model --';
    modelDropdown.appendChild(defaultOption);

    // Add models
    this.models.forEach(model => {
      const option = document.createElement('option');
      option.value = model.name;
      option.textContent = model.name;
      modelDropdown.appendChild(option);
    });

    // Set current model if available
    if (this.currentModel) {
      modelDropdown.value = this.currentModel;
    }
  }

  /**
   * Handle specialist change event
   */
  async handleSpecialistChange(e) {
    const specialistName = e.target.value;

    if (!specialistName) {
      this.currentSpecialist = null;
      this.specialistData = null;
      return;
    }

    console.log('[AIPG] Specialist changed to:', specialistName);

    // Find specialist data
    const specialist = this.specialists.find(s => s.name === specialistName);
    if (specialist) {
      // Save current specialist progress before switching
      if (this.currentSpecialist && this.currentSpecialist !== specialistName) {
        this.saveProgressToStorage();
      }

      // Set specialist data
      this.currentSpecialist = specialistName;
      this.specialistData = specialist;

      // Load progress for new specialist or reset
      const progressLoaded = this.loadProgressFromStorage();

      if (!progressLoaded) {
        // Clear any existing workflow if no progress to restore
        this.workflowActive = false;
        this.currentStep = null;
        this.currentQuestion = null;
        this.stepResponses = {};

        // Reset progress tracking
        this.resetProgress();
      }

      // Clear messages and show welcome message
      const messagesContainer = document.getElementById(
        'ai-prompting-guide-messages'
      );
      if (messagesContainer) {
        messagesContainer.innerHTML = '';

        if (progressLoaded && this.workflowActive && this.currentStep) {
          // Show progress restoration message
          this.addAssistantMessage(
            `<div style="background: #fff3cd; padding: 10px; border-radius: 5px; border-left: 4px solid #ffc107; margin: 10px 0;">` +
              `<strong>🔄 Welcome back!</strong><br><br>` +
              `I found your previous ${specialist.name} workflow in progress.<br>` +
              `You were on <strong>Step ${this.currentStep} of ${this.totalSteps}</strong>.<br><br>` +
              `<em>Your progress has been restored. Type "Continue" to resume or "Start Over" to restart.</em>` +
              `</div>`
          );

          // Render progress indicator for restored session
          this.renderProgressIndicator();
        } else {
          // Show regular welcome message
          this.addAssistantMessage(
            specialist.welcomeMessage ||
              `Welcome! I'm your ${specialist.name} coach. Let's get started.`
          );
        }
      }

      // Auto-start workflow for new specialists (not restored ones)
      if (
        specialist.defaultPromptingTechniques &&
        specialist.defaultPromptingTechniques.length > 0 &&
        !progressLoaded
      ) {
        setTimeout(() => {
          this.startWorkflow();
        }, 1000);
      }

      // Save user preferences
      this.saveUserPreferencesSync();

      console.log('[AIPG] Specialist set successfully:', {
        name: this.currentSpecialist,
        hasData: !!this.specialistData,
        hasTechniques:
          !!this.specialistData?.defaultPromptingTechniques?.length,
      });
    } else {
      console.error('[AIPG] Specialist not found:', specialistName);
      this.addAssistantMessage(
        `<div style="color: red;">Error: Could not find specialist "${specialistName}". Please try selecting again.</div>`
      );
    }
  }

  /**
   * Handle model change event
   */
  handleModelChange(e) {
    const modelName = e.target.value;
    this.currentModel = modelName;

    console.log('[AIPG] Model changed to:', modelName);

    // Save user preferences
    this.saveUserPreferencesSync();
  }

  /**
   * Start the workflow process
   *
   * STANDARDIZATION NOTE FOR FUTURE SPECIALISTS:
   * All specialists should follow the same workflow pattern:
   * 1. 7-step structured process
   * 2. Each step has: title, description, tools, output
   * 3. welcomeMessage format: "🚀 [Name] activated! ... Current Step: [1/7] [Title]. Next: Click 'Start Step 1'..."
   * 4. placeholderText should reference "Start Step 1" option
   * 5. commonPatterns array with prompt templates for each step
   * 6. pitfallAvoidance array with guidance to prevent common mistakes
   * 7. outputOptimization array with tips for best results
   *
   * This ensures consistent user experience across all specialists.
   */
  startWorkflow() {
    if (
      !this.specialistData ||
      !this.specialistData.defaultPromptingTechniques
    ) {
      console.warn('[AIPG] No prompting techniques found for specialist');
      return;
    }

    console.log('[AIPG] Starting workflow for', this.currentSpecialist);

    // Reset workflow state
    this.workflowActive = true;
    this.currentStep = 1;
    this.currentQuestion = null;
    this.stepResponses = {};
    this.awaitingConfirmation = false;

    // Initialize progress tracking
    this.initializeProgress();

    // Display first step
    this.displayCurrentStep();
  }

  /**
   * Display the current workflow step
   */
  displayCurrentStep() {
    if (!this.workflowActive || !this.currentStep || !this.specialistData) {
      return;
    }

    const stepData = this.specialistData.defaultPromptingTechniques.find(
      s => s.step === this.currentStep
    );
    if (!stepData) {
      console.warn('[AIPG] Step data not found for step', this.currentStep);
      return;
    }

    console.log('[AIPG] Displaying step', this.currentStep);

    // Update step status to current and render progress
    this.updateStepStatus(this.currentStep, 'current');
    this.renderProgressIndicator();

    // Get the total number of steps for this specialist
    const totalSteps = this.specialistData.defaultPromptingTechniques.length;

    // Format step message with progress indicator
    let stepMessage = `<div style="background: #e6f3ff; padding: 10px; border-radius: 5px; margin-bottom: 10px;">`;
    stepMessage += `<strong>📋 Step ${this.currentStep} of ${totalSteps}: ${stepData.title}</strong><br>`;
    stepMessage += `<em>${stepData.description}</em>`;
    stepMessage += `</div>`;

    // Get specialist-specific prompt guidance from commonPatterns
    const patternData = this.specialistData.commonPatterns?.find(
      p => p.step === this.currentStep
    );

    if (patternData) {
      // Generate specialist-specific question and examples based on the specialist type
      const { question, examples } = this.generateStepGuidance(
        this.currentStep,
        stepData,
        patternData
      );

      stepMessage += `<strong>${question}</strong><br><br>`;
      if (examples) {
        stepMessage += `<em>${examples}</em>`;
      }
    } else {
      // Fallback to generic guidance if no pattern is found
      stepMessage += `<strong>💭 Please describe what you'd like to accomplish for this step.</strong><br><br>`;
      stepMessage += `<em>Share your requirements, preferences, or any specific details that would help guide this step.</em>`;
    }

    // Set a generic question type for response handling
    this.currentQuestion = `step_${this.currentStep}`;

    // Add next step guidance
    stepMessage += `<br><br><div style="background: #f8f9fa; padding: 8px; border-radius: 4px; font-size: 0.9em; color: #666;">`;
    stepMessage += `💡 <strong>Tip:</strong> Be specific with your requirements. The more detail you provide, the better I can guide you through the process.`;
    if (this.currentStep < totalSteps) {
      stepMessage += ` When ready, I'll help you move to Step ${this.currentStep + 1}.`;
    }
    stepMessage += `</div>`;

    this.addAssistantMessage(stepMessage);
  }

  /**
   * Generate specialist-specific step guidance
   */
  generateStepGuidance(step, stepData, patternData) {
    const specialistId = this.specialistData?.id;

    // Generate contextual questions and examples based on specialist type
    switch (specialistId) {
      case 'research-analysis':
        return this.generateResearchGuidance(step, stepData);

      case 'website-creation':
        return this.generateWebsiteGuidance(step, stepData);

      case 'ai-solution-definition':
        return this.generateAISolutionGuidance(step, stepData);

      case 'prompt-engineering':
        return this.generatePromptEngineeringGuidance(step, stepData);

      case 'conversational-voice-agents':
        return this.generateConversationalGuidance(step, stepData);

      case 'saas-product-planning':
        return this.generateSaaSGuidance(step, stepData);

      case 'workflow-automation-design':
        return this.generateWorkflowGuidance(step, stepData);

      case 'client-outreach-messaging':
        return this.generateOutreachGuidance(step, stepData);

      case 'data-analysis-support':
        return this.generateDataAnalysisGuidance(step, stepData);

      case 'documentation-writing':
        return this.generateDocumentationGuidance(step, stepData);

      default:
        // Generic guidance for other specialists
        return {
          question: `💭 What would you like to focus on for ${stepData.title.toLowerCase()}?`,
          examples: `Consider the key aspects that matter most for your ${stepData.description.toLowerCase()}.`,
        };
    }
  }

  /**
   * Generate Research & Analysis specific guidance
   */
  generateResearchGuidance(step, stepData) {
    switch (step) {
      case 1:
        return {
          question:
            '🔍 What specific topic would you like me to help you research?',
          examples:
            'For example: "AI applications in healthcare", "Market analysis for electric vehicles", "Competitor analysis for SaaS tools"',
        };
      case 2:
        return {
          question: '📊 What type of data and sources should we focus on?',
          examples:
            'For example: "Industry reports and statistics", "Academic research papers", "News articles and trends"',
        };
      case 3:
        return {
          question:
            '🎯 What key insights are you most interested in extracting?',
          examples:
            'For example: "Market size and growth trends", "Key challenges and pain points", "Emerging opportunities"',
        };
      case 4:
        return {
          question:
            '🏢 Who are the main competitors or players you want to analyze?',
          examples:
            'For example: "Google, Microsoft, Amazon in cloud services", "Tesla, BMW, Ford in electric vehicles"',
        };
      case 5:
        return {
          question:
            '💡 What market gaps or opportunities are you most interested in identifying?',
          examples:
            'For example: "Underserved customer segments", "Technological gaps", "Pricing opportunities"',
        };
      case 6:
        return {
          question:
            '📈 What type of data visualization or metrics would be most valuable?',
          examples:
            'For example: "Market growth charts", "Competitive positioning maps", "Customer segment analysis"',
        };
      case 7:
        return {
          question:
            '📋 What format would you prefer for your final research report?',
          examples:
            'For example: "Executive summary with bullet points", "Detailed report with charts", "Presentation-ready slides"',
        };
      default:
        return {
          question: '💭 Please provide details for this research step.',
          examples: 'Share your specific requirements or preferences.',
        };
    }
  }

  /**
   * Generate Website Creation specific guidance
   */
  generateWebsiteGuidance(step, stepData) {
    switch (step) {
      case 1:
        return {
          question: '🌐 What type of website would you like to create?',
          examples:
            'For example: "E-commerce site for custom vinyl T-shirts using Bolt", "Portfolio site for a design agency", "Landing page for a SaaS product"',
        };
      case 2:
        return {
          question: '✍️ What type of content and messaging do you need?',
          examples:
            'For example: "Product descriptions for 20 T-shirt designs", "About page for family business", "SEO-optimized service pages"',
        };
      case 3:
        return {
          question: '🎨 What design style and layout do you prefer?',
          examples:
            'For example: "Minimalist design with pastel colors (blue/orange)", "Bold modern layout", "Clean professional look"',
        };
      case 4:
        return {
          question: '💻 Which development platform would you like to use?',
          examples:
            'For example: "Bolt.new for full-stack development", "Webflow for visual design", "Lovable for rapid prototyping"',
        };
      case 5:
        return {
          question: '⚙️ What backend functionality do you need?',
          examples:
            'For example: "Payment processing and inventory", "Contact forms and email notifications", "User accounts and orders"',
        };
      case 6:
        return {
          question: '🧪 How would you like to test your website?',
          examples:
            'For example: "Mobile responsiveness testing", "Payment flow testing", "Load speed optimization"',
        };
      case 7:
        return {
          question: '🚀 Where would you like to deploy and host your site?',
          examples:
            'For example: "Vercel with custom domain", "Netlify with CDN", "Cloudflare Pages with analytics"',
        };
      case 8:
        return {
          question:
            '📊 What monitoring and maintenance approach do you prefer?',
          examples:
            'For example: "Google Analytics with weekly reports", "Automated backups and security updates", "Performance monitoring"',
        };
      default:
        return {
          question:
            '💭 Please provide details for this website development step.',
          examples: 'Share your specific requirements or preferences.',
        };
    }
  }

  /**
   * Generate AI Solution Definition specific guidance
   */
  generateAISolutionGuidance(step, stepData) {
    switch (step) {
      case 1:
        return {
          question: '🎯 What business problem are you trying to solve with AI?',
          examples:
            'For example: "Automate customer support responses", "Analyze sales data for insights", "Improve content personalization"',
        };
      case 2:
        return {
          question: '🏷️ Which AI solution category best fits your needs?',
          examples:
            'For example: "Conversational AI for customer service", "AI Workflow Automation for data processing", "AI-Powered SaaS for analytics"',
        };
      case 3:
        return {
          question: '💡 Which solution concept resonates most with your goals?',
          examples:
            'For example: "Chatbot with CRM integration", "Document processing pipeline", "Predictive analytics dashboard"',
        };
      case 4:
        return {
          question:
            '🔧 What technical requirements and constraints do you have?',
          examples:
            'For example: "Must integrate with Salesforce", "Need real-time processing", "Budget under $10k/month"',
        };
      case 5:
        return {
          question: '👥 How should users interact with your AI solution?',
          examples:
            'For example: "Web dashboard with chat interface", "API for developers", "Mobile app with voice commands"',
        };
      case 6:
        return {
          question: '🏗️ What system components and integrations are needed?',
          examples:
            'For example: "User authentication, payment processing, email notifications", "CRM sync, data warehouse, reporting APIs"',
        };
      case 7:
        return {
          question:
            '📅 What is your preferred development timeline and milestones?',
          examples:
            'For example: "MVP in 3 months, full launch in 6 months", "Pilot with 100 users first", "Phased rollout by department"',
        };
      case 8:
        return {
          question:
            '✅ Are you confident AI is the right approach for this problem?',
          examples:
            'For example: "Yes, traditional automation failed", "Maybe, but open to alternatives", "Let me reconsider the approach"',
        };
      case 9:
        return {
          question:
            '📋 Any final requirements or specifications for your AI solution?',
          examples:
            'For example: "Must comply with GDPR", "Need 99.9% uptime", "Require detailed analytics and reporting"',
        };
      default:
        return {
          question: '🤖 Please provide details for this AI solution step.',
          examples: 'Share your specific requirements or preferences.',
        };
    }
  }

  /**
   * Generate Prompt Engineering specific guidance
   */
  generatePromptEngineeringGuidance(step, stepData) {
    switch (step) {
      case 1:
        return {
          question:
            '🎯 What specific AI task do you need to create prompts for?',
          examples:
            'For example: "Summarize legal documents", "Generate product descriptions", "Analyze customer feedback sentiment"',
        };
      case 2:
        return {
          question: '✍️ What initial prompt approaches would you like to try?',
          examples:
            'For example: "Role-based prompt with expert persona", "Step-by-step instructions", "Few-shot examples approach"',
        };
      case 3:
        return {
          question: '🧪 How would you like to test and evaluate your prompts?',
          examples:
            'For example: "Test on 10 sample documents", "Compare accuracy vs speed", "Evaluate consistency across different inputs"',
        };
      case 4:
        return {
          question:
            '🔧 What specific improvements are needed based on testing?',
          examples:
            'For example: "Add more specific constraints", "Include better examples", "Improve output format instructions"',
        };
      case 5:
        return {
          question: '📝 What type of reusable templates do you need?',
          examples:
            'For example: "Document analysis template", "Content generation template", "Data extraction template"',
        };
      case 6:
        return {
          question: '⚡ How do you want to automate and deploy these prompts?',
          examples:
            'For example: "n8n workflow integration", "API endpoint for applications", "Batch processing system"',
        };
      case 7:
        return {
          question:
            '📊 What monitoring and maintenance approach do you prefer?',
          examples:
            'For example: "Track accuracy metrics", "Monitor response times", "Schedule monthly performance reviews"',
        };
      default:
        return {
          question:
            '📝 Please provide details for this prompt engineering step.',
          examples: 'Share your specific requirements or preferences.',
        };
    }
  }

  /**
   * Generate Conversational/Voice Agents specific guidance
   */
  generateConversationalGuidance(step, stepData) {
    switch (step) {
      case 1:
        return {
          question:
            '🗣️ Are you building a Text-Based Chatbot or Voice Assistant?',
          examples:
            'For example: "Text chatbot for customer support", "Voice assistant for smart home", "Both text and voice capabilities"',
        };
      case 2:
        return {
          question:
            '🎯 What are the main user intents and goals for your agent?',
          examples:
            'For example: "Book appointments, check order status", "Control smart devices, play music", "Answer FAQs, escalate to human"',
        };
      case 3:
        return {
          question: '🔄 How should conversation flows and dialogues work?',
          examples:
            'For example: "Multi-turn booking conversations", "Context-aware follow-ups", "Graceful error recovery"',
        };
      case 4:
        return {
          question: '🖥️ What type of user interface do you need?',
          examples:
            'For example: "Website chat widget", "Mobile app interface", "Voice-only smart speaker"',
        };
      case 5:
        return {
          question: '🛠️ Which platforms and technologies should we use?',
          examples:
            'For example: "Dialogflow with webhook", "Rasa with custom NLU", "Amazon Alexa Skills Kit"',
        };
      case 6:
        return {
          question: '🔗 What systems need to be integrated with your agent?',
          examples:
            'For example: "CRM for customer data", "Booking system API", "Payment processing gateway"',
        };
      case 7:
        return {
          question: '📈 How will you test, monitor and improve the agent?',
          examples:
            'For example: "User testing with real scenarios", "Analytics on conversation success", "A/B test different responses"',
        };
      default:
        return {
          question:
            '🗣️ Please provide details for this conversational agent step.',
          examples: 'Share your specific requirements or preferences.',
        };
    }
  }

  /**
   * Generate SaaS Product Planning specific guidance
   */
  generateSaaSGuidance(step, stepData) {
    switch (step) {
      case 1:
        return {
          question:
            '👥 Who are your target users and what problems do they face?',
          examples:
            'For example: "Small business owners struggling with inventory", "Marketing teams needing better analytics", "Developers wanting API management"',
        };
      case 2:
        return {
          question: '🚀 What AI-powered features would solve their problems?',
          examples:
            'For example: "Predictive inventory management", "Automated campaign optimization", "Intelligent API monitoring"',
        };
      case 3:
        return {
          question:
            '📊 What data sources and ML workflows will power your features?',
          examples:
            'For example: "Sales data + seasonality models", "User behavior + recommendation engine", "API logs + anomaly detection"',
        };
      case 4:
        return {
          question: '🎨 What user flows and interface designs are needed?',
          examples:
            'For example: "Dashboard with drag-drop widgets", "Mobile-first onboarding flow", "Admin panel with team management"',
        };
      case 5:
        return {
          question:
            '🏗️ What technical architecture and infrastructure do you need?',
          examples:
            'For example: "React frontend + Node.js API", "Microservices on AWS", "PostgreSQL + Redis caching"',
        };
      case 6:
        return {
          question: '📅 What development roadmap and milestones make sense?',
          examples:
            'For example: "MVP in 4 months, beta users at month 6", "Core features first, AI features in phase 2", "Launch plan by quarter"',
        };
      case 7:
        return {
          question: '✅ How will you validate and refine the product plan?',
          examples:
            'For example: "Customer interviews and surveys", "Technical feasibility review", "Investor feedback and market validation"',
        };
      default:
        return {
          question: '💡 Please provide details for this SaaS planning step.',
          examples: 'Share your specific requirements or preferences.',
        };
    }
  }

  /**
   * Generate Workflow Automation Design specific guidance
   */
  generateWorkflowGuidance(step, stepData) {
    switch (step) {
      case 1:
        return {
          question: '🔄 What business process would you like to automate?',
          examples:
            'For example: "Lead qualification from forms to CRM", "Invoice processing and approval", "Customer onboarding workflow"',
        };
      case 2:
        return {
          question: '⚡ What events should trigger your automated workflows?',
          examples:
            'For example: "New form submission", "Email attachment received", "CRM status change", "Scheduled daily at 9am"',
        };
      case 3:
        return {
          question: '🎯 What actions and decision logic are needed?',
          examples:
            'For example: "If lead score > 80, assign to sales team", "Parse invoice data and send for approval", "Create user account and send welcome email"',
        };
      case 4:
        return {
          question: '🔗 Which systems and APIs need to be connected?',
          examples:
            'For example: "Typeform to HubSpot to Slack", "Gmail to accounting software", "Shopify to fulfillment center API"',
        };
      case 5:
        return {
          question: '🛠️ Which automation platform should we use to build this?',
          examples:
            'For example: "n8n for complex logic and custom code", "Make.com for visual workflow builder", "Zapier for simple integrations"',
        };
      case 6:
        return {
          question: '📊 How will you monitor workflow performance and errors?',
          examples:
            'For example: "Slack alerts for failures", "Daily execution reports", "Success rate dashboards with metrics"',
        };
      case 7:
        return {
          question: '🔧 What maintenance and scaling plans do you need?',
          examples:
            'For example: "Weekly performance reviews", "Templates for similar workflows", "Documentation for team training"',
        };
      default:
        return {
          question:
            '🔗 Please provide details for this workflow automation step.',
          examples: 'Share your specific requirements or preferences.',
        };
    }
  }

  /**
   * Generate Client Outreach Messaging specific guidance
   */
  generateOutreachGuidance(step, stepData) {
    switch (step) {
      case 1:
        return {
          question:
            '🎯 Who is your target audience and what do you offer them?',
          examples:
            'For example: "CTOs at fintech startups - AI automation services", "Marketing directors - lead generation tools", "HR managers - recruitment software"',
        };
      case 2:
        return {
          question: '✍️ What type of outreach messages do you need to craft?',
          examples:
            'For example: "LinkedIn cold outreach for demos", "Email sequences for nurturing", "Follow-up messages after meetings"',
        };
      case 3:
        return {
          question: '📨 How do you want to automate your outreach campaigns?',
          examples:
            'For example: "LinkedIn + email sequences", "Personalized emails at scale", "Multi-channel touch points over 2 weeks"',
        };
      case 4:
        return {
          question: '📅 What follow-up schedule and cadence works best?',
          examples:
            'For example: "5-touch sequence over 3 weeks", "Weekly check-ins for 6 weeks", "Event-triggered follow-ups"',
        };
      case 5:
        return {
          question: '💬 How will you handle responses and qualify leads?',
          examples:
            'For example: "Categorize interest levels", "Auto-schedule demos for positive replies", "Route objections to specific team members"',
        };
      case 6:
        return {
          question: '📊 What metrics will you track to optimize performance?',
          examples:
            'For example: "Open rates by subject line", "Reply rates by message variation", "Meeting conversion rates by segment"',
        };
      default:
        return {
          question:
            '✉️ Please provide details for this outreach messaging step.',
          examples: 'Share your specific requirements or preferences.',
        };
    }
  }

  /**
   * Generate Data Analysis Support specific guidance
   */
  generateDataAnalysisGuidance(step, stepData) {
    switch (step) {
      case 1:
        return {
          question:
            '📊 What dataset do you need to analyze and what questions do you have?',
          examples:
            'For example: "Customer churn data - why are users leaving?", "Sales data - which products are underperforming?", "Website analytics - where do users drop off?"',
        };
      case 2:
        return {
          question:
            '🎯 What specific hypotheses or business questions should we test?',
          examples:
            'For example: "High-value customers churn less", "Email campaigns drive more sales than social", "Page load time affects conversion rates"',
        };
      case 3:
        return {
          question:
            '🧹 What data cleaning and preparation challenges do you face?',
          examples:
            'For example: "Missing values in 20% of records", "Inconsistent date formats", "Outliers from data collection errors"',
        };
      case 4:
        return {
          question: '🔍 What exploratory analysis techniques should we apply?',
          examples:
            'For example: "Customer segmentation analysis", "Time-series trend analysis", "Correlation analysis between variables"',
        };
      case 5:
        return {
          question: '📈 What types of visualizations would be most valuable?',
          examples:
            'For example: "Interactive dashboards for executives", "Trend charts for monthly reviews", "Heatmaps for user behavior analysis"',
        };
      case 6:
        return {
          question:
            '📋 What statistical tests or validation methods are needed?',
          examples:
            'For example: "A/B test significance testing", "Regression analysis for predictions", "Confidence intervals for estimates"',
        };
      case 7:
        return {
          question:
            '💡 How should insights be presented for actionable recommendations?',
          examples:
            'For example: "Executive summary with 3 key findings", "Detailed technical report with methodology", "Interactive presentation with stakeholder Q&A"',
        };
      default:
        return {
          question: '📊 Please provide details for this data analysis step.',
          examples: 'Share your specific requirements or preferences.',
        };
    }
  }

  /**
   * Generate Documentation Writing specific guidance
   */
  generateDocumentationGuidance(step, stepData) {
    switch (step) {
      case 1:
        return {
          question:
            '👥 Who will be reading this documentation and what do they need?',
          examples:
            'For example: "Developers integrating our API", "End users learning the software", "Support team answering questions"',
        };
      case 2:
        return {
          question:
            '📋 What existing content needs to be updated or is missing?',
          examples:
            'For example: "API docs are outdated", "No user onboarding guide", "Technical specs scattered across emails"',
        };
      case 3:
        return {
          question:
            '🗂️ How should the documentation be organized and structured?',
          examples:
            'For example: "Getting Started → API Reference → Advanced Guides", "Topic-based with search functionality", "Step-by-step tutorials with examples"',
        };
      case 4:
        return {
          question: '✍️ What writing style and content approach works best?',
          examples:
            'For example: "Conversational tone with code examples", "Technical precision with screenshots", "Beginner-friendly with glossary"',
        };
      case 5:
        return {
          question:
            '🎨 What visual elements and formatting will enhance clarity?',
          examples:
            'For example: "Flowcharts for complex processes", "Screenshots with annotations", "Code highlighting and copyable snippets"',
        };
      case 6:
        return {
          question: '👀 How will you collect feedback and ensure accuracy?',
          examples:
            'For example: "Technical review by engineering team", "User testing with target audience", "Feedback forms on each page"',
        };
      case 7:
        return {
          question:
            '🚀 Where will you publish and how will you maintain updates?',
          examples:
            'For example: "GitBook with GitHub integration", "Company wiki with version control", "Public docs site with analytics"',
        };
      default:
        return {
          question: '📄 Please provide details for this documentation step.',
          examples: 'Share your specific requirements or preferences.',
        };
    }
  }

  /**
   * Move to the next workflow step
   */
  async moveToNextStep() {
    if (!this.workflowActive || !this.currentStep || !this.specialistData) {
      return;
    }

    // Check if current step is complete
    if (!this.isStepComplete(this.currentStep)) {
      this.addAssistantMessage(
        'Please complete the current step before moving to the next one.'
      );
      return;
    }

    // Move to next step
    const nextStep = this.currentStep + 1;
    const nextStepData = this.specialistData.defaultPromptingTechniques.find(
      s => s.step === nextStep
    );

    if (nextStepData) {
      this.currentStep = nextStep;
      this.currentQuestion = null;
      this.displayCurrentStep();

      // Save session progress
      this.saveSessionDataSync();
    } else {
      // Final step reached, generate final prompt
      const finalPrompt = await this.generateFinalPrompt();
      const modelRecommendations = this.getModelRecommendations();

      // Create unique ID for this prompt
      const promptId = 'aipg-prompt-' + Date.now();

      // Generate specialist-specific completion message
      const completionMessage = this.generateCompletionMessage(
        promptId,
        finalPrompt,
        modelRecommendations
      );
      this.addAssistantMessage(completionMessage);

      // Workflow completed
      this.workflowActive = false;
      this.currentStep = null;
      this.currentQuestion = null;

      // Clear session data since workflow is complete
      this.clearSessionDataSync();
    }
  }

  /**
   * Collect response for the current step
   */
  async collectStepResponse(userMessage) {
    if (!this.workflowActive || !this.currentStep) {
      return null;
    }

    // Store response based on current question
    if (this.currentQuestion) {
      // Store the response
      if (!this.stepResponses[this.currentStep]) {
        this.stepResponses[this.currentStep] = {};
      }

      this.stepResponses[this.currentStep][this.currentQuestion] = userMessage;

      // Note: Follow-up questions are handled by the LLM in buildStepCompletionPrompt

      // Handle generic step responses
      if (this.currentQuestion && this.currentQuestion.startsWith('step_')) {
        // Complete the step with generic response
        this.currentQuestion = null;

        // Mark step as completed and update progress
        this.updateStepStatus(this.currentStep, 'completed');

        const stepData = this.specialistData.defaultPromptingTechniques.find(
          s => s.step === this.currentStep
        );
        const totalSteps =
          this.specialistData.defaultPromptingTechniques.length;

        let response = `<div style="background: #f0f8ff; padding: 15px; border-left: 4px solid #4CAF50; margin: 10px 0;">`;
        response += `<strong>✅ Step ${this.currentStep} Complete: ${stepData.title}</strong><br><br>`;
        response += `Your input: <strong>"${userMessage}"</strong><br><br>`;
        response += `Perfect! I've captured this information.`;
        response += `</div><br>`;

        if (this.currentStep < totalSteps) {
          const nextStepData =
            this.specialistData.defaultPromptingTechniques.find(
              s => s.step === this.currentStep + 1
            );
          response += `<strong>🚀 Ready for Step ${this.currentStep + 1}!</strong> `;
          if (nextStepData) {
            response += `Type "<em>Next Step</em>" to proceed to ${nextStepData.title}.`;
          } else {
            response += `Type "<em>Next Step</em>" to continue.`;
          }
        } else {
          response += `<strong>🎉 All steps completed!</strong> I have all the information needed to help you with your project.`;
        }

        return response;
      }

      // Generate step completion response using LLM when available
      const stepData = this.specialistData.defaultPromptingTechniques.find(
        s => s.step === this.currentStep
      );
      const totalSteps = this.specialistData.defaultPromptingTechniques.length;

      let response = `<div style="background: #f0f8ff; padding: 15px; border-left: 4px solid #4CAF50; margin: 10px 0;">`;
      response += `<strong>✅ Step ${this.currentStep} Complete: ${stepData.title}</strong><br><br>`;

      // Generate intelligent response using LLM if available
      try {
        if (this.llmEnabled && this.llmApiKey) {
          const llmPrompt = this.buildStepCompletionPrompt(
            userMessage,
            stepData
          );
          const llmResponse = await this.callLLMAPI(llmPrompt);

          if (llmResponse && llmResponse.trim().length > 0) {
            response += llmResponse;
          } else {
            // Fallback to generic response
            response += `Your input: <strong>"${userMessage}"</strong><br><br>`;
            response += `Great! I've captured this information for ${stepData.title.toLowerCase()}.`;
          }
        } else {
          // No LLM available - use generic response
          response += `Your input: <strong>"${userMessage}"</strong><br><br>`;
          response += `Thank you! I've recorded your requirements for ${stepData.title.toLowerCase()}.`;
        }
      } catch (error) {
        console.error('[AIPG] LLM error in step completion:', error);
        // Fallback to generic response
        response += `Your input: <strong>"${userMessage}"</strong><br><br>`;
        response += `Perfect! I've saved this information for ${stepData.title.toLowerCase()}.`;
      }

      response += `</div><br>`;

      // Clear current question to mark step as complete
      this.currentQuestion = null;

      // Add next step guidance
      if (this.currentStep < totalSteps) {
        const nextStepData =
          this.specialistData.defaultPromptingTechniques.find(
            s => s.step === this.currentStep + 1
          );
        response += `<strong>🚀 Ready for Step ${this.currentStep + 1}!</strong> `;
        if (nextStepData) {
          response += `Type "<em>Next Step</em>" to proceed to ${nextStepData.title}.`;
        } else {
          response += `Type "<em>Next Step</em>" to continue.`;
        }
      } else {
        // Final step completed
        response += `<strong>🎉 All steps completed!</strong> `;

        if (this.specialistData.id === 'research-analysis') {
          response += `Your comprehensive research prompt is being generated...`;
        } else {
          response += `I have all the information needed to help you with your project.`;
        }

        // Save session data before completing
        this.saveSessionDataSync();
      }

      // Save session data after each response
      this.saveSessionDataSync();

      return response;
    }

    return null;
  }

  /**
   * Build step completion prompt for LLM
   */
  buildStepCompletionPrompt(userMessage, stepData) {
    const specialistName = this.specialistData.name;
    const specialistId = this.specialistData.id;

    let prompt = `You are a ${specialistName} specialist. The user just completed "${stepData.title}" with this input: "${userMessage}". `;

    // Add specialist-specific context
    switch (specialistId) {
      case 'website-creation':
        prompt += `Provide encouraging feedback about their website requirements and briefly mention 2-3 key considerations for this step. `;
        prompt += `Be specific about web development best practices when relevant. `;
        break;

      case 'research-analysis':
        prompt += `Provide brief analysis of their research requirements and suggest any important aspects they might consider. `;
        break;

      default:
        prompt += `Provide encouraging feedback and mention key considerations for this step. `;
        break;
    }

    prompt += `Keep response concise (2-3 sentences), professional, and encouraging. Format as HTML for chat display.`;

    return prompt;
  }

  /**
   * Handle edit requests for workflow steps - generic for all specialists
   */
  handleEditRequest(editMatch, userMessage) {
    const stepNumber = editMatch[1];
    const field = editMatch[2];

    // Get the maximum step number for current specialist
    const maxSteps = this.getMaxStepsForCurrentSpecialist();

    if (stepNumber) {
      const step = parseInt(stepNumber, 10);
      if (step >= 1 && step <= maxSteps && this.stepResponses[step]) {
        // Allow editing of specific step
        this.currentStep = step;
        this.currentQuestion = null;
        this.addAssistantMessage(
          `<strong>📝 Editing Step ${step}</strong><br><br>` +
            `Your previous responses for Step ${step}:<br>` +
            `${this.formatStepResponses(step)}<br><br>` +
            `What would you like to change? Please provide your updated response for any of the fields above.`
        );
        this.displayCurrentStep();
        return;
      }
    } else if (field) {
      // Handle editing of specific fields - search across all steps
      const foundField = this.findFieldInStepResponses(field);
      if (foundField) {
        const { stepNum, fieldName, value } = foundField;
        this.currentStep = stepNum;
        this.currentQuestion = fieldName;

        // Generate field-specific edit message
        const fieldDisplayName = this.getFieldDisplayName(fieldName);
        this.addAssistantMessage(
          `<strong>📝 Editing your ${fieldDisplayName}</strong><br><br>` +
            `Current ${fieldDisplayName.toLowerCase()}: <em>"${value}"</em><br><br>` +
            `What would you like to change this to?`
        );
        return;
      }
    }

    // Fallback for unrecognized edit requests
    this.addAssistantMessage(
      `<strong>❓ Edit Request</strong><br><br>` +
        `I understand you want to make changes. Here are your options:<br><br>` +
        `• Type "<em>edit step [number]</em>" to modify a specific step (1-${maxSteps})<br>` +
        `• Type "<em>edit my [field]</em>" to change a specific response field<br>` +
        `• Type "<em>start over</em>" to begin the entire workflow again<br><br>` +
        `Available fields for editing: ${this.getAvailableFieldsForEditing()}`
    );
  }

  /**
   * Format step responses for display - works with any data structure
   */
  formatStepResponses(step) {
    const responses = this.stepResponses[step];
    if (!responses) return 'No responses recorded';

    let formatted = '<ul>';
    Object.entries(responses).forEach(([key, value]) => {
      if (typeof value === 'string') {
        const displayName = this.getFieldDisplayName(key);
        formatted += `<li><strong>${displayName}:</strong> ${value}</li>`;
      }
    });
    formatted += '</ul>';
    return formatted;
  }

  /**
   * Get maximum steps for current specialist
   */
  getMaxStepsForCurrentSpecialist() {
    if (this.specialistData && this.specialistData.defaultPromptingTechniques) {
      return Math.max(
        ...this.specialistData.defaultPromptingTechniques.map(step => step.step)
      );
    }
    return 7; // fallback default
  }

  /**
   * Find a field across all step responses
   */
  findFieldInStepResponses(searchField) {
    const normalizedSearch = searchField.toLowerCase().replace(/[_\s]/g, '');

    for (const [stepNum, stepData] of Object.entries(this.stepResponses)) {
      if (stepData && typeof stepData === 'object') {
        for (const [fieldName, value] of Object.entries(stepData)) {
          if (typeof value === 'string') {
            // Check for exact match or partial match
            const normalizedField = fieldName
              .toLowerCase()
              .replace(/[_\s]/g, '');
            if (
              normalizedField === normalizedSearch ||
              normalizedField.includes(normalizedSearch) ||
              normalizedSearch.includes(normalizedField)
            ) {
              return {
                stepNum: parseInt(stepNum),
                fieldName,
                value,
              };
            }
          }
        }
      }
    }
    return null;
  }

  /**
   * Get display-friendly field name
   */
  getFieldDisplayName(fieldName) {
    // Convert camelCase and snake_case to Title Case
    return fieldName
      .replace(/([A-Z])/g, ' $1') // camelCase to spaces
      .replace(/[_-]/g, ' ') // underscores and dashes to spaces
      .replace(/\b\w/g, l => l.toUpperCase()) // title case
      .trim();
  }

  /**
   * Get available fields for editing from current step responses
   */
  getAvailableFieldsForEditing() {
    const allFields = new Set();

    for (const stepData of Object.values(this.stepResponses)) {
      if (stepData && typeof stepData === 'object') {
        Object.keys(stepData).forEach(field => {
          if (typeof stepData[field] === 'string') {
            allFields.add(this.getFieldDisplayName(field));
          }
        });
      }
    }

    return Array.from(allFields).join(', ') || 'None available yet';
  }

  /**
   * Generate research questions based on topic and focus
   */
  generateResearchQuestions(topic, focus) {
    // Generate 5-7 research questions based on the topic and focus
    const questions = [
      `What are the key components of ${topic}?`,
      `How has ${topic} evolved over time?`,
      `What are the current challenges in ${topic}?`,
      `What are the future trends in ${topic}?`,
      `How does ${topic} impact related fields?`,
    ];

    // Add focus-specific questions if provided
    if (
      focus &&
      focus.toLowerCase() !== 'none' &&
      focus.toLowerCase() !== 'no'
    ) {
      questions.push(`How does ${focus} specifically relate to ${topic}?`);
      questions.push(
        `What are the limitations of ${topic} in the context of ${focus}?`
      );
    }

    return questions;
  }

  /**
   * Generate scope outline based on topic and focus
   */
  generateScopeOutline(topic, focus) {
    // Generate scope outline based on the topic and focus
    let outline = `This research will cover the fundamental aspects of ${topic}`;

    if (
      focus &&
      focus.toLowerCase() !== 'none' &&
      focus.toLowerCase() !== 'no'
    ) {
      outline += ` with a specific focus on ${focus}`;
    }

    outline += `. It will include historical context, current state, key challenges, and future directions.`;

    return outline;
  }

  /**
   * Generate data sources based on topic
   */
  generateDataSources(topic) {
    // Generate recommended data sources based on the topic
    return [
      `Academic journals related to ${topic}`,
      `Industry reports on ${topic}`,
      `Expert interviews with professionals in ${topic}`,
      `Case studies of successful implementations in ${topic}`,
      `Recent news articles about ${topic}`,
    ];
  }

  /**
   * Handle workflow response (yes/no)
   */
  handleWorkflowResponse(response) {
    if (!this.awaitingConfirmation || !this.confirmationCallback) {
      return;
    }

    // Call the confirmation callback with the response
    this.confirmationCallback(response);

    // Reset confirmation state
    this.awaitingConfirmation = false;
    this.confirmationCallback = null;
  }

  /**
   * Check if a step is complete
   */
  isStepComplete(step) {
    if (!step) {
      return false;
    }

    // First check if step is marked as completed in stepStates
    if (this.stepStates && this.stepStates[step] === 'completed') {
      return true;
    }

    // Fallback to checking stepResponses for legacy compatibility
    if (!this.stepResponses[step]) {
      return false;
    }

    // For step 1, check if we have topic and focus
    if (step === 1) {
      return this.stepResponses[1].topic && this.stepResponses[1].focus;
    }

    // For other steps, check if we have any response
    return Object.keys(this.stepResponses[step]).length > 0;
  }

  /**
   * Generate specialist-specific completion message
   */
  generateCompletionMessage(promptId, finalPrompt, modelRecommendations) {
    const specialistId = this.specialistData?.id;
    const specialistName = this.specialistData?.name || 'AI Assistant';

    // Get specialist-specific completion content
    const completionData = this.getCompletionData(specialistId);

    return (
      `<div style="background: #e8f5e8; padding: 20px; border-radius: 10px; border-left: 5px solid #4CAF50; margin: 15px 0;">` +
      `<strong>🎉 Congratulations! Your ${completionData.title} is Ready:</strong><br><br>` +
      `<div style="position: relative;">` +
      `<button onclick="navigator.clipboard.writeText(document.getElementById('${promptId}').textContent).then(() => { ` +
      `const btn = event.target; btn.textContent = '✅ Copied!'; btn.style.background = '#4CAF50'; ` +
      `setTimeout(() => { btn.textContent = '📋 Copy ${completionData.buttonText}'; btn.style.background = '#007cba'; }, 2000); })" ` +
      `style="position: absolute; top: 10px; right: 10px; background: #007cba; color: white; border: none; ` +
      `padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; z-index: 10;">📋 Copy ${completionData.buttonText}</button>` +
      `<div id="${promptId}" style="background: white; padding: 15px; border-radius: 5px; font-family: monospace; ` +
      `font-size: 12px; white-space: pre-wrap; max-height: 400px; overflow-y: auto; border: 1px solid #ddd; ` +
      `padding-top: 45px;">${finalPrompt}</div>` +
      `</div><br>` +
      `<p><strong>✅ What to do next:</strong></p>` +
      `<ul>` +
      completionData.nextSteps.map(step => `<li>${step}</li>`).join('') +
      `</ul>` +
      `</div>`
    );
  }

  /**
   * Get specialist-specific completion data
   */
  getCompletionData(specialistId) {
    switch (specialistId) {
      case 'research-analysis':
        return {
          title: 'CRISP Framework Research Prompt',
          buttonText: 'Prompt',
          nextSteps: [
            '📋 Click the "Copy Prompt" button above to copy your research prompt',
            '🤖 Paste into ChatGPT, Claude, or Perplexity AI for comprehensive research',
            '🔍 Review and refine the results as needed',
            '📊 Use the generated insights for your research project',
          ],
        };

      case 'ai-solution-definition':
        return {
          title: 'AI Solution Definition Document',
          buttonText: 'Document',
          nextSteps: [
            '📋 Click the "Copy Document" button above to copy your solution definition',
            '🤖 Use this as a requirements document for development teams',
            '🔍 Review with stakeholders and technical experts',
            '🚀 Begin planning your AI solution implementation',
          ],
        };

      case 'website-creation':
        return {
          title: 'Website Creation Guide',
          buttonText: 'Guide',
          nextSteps: [
            '📋 Click the "Copy Guide" button above to copy your website plan',
            '🌐 Use with Bolt.new, Lovable, or your preferred development platform',
            '🎨 Begin implementing the design and content strategy',
            '🚀 Deploy and test your website with target users',
          ],
        };

      case 'prompt-engineering':
        return {
          title: 'Optimized Prompt Template',
          buttonText: 'Template',
          nextSteps: [
            '📋 Click the "Copy Template" button above to copy your prompt template',
            '🤖 Test the prompt with your preferred AI model',
            '🔧 Iterate and refine based on performance results',
            '⚡ Implement in your automation workflows or applications',
          ],
        };

      case 'conversational-voice-agents':
        return {
          title: 'Conversational Agent Specification',
          buttonText: 'Spec',
          nextSteps: [
            '📋 Click the "Copy Spec" button above to copy your agent specification',
            '🗣️ Use this to guide development with Dialogflow, Rasa, or similar platforms',
            '🧪 Build and test with representative user scenarios',
            '📈 Deploy and monitor conversation performance',
          ],
        };

      case 'saas-product-planning':
        return {
          title: 'SaaS Product Plan',
          buttonText: 'Plan',
          nextSteps: [
            '📋 Click the "Copy Plan" button above to copy your product plan',
            '💡 Use this as your product requirements document',
            '👥 Share with your development team and stakeholders',
            '🚀 Begin MVP development and user validation',
          ],
        };

      case 'workflow-automation-design':
        return {
          title: 'Workflow Automation Blueprint',
          buttonText: 'Blueprint',
          nextSteps: [
            '📋 Click the "Copy Blueprint" button above to copy your automation plan',
            '🔗 Implement using n8n, Make.com, or Zapier',
            '🧪 Test the workflow with sample data',
            '📊 Monitor and optimize for performance',
          ],
        };

      case 'client-outreach-messaging':
        return {
          title: 'Outreach Campaign Strategy',
          buttonText: 'Strategy',
          nextSteps: [
            '📋 Click the "Copy Strategy" button above to copy your outreach plan',
            '📨 Implement the messaging templates and sequences',
            '📊 Track performance metrics and response rates',
            '🎯 Optimize based on campaign results',
          ],
        };

      case 'data-analysis-support':
        return {
          title: 'Data Analysis Plan',
          buttonText: 'Plan',
          nextSteps: [
            '📋 Click the "Copy Plan" button above to copy your analysis plan',
            '📊 Execute the analysis using Python, R, or your preferred tools',
            '📈 Create visualizations and reports',
            '💡 Present insights and recommendations to stakeholders',
          ],
        };

      case 'documentation-writing':
        return {
          title: 'Documentation Plan',
          buttonText: 'Plan',
          nextSteps: [
            '📋 Click the "Copy Plan" button above to copy your documentation plan',
            '📄 Begin writing content following the structure and style guide',
            '👀 Collect feedback from target readers',
            '🚀 Publish and establish maintenance procedures',
          ],
        };

      default:
        return {
          title: 'Professional Guide',
          buttonText: 'Guide',
          nextSteps: [
            '📋 Click the "Copy Guide" button above to copy your professional guide',
            '🤖 Use this with your preferred AI assistant for implementation',
            '🔍 Review and customize based on your specific needs',
            '🚀 Begin implementing the recommended approach',
          ],
        };
    }
  }

  /**
   * Generate final prompt based on collected responses
   */
  async generateFinalPrompt() {
    // Detect current specialist type and route to appropriate generator
    const specialistId = this.getSpecialistId();

    // Try to use LLM to generate enhanced prompt, fall back to static if needed
    try {
      const enhancedPrompt = await this.generateLLMEnhancedPrompt(specialistId);
      if (enhancedPrompt) {
        return enhancedPrompt;
      }
    } catch (error) {
      console.error('[AIPG] Error generating LLM-enhanced prompt:', error);
    }

    // Fallback to specialist-specific static prompt generation
    return this.generateSpecialistSpecificPrompt(specialistId);
  }

  /**
   * Generate prompt enhanced by LLM based on all user responses
   */
  async generateLLMEnhancedPrompt(specialistId) {
    const allResponses = this.getStepResponseSummary();
    const step1 = this.stepResponses[1] || {};
    const topic = step1.topic || this.getDefaultTopic(specialistId);

    const llmPrompt = this.buildLLMPromptBySpecialist(
      specialistId,
      allResponses,
      topic
    );

    const llmResponse = await this.callLLMAPI(llmPrompt);
    return llmResponse;
  }

  /**
   * Get the current specialist ID from specialist data
   */
  getSpecialistId() {
    if (this.specialistData && this.specialistData.id) {
      return this.specialistData.id;
    }
    // Fallback to name-based detection for backward compatibility
    if (this.currentSpecialist) {
      return this.currentSpecialist
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
    }
    return 'research-analysis'; // Default fallback
  }

  /**
   * Get default topic based on specialist type
   */
  getDefaultTopic(specialistId) {
    const topics = {
      'research-analysis': 'research topic',
      'ai-solution-definition': 'AI solution',
      'website-creation': 'website project',
      'prompt-engineering': 'prompt task',
      'conversational-voice-agents': 'conversational agent',
      'saas-product-planning': 'SaaS product',
      'workflow-automation-design': 'workflow automation',
      'client-outreach-messaging': 'outreach campaign',
      'data-analysis-support': 'data analysis',
      'documentation-writing': 'documentation project',
    };
    return topics[specialistId] || 'the specified topic';
  }

  /**
   * Build LLM prompt based on specialist type
   */
  buildLLMPromptBySpecialist(specialistId, allResponses, topic) {
    switch (specialistId) {
      case 'research-analysis':
        return `Create a comprehensive CRISP framework research prompt based on these user responses:

${allResponses}

Structure the prompt with these sections:
1. CONTEXT - Background and market landscape for ${topic}
2. RESEARCH - Data gathering and analysis requirements 
3. INSIGHTS - Key findings and patterns to identify
4. STRATEGY - Strategic implications and recommendations
5. PRACTICAL APPLICATION - Actionable next steps

Make it professional, specific to their research needs, and optimized for AI research assistants. Include specific deliverables and expected outputs. Format for easy copy-paste.`;

      case 'website-creation':
        return `Create a comprehensive website creation guide based on these user responses:

${allResponses}

Structure the guide with these sections:
1. PROJECT OVERVIEW - Site purpose, target audience, and objectives
2. TECHNICAL REQUIREMENTS - Platform, hosting, and deployment specifications
3. CONTENT STRATEGY - Site structure, copywriting, and SEO approach
4. DESIGN & DEVELOPMENT - UI/UX guidelines and development roadmap
5. DEPLOYMENT GUIDE - Step-by-step launch and monitoring instructions

Make it actionable for web developers and include specific technical recommendations. Format for easy implementation.`;

      case 'prompt-engineering':
        return `Create an optimized prompt engineering template based on these user responses:

${allResponses}

Structure the template with these sections:
1. TASK DEFINITION - Clear objective and success criteria
2. PROMPT STRUCTURE - Template with placeholders and examples
3. TESTING FRAMEWORK - Evaluation methods and metrics
4. OPTIMIZATION GUIDE - Refinement techniques and best practices
5. DEPLOYMENT INSTRUCTIONS - Implementation and monitoring setup

Make it reusable and include specific prompt patterns. Format for easy customization and deployment.`;

      case 'ai-solution-definition':
        return `Create a comprehensive AI solution implementation plan based on these user responses:

${allResponses}

Structure the plan with these sections:
1. SOLUTION OVERVIEW - Business problem, chosen approach, and expected outcomes
2. TECHNICAL ARCHITECTURE - AI components, data flow, and system design
3. IMPLEMENTATION ROADMAP - Development phases, milestones, and timeline
4. INTEGRATION REQUIREMENTS - APIs, data sources, and system connections
5. SUCCESS METRICS - KPIs, testing criteria, and performance monitoring

Make it comprehensive enough for development teams. Include specific technical recommendations and implementation steps.`;

      case 'conversational-voice-agents':
        return `Create a comprehensive conversational agent development guide based on these user responses:

${allResponses}

Structure the guide with these sections:
1. AGENT SPECIFICATIONS - Use case, target users, and conversation goals
2. INTENT ARCHITECTURE - Intents, entities, and dialogue flows
3. CONVERSATION DESIGN - Scripts, responses, and error handling
4. PLATFORM INTEGRATION - Technology stack and deployment requirements
5. TESTING & OPTIMIZATION - Testing scenarios and performance metrics

Make it actionable for developers using platforms like Dialogflow, Rasa, or custom solutions.`;

      case 'saas-product-planning':
        return `Create a comprehensive SaaS product development plan based on these user responses:

${allResponses}

Structure the plan with these sections:
1. PRODUCT VISION - Target users, problem definition, and solution approach
2. FEATURE ROADMAP - Core features, AI capabilities, and development phases
3. TECHNICAL ARCHITECTURE - System design, data pipelines, and infrastructure
4. USER EXPERIENCE - Interface design, user flows, and interaction patterns
5. GO-TO-MARKET STRATEGY - Launch plan, metrics, and success criteria

Make it comprehensive for product teams and include specific technical and business recommendations.`;

      case 'workflow-automation-design':
        return `Create a comprehensive workflow automation blueprint based on these user responses:

${allResponses}

Structure the blueprint with these sections:
1. PROCESS MAPPING - Current workflow, pain points, and automation opportunities
2. TRIGGER DESIGN - Events, data sources, and automation triggers
3. WORKFLOW LOGIC - Actions, conditions, and decision trees
4. SYSTEM INTEGRATION - APIs, connectors, and data flows
5. MONITORING & OPTIMIZATION - Error handling, performance metrics, and scaling

Make it implementable with n8n, Make.com, Zapier, or similar automation platforms.`;

      case 'client-outreach-messaging':
        return `Create a comprehensive outreach campaign strategy based on these user responses:

${allResponses}

Structure the strategy with these sections:
1. AUDIENCE ANALYSIS - Target segments, personas, and messaging strategy
2. MESSAGE TEMPLATES - Personalized outreach scripts and variations
3. AUTOMATION SETUP - Multi-channel sequences and timing
4. RESPONSE HANDLING - Lead qualification and follow-up processes
5. PERFORMANCE OPTIMIZATION - Metrics tracking and campaign improvement

Make it actionable for sales and marketing teams using CRM and automation tools.`;

      case 'data-analysis-support':
        return `Create a comprehensive data analysis plan based on these user responses:

${allResponses}

Structure the plan with these sections:
1. DATA ASSESSMENT - Dataset overview, quality evaluation, and preparation needs
2. ANALYSIS FRAMEWORK - Hypotheses, questions, and statistical approach
3. METHODOLOGY - Techniques, tools, and validation methods
4. VISUALIZATION STRATEGY - Charts, dashboards, and reporting approach
5. INSIGHTS & RECOMMENDATIONS - Findings presentation and action items

Make it executable with Python, R, or business intelligence tools. Include specific code suggestions and methodologies.`;

      case 'documentation-writing':
        return `Create a comprehensive documentation plan based on these user responses:

${allResponses}

Structure the plan with these sections:
1. AUDIENCE & PURPOSE - Target readers, use cases, and success criteria
2. CONTENT STRATEGY - Information architecture and content types
3. WRITING GUIDELINES - Style, tone, and formatting standards
4. VISUAL DESIGN - Layout, diagrams, and multimedia elements
5. PUBLICATION & MAINTENANCE - Platform, workflow, and update procedures

Make it actionable for technical writers and content teams. Include specific templates and best practices.`;

      default:
        // Default to research framework for unknown specialists
        return `Create a comprehensive ${topic} guide based on these user responses:

${allResponses}

Structure the guide with appropriate sections for ${topic} and make it actionable and professional. Include specific deliverables and expected outputs. Format for easy implementation.`;
    }
  }

  /**
   * Generate specialist-specific static prompt
   */
  generateSpecialistSpecificPrompt(specialistId) {
    switch (specialistId) {
      case 'research-analysis':
        return this.generateResearchAnalysisPrompt();
      case 'website-creation':
        return this.generateWebsiteCreationPrompt();
      case 'prompt-engineering':
        return this.generatePromptEngineeringPrompt();
      case 'ai-solution-definition':
        return this.generateAISolutionPrompt();
      case 'conversational-voice-agents':
        return this.generateConversationalAgentPrompt();
      case 'saas-product-planning':
        return this.generateSaaSProductPrompt();
      case 'workflow-automation-design':
        return this.generateWorkflowAutomationPrompt();
      case 'client-outreach-messaging':
        return this.generateOutreachMessagingPrompt();
      case 'data-analysis-support':
        return this.generateDataAnalysisPrompt();
      case 'documentation-writing':
        return this.generateDocumentationPrompt();
      default:
        // Fallback to research analysis for unknown specialists
        return this.generateResearchAnalysisPrompt();
    }
  }

  /**
   * Generate research analysis prompt (original CRISP framework implementation)
   */
  generateResearchAnalysisPrompt() {
    // Get all collected data
    const step1 = this.stepResponses[1] || {};
    const step2 = this.stepResponses[2] || {};
    const step3 = this.stepResponses[3] || {};
    const step4 = this.stepResponses[4] || {};
    const step5 = this.stepResponses[5] || {};
    const step6 = this.stepResponses[6] || {};
    const step7 = this.stepResponses[7] || {};

    const topic = step1.topic || 'the specified topic';
    const focus = step1.focus || '';
    const dataSources = step2.data_sources || '';
    const keyInsights = step3.key_insights || '';
    const competitors = step4.competitors || '';
    const opportunities = step5.opportunities || '';
    const visualizations = step6.visualizations || '';
    const reportFormat = step7.report_format || '';

    // Generate comprehensive CRISP framework prompt with model-specific optimizations
    let prompt = this.getModelSpecificPromptHeader(topic, focus);

    prompt += `\n\n## CRISP Framework Analysis Required:\n\n`;

    // Context section
    prompt += `### 🌍 CONTEXT\n`;
    prompt += `Provide comprehensive background information including:\n`;
    prompt += `- Historical context and evolution of ${topic}\n`;
    prompt += `- Current market landscape and key stakeholders\n`;
    prompt += `- Industry trends and regulatory environment\n`;
    if (focus) prompt += `- Specific context related to ${focus}\n`;
    prompt += `\n`;

    // Research section
    prompt += `### 🔬 RESEARCH\n`;
    prompt += `Gather and present findings from multiple sources:\n`;
    if (dataSources) {
      prompt += `- Focus on these data sources: ${dataSources}\n`;
    } else {
      prompt += `- Academic research and industry reports\n`;
      prompt += `- Recent news and market analysis\n`;
      prompt += `- Expert opinions and case studies\n`;
    }
    if (competitors) {
      prompt += `- Detailed analysis of these key players: ${competitors}\n`;
    }
    prompt += `- Quantitative data and market metrics\n`;
    prompt += `\n`;

    // Insights section
    prompt += `### 💡 INSIGHTS\n`;
    prompt += `Extract and analyze key patterns:\n`;
    if (keyInsights) {
      prompt += `- Focus specifically on: ${keyInsights}\n`;
    }
    prompt += `- Market size, growth trends, and forecasts\n`;
    prompt += `- Key challenges and pain points\n`;
    prompt += `- Success factors and best practices\n`;
    if (competitors) {
      prompt += `- SWOT analysis for major competitors: ${competitors}\n`;
      prompt += `- Competitive positioning and market share\n`;
    }
    prompt += `\n`;

    // Strategy section
    prompt += `### 🎯 STRATEGY\n`;
    prompt += `Provide actionable strategic recommendations:\n`;
    if (opportunities) {
      prompt += `- Focus on identifying: ${opportunities}\n`;
    } else {
      prompt += `- Market gaps and unmet needs\n`;
      prompt += `- Emerging opportunities and threats\n`;
    }
    prompt += `- Strategic priorities and investment areas\n`;
    prompt += `- Risk mitigation strategies\n`;
    prompt += `- Timeline and resource requirements\n`;
    prompt += `\n`;

    // Practical Application section
    prompt += `### ⚡ PRACTICAL APPLICATION\n`;
    prompt += `Explain implementation approach:\n`;
    prompt += `- Step-by-step action plan\n`;
    prompt += `- Resource allocation and team requirements\n`;
    prompt += `- Success metrics and KPIs to track\n`;
    prompt += `- Common pitfalls and how to avoid them\n`;
    if (visualizations) {
      prompt += `- Include guidance for creating: ${visualizations}\n`;
    }
    prompt += `\n`;

    // Format requirements
    prompt += `## 📋 FORMAT REQUIREMENTS:\n\n`;
    if (reportFormat) {
      prompt += `**Preferred Format:** ${reportFormat}\n\n`;
    }
    prompt += `- Use clear headings and bullet points for readability\n`;
    prompt += `- Include specific examples and case studies where relevant\n`;
    prompt += `- Provide quantitative data and statistics when available\n`;
    prompt += `- Cite sources and maintain evidence-based analysis\n`;
    prompt += `- Keep sections balanced but prioritize actionable insights\n\n`;

    prompt += `## 🎯 SUCCESS CRITERIA:\n\n`;
    prompt += `The analysis should be:\n`;
    prompt += `- **Comprehensive**: Covering all aspects of ${topic}\n`;
    prompt += `- **Actionable**: Providing clear next steps and recommendations\n`;
    prompt += `- **Evidence-based**: Supported by credible data and sources\n`;
    prompt += `- **Strategic**: Focused on long-term value and competitive advantage\n`;
    prompt += `- **Practical**: Implementable with realistic timelines and resources\n`;

    return prompt;
  }

  /**
   * Generate website creation deployment guide and specifications
   */
  generateWebsiteCreationPrompt() {
    const step1 = this.stepResponses[1] || {};
    const step2 = this.stepResponses[2] || {};
    const step3 = this.stepResponses[3] || {};
    const step4 = this.stepResponses[4] || {};
    const step5 = this.stepResponses[5] || {};
    const step6 = this.stepResponses[6] || {};
    const step7 = this.stepResponses[7] || {};
    const step8 = this.stepResponses[8] || {};

    const requirements = step1.requirements || 'website requirements';
    const content = step2.content || '';
    const design = step3.design || '';
    const frontend = step4.frontend || '';
    const backend = step5.backend || '';
    const testing = step6.testing || '';
    const deployment = step7.deployment || '';
    const monitoring = step8.monitoring || '';

    let prompt = `# Website Creation Deployment Guide\n\n`;
    prompt += `Based on your responses, here's your comprehensive website deployment guide and technical specifications.\n\n`;

    prompt += `## 🎯 PROJECT OVERVIEW\n\n`;
    prompt += `**Requirements:** ${requirements}\n`;
    if (content) prompt += `**Content Strategy:** ${content}\n`;
    if (design) prompt += `**Design Approach:** ${design}\n`;
    prompt += `\n`;

    prompt += `## 🛠️ TECHNICAL SPECIFICATIONS\n\n`;
    prompt += `### Frontend Development\n`;
    if (frontend) {
      prompt += `- Implementation details: ${frontend}\n`;
    } else {
      prompt += `- Use modern framework (React, Vue, or vanilla HTML/CSS/JS)\n`;
      prompt += `- Ensure responsive design for all devices\n`;
      prompt += `- Implement accessibility standards (WCAG 2.1)\n`;
    }
    prompt += `\n`;

    prompt += `### Backend Services\n`;
    if (backend) {
      prompt += `- Backend setup: ${backend}\n`;
    } else {
      prompt += `- Use serverless functions for forms and APIs\n`;
      prompt += `- Implement proper data validation and security\n`;
      prompt += `- Set up email notifications and integrations\n`;
    }
    prompt += `\n`;

    prompt += `## 📋 TESTING CHECKLIST\n\n`;
    if (testing) {
      prompt += `**Testing Requirements:**\n${testing}\n`;
    } else {
      prompt += `- [ ] Cross-browser compatibility (Chrome, Firefox, Safari, Edge)\n`;
      prompt += `- [ ] Mobile responsiveness on various devices\n`;
      prompt += `- [ ] Form functionality and validation\n`;
      prompt += `- [ ] Page load speed optimization\n`;
      prompt += `- [ ] SEO elements and meta tags\n`;
      prompt += `- [ ] Accessibility compliance\n`;
    }
    prompt += `\n`;

    prompt += `## 🚀 DEPLOYMENT INSTRUCTIONS\n\n`;
    if (deployment) {
      prompt += `**Deployment Plan:**\n${deployment}\n`;
    } else {
      prompt += `1. **Version Control Setup**\n`;
      prompt += `   - Initialize Git repository\n`;
      prompt += `   - Push to GitHub/GitLab\n\n`;
      prompt += `2. **Hosting Platform**\n`;
      prompt += `   - Deploy to Vercel, Netlify, or Cloudflare Pages\n`;
      prompt += `   - Configure custom domain and SSL\n`;
      prompt += `   - Set up continuous deployment\n\n`;
      prompt += `3. **Environment Configuration**\n`;
      prompt += `   - Configure environment variables\n`;
      prompt += `   - Set up database connections if needed\n`;
      prompt += `   - Configure email services\n`;
    }
    prompt += `\n`;

    prompt += `## 📊 MONITORING & MAINTENANCE\n\n`;
    if (monitoring) {
      prompt += `**Monitoring Setup:**\n${monitoring}\n`;
    } else {
      prompt += `- Set up Google Analytics or Plausible\n`;
      prompt += `- Configure error monitoring (Sentry)\n`;
      prompt += `- Monitor site performance and uptime\n`;
      prompt += `- Schedule regular backups\n`;
      prompt += `- Plan content updates and maintenance\n`;
    }

    return prompt;
  }

  /**
   * Generate prompt engineering templates and optimization guide
   */
  generatePromptEngineeringPrompt() {
    const step1 = this.stepResponses[1] || {};
    const step2 = this.stepResponses[2] || {};
    const step3 = this.stepResponses[3] || {};
    const step4 = this.stepResponses[4] || {};
    const step5 = this.stepResponses[5] || {};
    const step6 = this.stepResponses[6] || {};
    const step7 = this.stepResponses[7] || {};

    const task = step1.task || 'AI task';
    const initialPrompts = step2.prompts || '';
    const testing = step3.testing || '';
    const refinements = step4.refinements || '';
    const templates = step5.templates || '';
    const automation = step6.automation || '';
    const monitoring = step7.monitoring || '';

    let prompt = `# Optimized Prompt Engineering Template\n\n`;
    prompt += `Based on your responses, here's your comprehensive prompt template and optimization guide.\n\n`;

    prompt += `## 🎯 TASK DEFINITION\n\n`;
    prompt += `**Primary Task:** ${task}\n`;
    if (initialPrompts) prompt += `**Initial Approach:** ${initialPrompts}\n`;
    prompt += `\n`;

    prompt += `## 📝 OPTIMIZED PROMPT TEMPLATE\n\n`;
    prompt += `### Base Template Structure\n`;
    prompt += `\`\`\`\n`;
    prompt += `# Role Definition\n`;
    prompt += `You are an expert [SPECIALIST] with deep knowledge in [DOMAIN].\n\n`;
    prompt += `# Task Description\n`;
    prompt += `Your task is to [SPECIFIC_ACTION] for [CONTEXT].\n\n`;
    prompt += `# Input Data\n`;
    prompt += `[DYNAMIC_CONTENT]\n\n`;
    prompt += `# Output Format\n`;
    prompt += `Please structure your response as:\n`;
    prompt += `1. [SECTION_1]\n`;
    prompt += `2. [SECTION_2]\n`;
    prompt += `3. [SECTION_3]\n\n`;
    prompt += `# Quality Criteria\n`;
    prompt += `Ensure your response is:\n`;
    prompt += `- [CRITERION_1]\n`;
    prompt += `- [CRITERION_2]\n`;
    prompt += `- [CRITERION_3]\n`;
    prompt += `\`\`\`\n\n`;

    if (refinements) {
      prompt += `## ⚡ REFINEMENT TECHNIQUES\n\n`;
      prompt += `**Applied Optimizations:**\n${refinements}\n\n`;
    } else {
      prompt += `## ⚡ OPTIMIZATION TECHNIQUES\n\n`;
      prompt += `- **Few-shot Examples:** Add 2-3 examples of desired output\n`;
      prompt += `- **Chain-of-Thought:** Use "Let's think step by step" for reasoning tasks\n`;
      prompt += `- **Constraint Specification:** Define clear boundaries and limitations\n`;
      prompt += `- **Output Formatting:** Specify exact format requirements\n`;
      prompt += `- **Context Priming:** Provide relevant background information\n\n`;
    }

    prompt += `## 🧪 TESTING FRAMEWORK\n\n`;
    if (testing) {
      prompt += `**Testing Approach:**\n${testing}\n`;
    } else {
      prompt += `1. **Test Cases:** Create 5-10 diverse input examples\n`;
      prompt += `2. **Success Metrics:** Define measurable quality criteria\n`;
      prompt += `3. **A/B Testing:** Compare prompt variations\n`;
      prompt += `4. **Edge Cases:** Test with unusual or challenging inputs\n`;
      prompt += `5. **Performance Tracking:** Monitor consistency and accuracy\n`;
    }
    prompt += `\n`;

    if (templates) {
      prompt += `## 📚 REUSABLE TEMPLATES\n\n`;
      prompt += `**Template Library:**\n${templates}\n\n`;
    }

    if (automation) {
      prompt += `## 🤖 DEPLOYMENT AUTOMATION\n\n`;
      prompt += `**Automation Setup:**\n${automation}\n\n`;
    } else {
      prompt += `## 🤖 DEPLOYMENT RECOMMENDATIONS\n\n`;
      prompt += `- Use n8n or Make.com for workflow automation\n`;
      prompt += `- Implement dynamic variable substitution\n`;
      prompt += `- Set up error handling and fallbacks\n`;
      prompt += `- Monitor performance and adjust as needed\n\n`;
    }

    if (monitoring) {
      prompt += `## 📊 MONITORING & OPTIMIZATION\n\n`;
      prompt += `**Monitoring Plan:**\n${monitoring}\n`;
    } else {
      prompt += `## 📊 CONTINUOUS IMPROVEMENT\n\n`;
      prompt += `- Track response quality over time\n`;
      prompt += `- Collect user feedback on outputs\n`;
      prompt += `- Update prompts based on performance data\n`;
      prompt += `- Maintain version control for prompt iterations\n`;
    }

    return prompt;
  }

  /**
   * Generate AI solution implementation plan
   */
  generateAISolutionPrompt() {
    const step1 = this.stepResponses[1] || {};
    const step2 = this.stepResponses[2] || {};
    const step3 = this.stepResponses[3] || {};
    const step4 = this.stepResponses[4] || {};
    const step5 = this.stepResponses[5] || {};
    const step6 = this.stepResponses[6] || {};
    const step7 = this.stepResponses[7] || {};
    const step8 = this.stepResponses[8] || {};
    const step9 = this.stepResponses[9] || {};

    const problem = step1.problem || 'business problem';
    const category = step2.category || '';
    const concept = step3.concept || '';
    const techStack = step4.tech_stack || '';
    const workflows = step5.workflows || '';
    const components = step6.components || '';
    const roadmap = step7.roadmap || '';
    const aiAssessment = step8.ai_assessment || '';
    const finalPrompt = step9.final_prompt || '';

    let prompt = `# AI Solution Implementation Plan\n\n`;
    prompt += `Based on your responses, here's your comprehensive AI solution implementation plan.\n\n`;

    prompt += `## 🎯 SOLUTION OVERVIEW\n\n`;
    prompt += `**Business Problem:** ${problem}\n`;
    if (category) prompt += `**Solution Category:** ${category}\n`;
    if (concept) prompt += `**Chosen Concept:** ${concept}\n`;
    prompt += `\n`;

    prompt += `## 🏗️ TECHNICAL ARCHITECTURE\n\n`;
    if (techStack) {
      prompt += `**Recommended Tech Stack:**\n${techStack}\n\n`;
    } else {
      prompt += `### Core Components:\n`;
      prompt += `- **LLM Integration:** OpenAI GPT-4 or Anthropic Claude\n`;
      prompt += `- **Backend Framework:** Node.js with Express or Python with FastAPI\n`;
      prompt += `- **Database:** PostgreSQL with vector extensions for embeddings\n`;
      prompt += `- **Orchestration:** n8n for workflow automation\n`;
      prompt += `- **Hosting:** AWS, GCP, or Azure cloud platform\n\n`;
    }

    if (workflows) {
      prompt += `## 🔄 USER WORKFLOWS\n\n`;
      prompt += `**Workflow Specifications:**\n${workflows}\n\n`;
    }

    if (components) {
      prompt += `## 🧩 SYSTEM COMPONENTS\n\n`;
      prompt += `**Component Architecture:**\n${components}\n\n`;
    } else {
      prompt += `## 🧩 SYSTEM COMPONENTS\n\n`;
      prompt += `### Required Components:\n`;
      prompt += `- **AI Engine:** LLM API integration with prompt management\n`;
      prompt += `- **Data Layer:** Vector database for knowledge storage\n`;
      prompt += `- **API Gateway:** RESTful API for client integration\n`;
      prompt += `- **User Interface:** Web/mobile frontend for user interaction\n`;
      prompt += `- **Authentication:** User management and access control\n`;
      prompt += `- **Monitoring:** Performance tracking and error handling\n\n`;
    }

    prompt += `## 📅 IMPLEMENTATION ROADMAP\n\n`;
    if (roadmap) {
      prompt += `**Development Timeline:**\n${roadmap}\n`;
    } else {
      prompt += `### Phase 1: MVP Development (4-6 weeks)\n`;
      prompt += `- Core AI functionality implementation\n`;
      prompt += `- Basic user interface development\n`;
      prompt += `- Essential integrations setup\n\n`;
      prompt += `### Phase 2: Feature Enhancement (3-4 weeks)\n`;
      prompt += `- Advanced AI capabilities\n`;
      prompt += `- User experience improvements\n`;
      prompt += `- Performance optimization\n\n`;
      prompt += `### Phase 3: Production Deployment (2-3 weeks)\n`;
      prompt += `- Security hardening\n`;
      prompt += `- Monitoring and analytics\n`;
      prompt += `- User onboarding and documentation\n`;
    }
    prompt += `\n`;

    if (aiAssessment) {
      prompt += `## ✅ AI SUITABILITY ASSESSMENT\n\n`;
      prompt += `**Assessment Results:**\n${aiAssessment}\n\n`;
    }

    prompt += `## 📊 SUCCESS METRICS\n\n`;
    prompt += `### Key Performance Indicators:\n`;
    prompt += `- **Accuracy:** AI response relevance and correctness\n`;
    prompt += `- **Performance:** Response time and system availability\n`;
    prompt += `- **User Satisfaction:** Usage metrics and feedback scores\n`;
    prompt += `- **Business Impact:** ROI and efficiency improvements\n`;
    prompt += `- **Scalability:** System performance under load\n\n`;

    prompt += `## 🚀 NEXT STEPS\n\n`;
    prompt += `1. **Technical Validation:** Validate technical feasibility and architecture\n`;
    prompt += `2. **Resource Planning:** Assemble development team and allocate budget\n`;
    prompt += `3. **Prototype Development:** Build minimal viable prototype\n`;
    prompt += `4. **User Testing:** Conduct user acceptance testing\n`;
    prompt += `5. **Production Deployment:** Launch and monitor system performance\n`;

    return prompt;
  }

  /**
   * Generate conversational agent design specifications
   */
  generateConversationalAgentPrompt() {
    // This specialist has different workflow paths, so we need to handle both
    const responses = this.stepResponses;

    let prompt = `# Conversational Agent Design Specifications\n\n`;
    prompt += `Based on your responses, here's your comprehensive conversational agent design guide.\n\n`;

    // Determine if this is text chatbot or voice assistant based on responses
    const isVoiceAssistant = Object.keys(responses).some(
      key => parseInt(key) >= 11
    );

    if (isVoiceAssistant) {
      // Voice Assistant workflow
      const useCase = responses[11]?.use_case || 'voice interactions';
      const intents = responses[12]?.intents || '';
      const flow = responses[13]?.flow || '';
      const prototype = responses[14]?.prototype || '';
      const platform = responses[15]?.platform || '';
      const development = responses[16]?.development || '';
      const optimization = responses[17]?.optimization || '';

      prompt += `## 🗣️ VOICE ASSISTANT SPECIFICATIONS\n\n`;
      prompt += `**Use Case:** ${useCase}\n\n`;

      if (intents) {
        prompt += `## 🎯 VOICE INTENTS & SLOTS\n\n`;
        prompt += `${intents}\n\n`;
      }

      if (flow) {
        prompt += `## 💬 CONVERSATION FLOW\n\n`;
        prompt += `${flow}\n\n`;
      }

      if (platform) {
        prompt += `## 🛠️ PLATFORM & INTEGRATIONS\n\n`;
        prompt += `${platform}\n\n`;
      }
    } else {
      // Text Chatbot workflow
      const useCase = responses[1]?.use_case || 'chat interactions';
      const intents = responses[2]?.intents || '';
      const flow = responses[3]?.flow || '';
      const ui = responses[4]?.ui || '';
      const techStack = responses[5]?.tech_stack || '';
      const development = responses[6]?.development || '';
      const testing = responses[7]?.testing || '';

      prompt += `## 💬 TEXT CHATBOT SPECIFICATIONS\n\n`;
      prompt += `**Use Case:** ${useCase}\n\n`;

      if (intents) {
        prompt += `## 🎯 INTENTS & ENTITIES\n\n`;
        prompt += `${intents}\n\n`;
      }

      if (flow) {
        prompt += `## 🔄 CONVERSATION FLOW\n\n`;
        prompt += `${flow}\n\n`;
      }

      if (ui) {
        prompt += `## 🎨 USER INTERFACE\n\n`;
        prompt += `${ui}\n\n`;
      }

      if (techStack) {
        prompt += `## 🛠️ TECHNOLOGY STACK\n\n`;
        prompt += `${techStack}\n\n`;
      }
    }

    prompt += `## 📊 TESTING & OPTIMIZATION\n\n`;
    prompt += `### Testing Framework:\n`;
    prompt += `- Intent recognition accuracy testing\n`;
    prompt += `- Conversation flow validation\n`;
    prompt += `- User acceptance testing\n`;
    prompt += `- Performance and scalability testing\n\n`;

    prompt += `### Optimization Strategy:\n`;
    prompt += `- Monitor conversation success rates\n`;
    prompt += `- Analyze user feedback and pain points\n`;
    prompt += `- Continuously improve NLU models\n`;
    prompt += `- A/B testing for response variations\n\n`;

    prompt += `## 🚀 DEPLOYMENT GUIDE\n\n`;
    prompt += `1. **Development Environment Setup**\n`;
    prompt += `2. **NLU Model Training and Testing**\n`;
    prompt += `3. **Integration with Backend Systems**\n`;
    prompt += `4. **User Interface Implementation**\n`;
    prompt += `5. **Production Deployment and Monitoring**\n`;

    return prompt;
  }

  /**
   * Generate SaaS product planning comprehensive guide
   */
  generateSaaSProductPrompt() {
    const step1 = this.stepResponses[1] || {};
    const step2 = this.stepResponses[2] || {};
    const step3 = this.stepResponses[3] || {};
    const step4 = this.stepResponses[4] || {};
    const step5 = this.stepResponses[5] || {};
    const step6 = this.stepResponses[6] || {};
    const step7 = this.stepResponses[7] || {};

    const vision = step1.vision || 'SaaS product vision';
    const features = step2.features || '';
    const pipelines = step3.pipelines || '';
    const wireframes = step4.wireframes || '';
    const architecture = step5.architecture || '';
    const roadmap = step6.roadmap || '';
    const validation = step7.validation || '';

    let prompt = `# SaaS Product Planning Guide\n\n`;
    prompt += `Based on your responses, here's your comprehensive SaaS product development plan.\n\n`;

    prompt += `## 🎯 PRODUCT VISION & STRATEGY\n\n`;
    prompt += `**Vision:** ${vision}\n\n`;

    if (features) {
      prompt += `## 🚀 AI FEATURES & CAPABILITIES\n\n`;
      prompt += `${features}\n\n`;
    }

    if (pipelines) {
      prompt += `## 🔄 DATA & ML PIPELINES\n\n`;
      prompt += `${pipelines}\n\n`;
    } else {
      prompt += `## 🔄 TECHNICAL ARCHITECTURE\n\n`;
      prompt += `### Core Components:\n`;
      prompt += `- **Frontend:** React/Vue.js with responsive design\n`;
      prompt += `- **Backend:** Node.js/Python API with microservices\n`;
      prompt += `- **Database:** PostgreSQL with Redis caching\n`;
      prompt += `- **AI/ML:** Integration with OpenAI/Anthropic APIs\n`;
      prompt += `- **Authentication:** Auth0 or similar service\n`;
      prompt += `- **Payments:** Stripe integration for subscriptions\n\n`;
    }

    if (wireframes) {
      prompt += `## 🎨 USER EXPERIENCE DESIGN\n\n`;
      prompt += `${wireframes}\n\n`;
    }

    if (architecture) {
      prompt += `## 🏗️ SYSTEM ARCHITECTURE\n\n`;
      prompt += `${architecture}\n\n`;
    }

    prompt += `## 📅 DEVELOPMENT ROADMAP\n\n`;
    if (roadmap) {
      prompt += `${roadmap}\n`;
    } else {
      prompt += `### Phase 1: MVP Development (8-12 weeks)\n`;
      prompt += `- User authentication and onboarding\n`;
      prompt += `- Core AI features implementation\n`;
      prompt += `- Basic dashboard and analytics\n`;
      prompt += `- Payment processing setup\n\n`;
      prompt += `### Phase 2: Feature Expansion (6-8 weeks)\n`;
      prompt += `- Advanced AI capabilities\n`;
      prompt += `- Integration ecosystem\n`;
      prompt += `- Enhanced user experience\n`;
      prompt += `- Mobile responsiveness\n\n`;
      prompt += `### Phase 3: Scale & Growth (4-6 weeks)\n`;
      prompt += `- Performance optimization\n`;
      prompt += `- Advanced analytics\n`;
      prompt += `- Enterprise features\n`;
      prompt += `- API documentation\n`;
    }
    prompt += `\n`;

    if (validation) {
      prompt += `## ✅ VALIDATION & FEEDBACK\n\n`;
      prompt += `${validation}\n\n`;
    }

    prompt += `## 💰 BUSINESS MODEL\n\n`;
    prompt += `### Pricing Strategy:\n`;
    prompt += `- **Freemium:** Basic features with usage limits\n`;
    prompt += `- **Professional:** Advanced features and higher limits\n`;
    prompt += `- **Enterprise:** Custom solutions and dedicated support\n\n`;

    prompt += `### Go-to-Market Strategy:\n`;
    prompt += `- Content marketing and SEO\n`;
    prompt += `- Product-led growth with free trials\n`;
    prompt += `- Partnership and integration channels\n`;
    prompt += `- Community building and user advocacy\n\n`;

    prompt += `## 📊 SUCCESS METRICS\n\n`;
    prompt += `### Key Metrics to Track:\n`;
    prompt += `- **User Acquisition:** Signups and activation rates\n`;
    prompt += `- **Product Usage:** Feature adoption and engagement\n`;
    prompt += `- **Revenue:** MRR, churn rate, and customer LTV\n`;
    prompt += `- **Customer Success:** NPS, support tickets, retention\n`;

    return prompt;
  }

  /**
   * Generate workflow automation design specifications
   */
  generateWorkflowAutomationPrompt() {
    const step1 = this.stepResponses[1] || {};
    const step2 = this.stepResponses[2] || {};
    const step3 = this.stepResponses[3] || {};
    const step4 = this.stepResponses[4] || {};
    const step5 = this.stepResponses[5] || {};
    const step6 = this.stepResponses[6] || {};
    const step7 = this.stepResponses[7] || {};

    const process = step1.process || 'business process';
    const triggers = step2.triggers || '';
    const actions = step3.actions || '';
    const integrations = step4.integrations || '';
    const workflow = step5.workflow || '';
    const monitoring = step6.monitoring || '';
    const maintenance = step7.maintenance || '';

    let prompt = `# Workflow Automation Design Specifications\n\n`;
    prompt += `Based on your responses, here's your comprehensive workflow automation implementation guide.\n\n`;

    prompt += `## 🎯 BUSINESS PROCESS OVERVIEW\n\n`;
    prompt += `**Process:** ${process}\n\n`;

    if (triggers) {
      prompt += `## ⚡ TRIGGERS & EVENTS\n\n`;
      prompt += `${triggers}\n\n`;
    } else {
      prompt += `## ⚡ AUTOMATION TRIGGERS\n\n`;
      prompt += `### Event-Based Triggers:\n`;
      prompt += `- Form submissions and data entries\n`;
      prompt += `- Email receipts and notifications\n`;
      prompt += `- File uploads and document changes\n`;
      prompt += `- CRM updates and lead scoring\n`;
      prompt += `- Time-based scheduling and reminders\n\n`;
    }

    if (actions) {
      prompt += `## 🔄 ACTIONS & CONDITIONS\n\n`;
      prompt += `${actions}\n\n`;
    } else {
      prompt += `## 🔄 AUTOMATED ACTIONS\n\n`;
      prompt += `### Action Categories:\n`;
      prompt += `- Data processing and transformation\n`;
      prompt += `- Notification and communication\n`;
      prompt += `- System updates and synchronization\n`;
      prompt += `- Approval workflows and routing\n`;
      prompt += `- Reporting and analytics\n\n`;
    }

    if (integrations) {
      prompt += `## 🔗 SYSTEM INTEGRATIONS\n\n`;
      prompt += `${integrations}\n\n`;
    } else {
      prompt += `## 🔗 INTEGRATION REQUIREMENTS\n\n`;
      prompt += `### Common Integrations:\n`;
      prompt += `- **CRM Systems:** HubSpot, Salesforce, Pipedrive\n`;
      prompt += `- **Email Platforms:** Gmail, Outlook, Mailchimp\n`;
      prompt += `- **Project Management:** Asana, Trello, Monday.com\n`;
      prompt += `- **Communication:** Slack, Microsoft Teams, Discord\n`;
      prompt += `- **Storage:** Google Drive, Dropbox, SharePoint\n\n`;
    }

    if (workflow) {
      prompt += `## 🛠️ WORKFLOW IMPLEMENTATION\n\n`;
      prompt += `${workflow}\n\n`;
    } else {
      prompt += `## 🛠️ IMPLEMENTATION GUIDE\n\n`;
      prompt += `### Platform Recommendations:\n`;
      prompt += `- **n8n:** Self-hosted, flexible automation platform\n`;
      prompt += `- **Make.com:** Visual automation with extensive integrations\n`;
      prompt += `- **Zapier:** User-friendly with large app ecosystem\n\n`;
      prompt += `### Development Steps:\n`;
      prompt += `1. Map current manual process\n`;
      prompt += `2. Identify automation opportunities\n`;
      prompt += `3. Design workflow logic and conditions\n`;
      prompt += `4. Configure integrations and API connections\n`;
      prompt += `5. Test with sample data\n`;
      prompt += `6. Deploy with monitoring\n\n`;
    }

    if (monitoring) {
      prompt += `## 📊 MONITORING & OPTIMIZATION\n\n`;
      prompt += `${monitoring}\n\n`;
    } else {
      prompt += `## 📊 PERFORMANCE MONITORING\n\n`;
      prompt += `### Monitoring Setup:\n`;
      prompt += `- Execution success rates and error tracking\n`;
      prompt += `- Performance metrics and response times\n`;
      prompt += `- Resource usage and cost optimization\n`;
      prompt += `- User satisfaction and process efficiency\n\n`;
    }

    if (maintenance) {
      prompt += `## 🔧 MAINTENANCE PLAN\n\n`;
      prompt += `${maintenance}\n\n`;
    } else {
      prompt += `## 🔧 ONGOING MAINTENANCE\n\n`;
      prompt += `### Maintenance Tasks:\n`;
      prompt += `- Regular workflow health checks\n`;
      prompt += `- Integration updates and API changes\n`;
      prompt += `- Performance optimization reviews\n`;
      prompt += `- Documentation updates and training\n`;
      prompt += `- Scaling for increased volume\n\n`;
    }

    prompt += `## 🎯 SUCCESS CRITERIA\n\n`;
    prompt += `### Expected Outcomes:\n`;
    prompt += `- **Time Savings:** Reduced manual processing time\n`;
    prompt += `- **Accuracy:** Decreased human error rates\n`;
    prompt += `- **Consistency:** Standardized process execution\n`;
    prompt += `- **Scalability:** Ability to handle increased volume\n`;
    prompt += `- **Compliance:** Audit trails and process documentation\n`;

    return prompt;
  }

  /**
   * Generate additional specialist prompts (simplified for remaining specialists)
   */
  generateOutreachMessagingPrompt() {
    const responses = this.stepResponses;
    let prompt = `# Client Outreach Messaging Campaign\n\n`;
    prompt += `Based on your workflow responses, here's your personalized outreach automation system.\n\n`;

    // Add basic structure for outreach messaging
    prompt += `## 🎯 CAMPAIGN STRATEGY\n\n`;
    Object.keys(responses).forEach(key => {
      const response = responses[key];
      if (response && typeof response === 'object') {
        Object.keys(response).forEach(field => {
          if (response[field]) {
            prompt += `**${field.replace('_', ' ').toUpperCase()}:** ${response[field]}\n`;
          }
        });
      }
    });

    prompt += `\n## 📧 OUTREACH AUTOMATION SETUP\n\n`;
    prompt += `- Multi-channel campaign coordination\n`;
    prompt += `- Personalized message templates\n`;
    prompt += `- Response tracking and analytics\n`;
    prompt += `- CRM integration and lead scoring\n`;

    return prompt;
  }

  generateDataAnalysisPrompt() {
    const responses = this.stepResponses;
    let prompt = `# Data Analysis Report & Recommendations\n\n`;
    prompt += `Based on your analysis workflow, here's your comprehensive data insights report.\n\n`;

    // Add basic structure for data analysis
    prompt += `## 📊 ANALYSIS OVERVIEW\n\n`;
    Object.keys(responses).forEach(key => {
      const response = responses[key];
      if (response && typeof response === 'object') {
        Object.keys(response).forEach(field => {
          if (response[field]) {
            prompt += `**${field.replace('_', ' ').toUpperCase()}:** ${response[field]}\n`;
          }
        });
      }
    });

    prompt += `\n## 🔍 KEY INSIGHTS & RECOMMENDATIONS\n\n`;
    prompt += `- Statistical analysis results\n`;
    prompt += `- Pattern identification and trends\n`;
    prompt += `- Actionable business recommendations\n`;
    prompt += `- Next steps for implementation\n`;

    return prompt;
  }

  generateDocumentationPrompt() {
    const responses = this.stepResponses;
    let prompt = `# Documentation Creation Guide\n\n`;
    prompt += `Based on your documentation workflow, here's your comprehensive writing and publishing plan.\n\n`;

    // Add basic structure for documentation
    prompt += `## 📄 DOCUMENTATION PLAN\n\n`;
    Object.keys(responses).forEach(key => {
      const response = responses[key];
      if (response && typeof response === 'object') {
        Object.keys(response).forEach(field => {
          if (response[field]) {
            prompt += `**${field.replace('_', ' ').toUpperCase()}:** ${response[field]}\n`;
          }
        });
      }
    });

    prompt += `\n## ✍️ CONTENT CREATION STRATEGY\n\n`;
    prompt += `- Audience-focused content structure\n`;
    prompt += `- Visual enhancement and formatting\n`;
    prompt += `- Publishing and maintenance procedures\n`;
    prompt += `- User feedback integration process\n`;

    return prompt;
  }

  /**
   * Generate model-specific prompt header
   */
  getModelSpecificPromptHeader(topic, focus) {
    const modelName = this.currentModel ? this.currentModel.toLowerCase() : '';

    let prompt = '';

    if (modelName.includes('claude')) {
      // Claude responds well to clear role definitions and structured thinking
      prompt = `I need you to act as an expert ${this.currentSpecialist} and conduct comprehensive research on **${topic}**`;
      if (focus && !['none', 'no', 'n/a'].includes(focus.toLowerCase())) {
        prompt += ` with specific focus on: ${focus}`;
      }
      prompt += `.\n\nPlease think through this systematically and provide a thorough analysis using the CRISP framework outlined below.`;
    } else if (
      modelName.includes('openai') ||
      modelName.includes('gpt') ||
      modelName.includes('chatgpt')
    ) {
      // ChatGPT responds well to direct instructions and clear role assignments
      prompt = `# Research & Analysis Request\n\n`;
      prompt += `You are a ${this.currentSpecialist}. Your task is to conduct comprehensive research on **${topic}**`;
      if (focus && !['none', 'no', 'n/a'].includes(focus.toLowerCase())) {
        prompt += ` with specific focus on: ${focus}`;
      }
      prompt += `.\n\nPlease follow the CRISP framework structure below to ensure comprehensive coverage.`;
    } else if (modelName.includes('google') || modelName.includes('gemini')) {
      // Gemini works well with clear instructions and structured approaches
      prompt = `**Research Analysis Task**\n\n`;
      prompt += `Role: ${this.currentSpecialist}\n`;
      prompt += `Topic: **${topic}**\n`;
      if (focus && !['none', 'no', 'n/a'].includes(focus.toLowerCase())) {
        prompt += `Focus Area: ${focus}\n`;
      }
      prompt += `\nPlease conduct a comprehensive research analysis using the CRISP framework methodology outlined below.`;
    } else if (modelName.includes('thinking')) {
      // Thinking models benefit from explicit reasoning instructions
      prompt = `<thinking>\nI need to conduct comprehensive research analysis on "${topic}"`;
      if (focus && !['none', 'no', 'n/a'].includes(focus.toLowerCase())) {
        prompt += ` with focus on ${focus}`;
      }
      prompt += `. I should approach this systematically using the CRISP framework to ensure thorough coverage.\n</thinking>\n\n`;
      prompt += `# Comprehensive Research Analysis\n\n`;
      prompt += `As a ${this.currentSpecialist}, I will analyze **${topic}**`;
      if (focus && !['none', 'no', 'n/a'].includes(focus.toLowerCase())) {
        prompt += ` with specific focus on ${focus}`;
      }
      prompt += ` using the CRISP framework methodology.`;
    } else {
      // Default format for other models
      prompt = `# Research & Analysis Request\n\n`;
      prompt += `Act as a ${this.currentSpecialist} and conduct comprehensive research on **${topic}**`;
      if (focus && !['none', 'no', 'n/a'].includes(focus.toLowerCase())) {
        prompt += ` with specific focus on: ${focus}`;
      }
      prompt += `.`;
    }

    return prompt;
  }

  /**
   * Get model-specific recommendations for using the generated prompt
   */
  getModelRecommendations() {
    const specialistId = this.getSpecialistId();
    const taskType = this.getTaskTypeForSpecialist(specialistId);

    if (!this.currentModel) {
      return `Paste this into your preferred AI model and ensure ${taskType} mode is selected if available`;
    }

    const modelName = this.currentModel.toLowerCase();

    if (modelName.includes('claude')) {
      return (
        `Paste this into <strong>Claude (claude.ai)</strong> - Claude excels at structured ${taskType}. ` +
        `Consider using Claude 3.5 Sonnet or Claude 3 Opus for best results with complex ${taskType} tasks.`
      );
    } else if (
      modelName.includes('openai') ||
      modelName.includes('gpt') ||
      modelName.includes('chatgpt')
    ) {
      return (
        `Paste this into <strong>ChatGPT (chat.openai.com)</strong> and ensure "<strong>${this.getGPTModeForSpecialist(specialistId)}</strong>" ` +
        `mode is selected if available. Use GPT-4 or GPT-4o for comprehensive ${taskType}.`
      );
    } else if (modelName.includes('google') || modelName.includes('gemini')) {
      return (
        `Paste this into <strong>Google Gemini (gemini.google.com)</strong> - Gemini Pro performs well with structured ` +
        `${taskType} prompts. Consider using the latest Gemini Pro model for optimal capabilities.`
      );
    } else if (modelName.includes('thinking')) {
      return (
        `Paste this into your chosen <strong>thinking/reasoning model</strong> (like o1-preview, o1-mini, or Claude with thinking). ` +
        `These models excel at deep analysis and will provide thorough, well-reasoned ${taskType} insights.`
      );
    } else if (modelName.includes('other') || modelName.includes('generic')) {
      return (
        `Paste this into your preferred AI model. For best results, use a model optimized for ${taskType} tasks, ` +
        `and enable any available ${taskType} modes.`
      );
    } else {
      // Default fallback for any unrecognized model names
      return (
        `Paste this into <strong>${this.currentModel}</strong> and ensure ${taskType} mode is selected if available. ` +
        `This prompt is optimized for comprehensive ${taskType}.`
      );
    }
  }

  /**
   * Get task type description for specialist
   */
  getTaskTypeForSpecialist(specialistId) {
    const taskTypes = {
      'research-analysis': 'research and analysis',
      'website-creation': 'web development and design',
      'prompt-engineering': 'prompt engineering and optimization',
      'ai-solution-definition': 'AI solution development',
      'conversational-voice-agents': 'conversational AI development',
      'saas-product-planning': 'product planning and development',
      'workflow-automation-design': 'workflow automation',
      'client-outreach-messaging': 'marketing and outreach',
      'data-analysis-support': 'data analysis',
      'documentation-writing': 'technical writing and documentation',
    };
    return taskTypes[specialistId] || 'analysis';
  }

  /**
   * Get GPT-specific mode recommendation for specialist
   */
  getGPTModeForSpecialist(specialistId) {
    const gptModes = {
      'research-analysis': 'Research & Analysis',
      'website-creation': 'Code Interpreter',
      'prompt-engineering': 'Creative Writing',
      'ai-solution-definition': 'Code Interpreter',
      'conversational-voice-agents': 'Creative Writing',
      'saas-product-planning': 'Data Analysis',
      'workflow-automation-design': 'Code Interpreter',
      'client-outreach-messaging': 'Creative Writing',
      'data-analysis-support': 'Data Analysis',
      'documentation-writing': 'Creative Writing',
    };
    return gptModes[specialistId] || 'Research & Analysis';
  }

  /**
   * Check if the extension context is valid
   */
  isExtensionContextValid() {
    // Optimistic for first-run (no validation yet)
    if (this.lastContextValidation === 0) {
      return true;
    }

    // If we've recently validated, return the cached result
    const now = Date.now();
    if (now - this.lastContextValidation < this.contextValidationInterval) {
      return this.extensionContextValid;
    }

    // Otherwise, we need to validate again
    return false;
  }

  /**
   * Validate the extension context
   */
  async validateExtensionContext() {
    try {
      console.log('[AIPG] Validating extension context...');

      // First check if chrome.runtime is available
      if (!chrome || !chrome.runtime || !chrome.runtime.sendMessage) {
        console.warn('[AIPG] Chrome runtime not available during validation');
        this.extensionContextValid = false;
        this.lastContextValidation = Date.now();
        return;
      }

      // Try to send a simple message to the background script with timeout
      const response = await Promise.race([
        chrome.runtime.sendMessage({ action: 'ping' }),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Context validation timeout')),
            2000
          )
        ),
      ]);

      if (response && response.status === 'ok') {
        console.log('[AIPG] Extension context is valid');
        this.extensionContextValid = true;
        this.contextRecoveryAttempts = 0; // Reset recovery attempts counter
      } else {
        console.warn(
          '[AIPG] Extension context validation failed: Invalid response',
          response
        );
        this.extensionContextValid = false;
      }
    } catch (error) {
      console.warn(
        '[AIPG] Extension context validation failed:',
        error.message || error
      );
      this.extensionContextValid = false;
    }

    // Update last validation timestamp
    this.lastContextValidation = Date.now();

    return this.extensionContextValid;
  }

  /**
   * Attempt to recover the extension context
   */
  async attemptContextRecovery() {
    if (this.contextRecoveryAttempts >= this.maxRecoveryAttempts) {
      console.warn('[AIPG] Maximum context recovery attempts reached');
      return false;
    }

    try {
      console.log('[AIPG] Attempting context recovery...');

      // Increment recovery attempts counter
      this.contextRecoveryAttempts++;

      // Wait with exponential backoff
      const backoffTime = Math.pow(2, this.contextRecoveryAttempts) * 100;
      await new Promise(resolve => setTimeout(resolve, backoffTime));

      // Validate context
      const isValid = await this.validateExtensionContext();

      if (isValid) {
        console.log('[AIPG] Context recovery successful');
        return true;
      } else {
        console.warn('[AIPG] Context recovery failed');
        return false;
      }
    } catch (error) {
      console.error('[AIPG] Error during context recovery:', error);
      return false;
    }
  }

  /**
   * Handle errors with recovery mechanism
   */
  async handleError(error, context = 'Unknown') {
    console.error(`[AIPG] Error in ${context}:`, error);
    
    // Update error tracking
    this.errorRecoveryState.errorCount++;
    this.errorRecoveryState.lastError = {
      message: error.message || error.toString(),
      context,
      timestamp: Date.now()
    };

    // If too many errors, show recovery interface
    if (this.errorRecoveryState.errorCount >= this.errorRecoveryState.maxErrors) {
      await this.showErrorRecoveryInterface();
      return;
    }

    // Attempt automatic recovery
    if (!this.errorRecoveryState.recoveryInProgress) {
      this.errorRecoveryState.recoveryInProgress = true;
      
      try {
        const recovered = await this.attemptAutomaticRecovery();
        if (recovered) {
          this.showErrorRecoveredMessage();
        }
      } finally {
        this.errorRecoveryState.recoveryInProgress = false;
      }
    }
  }

  /**
   * Attempt automatic error recovery
   */
  async attemptAutomaticRecovery() {
    console.log('[AIPG] Attempting automatic error recovery...');
    this.errorRecoveryState.recoveryAttempts++;

    try {
      // Step 1: Validate extension context
      const contextValid = await this.validateExtensionContext();
      if (!contextValid) {
        const contextRecovered = await this.attemptContextRecovery();
        if (!contextRecovered) {
          console.log('[AIPG] Context recovery failed');
          return false;
        }
      }

      // Step 2: Reset UI state if needed
      await this.resetUIState();

      // Step 3: Reload configuration
      await this.loadLLMSettings();

      // Step 4: Reset error count on successful recovery
      this.errorRecoveryState.errorCount = 0;
      
      console.log('[AIPG] Automatic recovery successful');
      return true;
    } catch (recoveryError) {
      console.error('[AIPG] Recovery attempt failed:', recoveryError);
      return false;
    }
  }

  /**
   * Reset UI state to clean condition
   */
  async resetUIState() {
    try {
      // Clear any error states
      const container = document.getElementById('ai-prompting-guide-container');
      if (container) {
        container.classList.remove('error-state');
      }

      // Reset workflow state if it's corrupted
      if (this.workflowActive && !this.specialistData) {
        this.workflowActive = false;
        this.currentStep = null;
        this.currentQuestion = null;
      }
    } catch (error) {
      console.error('[AIPG] Error resetting UI state:', error);
    }
  }

  /**
   * Show error recovery interface
   */
  async showErrorRecoveryInterface() {
    const container = document.getElementById('ai-prompting-guide-container');
    if (!container) return;

    const errorRecoveryHtml = `
      <div id="error-recovery-overlay" style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        z-index: 10001;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          background: white;
          padding: 20px;
          border-radius: 10px;
          max-width: 500px;
          text-align: center;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        ">
          <h3 style="color: #d32f2f; margin-top: 0;">⚠️ Extension Error Recovery</h3>
          <p>The AI Prompting Guide has encountered multiple errors and needs to recover.</p>
          <p><strong>Last Error:</strong> ${this.errorRecoveryState.lastError?.message || 'Unknown error'}</p>
          
          <div style="margin: 20px 0;">
            <button id="recovery-reset-btn" style="
              background: #f44336;
              color: white;
              border: none;
              padding: 10px 20px;
              border-radius: 5px;
              margin: 5px;
              cursor: pointer;
            ">Reset Extension</button>
            
            <button id="recovery-reload-btn" style="
              background: #2196f3;
              color: white;
              border: none;
              padding: 10px 20px;
              border-radius: 5px;
              margin: 5px;
              cursor: pointer;
            ">Reload Page</button>
            
            <button id="recovery-continue-btn" style="
              background: #4caf50;
              color: white;
              border: none;
              padding: 10px 20px;
              border-radius: 5px;
              margin: 5px;
              cursor: pointer;
            ">Try Continue</button>
          </div>
          
          <p style="font-size: 0.9em; color: #666;">
            If problems persist, try refreshing the page or reloading the extension from chrome://extensions
          </p>
        </div>
      </div>
    `;

    // Add overlay to page
    document.body.insertAdjacentHTML('beforeend', errorRecoveryHtml);

    // Add event listeners
    document.getElementById('recovery-reset-btn')?.addEventListener('click', () => {
      this.performFullReset();
    });

    document.getElementById('recovery-reload-btn')?.addEventListener('click', () => {
      window.location.reload();
    });

    document.getElementById('recovery-continue-btn')?.addEventListener('click', () => {
      this.dismissErrorRecovery();
    });
  }

  /**
   * Perform full extension reset
   */
  async performFullReset() {
    try {
      // Clear all storage
      await this.clearSessionData();
      sessionStorage.removeItem('AIPG_progress');
      
      // Reset all state
      this.workflowActive = false;
      this.currentStep = null;
      this.currentQuestion = null;
      this.stepResponses = {};
      this.stepStates = {};
      this.specialistProgress = {};
      this.errorRecoveryState = {
        errorCount: 0,
        lastError: null,
        recoveryAttempts: 0,
        maxErrors: 5,
        recoveryInProgress: false
      };

      // Reinitialize
      await this.initialize();
      
      this.dismissErrorRecovery();
      this.showErrorRecoveredMessage('Extension has been fully reset.');
      
    } catch (error) {
      console.error('[AIPG] Error during full reset:', error);
      this.addAssistantMessage('⚠️ Reset failed. Please refresh the page manually.');
    }
  }

  /**
   * Dismiss error recovery interface
   */
  dismissErrorRecovery() {
    const overlay = document.getElementById('error-recovery-overlay');
    if (overlay) {
      overlay.remove();
    }
    
    // Reset error count to give it another chance
    this.errorRecoveryState.errorCount = 0;
  }

  /**
   * Show error recovered message
   */
  showErrorRecoveredMessage(message = 'Error has been automatically recovered.') {
    this.addAssistantMessage(
      `<div style="background: #d4edda; padding: 10px; border-radius: 5px; border-left: 4px solid #28a745; margin: 10px 0;">` +
      `<strong>✅ Recovery Successful</strong><br><br>` +
      `${message}<br><br>` +
      `The AI Prompting Guide is now working normally.` +
      `</div>`
    );
  }

  /**
   * Send a message to the background script with retry logic
   */
  async sendMessageWithRetry(message, callback = null) {
    // Helper function to send message with proper error handling
    const attemptSend = () => {
      return new Promise((resolve, reject) => {
        try {
          // Check if chrome.runtime is available
          if (!chrome || !chrome.runtime || !chrome.runtime.sendMessage) {
            reject(new Error('Chrome runtime not available'));
            return;
          }

          chrome.runtime.sendMessage(message, response => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }
            if (callback) callback(response);
            resolve(response);
          });
        } catch (error) {
          reject(error);
        }
      });
    };

    try {
      // First attempt
      return await attemptSend();
    } catch (error) {
      console.warn('[AIPG] Error sending message:', error.message || error);

      // If it's a context invalidated error or extension not available, try recovery
      if (
        error.message.includes('Extension context invalidated') ||
        error.message.includes('could not establish connection') ||
        error.message.includes('Chrome runtime not available')
      ) {
        console.log('[AIPG] Attempting context recovery...');
        const recovered = await this.attemptContextRecovery();

        if (recovered) {
          try {
            // Wait a bit for context to stabilize
            await new Promise(resolve => setTimeout(resolve, 100));

            // Retry after recovery
            console.log('[AIPG] Retrying message after context recovery');
            return await attemptSend();
          } catch (retryError) {
            console.error(
              '[AIPG] Retry after recovery failed:',
              retryError.message || retryError
            );
          }
        }
      }

      // If all else fails, return graceful fallback
      console.warn(
        '[AIPG] Message sending failed, returning fallback response'
      );
      return { error: 'Communication failed', fallback: true };
    }
  }

  /**
   * Generate a response based on user input with enhanced error handling
   */
  async generateResponse(userMessage) {
    try {
    // Check if LLM is configured
    if (!this.llmEnabled || !this.llmApiKey) {
      const configButtonId = 'aipg-config-btn-' + Date.now();
      this.addAssistantMessage(
        `<div style="background: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107;">` +
          `<strong>⚙️ LLM Configuration Required</strong><br><br>` +
          `To use the AI Prompting Guide, you need to configure an LLM provider first.<br><br>` +
          `<button id="${configButtonId}" style="padding: 10px 15px; background: #007cba; color: white; border: none; border-radius: 4px; cursor: pointer;">` +
          `Configure LLM Settings` +
          `</button><br><br>` +
          `<small>This extension uses an LLM to provide intelligent coaching and dynamic responses throughout the workflow.</small>` +
          `</div>`
      );

      // Add event listener after message is added to DOM
      setTimeout(() => {
        const configButton = document.getElementById(configButtonId);
        if (configButton) {
          console.log('[AIPG] Adding click listener to config button');
          this.addEventListenerTracked(configButton, 'click', () => {
            console.log('[AIPG] Config button clicked');
            this.showSettings();
          });
        } else {
          console.error('[AIPG] Config button not found:', configButtonId);
        }
      }, 100);
      return;
    }

    if (!this.currentSpecialist) {
      this.addAssistantMessage(
        'Please select a specialist to continue. You can choose one from the dropdown above.'
      );
      return;
    }

    // Check if we're waiting for confirmation
    if (this.awaitingConfirmation) {
      // Check if the user message is a yes/no response
      const lowerMsg = userMessage.toLowerCase();
      if (lowerMsg === 'yes' || lowerMsg === 'y') {
        this.handleWorkflowResponse('yes');
        return;
      } else if (lowerMsg === 'no' || lowerMsg === 'n') {
        this.handleWorkflowResponse('no');
        return;
      }
    }

    // Check for session restoration commands
    const lowerMsg = userMessage.toLowerCase();
    if (lowerMsg === 'continue' || lowerMsg === 'resume') {
      if (this.workflowActive && this.currentStep) {
        this.addAssistantMessage(
          `<strong>🚀 Resuming workflow!</strong> Let's continue with Step ${this.currentStep}.`
        );
        this.displayCurrentStep();
        return;
      }
    } else if (
      lowerMsg === 'start over' ||
      lowerMsg === 'restart' ||
      lowerMsg === 'new'
    ) {
      this.clearSessionDataSync();
      this.workflowActive = false;
      this.currentStep = null;
      this.currentQuestion = null;
      this.stepResponses = {};
      this.addAssistantMessage(
        `<strong>🔄 Starting fresh!</strong> Let's begin a new workflow.`
      );
      if (
        this.specialistData &&
        this.specialistData.defaultPromptingTechniques
      ) {
        setTimeout(() => {
          this.startWorkflow();
        }, 500);
      }
      return;
    }

    // Check for edit requests - generic pattern for any field
    const editMatch = lowerMsg.match(
      /(?:edit|change|modify|update)\s+(?:step\s*(\d+)|(?:my\s+)?(\w+(?:\s+\w+)*))/
    );
    if (editMatch && this.workflowActive) {
      this.handleEditRequest(editMatch, userMessage);
      return;
    }

    // Check for workflow navigation commands
    if (this.workflowActive) {
      // Check for "next step" command
      if (lowerMsg === 'next step' || lowerMsg === 'next') {
        await this.moveToNextStep();
        return;
      }

      // Check for specific step navigation
      const stepMatch = lowerMsg.match(
        /(?:start|step|go to|open)\s+step\s*(\d)/
      );
      if (stepMatch) {
        const stepNum = parseInt(stepMatch[1], 10);
        if (
          stepNum > 0 &&
          stepNum <=
            (this.specialistData?.defaultPromptingTechniques?.length || 0)
        ) {
          this.currentStep = stepNum;
          this.currentQuestion = null; // Reset current question for new step
          this.displayCurrentStep();
          return;
        }
      }

      // Check for "show all steps" command
      if (lowerMsg === 'show all steps' || lowerMsg === 'show steps') {
        this.showAllSteps();
        return;
      }

      // Try to collect response for current step
      const dynamicResponse = await this.collectStepResponse(userMessage);
      if (dynamicResponse) {
        this.addAssistantMessage(dynamicResponse);

        // Check if step is complete and should auto-advance
        if (
          this.isStepComplete(this.currentStep) &&
          this.currentQuestion === null
        ) {
          // If it's the final step, generate the final prompt
          if (this.currentStep === 7) {
            const finalPrompt = await this.generateFinalPrompt();
            const completionData = this.getCompletionData(
              this.specialistData?.id
            );
            this.addAssistantMessage(
              `<strong>🎉 Your ${completionData.title}:</strong><br><pre>${finalPrompt}</pre><br><p>Copy this ${completionData.buttonText.toLowerCase()} to use with your preferred AI model.</p>`
            );
            this.workflowActive = false;
            this.currentStep = null;
          } else {
            // Prompt to move to next step
            this.addAssistantMessage(
              'When you\'re ready, type "Next Step" to continue.'
            );
          }
        }
        return;
      }
    }

    // Check if extension context is valid
    if (!this.isExtensionContextValid()) {
      console.warn('[AIPG] Extension context invalid during generateResponse');

      // Attempt recovery – if it succeeds we will re-enter generateResponse,
      // otherwise we fall back to offline-only processing.
      const recovered = await this.attemptContextRecovery();
      if (!recovered) {
        this.addAssistantMessage(
          '<strong>[ERROR]</strong> The Chrome extension context is unavailable. ' +
            'Responses will be generated locally only.'
        );
      }
    }

    /* ------------------------------------------------------------------
     * Handle workflow-specific responses
     * ------------------------------------------------------------------ */
    if (this.workflowActive) {
      // Workflow is active - all responses should be handled above
      return;
    }

    /* ------------------------------------------------------------------
     * Handle general conversation when no workflow is active - use LLM
     * ------------------------------------------------------------------ */
    if (!this.workflowActive) {
      try {
        // Use LLM to understand user intent and provide intelligent response
        const context =
          `You are a ${this.currentSpecialist} coach. The user said: "${userMessage}". ` +
          `You can start a structured 7-step research workflow if they seem interested. ` +
          `Available commands: "start workflow", "yes", "begin". Be conversational and helpful.`;

        const llmResponse = await this.callLLMAPI(context);

        if (llmResponse) {
          this.addAssistantMessage(llmResponse);

          // Check if user wants to start workflow (LLM-enhanced detection)
          if (
            lowerMsg.includes('yes') ||
            lowerMsg.includes('start') ||
            lowerMsg.includes('begin') ||
            lowerMsg.includes('workflow') ||
            lowerMsg.includes('guide') ||
            llmResponse.includes('starting')
          ) {
            if (
              this.specialistData &&
              this.specialistData.defaultPromptingTechniques &&
              this.specialistData.defaultPromptingTechniques.length > 0
            ) {
              setTimeout(() => {
                this.startWorkflow();
              }, 1000);
            }
          }
        } else {
          // Fallback response
          this.addAssistantMessage(
            `I'm your ${this.currentSpecialist} coach. I can help guide you through structured workflows. ` +
              `Would you like to start the guided workflow?`
          );
        }
      } catch (error) {
        console.error(
          '[AIPG] LLM error in general conversation:',
          error.message
        );
        this.addAssistantMessage(
          `I'm having trouble connecting to the LLM. Please check your settings (⚙️ button) or try again.`
        );
      }
    }
    } catch (error) {
      await this.handleError(error, 'generateResponse');
      this.addAssistantMessage(
        `⚠️ An error occurred while processing your request. The system is attempting to recover automatically.`
      );
    }
  }

  /* ================================================================
   *  LLM-related helper methods
   * ================================================================ */

  /**
   * Send the entire conversation + current user message to the LLM and
   * return the assistant's reply.
   */
  async processWithLLM(userMessage) {
    // Maintain short history
    const history = this.llmConversationHistory
      .slice(-this.llmMaxHistoryLength)
      .concat([{ role: 'user', content: userMessage }]);

    const prompt = this.generateLLMPrompt(history);
    const rawResponse = await this.callLLMAPI(prompt);

    if (!rawResponse) return null;

    // Basic sanitation
    const trimmed = rawResponse.trim();
    this.llmConversationHistory.push({ role: 'assistant', content: trimmed });
    return trimmed;
  }

  /**
   * Store frequently-used context so that every LLM call can include it
   */
  updateLLMContext(updates = {}) {
    this.llmContext = { ...this.llmContext, ...updates };
  }

  /**
   * Generate specialist-aware system prompts based on current specialist context
   */
  generateSpecialistSystemPrompt() {
    // Default base prompt
    let basePrompt =
      'You are AI Prompting Guide, an expert assistant that helps construct high-quality prompts and solutions.';
    let contextualInstructions = '';

    // Get specialist-specific context
    if (this.currentSpecialist) {
      const specialistMap = {
        'research-analysis': {
          role: 'research and analysis specialist',
          framework: 'systematic research methodology',
          focus:
            'conducting focused, actionable research and extracting valuable insights',
          workflow:
            'research workflows including data gathering, analysis, and reporting',
        },
        'ai-solution-definition': {
          role: 'AI solution definition specialist',
          framework: 'structured problem-solving approach',
          focus:
            'defining business problems and creating comprehensive AI solution specifications',
          workflow:
            'solution definition processes from problem identification through technical planning',
        },
        'workflow-automation-design': {
          role: 'workflow automation specialist',
          framework: 'process mapping and automation design methodology',
          focus:
            'designing and implementing automated workflows for business processes',
          workflow:
            'automation workflows including process mapping, system integration, and optimization',
        },
        'prompt-engineering': {
          role: 'prompt engineering specialist',
          framework: 'iterative prompt development methodology',
          focus: 'crafting, testing, and optimizing effective prompts for LLMs',
          workflow:
            'prompt engineering workflows including testing, refinement, and deployment',
        },
        'conversational-voice-agents': {
          role: 'conversational and voice agent specialist',
          framework: 'dialog design and voice UX methodology',
          focus:
            'creating engaging conversational interfaces and voice experiences',
          workflow:
            'agent development workflows including intent design, conversation flow, and user experience optimization',
        },
        'saas-product-planning': {
          role: 'SaaS product planning specialist',
          framework: 'product development lifecycle methodology',
          focus:
            'planning comprehensive SaaS products from vision through technical architecture',
          workflow:
            'product planning workflows including market analysis, feature definition, and technical planning',
        },
        'website-creation': {
          role: 'website creation specialist',
          framework: 'web development lifecycle methodology',
          focus:
            'creating professional websites from requirements through deployment',
          workflow:
            'website development workflows including design, development, and optimization',
        },
        'client-outreach-messaging': {
          role: 'client outreach and messaging specialist',
          framework: 'personalized outreach methodology',
          focus:
            'crafting effective client communication and automated outreach campaigns',
          workflow:
            'outreach workflows including lead research, message personalization, and campaign optimization',
        },
        'data-analysis-support': {
          role: 'data analysis specialist',
          framework: 'comprehensive data analysis methodology',
          focus:
            'performing thorough data analysis from exploration through actionable insights',
          workflow:
            'data analysis workflows including exploration, statistical testing, and insight synthesis',
        },
        'documentation-writing': {
          role: 'documentation writing specialist',
          framework: 'structured documentation methodology',
          focus:
            'creating clear, comprehensive documentation that effectively communicates complex information',
          workflow:
            'documentation workflows including audience analysis, content creation, and maintenance planning',
        },
      };

      const specialist = specialistMap[this.currentSpecialist];
      if (specialist) {
        basePrompt = `You are AI Prompting Guide, an expert ${specialist.role} that helps users through ${specialist.workflow}.`;
        contextualInstructions = `\n\nYour expertise focuses on ${specialist.focus}. You guide users using ${specialist.framework} to ensure systematic and effective results. Be conversational, helpful, and provide step-by-step guidance tailored to ${specialist.role} best practices.`;
      }
    }

    return basePrompt + contextualInstructions;
  }

  /**
   * Generate a prompt string for the LLM given current context + history.
   */
  generateLLMPrompt(history) {
    let systemPrompt = this.generateSpecialistSystemPrompt() + '\n\n';

    if (this.currentSpecialist) {
      systemPrompt += `Current specialist: ${this.currentSpecialist}\n`;
    }
    if (this.currentModel) {
      systemPrompt += `Target model: ${this.currentModel}\n`;
    }

    // Append any custom context
    Object.entries(this.llmContext).forEach(([k, v]) => {
      systemPrompt += `${k}: ${JSON.stringify(v)}\n`;
    });

    // Concatenate conversation
    const convo = history
      .map(h => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`)
      .join('\n');

    return `${systemPrompt}\n\n${convo}\nAssistant:`;
  }

  /**
   * Call LLM API with provider-specific formatting
   */
  async callLLMAPI(userMessage) {
    console.log('[AIPG] callLLMAPI called with:', {
      provider: this.llmProvider,
      model: this.llmModel,
      endpoint: this.llmEndpoint,
      hasApiKey: !!this.llmApiKey,
      message: userMessage.substring(0, 50) + '...',
    });

    if (!this.llmEndpoint || !this.llmApiKey) {
      throw new Error('LLM API not configured');
    }

    try {
      let requestBody, headers;

      // Format request based on provider
      switch (this.llmProvider) {
        case 'openai':
          headers = {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.llmApiKey}`,
          };
          requestBody = {
            model: this.llmModel,
            messages: [
              {
                role: 'system',
                content: this.generateSpecialistSystemPrompt(),
              },
              {
                role: 'user',
                content: userMessage,
              },
            ],
            max_tokens: 512,
            temperature: 0.7,
          };
          break;

        case 'anthropic':
          headers = {
            'Content-Type': 'application/json',
            'x-api-key': this.llmApiKey,
            'anthropic-version': '2023-06-01',
          };
          requestBody = {
            model: this.llmModel || 'claude-3-sonnet-20240229',
            max_tokens: 512,
            messages: [
              {
                role: 'user',
                content: `${this.generateSpecialistSystemPrompt()}\n\nUser: ${userMessage}`,
              },
            ],
          };
          break;

        case 'google':
          headers = {
            'Content-Type': 'application/json',
          };
          requestBody = {
            contents: [
              {
                parts: [
                  {
                    text: `${this.generateSpecialistSystemPrompt()} User says: ${userMessage}`,
                  },
                ],
              },
            ],
            generationConfig: {
              maxOutputTokens: 512,
              temperature: 0.7,
            },
          };
          // Add API key to URL for Google
          this.llmEndpoint += `?key=${this.llmApiKey}`;
          break;

        default:
          throw new Error(`Unsupported provider: ${this.llmProvider}`);
      }

      console.log('[AIPG] Making API request to:', this.llmEndpoint);
      console.log('[AIPG] Request headers:', headers);
      console.log('[AIPG] Request body:', JSON.stringify(requestBody, null, 2));

      const response = await fetch(this.llmEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      console.log('[AIPG] Response status:', response.status);
      console.log(
        '[AIPG] Response headers:',
        Object.fromEntries(response.headers.entries())
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[AIPG] API error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('[AIPG] API response data:', data);

      // Extract response based on provider
      switch (this.llmProvider) {
        case 'openai':
          return data.choices?.[0]?.message?.content || null;

        case 'anthropic':
          return data.content?.[0]?.text || null;

        case 'google':
          return data.candidates?.[0]?.content?.parts?.[0]?.text || null;

        default:
          return null;
      }
    } catch (err) {
      console.error('[AIPG] LLM API call failed:', err);
      throw err;
    }
  }

  /**
   * Parse the LLM output to detect user intent (stub implementation)
   */
  async parseUserIntent(/* userMessage */) {
    // Minimal heuristic: not implemented – return default
    return { intent: 'unknown' };
  }

  /**
   * Determine if a user response needs follow-up clarification using LLM
   */
  async shouldAskFollowUp(userMessage, step, question) {
    try {
      const context = this.getStepContext(step);
      const llmPrompt = `As a research coach, analyze this user response: "${userMessage}" for Step ${step} (${question}). 
      
      Context: ${context}
      
      Respond with ONLY "YES" if the response is vague, incomplete, or could benefit from clarification. 
      Respond with ONLY "NO" if the response is specific and sufficient to proceed.`;

      const llmResponse = await this.callLLMAPI(llmPrompt);
      return llmResponse && llmResponse.trim().toUpperCase() === 'YES';
    } catch (error) {
      console.error('[AIPG] Error checking for follow-up need:', error);
      return false; // Default to not asking follow-up on error
    }
  }

  /**
   * Generate intelligent follow-up question using LLM
   */
  async generateFollowUpQuestion(userMessage, step, question) {
    try {
      const context = this.getStepContext(step);
      const previousResponses = this.getStepResponseSummary();

      const llmPrompt = `As a research coach, the user gave this response: "${userMessage}" for Step ${step}.
      
      Context: ${context}
      Previous responses: ${previousResponses}
      
      Generate ONE thoughtful follow-up question to help them be more specific or complete their response. 
      Be encouraging and provide examples. Format in HTML for chat display. Keep it conversational.`;

      const llmResponse = await this.callLLMAPI(llmPrompt);

      if (llmResponse) {
        return (
          `<div style="background: #fff3cd; padding: 12px; border-left: 4px solid #ffc107; margin: 10px 0;">` +
          `<strong>💡 Let me help you be more specific:</strong><br><br>` +
          `${llmResponse}` +
          `</div>`
        );
      }
      return null;
    } catch (error) {
      console.error('[AIPG] Error generating follow-up question:', error);
      return null;
    }
  }

  /**
   * Get context description for current step
   */
  getStepContext(step) {
    const stepContexts = {
      1: 'defining research scope and questions',
      2: 'identifying data sources',
      3: 'determining key insights to extract',
      4: 'identifying competitors to analyze',
      5: 'focusing on market opportunities',
      6: 'planning data visualization',
      7: 'defining report format',
    };
    return stepContexts[step] || 'workflow step';
  }

  /**
   * Get summary of previous step responses for context
   */
  getStepResponseSummary() {
    const responses = [];
    for (let i = 1; i <= 7; i++) {
      if (this.stepResponses[i]) {
        const stepSummary = Object.entries(this.stepResponses[i])
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ');
        responses.push(`Step ${i}: ${stepSummary}`);
      }
    }
    return responses.join(' | ');
  }

  /* ================================================================
   *  UI helper methods
   * ================================================================ */

  /**
   * Render all workflow steps in a single assistant message.
   */
  showAllSteps() {
    if (!this.specialistData?.defaultPromptingTechniques) return;

    const stepsHtml = this.specialistData.defaultPromptingTechniques
      .map(
        s =>
          `<li><strong>Step ${s.step} – ${s.title}</strong>: ${s.description}</li>`
      )
      .join('');

    this.addAssistantMessage(
      `<p><strong>Workflow Overview:</strong></p><ol>${stepsHtml}</ol>`
    );
  }

  /**
   * Append assistant message bubble to the chat.
   */
  addAssistantMessage(content) {
    const messagesContainer = document.getElementById(
      'ai-prompting-guide-messages'
    );
    if (!messagesContainer) return;

    const timestamp = new Date().toLocaleString();
    const messageId = `assistant-msg-${Date.now()}`;

    const msg = document.createElement('article');
    msg.id = messageId;
    msg.className = 'ai-prompting-guide-message assistant assistant-message';

    // Add comprehensive ARIA attributes
    this.accessibility.addAriaLabel(msg, {
      role: 'article',
      labelledBy: `${messageId}-header`,
      describedBy: `${messageId}-content`,
    });

    // SECURITY FIX: Use safe HTML rendering instead of direct innerHTML
    const messageHeader = document.createElement('div');
    messageHeader.id = `${messageId}-header`;
    messageHeader.className = 'sr-only';
    messageHeader.textContent = `AI Assistant message sent at ${timestamp}`;

    const messageContent = document.createElement('div');
    messageContent.id = `${messageId}-content`;
    // Safe HTML rendering with fallback
    if (this.security && this.security.setInnerHTMLSafe) {
      this.security.setInnerHTMLSafe(messageContent, content);
    } else {
      // Fallback to safer innerHTML usage
      messageContent.innerHTML = content;
    }

    msg.appendChild(messageHeader);
    msg.appendChild(messageContent);

    msg.style.backgroundColor = '#f0f0f0';
    msg.style.padding = '10px';
    msg.style.borderRadius = '5px';
    msg.style.marginBottom = '10px';
    msg.style.border = '1px solid #e0e0e0';

    messagesContainer.appendChild(msg);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Announce new message to screen readers
    const plainTextContent = this.stripHtmlTags(content);
    this.accessibility.announceToScreenReader(
      `New assistant message: ${plainTextContent.substring(0, 100)}${plainTextContent.length > 100 ? '...' : ''}`,
      false,
      300
    );
  }

  /**
   * Strip HTML tags for screen reader announcements
   * @param {string} html - HTML content
   * @returns {string} Plain text
   */
  stripHtmlTags(html) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || '';
  }

  /**
   * Add user message with accessibility features
   * @param {string} content - Message content
   */
  addUserMessage(content) {
    const messagesContainer = document.getElementById(
      'ai-prompting-guide-messages'
    );
    if (!messagesContainer) return;

    const timestamp = new Date().toLocaleString();
    const messageId = `user-msg-${Date.now()}`;

    const msg = document.createElement('article');
    msg.id = messageId;
    msg.className = 'ai-prompting-guide-message user user-message';

    // Add comprehensive ARIA attributes
    this.accessibility.addAriaLabel(msg, {
      role: 'article',
      labelledBy: `${messageId}-header`,
      describedBy: `${messageId}-content`,
    });

    const messageHeader = document.createElement('div');
    messageHeader.id = `${messageId}-header`;
    messageHeader.className = 'sr-only';
    messageHeader.textContent = `Your message sent at ${timestamp}`;

    const messageContent = document.createElement('div');
    messageContent.id = `${messageId}-content`;
    // Safe HTML rendering with fallback
    if (this.security && this.security.setInnerHTMLSafe) {
      this.security.setInnerHTMLSafe(messageContent, content);
    } else {
      // Fallback to safer innerHTML usage
      messageContent.innerHTML = content;
    }

    msg.appendChild(messageHeader);
    msg.appendChild(messageContent);

    msg.style.backgroundColor = '#e3f2fd';
    msg.style.padding = '10px';
    msg.style.borderRadius = '5px';
    msg.style.marginBottom = '10px';
    msg.style.border = '1px solid #bbdefb';
    msg.style.marginLeft = '20px';

    messagesContainer.appendChild(msg);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Don't announce user messages since the user just typed them
  }

  /**
   * Display settings interface
   */
  showSettings() {
    console.log(
      '[AIPG] showSettings called, settingsVisible:',
      this.settingsVisible
    );

    try {
      if (this.settingsVisible) {
        this.hideSettings();
        return;
      }

      // Ensure interface exists first
      if (!document.getElementById('ai-prompting-guide-container')) {
        console.log('[AIPG] Interface not created yet, creating it first');
        this.createInterface();
      }

      this.settingsVisible = true;
      const settingsId = 'aipg-settings-' + Date.now();

      console.log('[AIPG] Creating settings overlay with ID:', settingsId);

      // Create settings overlay instead of adding to chat
      this.createSettingsOverlay(settingsId);

      console.log('[AIPG] Settings overlay created successfully');
    } catch (error) {
      console.error('[AIPG] Error in showSettings:', error);
      this.settingsVisible = false;
    }
  }

  /**
   * Create settings overlay
   */
  createSettingsOverlay(settingsId) {
    console.log('[AIPG] createSettingsOverlay called with ID:', settingsId);

    const container = document.getElementById('ai-prompting-guide-container');
    if (!container) {
      console.error('[AIPG] Container not found for settings overlay');
      return;
    }

    console.log('[AIPG] Container found, creating overlay elements');

    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = settingsId;
    overlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    `;

    // Create settings panel
    const panel = document.createElement('div');
    panel.style.cssText = `
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #007cba;
      max-width: 400px;
      width: 90%;
      max-height: 80%;
      overflow-y: auto;
    `;

    // SECURITY FIX: Use safe template creation instead of direct innerHTML with interpolation
    const settingsTemplate = `
      <strong>⚙️ LLM Integration Settings</strong><br><br>
      
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold;">LLM Provider:</label>
        <select id="llm-provider" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
          <option value="openai" {{openaiSelected}}>OpenAI (GPT-4, GPT-3.5)</option>
          <option value="anthropic" {{anthropicSelected}}>Anthropic (Claude)</option>
          <option value="google" {{googleSelected}}>Google (Gemini)</option>
        </select>
      </div>

      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Model:</label>
        <select id="llm-model" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
          <option value="gpt-4" {{gpt4Selected}}>GPT-4</option>
          <option value="gpt-3.5-turbo" {{gpt35Selected}}>GPT-3.5 Turbo</option>
        </select>
      </div>

      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold;">API Key:</label>
        <input type="password" id="llm-api-key" placeholder="Enter your API key" 
               value="" 
               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
        <small style="color: #666; display: block; margin-top: 5px;">
          Your API key is stored locally and never sent anywhere except to your chosen LLM provider.
        </small>
      </div>

      <div style="margin-bottom: 15px;">
        <strong>Status:</strong> 
        <span style="color: {{statusColor}};">
          {{statusText}}
        </span>
      </div>

      <div style="margin-top: 20px; padding: 15px; background: #e6f2ff; border-radius: 4px; border-left: 3px solid #007cba;">
        <strong>🚀 Onboarding</strong><br>
        <div style="margin: 8px 0; color: #666;">
          Need help choosing the right specialist? Restart the onboarding flow to get personalized recommendations.
        </div>
        <button id="restart-onboarding" style="padding: 8px 16px; background: #007cba; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px;">
          🎯 Restart Onboarding
        </button>
      </div>

      <div style="display: flex; gap: 10px; margin-top: 20px;">
        <button id="save-llm-settings" style="flex: 1; padding: 10px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">
          💾 Save Settings
        </button>
        <button id="test-llm-connection" style="flex: 1; padding: 10px; background: #007cba; color: white; border: none; border-radius: 4px; cursor: pointer;">
          🔧 Test Connection
        </button>
        <button id="close-settings" style="padding: 10px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">
          ❌ Close
        </button>
      </div>

      <div style="margin-top: 15px; padding: 10px; background: {{storageStatusBgColor}}; border-radius: 4px; font-size: 12px; border-left: 3px solid {{storageStatusBorderColor}};">
        <strong>💾 Storage Status:</strong><br>
        <div style="display: flex; justify-content: space-between; margin: 8px 0;">
          <span>Type:</span> <span style="font-weight: bold;">{{storageType}}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin: 8px 0;">
          <span>Status:</span> <span style="color: {{storageStatusColor}};">{{storageStatus}}</span>
        </div>
        <div style="margin-top: 10px;">
          {{storageDescription}}
        </div>
        <button id="test-storage" style="margin-top: 10px; padding: 6px 12px; background: #17a2b8; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 11px;">
          🔍 Test Storage
        </button>
        <button id="show-storage-stats" style="margin-top: 10px; margin-left: 5px; padding: 6px 12px; background: #6c757d; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 11px;">
          📊 Storage Stats
        </button>
      </div>

      <div style="margin-top: 15px; padding: 10px; background: #e7f3ff; border-radius: 4px; font-size: 12px;">
        <strong>Getting API Keys:</strong><br>
        • <strong>OpenAI:</strong> Visit <a href="https://platform.openai.com/api-keys" target="_blank">platform.openai.com/api-keys</a><br>
        • <strong>Anthropic:</strong> Visit <a href="https://console.anthropic.com/" target="_blank">console.anthropic.com</a><br>
        • <strong>Google:</strong> Visit <a href="https://makersuite.google.com/app/apikey" target="_blank">makersuite.google.com/app/apikey</a>
      </div>
    `;

    // Get storage status information with fallback
    let storageInfo = { type: 'unknown', available: false, quota: 0, used: 0 };
    try {
      if (this.storage && this.storage.getStorageInfo) {
        storageInfo = this.storage.getStorageInfo();
      }
    } catch (e) {
      console.warn('[AIPG] Could not get storage info:', e);
    }
    const storageStatus = this.getStorageStatusDisplay(storageInfo);

    // Create safe template with fallback
    let safeSettingsHtml;
    if (this.security && this.security.createSafeTemplate) {
      safeSettingsHtml = this.security.createSafeTemplate(
        settingsTemplate,
        {
          openaiSelected: this.llmProvider === 'openai' ? 'selected' : '',
          anthropicSelected: this.llmProvider === 'anthropic' ? 'selected' : '',
          googleSelected: this.llmProvider === 'google' ? 'selected' : '',
          gpt4Selected: this.llmModel === 'gpt-4' ? 'selected' : '',
          gpt35Selected: this.llmModel === 'gpt-3.5-turbo' ? 'selected' : '',
          statusColor: this.llmEnabled ? '#28a745' : '#dc3545',
          statusText: this.llmEnabled ? '✅ Connected' : '❌ Not configured',
          storageType: storageStatus.type,
          storageStatus: storageStatus.status,
          storageStatusColor: storageStatus.color,
          storageStatusBgColor: storageStatus.bgColor,
          storageStatusBorderColor: storageStatus.borderColor,
          storageDescription: storageStatus.description,
        }
      );
    } else {
      // Simple template replacement fallback
      safeSettingsHtml = settingsTemplate
        .replace(/\{openaiSelected\}/g, this.llmProvider === 'openai' ? 'selected' : '')
        .replace(/\{anthropicSelected\}/g, this.llmProvider === 'anthropic' ? 'selected' : '')
        .replace(/\{googleSelected\}/g, this.llmProvider === 'google' ? 'selected' : '')
        .replace(/\{gpt4Selected\}/g, this.llmModel === 'gpt-4' ? 'selected' : '')
        .replace(/\{gpt35Selected\}/g, this.llmModel === 'gpt-3.5-turbo' ? 'selected' : '')
        .replace(/\{statusColor\}/g, this.llmEnabled ? '#28a745' : '#dc3545')
        .replace(/\{statusText\}/g, this.llmEnabled ? '✅ Connected' : '❌ Not configured')
        .replace(/\{storageType\}/g, storageStatus.type)
        .replace(/\{storageStatus\}/g, storageStatus.status)
        .replace(/\{storageStatusColor\}/g, storageStatus.color)
        .replace(/\{storageStatusBgColor\}/g, storageStatus.bgColor)
        .replace(/\{storageStatusBorderColor\}/g, storageStatus.borderColor)
        .replace(/\{storageDescription\}/g, storageStatus.description);
    }

    panel.innerHTML = safeSettingsHtml;

    // SECURITY FIX: Set API key value separately to avoid XSS in template
    setTimeout(() => {
      const apiKeyInput = document.getElementById('llm-api-key');
      if (apiKeyInput && this.llmApiKey) {
        apiKeyInput.value = this.llmApiKey;
      }
    }, 0);

    overlay.appendChild(panel);
    container.appendChild(overlay);

    // Add event listeners for settings controls
    setTimeout(() => {
      this.attachSettingsEventListeners(settingsId);
    }, 100);
  }

  /**
   * Hide settings interface
   */
  hideSettings() {
    this.settingsVisible = false;
    // Remove settings overlay
    const overlay = document.querySelector('[id^="aipg-settings-"]');
    if (overlay) {
      overlay.remove();
    }
  }

  /**
   * Attach event listeners to settings controls
   */
  attachSettingsEventListeners(settingsId) {
    const saveButton = document.getElementById('save-llm-settings');
    const testButton = document.getElementById('test-llm-connection');
    const closeButton = document.getElementById('close-settings');
    const restartOnboardingButton =
      document.getElementById('restart-onboarding');
    const testStorageButton = document.getElementById('test-storage');
    const showStorageStatsButton =
      document.getElementById('show-storage-stats');

    if (saveButton) {
      this.addEventListenerTracked(saveButton, 'click', () =>
        this.saveSettings(settingsId)
      );
    }

    if (testButton) {
      this.addEventListenerTracked(testButton, 'click', () =>
        this.testConnection()
      );
    }

    if (closeButton) {
      this.addEventListenerTracked(closeButton, 'click', () =>
        this.hideSettings()
      );
    }

    if (restartOnboardingButton) {
      this.addEventListenerTracked(restartOnboardingButton, 'click', () => {
        this.hideSettings();
        this.restartOnboarding();
      });
    }

    if (testStorageButton) {
      this.addEventListenerTracked(testStorageButton, 'click', () =>
        this.testStorageFromSettings()
      );
    }

    if (showStorageStatsButton) {
      this.addEventListenerTracked(showStorageStatsButton, 'click', () =>
        this.showStorageStatsDialog()
      );
    }

    // Close on overlay click
    const overlay = document.getElementById(settingsId);
    if (overlay) {
      const handleOverlayClick = e => {
        if (e.target === overlay) {
          this.hideSettings();
        }
      };
      this.addEventListenerTracked(overlay, 'click', handleOverlayClick);
    }
  }

  /**
   * Save LLM settings
   */
  saveSettings(settingsId) {
    const providerSelect = document.getElementById('llm-provider');
    const modelSelect = document.getElementById('llm-model');
    const apiKeyInput = document.getElementById('llm-api-key');

    if (!providerSelect || !modelSelect || !apiKeyInput) {
      this.addAssistantMessage(
        '<div style="color: red;">Error: Could not find settings inputs.</div>'
      );
      return;
    }

    const provider = providerSelect.value;
    const model = modelSelect.value;
    const apiKey = apiKeyInput.value.trim();

    if (!apiKey) {
      this.addAssistantMessage(
        '<div style="color: red;">Please enter an API key.</div>'
      );
      return;
    }

    // Update settings
    this.llmProvider = provider;
    this.llmModel = model;
    this.llmApiKey = apiKey;
    this.updateLLMEndpoint();
    this.llmEnabled = true;

    // Save to storage
    this.saveLLMSettingsSync();

    this.addAssistantMessage(
      '<div style="color: green; font-weight: bold;">✅ Settings saved! LLM integration is now enabled.</div>'
    );

    this.settingsVisible = false;
  }

  /**
   * Test LLM connection
   */
  async testConnection() {
    console.log('[AIPG] Testing LLM connection...');

    // Get current settings from the form (in case user hasn't saved yet)
    const providerSelect = document.getElementById('llm-provider');
    const modelSelect = document.getElementById('llm-model');
    const apiKeyInput = document.getElementById('llm-api-key');

    if (!providerSelect || !modelSelect || !apiKeyInput) {
      alert('Settings form not found. Please try again.');
      return;
    }

    const provider = providerSelect.value;
    const model = modelSelect.value;
    const apiKey = apiKeyInput.value.trim();

    if (!apiKey) {
      alert('Please enter an API key first.');
      return;
    }

    // Update button to show testing state
    const testButton = document.getElementById('test-llm-connection');
    const originalText = testButton ? testButton.textContent : '';
    if (testButton) {
      testButton.textContent = '🔄 Testing...';
      testButton.disabled = true;
    }

    try {
      // Temporarily set the configuration for testing
      const originalProvider = this.llmProvider;
      const originalModel = this.llmModel;
      const originalApiKey = this.llmApiKey;

      this.llmProvider = provider;
      this.llmModel = model;
      this.llmApiKey = apiKey;
      this.updateLLMEndpoint();

      console.log('[AIPG] Testing with:', {
        provider,
        model,
        endpoint: this.llmEndpoint,
      });

      const testResponse = await this.callLLMAPI(
        'Hello, please respond with "Connection test successful!"'
      );

      // Restore original settings if test fails
      if (!testResponse) {
        this.llmProvider = originalProvider;
        this.llmModel = originalModel;
        this.llmApiKey = originalApiKey;
        this.updateLLMEndpoint();

        alert('❌ Connection test failed: No response received from LLM');
        return;
      }

      if (
        testResponse.toLowerCase().includes('successful') ||
        testResponse.toLowerCase().includes('test')
      ) {
        alert('✅ Connection test successful! LLM integration is working.');
        console.log(
          '[AIPG] Connection test successful, response:',
          testResponse
        );
      } else {
        alert(
          '⚠️ Connection established but response was unexpected. The API key appears to work.'
        );
        console.log('[AIPG] Unexpected response:', testResponse);
      }
    } catch (error) {
      console.error('[AIPG] Connection test failed:', error);
      alert(`❌ Connection test failed: ${error.message}`);
    } finally {
      // Restore button state
      if (testButton) {
        testButton.textContent = originalText;
        testButton.disabled = false;
      }
    }
  }

  /**
   * Update LLM endpoint based on provider
   */
  updateLLMEndpoint() {
    switch (this.llmProvider) {
      case 'openai':
        this.llmEndpoint = 'https://api.openai.com/v1/chat/completions';
        break;
      case 'anthropic':
        this.llmEndpoint = 'https://api.anthropic.com/v1/messages';
        break;
      case 'google':
        this.llmEndpoint =
          'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
        break;
    }
  }

  /* ================================================================
   *  Persistence helpers (simple localStorage wrappers)
   * ================================================================ */

  async loadUserNotes() {
    try {
      const raw = await this.storage.getItem('AIPG_notes');
      this.userNotes = raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.warn('[AIPG] Failed to load notes', e);
      this.userNotes = {};
    }
  }

  async saveUserNotes() {
    try {
      await this.storage.setItem('AIPG_notes', JSON.stringify(this.userNotes));
    } catch (e) {
      console.warn('[AIPG] Failed to save notes', e);
    }
  }

  // Synchronous wrapper for backwards compatibility
  saveUserNotesSync() {
    this.saveUserNotes().catch(e =>
      console.warn('[AIPG] Failed to save notes (sync)', e)
    );
  }

  async saveCustomRules() {
    try {
      await this.storage.setItem(
        'AIPG_rules',
        JSON.stringify(this.customRules)
      );
    } catch (e) {
      console.warn('[AIPG] Failed to save rules', e);
    }
  }

  // Synchronous wrapper for backwards compatibility
  saveCustomRulesSync() {
    this.saveCustomRules().catch(e =>
      console.warn('[AIPG] Failed to save rules (sync)', e)
    );
  }

  async loadUserPreferences() {
    try {
      const raw = await this.storage.getItem('AIPG_prefs');
      if (raw) {
        const prefs = JSON.parse(raw);
        this.position = prefs.position || this.position;
        this.size = prefs.size || this.size;
        this.isVisible = prefs.isVisible ?? this.isVisible;
        this.currentSpecialist =
          prefs.currentSpecialist || this.currentSpecialist;
        this.currentModel = prefs.currentModel || this.currentModel;
      }

      // Load LLM settings
      await this.loadLLMSettings();

      // Load session data (workflow progress)
      await this.loadSessionData();
    } catch (e) {
      console.warn('[AIPG] Failed to load preferences', e);
    }
  }

  async saveUserPreferences() {
    const prefs = {
      position: this.position,
      size: this.size,
      isVisible: this.isVisible,
      currentSpecialist: this.currentSpecialist,
      currentModel: this.currentModel,
    };
    try {
      await this.storage.setItem('AIPG_prefs', JSON.stringify(prefs));

      // Also save session data
      await this.saveSessionData();
    } catch (e) {
      console.warn('[AIPG] Failed to save preferences', e);
    }
  }

  // Synchronous wrapper for backwards compatibility
  saveUserPreferencesSync() {
    this.saveUserPreferences().catch(e =>
      console.warn('[AIPG] Failed to save preferences (sync)', e)
    );
  }

  /**
   * Load session data (workflow progress and responses)
   */
  async loadSessionData() {
    try {
      const sessionKey = `AIPG_session_${this.currentSpecialist || 'default'}`;
      const raw = await this.storage.getItem(sessionKey);
      if (raw) {
        const sessionData = JSON.parse(raw);

        // Only restore if session is less than 24 hours old
        const sessionAge = Date.now() - (sessionData.timestamp || 0);
        if (sessionAge < 24 * 60 * 60 * 1000) {
          // 24 hours
          this.workflowActive = sessionData.workflowActive || false;
          this.currentStep = sessionData.currentStep || null;
          this.currentQuestion = sessionData.currentQuestion || null;
          this.stepResponses = sessionData.stepResponses || {};

          console.log('[AIPG] Restored session data:', sessionData);
        } else {
          // Session too old, clear it
          await this.storage.removeItem(sessionKey);
          console.log('[AIPG] Session expired, cleared old data');
        }
      }
    } catch (e) {
      console.warn('[AIPG] Failed to load session data', e);
    }
  }

  /**
   * Save session data (workflow progress and responses)
   */
  async saveSessionData() {
    try {
      const sessionKey = `AIPG_session_${this.currentSpecialist || 'default'}`;
      const sessionData = {
        timestamp: Date.now(),
        workflowActive: this.workflowActive,
        currentStep: this.currentStep,
        currentQuestion: this.currentQuestion,
        stepResponses: this.stepResponses,
        specialist: this.currentSpecialist,
      };

      await this.storage.setItem(sessionKey, JSON.stringify(sessionData));
      console.log('[AIPG] Saved session data for', this.currentSpecialist);
    } catch (e) {
      console.warn('[AIPG] Failed to save session data', e);
    }
  }

  // Synchronous wrapper for backwards compatibility
  saveSessionDataSync() {
    this.saveSessionData().catch(e =>
      console.warn('[AIPG] Failed to save session data (sync)', e)
    );
  }

  /**
   * Clear session data (when workflow is completed or reset)
   */
  async clearSessionData() {
    try {
      const sessionKey = `AIPG_session_${this.currentSpecialist || 'default'}`;
      await this.storage.removeItem(sessionKey);
      console.log('[AIPG] Cleared session data for', this.currentSpecialist);
    } catch (e) {
      console.warn('[AIPG] Failed to clear session data', e);
    }
  }

  // Synchronous wrapper for backwards compatibility
  clearSessionDataSync() {
    this.clearSessionData().catch(e =>
      console.warn('[AIPG] Failed to clear session data (sync)', e)
    );
  }

  /**
   * Load LLM settings from storage
   */
  async loadLLMSettings() {
    try {
      const raw = await this.storage.getItem('AIPG_llm_settings');
      if (raw) {
        const settings = JSON.parse(raw);
        this.llmProvider = settings.provider || this.llmProvider;
        this.llmModel = settings.model || this.llmModel;
        this.llmApiKey = settings.apiKey || this.llmApiKey;
        this.llmEnabled = settings.enabled || false;
        this.updateLLMEndpoint();

        console.log('[AIPG] Loaded LLM settings:', {
          provider: this.llmProvider,
          model: this.llmModel,
          enabled: this.llmEnabled,
          hasApiKey: !!this.llmApiKey,
        });
      }
    } catch (e) {
      console.warn('[AIPG] Failed to load LLM settings', e);
    }
  }

  /**
   * Save LLM settings to storage
   */
  async saveLLMSettings() {
    try {
      const settings = {
        provider: this.llmProvider,
        model: this.llmModel,
        apiKey: this.llmApiKey,
        enabled: this.llmEnabled,
        timestamp: Date.now(),
      };

      await this.storage.setItem('AIPG_llm_settings', JSON.stringify(settings));
      console.log('[AIPG] Saved LLM settings');
    } catch (e) {
      console.warn('[AIPG] Failed to save LLM settings', e);
    }
  }

  // Synchronous wrapper for backwards compatibility
  saveLLMSettingsSync() {
    this.saveLLMSettings().catch(e =>
      console.warn('[AIPG] Failed to save LLM settings (sync)', e)
    );
  }

  /**
   * Initialize progress tracking for the current specialist
   */
  initializeProgress() {
    if (!this.specialistData) return;

    this.totalSteps = this.getSpecialistStepCount();
    this.stepStates = {};

    // Initialize all steps as not-started
    for (let i = 1; i <= this.totalSteps; i++) {
      this.stepStates[i] = 'not-started';
    }

    this.completedSteps = 0;
    this.progressVisible = this.workflowActive;

    console.log(`[AIPG] Progress initialized for ${this.totalSteps} steps`);
  }

  /**
   * Get step count based on specialist workflow
   */
  getSpecialistStepCount() {
    if (!this.specialistData) return 0;

    // Get the highest step number from the specialist's workflow
    const steps = this.specialistData.defaultPromptingTechniques;
    if (!steps || !Array.isArray(steps)) return 0;

    return Math.max(...steps.map(step => step.step || 0));
  }

  /**
   * Update step status and trigger UI updates
   */
  updateStepStatus(stepNumber, status) {
    if (!this.stepStates || !stepNumber) return;

    const oldStatus = this.stepStates[stepNumber];
    this.stepStates[stepNumber] = status;

    // Update completed steps count
    this.completedSteps = Object.values(this.stepStates).filter(
      status => status === 'completed'
    ).length;

    // Update progress in storage
    this.saveProgressToStorage();

    // Re-render progress indicator if visible
    if (this.progressVisible) {
      this.renderProgressIndicator();
    }

    console.log(`[AIPG] Step ${stepNumber}: ${oldStatus} -> ${status}`);
  }

  /**
   * Calculate progress percentage
   */
  calculateProgress() {
    if (!this.totalSteps) return 0;
    return Math.round((this.completedSteps / this.totalSteps) * 100);
  }

  /**
   * Render the main progress indicator
   */
  renderProgressIndicator() {
    const container = document.querySelector('.ai-prompting-guide-selection');
    if (!container || !this.workflowActive) return;

    let progressContainer = container.querySelector('.ai-progress-container');

    if (!progressContainer) {
      progressContainer = document.createElement('div');
      progressContainer.className = 'ai-progress-container';
      container.appendChild(progressContainer);
    }

    const progressPercentage = this.calculateProgress();
    const currentStepTitle = this.getCurrentStepTitle();

    progressContainer.innerHTML = `
      <div class="ai-progress-header">
        <div class="ai-progress-title">
          <span>Progress: Step ${this.currentStep || 1} of ${this.totalSteps}</span>
        </div>
        <button class="ai-progress-toggle" onclick="window.aipgInstance.toggleProgressOverview()">
          ${this.progressExpanded ? '▼' : '▶'}
        </button>
      </div>
      
      <div class="ai-progress-bar-container">
        <div class="ai-progress-info">
          <span>${currentStepTitle || 'Getting started...'}</span>
          <span>${progressPercentage}%</span>
        </div>
        <div class="ai-progress-bar">
          <div class="ai-progress-fill" style="width: ${progressPercentage}%"></div>
        </div>
      </div>
      
      <div class="ai-steps-overview ${this.progressExpanded ? 'expanded' : ''}">
        ${this.renderStepOverview()}
      </div>
    `;

    // Store reference for global access
    window.aipgInstance = this;
  }

  /**
   * Get current step title from specialist data
   */
  getCurrentStepTitle() {
    if (!this.specialistData || !this.currentStep) return null;

    const stepData = this.specialistData.defaultPromptingTechniques.find(
      s => s.step === this.currentStep
    );

    return stepData ? stepData.title : null;
  }

  /**
   * Render step overview panel
   */
  renderStepOverview() {
    if (!this.specialistData) return '';

    const steps = this.specialistData.defaultPromptingTechniques.sort(
      (a, b) => a.step - b.step
    );

    return `
      <div class="ai-steps-list">
        ${steps
          .map(step => {
            const status = this.getStepDisplayStatus(step.step);
            const isCurrent = step.step === this.currentStep;
            const isCompleted = this.stepStates[step.step] === 'completed';
            const isClickable = isCompleted && step.step < this.currentStep;

            return `
            <div class="ai-step-item ${isCurrent ? 'current' : ''} ${isCompleted ? 'completed' : ''}" 
                 ${isClickable ? `onclick="window.aipgInstance.handleStepClick(${step.step})"` : ''}>
              
              <div class="ai-step-status ${status}">
                ${this.getStepStatusIcon(step.step, status)}
              </div>
              
              <div class="ai-step-content">
                <div class="ai-step-title">${step.title}</div>
                <div class="ai-step-description">${step.description}</div>
              </div>
            </div>
          `;
          })
          .join('')}
      </div>
    `;
  }

  /**
   * Get display status for a step
   */
  getStepDisplayStatus(stepNumber) {
    const status = this.stepStates[stepNumber] || 'not-started';

    if (stepNumber === this.currentStep && this.workflowActive) {
      return status === 'completed' ? 'completed' : 'current';
    }

    return status;
  }

  /**
   * Get status icon for a step
   */
  getStepStatusIcon(stepNumber, status) {
    switch (status) {
      case 'completed':
        return '✓';
      case 'current':
        return stepNumber.toString();
      case 'in-progress':
        return '⋯';
      case 'not-started':
      default:
        return stepNumber.toString();
    }
  }

  /**
   * Toggle progress overview panel
   */
  toggleProgressOverview() {
    this.progressExpanded = !this.progressExpanded;
    this.renderProgressIndicator();
  }

  /**
   * Handle click on completed steps for review
   */
  handleStepClick(stepNumber) {
    if (this.stepStates[stepNumber] !== 'completed') return;

    // Show step responses if available
    const responses = this.stepResponses[stepNumber];
    if (responses && Object.keys(responses).length > 0) {
      let responseText = `<strong>Step ${stepNumber} Responses:</strong><br>`;
      for (const [field, value] of Object.entries(responses)) {
        responseText += `<br><strong>${field}:</strong> ${value}`;
      }

      this.addAssistantMessage(responseText);
    } else {
      this.addAssistantMessage(
        `<strong>Step ${stepNumber} Summary:</strong><br>This step has been completed. No detailed responses were recorded.`
      );
    }
  }

  /**
   * Save progress to session storage
   */
  saveProgressToStorage() {
    if (!this.currentSpecialist) return;

    try {
      // Update specialist-specific progress
      this.specialistProgress[this.currentSpecialist] = {
        stepStates: { ...this.stepStates },
        currentStep: this.currentStep,
        completedSteps: this.completedSteps,
        totalSteps: this.totalSteps,
        timestamp: Date.now(),
      };

      // Save to session storage
      const progressData = {
        specialistProgress: this.specialistProgress,
        currentSpecialist: this.currentSpecialist,
        progressExpanded: this.progressExpanded,
        timestamp: Date.now(),
      };

      sessionStorage.setItem('AIPG_progress', JSON.stringify(progressData));
      console.log('[AIPG] Progress saved to storage');
    } catch (e) {
      console.warn('[AIPG] Failed to save progress', e);
    }
  }

  /**
   * Load progress from session storage
   */
  loadProgressFromStorage() {
    try {
      const data = sessionStorage.getItem('AIPG_progress');
      if (!data) return false;

      const progressData = JSON.parse(data);

      // Restore specialist progress data
      this.specialistProgress = progressData.specialistProgress || {};
      this.progressExpanded = progressData.progressExpanded || false;

      // Restore current specialist progress if available
      if (
        this.currentSpecialist &&
        this.specialistProgress[this.currentSpecialist]
      ) {
        const specialistData = this.specialistProgress[this.currentSpecialist];
        this.stepStates = specialistData.stepStates || {};
        this.completedSteps = specialistData.completedSteps || 0;
        this.totalSteps =
          specialistData.totalSteps || this.getSpecialistStepCount();
        
        // Restore workflow state for this specific specialist
        this.currentStep = specialistData.currentStep || null;
        this.workflowActive = specialistData.currentStep > 0;
        
        // Only return true if there's actual workflow progress
        const hasProgress = specialistData.currentStep > 0 && 
          (Object.keys(this.stepStates).length > 0 || this.completedSteps > 0);
        
        console.log('[AIPG] Progress loaded from storage for', this.currentSpecialist, hasProgress);
        return hasProgress;
      }

      console.log('[AIPG] No progress found for specialist:', this.currentSpecialist);
      return false;
    } catch (e) {
      console.warn('[AIPG] Failed to load progress', e);
      return false;
    }
  }

  /**
   * Reset progress for current specialist
   */
  resetProgress() {
    this.stepStates = {};
    this.completedSteps = 0;
    this.progressExpanded = false;

    if (this.currentSpecialist) {
      delete this.specialistProgress[this.currentSpecialist];
    }

    this.initializeProgress();
    this.saveProgressToStorage();
  }

  /* ================================================================
   *  Storage Management and Error Handling
   * ================================================================ */

  /**
   * Initialize storage manager and handle storage errors
   */
  async initializeStorage() {
    try {
      if (!this.storage.isInitialized) {
        await this.storage.initialize();
        const storageInfo = this.storage.getStorageInfo();

        console.log('[AIPG] Storage initialized:', storageInfo);

        // Show warning if using fallback storage
        if (
          storageInfo.current === 'memory' ||
          storageInfo.current === 'sessionStorage'
        ) {
          this.showStorageWarning(storageInfo);
        }
      }
      return true;
    } catch (error) {
      console.error('[AIPG] Storage initialization failed:', error);
      this.showStorageError(error);
      return false;
    }
  }

  /**
   * Show storage warning to user when using fallback storage
   */
  showStorageWarning(storageInfo) {
    const warningHtml = `
      <div style="
        background: #fff3cd;
        border: 1px solid #ffeaa7;
        border-radius: 4px;
        padding: 12px;
        margin: 10px 0;
        font-size: 13px;
        color: #856404;
        display: flex;
        align-items: center;
        gap: 8px;
      ">
        <span style="font-size: 16px;">⚠️</span>
        <div>
          <strong>Storage Warning:</strong><br>
          ${this.getStorageWarningMessage(storageInfo)}
          <button onclick="aiPromptingGuide.showStorageHelp()" style="
            background: #6c757d;
            color: white;
            border: none;
            padding: 4px 8px;
            border-radius: 3px;
            font-size: 11px;
            margin-left: 8px;
            cursor: pointer;
          ">Help</button>
        </div>
      </div>
    `;

    // Try to add the warning to the interface if it's visible
    if (this.isVisible) {
      const container = document.querySelector(
        '#aiPromptingGuideInterface .content'
      );
      if (container) {
        const existingWarning = container.querySelector('.storage-warning');
        if (existingWarning) {
          existingWarning.remove();
        }

        const warningElement = document.createElement('div');
        warningElement.className = 'storage-warning';
        warningElement.innerHTML = warningHtml;
        container.insertBefore(warningElement, container.firstChild);
      }
    }
  }

  /**
   * Get appropriate warning message based on storage type
   */
  getStorageWarningMessage(storageInfo) {
    if (storageInfo.current === 'memory') {
      return 'Using temporary storage only. Your data will be lost when you close this tab. Please enable localStorage in your browser settings for persistent storage.';
    } else if (storageInfo.current === 'sessionStorage') {
      return 'Using session-only storage. Your data will be lost when you close the browser. Please enable localStorage for better persistence.';
    } else if (storageInfo.current === 'chromeStorage') {
      return 'Using Chrome extension storage. This provides good persistence but may have different behavior than expected.';
    }
    return 'Storage system operating normally.';
  }

  /**
   * Show storage error to user
   */
  showStorageError(error) {
    const errorHtml = `
      <div style="
        background: #f8d7da;
        border: 1px solid #f5c6cb;
        border-radius: 4px;
        padding: 12px;
        margin: 10px 0;
        font-size: 13px;
        color: #721c24;
        display: flex;
        align-items: center;
        gap: 8px;
      ">
        <span style="font-size: 16px;">❌</span>
        <div>
          <strong>Storage Error:</strong><br>
          Unable to save your data. Error: ${error.message || 'Unknown error'}
          <button onclick="aiPromptingGuide.showStorageHelp()" style="
            background: #dc3545;
            color: white;
            border: none;
            padding: 4px 8px;
            border-radius: 3px;
            font-size: 11px;
            margin-left: 8px;
            cursor: pointer;
          ">Get Help</button>
        </div>
      </div>
    `;

    // Try to add the error to the interface if it's visible
    if (this.isVisible) {
      const container = document.querySelector(
        '#aiPromptingGuideInterface .content'
      );
      if (container) {
        const existingError = container.querySelector('.storage-error');
        if (existingError) {
          existingError.remove();
        }

        const errorElement = document.createElement('div');
        errorElement.className = 'storage-error';
        errorElement.innerHTML = errorHtml;
        container.insertBefore(errorElement, container.firstChild);
      }
    }
  }

  /**
   * Show storage help dialog
   */
  showStorageHelp() {
    const storageInfo = this.storage.getStorageInfo();

    const helpHtml = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
      ">
        <div style="
          background: white;
          border-radius: 8px;
          padding: 20px;
          max-width: 500px;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        ">
          <h3 style="margin: 0 0 15px 0; color: #333;">Storage Help</h3>
          
          <div style="margin-bottom: 15px;">
            <strong>Current Storage Status:</strong><br>
            <div style="background: #f8f9fa; padding: 8px; border-radius: 4px; font-family: monospace; font-size: 12px;">
              Type: ${storageInfo.current}<br>
              Status: ${storageInfo.status}<br>
              Available: ${storageInfo.available.join(', ')}<br>
              ${storageInfo.lastError ? `Last Error: ${storageInfo.lastError}` : ''}
            </div>
          </div>

          <div style="margin-bottom: 15px;">
            <strong>To fix storage issues:</strong>
            <ol style="padding-left: 20px; margin: 8px 0;">
              <li>Check if localStorage is enabled in your browser settings</li>
              <li>Clear browser cache and cookies for this site</li>
              <li>Disable strict privacy modes temporarily</li>
              <li>Try refreshing the page</li>
              <li>Check if you're in private/incognito mode</li>
            </ol>
          </div>

          <div style="margin-bottom: 15px;">
            <strong>Storage Types:</strong>
            <ul style="padding-left: 20px; margin: 8px 0; font-size: 12px;">
              <li><strong>localStorage:</strong> Best - persistent across sessions</li>
              <li><strong>Chrome Storage:</strong> Good - extension-specific storage</li>
              <li><strong>sessionStorage:</strong> Limited - lost when browser closes</li>
              <li><strong>Memory:</strong> Temporary - lost when tab closes</li>
            </ul>
          </div>

          <div style="text-align: right;">
            <button onclick="this.closest('[style*=\\'position: fixed\\']').remove()" style="
              background: #007bff;
              color: white;
              border: none;
              padding: 8px 16px;
              border-radius: 4px;
              cursor: pointer;
            ">Close</button>
          </div>
        </div>
      </div>
    `;

    const helpDialog = document.createElement('div');
    helpDialog.innerHTML = helpHtml;
    document.body.appendChild(helpDialog);
  }

  /**
   * Test storage functionality and provide feedback
   */
  async testStorageAndReport() {
    const testResult = await this.storage.testStorage();

    if (testResult.success) {
      console.log('[AIPG] Storage test passed:', testResult);
      return true;
    } else {
      console.error('[AIPG] Storage test failed:', testResult);
      this.showStorageError(new Error(testResult.error));
      return false;
    }
  }

  /**
   * Get detailed storage statistics for debugging
   */
  async getStorageStats() {
    try {
      const stats = await this.storage.getStorageStats();
      console.log('[AIPG] Storage statistics:', stats);
      return stats;
    } catch (error) {
      console.error('[AIPG] Failed to get storage stats:', error);
      return null;
    }
  }

  /**
   * Get storage status display information for UI
   */
  getStorageStatusDisplay(storageInfo) {
    const type = storageInfo.current || 'unknown';
    let status, color, bgColor, borderColor, description;

    switch (type) {
      case 'localStorage':
        status = '✅ Optimal';
        color = '#28a745';
        bgColor = '#d4edda';
        borderColor = '#28a745';
        description =
          'Using localStorage - best performance with full persistence across sessions.';
        break;

      case 'chromeStorage':
        status = '✅ Good';
        color = '#28a745';
        bgColor = '#d1ecf1';
        borderColor = '#17a2b8';
        description =
          'Using Chrome extension storage - good persistence with cross-device sync capability.';
        break;

      case 'sessionStorage':
        status = '⚠️ Limited';
        color = '#856404';
        bgColor = '#fff3cd';
        borderColor = '#ffc107';
        description =
          'Using sessionStorage - data will be lost when browser is closed. Enable localStorage for better experience.';
        break;

      case 'memory':
        status = '❌ Temporary';
        color = '#721c24';
        bgColor = '#f8d7da';
        borderColor = '#dc3545';
        description =
          'Using memory storage only - data will be lost when tab is closed. Please enable localStorage in browser settings.';
        break;

      default:
        status = '❓ Unknown';
        color = '#6c757d';
        bgColor = '#e2e3e5';
        borderColor = '#6c757d';
        description =
          'Storage status unknown - there may be an issue with the storage system.';
    }

    return {
      type: type.charAt(0).toUpperCase() + type.slice(1),
      status,
      color,
      bgColor,
      borderColor,
      description,
    };
  }

  /**
   * Test storage from settings panel and show results
   */
  async testStorageFromSettings() {
    const testButton = document.getElementById('test-storage');
    if (testButton) {
      const originalText = testButton.innerHTML;
      testButton.innerHTML = '🔄 Testing...';
      testButton.disabled = true;
    }

    try {
      const testResult = await this.storage.testStorage();
      
      const resultHtml = `
        <div style="
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
          z-index: 10001;
          max-width: 400px;
          width: 90%;
        ">
          <h3 style="margin: 0 0 15px 0; color: #333;">
            🔍 Storage Test Results
          </h3>
          
          <div style="margin-bottom: 15px;">
            <div style="
              padding: 10px;
              border-radius: 4px;
              background: ${testResult.success ? '#d4edda' : '#f8d7da'};
              border-left: 4px solid ${testResult.success ? '#28a745' : '#dc3545'};
            ">
              <strong>Status:</strong> 
              <span style="color: ${testResult.success ? '#28a745' : '#dc3545'};">
                ${testResult.success ? '✅ Storage Working' : '❌ Storage Failed'}
              </span>
              <br>
              <strong>Storage Type:</strong> ${testResult.storageType || 'Unknown'}
              <br>
              ${testResult.responseTime ? `<strong>Response Time:</strong> ${testResult.responseTime}ms<br>` : ''}
              ${testResult.error ? `<strong>Error:</strong> ${testResult.error}` : ''}
            </div>
          </div>

          <div style="text-align: right;">
            <button onclick="this.closest('[style*=\\'position: fixed\\']').remove()" style="
              background: #007bff;
              color: white;
              border: none;
              padding: 8px 16px;
              border-radius: 4px;
              cursor: pointer;
            ">Close</button>
          </div>
        </div>
      `;

      const testDialog = document.createElement('div');
      testDialog.innerHTML = resultHtml;
      document.body.appendChild(testDialog);

      // Auto-remove after 10 seconds
      setTimeout(() => {
        if (testDialog.parentNode) {
          testDialog.remove();
        }
      }, 10000);

    } catch (error) {
      console.error('[AIPG] Storage test failed:', error);
    } finally {
      if (testButton) {
        testButton.innerHTML = originalText;
        testButton.disabled = false;
      }
    }
  }

  /**
   * Show detailed storage statistics dialog
   */
  async showStorageStatsDialog() {
    const statsButton = document.getElementById('show-storage-stats');
    if (statsButton) {
      const originalText = statsButton.innerHTML;
      statsButton.innerHTML = '🔄 Loading...';
      statsButton.disabled = true;
    }

    try {
      const stats = await this.storage.getStorageStats();
      const storageInfo = this.storage.getStorageInfo();

      let statsContent = '';
      if (stats && !stats.error) {
        statsContent = `
          <div style="margin-bottom: 15px;">
            <strong>Storage Usage:</strong>
            <div style="background: #f8f9fa; padding: 8px; border-radius: 4px; font-family: monospace; font-size: 12px; margin-top: 8px;">
              Total Keys: ${stats.totalKeys}<br>
              Total Size: ${stats.totalSize} characters<br>
              Average Size: ${stats.averageSize} characters<br>
            </div>
          </div>

          <div style="margin-bottom: 15px;">
            <strong>Data Breakdown:</strong>
            <div style="max-height: 150px; overflow-y: auto;">
              ${Object.entries(stats.keyStats || {}).map(([key, info]) => `
                <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #eee; font-size: 11px;">
                  <span>${key}:</span>
                  <span>${info.size || 0} chars</span>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      } else {
        statsContent = `
          <div style="color: #dc3545; padding: 10px; background: #f8d7da; border-radius: 4px;">
            Unable to load storage statistics: ${stats?.error || 'Unknown error'}
          </div>
        `;
      }

      const statsHtml = `
        <div style="
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 10001;
        ">
          <div style="
            background: white;
            border-radius: 8px;
            padding: 20px;
            max-width: 500px;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            width: 90%;
          ">
            <h3 style="margin: 0 0 15px 0; color: #333;">📊 Storage Statistics</h3>
            
            <div style="margin-bottom: 15px;">
              <strong>System Information:</strong>
              <div style="background: #f8f9fa; padding: 8px; border-radius: 4px; font-family: monospace; font-size: 12px; margin-top: 8px;">
                Type: ${storageInfo.current}<br>
                Status: ${storageInfo.status}<br>
                Available: ${storageInfo.available.join(', ')}<br>
                Persistent: ${storageInfo.features?.persistent ? 'Yes' : 'No'}<br>
                Cross-Session: ${storageInfo.features?.crossSession ? 'Yes' : 'No'}<br>
                Cross-Domain: ${storageInfo.features?.crossDomain ? 'Yes' : 'No'}
              </div>
            </div>

            ${statsContent}

            <div style="text-align: right;">
              <button onclick="this.closest('[style*=\\'position: fixed\\']').remove()" style="
                background: #007bff;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
              ">Close</button>
            </div>
          </div>
        </div>
      `;

      const statsDialog = document.createElement('div');
      statsDialog.innerHTML = statsHtml;
      document.body.appendChild(statsDialog);

    } catch (error) {
      console.error('[AIPG] Failed to show storage stats:', error);
    } finally {
      if (statsButton) {
        statsButton.innerHTML = originalText;
        statsButton.disabled = false;
      }
    }
  }

  /* ================================================================
   * ONBOARDING SYSTEM METHODS
   * ================================================================ */

  /**
   * Load onboarding progress from storage
   */
  async loadOnboardingProgress() {
    try {
      const raw = localStorage.getItem('AIPG_onboarding');
      if (raw) {
        const progress = JSON.parse(raw);
        this.onboardingCompleted = progress.completed || false;
        this.onboardingData = { ...this.onboardingData, ...progress.data };
        console.log('[AIPG] Loaded onboarding progress:', progress);
      }
    } catch (e) {
      console.warn('[AIPG] Failed to load onboarding progress', e);
    }
  }

  /**
   * Save onboarding progress to storage
   */
  saveOnboardingProgress() {
    try {
      const progress = {
        completed: this.onboardingCompleted,
        data: this.onboardingData,
        timestamp: Date.now(),
      };
      localStorage.setItem('AIPG_onboarding', JSON.stringify(progress));
      console.log('[AIPG] Saved onboarding progress');
    } catch (e) {
      console.warn('[AIPG] Failed to save onboarding progress', e);
    }
  }

  /**
   * Start the onboarding process
   */
  startOnboarding() {
    console.log('[AIPG] Starting onboarding flow');
    this.onboardingActive = true;
    this.onboardingStep = 1;
    this.createOnboardingInterface();
    this.showOnboardingStep(1);
  }

  /**
   * Create the onboarding interface
   */
  createOnboardingInterface() {
    // Remove existing onboarding if any
    const existing = document.getElementById('ai-onboarding-overlay');
    if (existing) {
      existing.remove();
    }

    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'ai-onboarding-overlay';
    overlay.className = 'ai-onboarding-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'onboarding-title');

    // Create container
    const container = document.createElement('div');
    container.className = 'ai-onboarding-container';

    // Create header
    const header = document.createElement('div');
    header.className = 'ai-onboarding-header';

    const skipButton = document.createElement('button');
    skipButton.className = 'ai-onboarding-skip';
    skipButton.textContent = 'Skip';
    skipButton.setAttribute('aria-label', 'Skip onboarding');
    this.addEventListenerTracked(
      skipButton,
      'click',
      this.handleOnboardingSkip
    );

    const stepIndicator = document.createElement('div');
    stepIndicator.className = 'ai-onboarding-step-indicator';
    stepIndicator.setAttribute('aria-label', 'Progress indicator');

    for (let i = 1; i <= 3; i++) {
      const dot = document.createElement('div');
      dot.className = 'ai-onboarding-step-dot';
      dot.setAttribute('aria-label', `Step ${i}`);
      stepIndicator.appendChild(dot);
    }

    const title = document.createElement('h1');
    title.id = 'onboarding-title';
    title.className = 'ai-onboarding-title';

    const subtitle = document.createElement('p');
    subtitle.className = 'ai-onboarding-subtitle';

    header.appendChild(skipButton);
    header.appendChild(stepIndicator);
    header.appendChild(title);
    header.appendChild(subtitle);

    // Create content area
    const content = document.createElement('div');
    content.className = 'ai-onboarding-content';
    content.id = 'onboarding-content';

    // Create footer
    const footer = document.createElement('div');
    footer.className = 'ai-onboarding-footer';

    const progress = document.createElement('div');
    progress.className = 'ai-onboarding-progress';
    progress.id = 'onboarding-progress';

    const actions = document.createElement('div');
    actions.className = 'ai-onboarding-actions';

    const backButton = document.createElement('button');
    backButton.className = 'ai-onboarding-button secondary';
    backButton.textContent = 'Back';
    backButton.id = 'onboarding-back';
    this.addEventListenerTracked(
      backButton,
      'click',
      this.handleOnboardingBack
    );

    const nextButton = document.createElement('button');
    nextButton.className = 'ai-onboarding-button primary';
    nextButton.textContent = 'Next';
    nextButton.id = 'onboarding-next';
    this.addEventListenerTracked(
      nextButton,
      'click',
      this.handleOnboardingNext
    );

    actions.appendChild(backButton);
    actions.appendChild(nextButton);
    footer.appendChild(progress);
    footer.appendChild(actions);

    // Assemble everything
    container.appendChild(header);
    container.appendChild(content);
    container.appendChild(footer);
    overlay.appendChild(container);

    // Add to DOM
    document.body.appendChild(overlay);

    // Focus management
    overlay.focus();

    // Handle ESC key to close
    this.addEventListenerTracked(document, 'keydown', e => {
      if (e.key === 'Escape' && this.onboardingActive) {
        this.handleOnboardingSkip();
      }
    });
  }

  /**
   * Show a specific onboarding step
   */
  showOnboardingStep(step) {
    this.onboardingStep = step;

    // Update step indicator
    const dots = document.querySelectorAll('.ai-onboarding-step-dot');
    dots.forEach((dot, index) => {
      dot.classList.remove('active', 'completed');
      if (index + 1 === step) {
        dot.classList.add('active');
      } else if (index + 1 < step) {
        dot.classList.add('completed');
      }
    });

    // Update content based on step
    const title = document.querySelector('.ai-onboarding-title');
    const subtitle = document.querySelector('.ai-onboarding-subtitle');
    const content = document.getElementById('onboarding-content');
    const progress = document.getElementById('onboarding-progress');
    const backButton = document.getElementById('onboarding-back');
    const nextButton = document.getElementById('onboarding-next');

    // Reset content animation
    content.style.animation = 'none';
    setTimeout(() => {
      content.style.animation =
        'slideInRight 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
    }, 10);

    switch (step) {
      case 1:
        this.showWelcomeStep(
          title,
          subtitle,
          content,
          progress,
          backButton,
          nextButton
        );
        break;
      case 2:
        this.showQuestionsStep(
          title,
          subtitle,
          content,
          progress,
          backButton,
          nextButton
        );
        break;
      case 3:
        this.showPreviewStep(
          title,
          subtitle,
          content,
          progress,
          backButton,
          nextButton
        );
        break;
    }
  }

  /**
   * Show Step 1: Welcome & Value Proposition
   */
  showWelcomeStep(title, subtitle, content, progress, backButton, nextButton) {
    title.textContent = 'Welcome to AI Prompting Guide! 🚀';
    subtitle.textContent =
      'Your personal AI specialist coach for better prompts and workflows';

    content.innerHTML = `
      <div class="ai-welcome-content">
        <span class="ai-welcome-icon" role="img" aria-label="Robot assistant">🤖</span>
        <p class="ai-welcome-description">
          Transform how you work with AI through expert-guided workflows. Get specialist knowledge 
          for any project, learn while working, and achieve better results faster.
        </p>
        <ul class="ai-benefits-list" role="list">
          <li class="ai-benefit-item">
            <span class="ai-benefit-icon" role="img" aria-label="Expert">👨‍💻</span>
            <div>
              <strong>Expert Guidance</strong> - Access specialized knowledge for development, research, content creation, and more
            </div>
          </li>
          <li class="ai-benefit-item">
            <span class="ai-benefit-icon" role="img" aria-label="Learning">📚</span>
            <div>
              <strong>Learn While Working</strong> - See prompting techniques and best practices in action
            </div>
          </li>
          <li class="ai-benefit-item">
            <span class="ai-benefit-icon" role="img" aria-label="Industry">🏢</span>
            <div>
              <strong>Domain-Specific Help</strong> - Get tailored advice for your industry and use case
            </div>
          </li>
          <li class="ai-benefit-item">
            <span class="ai-benefit-icon" role="img" aria-label="Workflow">⚡</span>
            <div>
              <strong>Structured Workflows</strong> - Follow step-by-step processes that deliver results
            </div>
          </li>
        </ul>
      </div>
    `;

    progress.textContent = 'Step 1 of 3';
    backButton.style.display = 'none';
    nextButton.textContent = 'Get Started';
    nextButton.disabled = false;
  }

  /**
   * Show Step 2: Specialist Recommendation Questions
   */
  showQuestionsStep(
    title,
    subtitle,
    content,
    progress,
    backButton,
    nextButton
  ) {
    title.textContent = "Let's Find Your Perfect Specialist 🎯";
    subtitle.textContent =
      'Answer a few quick questions to get personalized recommendations';

    content.innerHTML = `
      <div class="ai-question-form">
        <div class="ai-question-group">
          <h3 class="ai-question-title">What's your primary goal?</h3>
          <div class="ai-question-options">
            <div class="ai-question-option" data-question="primaryGoal" data-value="research">
              <input type="radio" id="goal-research" name="primaryGoal" value="research">
              <label for="goal-research">
                Research & Analysis
                <div class="ai-question-description">Market research, competitor analysis, data insights</div>
              </label>
            </div>
            <div class="ai-question-option" data-question="primaryGoal" data-value="development">
              <input type="radio" id="goal-development" name="primaryGoal" value="development">
              <label for="goal-development">
                Software Development
                <div class="ai-question-description">Coding, architecture, technical solutions</div>
              </label>
            </div>
            <div class="ai-question-option" data-question="primaryGoal" data-value="content">
              <input type="radio" id="goal-content" name="primaryGoal" value="content">
              <label for="goal-content">
                Content Creation
                <div class="ai-question-description">Writing, marketing, creative content</div>
              </label>
            </div>
            <div class="ai-question-option" data-question="primaryGoal" data-value="business">
              <input type="radio" id="goal-business" name="primaryGoal" value="business">
              <label for="goal-business">
                Business Strategy
                <div class="ai-question-description">Planning, operations, decision-making</div>
              </label>
            </div>
          </div>
        </div>

        <div class="ai-question-group">
          <h3 class="ai-question-title">What's your experience level with AI tools?</h3>
          <div class="ai-question-options">
            <div class="ai-question-option" data-question="experienceLevel" data-value="beginner">
              <input type="radio" id="exp-beginner" name="experienceLevel" value="beginner">
              <label for="exp-beginner">
                Beginner
                <div class="ai-question-description">New to AI tools, need guidance on basics</div>
              </label>
            </div>
            <div class="ai-question-option" data-question="experienceLevel" data-value="intermediate">
              <input type="radio" id="exp-intermediate" name="experienceLevel" value="intermediate">
              <label for="exp-intermediate">
                Intermediate
                <div class="ai-question-description">Some experience, want to improve results</div>
              </label>
            </div>
            <div class="ai-question-option" data-question="experienceLevel" data-value="advanced">
              <input type="radio" id="exp-advanced" name="experienceLevel" value="advanced">
              <label for="exp-advanced">
                Advanced
                <div class="ai-question-description">Experienced user, looking for optimization</div>
              </label>
            </div>
          </div>
        </div>

        <div class="ai-question-group">
          <h3 class="ai-question-title">What industry do you work in?</h3>
          <div class="ai-question-options">
            <div class="ai-question-option" data-question="industry" data-value="technology">
              <input type="radio" id="ind-tech" name="industry" value="technology">
              <label for="ind-tech">Technology & Software</label>
            </div>
            <div class="ai-question-option" data-question="industry" data-value="marketing">
              <input type="radio" id="ind-marketing" name="industry" value="marketing">
              <label for="ind-marketing">Marketing & Creative</label>
            </div>
            <div class="ai-question-option" data-question="industry" data-value="business">
              <input type="radio" id="ind-business" name="industry" value="business">
              <label for="ind-business">Business & Finance</label>
            </div>
            <div class="ai-question-option" data-question="industry" data-value="education">
              <input type="radio" id="ind-education" name="industry" value="education">
              <label for="ind-education">Education & Training</label>
            </div>
            <div class="ai-question-option" data-question="industry" data-value="other">
              <input type="radio" id="ind-other" name="industry" value="other">
              <label for="ind-other">Other</label>
            </div>
          </div>
        </div>
      </div>
    `;

    // Add click handlers for options
    const options = content.querySelectorAll('.ai-question-option');
    options.forEach(option => {
      this.addEventListenerTracked(option, 'click', e => {
        const radio = option.querySelector('input[type="radio"]');
        const question = option.dataset.question;
        const value = option.dataset.value;

        // Update selection
        radio.checked = true;
        this.onboardingData[question] = value;

        // Update visual state
        const allOptions = content.querySelectorAll(
          `[data-question="${question}"]`
        );
        allOptions.forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');

        // Check if all questions are answered
        this.updateNextButtonState();
      });
    });

    progress.textContent = 'Step 2 of 3';
    backButton.style.display = 'block';
    nextButton.textContent = 'See Recommendation';
    this.updateNextButtonState();
  }

  /**
   * Show Step 3: Workflow Preview
   */
  showPreviewStep(title, subtitle, content, progress, backButton, nextButton) {
    // Calculate recommendation
    this.calculateSpecialistRecommendation();

    title.textContent = 'Your Perfect Match! 🎉';
    subtitle.textContent =
      "Here's your recommended specialist and workflow preview";

    const specialist = this.recommendedSpecialist;
    if (!specialist) {
      console.error('[AIPG] No specialist found for recommendation', {
        onboardingData: this.onboardingData,
        specialistsCount: this.specialists?.length || 0,
        specialistIds: this.specialists?.map(s => s.id) || []
      });
      
      // Show error message to user instead of returning silently
      content.innerHTML = `
        <div class="ai-preview-content">
          <div class="ai-error-message" style="text-align: center; padding: 20px;">
            <h3 style="color: #e74c3c;">⚠️ Recommendation Error</h3>
            <p>We encountered an issue generating your specialist recommendation. Please try restarting the onboarding process.</p>
            <button id="restart-onboarding-btn" class="ai-button ai-button-primary" style="margin-top: 15px;">
              Restart Onboarding
            </button>
          </div>
        </div>
      `;
      
      // Add restart button handler
      const restartBtn = content.querySelector('#restart-onboarding-btn');
      if (restartBtn) {
        this.addEventListenerTracked(restartBtn, 'click', () => {
          this.restartOnboarding();
        });
      }
      
      return;
    }

    const workflowSteps = specialist.defaultPromptingTechniques || [];

    content.innerHTML = `
      <div class="ai-preview-content">
        <div class="ai-recommended-specialist">
          <div class="ai-specialist-badge">Recommended for You</div>
          <div class="ai-specialist-icon" role="img" aria-label="Specialist icon">${specialist.icon}</div>
          <h3 class="ai-specialist-name">${specialist.name}</h3>
          <p class="ai-specialist-description">${specialist.description}</p>
          
          <div class="ai-workflow-preview">
            <h4 class="ai-workflow-title">${workflowSteps.length}-Step Workflow Process</h4>
            <ul class="ai-workflow-steps" role="list">
              ${workflowSteps
                .map(
                  (step, index) => `
                <li class="ai-workflow-step">
                  <div class="ai-workflow-step-number" role="img" aria-label="Step ${index + 1}">${index + 1}</div>
                  <div class="ai-workflow-step-content">
                    <div class="ai-workflow-step-title">${step.title}</div>
                    <div class="ai-workflow-step-description">${step.description}</div>
                  </div>
                </li>
              `
                )
                .join('')}
            </ul>
            
            <div class="ai-final-output">
              <div class="ai-final-output-title">🎯 Final Output:</div>
              <div class="ai-final-output-description">
                ${workflowSteps[workflowSteps.length - 1]?.output || 'Comprehensive deliverable tailored to your needs'}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    progress.textContent = 'Step 3 of 3';
    backButton.style.display = 'block';
    nextButton.textContent = 'Start Working!';
    nextButton.disabled = false;
  }

  /**
   * Calculate specialist recommendation based on user answers
   */
  calculateSpecialistRecommendation() {
    const { primaryGoal, experienceLevel, industry } = this.onboardingData;

    // Validate that we have specialists data
    if (!this.specialists || this.specialists.length === 0) {
      console.warn('[AIPG] No specialists data available for recommendation');
      this.recommendedSpecialist = null;
      return;
    }

    // Scoring system for each specialist
    const scores = {};

    // Initialize scores for all specialists
    this.specialists.forEach(specialist => {
      scores[specialist.id] = 0;
    });

    // Score based on primary goal
    switch (primaryGoal) {
      case 'research':
        scores['research-analysis'] = (scores['research-analysis'] || 0) + 10;
        scores['ai-solution-definition'] =
          (scores['ai-solution-definition'] || 0) + 5;
        break;
      case 'development':
        scores['website-creation'] = (scores['website-creation'] || 0) + 10;
        scores['ai-solution-definition'] =
          (scores['ai-solution-definition'] || 0) + 8;
        scores['research-analysis'] = (scores['research-analysis'] || 0) + 3;
        break;
      case 'content':
        scores['documentation-writing'] = (scores['documentation-writing'] || 0) + 10;
        scores['client-outreach-messaging'] =
          (scores['client-outreach-messaging'] || 0) + 8;
        break;
      case 'business':
        scores['saas-product-planning'] = (scores['saas-product-planning'] || 0) + 10;
        scores['research-analysis'] = (scores['research-analysis'] || 0) + 7;
        break;
    }

    // Score based on experience level
    if (experienceLevel === 'beginner') {
      // Favor specialists with clearer, more structured workflows
      scores['website-creation'] = (scores['website-creation'] || 0) + 3;
      scores['documentation-writing'] = (scores['documentation-writing'] || 0) + 3;
    } else if (experienceLevel === 'advanced') {
      // Favor more complex specialists
      scores['ai-solution-definition'] =
        (scores['ai-solution-definition'] || 0) + 3;
      scores['research-analysis'] = (scores['research-analysis'] || 0) + 2;
    }

    // Score based on industry
    switch (industry) {
      case 'technology':
        scores['website-creation'] = (scores['website-creation'] || 0) + 5;
        scores['ai-solution-definition'] =
          (scores['ai-solution-definition'] || 0) + 5;
        break;
      case 'marketing':
        scores['client-outreach-messaging'] =
          (scores['client-outreach-messaging'] || 0) + 5;
        scores['documentation-writing'] = (scores['documentation-writing'] || 0) + 5;
        break;
      case 'business':
        scores['saas-product-planning'] = (scores['saas-product-planning'] || 0) + 5;
        scores['research-analysis'] = (scores['research-analysis'] || 0) + 3;
        break;
    }

    // Find highest scoring specialist
    let maxScore = 0;
    let recommendedId = 'research-analysis'; // fallback

    Object.entries(scores).forEach(([id, score]) => {
      if (score > maxScore) {
        maxScore = score;
        recommendedId = id;
      }
    });

    // Find the recommended specialist with defensive coding
    this.recommendedSpecialist = this.specialists.find(s => s.id === recommendedId);
    
    // Fallback to first specialist if recommended one not found
    if (!this.recommendedSpecialist && this.specialists.length > 0) {
      this.recommendedSpecialist = this.specialists[0];
      console.warn('[AIPG] Fallback to first specialist:', this.specialists[0].name);
    }
    
    console.log('[AIPG] Calculated recommendation:', {
      onboardingData: { primaryGoal, experienceLevel, industry },
      scores,
      recommended: recommendedId,
      specialist: this.recommendedSpecialist?.name,
      maxScore
    });
  }

  /**
   * Update next button state based on current step requirements
   */
  updateNextButtonState() {
    const nextButton = document.getElementById('onboarding-next');
    if (!nextButton) return;

    switch (this.onboardingStep) {
      case 1:
        nextButton.disabled = false;
        break;
      case 2:
        // Check if all required questions are answered
        const required = ['primaryGoal', 'experienceLevel', 'industry'];
        const answered = required.every(q => this.onboardingData[q]);
        nextButton.disabled = !answered;
        break;
      case 3:
        nextButton.disabled = false;
        break;
    }
  }

  /**
   * Handle next button click
   */
  handleOnboardingNext() {
    if (this.onboardingStep < 3) {
      this.showOnboardingStep(this.onboardingStep + 1);
    } else {
      this.completeOnboarding();
    }
  }

  /**
   * Handle back button click
   */
  handleOnboardingBack() {
    if (this.onboardingStep > 1) {
      this.showOnboardingStep(this.onboardingStep - 1);
    }
  }

  /**
   * Handle skip button click
   */
  handleOnboardingSkip() {
    if (
      confirm(
        'Are you sure you want to skip the onboarding? You can always restart it from settings.'
      )
    ) {
      this.completeOnboarding(true);
    }
  }

  /**
   * Complete onboarding and start normal operation
   */
  completeOnboarding(skipped = false) {
    console.log('[AIPG] Completing onboarding', {
      skipped,
      data: this.onboardingData,
    });

    // Mark onboarding as completed
    this.onboardingCompleted = true;
    this.onboardingActive = false;
    this.saveOnboardingProgress();

    // Set recommended specialist as default if not skipped
    if (!skipped && this.recommendedSpecialist) {
      this.currentSpecialist = this.recommendedSpecialist;
      this.specialistData = this.recommendedSpecialist;
    }

    // Remove onboarding interface
    const overlay = document.getElementById('ai-onboarding-overlay');
    if (overlay) {
      overlay.remove();
    }

    // Continue with normal initialization
    this.continueInitialization();
  }

  /**
   * Continue initialization after onboarding is complete
   */
  async continueInitialization() {
    console.log('[AIPG] Continuing initialization after onboarding');

    /* ------------------------------------------------------------
     * 3. Populate dropdowns
     * ------------------------------------------------------------ */
    await this.loadSpecialists();
    await this.loadModels();

    /* ------------------------------------------------------------
     * 4. Load LLM settings
     * ------------------------------------------------------------ */
    await this.loadLLMSettings();
    
    // Initialize LLM Request Manager after settings are loaded
    if (typeof LLMRequestManager !== 'undefined') {
      this.llmRequestManager = new LLMRequestManager(this);
    }

    /* ------------------------------------------------------------
     * 5. Validate extension context (fire & forget)
     * ------------------------------------------------------------ */
    this.validateExtensionContext();

    /* ------------------------------------------------------------
     * 6. Apply visibility from saved prefs
     * ------------------------------------------------------------ */
    const container = document.getElementById('ai-prompting-guide-container');
    if (container) {
      container.style.display = this.isVisible ? 'flex' : 'none';
    }

    // Show interface if recommended specialist was selected
    if (this.recommendedSpecialist && !this.isVisible) {
      this.toggleVisibility();

      // Update the specialist dropdown if it exists
      const specialistSelect = document.getElementById('ai-specialist-select');
      if (specialistSelect) {
        specialistSelect.value = this.recommendedSpecialist.id;
        this.handleSpecialistChange();
      }
    }

    console.log('[AIPG] Initialization complete after onboarding');
  }

  /**
   * Restart the onboarding flow (called from settings)
   */
  restartOnboarding() {
    console.log('[AIPG] Restarting onboarding flow');

    // Reset onboarding data
    this.onboardingCompleted = false;
    this.onboardingActive = false;
    this.onboardingStep = 1;
    this.onboardingData = {
      primaryGoal: '',
      experienceLevel: '',
      industry: '',
      workType: '',
    };
    this.recommendedSpecialist = null;

    // Save the reset state
    this.saveOnboardingProgress();

    // Start onboarding
    this.startOnboarding();
  }

  /**
   * Check if current site is an LLM platform
   */
  isLLMSite() {
    const hostname = window.location.hostname.toLowerCase();
    const llmSites = [
      'chat.openai.com',
      'chatgpt.com', 
      'claude.ai',
      'bard.google.com',
      'gemini.google.com',
      'copilot.microsoft.com',
      'perplexity.ai',
      'poe.com',
      'character.ai',
      'huggingface.co',
      'cohere.com',
      'anthropic.com'
    ];
    
    return llmSites.some(site => hostname.includes(site));
  }
} // END CLASS

/* ================================================================
 *  Bootstrap
 * ================================================================ */

/* ================================================================
 *  Message listener for popup communication
 * ================================================================ */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[AIPG Content] Received message:', message);

  switch (message.action) {
    case 'toggleInterface':
      aipg.toggleVisibility(message.preSelectedSpecialist);
      sendResponse({ success: true });
      break;

    case 'changeSpecialist':
      if (aipg.isVisible) {
        aipg.setSpecialistFromPopup(message.specialistId);
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, message: 'Interface not open' });
      }
      break;

    case 'getStatus':
      sendResponse({ active: aipg.isVisible });
      break;

    case 'updateGlobalRules':
      // Handle global rules update
      sendResponse({ success: true });
      break;

    default:
      sendResponse({ success: false, message: 'Unknown action' });
  }

  return true; // Keep message channel open for async response
});

// Initialize the extension with proper cleanup
const aipg = new AIPromptingGuide();

// Initialize on DOM ready or immediately if already loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', aipg.initialize);
} else {
  aipg.initialize();
}

// Clean up resources when page unloads
window.addEventListener('beforeunload', () => {
  console.log('[AIPG] Page unloading, cleaning up resources');
  aipg.cleanup();
});

// Clean up if the extension context is invalidated
window.addEventListener('unload', () => {
  console.log('[AIPG] Page unload, cleaning up resources');
  aipg.cleanup();
});
