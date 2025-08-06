class AIPromptingGuide {
  constructor() {
    // Initialize security utilities
    this.security = new SecurityUtils();
    
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
    this.contextRecoveryAttempts = 0;
    this.maxRecoveryAttempts = 3;
    this.lastContextValidation = 0;
    this.contextValidationInterval = 60000; // 1 minute
    this.extensionContextValid = true;
    
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
    
    // Debounced functions
    this.debouncedSendMessage = this.security.debounce(this.handleSendMessage.bind(this), 300);
    
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
     * 1. Load persisted user data (prefs / notes) before UI build
     * ------------------------------------------------------------ */
    await this.loadUserPreferences();
    await this.loadUserNotes();

    /* ------------------------------------------------------------
     * 2. Create the interface (only if it does not already exist)
     * ------------------------------------------------------------ */
    if (!document.getElementById('ai-prompting-guide-container')) {
      this.createInterface();
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
    // Create container
    const container = document.createElement('div');
    container.id = 'ai-prompting-guide-container';
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
    
    // Create header
    const header = document.createElement('div');
    header.style.padding = '10px';
    header.style.backgroundColor = '#3498db';
    header.style.color = 'white';
    header.style.fontWeight = 'bold';
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.cursor = 'move';
    header.innerText = 'AI Prompting Guide';
    
    // Add event listeners for dragging
    this.addEventListenerTracked(header, 'mousedown', this.handleDragStart);
    this.addEventListenerTracked(document, 'mousemove', this.handleDrag);
    this.addEventListenerTracked(document, 'mouseup', this.handleDragEnd);
    
    // Create close button
    const closeButton = document.createElement('button');
    closeButton.innerText = 'X';
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
    this.addEventListenerTracked(closeButton, 'click', this.closeInterface);
    
    // Add close button to header
    header.appendChild(closeButton);
    
    // Create dropdown container
    const dropdownContainer = document.createElement('div');
    dropdownContainer.style.padding = '10px';
    dropdownContainer.style.display = 'flex';
    dropdownContainer.style.justifyContent = 'space-between';
    dropdownContainer.style.backgroundColor = '#f5f5f5';
    
    // Create specialist dropdown
    const specialistContainer = document.createElement('div');
    specialistContainer.style.flex = '1';
    specialistContainer.style.marginRight = '5px';
    
    const specialistLabel = document.createElement('label');
    specialistLabel.innerText = 'Specialist:';
    specialistLabel.style.display = 'block';
    specialistLabel.style.marginBottom = '5px';
    specialistLabel.style.fontSize = '12px';
    
    const specialistDropdown = document.createElement('select');
    specialistDropdown.id = 'ai-prompting-guide-specialist';
    specialistDropdown.style.width = '100%';
    specialistDropdown.style.padding = '5px';
    this.addEventListenerTracked(specialistDropdown, 'change', this.handleSpecialistChange);
    
    specialistContainer.appendChild(specialistLabel);
    specialistContainer.appendChild(specialistDropdown);
    
    // Create model dropdown
    const modelContainer = document.createElement('div');
    modelContainer.style.flex = '1';
    modelContainer.style.marginLeft = '5px';
    
    const modelLabel = document.createElement('label');
    modelLabel.innerText = 'Model:';
    modelLabel.style.display = 'block';
    modelLabel.style.marginBottom = '5px';
    modelLabel.style.fontSize = '12px';
    
    const modelDropdown = document.createElement('select');
    modelDropdown.id = 'ai-prompting-guide-model';
    modelDropdown.style.width = '100%';
    modelDropdown.style.padding = '5px';
    this.addEventListenerTracked(modelDropdown, 'change', this.handleModelChange);
    
    modelContainer.appendChild(modelLabel);
    modelContainer.appendChild(modelDropdown);
    
    // Add dropdowns to dropdown container
    dropdownContainer.appendChild(specialistContainer);
    dropdownContainer.appendChild(modelContainer);
    
    // Create messages container
    const messagesContainer = document.createElement('div');
    messagesContainer.id = 'ai-prompting-guide-messages';
    messagesContainer.style.flex = '1';
    messagesContainer.style.overflowY = 'auto';
    messagesContainer.style.padding = '10px';
    messagesContainer.style.backgroundColor = '#fff';
    
    // Create input container
    const inputContainer = document.createElement('div');
    inputContainer.style.padding = '10px';
    inputContainer.style.borderTop = '1px solid #ccc';
    inputContainer.style.display = 'flex';
    
    // Create text input
    const textInput = document.createElement('input');
    textInput.id = 'ai-prompting-guide-input';
    textInput.type = 'text';
    textInput.placeholder = 'Type your message...';
    textInput.style.flex = '1';
    textInput.style.padding = '8px';
    textInput.style.border = '1px solid #ccc';
    textInput.style.borderRadius = '4px';
    textInput.style.marginRight = '5px';
    const handleKeydown = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        // SECURITY FIX: Use debounced send message to prevent spam
        this.debouncedSendMessage();
      }
    };
    this.addEventListenerTracked(textInput, 'keydown', handleKeydown);
    
    // Create send button
    const sendButton = document.createElement('button');
    sendButton.innerText = 'Send';
    sendButton.style.padding = '8px 12px';
    sendButton.style.backgroundColor = '#3498db';
    sendButton.style.color = 'white';
    sendButton.style.border = 'none';
    sendButton.style.borderRadius = '4px';
    sendButton.style.cursor = 'pointer';
    this.addEventListenerTracked(sendButton, 'click', this.debouncedSendMessage);
    
    // Add text input and send button to input container
    inputContainer.appendChild(textInput);
    inputContainer.appendChild(sendButton);
    
    // Create button container
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '5px';
    buttonContainer.style.marginTop = '5px';
    
    // Create clear chat button
    const clearButton = document.createElement('button');
    clearButton.innerText = 'Clear Chat';
    clearButton.style.padding = '8px 12px';
    clearButton.style.backgroundColor = '#e74c3c';
    clearButton.style.color = 'white';
    clearButton.style.border = 'none';
    clearButton.style.borderRadius = '4px';
    clearButton.style.cursor = 'pointer';
    clearButton.style.flex = '1';
    this.addEventListenerTracked(clearButton, 'click', this.clearChat);
    
    // Create settings button (for future LLM integration)
    const settingsButton = document.createElement('button');
    settingsButton.innerText = '⚙️';
    settingsButton.style.padding = '8px 12px';
    settingsButton.style.backgroundColor = '#95a5a6';
    settingsButton.style.color = 'white';
    settingsButton.style.border = 'none';
    settingsButton.style.borderRadius = '4px';
    settingsButton.style.cursor = 'pointer';
    settingsButton.style.width = '40px';
    settingsButton.title = 'Settings (LLM Integration)';
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
    this.addEventListenerTracked(resizeHandle, 'mousedown', this.handleResizeStart);
    this.addEventListenerTracked(document, 'mousemove', this.handleResize);
    this.addEventListenerTracked(document, 'mouseup', this.handleResizeEnd);
    
    // Add all elements to container
    container.appendChild(header);
    container.appendChild(dropdownContainer);
    container.appendChild(messagesContainer);
    container.appendChild(inputContainer);
    container.appendChild(buttonContainer);
    container.appendChild(resizeHandle);
    
    // Add container to document
    document.body.appendChild(container);
    
    // Add welcome message
    this.addAssistantMessage(
      'Welcome to AI Prompting Guide! Please configure your LLM settings (⚙️ button) and select a specialist to get started.'
    );
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
    this.saveUserPreferences();

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
    const specialistDropdown = document.getElementById('ai-prompting-guide-specialist');
    if (specialistDropdown) {
      specialistDropdown.value = specialist.name;
    }

    // Load session data for this specialist
    await this.loadSessionData();

    // Clear previous messages and show appropriate message
    const messagesContainer = document.getElementById('ai-prompting-guide-messages');
    if (messagesContainer) {
      messagesContainer.innerHTML = '';
      
      // Check if there's an active workflow to restore
      if (this.workflowActive && this.currentStep) {
        this.addAssistantMessage(`<div style="background: #fff3cd; padding: 10px; border-radius: 5px; border-left: 4px solid #ffc107; margin: 10px 0;">` +
          `<strong>🔄 Session Restored!</strong><br><br>` +
          `I found your previous ${specialist.name} session in progress.<br>` +
          `You were on <strong>Step ${this.currentStep} of 7</strong>.<br><br>` +
          `Would you like to continue where you left off or start fresh?<br><br>` +
          `• Type "<em>continue</em>" to resume your progress<br>` +
          `• Type "<em>start over</em>" to begin a new workflow` +
          `</div>`);
      } else {
        // No previous session, show welcome message
        this.addAssistantMessage(specialist.welcomeMessage || 
          `Welcome! I'm your ${specialist.name} coach. Let's get started.`);
        
        // Auto-start workflow for research specialist
        if (specialistId === 'research-analysis' && specialist.defaultPromptingTechniques && 
            specialist.defaultPromptingTechniques.length > 0) {
          setTimeout(() => {
            this.startWorkflow();
          }, 1000);
        }
      }
    }

    // Save preferences
    this.saveUserPreferences();
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
      y: e.clientY - rect.top
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
    this.saveUserPreferences();
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
    this.saveUserPreferences();
  }

  /**
   * Clear the chat messages
   */
  clearChat() {
    const messagesContainer = document.getElementById('ai-prompting-guide-messages');
    if (messagesContainer) {
      // Remove all messages
      messagesContainer.innerHTML = '';
      
      // Add welcome message back
      if (this.currentSpecialist && this.specialistData) {
        this.addAssistantMessage(this.specialistData.welcomeMessage || 
          `Welcome to AI Prompting Guide! I'm your ${this.currentSpecialist} coach.`);
      } else {
        this.addAssistantMessage('Welcome to AI Prompting Guide! Please select a specialist to get started. The model selection helps optimize your final prompt but is optional for the basic workflow.');
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
      this.clearSessionData();
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
    const messagesContainer = document.getElementById('ai-prompting-guide-messages');
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
      this.llmConversationHistory = this.llmConversationHistory.slice(-this.llmMaxHistoryLength);
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
      const response = await this.sendMessageWithRetry({ action: 'getSpecialists' });
      
      if (response && response.specialists && response.specialists.length > 0 && !response.fallback) {
        console.log('[AIPG] Received specialists data:', response.specialists.length, 'specialists');
        this.specialists = response.specialists;
      } else {
        console.warn('[AIPG] Using fallback specialists due to communication issues');
        // Use enhanced fallback specialists with proper structure
        this.specialists = [
          { 
            id: 'research-analysis',
            name: 'Research & Analysis', 
            description: 'Background studies, competitor research, insights extraction',
            welcomeMessage: '🔬 Research & Analysis Coach activated! I\'ll guide you through a 7-step process to conduct focused, actionable research.',
            icon: '🔍',
            defaultPromptingTechniques: [
              { step: 1, title: 'Define Research Scope & Questions', description: 'Establish research parameters and 5-7 key questions' },
              { step: 2, title: 'Gather Raw Data', description: 'Collect information from web sources & APIs' },
              { step: 3, title: 'Summarize & Extract Key Insights', description: 'Process and structure collected information' },
              { step: 4, title: 'Analyze Competitors & Market Landscape', description: 'Evaluate competitive environment and positioning' },
              { step: 5, title: 'Identify Market Gaps & Opportunities', description: 'Discover unmet needs and potential solutions' },
              { step: 6, title: 'Validate Findings with Data & Visualization', description: 'Support insights with quantitative analysis' },
              { step: 7, title: 'Compile Final Research Report', description: 'Create comprehensive professional document' }
            ]
          },
          { 
            id: 'ai-solution-definition',
            name: 'AI Solution Definition', 
            description: 'Identify business cases, scope features, select models/tools',
            welcomeMessage: 'I am an AI Solution Definition specialist. Let\'s scope your next AI feature or product.',
            icon: '🧩',
            defaultPromptingTechniques: [] 
          },
          { 
            id: 'prompt-engineering',
            name: 'Prompt Engineering', 
            description: 'Craft, refine, and evaluate effective prompts for LLMs',
            welcomeMessage: 'Prompt Engineering specialist here. Tell me the outcome you need and we\'ll design the right prompts.',
            icon: '📝',
            defaultPromptingTechniques: [] 
          }
        ];
      }
      
      // Always populate the dropdown, regardless of data source
      this.populateSpecialistDropdown();
      
    } catch (error) {
      console.error('[AIPG] Error loading specialists:', error);
      // Even on error, provide basic functionality
      this.specialists = [{
        id: 'research-analysis',
        name: 'Research & Analysis',
        description: 'Research and analysis specialist',
        welcomeMessage: 'Welcome! I\'m here to help with research and analysis.',
        icon: '🔍',
        defaultPromptingTechniques: []
      }];
      this.populateSpecialistDropdown();
    }
  }

  /**
   * Populate the specialist dropdown
   */
  populateSpecialistDropdown() {
    const specialistDropdown = document.getElementById('ai-prompting-guide-specialist');
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
      
      if (response && response.models && response.models.length > 0 && !response.fallback) {
        console.log('[AIPG] Received models data:', response.models.length, 'models');
        this.models = response.models;
      } else {
        console.warn('[AIPG] Using fallback models due to communication issues');
        // Use enhanced fallback models
        this.models = [
          { 
            id: 'claude-models',
            name: 'Claude Models', 
            description: 'Claude 3.5 Sonnet, Claude 3 Opus',
            icon: '🧠' 
          },
          { 
            id: 'openai-models',
            name: 'OpenAI Models', 
            description: 'GPT-4o, GPT-4, o1-preview',
            icon: '🤖' 
          },
          { 
            id: 'google-models',
            name: 'Google Models', 
            description: 'Gemini Pro, Gemini Ultra',
            icon: '🌐' 
          },
          { 
            id: 'thinking-models',
            name: 'Thinking Models', 
            description: 'Reasoning-capable models',
            icon: '💭' 
          }
        ];
      }
      
      // Always populate the dropdown
      this.populateModelDropdown();
      
    } catch (error) {
      console.error('[AIPG] Error loading models:', error);
      // Even on error, provide basic functionality
      this.models = [
        { id: 'claude-models', name: 'Claude Models', description: 'Claude AI models', icon: '🧠' },
        { id: 'openai-models', name: 'OpenAI Models', description: 'GPT models', icon: '🤖' }
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
      // Set specialist data
      this.currentSpecialist = specialistName;
      this.specialistData = specialist;
      
      // Clear any existing workflow
      this.workflowActive = false;
      this.currentStep = null;
      this.currentQuestion = null;
      this.stepResponses = {};
      
      // Clear messages and show welcome message
      const messagesContainer = document.getElementById('ai-prompting-guide-messages');
      if (messagesContainer) {
        messagesContainer.innerHTML = '';
        this.addAssistantMessage(specialist.welcomeMessage || 
          `Welcome! I'm your ${specialist.name} coach. Let's get started.`);
      }
      
      // Auto-start workflow for research specialist if it has techniques
      if (specialist.id === 'research-analysis' && specialist.defaultPromptingTechniques && 
          specialist.defaultPromptingTechniques.length > 0) {
        setTimeout(() => {
          this.startWorkflow();
        }, 1000);
      }
      
      // Save user preferences
      this.saveUserPreferences();
      
      console.log('[AIPG] Specialist set successfully:', {
        name: this.currentSpecialist,
        hasData: !!this.specialistData,
        hasTechniques: !!(this.specialistData?.defaultPromptingTechniques?.length)
      });
    } else {
      console.error('[AIPG] Specialist not found:', specialistName);
      this.addAssistantMessage(`<div style="color: red;">Error: Could not find specialist "${specialistName}". Please try selecting again.</div>`);
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
    this.saveUserPreferences();
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
    if (!this.specialistData || !this.specialistData.defaultPromptingTechniques) {
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
    
    const stepData = this.specialistData.defaultPromptingTechniques.find(s => s.step === this.currentStep);
    if (!stepData) {
      console.warn('[AIPG] Step data not found for step', this.currentStep);
      return;
    }
    
    console.log('[AIPG] Displaying step', this.currentStep);
    
    // Format step message with progress indicator
    let stepMessage = `<div style="background: #e6f3ff; padding: 10px; border-radius: 5px; margin-bottom: 10px;">`;
    stepMessage += `<strong>📋 Step ${this.currentStep} of 7: ${stepData.title}</strong><br>`;
    stepMessage += `<em>${stepData.description}</em>`;
    stepMessage += `</div>`;
    
    // Add specific questions based on current step
    if (this.currentStep === 1) {
      stepMessage += `<strong>🔍 What specific topic would you like me to help you research?</strong><br><br>`;
      stepMessage += `<em>For example: "AI applications in healthcare", "Market analysis for electric vehicles", "Competitor analysis for SaaS tools"</em>`;
      this.currentQuestion = 'topic';
    } else if (this.currentStep === 2) {
      stepMessage += `<strong>📊 What type of data and sources should we focus on?</strong><br><br>`;
      stepMessage += `<em>For example: "Industry reports and statistics", "Academic research papers", "News articles and trends"</em>`;
      this.currentQuestion = 'data_sources';
    } else if (this.currentStep === 3) {
      stepMessage += `<strong>🎯 What key insights are you most interested in extracting?</strong><br><br>`;
      stepMessage += `<em>For example: "Market size and growth trends", "Key challenges and pain points", "Emerging opportunities"</em>`;
      this.currentQuestion = 'key_insights';
    } else if (this.currentStep === 4) {
      stepMessage += `<strong>🏢 Who are the main competitors or players you want to analyze?</strong><br><br>`;
      stepMessage += `<em>For example: "Google, Microsoft, Amazon in cloud services", "Tesla, BMW, Ford in electric vehicles"</em>`;
      this.currentQuestion = 'competitors';
    } else if (this.currentStep === 5) {
      stepMessage += `<strong>💡 What market gaps or opportunities are you most interested in identifying?</strong><br><br>`;
      stepMessage += `<em>For example: "Underserved customer segments", "Technological gaps", "Pricing opportunities"</em>`;
      this.currentQuestion = 'opportunities';
    } else if (this.currentStep === 6) {
      stepMessage += `<strong>📈 What type of data visualization or metrics would be most valuable?</strong><br><br>`;
      stepMessage += `<em>For example: "Market growth charts", "Competitive positioning maps", "Customer segment analysis"</em>`;
      this.currentQuestion = 'visualizations';
    } else if (this.currentStep === 7) {
      stepMessage += `<strong>📋 What format would you prefer for your final research report?</strong><br><br>`;
      stepMessage += `<em>For example: "Executive summary with bullet points", "Detailed report with charts", "Presentation-ready slides"</em>`;
      this.currentQuestion = 'report_format';
    }
    
    this.addAssistantMessage(stepMessage);
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
      this.addAssistantMessage('Please complete the current step before moving to the next one.');
      return;
    }
    
    // Move to next step
    const nextStep = this.currentStep + 1;
    const nextStepData = this.specialistData.defaultPromptingTechniques.find(s => s.step === nextStep);
    
    if (nextStepData) {
      this.currentStep = nextStep;
      this.currentQuestion = null;
      this.displayCurrentStep();
      
      // Save session progress
      this.saveSessionData();
    } else {
      // Final step reached, generate final prompt
      const finalPrompt = await this.generateFinalPrompt();
      const modelRecommendations = this.getModelRecommendations();
      
      // Create unique ID for this prompt
      const promptId = 'aipg-prompt-' + Date.now();
      
      this.addAssistantMessage(`<div style="background: #e8f5e8; padding: 20px; border-radius: 10px; border-left: 5px solid #4CAF50; margin: 15px 0;">` +
        `<strong>🎉 Congratulations! Your CRISP Framework Research Prompt is Ready:</strong><br><br>` +
        `<div style="position: relative;">` +
        `<button onclick="navigator.clipboard.writeText(document.getElementById('${promptId}').textContent).then(() => { ` +
        `const btn = event.target; btn.textContent = '✅ Copied!'; btn.style.background = '#4CAF50'; ` +
        `setTimeout(() => { btn.textContent = '📋 Copy Prompt'; btn.style.background = '#007cba'; }, 2000); })" ` +
        `style="position: absolute; top: 10px; right: 10px; background: #007cba; color: white; border: none; ` +
        `padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; z-index: 10;">📋 Copy Prompt</button>` +
        `<div id="${promptId}" style="background: white; padding: 15px; border-radius: 5px; font-family: monospace; ` +
        `font-size: 12px; white-space: pre-wrap; max-height: 400px; overflow-y: auto; border: 1px solid #ddd; ` +
        `padding-top: 45px;">${finalPrompt}</div>` +
        `</div><br>` +
        `<p><strong>✅ What to do next:</strong></p>` +
        `<ul>` +
        `<li>📋 Click the "Copy Prompt" button above to copy your research prompt</li>` +
        `<li>🤖 ${modelRecommendations}</li>` +
        `<li>🔍 Review and refine the results as needed</li>` +
        `<li>📊 Use the generated insights for your research project</li>` +
        `</ul>` +
        `</div>`);
      
      // Workflow completed
      this.workflowActive = false;
      this.currentStep = null;
      this.currentQuestion = null;
      
      // Clear session data since workflow is complete
      this.clearSessionData();
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
      
      // Check if response needs clarification before proceeding (except for Step 1 topic question which has hardcoded follow-up)
      if (!(this.currentStep === 1 && this.currentQuestion === 'topic')) {
        const needsFollowUp = await this.shouldAskFollowUp(userMessage, this.currentStep, this.currentQuestion);
        if (needsFollowUp) {
          const followUpQuestion = await this.generateFollowUpQuestion(userMessage, this.currentStep, this.currentQuestion);
          if (followUpQuestion) {
            return followUpQuestion;
          }
        }
      }
      
      // Handle specific questions for each step with LLM-powered follow-ups
      if (this.currentStep === 1 && this.currentQuestion === 'topic') {
        // Use LLM to generate intelligent follow-up question based on topic
        try {
          const llmPrompt = `The user wants to research "${userMessage}". Generate a thoughtful follow-up question about their focus areas, scope, or specific aspects they want to include/exclude. Be conversational and provide helpful examples. Respond in HTML format suitable for display in a chat interface.`;
          
          const llmResponse = await this.callLLMAPI(llmPrompt);
          
          if (llmResponse) {
            this.currentQuestion = 'focus';
            return `Excellent! I'll help you research <strong>"${userMessage}"</strong>.<br><br>${llmResponse}`;
          } else {
            // Fallback to static response
            this.currentQuestion = 'focus';
            return `Excellent! I'll help you research <strong>"${userMessage}"</strong>.<br><br>` +
                   `<strong>🎯 Do you have any specific focus areas or exclusions for this research?</strong><br><br>` +
                   `<em>For example: "Focus on enterprise solutions, exclude consumer products" or "Just say 'no' if you want broad coverage"</em>`;
          }
        } catch (error) {
          console.error('[AIPG] LLM error in follow-up question:', error);
          // Fallback to static response
          this.currentQuestion = 'focus';
          return `Excellent! I'll help you research <strong>"${userMessage}"</strong>.<br><br>` +
                 `<strong>🎯 Do you have any specific focus areas or exclusions for this research?</strong><br><br>` +
                 `<em>For example: "Focus on enterprise solutions, exclude consumer products" or "Just say 'no' if you want broad coverage"</em>`;
        }
               
      } else if (this.currentStep === 1 && this.currentQuestion === 'focus') {
        // Generate comprehensive research framework
        const topic = this.stepResponses[1].topic;
        const focus = userMessage;
        
        // Generate research components
        const researchQuestions = this.generateResearchQuestions(topic, focus);
        const scopeOutline = this.generateScopeOutline(topic, focus);
        const dataSources = this.generateDataSources(topic);
        
        // Store generated content
        this.stepResponses[1].focus = focus;
        this.stepResponses[1].researchQuestions = researchQuestions;
        this.stepResponses[1].scopeOutline = scopeOutline;
        this.stepResponses[1].dataSources = dataSources;
        
        // Mark step as complete
        this.currentQuestion = null;
        
        // Format comprehensive response
        let response = `<div style="background: #f0f8ff; padding: 15px; border-left: 4px solid #4CAF50; margin: 10px 0;">`;
        response += `<strong>✅ Step 1 Complete: Research Framework Defined</strong><br><br>`;
        response += `<strong>📝 Topic:</strong> ${topic}<br>`;
        response += `<strong>🎯 Focus:</strong> ${focus}<br><br>`;
        
        response += `<strong>❓ Key Research Questions:</strong><br><ul>`;
        researchQuestions.forEach(q => response += `<li>${q}</li>`);
        response += `</ul><br>`;
        
        response += `<strong>📊 Recommended Data Sources:</strong><br><ul>`;
        dataSources.forEach(ds => response += `<li>${ds}</li>`);
        response += `</ul><br>`;
        
        response += `<strong>🔍 Research Scope:</strong><br>${scopeOutline}`;
        response += `</div><br>`;
        
        response += `<strong>🚀 Ready for Step 2!</strong> Type "<em>Next Step</em>" to continue with data gathering guidance.`;
        
        return response;
        
      } else if (this.currentStep === 2 && this.currentQuestion === 'data_sources') {
        // Use LLM to provide intelligent response about data sources
        try {
          const topic = this.stepResponses[1]?.topic || 'your research topic';
          const llmPrompt = `The user is researching "${topic}" and mentioned these data sources: "${userMessage}". Provide a brief analysis of these sources, suggest any additional valuable sources they might have missed, and give encouragement for Step 3. Format in HTML for chat display with a completion box style.`;
          
          const llmResponse = await this.callLLMAPI(llmPrompt);
          
          this.currentQuestion = null;
          if (llmResponse) {
            return `<div style="background: #f0f8ff; padding: 15px; border-left: 4px solid #4CAF50; margin: 10px 0;">` +
                   `<strong>✅ Step 2 Complete: Data Sources Identified</strong><br><br>` +
                   `${llmResponse}` +
                   `</div><br>` +
                   `<strong>🚀 Ready for Step 3!</strong> Type "<em>Next Step</em>" to move on to insights extraction planning.`;
          } else {
            // Fallback
            return `<div style="background: #f0f8ff; padding: 15px; border-left: 4px solid #4CAF50; margin: 10px 0;">` +
                   `<strong>✅ Step 2 Complete: Data Sources Identified</strong><br><br>` +
                   `I've noted your preferred data sources: <strong>"${userMessage}"</strong><br><br>` +
                   `This will help us focus our data gathering efforts on the most relevant and reliable sources.` +
                   `</div><br>` +
                   `<strong>🚀 Ready for Step 3!</strong> Type "<em>Next Step</em>" to move on to insights extraction planning.`;
          }
        } catch (error) {
          console.error('[AIPG] LLM error in step 2 response:', error);
          this.currentQuestion = null;
          return `<div style="background: #f0f8ff; padding: 15px; border-left: 4px solid #4CAF50; margin: 10px 0;">` +
                 `<strong>✅ Step 2 Complete: Data Sources Identified</strong><br><br>` +
                 `I've noted your preferred data sources: <strong>"${userMessage}"</strong><br><br>` +
                 `This will help us focus our data gathering efforts on the most relevant and reliable sources.` +
                 `</div><br>` +
                 `<strong>🚀 Ready for Step 3!</strong> Type "<em>Next Step</em>" to move on to insights extraction planning.`;
        }
               
      } else if (this.currentStep === 3 && this.currentQuestion === 'key_insights') {
        this.currentQuestion = null;
        return `<div style="background: #f0f8ff; padding: 15px; border-left: 4px solid #4CAF50; margin: 10px 0;">` +
               `<strong>✅ Step 3 Complete: Key Insights Defined</strong><br><br>` +
               `Target insights: <strong>"${userMessage}"</strong><br><br>` +
               `I'll structure the analysis to extract these specific insights from the gathered data.` +
               `</div><br>` +
               `<strong>🚀 Ready for Step 4!</strong> Type "<em>Next Step</em>" to continue with competitor analysis planning.`;
               
      } else if (this.currentStep === 4 && this.currentQuestion === 'competitors') {
        this.currentQuestion = null;
        return `<div style="background: #f0f8ff; padding: 15px; border-left: 4px solid #4CAF50; margin: 10px 0;">` +
               `<strong>✅ Step 4 Complete: Competitors Identified</strong><br><br>` +
               `Key competitors to analyze: <strong>"${userMessage}"</strong><br><br>` +
               `I'll include SWOT analysis and competitive positioning for these players.` +
               `</div><br>` +
               `<strong>🚀 Ready for Step 5!</strong> Type "<em>Next Step</em>" to identify market opportunities.`;
               
      } else if (this.currentStep === 5 && this.currentQuestion === 'opportunities') {
        this.currentQuestion = null;
        return `<div style="background: #f0f8ff; padding: 15px; border-left: 4px solid #4CAF50; margin: 10px 0;">` +
               `<strong>✅ Step 5 Complete: Opportunity Focus Set</strong><br><br>` +
               `Target opportunities: <strong>"${userMessage}"</strong><br><br>` +
               `I'll prioritize identifying these types of market gaps and opportunities.` +
               `</div><br>` +
               `<strong>🚀 Ready for Step 6!</strong> Type "<em>Next Step</em>" to plan data visualization.`;
               
      } else if (this.currentStep === 6 && this.currentQuestion === 'visualizations') {
        this.currentQuestion = null;
        return `<div style="background: #f0f8ff; padding: 15px; border-left: 4px solid #4CAF50; margin: 10px 0;">` +
               `<strong>✅ Step 6 Complete: Visualization Requirements Set</strong><br><br>` +
               `Preferred visualizations: <strong>"${userMessage}"</strong><br><br>` +
               `I'll include guidance for creating these types of charts and visual analysis.` +
               `</div><br>` +
               `<strong>🚀 Ready for Step 7!</strong> Type "<em>Next Step</em>" for the final report formatting step.`;
               
      } else if (this.currentStep === 7 && this.currentQuestion === 'report_format') {
        this.currentQuestion = null;
        
        // Save session data before completing
        this.saveSessionData();
        
        return `<div style="background: #f0f8ff; padding: 15px; border-left: 4px solid #4CAF50; margin: 10px 0;">` +
               `<strong>✅ Step 7 Complete: Report Format Defined</strong><br><br>` +
               `Preferred format: <strong>"${userMessage}"</strong><br><br>` +
               `Perfect! I now have all the information needed to create your comprehensive research prompt.` +
               `</div><br>` +
               `<strong>🎉 All steps completed!</strong> Your CRISP Framework research prompt is being generated...`;
      }
      
      // Save session data after each response
      this.saveSessionData();
    }
    
    return null;
  }

  /**
   * Handle edit requests for workflow steps
   */
  handleEditRequest(editMatch, userMessage) {
    const stepNumber = editMatch[1];
    const field = editMatch[2];
    
    if (stepNumber) {
      const step = parseInt(stepNumber, 10);
      if (step >= 1 && step <= 7 && this.stepResponses[step]) {
        // Allow editing of specific step
        this.currentStep = step;
        this.currentQuestion = null;
        this.addAssistantMessage(`<strong>📝 Editing Step ${step}</strong><br><br>` +
          `Your previous responses for Step ${step}:<br>` +
          `${this.formatStepResponses(step)}<br><br>` +
          `What would you like to change? Please provide your updated response.`);
        this.displayCurrentStep();
        return;
      }
    } else if (field && this.currentStep === 1) {
      // Handle editing of specific fields in current step
      if (field === 'topic' && this.stepResponses[1]?.topic) {
        this.currentQuestion = 'topic';
        this.addAssistantMessage(`<strong>📝 Editing your research topic</strong><br><br>` +
          `Current topic: <em>"${this.stepResponses[1].topic}"</em><br><br>` +
          `What would you like to research instead?`);
        return;
      } else if (field === 'focus' && this.stepResponses[1]?.focus) {
        this.currentQuestion = 'focus';
        this.addAssistantMessage(`<strong>📝 Editing your research focus</strong><br><br>` +
          `Current focus: <em>"${this.stepResponses[1].focus}"</em><br><br>` +
          `What focus would you prefer for this research?`);
        return;
      }
    }
    
    // Fallback for unrecognized edit requests
    this.addAssistantMessage(`<strong>❓ Edit Request</strong><br><br>` +
      `I understand you want to make changes. Here are your options:<br><br>` +
      `• Type "<em>edit step [number]</em>" to modify a specific step (1-7)<br>` +
      `• Type "<em>edit my topic</em>" to change your research topic<br>` +
      `• Type "<em>edit my focus</em>" to change your research focus<br>` +
      `• Type "<em>start over</em>" to begin the entire workflow again`);
  }

  /**
   * Format step responses for display
   */
  formatStepResponses(step) {
    const responses = this.stepResponses[step];
    if (!responses) return 'No responses recorded';
    
    let formatted = '<ul>';
    Object.entries(responses).forEach(([key, value]) => {
      if (typeof value === 'string') {
        formatted += `<li><strong>${key}:</strong> ${value}</li>`;
      }
    });
    formatted += '</ul>';
    return formatted;
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
      `How does ${topic} impact related fields?`
    ];
    
    // Add focus-specific questions if provided
    if (focus && focus.toLowerCase() !== 'none' && focus.toLowerCase() !== 'no') {
      questions.push(`How does ${focus} specifically relate to ${topic}?`);
      questions.push(`What are the limitations of ${topic} in the context of ${focus}?`);
    }
    
    return questions;
  }

  /**
   * Generate scope outline based on topic and focus
   */
  generateScopeOutline(topic, focus) {
    // Generate scope outline based on the topic and focus
    let outline = `This research will cover the fundamental aspects of ${topic}`;
    
    if (focus && focus.toLowerCase() !== 'none' && focus.toLowerCase() !== 'no') {
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
      `Recent news articles about ${topic}`
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
    if (!step || !this.stepResponses[step]) {
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
   * Generate final prompt based on collected responses
   */
  async generateFinalPrompt() {
    // Try to use LLM to generate enhanced prompt, fall back to static if needed
    try {
      const enhancedPrompt = await this.generateLLMEnhancedPrompt();
      if (enhancedPrompt) {
        return enhancedPrompt;
      }
    } catch (error) {
      console.error('[AIPG] Error generating LLM-enhanced prompt:', error);
    }
    
    // Fallback to static prompt generation
    return this.generateStaticPrompt();
  }

  /**
   * Generate prompt enhanced by LLM based on all user responses
   */
  async generateLLMEnhancedPrompt() {
    const allResponses = this.getStepResponseSummary();
    const step1 = this.stepResponses[1] || {};
    const topic = step1.topic || 'research topic';
    
    const llmPrompt = `Create a comprehensive CRISP framework research prompt based on these user responses:

${allResponses}

Structure the prompt with these sections:
1. CONTEXT - Background and market landscape for ${topic}
2. RESEARCH - Data gathering and analysis requirements 
3. INSIGHTS - Key findings and patterns to identify
4. STRATEGY - Strategic implications and recommendations
5. PRACTICAL APPLICATION - Actionable next steps

Make it professional, specific to their research needs, and optimized for AI research assistants. Include specific deliverables and expected outputs. Format for easy copy-paste.`;

    const llmResponse = await this.callLLMAPI(llmPrompt);
    return llmResponse;
  }

  /**
   * Generate static prompt (original implementation)
   */
  generateStaticPrompt() {
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
      
    } else if (modelName.includes('openai') || modelName.includes('gpt') || modelName.includes('chatgpt')) {
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
    if (!this.currentModel) {
      return `Paste this into your preferred AI model and ensure research or analysis mode is selected if available`;
    }

    const modelName = this.currentModel.toLowerCase();
    
    if (modelName.includes('claude')) {
      return `Paste this into <strong>Claude (claude.ai)</strong> - Claude excels at structured analysis and comprehensive research. ` +
             `Consider using Claude 3.5 Sonnet or Claude 3 Opus for best results with complex research tasks.`;
    
    } else if (modelName.includes('openai') || modelName.includes('gpt') || modelName.includes('chatgpt')) {
      return `Paste this into <strong>ChatGPT (chat.openai.com)</strong> and ensure "<strong>Research & Analysis</strong>" or ` +
             `"<strong>Data Analysis</strong>" mode is selected if available. Use GPT-4 or GPT-4o for comprehensive research analysis.`;
    
    } else if (modelName.includes('google') || modelName.includes('gemini')) {
      return `Paste this into <strong>Google Gemini (gemini.google.com)</strong> - Gemini Pro performs well with structured ` +
             `research prompts. Consider using the latest Gemini Pro model for optimal research capabilities.`;
    
    } else if (modelName.includes('thinking')) {
      return `Paste this into your chosen <strong>thinking/reasoning model</strong> (like o1-preview, o1-mini, or Claude with thinking). ` +
             `These models excel at deep analysis and will provide thorough, well-reasoned research insights.`;
    
    } else if (modelName.includes('other') || modelName.includes('generic')) {
      return `Paste this into your preferred AI model. For best results, use a model optimized for research and analysis tasks, ` +
             `and enable any available research or analysis modes.`;
    
    } else {
      // Default fallback for any unrecognized model names
      return `Paste this into <strong>${this.currentModel}</strong> and ensure research or analysis mode is selected if available. ` +
             `This prompt is optimized for comprehensive research analysis.`;
    }
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
      
      // Try to send a simple message to the background script
      const response = await chrome.runtime.sendMessage({ action: 'ping' });
      
      if (response && response.status === 'ok') {
        console.log('[AIPG] Extension context is valid');
        this.extensionContextValid = true;
        this.contextRecoveryAttempts = 0; // Reset recovery attempts counter
      } else {
        console.warn('[AIPG] Extension context validation failed: Invalid response', response);
        this.extensionContextValid = false;
      }
    } catch (error) {
      console.warn('[AIPG] Extension context validation failed:', error);
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
   * Send a message to the background script with retry logic
   */
  async sendMessageWithRetry(message, callback = null) {
    // Helper function to send message with proper error handling
    const attemptSend = () => {
      return new Promise((resolve, reject) => {
        try {
          chrome.runtime.sendMessage(message, (response) => {
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
      
      // Check if extension context is valid and try recovery
      if (!this.isExtensionContextValid()) {
        console.log('[AIPG] Attempting context recovery...');
        const recovered = await this.attemptContextRecovery();
        
        if (recovered) {
          try {
            // Retry after recovery
            console.log('[AIPG] Retrying message after context recovery');
            return await attemptSend();
          } catch (retryError) {
            console.error('[AIPG] Retry after recovery failed:', retryError.message || retryError);
          }
        }
      }
      
      // If all else fails, return graceful fallback
      console.warn('[AIPG] Message sending failed, returning fallback response');
      return { error: 'Communication failed', fallback: true };
    }
  }

  /**
   * Generate a response based on user input with enhanced error handling
   */
  async generateResponse(userMessage) {
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
      this.addAssistantMessage('Please select a specialist to continue. You can choose one from the dropdown above.');
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
        this.addAssistantMessage(`<strong>🚀 Resuming workflow!</strong> Let's continue with Step ${this.currentStep}.`);
        this.displayCurrentStep();
        return;
      }
    } else if (lowerMsg === 'start over' || lowerMsg === 'restart' || lowerMsg === 'new') {
      this.clearSessionData();
      this.workflowActive = false;
      this.currentStep = null;
      this.currentQuestion = null;
      this.stepResponses = {};
      this.addAssistantMessage(`<strong>🔄 Starting fresh!</strong> Let's begin a new workflow.`);
      if (this.specialistData && this.specialistData.defaultPromptingTechniques) {
        setTimeout(() => {
          this.startWorkflow();
        }, 500);
      }
      return;
    }

    // Check for edit requests
    const editMatch = lowerMsg.match(/(?:edit|change|modify|update)\s+(?:step\s*(\d+)|my\s+(topic|focus|answer|response))/);
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
      const stepMatch = lowerMsg.match(/(?:start|step|go to|open)\s+step\s*(\d)/);
      if (stepMatch) {
        const stepNum = parseInt(stepMatch[1], 10);
        if (stepNum > 0 && stepNum <= (this.specialistData?.defaultPromptingTechniques?.length || 0)) {
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
        if (this.isStepComplete(this.currentStep) && this.currentQuestion === null) {
          // If it's the final step, generate the final prompt
          if (this.currentStep === 7) {
            const finalPrompt = await this.generateFinalPrompt();
            this.addAssistantMessage(`<strong>🎉 Your CRISP Framework Prompt:</strong><br><pre>${finalPrompt}</pre><br><p>Copy this prompt to use with your preferred AI model.</p>`);
            this.workflowActive = false;
            this.currentStep = null;
          } else {
            // Prompt to move to next step
            this.addAssistantMessage('When you\'re ready, type "Next Step" to continue.');
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
        const context = `You are a ${this.currentSpecialist} coach. The user said: "${userMessage}". ` +
                       `You can start a structured 7-step research workflow if they seem interested. ` +
                       `Available commands: "start workflow", "yes", "begin". Be conversational and helpful.`;
        
        const llmResponse = await this.callLLMAPI(context);
        
        if (llmResponse) {
          this.addAssistantMessage(llmResponse);
          
          // Check if user wants to start workflow (LLM-enhanced detection)
          if (lowerMsg.includes('yes') || lowerMsg.includes('start') || lowerMsg.includes('begin') || 
              lowerMsg.includes('workflow') || lowerMsg.includes('guide') || llmResponse.includes('starting')) {
            if (this.specialistData && this.specialistData.defaultPromptingTechniques && 
                this.specialistData.defaultPromptingTechniques.length > 0) {
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
        console.error('[AIPG] LLM error in general conversation:', error.message);
        this.addAssistantMessage(`I'm having trouble connecting to the LLM. Please check your settings (⚙️ button) or try again.`);
      }
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
   * Generate a prompt string for the LLM given current context + history.
   */
  generateLLMPrompt(history) {
    let systemPrompt =
      "You are AI Prompting Guide, an expert assistant that helps construct " +
      "high-quality prompts using the CRISP framework.\n\n";

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
      .map((h) => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`)
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
      message: userMessage.substring(0, 50) + '...'
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
            'Authorization': `Bearer ${this.llmApiKey}`
          };
          requestBody = {
            model: this.llmModel,
            messages: [
              {
                role: 'system',
                content: `You are an AI Prompting Guide assistant helping users create effective prompts using the CRISP framework. You should be conversational, helpful, and guide users through their research workflow step by step.`
              },
              {
                role: 'user',
                content: userMessage
              }
            ],
            max_tokens: 512,
            temperature: 0.7
          };
          break;

        case 'anthropic':
          headers = {
            'Content-Type': 'application/json',
            'x-api-key': this.llmApiKey,
            'anthropic-version': '2023-06-01'
          };
          requestBody = {
            model: this.llmModel || 'claude-3-sonnet-20240229',
            max_tokens: 512,
            messages: [{
              role: 'user',
              content: `You are an AI Prompting Guide assistant. Help users create effective prompts using the CRISP framework. Be conversational and guide them through research workflows.\n\nUser: ${userMessage}`
            }]
          };
          break;

        case 'google':
          headers = {
            'Content-Type': 'application/json'
          };
          requestBody = {
            contents: [{
              parts: [{
                text: `You are an AI Prompting Guide assistant helping users create effective prompts using the CRISP framework. User says: ${userMessage}`
              }]
            }],
            generationConfig: {
              maxOutputTokens: 512,
              temperature: 0.7
            }
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
        body: JSON.stringify(requestBody)
      });

      console.log('[AIPG] Response status:', response.status);
      console.log('[AIPG] Response headers:', Object.fromEntries(response.headers.entries()));

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
        return `<div style="background: #fff3cd; padding: 12px; border-left: 4px solid #ffc107; margin: 10px 0;">` +
               `<strong>💡 Let me help you be more specific:</strong><br><br>` +
               `${llmResponse}` +
               `</div>`;
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
      7: 'defining report format'
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
        (s) =>
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

    const msg = document.createElement('div');
    msg.className = 'ai-prompting-guide-message assistant';
    // SECURITY FIX: Use safe HTML rendering instead of direct innerHTML
    this.security.setInnerHTMLSafe(msg, content);
    msg.style.backgroundColor = '#f0f0f0';
    msg.style.padding = '10px';
    msg.style.borderRadius = '5px';
    msg.style.marginBottom = '10px';

    messagesContainer.appendChild(msg);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  /**
   * Display settings interface
   */
  showSettings() {
    console.log('[AIPG] showSettings called, settingsVisible:', this.settingsVisible);
    
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

      <div style="margin-top: 15px; padding: 10px; background: #e7f3ff; border-radius: 4px; font-size: 12px;">
        <strong>Getting API Keys:</strong><br>
        • <strong>OpenAI:</strong> Visit <a href="https://platform.openai.com/api-keys" target="_blank">platform.openai.com/api-keys</a><br>
        • <strong>Anthropic:</strong> Visit <a href="https://console.anthropic.com/" target="_blank">console.anthropic.com</a><br>
        • <strong>Google:</strong> Visit <a href="https://makersuite.google.com/app/apikey" target="_blank">makersuite.google.com/app/apikey</a>
      </div>
    `;

    const safeSettingsHtml = this.security.createSafeTemplate(settingsTemplate, {
      openaiSelected: this.llmProvider === 'openai' ? 'selected' : '',
      anthropicSelected: this.llmProvider === 'anthropic' ? 'selected' : '',
      googleSelected: this.llmProvider === 'google' ? 'selected' : '',
      gpt4Selected: this.llmModel === 'gpt-4' ? 'selected' : '',
      gpt35Selected: this.llmModel === 'gpt-3.5-turbo' ? 'selected' : '',
      statusColor: this.llmEnabled ? '#28a745' : '#dc3545',
      statusText: this.llmEnabled ? '✅ Connected' : '❌ Not configured'
    });

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

    if (saveButton) {
      this.addEventListenerTracked(saveButton, 'click', () => this.saveSettings(settingsId));
    }

    if (testButton) {
      this.addEventListenerTracked(testButton, 'click', () => this.testConnection());
    }

    if (closeButton) {
      this.addEventListenerTracked(closeButton, 'click', () => this.hideSettings());
    }

    // Close on overlay click
    const overlay = document.getElementById(settingsId);
    if (overlay) {
      const handleOverlayClick = (e) => {
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
      this.addAssistantMessage('<div style="color: red;">Error: Could not find settings inputs.</div>');
      return;
    }

    const provider = providerSelect.value;
    const model = modelSelect.value;
    const apiKey = apiKeyInput.value.trim();

    if (!apiKey) {
      this.addAssistantMessage('<div style="color: red;">Please enter an API key.</div>');
      return;
    }

    // Update settings
    this.llmProvider = provider;
    this.llmModel = model;
    this.llmApiKey = apiKey;
    this.updateLLMEndpoint();
    this.llmEnabled = true;

    // Save to storage
    this.saveLLMSettings();

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
      
      console.log('[AIPG] Testing with:', { provider, model, endpoint: this.llmEndpoint });
      
      const testResponse = await this.callLLMAPI('Hello, please respond with "Connection test successful!"');
      
      // Restore original settings if test fails
      if (!testResponse) {
        this.llmProvider = originalProvider;
        this.llmModel = originalModel;
        this.llmApiKey = originalApiKey;
        this.updateLLMEndpoint();
        
        alert('❌ Connection test failed: No response received from LLM');
        return;
      }
      
      if (testResponse.toLowerCase().includes('successful') || testResponse.toLowerCase().includes('test')) {
        alert('✅ Connection test successful! LLM integration is working.');
        console.log('[AIPG] Connection test successful, response:', testResponse);
      } else {
        alert('⚠️ Connection established but response was unexpected. The API key appears to work.');
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
        this.llmEndpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
        break;
    }
  }

  /* ================================================================
   *  Persistence helpers (simple localStorage wrappers)
   * ================================================================ */

  async loadUserNotes() {
    try {
      const raw = localStorage.getItem('AIPG_notes');
      this.userNotes = raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.warn('[AIPG] Failed to load notes', e);
    }
  }

  saveUserNotes() {
    try {
      localStorage.setItem('AIPG_notes', JSON.stringify(this.userNotes));
    } catch (e) {
      console.warn('[AIPG] Failed to save notes', e);
    }
  }

  saveCustomRules() {
    try {
      localStorage.setItem('AIPG_rules', JSON.stringify(this.customRules));
    } catch (e) {
      console.warn('[AIPG] Failed to save rules', e);
    }
  }

  async loadUserPreferences() {
    try {
      const raw = localStorage.getItem('AIPG_prefs');
      if (raw) {
        const prefs = JSON.parse(raw);
        this.position = prefs.position || this.position;
        this.size = prefs.size || this.size;
        this.isVisible = prefs.isVisible ?? this.isVisible;
        this.currentSpecialist = prefs.currentSpecialist || this.currentSpecialist;
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

  saveUserPreferences() {
    const prefs = {
      position: this.position,
      size: this.size,
      isVisible: this.isVisible,
      currentSpecialist: this.currentSpecialist,
      currentModel: this.currentModel
    };
    try {
      localStorage.setItem('AIPG_prefs', JSON.stringify(prefs));
      
      // Also save session data
      this.saveSessionData();
    } catch (e) {
      console.warn('[AIPG] Failed to save preferences', e);
    }
  }

  /**
   * Load session data (workflow progress and responses)
   */
  async loadSessionData() {
    try {
      const sessionKey = `AIPG_session_${this.currentSpecialist || 'default'}`;
      const raw = localStorage.getItem(sessionKey);
      if (raw) {
        const sessionData = JSON.parse(raw);
        
        // Only restore if session is less than 24 hours old
        const sessionAge = Date.now() - (sessionData.timestamp || 0);
        if (sessionAge < 24 * 60 * 60 * 1000) { // 24 hours
          this.workflowActive = sessionData.workflowActive || false;
          this.currentStep = sessionData.currentStep || null;
          this.currentQuestion = sessionData.currentQuestion || null;
          this.stepResponses = sessionData.stepResponses || {};
          
          console.log('[AIPG] Restored session data:', sessionData);
        } else {
          // Session too old, clear it
          localStorage.removeItem(sessionKey);
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
  saveSessionData() {
    try {
      const sessionKey = `AIPG_session_${this.currentSpecialist || 'default'}`;
      const sessionData = {
        timestamp: Date.now(),
        workflowActive: this.workflowActive,
        currentStep: this.currentStep,
        currentQuestion: this.currentQuestion,
        stepResponses: this.stepResponses,
        specialist: this.currentSpecialist
      };
      
      localStorage.setItem(sessionKey, JSON.stringify(sessionData));
      console.log('[AIPG] Saved session data for', this.currentSpecialist);
    } catch (e) {
      console.warn('[AIPG] Failed to save session data', e);
    }
  }

  /**
   * Clear session data (when workflow is completed or reset)
   */
  clearSessionData() {
    try {
      const sessionKey = `AIPG_session_${this.currentSpecialist || 'default'}`;
      localStorage.removeItem(sessionKey);
      console.log('[AIPG] Cleared session data for', this.currentSpecialist);
    } catch (e) {
      console.warn('[AIPG] Failed to clear session data', e);
    }
  }

  /**
   * Load LLM settings from storage
   */
  async loadLLMSettings() {
    try {
      const raw = localStorage.getItem('AIPG_llm_settings');
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
          hasApiKey: !!this.llmApiKey
        });
      }
    } catch (e) {
      console.warn('[AIPG] Failed to load LLM settings', e);
    }
  }

  /**
   * Save LLM settings to storage
   */
  saveLLMSettings() {
    try {
      const settings = {
        provider: this.llmProvider,
        model: this.llmModel,
        apiKey: this.llmApiKey,
        enabled: this.llmEnabled,
        timestamp: Date.now()
      };
      
      localStorage.setItem('AIPG_llm_settings', JSON.stringify(settings));
      console.log('[AIPG] Saved LLM settings');
    } catch (e) {
      console.warn('[AIPG] Failed to save LLM settings', e);
    }
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
