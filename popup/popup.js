/**
 * AI Prompting Guide - Popup Script
 * Handles the popup interface functionality
 */

document.addEventListener('DOMContentLoaded', function() {
  // Cache DOM elements
  const toggleInterfaceButton = document.getElementById('toggleInterface');
  const specialistSelect = document.getElementById('specialistSelect');
  const applySpecialistButton = document.getElementById('applySpecialist');
  const autoOpenSetting = document.getElementById('autoOpenSetting');
  const rememberPositionSetting = document.getElementById('rememberPositionSetting');
  const globalRulesSetting = document.getElementById('globalRulesSetting');
  const openOptionsLink = document.getElementById('openOptions');
  const openHelpLink = document.getElementById('openHelp');
  const openAboutLink = document.getElementById('openAbout');
  
  // State variables
  let specialists = [];
  let currentSpecialistId = null;
  let userPreferences = {};
  
  // Initialize the popup
  initialize();
  
  /**
   * Initialize the popup interface
   */
  async function initialize() {
    // Set up event listeners
    setupEventListeners();
    
    // Load specialists data
    await loadSpecialists();
    
    // Load user preferences
    await loadUserPreferences();
    
    // Update UI based on loaded data
    updateUI();
  }
  
  /**
   * Set up event listeners for UI elements
   */
  function setupEventListeners() {
    // Toggle interface button
    toggleInterfaceButton.addEventListener('click', handleToggleInterface);
    
    // Apply specialist button
    applySpecialistButton.addEventListener('click', handleApplySpecialist);
    
    // Settings toggles
    autoOpenSetting.addEventListener('change', handleSettingChange);
    rememberPositionSetting.addEventListener('change', handleSettingChange);
    globalRulesSetting.addEventListener('change', handleSettingChange);
    
    // Links
    openOptionsLink.addEventListener('click', handleOpenOptions);
    openHelpLink.addEventListener('click', handleOpenHelp);
    openAboutLink.addEventListener('click', handleOpenAbout);
  }
  
  /**
   * Load specialists data from background script
   */
  async function loadSpecialists() {
    try {
      const response = await sendMessageToBackground({ action: 'getSpecialists' });
      
      if (response && response.specialists) {
        specialists = response.specialists;
        populateSpecialistDropdown();
      } else {
        console.error('Failed to load specialists data');
      }
    } catch (error) {
      console.error('Error loading specialists:', error);
    }
  }
  
  /**
   * Populate the specialist dropdown with options
   */
  function populateSpecialistDropdown() {
    // Clear existing options
    specialistSelect.innerHTML = '';
    
    // Add a default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = '-- Select a specialist --';
    specialistSelect.appendChild(defaultOption);
    
    // Add specialists as options
    specialists.forEach(specialist => {
      const option = document.createElement('option');
      option.value = specialist.id;
      option.textContent = `${specialist.icon} ${specialist.name}`;
      specialistSelect.appendChild(option);
    });
    
    // Set selected specialist if available
    if (currentSpecialistId) {
      specialistSelect.value = currentSpecialistId;
    }
  }
  
  /**
   * Load user preferences from storage
   */
  async function loadUserPreferences() {
    try {
      const response = await sendMessageToBackground({ action: 'getUserPreferences' });
      
      if (response && response.preferences) {
        userPreferences = response.preferences;
        currentSpecialistId = userPreferences.currentSpecialist || null;
      }
    } catch (error) {
      console.error('Error loading user preferences:', error);
    }
  }
  
  /**
   * Update UI elements based on loaded data
   */
  function updateUI() {
    // Update specialist dropdown
    if (currentSpecialistId) {
      specialistSelect.value = currentSpecialistId;
    }
    
    // Update settings toggles
    autoOpenSetting.checked = userPreferences.autoOpen || false;
    rememberPositionSetting.checked = userPreferences.rememberPosition !== false; // Default to true
    globalRulesSetting.checked = userPreferences.globalRulesEnabled || false;
    
    // Update status indicator
    updateStatusIndicator();
  }
  
  /**
   * Update the status indicator based on extension state
   */
  function updateStatusIndicator() {
    const statusIndicator = document.querySelector('.status-indicator');
    const statusText = document.querySelector('.status');
    
    // Check if the extension is active on the current page
    chrome.tabs.query({ active: true, currentWindow: true }, async tabs => {
      try {
        const response = await sendMessageToTab(tabs[0].id, { action: 'getStatus' });
        
        if (response && response.active) {
          statusIndicator.style.backgroundColor = '#34a853'; // Green
          statusText.textContent = 'Active';
        } else {
          statusIndicator.style.backgroundColor = '#fbbc05'; // Yellow
          statusText.textContent = 'Ready';
        }
      } catch (error) {
        // Extension not initialized on this page
        statusIndicator.style.backgroundColor = '#ea4335'; // Red
        statusText.textContent = 'Inactive';
      }
    });
  }
  
  /**
   * Handle toggle interface button click
   */
  function handleToggleInterface() {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      sendMessageToTab(tabs[0].id, { action: 'toggleInterface' })
        .then(response => {
          if (response && response.success) {
            // Close the popup
            window.close();
          }
        })
        .catch(error => {
          // If content script is not loaded, inject it first
          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            files: ['content/content.js']
          }, () => {
            chrome.scripting.insertCSS({
              target: { tabId: tabs[0].id },
              files: ['content/content.css']
            }, () => {
              // Try again after injecting
              setTimeout(() => {
                sendMessageToTab(tabs[0].id, { action: 'toggleInterface' })
                  .then(() => window.close());
              }, 100);
            });
          });
        });
    });
  }
  
  /**
   * Handle apply specialist button click
   */
  function handleApplySpecialist() {
    const selectedSpecialistId = specialistSelect.value;
    
    if (!selectedSpecialistId) {
      alert('Please select a specialist first.');
      return;
    }
    
    // Save the selected specialist as current
    currentSpecialistId = selectedSpecialistId;
    
    // Update user preferences
    userPreferences.currentSpecialist = currentSpecialistId;
    saveUserPreferences();
    
    // Apply to active interface if open
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      sendMessageToTab(tabs[0].id, { 
        action: 'changeSpecialist', 
        specialistId: selectedSpecialistId 
      }).catch(() => {
        // Interface not open on this page, that's okay
      });
    });
    
    // Show confirmation
    const originalText = applySpecialistButton.textContent;
    applySpecialistButton.textContent = 'Applied!';
    setTimeout(() => {
      applySpecialistButton.textContent = originalText;
    }, 1500);
  }
  
  /**
   * Handle setting change events
   */
  function handleSettingChange(event) {
    const setting = event.target;
    
    switch(setting.id) {
      case 'autoOpenSetting':
        userPreferences.autoOpen = setting.checked;
        break;
      case 'rememberPositionSetting':
        userPreferences.rememberPosition = setting.checked;
        break;
      case 'globalRulesSetting':
        userPreferences.globalRulesEnabled = setting.checked;
        // Also update in active interfaces
        chrome.tabs.query({}, tabs => {
          tabs.forEach(tab => {
            sendMessageToTab(tab.id, { 
              action: 'updateGlobalRules', 
              enabled: setting.checked 
            }).catch(() => {
              // Interface not open on this page, that's okay
            });
          });
        });
        break;
    }
    
    // Save updated preferences
    saveUserPreferences();
  }
  
  /**
   * Save user preferences to storage
   */
  function saveUserPreferences() {
    sendMessageToBackground({ 
      action: 'saveUserPreferences', 
      preferences: userPreferences 
    }).catch(error => {
      console.error('Error saving preferences:', error);
    });
  }
  
  /**
   * Handle opening options page
   */
  function handleOpenOptions(event) {
    event.preventDefault();
    chrome.runtime.openOptionsPage();
  }
  
  /**
   * Handle opening help page
   */
  function handleOpenHelp(event) {
    event.preventDefault();
    chrome.tabs.create({ url: chrome.runtime.getURL('pages/help.html') });
  }
  
  /**
   * Handle opening about page
   */
  function handleOpenAbout(event) {
    event.preventDefault();
    chrome.tabs.create({ url: chrome.runtime.getURL('pages/about.html') });
  }
  
  /**
   * Send a message to the background script
   */
  function sendMessageToBackground(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, response => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });
  }
  
  /**
   * Send a message to a specific tab
   */
  function sendMessageToTab(tabId, message) {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, message, response => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });
  }
});
