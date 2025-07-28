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
  }

  /**
   * Initialize the AI Prompting Guide
   */
  async initialize() {
    if (this.initialized) return;
    
    // Set up message listener for communication with background script
    chrome.runtime.onMessage.addListener(this.handleMessage);
    
    // Add keyboard shortcut listener
    document.addEventListener('keydown', this.handleKeyboardShortcut);
    
    // Load user preferences from storage
    await this.loadUserPreferences();
    
    this.initialized = true;
  }

  /**
   * Handle messages from background script
   */
  handleMessage(message, sender, sendResponse) {
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
   * Load specialists from storage
   */
  async loadSpecialists() {
    try {
      console.log('[AIPG] loadSpecialists() called');
      // Request specialists data from background script
      chrome.runtime.sendMessage({ action: 'getSpecialists' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('[AIPG] loadSpecialists runtime error', chrome.runtime.lastError);
          return;
        }

        console.log('[AIPG] loadSpecialists response:', response);

        if (response && response.specialists) {
          const select = document.getElementById('ai-prompting-guide-specialist');
          if (!select) {
            console.warn('[AIPG] Specialist <select> not found in DOM');
            return;
          }
          
          // Clear existing options
          select.innerHTML = '';
          
          // Add specialists as options
          response.specialists.forEach(specialist => {
            const option = document.createElement('option');
            option.value = specialist.id;
            option.textContent = `${specialist.icon} ${specialist.name}`;
            select.appendChild(option);
          });

          // Fallback if nothing was added
          if (select.options.length === 0) {
            const opt = document.createElement('option');
            opt.textContent = 'No specialists available';
            opt.disabled = true;
            select.appendChild(opt);
          }
          
          // Set selected specialist if available
          if (this.currentSpecialist) {
            select.value = this.currentSpecialist;
          } else if (response.specialists.length > 0) {
            this.changeSpecialist(response.specialists[0].id);
          }
        }
      });
    } catch (error) {
      console.error('Failed to load specialists:', error);
    }
  }

  /**
   * Load models from storage
   */
  async loadModels() {
    try {
      console.log('[AIPG] loadModels() called');
      // Request models data from background script
      chrome.runtime.sendMessage({ action: 'getModels' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('[AIPG] loadModels runtime error', chrome.runtime.lastError);
          return;
        }

        console.log('[AIPG] loadModels response:', response);

        if (response && response.models) {
          const select = document.getElementById('ai-prompting-guide-model');
          if (!select) {
            console.warn('[AIPG] Model <select> not found in DOM');
            return;
          }
          
          // Clear existing options
          select.innerHTML = '';
          
          // Add models as options
          response.models.forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;
            option.textContent = `${model.icon} ${model.name}`;
            select.appendChild(option);
          });

          // Fallback if nothing was added
          if (select.options.length === 0) {
            const opt = document.createElement('option');
            opt.textContent = 'No models available';
            opt.disabled = true;
            select.appendChild(opt);
          }
          
          // Set selected model if available
          if (this.currentModel) {
            select.value = this.currentModel;
          } else if (response.models.length > 0) {
            this.changeModel(response.models[0].id);
          }
        }
      });
    } catch (error) {
      console.error('Failed to load models:', error);
    }
  }

  /**
   * Change the current specialist
   */
  changeSpecialist(specialistId) {
    this.currentSpecialist = specialistId;
    
    // Reset workflow state
    this.currentStep = null;
    this.workflowActive = false;
    this.awaitingConfirmation = false;
    
    // Request specialist details from background script
    chrome.runtime.sendMessage({ 
      action: 'getSpecialistDetails', 
      specialistId 
    }, (response) => {
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
            // Create a 2-3 sentence description based on the specialist's description
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
        
        // Load specialist-specific notes
        this.loadUserNotes(specialistId);
      }
    });
    
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
   * Change the current model
   */
  changeModel(modelId) {
    this.currentModel = modelId;
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
   * Generate a response based on user input
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
    
    // Request response from background script
    const requestPayload = {
      action: 'generateResponse',
      specialistId: this.currentSpecialist,
      modelId: this.currentModel,
      message: userMessage,
      workflowActive: this.workflowActive,
      currentStep: this.currentStep
    };

    const TIMEOUT_MS = 8000; // 8-second safety timeout
    let responded = false;

    const timeoutId = setTimeout(() => {
      if (!responded) {
        console.error('AI Prompting Guide: background response timed-out', requestPayload);
        this.addAssistantMessage('[TIMEOUT] Sorry, the request is taking longer than expected. Please try again in a moment.');
      }
    }, TIMEOUT_MS);

    try {
      chrome.runtime.sendMessage(requestPayload, (response) => {
        responded = true;
        clearTimeout(timeoutId);

        // Catch low-level messaging errors
        if (chrome.runtime.lastError) {
          console.error('AI Prompting Guide: runtime messaging error', chrome.runtime.lastError);
          this.addAssistantMessage('[ERROR] Unable to communicate with the extension background process. Please reload the extension and try again.');
          return;
        }

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
          console.error('AI Prompting Guide: background error', response.error);
          this.addAssistantMessage(`[ERROR] ${response.error}`);
          return;
        }

        // Fallback: unknown shape
        console.warn('AI Prompting Guide: unexpected response format', response);
        this.addAssistantMessage('I apologize, but I was unable to generate a response due to an unexpected issue. Please try again.');
      });
    } catch (err) {
      responded = true;
      clearTimeout(timeoutId);
      console.error('AI Prompting Guide: sendMessage threw an exception', err);
      this.addAssistantMessage('[ERROR] A critical error occurred while sending your request. Please refresh the page or reload the extension.');
    }
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
   * Load user preferences from storage
   */
  async loadUserPreferences() {
    try {
      chrome.storage.local.get(['aiPromptingGuidePrefs'], (result) => {
        if (result.aiPromptingGuidePrefs) {
          const prefs = result.aiPromptingGuidePrefs;
          
          // Load position and size
          if (prefs.position) this.position = prefs.position;
          if (prefs.size) this.size = prefs.size;
          
          // Load specialist and model
          if (prefs.currentSpecialist) this.currentSpecialist = prefs.currentSpecialist;
          if (prefs.currentModel) this.currentModel = prefs.currentModel;
          
          // Load notes and rules
          if (prefs.userNotes) this.userNotes = prefs.userNotes;
          if (prefs.customRules) this.customRules = prefs.customRules;
        }
      });
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  }

  /**
   * Save user preferences to storage
   */
  saveUserPreferences() {
    try {
      const prefs = {
        position: this.position,
        size: this.size,
        currentSpecialist: this.currentSpecialist,
        currentModel: this.currentModel,
        userNotes: this.userNotes,
        customRules: this.customRules
      };
      
      chrome.storage.local.set({ aiPromptingGuidePrefs: prefs });
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
  }
}

// Initialize the AI Prompting Guide
const aiPromptingGuide = new AIPromptingGuide();
aiPromptingGuide.initialize();
