/**
 * AI Prompting Guide - Background Service Worker
 * Handles data management, message processing, and extension functionality
 */

// Constants
const STORAGE_KEYS = {
  SPECIALISTS: 'aiPromptingGuide_specialists',
  MODELS: 'aiPromptingGuide_models',
  USER_PREFERENCES: 'aiPromptingGuide_userPrefs',
  USER_NOTES: 'aiPromptingGuide_userNotes',
  CUSTOM_RULES: 'aiPromptingGuide_customRules'
};

// Default data
let specialists = [];
let models = [];

// Cache for user data
let userPreferences = {};
let userNotes = {};
let customRules = {
  global: [],
  specialist: {}
};

/**
 * Initialize the extension
 */
async function initialize() {
  console.log('AI Prompting Guide: Initializing background service worker');
  
  // Load data
  await loadSpecialistsData();
  await loadModelsData();
  await loadUserData();
  
  // Set up listeners
  setupMessageListeners();
  setupCommandListeners();
  
  console.log('AI Prompting Guide: Background service worker initialized');
}

/**
 * Load specialists data from storage or default file
 */
async function loadSpecialistsData() {
  try {
    // Try to load from storage first
    const storedData = await chrome.storage.local.get(STORAGE_KEYS.SPECIALISTS);
    
    if (storedData && storedData[STORAGE_KEYS.SPECIALISTS]) {
      specialists = storedData[STORAGE_KEYS.SPECIALISTS];
      console.log('AI Prompting Guide: Loaded specialists from storage');
    } else {
      // Load from default file
      const response = await fetch(chrome.runtime.getURL('data/specialists.json'));
      const data = await response.json();
      specialists = data.specialists;
      
      // Save to storage
      await chrome.storage.local.set({ [STORAGE_KEYS.SPECIALISTS]: specialists });
      console.log('AI Prompting Guide: Loaded specialists from default file');
    }
  } catch (error) {
    console.error('AI Prompting Guide: Failed to load specialists data', error);
    specialists = [];
  }
}

/**
 * Load models data from storage or default file
 */
async function loadModelsData() {
  try {
    // Try to load from storage first
    const storedData = await chrome.storage.local.get(STORAGE_KEYS.MODELS);
    
    if (storedData && storedData[STORAGE_KEYS.MODELS]) {
      models = storedData[STORAGE_KEYS.MODELS];
      console.log('AI Prompting Guide: Loaded models from storage');
    } else {
      // Load from default file
      const response = await fetch(chrome.runtime.getURL('data/models.json'));
      const data = await response.json();
      models = data.models;
      
      // Save to storage
      await chrome.storage.local.set({ [STORAGE_KEYS.MODELS]: models });
      console.log('AI Prompting Guide: Loaded models from default file');
    }
  } catch (error) {
    console.error('AI Prompting Guide: Failed to load models data', error);
    models = [];
  }
}

/**
 * Load user data from storage
 */
async function loadUserData() {
  try {
    const storedData = await chrome.storage.local.get([
      STORAGE_KEYS.USER_PREFERENCES,
      STORAGE_KEYS.USER_NOTES,
      STORAGE_KEYS.CUSTOM_RULES
    ]);
    
    if (storedData[STORAGE_KEYS.USER_PREFERENCES]) {
      userPreferences = storedData[STORAGE_KEYS.USER_PREFERENCES];
    }
    
    if (storedData[STORAGE_KEYS.USER_NOTES]) {
      userNotes = storedData[STORAGE_KEYS.USER_NOTES];
    }
    
    if (storedData[STORAGE_KEYS.CUSTOM_RULES]) {
      customRules = storedData[STORAGE_KEYS.CUSTOM_RULES];
    }
    
    console.log('AI Prompting Guide: Loaded user data from storage');
  } catch (error) {
    console.error('AI Prompting Guide: Failed to load user data', error);
  }
}

/**
 * Save user preferences to storage
 */
async function saveUserPreferences(prefs) {
  try {
    userPreferences = { ...userPreferences, ...prefs };
    await chrome.storage.local.set({ [STORAGE_KEYS.USER_PREFERENCES]: userPreferences });
    console.log('AI Prompting Guide: Saved user preferences');
  } catch (error) {
    console.error('AI Prompting Guide: Failed to save user preferences', error);
  }
}

/**
 * Save user notes to storage
 */
async function saveUserNotes(specialistId, notes) {
  try {
    userNotes[specialistId] = notes;
    await chrome.storage.local.set({ [STORAGE_KEYS.USER_NOTES]: userNotes });
    console.log(`AI Prompting Guide: Saved notes for specialist ${specialistId}`);
  } catch (error) {
    console.error('AI Prompting Guide: Failed to save user notes', error);
  }
}

/**
 * Save custom rules to storage
 */
async function saveCustomRules(rules, isGlobal = false, specialistId = null) {
  try {
    if (isGlobal) {
      customRules.global = rules;
    } else if (specialistId) {
      customRules.specialist[specialistId] = rules;
    }
    
    await chrome.storage.local.set({ [STORAGE_KEYS.CUSTOM_RULES]: customRules });
    console.log('AI Prompting Guide: Saved custom rules');
  } catch (error) {
    console.error('AI Prompting Guide: Failed to save custom rules', error);
  }
}

/**
 * Set up message listeners for communication with content scripts
 */
function setupMessageListeners() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('AI Prompting Guide: Received message', message);
    
    // Handle different message types
    switch (message.action) {
      case 'getSpecialists':
        sendResponse({ specialists });
        break;
        
      case 'getModels':
        sendResponse({ models });
        break;
        
      case 'getSpecialistDetails':
        const specialist = specialists.find(s => s.id === message.specialistId);
        if (specialist) {
          // Add user notes if available
          if (userNotes[message.specialistId]) {
            specialist.notes = userNotes[message.specialistId];
          }
          sendResponse({ specialist });
        } else {
          sendResponse({ error: 'Specialist not found' });
        }
        break;
        
      case 'getModelDetails':
        const model = models.find(m => m.id === message.modelId);
        if (model) {
          sendResponse({ model });
        } else {
          sendResponse({ error: 'Model not found' });
        }
        break;
        
      case 'saveUserPreferences':
        saveUserPreferences(message.preferences)
          .then(() => sendResponse({ success: true }))
          .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Keep the message channel open for async response
        
      case 'saveUserNotes':
        saveUserNotes(message.specialistId, message.notes)
          .then(() => sendResponse({ success: true }))
          .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Keep the message channel open for async response
        
      case 'saveCustomRules':
        saveCustomRules(message.rules, message.isGlobal, message.specialistId)
          .then(() => sendResponse({ success: true }))
          .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Keep the message channel open for async response
        
      case 'generateResponse':
        generateAdvice(message.specialistId, message.modelId, message.message)
          .then(response => sendResponse({ message: response }))
          .catch(error => sendResponse({ error: error.message }));
        return true; // Keep the message channel open for async response
        
      case 'toggleInterface':
        // Forward the toggle command to all tabs
        chrome.tabs.query({}, tabs => {
          tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, { action: 'toggleInterface' })
              .catch(error => console.log('Tab not ready yet:', error));
          });
        });
        sendResponse({ success: true });
        break;
        
      default:
        sendResponse({ error: 'Unknown action' });
    }
    
    return true; // Keep the message channel open for async response
  });
}

/**
 * Set up command listeners for keyboard shortcuts
 */
function setupCommandListeners() {
  chrome.commands.onCommand.addListener(command => {
    console.log('AI Prompting Guide: Command received', command);
    
    if (command === 'toggle_interface') {
      // Send toggle command to all tabs
      chrome.tabs.query({}, tabs => {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, { action: 'toggleInterface' })
            .catch(error => console.log('Tab not ready yet:', error));
        });
      });
    }
  });
}

/**
 * Generate advice based on specialist, model, and user message
 * This is a framework that will be expanded with actual intelligence
 */
async function generateAdvice(specialistId, modelId, userMessage) {
  try {
    // Find the specialist and model
    const specialist = specialists.find(s => s.id === specialistId);
    const model = models.find(m => m.id === modelId);
    
    if (!specialist || !model) {
      throw new Error('Specialist or model not found');
    }
    
    // Get applicable rules
    const applicableRules = getApplicableRules(specialistId);
    
    // This is a placeholder for the actual AI advice generation
    // In a real implementation, this would use more sophisticated logic
    // or even call an external API for AI-generated responses
    
    // For now, we'll generate a simple response based on the specialist and model
    const response = generatePlaceholderResponse(specialist, model, userMessage, applicableRules);
    
    return response;
  } catch (error) {
    console.error('AI Prompting Guide: Failed to generate advice', error);
    throw error;
  }
}

/**
 * Get applicable rules for a specialist
 */
function getApplicableRules(specialistId) {
  // Start with global rules
  let rules = [...customRules.global];
  
  // Add specialist-specific rules if available
  if (customRules.specialist[specialistId]) {
    rules = rules.concat(customRules.specialist[specialistId]);
  }
  
  return rules;
}

/**
 * Generate a placeholder response
 * This will be replaced with actual AI-driven content in the future
 */
function generatePlaceholderResponse(specialist, model, userMessage, rules) {
  // Extract keywords from user message
  const keywords = extractKeywords(userMessage);
  
  // Basic response template
  let response = `<strong>As a ${specialist.name} using ${model.name}:</strong><br><br>`;
  
  // Add prompting techniques section
  response += `<strong>Prompting Techniques:</strong><br>`;
  response += `When working with ${model.name} for ${specialist.description.toLowerCase()}, consider these techniques:<br>`;
  response += `<ul>`;
  response += `<li>Be specific about your ${specialist.name.toLowerCase()} goals</li>`;
  response += `<li>Provide context relevant to ${keywords.join(', ')}</li>`;
  response += `<li>Use clear formatting for better ${model.name} comprehension</li>`;
  response += `</ul><br>`;
  
  // Add next steps section
  response += `<strong>Next Steps:</strong><br>`;
  response += `<ol>`;
  response += `<li>Define your specific ${specialist.name.toLowerCase()} objectives</li>`;
  response += `<li>Structure your prompt with clear sections</li>`;
  response += `<li>Iterate based on initial results</li>`;
  response += `</ol><br>`;
  
  // Add applicable rules if any
  if (rules.length > 0) {
    response += `<strong>Your Custom Rules:</strong><br>`;
    response += `<ul>`;
    rules.forEach(rule => {
      response += `<li>${rule}</li>`;
    });
    response += `</ul><br>`;
  }
  
  // Add a note about the framework
  response += `<em>Note: This is a placeholder response. In the future, this will be enhanced with more specific, AI-driven advice tailored to your needs.</em>`;
  
  return response;
}

/**
 * Extract keywords from user message
 * Simple implementation for the placeholder
 */
function extractKeywords(message) {
  // Remove common words and punctuation
  const commonWords = ['a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'about', 'as', 'of', 'from'];
  
  // Split message into words, convert to lowercase, and remove common words
  const words = message.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3 && !commonWords.includes(word));
  
  // Count word frequency
  const wordFrequency = {};
  words.forEach(word => {
    wordFrequency[word] = (wordFrequency[word] || 0) + 1;
  });
  
  // Sort by frequency and get top 5
  const sortedWords = Object.keys(wordFrequency).sort((a, b) => wordFrequency[b] - wordFrequency[a]);
  return sortedWords.slice(0, 5);
}

/**
 * Handle extension installation and updates
 */
chrome.runtime.onInstalled.addListener(async details => {
  if (details.reason === 'install') {
    console.log('AI Prompting Guide: Extension installed');
    
    // Set default preferences
    const defaultPreferences = {
      position: { x: 20, y: 20 },
      size: { width: 400, height: 600 },
      currentSpecialist: null,
      currentModel: null,
      isVisible: false
    };
    
    await saveUserPreferences(defaultPreferences);
    
    // Show onboarding or welcome page
    chrome.tabs.create({
      url: chrome.runtime.getURL('popup/welcome.html')
    });
  } else if (details.reason === 'update') {
    console.log('AI Prompting Guide: Extension updated');
    
    // Refresh data from default files to get any updates
    await loadSpecialistsData();
    await loadModelsData();
  }
});

// Initialize the extension
initialize();

/**
 * Export data for testing and debugging
 */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    specialists,
    models,
    userPreferences,
    userNotes,
    customRules,
    generateAdvice,
    extractKeywords
  };
}
