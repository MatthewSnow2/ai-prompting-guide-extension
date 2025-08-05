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
    try {
      // Set up event listeners
      setupEventListeners();
      
      // Load specialists data
      await loadSpecialists();
      
      // Load user preferences
      await loadUserPreferences();
      
      // Update UI based on loaded data
      updateUI();
    } catch (error) {
      console.error('AI Prompting Guide - Initialization failed:', formatError(error));
      // Show error state in UI if possible
      const statusIndicator = document.querySelector('.status-indicator');
      const statusText = document.querySelector('.status');
      if (statusIndicator && statusText) {
        statusIndicator.style.backgroundColor = '#ea4335'; // Red
        statusText.textContent = 'Error';
      }
    }
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
      console.error(
        'AI Prompting Guide – popup: error loading specialists:',
        formatError(error)
      );
      // Create a fallback specialist if needed
      specialists = [{
        id: 'fallback-specialist',
        name: 'General Specialist',
        icon: '🧠'
      }];
      populateSpecialistDropdown();
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
      } else if (response && response.error) {
        console.error(
          'AI Prompting Guide – popup: failed to load user preferences:',
          response.error
        );
      }
    } catch (error) {
      console.error(
        'AI Prompting Guide – popup: error loading user preferences:',
        formatError(error)
      );
      // Use default preferences if loading fails
      userPreferences = {
        rememberPosition: true,
        autoOpen: false,
        globalRulesEnabled: false
      };
    }
  }
  
  /**
   * Update UI elements based on loaded data
   */
  function updateUI() {
    try {
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
    } catch (error) {
      console.error('AI Prompting Guide - Error updating UI:', formatError(error));
    }
  }
  
  /**
   * Update the status indicator based on extension state
   */
  function updateStatusIndicator() {
    const statusIndicator = document.querySelector('.status-indicator');
    const statusText = document.querySelector('.status');
    
    if (!statusIndicator || !statusText) return;
    
    try {
      // Check if the extension is active on the current page
      chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        if (chrome.runtime.lastError) {
          console.error('Error querying tabs:', chrome.runtime.lastError);
          setStatusInactive();
          return;
        }
        
        if (!tabs || !tabs[0] || !tabs[0].id) {
          console.error('No active tab found');
          setStatusInactive();
          return;
        }
        
        sendMessageToTab(tabs[0].id, { action: 'getStatus' })
          .then(response => {
            if (response && response.active) {
              statusIndicator.style.backgroundColor = '#34a853'; // Green
              statusText.textContent = 'Active';
            } else {
              statusIndicator.style.backgroundColor = '#fbbc05'; // Yellow
              statusText.textContent = 'Ready';
            }
          })
          .catch(() => {
            // Extension not initialized on this page
            setStatusInactive();
          });
      });
    } catch (error) {
      console.error('Error updating status indicator:', formatError(error));
      setStatusInactive();
    }
    
    function setStatusInactive() {
      statusIndicator.style.backgroundColor = '#ea4335'; // Red
      statusText.textContent = 'Inactive';
    }
  }
  
  /**
   * Handle toggle interface button click
   */
  function handleToggleInterface() {
    try {
      chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        if (chrome.runtime.lastError) {
          console.error('Error querying tabs:', chrome.runtime.lastError);
          return;
        }
        
        if (!tabs || !tabs[0] || !tabs[0].id) {
          console.error('No active tab found');
          return;
        }
        
        sendMessageToTab(tabs[0].id, { action: 'toggleInterface' })
          .then(response => {
            if (response && response.success) {
              // Close the popup
              window.close();
            }
          })
          .catch(() => {
            // If content script is not loaded, inject it first
            try {
              chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                files: ['content/content.js']
              })
              .then(() => {
                return chrome.scripting.insertCSS({
                  target: { tabId: tabs[0].id },
                  files: ['content/content.css']
                });
              })
              .then(() => {
                // Try again after injecting
                setTimeout(() => {
                  sendMessageToTab(tabs[0].id, { action: 'toggleInterface' })
                    .then(() => window.close())
                    .catch(err => console.error('Failed to toggle after injection:', formatError(err)));
                }, 100);
              })
              .catch(err => {
                console.error('Failed to inject content script:', formatError(err));
                // Show error message to user
                alert('Could not load extension on this page. It may be restricted by the website.');
              });
            } catch (error) {
              console.error('Error during script injection:', formatError(error));
            }
          });
      });
    } catch (error) {
      console.error('Error in toggle interface handler:', formatError(error));
    }
  }
  
  /**
   * Handle apply specialist button click
   */
  function handleApplySpecialist() {
    try {
      const selectedSpecialistId = specialistSelect.value;
      
      if (!selectedSpecialistId) {
        alert('Please select a specialist first.');
        return;
      }
      
      // Save the selected specialist as current
      currentSpecialistId = selectedSpecialistId;
      
      // Update user preferences
      userPreferences.currentSpecialist = selectedSpecialistId;
      saveUserPreferences();
      
      // Apply to active interface if open, or open interface with specialist pre-selected
      chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        if (chrome.runtime.lastError) {
          console.error('Error querying tabs:', chrome.runtime.lastError);
          return;
        }
        
        if (!tabs || !tabs[0] || !tabs[0].id) return;
        
        // Try to change specialist in existing interface
        sendMessageToTab(tabs[0].id, { 
          action: 'changeSpecialist', 
          specialistId: selectedSpecialistId 
        }).then(response => {
          if (response && response.success) {
            // Interface was already open, specialist changed
            window.close();
          } else {
            // Interface not open, open it with pre-selected specialist
            sendMessageToTab(tabs[0].id, { 
              action: 'toggleInterface',
              preSelectedSpecialist: selectedSpecialistId
            }).then(() => {
              window.close();
            }).catch(() => {
              // Content script not loaded, inject and try again
              chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                files: ['content/content.js']
              })
              .then(() => {
                return chrome.scripting.insertCSS({
                  target: { tabId: tabs[0].id },
                  files: ['content/content.css']
                });
              })
              .then(() => {
                setTimeout(() => {
                  sendMessageToTab(tabs[0].id, { 
                    action: 'toggleInterface',
                    preSelectedSpecialist: selectedSpecialistId
                  }).then(() => window.close())
                  .catch(err => console.error('Failed to toggle after injection:', formatError(err)));
                }, 100);
              })
              .catch(err => {
                console.error('Failed to inject content script:', formatError(err));
                alert('Could not load extension on this page. It may be restricted by the website.');
              });
            });
          }
        }).catch(() => {
          // Interface not open, open it with pre-selected specialist
          sendMessageToTab(tabs[0].id, { 
            action: 'toggleInterface',
            preSelectedSpecialist: selectedSpecialistId
          }).then(() => {
            window.close();
          }).catch(() => {
            // Content script not loaded, inject and try again
            chrome.scripting.executeScript({
              target: { tabId: tabs[0].id },
              files: ['content/content.js']
            })
            .then(() => {
              return chrome.scripting.insertCSS({
                target: { tabId: tabs[0].id },
                files: ['content/content.css']
              });
            })
            .then(() => {
              setTimeout(() => {
                sendMessageToTab(tabs[0].id, { 
                  action: 'toggleInterface',
                  preSelectedSpecialist: selectedSpecialistId
                }).then(() => window.close())
                .catch(err => console.error('Failed to toggle after injection:', formatError(err)));
              }, 100);
            })
            .catch(err => {
              console.error('Failed to inject content script:', formatError(err));
              alert('Could not load extension on this page. It may be restricted by the website.');
            });
          });
        });
      });
      
      // Show confirmation
      const originalText = applySpecialistButton.textContent;
      applySpecialistButton.textContent = 'Applied!';
      setTimeout(() => {
        applySpecialistButton.textContent = originalText;
      }, 1500);
    } catch (error) {
      console.error('Error applying specialist:', formatError(error));
    }
  }
  
  /**
   * Handle setting change events
   */
  function handleSettingChange(event) {
    try {
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
            if (chrome.runtime.lastError) {
              console.error('Error querying tabs:', chrome.runtime.lastError);
              return;
            }
            
            tabs.forEach(tab => {
              if (!tab || !tab.id) return;
              
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
    } catch (error) {
      console.error('Error handling setting change:', formatError(error));
    }
  }
  
  /**
   * Save user preferences to storage
   */
  function saveUserPreferences() {
    sendMessageToBackground({ 
      action: 'saveUserPreferences', 
      preferences: userPreferences 
    }).catch(error => {
      console.error('Error saving preferences:', formatError(error));
    });
  }
  
  /**
   * Handle opening options page
   */
  function handleOpenOptions(event) {
    try {
      event.preventDefault();
      alert('Advanced settings are available within the main interface. Open the interface and click the ⚙️ Settings button.');
    } catch (error) {
      console.error('Error handling options request:', formatError(error));
    }
  }
  
  /**
   * Handle opening help page
   */
  function handleOpenHelp(event) {
    try {
      event.preventDefault();
      chrome.tabs.create({ url: chrome.runtime.getURL('pages/help.html') })
        .catch(error => {
          console.error('Error opening help page:', formatError(error));
          alert('Help page is not available.');
        });
    } catch (error) {
      console.error('Error opening help page:', formatError(error));
      alert('Help page is not available.');
    }
  }
  
  /**
   * Handle opening about page
   */
  function handleOpenAbout(event) {
    try {
      event.preventDefault();
      chrome.tabs.create({ url: chrome.runtime.getURL('pages/about.html') })
        .catch(error => {
          console.error('Error opening about page:', formatError(error));
          alert('About page is not available.');
        });
    } catch (error) {
      console.error('Error opening about page:', formatError(error));
      alert('About page is not available.');
    }
  }
  
  /**
   * Utility: nicer error output (avoids "[object Object]")
   */
  function formatError(err) {
    if (!err) return 'Unknown error';
    if (typeof err === 'string') return err;
    if (err.message) return err.message;
    try {
      return JSON.stringify(err);
    } catch (_) {
      return String(err);
    }
  }
  
  /**
   * Send a message to the background script
   */
  function sendMessageToBackground(message) {
    return new Promise((resolve, reject) => {
      try {
        chrome.runtime.sendMessage(message, response => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(response || {});
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }
  
  /**
   * Send a message to a specific tab
   */
  function sendMessageToTab(tabId, message) {
    return new Promise((resolve, reject) => {
      try {
        chrome.tabs.sendMessage(tabId, message, response => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(response || {});
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }
});
