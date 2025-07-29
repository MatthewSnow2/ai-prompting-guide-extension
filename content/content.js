/**
 * AI Prompting Guide - Content Script
 * Injects the AI Prompting Guide interface into web pages
 */

class AIPromptingGuide {
  constructor() {
    this.isVisible = false;
    this.position = { x: 20, y: 20 };
    this.size = { width: 400, height: 600 };
    this.isDragging = false;
    this.isResizing = false;
    this.dragOffset = { x: 0, y: 0 };
    this.currentSpecialist = null;
    this.currentModel = null;
    this.userNotes = {};
    this.customRules = {
      global: [],
      specialist: {}
    };
    this.container = null;
    this.initialized = false;

    // Workflow state tracking
    this.currentStep = null;
    this.workflowActive = false;
    this.awaitingConfirmation = false;
    this.specialistData = null;

    // Error handling and retry state
    this.retryCount = 0;
    this.maxRetries = 3;
    this.backoffTime = 500; // Start with 500ms backoff
    this.pendingRetries = {};
    this.fallbackSpecialists = null;
    this.fallbackModels = null;

    // Bind methods to this context
    this.initialize = this.initialize.bind(this);
    this.injectInterface = this.injectInterface.bind(this);
    this.toggleInterface = this.toggleInterface.bind(this);
    this.handleKeyboardShortcut = this.handleKeyboardShortcut.bind(this);
    this.startDragging = this.startDragging.bind(this);
    this.stopDragging = this.stopDragging.bind(this);
    this.onDrag = this.onDrag.bind(this);
    this.startResizing = this.startResizing.bind(this);
    this.stopResizing = this.stopResizing.bind(this);
    this.onResize = this.onResize.bind(this);
    this.loadSpecialists = this.loadSpecialists.bind(this);
    this.loadModels = this.loadModels.bind(this);
    this.changeSpecialist = this.changeSpecialist.bind(this);
    this.changeModel = this.changeModel.bind(this);
    this.saveUserPreferences = this.saveUserPreferences.bind(this);
    this.loadUserPreferences = this.loadUserPreferences.bind(this);
    this.handleMessage = this.handleMessage.bind(this);
    this.saveUserNotes = this.saveUserNotes.bind(this);
    this.saveCustomRules = this.saveCustomRules.bind(this);
    this.closeInterface = this.closeInterface.bind(this);
    this.clearMessages = this.clearMessages.bind(this);
    this.startWorkflow = this.startWorkflow.bind(this);
    this.moveToNextStep = this.moveToNextStep.bind(this);
    this.displayCurrentStep = this.displayCurrentStep.bind(this);
    this.createYesNoButtons = this.createYesNoButtons.bind(this);
    this.handleWorkflowResponse = this.handleWorkflowResponse.bind(this);
    
    // New error handling methods
    this.isExtensionContextValid = this.isExtensionContextValid.bind(this);
    this.sendMessageWithRetry = this.sendMessageWithRetry.bind(this);
    this.loadFallbackData = this.loadFallbackData.bind(this);
    this.retryWithBackoff = this.retryWithBackoff.bind(this);
  }

  /**
   * Check if the extension context is valid for messaging
   * @returns {boolean} True if the context is valid
   */
  isExtensionContextValid() {
    try {
      // Check if chrome.runtime is defined and has an id
      if (!chrome || !chrome.runtime || !chrome.runtime.id) {
        console.warn('[AIPG] Extension context is invalid - chrome.runtime missing or no ID');
        return false;
      }
      
      // Check if we can access chrome.runtime.getURL which fails when context is invalid
      const testUrl = chrome.runtime.getURL('');
      if (!testUrl) {
        console.warn('[AIPG] Extension context is invalid - cannot get extension URL');
        return false;
      }
      
      return true;
    } catch (err) {
      console.error('[AIPG] Extension context check failed:', err);
      return false;
    }
  }

  /**
   * Send a message with retry logic
   * @param {Object} message - The message to send
   * @param {Function} callback - Callback function for the response
   * @param {string} operationName - Name of operation for logging
   * @param {Function} fallbackFn - Function to call if all retries fail
   */
  sendMessageWithRetry(message, callback, operationName, fallbackFn) {
    const messageId = `${operationName}-${Date.now()}`;
    let retryCount = 0;
    const maxRetries = this.maxRetries;
    let backoffTime = this.backoffTime;
    
    console.log(`[AIPG] Sending message for ${operationName}:`, message);
    
    const attemptSend = () => {
      // Check if extension context is valid before sending
      if (!this.isExtensionContextValid()) {
        console.error(`[AIPG] Cannot send message for ${operationName} - invalid extension context`);
        if (fallbackFn) {
          console.log(`[AIPG] Using fallback for ${operationName}`);
          fallbackFn();
        }
        return;
      }
      
      try {
        chrome.runtime.sendMessage(message, (response) => {
          // Check for runtime errors
          if (chrome.runtime.lastError) {
            const error = chrome.runtime.lastError;
            console.error(`[AIPG] ${operationName} attempt ${retryCount + 1}/${maxRetries + 1} failed:`, error);
            
            // Retry with exponential backoff if we haven't hit max retries
            if (retryCount < maxRetries) {
              retryCount++;
              const nextBackoff = backoffTime * Math.pow(1.5, retryCount);
              console.log(`[AIPG] Retrying ${operationName} in ${nextBackoff}ms (attempt ${retryCount + 1}/${maxRetries + 1})`);
              
              setTimeout(attemptSend, nextBackoff);
              return;
            } else {
              console.error(`[AIPG] ${operationName} failed after ${maxRetries + 1} attempts`);
              if (fallbackFn) {
                console.log(`[AIPG] Using fallback for ${operationName}`);
                fallbackFn();
              }
              
              // Call callback with error
              if (callback) {
                callback({ error: `Communication failed after ${maxRetries + 1} attempts` });
              }
            }
            return;
          }
          
          // Success path
          console.log(`[AIPG] ${operationName} successful:`, response);
          if (callback) {
            callback(response);
          }
        });
      } catch (err) {
        console.error(`[AIPG] Exception in ${operationName}:`, err);
        if (retryCount < maxRetries) {
          retryCount++;
          const nextBackoff = backoffTime * Math.pow(1.5, retryCount);
          console.log(`[AIPG] Retrying ${operationName} in ${nextBackoff}ms (attempt ${retryCount + 1}/${maxRetries + 1})`);
          
          setTimeout(attemptSend, nextBackoff);
        } else {
          console.error(`[AIPG] ${operationName} failed after ${maxRetries + 1} attempts`);
          if (fallbackFn) {
            console.log(`[AIPG] Using fallback for ${operationName}`);
            fallbackFn();
          }
          
          // Call callback with error
          if (callback) {
            callback({ error: `Communication failed after ${maxRetries + 1} attempts: ${err.message}` });
          }
        }
      }
    };
    
    // Start the first attempt
    attemptSend();
  }

  /**
   * Load fallback data for specialists and models
   */
  async loadFallbackData() {
    console.log('[AIPG] Loading fallback data');
    
    // Define minimal fallback specialists
    this.fallbackSpecialists = [
      {
        id: 'research-analysis',
        name: 'Research & Analysis',
        description: 'Conducting research and analyzing information',
        icon: '🔬',
        welcomeMessage: 'I can help with research and analysis tasks.',
        placeholderText: 'What would you like to research?',
        defaultPromptingTechniques: [
          {
            step: 1,
            title: 'Define Research Scope & Questions',
            description: 'Clearly define what you want to research and specific questions to answer',
            output: 'A clear research brief with main questions'
          },
          {
            step: 2,
            title: 'Information Gathering',
            description: 'Collect relevant information from reliable sources',
            output: 'Raw data and information from multiple sources'
          },
          {
            step: 3,
            title: 'Organize & Structure Data',
            description: 'Organize collected information into logical categories',
            output: 'Structured data ready for analysis'
          },
          {
            step: 4,
            title: 'Analysis & Patterns',
            description: 'Analyze data to identify patterns, trends, and insights',
            output: 'Key findings and patterns from the data'
          },
          {
            step: 5,
            title: 'Critical Evaluation',
            description: 'Critically evaluate findings, considering limitations and biases',
            output: 'Evaluated insights with context and limitations'
          },
          {
            step: 6,
            title: 'Synthesize Findings',
            description: 'Combine insights into coherent conclusions',
            output: 'Synthesized conclusions addressing research questions'
          },
          {
            step: 7,
            title: 'Recommendations & Next Steps',
            description: 'Provide actionable recommendations based on findings',
            output: 'Actionable recommendations and next steps'
          }
        ]
      },
      {
        id: 'generic',
        name: 'General Assistant',
        description: 'General purpose assistance',
        icon: '🧠',
        welcomeMessage: 'I can help with various tasks.',
        placeholderText: 'How can I help you today?'
      }
    ];
    
    // Define minimal fallback models
    this.fallbackModels = [
      {
        id: 'gpt-4',
        name: 'GPT-4',
        description: 'Advanced language model with strong reasoning',
        icon: '🧠'
      },
      {
        id: 'claude',
        name: 'Claude',
        description: 'Helpful, harmless, and honest assistant',
        icon: '🤖'
      }
    ];
    
    // Populate dropdowns with fallback data
    this.populateSpecialistDropdown(this.fallbackSpecialists);
    this.populateModelDropdown(this.fallbackModels);
    
    // Show fallback message to user
    this.addAssistantMessage(
      '<strong>⚠️ Notice:</strong> Unable to connect to extension background service. ' +
      'Using limited offline mode with basic functionality. ' +
      'Please try reloading the extension from the Extensions page.'
    );
  }

  /**
   * Populate specialist dropdown with provided data
   */
  populateSpecialistDropdown(specialists) {
    const select = document.getElementById('ai-prompting-guide-specialist');
    if (!select) {
      console.warn('[AIPG] Specialist <select> not found in DOM');
      return;
    }
    
    // Clear existing options
    select.innerHTML = '';
    
    // Add specialists as options
    specialists.forEach(specialist => {
      const option = document.createElement('option');
      option.value = specialist.id;
      option.textContent = `${specialist.icon} ${specialist.name}`;
      select.appendChild(option);
    });
    
    // Set selected specialist if available
    if (this.currentSpecialist) {
      select.value = this.currentSpecialist;
    } else if (specialists.length > 0) {
      this.specialistData = specialists[0];
      this.currentSpecialist = specialists[0].id;
      select.value = specialists[0].id;
    }
  }

  /**
   * Populate model dropdown with provided data
   */
  populateModelDropdown(models) {
    const select = document.getElementById('ai-prompting-guide-model');
    if (!select) {
      console.warn('[AIPG] Model <select> not found in DOM');
      return;
    }
    
    // Clear existing options
    select.innerHTML = '';
    
    // Add models as options
    models.forEach(model => {
      const option = document.createElement('option');
      option.value = model.id;
      option.textContent = `${model.icon} ${model.name}`;
      select.appendChild(option);
    });
    
    // Set selected model if available
    if (this.currentModel) {
      select.value = this.currentModel;
    } else if (models.length > 0) {
      this.currentModel = models[0].id;
      select.value = models[0].id;
    }
  }

  /**
   * Retry an operation with exponential backoff
   */
  retryWithBackoff(operation, params, retryCount = 0) {
    const maxRetries = this.maxRetries;
    const backoffTime = this.backoffTime * Math.pow(1.5, retryCount);
    
    if (retryCount >= maxRetries) {
      console.error(`[AIPG] Operation failed after ${maxRetries} retries`);
      return;
    }
    
    console.log(`[AIPG] Retrying operation in ${backoffTime}ms (attempt ${retryCount + 1}/${maxRetries})`);
    
    setTimeout(() => {
      try {
        operation(...params);
      } catch (err) {
        console.error('[AIPG] Retry attempt failed:', err);
        this.retryWithBackoff(operation, params, retryCount + 1);
      }
    }, backoffTime);
  }

  /**
   * Initialize the AI Prompting Guide
   */
  async initialize() {
    if (this.initialized) return;
    
    console.log('[AIPG] Initializing AI Prompting Guide');
    
    // Check if extension context is valid
    if (!this.isExtensionContextValid()) {
      console.error('[AIPG] Extension context is invalid during initialization');
      // We'll continue anyway and handle errors in individual operations
    }
    
    // Set up message listener for communication with background script
    try {
      chrome.runtime.onMessage.addListener(this.handleMessage);
    } catch (err) {
      console.error('[AIPG] Failed to set up message listener:', err);
    }
    
    // Add keyboard shortcut listener
    document.addEventListener('keydown', this.handleKeyboardShortcut);
    
    // Load user preferences from storage
    await this.loadUserPreferences();
    
    this.initialized = true;
    console.log('[AIPG] Initialization complete');
  }

  /**
   * Handle messages from background script
   */
  handleMessage(message, sender, sendResponse) {
    console.log('[AIPG] Received message:', message);
    
    switch (message.action) {
      case 'toggleInterface':
        this.toggleInterface();
        sendResponse({ success: true });
        break;
      case 'updateSpecialists':
        this.loadSpecialists();
        sendResponse({ success: true });
        break;
      case 'updateModels':
        this.loadModels();
        sendResponse({ success: true });
        break;
      default:
        sendResponse({ success: false, error: 'Unknown action' });
    }
    return true; // Keep the message channel open for async responses
  }

  /**
   * Handle keyboard shortcuts
   * Alt + P  →  Toggle AI Prompting Guide visibility
   */
  handleKeyboardShortcut(event) {
    // Alt+P to toggle interface visibility
    if (event.altKey && event.key === 'p') {
      this.toggleInterface();
      event.preventDefault();
    }
  }

  /**
   * Inject the interface into the page
   */
  injectInterface() {
    // Prevent duplicate injection
    if (document.getElementById('ai-prompting-guide-container')) return;
    
    // Create main container
    this.container = document.createElement('div');
    this.container.id = 'ai-prompting-guide-container';
    this.container.className = 'ai-prompting-guide';
    
    // Set position and size
    this.container.style.position = 'fixed';
    this.container.style.top = `${this.position.y}px`;
    this.container.style.left = `${this.position.x}px`;
    this.container.style.width = `${this.size.width}px`;
    this.container.style.height = `${this.size.height}px`;
    this.container.style.zIndex = '9999';
    this.container.style.backgroundColor = '#ffffff';
    this.container.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.2)';
    this.container.style.borderRadius = '8px';
    this.container.style.overflow = 'hidden';
    this.container.style.display = 'flex';
    this.container.style.flexDirection = 'column';
    
    // Create header with drag handle
    const header = document.createElement('div');
    header.className = 'ai-prompting-guide-header';
    header.style.padding = '10px';
    header.style.backgroundColor = '#f0f0f0';
    header.style.borderBottom = '1px solid #ddd';
    header.style.cursor = 'move';
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    
    // Add title
    const title = document.createElement('div');
    title.textContent = 'AI Prompting Guide';
    title.style.fontWeight = 'bold';
    
    // Add controls
    const controls = document.createElement('div');
    
    // Add settings button
    const settingsButton = document.createElement('button');
    settingsButton.innerHTML = '⚙️';
    settingsButton.style.background = 'none';
    settingsButton.style.border = 'none';
    settingsButton.style.cursor = 'pointer';
    settingsButton.style.marginRight = '5px';
    settingsButton.title = 'Settings';
    settingsButton.onclick = () => this.showSettings();
    
    // Add close button
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '✕';
    closeButton.style.background = 'none';
    closeButton.style.border = 'none';
    closeButton.style.cursor = 'pointer';
    closeButton.title = 'Close';
    closeButton.onclick = () => this.closeInterface();
    
    controls.appendChild(settingsButton);
    controls.appendChild(closeButton);
    header.appendChild(title);
    header.appendChild(controls);
    
    // Make header draggable
    header.addEventListener('mousedown', this.startDragging);
    
    // Create content area
    const content = document.createElement('div');
    content.className = 'ai-prompting-guide-content';
    content.style.padding = '10px';
    content.style.flexGrow = '1';
    content.style.overflow = 'auto';
    content.style.display = 'flex';
    content.style.flexDirection = 'column';
    
    // Create selection area
    const selectionArea = document.createElement('div');
    selectionArea.className = 'ai-prompting-guide-selection';
    selectionArea.style.marginBottom = '10px';
    
    // Create specialist selector
    const specialistLabel = document.createElement('label');
    specialistLabel.textContent = 'Specialist:';
    specialistLabel.style.display = 'block';
    specialistLabel.style.marginBottom = '5px';
    
    const specialistSelect = document.createElement('select');
    specialistSelect.id = 'ai-prompting-guide-specialist';
    specialistSelect.style.width = '100%';
    specialistSelect.style.padding = '5px';
    specialistSelect.style.marginBottom = '10px';
    specialistSelect.addEventListener('change', () => this.changeSpecialist(specialistSelect.value));
    
    // Create model selector
    const modelLabel = document.createElement('label');
    modelLabel.textContent = 'Model:';
    modelLabel.style.display = 'block';
    modelLabel.style.marginBottom = '5px';
    
    const modelSelect = document.createElement('select');
    modelSelect.id = 'ai-prompting-guide-model';
    modelSelect.style.width = '100%';
    modelSelect.style.padding = '5px';
    modelSelect.addEventListener('change', () => this.changeModel(modelSelect.value));
    
    selectionArea.appendChild(specialistLabel);
    selectionArea.appendChild(specialistSelect);
    selectionArea.appendChild(modelLabel);
    selectionArea.appendChild(modelSelect);
    
    // Create chat area
    const chatArea = document.createElement('div');
    chatArea.className = 'ai-prompting-guide-chat';
    chatArea.style.flexGrow = '1';
    chatArea.style.display = 'flex';
    chatArea.style.flexDirection = 'column';
    chatArea.style.border = '1px solid #ddd';
    chatArea.style.borderRadius = '5px';
    chatArea.style.overflow = 'hidden';
    
    // Create messages container
    const messagesContainer = document.createElement('div');
    messagesContainer.id = 'ai-prompting-guide-messages';
    messagesContainer.style.flexGrow = '1';
    messagesContainer.style.padding = '10px';
    messagesContainer.style.overflowY = 'auto';
    
    // Create welcome message
    const welcomeMessage = document.createElement('div');
    welcomeMessage.className = 'ai-prompting-guide-message assistant';
    welcomeMessage.innerHTML = 'Welcome to AI Prompting Guide! Please select a specialist to get started.';
    welcomeMessage.style.backgroundColor = '#f0f0f0';
    welcomeMessage.style.padding = '10px';
    welcomeMessage.style.borderRadius = '5px';
    welcomeMessage.style.marginBottom = '10px';
    
    messagesContainer.appendChild(welcomeMessage);
    
    // ---- CLEAR CHAT STRIP -----------------------------------------
    const clearStrip = document.createElement('div');
    clearStrip.style.textAlign = 'center';
    clearStrip.style.borderTop = '1px solid #eee';
    clearStrip.style.borderBottom = '1px solid #eee';
    clearStrip.style.padding = '4px 0';
    clearStrip.style.backgroundColor = '#fafafa';

    const clearBtn = document.createElement('button');
    clearBtn.textContent = 'Clear Chat';
    clearBtn.style.fontSize = '12px';
    clearBtn.style.padding = '2px 8px';
    clearBtn.style.backgroundColor = '#e0e0e0';
    clearBtn.style.border = '1px solid #ccc';
    clearBtn.style.borderRadius = '4px';
    clearBtn.style.cursor = 'pointer';
    clearBtn.onclick = () => this.clearMessages();

    clearStrip.appendChild(clearBtn);
    // ---------------------------------------------------------------

    // Create input area
    const inputArea = document.createElement('div');
    inputArea.className = 'ai-prompting-guide-input';
    inputArea.style.display = 'flex';
    inputArea.style.padding = '10px';
    inputArea.style.borderTop = '1px solid #ddd';
    
    // Create text input
    const textInput = document.createElement('textarea');
    textInput.id = 'ai-prompting-guide-input';
    textInput.placeholder = 'Type your question here...';
    textInput.style.flexGrow = '1';
    textInput.style.padding = '8px';
    textInput.style.borderRadius = '4px';
    textInput.style.border = '1px solid #ddd';
    textInput.style.resize = 'none';
    textInput.style.minHeight = '60px';
    textInput.style.marginRight = '10px';
    
    // Create send button
    const sendButton = document.createElement('button');
    sendButton.textContent = 'Send';
    sendButton.style.padding = '8px 15px';
    sendButton.style.backgroundColor = '#4285f4';
    sendButton.style.color = 'white';
    sendButton.style.border = 'none';
    sendButton.style.borderRadius = '4px';
    sendButton.style.cursor = 'pointer';
    sendButton.onclick = () => this.sendMessage();
    
    inputArea.appendChild(textInput);
    inputArea.appendChild(sendButton);
    
    chatArea.appendChild(messagesContainer);
    chatArea.appendChild(clearStrip);   // << new clear button strip
    chatArea.appendChild(inputArea);
    
    content.appendChild(selectionArea);
    content.appendChild(chatArea);
    
    // Create resize handle
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'ai-prompting-guide-resize';
    resizeHandle.style.position = 'absolute';
    resizeHandle.style.right = '0';
    resizeHandle.style.bottom = '0';
    resizeHandle.style.width = '15px';
    resizeHandle.style.height = '15px';
    resizeHandle.style.cursor = 'nwse-resize';
    resizeHandle.style.backgroundImage = 'linear-gradient(135deg, transparent 50%, #ddd 50%, #ddd 100%)';
    resizeHandle.addEventListener('mousedown', this.startResizing);
    
    // Assemble the interface
    this.container.appendChild(header);
    this.container.appendChild(content);
    this.container.appendChild(resizeHandle);
    
    // Add to page
    document.body.appendChild(this.container);
    
    // Load specialists and models
    this.loadSpecialists();
    this.loadModels();
    
    // Add global event listeners for drag and resize
    document.addEventListener('mousemove', this.onDrag);
    document.addEventListener('mouseup', this.stopDragging);
    document.addEventListener('mousemove', this.onResize);
    document.addEventListener('mouseup', this.stopResizing);
  }

  /**
   * Clear all chat messages and restore welcome bubble
   */
  clearMessages() {
    const messagesContainer = document.getElementById('ai-prompting-guide-messages');
    if (!messagesContainer) return;

    messagesContainer.innerHTML = '';

    // Reset workflow state
    this.currentStep = null;
    this.workflowActive = false;
    this.awaitingConfirmation = false;

    // If a specialist is selected, reload its welcome; otherwise generic
    if (this.currentSpecialist) {
      // Re-use existing helper to rebuild welcome / placeholder
      this.changeSpecialist(this.currentSpecialist);
    } else {
      const welcome = document.createElement('div');
      welcome.className = 'ai-prompting-guide-message assistant';
      welcome.innerHTML = 'Welcome to AI Prompting Guide! Please select a specialist to get started.';
      welcome.style.backgroundColor = '#f0f0f0';
      welcome.style.padding = '10px';
      welcome.style.borderRadius = '5px';
      welcome.style.marginBottom = '10px';
      messagesContainer.appendChild(welcome);
    }
  }

  /**
   * Toggle interface visibility (show / hide)
   */
  toggleInterface() {
    if (!this.container) {
      this.injectInterface();
      this.isVisible = true;
    } else {
      this.isVisible = !this.isVisible;
      this.container.style.display = this.isVisible ? 'flex' : 'none';
    }
    
    // Save visibility state
    this.saveUserPreferences();
  }

  /**
   * Completely close and remove the interface from the DOM.
   * Users can reopen it via the toolbar icon or Alt + P shortcut.
   */
  closeInterface() {
    if (!this.container) return;

    // Remove DOM node
    this.container.remove();
    this.container = null;

    // Update state
    this.isVisible = false;

    // Persist state so it remains closed on refresh
    this.saveUserPreferences();
  }

  /**
   * Start dragging the interface
   */
  startDragging(e) {
    if (e.target.closest('.ai-prompting-guide-header')) {
      this.isDragging = true;
      this.dragOffset.x = e.clientX - this.position.x;
      this.dragOffset.y = e.clientY - this.position.y;
      e.preventDefault();
    }
  }

  /**
   * Handle dragging motion
   */
  onDrag(e) {
    if (!this.isDragging) return;
    
    this.position.x = e.clientX - this.dragOffset.x;
    this.position.y = e.clientY - this.dragOffset.y;
    
    // Ensure the window stays within viewport bounds
    this.position.x = Math.max(0, Math.min(window.innerWidth - this.size.width, this.position.x));
    this.position.y = Math.max(0, Math.min(window.innerHeight - this.size.height, this.position.y));
    
    if (this.container) {
      this.container.style.left = `${this.position.x}px`;
      this.container.style.top = `${this.position.y}px`;
    }
  }

  /**
   * Stop dragging
   */
  stopDragging() {
    if (this.isDragging) {
      this.isDragging = false;
      this.saveUserPreferences();
    }
  }

  /**
   * Start resizing the interface
   */
  startResizing(e) {
    this.isResizing = true;
    e.preventDefault();
  }

  /**
   * Handle resizing motion
   */
  onResize(e) {
    if (!this.isResizing) return;
    
    // Calculate new size
    const newWidth = e.clientX - this.position.x;
    const newHeight = e.clientY - this.position.y;
    
    // Set minimum size
    this.size.width = Math.max(300, newWidth);
    this.size.height = Math.max(400, newHeight);
    
    if (this.container) {
      this.container.style.width = `${this.size.width}px`;
      this.container.style.height = `${this.size.height}px`;
    }
  }

  /**
   * Stop resizing
   */
  stopResizing() {
    if (this.isResizing) {
      this.isResizing = false;
      this.saveUserPreferences();
    }
  }

  /**
   * Load specialists from storage with enhanced error handling
   */
  async loadSpecialists() {
    console.log('[AIPG] loadSpecialists() called');
    
    // Check if extension context is valid
    if (!this.isExtensionContextValid()) {
      console.warn('[AIPG] Extension context invalid during loadSpecialists, using fallback data');
      if (this.fallbackSpecialists) {
        this.populateSpecialistDropdown(this.fallbackSpecialists);
      } else {
        await this.loadFallbackData();
      }
      return;
    }
    
    try {
      // Use the retry-enabled message sender
      this.sendMessageWithRetry(
        { action: 'getSpecialists' },
        (response) => {
          if (response && response.specialists && response.specialists.length > 0) {
            console.log('[AIPG] Received specialists data:', response.specialists.length, 'specialists');
            this.populateSpecialistDropdown(response.specialists);
          } else if (response && response.error) {
            console.error('[AIPG] Error loading specialists:', response.error);
            this.addAssistantMessage(`<strong>Error:</strong> Failed to load specialists: ${response.error}`);
            if (this.fallbackSpecialists) {
              this.populateSpecialistDropdown(this.fallbackSpecialists);
            }
          } else {
            console.warn('[AIPG] No specialists data in response');
            if (this.fallbackSpecialists) {
              this.populateSpecialistDropdown(this.fallbackSpecialists);
            } else {
              this.loadFallbackData();
            }
          }
        },
        'loadSpecialists',
        async () => {
          // Fallback function
          if (!this.fallbackSpecialists) {
            await this.loadFallbackData();
          } else {
            this.populateSpecialistDropdown(this.fallbackSpecialists);
          }
        }
      );
    } catch (error) {
      console.error('[AIPG] Exception in loadSpecialists:', error);
      if (!this.fallbackSpecialists) {
        await this.loadFallbackData();
      } else {
        this.populateSpecialistDropdown(this.fallbackSpecialists);
      }
    }
  }

  /**
   * Load models from storage with enhanced error handling
   */
  async loadModels() {
    console.log('[AIPG] loadModels() called');
    
    // Check if extension context is valid
    if (!this.isExtensionContextValid()) {
      console.warn('[AIPG] Extension context invalid during loadModels, using fallback data');
      if (this.fallbackModels) {
        this.populateModelDropdown(this.fallbackModels);
      } else {
        await this.loadFallbackData();
      }
      return;
    }
    
    try {
      // Use the retry-enabled message sender
      this.sendMessageWithRetry(
        { action: 'getModels' },
        (response) => {
          if (response && response.models && response.models.length > 0) {
            console.log('[AIPG] Received models data:', response.models.length, 'models');
            this.populateModelDropdown(response.models);
          } else if (response && response.error) {
            console.error('[AIPG] Error loading models:', response.error);
            this.addAssistantMessage(`<strong>Error:</strong> Failed to load models: ${response.error}`);
            if (this.fallbackModels) {
              this.populateModelDropdown(this.fallbackModels);
            }
          } else {
            console.warn('[AIPG] No models data in response');
            if (this.fallbackModels) {
              this.populateModelDropdown(this.fallbackModels);
            } else {
              this.loadFallbackData();
            }
          }
        },
        'loadModels',
        async () => {
          // Fallback function
          if (!this.fallbackModels) {
            await this.loadFallbackData();
          } else {
            this.populateModelDropdown(this.fallbackModels);
          }
        }
      );
    } catch (error) {
      console.error('[AIPG] Exception in loadModels:', error);
      if (!this.fallbackModels) {
        await this.loadFallbackData();
      } else {
        this.populateModelDropdown(this.fallbackModels);
      }
    }
  }

  /**
   * Change the current specialist with enhanced error handling
   */
  changeSpecialist(specialistId) {
    this.currentSpecialist = specialistId;
    
    // Reset workflow state
    this.currentStep = null;
    this.workflowActive = false;
    this.awaitingConfirmation = false;
    
    console.log('[AIPG] Changing specialist to:', specialistId);
    
    // Check if we already have fallback data for this specialist
    if (!this.isExtensionContextValid() && this.fallbackSpecialists) {
      const specialist = this.fallbackSpecialists.find(s => s.id === specialistId);
      if (specialist) {
        console.log('[AIPG] Using fallback data for specialist:', specialistId);
        this.specialistData = specialist;
        
        // Update messages container with specialist description
        const messagesContainer = document.getElementById('ai-prompting-guide-messages');
        if (messagesContainer) {
          messagesContainer.innerHTML = '';
          
          // Create a brief description of the specialist
          let description = '';
          if (specialist.description) {
            description = `<p><strong>${specialist.name}</strong> helps you with ${specialist.description.toLowerCase()}. 
                          This specialist can guide you through a structured workflow to achieve the best results. 
                          Would you like to begin working with this specialist?</p>`;
          } else {
            description = `<p>Would you like to begin working with the ${specialist.name} specialist?</p>`;
          }
          
          // Add the description and Yes/No buttons
          this.addAssistantMessage(description);
          this.createYesNoButtons();
          
          // Mark that we're awaiting confirmation
          this.awaitingConfirmation = true;
        }
        
        // Update input placeholder
        const textInput = document.getElementById('ai-prompting-guide-input');
        if (textInput) {
          textInput.placeholder = specialist.placeholderText || 'Type your question here...';
        }
        
        this.saveUserPreferences();
        return;
      }
    }
    
    // Request specialist details with retry logic
    this.sendMessageWithRetry(
      { action: 'getSpecialistDetails', specialistId },
      (response) => {
        if (response && response.specialist) {
          const specialist = response.specialist;
          this.specialistData = specialist;
          
          // Update messages container with specialist description
          const messagesContainer = document.getElementById('ai-prompting-guide-messages');
          if (messagesContainer) {
            messagesContainer.innerHTML = '';
            
            // Create a brief description of the specialist
            let description = '';
            if (specialist.description) {
              description = `<p><strong>${specialist.name}</strong> helps you with ${specialist.description.toLowerCase()}. 
                            This specialist can guide you through a structured workflow to achieve the best results. 
                            Would you like to begin working with this specialist?</p>`;
            } else {
              description = `<p>Would you like to begin working with the ${specialist.name} specialist?</p>`;
            }
            
            // Add the description and Yes/No buttons
            this.addAssistantMessage(description);
            this.createYesNoButtons();
            
            // Mark that we're awaiting confirmation
            this.awaitingConfirmation = true;
          }
          
          // Update input placeholder
          const textInput = document.getElementById('ai-prompting-guide-input');
          if (textInput) {
            textInput.placeholder = specialist.placeholderText || 'Type your question here...';
          }
        } else if (response && response.error) {
          console.error('[AIPG] Error getting specialist details:', response.error);
          this.addAssistantMessage(`<strong>Error:</strong> Failed to load specialist details: ${response.error}`);
        }
      },
      'getSpecialistDetails',
      async () => {
        // Fallback when we can't get specialist details
        if (!this.fallbackSpecialists) {
          await this.loadFallbackData();
        } else {
          const specialist = this.fallbackSpecialists.find(s => s.id === specialistId) || this.fallbackSpecialists[0];
          this.specialistData = specialist;
          
          const messagesContainer = document.getElementById('ai-prompting-guide-messages');
          if (messagesContainer) {
            messagesContainer.innerHTML = '';
            
            this.addAssistantMessage(
              `<strong>⚠️ Notice:</strong> Unable to load full details for the ${specialist.name} specialist. ` +
              `Using limited offline data. Some features may be unavailable.`
            );
            
            let description = '';
            if (specialist.description) {
              description = `<p><strong>${specialist.name}</strong> helps you with ${specialist.description.toLowerCase()}. 
                            Would you like to begin working with this specialist?</p>`;
            } else {
              description = `<p>Would you like to begin working with the ${specialist.name} specialist?</p>`;
            }
            
            this.addAssistantMessage(description);
            this.createYesNoButtons();
            this.awaitingConfirmation = true;
          }
        }
      }
    );
    
    this.saveUserPreferences();
  }

  /**
   * Create Yes/No buttons for user confirmation
   */
  createYesNoButtons() {
    const messagesContainer = document.getElementById('ai-prompting-guide-messages');
    if (!messagesContainer) return;
    
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'center';
    buttonContainer.style.gap = '10px';
    buttonContainer.style.marginTop = '10px';
    
    const yesButton = document.createElement('button');
    yesButton.textContent = 'Yes';
    yesButton.style.padding = '8px 20px';
    yesButton.style.backgroundColor = '#4285f4';
    yesButton.style.color = 'white';
    yesButton.style.border = 'none';
    yesButton.style.borderRadius = '4px';
    yesButton.style.cursor = 'pointer';
    yesButton.onclick = () => this.handleWorkflowResponse('yes');
    
    const noButton = document.createElement('button');
    noButton.textContent = 'No';
    noButton.style.padding = '8px 20px';
    noButton.style.backgroundColor = '#f1f1f1';
    noButton.style.color = '#333';
    noButton.style.border = '1px solid #ccc';
    noButton.style.borderRadius = '4px';
    noButton.style.cursor = 'pointer';
    noButton.onclick = () => this.handleWorkflowResponse('no');
    
    buttonContainer.appendChild(yesButton);
    buttonContainer.appendChild(noButton);
    
    const messageElement = document.createElement('div');
    messageElement.className = 'ai-prompting-guide-message assistant';
    messageElement.style.backgroundColor = '#f0f0f0';
    messageElement.style.padding = '10px';
    messageElement.style.borderRadius = '5px';
    messageElement.style.marginBottom = '10px';
    messageElement.appendChild(buttonContainer);
    
    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  /**
   * Handle user response to workflow confirmation
   */
  handleWorkflowResponse(response) {
    if (!this.awaitingConfirmation) return;
    
    this.awaitingConfirmation = false;
    
    if (response === 'yes') {
      // User confirmed, start the workflow
      this.addAssistantMessage(`Great! Let's get started with the ${this.specialistData?.name || 'selected'} workflow.`);
      this.startWorkflow();
    } else {
      // User declined, show a message
      this.addAssistantMessage('No problem. Feel free to select another specialist or ask any questions.');
    }
  }

  /**
   * Start the specialist workflow
   */
  startWorkflow() {
    if (!this.specialistData) return;
    
    this.workflowActive = true;
    this.currentStep = 1;
    
    // Display the first step
    this.displayCurrentStep();
  }

  /**
   * Move to the next step in the workflow
   */
  moveToNextStep() {
    if (!this.workflowActive || !this.specialistData) return;
    
    const totalSteps = this.specialistData.defaultPromptingTechniques?.length || 0;
    
    if (this.currentStep < totalSteps) {
      this.currentStep++;
      this.displayCurrentStep();
    } else {
      // Workflow complete
      this.addAssistantMessage('Congratulations! You have completed all steps in this workflow.');
      this.workflowActive = false;
      this.currentStep = null;
    }
  }

  /**
   * Display the current step in the workflow
   */
  displayCurrentStep() {
    if (!this.workflowActive || !this.specialistData || !this.currentStep) return;
    
    const steps = this.specialistData.defaultPromptingTechniques || [];
    if (steps.length === 0) {
      this.addAssistantMessage('This specialist does not have a defined workflow.');
      this.workflowActive = false;
      return;
    }
    
    // Find the current step
    const step = steps.find(s => s.step === this.currentStep);
    if (!step) {
      this.addAssistantMessage('Unable to find the current step in the workflow.');
      return;
    }
    
    // Find the prompt template for this step
    let promptTemplate = '';
    if (this.specialistData.commonPatterns) {
      const pattern = this.specialistData.commonPatterns.find(p => p.step === this.currentStep);
      if (pattern && pattern.promptTemplate) {
        promptTemplate = pattern.promptTemplate;
      }
    }
    
    // Build the step display
    let html = `<strong>Step ${step.step}/${steps.length} – ${step.title}</strong><br>`;
    html += `<em>${step.description}</em><br><br>`;
    html += `<strong>Expected Output:</strong> ${step.output}<br><br>`;
    
    if (promptTemplate) {
      html += `<strong>Prompt Template:</strong><br><code>${promptTemplate}</code><br><br>`;
      html += 'Replace placeholders (e.g. <code>[topic]</code>) with your specifics.';
    } else {
      html += 'Please provide details for this step.';
    }
    
    this.addAssistantMessage(html);
  }

  /**
   * Change the current model with enhanced error handling
   */
  changeModel(modelId) {
    this.currentModel = modelId;
    console.log('[AIPG] Changed model to:', modelId);
    this.saveUserPreferences();
  }

  /**
   * Send a message
   */
  sendMessage() {
    const textInput = document.getElementById('ai-prompting-guide-input');
    if (!textInput || !textInput.value.trim()) return;
    
    const userMessage = textInput.value.trim();
    textInput.value = '';
    
    // Add user message to chat
    const messagesContainer = document.getElementById('ai-prompting-guide-messages');
    if (messagesContainer) {
      const messageElement = document.createElement('div');
      messageElement.className = 'ai-prompting-guide-message user';
      messageElement.textContent = userMessage;
      messageElement.style.backgroundColor = '#e6f2ff';
      messageElement.style.padding = '10px';
      messageElement.style.borderRadius = '5px';
      messageElement.style.marginBottom = '10px';
      messageElement.style.alignSelf = 'flex-end';
      
      messagesContainer.appendChild(messageElement);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
      
      // Process the message and generate a response
      this.generateResponse(userMessage);
    }
  }

  /**
   * Generate a response based on user input with enhanced error handling
   */
  generateResponse(userMessage) {
    if (!this.currentSpecialist || !this.currentModel) {
      this.addAssistantMessage('Please select both a specialist and a model to continue.');
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
    
    // Check for workflow navigation commands
    if (this.workflowActive) {
      const lowerMsg = userMessage.toLowerCase();
      
      // Check for "next step" command
      if (lowerMsg === 'next step' || lowerMsg === 'next') {
        this.moveToNextStep();
        return;
      }
      
      // Check for specific step navigation
      const stepMatch = lowerMsg.match(/(?:start|step|go to|open)\s+step\s*(\d)/);
      if (stepMatch) {
        const stepNum = parseInt(stepMatch[1], 10);
        if (stepNum > 0 && stepNum <= (this.specialistData?.defaultPromptingTechniques?.length || 0)) {
          this.currentStep = stepNum;
          this.displayCurrentStep();
          return;
        }
      }
      
      // Check for "show all steps" command
      if (lowerMsg === 'show all steps' || lowerMsg === 'show steps') {
        this.showAllSteps();
        return;
      }
    }
    
    // Check if extension context is valid
    if (!this.isExtensionContextValid()) {
      console.warn('[AIPG] Extension context invalid during generateResponse');
      this.addAssistantMessage(
        '<strong>⚠️ Notice:</strong> Unable to communicate with the extension background service. ' +
        'The extension may need to be reloaded. Please try refreshing the page or reloading the extension.'
      );
      return;
    }
    
    // Request response from background script with retry logic
    const requestPayload = {
      action: 'generateResponse',
      specialistId: this.currentSpecialist,
      modelId: this.currentModel,
      message: userMessage,
      workflowActive: this.workflowActive,
      currentStep: this.currentStep
    };

    const TIMEOUT_MS = 8000; // 8-second safety timeout
    
    console.log('[AIPG] Sending generateResponse request:', requestPayload);
    
    this.sendMessageWithRetry(
      requestPayload,
      (response) => {
        // Normal success path
        if (response && response.message) {
          this.addAssistantMessage(response.message);
          
          // If the workflow is active, provide a "Next Step" prompt
          if (this.workflowActive) {
            const steps = this.specialistData?.defaultPromptingTechniques || [];
            if (this.currentStep < steps.length) {
              this.addAssistantMessage('When you\'re ready, type "Next Step" to continue to the next step.');
            }
          }
          return;
        }

        // Background script returned an explicit error
        if (response && response.error) {
          console.error('[AIPG] Background error in generateResponse:', response.error);
          this.addAssistantMessage(`<strong>Error:</strong> ${response.error}`);
          return;
        }

        // Fallback: unknown shape
        console.warn('[AIPG] Unexpected response format in generateResponse:', response);
        this.addAssistantMessage('I apologize, but I was unable to generate a response due to an unexpected issue. Please try again.');
      },
      'generateResponse',
      () => {
        // Fallback when communication fails completely
        console.error('[AIPG] Communication failed in generateResponse');
        this.addAssistantMessage(
          '<strong>⚠️ Communication Error:</strong> Unable to reach the extension background service. ' +
          'This could be due to the extension being in an invalid state. Please try reloading the extension from the Extensions page ' +
          '(chrome://extensions) and refreshing this page.'
        );
        
        // If we're in a workflow, provide a basic response
        if (this.workflowActive && this.specialistData) {
          const stepInfo = this.specialistData.defaultPromptingTechniques?.find(s => s.step === this.currentStep);
          if (stepInfo) {
            this.addAssistantMessage(
              `<strong>Offline Guidance:</strong> For ${stepInfo.title}, try to ${stepInfo.description.toLowerCase()}. ` +
              `When ready, type "Next Step" to continue to step ${this.currentStep + 1}.`
            );
          }
        }
      }
    );
  }

  /**
   * Show all steps in the current workflow
   */
  showAllSteps() {
    if (!this.specialistData) return;
    
    const steps = this.specialistData.defaultPromptingTechniques || [];
    if (steps.length === 0) {
      this.addAssistantMessage('This specialist does not have a defined workflow.');
      return;
    }
    
    let html = `<strong>${this.specialistData.icon || '🔍'} ${this.specialistData.name} Workflow</strong><br><br>`;
    html += '<ol>';
    steps.forEach(step => {
      html += `<li><strong>${step.title}</strong>: ${step.description}</li>`;
    });
    html += '</ol>';
    html += '<br>Type "Start Step 1", "Next Step", "Previous Step" or "Step X" to navigate.';
    
    this.addAssistantMessage(html);
  }

  /**
   * Add an assistant message to the chat
   */
  addAssistantMessage(message) {
    const messagesContainer = document.getElementById('ai-prompting-guide-messages');
    if (messagesContainer) {
      const messageElement = document.createElement('div');
      messageElement.className = 'ai-prompting-guide-message assistant';
      messageElement.innerHTML = message;
      messageElement.style.backgroundColor = '#f0f0f0';
      messageElement.style.padding = '10px';
      messageElement.style.borderRadius = '5px';
      messageElement.style.marginBottom = '10px';
      
      messagesContainer.appendChild(messageElement);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  /**
   * Show settings panel
   */
  showSettings() {
    // Implementation for settings panel
    alert('Settings panel will be implemented in a future update.');
  }

  /**
   * Load user notes for a specific specialist
   */
  loadUserNotes(specialistId) {
    // Implementation for loading user notes
    // This will be expanded in future updates
  }

  /**
   * Save user notes
   */
  saveUserNotes() {
    // Implementation for saving user notes
    // This will be expanded in future updates
  }

  /**
   * Save custom rules
   */
  saveCustomRules() {
    // Implementation for saving custom rules
    // This will be expanded in future updates
  }

  /**
   * Load user preferences from storage with enhanced error handling
   */
  async loadUserPreferences() {
    try {
      console.log('[AIPG] Loading user preferences');
      
      // Check if extension context is valid
      if (!this.isExtensionContextValid()) {
        console.warn('[AIPG] Extension context invalid during loadUserPreferences');
        return; // Use defaults
      }
      
      chrome.storage.local.get(['aiPromptingGuidePrefs'], (result) => {
        if (chrome.runtime.lastError) {
          console.error('[AIPG] Error loading preferences:', chrome.runtime.lastError);
          return;
        }
        
        if (result.aiPromptingGuidePrefs) {
          const prefs = result.aiPromptingGuidePrefs;
          console.log('[AIPG] Loaded user preferences:', prefs);
          
          // Load position and size
          if (prefs.position) this.position = prefs.position;
          if (prefs.size) this.size = prefs.size;
          
          // Load specialist and model
          if (prefs.currentSpecialist) this.currentSpecialist = prefs.currentSpecialist;
          if (prefs.currentModel) this.currentModel = prefs.currentModel;
          
          // Load notes and rules
          if (prefs.userNotes) this.userNotes = prefs.userNotes;
          if (prefs.customRules) this.customRules = prefs.customRules;
        } else {
          console.log('[AIPG] No saved preferences found, using defaults');
        }
      });
    } catch (error) {
      console.error('[AIPG] Failed to load preferences:', error);
    }
  }

  /**
   * Save user preferences to storage with enhanced error handling
   */
  saveUserPreferences() {
    try {
      // Check if extension context is valid
      if (!this.isExtensionContextValid()) {
        console.warn('[AIPG] Extension context invalid during saveUserPreferences');
        return;
      }
      
      const prefs = {
        position: this.position,
        size: this.size,
        currentSpecialist: this.currentSpecialist,
        currentModel: this.currentModel,
        userNotes: this.userNotes,
        customRules: this.customRules
      };
      
      console.log('[AIPG] Saving user preferences:', prefs);
      
      chrome.storage.local.set({ aiPromptingGuidePrefs: prefs }, () => {
        if (chrome.runtime.lastError) {
          console.error('[AIPG] Error saving preferences:', chrome.runtime.lastError);
        } else {
          console.log('[AIPG] User preferences saved successfully');
        }
      });
    } catch (error) {
      console.error('[AIPG] Failed to save preferences:', error);
    }
  }
}

// Initialize the AI Prompting Guide
const aiPromptingGuide = new AIPromptingGuide();
aiPromptingGuide.initialize();
