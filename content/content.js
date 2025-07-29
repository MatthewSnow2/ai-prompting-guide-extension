class AIPromptingGuide {
  constructor() {
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
    
    // LLM integration properties
    this.llmEnabled = false;
    this.llmApiKey = null;
    this.llmEndpoint = 'https://api.openai.com/v1/completions';
    this.llmConversationHistory = [];
    this.llmMaxHistoryLength = 10;
    this.llmContext = {};
    
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
  }

  /**
   * Initialize the AI Prompting Guide
   */
  async initialize() {
    console.log('[AIPG] Initializing AI Prompting Guide...');
    
    try {
      // Create the interface
      this.createInterface();
      
      // Load user preferences
      await this.loadUserPreferences();
      
      // Load user notes
      await this.loadUserNotes();
      
      // Load specialists and models
      await this.loadSpecialists();
      await this.loadModels();
      
      // Validate extension context
      await this.validateExtensionContext();
      
      console.log('[AIPG] AI Prompting Guide initialized successfully');
    } catch (error) {
      console.error('[AIPG] Error initializing AI Prompting Guide:', error);
    }
  }

  /**
   * Create the interface for the AI Prompting Guide
   */
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
    header.addEventListener('mousedown', this.handleDragStart);
    document.addEventListener('mousemove', this.handleDrag);
    document.addEventListener('mouseup', this.handleDragEnd);
    
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
    closeButton.addEventListener('click', this.closeInterface);
    
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
    specialistDropdown.addEventListener('change', this.handleSpecialistChange);
    
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
    modelDropdown.addEventListener('change', this.handleModelChange);
    
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
    textInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.handleSendMessage();
      }
    });
    
    // Create send button
    const sendButton = document.createElement('button');
    sendButton.innerText = 'Send';
    sendButton.style.padding = '8px 12px';
    sendButton.style.backgroundColor = '#3498db';
    sendButton.style.color = 'white';
    sendButton.style.border = 'none';
    sendButton.style.borderRadius = '4px';
    sendButton.style.cursor = 'pointer';
    sendButton.addEventListener('click', this.handleSendMessage);
    
    // Add text input and send button to input container
    inputContainer.appendChild(textInput);
    inputContainer.appendChild(sendButton);
    
    // Create clear chat button
    const clearButton = document.createElement('button');
    clearButton.innerText = 'Clear Chat';
    clearButton.style.padding = '8px 12px';
    clearButton.style.backgroundColor = '#e74c3c';
    clearButton.style.color = 'white';
    clearButton.style.border = 'none';
    clearButton.style.borderRadius = '4px';
    clearButton.style.cursor = 'pointer';
    clearButton.style.marginTop = '5px';
    clearButton.style.width = '100%';
    clearButton.addEventListener('click', this.clearChat);
    
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
    resizeHandle.addEventListener('mousedown', this.handleResizeStart);
    document.addEventListener('mousemove', this.handleResize);
    document.addEventListener('mouseup', this.handleResizeEnd);
    
    // Add all elements to container
    container.appendChild(header);
    container.appendChild(dropdownContainer);
    container.appendChild(messagesContainer);
    container.appendChild(inputContainer);
    container.appendChild(clearButton);
    container.appendChild(resizeHandle);
    
    // Add container to document
    document.body.appendChild(container);
    
    // Add welcome message
    this.addAssistantMessage('Welcome to AI Prompting Guide! Please select a specialist and a model to get started.');
  }

  /**
   * Toggle visibility of the interface
   */
  toggleVisibility() {
    this.isVisible = !this.isVisible;
    const container = document.getElementById('ai-prompting-guide-container');
    if (container) {
      container.style.display = this.isVisible ? 'flex' : 'none';
    }
    
    // Save user preferences
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
      this.addAssistantMessage('Welcome to AI Prompting Guide! Please select a specialist and a model to get started.');
      
      // Reset workflow state
      this.workflowActive = false;
      this.currentStep = null;
      this.currentQuestion = null;
      this.stepResponses = {};
      this.awaitingConfirmation = false;
      this.confirmationCallback = null;
      
      // Reset LLM conversation history
      this.llmConversationHistory = [];
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
      
      // Check if extension context is valid
      if (!this.isExtensionContextValid()) {
        console.warn('[AIPG] Extension context invalid during loadSpecialists');
        await this.attemptContextRecovery();
      }
      
      // Use the retry-enabled message sender
      const response = await this.sendMessageWithRetry({ action: 'getSpecialists' });
      
      if (response && response.specialists && response.specialists.length > 0) {
        console.log('[AIPG] Received specialists data:', response.specialists.length, 'specialists');
        this.specialists = response.specialists;
        
        // Populate specialist dropdown
        const specialistDropdown = document.getElementById('ai-prompting-guide-specialist');
        if (specialistDropdown) {
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
        } else {
          console.error('[AIPG] Specialist dropdown not found');
        }
      } else {
        console.error('[AIPG] Failed to load specialists or empty response', response);
        
        // Add fallback specialists if needed
        if (!this.specialists || this.specialists.length === 0) {
          console.warn('[AIPG] Using fallback specialists');
          this.specialists = [
            { name: 'AI Research Specialist', defaultPromptingTechniques: [] },
            { name: 'Data Analysis Expert', defaultPromptingTechniques: [] },
            { name: 'Content Creation Specialist', defaultPromptingTechniques: [] }
          ];
          
          // Populate specialist dropdown with fallbacks
          const specialistDropdown = document.getElementById('ai-prompting-guide-specialist');
          if (specialistDropdown) {
            // Clear existing options
            specialistDropdown.innerHTML = '';
            
            // Add default option
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = '-- Select Specialist --';
            specialistDropdown.appendChild(defaultOption);
            
            // Add fallback specialists
            this.specialists.forEach(specialist => {
              const option = document.createElement('option');
              option.value = specialist.name;
              option.textContent = specialist.name;
              specialistDropdown.appendChild(option);
            });
          }
        }
      }
    } catch (error) {
      console.error('[AIPG] Error loading specialists:', error);
    }
  }

  /**
   * Load models from the background script
   */
  async loadModels() {
    try {
      console.log('[AIPG] Loading models...');
      
      // Check if extension context is valid
      if (!this.isExtensionContextValid()) {
        console.warn('[AIPG] Extension context invalid during loadModels');
        await this.attemptContextRecovery();
      }
      
      // Use the retry-enabled message sender
      const response = await this.sendMessageWithRetry({ action: 'getModels' });
      
      if (response && response.models && response.models.length > 0) {
        console.log('[AIPG] Received models data:', response.models.length, 'models');
        this.models = response.models;
        
        // Populate model dropdown
        const modelDropdown = document.getElementById('ai-prompting-guide-model');
        if (modelDropdown) {
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
        } else {
          console.error('[AIPG] Model dropdown not found');
        }
      } else {
        console.error('[AIPG] Failed to load models or empty response', response);
        
        // Add fallback models if needed
        if (!this.models || this.models.length === 0) {
          console.warn('[AIPG] Using fallback models');
          this.models = [
            { name: 'GPT-4', capabilities: [] },
            { name: 'Claude 3', capabilities: [] },
            { name: 'Gemini Pro', capabilities: [] }
          ];
          
          // Populate model dropdown with fallbacks
          const modelDropdown = document.getElementById('ai-prompting-guide-model');
          if (modelDropdown) {
            // Clear existing options
            modelDropdown.innerHTML = '';
            
            // Add default option
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = '-- Select Model --';
            modelDropdown.appendChild(defaultOption);
            
            // Add fallback models
            this.models.forEach(model => {
              const option = document.createElement('option');
              option.value = model.name;
              option.textContent = model.name;
              modelDropdown.appendChild(option);
            });
          }
        }
      }
    } catch (error) {
      console.error('[AIPG] Error loading models:', error);
    }
  }

  /**
   * Handle specialist change event
   */
  async handleSpecialistChange(e) {
    const specialistName = e.target.value;
    this.currentSpecialist = specialistName;
    
    console.log('[AIPG] Specialist changed to:', specialistName);
    
    // Save user preferences
    this.saveUserPreferences();
    
    // Find specialist data
    if (specialistName) {
      const specialist = this.specialists.find(s => s.name === specialistName);
      if (specialist) {
        this.specialistData = specialist;
        
        // Check if workflow should be started
        if (specialist.defaultPromptingTechniques && specialist.defaultPromptingTechniques.length > 0) {
          // Start workflow with first step
          this.startWorkflow();
        }
      }
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
    
    // Format step message
    let stepMessage = `<strong>Step ${this.currentStep}: ${stepData.title}</strong><br>${stepData.description}<br><br>`;
    
    // Add specific questions for the first step
    if (this.currentStep === 1) {
      stepMessage += `<strong>What is the topic you want to research?</strong><br>`;
      this.currentQuestion = 'topic';
    }
    
    this.addAssistantMessage(stepMessage);
  }

  /**
   * Move to the next workflow step
   */
  moveToNextStep() {
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
    } else {
      // Final step reached, generate final prompt
      const finalPrompt = this.generateFinalPrompt();
      this.addAssistantMessage(`<strong>🎉 Your CRISP Framework Prompt:</strong><br><pre>${finalPrompt}</pre><br><p>Copy this prompt to use with your preferred AI model.</p>`);
      this.workflowActive = false;
      this.currentStep = null;
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
      
      // Handle specific questions
      if (this.currentStep === 1) {
        if (this.currentQuestion === 'topic') {
          // Store topic
          const topic = userMessage;
          
          // Ask for focus/exclusions
          this.currentQuestion = 'focus';
          return `Thank you! <strong>Do you have a specific focus or exclusions for your research on "${topic}"?</strong>`;
        } else if (this.currentQuestion === 'focus') {
          // Store focus
          const focus = userMessage;
          const topic = this.stepResponses[1].topic;
          
          // Generate research questions
          const researchQuestions = this.generateResearchQuestions(topic, focus);
          
          // Generate scope outline
          const scopeOutline = this.generateScopeOutline(topic, focus);
          
          // Generate data sources
          const dataSources = this.generateDataSources(topic);
          
          // Store generated content
          this.stepResponses[1].researchQuestions = researchQuestions;
          this.stepResponses[1].scopeOutline = scopeOutline;
          this.stepResponses[1].dataSources = dataSources;
          
          // Mark step as complete
          this.currentQuestion = null;
          
          // Format response
          let response = `<strong>Great! Based on your input, I've prepared the following research framework:</strong><br><br>`;
          response += `<strong>Topic:</strong> ${topic}<br>`;
          response += `<strong>Focus/Exclusions:</strong> ${focus}<br><br>`;
          
          response += `<strong>Research Questions:</strong><br><ul>`;
          researchQuestions.forEach(q => {
            response += `<li>${q}</li>`;
          });
          response += `</ul><br>`;
          
          response += `<strong>Scope Outline:</strong><br>${scopeOutline}<br><br>`;
          
          response += `<strong>Recommended Data Sources:</strong><br><ul>`;
          dataSources.forEach(ds => {
            response += `<li>${ds}</li>`;
          });
          response += `</ul><br>`;
          
          response += `When you're ready, type "Next Step" to continue to Step 2.`;
          
          return response;
        }
      } else if (this.currentStep === 2) {
        // Handle step 2 questions
        this.currentQuestion = null; // Mark step as complete
        return `Thank you for providing that information. I've stored your response for Step 2.<br><br>When you're ready, type "Next Step" to continue.`;
      } else if (this.currentStep === 3) {
        // Handle step 3 questions
        this.currentQuestion = null; // Mark step as complete
        return `Thank you for providing that information. I've stored your response for Step 3.<br><br>When you're ready, type "Next Step" to continue.`;
      } else if (this.currentStep === 4) {
        // Handle step 4 questions
        this.currentQuestion = null; // Mark step as complete
        return `Thank you for providing that information. I've stored your response for Step 4.<br><br>When you're ready, type "Next Step" to continue.`;
      } else if (this.currentStep === 5) {
        // Handle step 5 questions
        this.currentQuestion = null; // Mark step as complete
        return `Thank you for providing that information. I've stored your response for Step 5.<br><br>When you're ready, type "Next Step" to continue.`;
      } else if (this.currentStep === 6) {
        // Handle step 6 questions
        this.currentQuestion = null; // Mark step as complete
        return `Thank you for providing that information. I've stored your response for Step 6.<br><br>When you're ready, type "Next Step" to continue.`;
      } else if (this.currentStep === 7) {
        // Handle step 7 questions
        this.currentQuestion = null; // Mark step as complete
        return `Thank you for providing that information. I've stored your response for Step 7.<br><br>Your CRISP Framework prompt is now ready!`;
      }
    }
    
    return null;
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
  generateFinalPrompt() {
    // Get topic and focus from step 1
    const topic = this.stepResponses[1]?.topic || 'the specified topic';
    const focus = this.stepResponses[1]?.focus || '';
    
    // Generate CRISP framework prompt
    let prompt = `Act as a ${this.currentSpecialist} and provide a comprehensive analysis on ${topic}`;
    
    if (focus && focus.toLowerCase() !== 'none' && focus.toLowerCase() !== 'no') {
      prompt += ` with a focus on ${focus}`;
    }
    
    prompt += `.\n\nPlease structure your response using the CRISP framework:\n\n`;
    prompt += `Context: Provide background information on ${topic}.\n`;
    prompt += `Research: Present key findings from academic and industry sources.\n`;
    prompt += `Insights: Analyze the implications and patterns in the data.\n`;
    prompt += `Strategy: Recommend actionable steps based on the analysis.\n`;
    prompt += `Practical Application: Explain how to implement the strategy effectively.\n\n`;
    
    // Add any specific requirements from other steps
    if (this.stepResponses[2]) {
      prompt += `Additional requirements: ${Object.values(this.stepResponses[2]).join(', ')}\n\n`;
    }
    
    prompt += `Please be thorough, evidence-based, and provide specific examples where relevant.`;
    
    return prompt;
  }

  /**
   * Check if the extension context is valid
   */
  isExtensionContextValid() {
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
    try {
      // Try to send the message
      if (callback) {
        return new Promise((resolve) => {
          chrome.runtime.sendMessage(message, (response) => {
            callback(response);
            resolve(response);
          });
        });
      } else {
        return await chrome.runtime.sendMessage(message);
      }
    } catch (error) {
      console.warn('[AIPG] Error sending message:', error);
      
      // Check if extension context is valid
      if (!this.isExtensionContextValid()) {
        // Try to recover context
        const recovered = await this.attemptContextRecovery();
        
        if (recovered) {
          // Retry sending the message
          console.log('[AIPG] Retrying message after context recovery');
          if (callback) {
            return new Promise((resolve) => {
              chrome.runtime.sendMessage(message, (response) => {
                callback(response);
                resolve(response);
              });
            });
          } else {
            return await chrome.runtime.sendMessage(message);
          }
        }
      }
      
      // Return null if we couldn't recover or send the message
      return null;
    }
  }

  /**
   * Generate a response based on user input with enhanced error handling
   */
  async generateResponse(userMessage) {
    if (!this.currentSpecialist || !this.currentModel) {
      this.addAssistantMessage('Please select both a specialist and a model to continue.');
      return;
    }
    
    // First try to process with LLM if enabled
    if (this.llmEnabled) {
      try {
        const userIntent = await this.parseUserIntent(userMessage);
        console.log('[AIPG] Detected user intent:', userIntent);
        
        // Handle different intents appropriately
        if (userIntent.intent === 'workflow_navigation') {
          // Handle workflow navigation commands
          if (userIntent.action === 'next_step') {
            this.moveToNextStep();
            return;
          } else if (userIntent.action === 'go_to_step' && userIntent.step) {
            this.currentStep = userIntent.step;
            this.currentQuestion = null;
            this.displayCurrentStep();
            return;
          } else if (userIntent.action === 'show_all_steps') {
            this.showAllSteps();
            return;
          }
        } else if (userIntent.intent === 'confirmation' && this.awaitingConfirmation) {
          // Handle yes/no confirmation
          if (userIntent.confirmed) {
            this.handleWorkflowResponse('yes');
          } else {
            this.handleWorkflowResponse('no');
          }
          return;
        }
      } catch (e) {
        console.warn('[AIPG] LLM intent parsing failed:', e);
        // Continue with rule-based processing
      }
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
            const finalPrompt = this.generateFinalPrompt();
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
     * 1.  Use the local workflow engine / fallback logic first
     * ------------------------------------------------------------------ */
    if (this.workflowActive) {
      // (The earlier part of generateResponse has already handled
      //  collection & navigation.  Nothing else to do here.)
      return;
    }

    /* ------------------------------------------------------------------
     * 2.  Forward request to the LLM if enabled
     * ------------------------------------------------------------------ */
    let assistantReply = null;
    if (this.llmEnabled && this.llmApiKey) {
      try {
        assistantReply = await this.processWithLLM(userMessage);
      } catch (err) {
        console.error('[AIPG] processWithLLM failed:', err);
        assistantReply = null;
      }
    }

    /* ------------------------------------------------------------------
     * 3.  Fallback basic echo behaviour
     * ------------------------------------------------------------------ */
    if (!assistantReply) {
      assistantReply =
        "I'm sorry – I couldn't reach the language model. " +
        "Please check your network connection or API key.";
    }

    this.addAssistantMessage(assistantReply);
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
   * Very small wrapper around fetch to call the LLM endpoint.
   * NOTE:  This is deliberately generic – users can customise endpoint.
   */
  async callLLMAPI(prompt) {
    if (!this.llmEndpoint || !this.llmApiKey) return null;

    try {
      const res = await fetch(this.llmEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.llmApiKey}`
        },
        body: JSON.stringify({
          prompt,
          max_tokens: 512,
          temperature: 0.7
        })
      });

      if (!res.ok) {
        console.error('[AIPG] LLM API HTTP error', res.status);
        return null;
      }

      const data = await res.json();
      return data.choices?.[0]?.text || null;
    } catch (err) {
      console.error('[AIPG] LLM fetch failed:', err);
      return null;
    }
  }

  /**
   * Parse the LLM output to detect user intent (stub implementation)
   */
  async parseUserIntent(/* userMessage */) {
    // Minimal heuristic: not implemented – return default
    return { intent: 'unknown' };
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
    msg.innerHTML = content;
    msg.style.backgroundColor = '#f0f0f0';
    msg.style.padding = '10px';
    msg.style.borderRadius = '5px';
    msg.style.marginBottom = '10px';

    messagesContainer.appendChild(msg);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  /**
   * Display a very simple settings modal (placeholder).
   */
  showSettings() {
    alert(
      'Settings panel is under construction.\n\n' +
        'For now you can enable LLM integration via the developer console:\n' +
        'aipg.llmEnabled = true;\n' +
        "aipg.llmApiKey   = 'YOUR_KEY';\n" +
        "aipg.llmEndpoint = 'https://api.openai.com/v1/completions';"
    );
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
    } catch (e) {
      console.warn('[AIPG] Failed to save preferences', e);
    }
  }
} // END CLASS

/* ================================================================
 *  Bootstrap
 * ================================================================ */

const aipg = new AIPromptingGuide();
// Initialise as soon as possible – but wait for DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', aipg.initialize);
} else {
  aipg.initialize();
}
