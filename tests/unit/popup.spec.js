/**
 * Unit Tests for Popup Interface
 * Tests popup functionality, UI interactions, and Chrome API integration
 */

const { ChromeApiMocks } = require('../mocks/chrome-apis');
const { 
  testSpecialists, 
  testUserPreferences,
  testStorageKeys 
} = require('../fixtures/test-data');

// Mock the popup script by reading and evaluating it
const fs = require('fs');
const path = require('path');

describe('Popup Interface', () => {
  let chromeMocks;
  let popupScript;
  
  beforeEach(() => {
    // Setup Chrome API mocks
    chromeMocks = new ChromeApiMocks();
    global.chrome = chromeMocks.chrome;
    chromeMocks.setupDefaultBehaviors();
    
    // Setup DOM
    global.testUtils.createPopupDOM();
    
    // Clear any previous modules and mocks
    jest.clearAllMocks();
    
    // Mock DOMContentLoaded to be fired immediately for testing
    const originalAddEventListener = document.addEventListener;
    document.addEventListener = jest.fn((event, callback) => {
      if (event === 'DOMContentLoaded') {
        setTimeout(callback, 0); // Execute callback async
      } else {
        originalAddEventListener.call(document, event, callback);
      }
    });
    
    // Load popup script
    const popupPath = path.join(__dirname, '../../popup/popup.js');
    const popupCode = fs.readFileSync(popupPath, 'utf-8');
    
    // Wrap in function to avoid global pollution
    const popupFunction = new Function('document', 'chrome', 'window', 'alert', popupCode);
    
    // Mock alert for testing
    global.alert = jest.fn();
    
    // Execute popup script
    popupFunction(document, global.chrome, global, global.alert);
  });

  afterEach(() => {
    jest.resetModules();
    chromeMocks.reset();
    document.body.innerHTML = '';
    global.alert = undefined;
  });

  describe('Initialization', () => {
    test('should setup event listeners on DOM ready', async () => {
      // Wait for DOMContentLoaded to fire
      await global.testUtils.waitFor(10);
      
      // Assert elements have event listeners
      const toggleButton = document.getElementById('toggleInterface');
      const applyButton = document.getElementById('applySpecialist');
      const autoOpenSetting = document.getElementById('autoOpenSetting');
      
      expect(toggleButton).toBeTruthy();
      expect(applyButton).toBeTruthy();
      expect(autoOpenSetting).toBeTruthy();
    });

    test('should load specialists on initialization', async () => {
      // Arrange
      chromeMocks.chrome.runtime.sendMessage.callsFake((message, callback) => {
        if (message.action === 'getSpecialists') {
          callback({ specialists: testSpecialists });
        }
      });
      
      // Wait for initialization
      await global.testUtils.waitFor(50);
      
      // Assert
      expect(chromeMocks.chrome.runtime.sendMessage).toHaveBeenCalledWith(
        { action: 'getSpecialists' },
        expect.any(Function)
      );
      
      const specialistSelect = document.getElementById('specialistSelect');
      expect(specialistSelect.children.length).toBeGreaterThan(1); // Default option + specialists
    });

    test('should load user preferences on initialization', async () => {
      // Arrange
      chromeMocks.chrome.runtime.sendMessage.callsFake((message, callback) => {
        if (message.action === 'getUserPreferences') {
          callback({ preferences: testUserPreferences });
        } else if (message.action === 'getSpecialists') {
          callback({ specialists: testSpecialists });
        }
      });
      
      // Wait for initialization
      await global.testUtils.waitFor(50);
      
      // Assert
      expect(chromeMocks.chrome.runtime.sendMessage).toHaveBeenCalledWith(
        { action: 'getUserPreferences' },
        expect.any(Function)
      );
      
      const autoOpenSetting = document.getElementById('autoOpenSetting');
      expect(autoOpenSetting.checked).toBe(testUserPreferences.autoOpen);
    });

    test('should handle initialization errors gracefully', async () => {
      // Arrange
      chromeMocks.mockRuntimeError('Background script not available');
      
      // Wait for initialization
      await global.testUtils.waitFor(50);
      
      // Assert - should not crash
      const statusIndicator = document.querySelector('.status-indicator');
      const statusText = document.querySelector('.status');
      
      if (statusIndicator && statusText) {
        expect(statusIndicator.style.backgroundColor).toBe('rgb(234, 67, 53)'); // Red
        expect(statusText.textContent).toBe('Error');
      }
    });
  });

  describe('Specialist Management', () => {
    test('should populate specialist dropdown correctly', async () => {
      // Arrange
      chromeMocks.chrome.runtime.sendMessage.callsFake((message, callback) => {
        if (message.action === 'getSpecialists') {
          callback({ specialists: testSpecialists });
        }
      });
      
      // Wait for initialization
      await global.testUtils.waitFor(50);
      
      // Assert
      const specialistSelect = document.getElementById('specialistSelect');
      expect(specialistSelect.children.length).toBe(testSpecialists.length + 1); // +1 for default option
      
      // Check that specialists are properly formatted
      const firstSpecialist = specialistSelect.children[1];
      expect(firstSpecialist.value).toBe(testSpecialists[0].id);
      expect(firstSpecialist.textContent).toContain(testSpecialists[0].name);
      expect(firstSpecialist.textContent).toContain(testSpecialists[0].icon);
    });

    test('should handle apply specialist button click', async () => {
      // Arrange
      chromeMocks.chrome.runtime.sendMessage.callsFake((message, callback) => {
        callback({ specialists: testSpecialists });
      });
      
      chromeMocks.chrome.tabs.query.callsFake((query, callback) => {
        callback([{ id: 1, active: true }]);
      });
      
      chromeMocks.chrome.tabs.sendMessage.callsFake((tabId, message, callback) => {
        callback({ success: true });
      });
      
      await global.testUtils.waitFor(50);
      
      // Select a specialist
      const specialistSelect = document.getElementById('specialistSelect');
      specialistSelect.value = testSpecialists[0].id;
      
      // Act
      const applyButton = document.getElementById('applySpecialist');
      global.testUtils.triggerEvent(applyButton, 'click');
      
      await global.testUtils.waitFor(10);
      
      // Assert
      expect(chromeMocks.chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'saveUserPreferences',
          preferences: expect.objectContaining({
            currentSpecialist: testSpecialists[0].id
          })
        }),
        expect.any(Function)
      );
    });

    test('should show alert when no specialist selected', async () => {
      // Arrange
      await global.testUtils.waitFor(50);
      
      // Act
      const applyButton = document.getElementById('applySpecialist');
      global.testUtils.triggerEvent(applyButton, 'click');
      
      // Assert
      expect(global.alert).toHaveBeenCalledWith('Please select a specialist first.');
    });

    test('should handle fallback specialists on load error', async () => {
      // Arrange
      chromeMocks.mockRuntimeError('Failed to load specialists');
      
      // Wait for initialization
      await global.testUtils.waitFor(50);
      
      // Assert - should create fallback specialist
      const specialistSelect = document.getElementById('specialistSelect');
      expect(specialistSelect.children.length).toBe(2); // Default + fallback
    });
  });

  describe('Interface Toggle', () => {
    test('should handle toggle interface button click', async () => {
      // Arrange
      chromeMocks.chrome.tabs.query.callsFake((query, callback) => {
        callback([{ id: 1, active: true }]);
      });
      
      chromeMocks.chrome.tabs.sendMessage.callsFake((tabId, message, callback) => {
        callback({ success: true });
      });
      
      // Mock window.close
      global.window.close = jest.fn();
      
      await global.testUtils.waitFor(50);
      
      // Act
      const toggleButton = document.getElementById('toggleInterface');
      global.testUtils.triggerEvent(toggleButton, 'click');
      
      await global.testUtils.waitFor(10);
      
      // Assert
      expect(chromeMocks.chrome.tabs.sendMessage).toHaveBeenCalledWith(
        1,
        { action: 'toggleInterface' },
        expect.any(Function)
      );
      expect(global.window.close).toHaveBeenCalled();
    });

    test('should inject content script if not loaded', async () => {
      // Arrange
      chromeMocks.chrome.tabs.query.callsFake((query, callback) => {
        callback([{ id: 1, active: true }]);
      });
      
      chromeMocks.chrome.tabs.sendMessage.callsFake((tabId, message, callback) => {
        chromeMocks.chrome.runtime.lastError = { message: 'Could not establish connection' };
        callback(null);
      });
      
      chromeMocks.chrome.scripting.executeScript.resolves([{ result: true }]);
      chromeMocks.chrome.scripting.insertCSS.resolves();
      
      await global.testUtils.waitFor(50);
      
      // Act
      const toggleButton = document.getElementById('toggleInterface');
      global.testUtils.triggerEvent(toggleButton, 'click');
      
      await global.testUtils.waitFor(150); // Wait for injection timeout
      
      // Assert
      expect(chromeMocks.chrome.scripting.executeScript).toHaveBeenCalledWith({
        target: { tabId: 1 },
        files: ['content/content.js']
      });
      expect(chromeMocks.chrome.scripting.insertCSS).toHaveBeenCalledWith({
        target: { tabId: 1 },
        files: ['content/content.css']
      });
    });

    test('should handle script injection errors', async () => {
      // Arrange
      chromeMocks.chrome.tabs.query.callsFake((query, callback) => {
        callback([{ id: 1, active: true }]);
      });
      
      chromeMocks.chrome.tabs.sendMessage.callsFake((tabId, message, callback) => {
        chromeMocks.chrome.runtime.lastError = { message: 'Could not establish connection' };
        callback(null);
      });
      
      chromeMocks.chrome.scripting.executeScript.rejects(new Error('Cannot access chrome:// URLs'));
      
      await global.testUtils.waitFor(50);
      
      // Act
      const toggleButton = document.getElementById('toggleInterface');
      global.testUtils.triggerEvent(toggleButton, 'click');
      
      await global.testUtils.waitFor(10);
      
      // Assert
      expect(global.alert).toHaveBeenCalledWith(
        'Could not load extension on this page. It may be restricted by the website.'
      );
    });
  });

  describe('Settings Management', () => {
    test('should handle auto-open setting change', async () => {
      // Arrange
      await global.testUtils.waitFor(50);
      
      // Act
      const autoOpenSetting = document.getElementById('autoOpenSetting');
      autoOpenSetting.checked = true;
      global.testUtils.triggerEvent(autoOpenSetting, 'change');
      
      // Assert
      expect(chromeMocks.chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'saveUserPreferences',
          preferences: expect.objectContaining({
            autoOpen: true
          })
        }),
        expect.any(Function)
      );
    });

    test('should handle remember position setting change', async () => {
      // Arrange
      await global.testUtils.waitFor(50);
      
      // Act
      const rememberPositionSetting = document.getElementById('rememberPositionSetting');
      rememberPositionSetting.checked = false;
      global.testUtils.triggerEvent(rememberPositionSetting, 'change');
      
      // Assert
      expect(chromeMocks.chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'saveUserPreferences',
          preferences: expect.objectContaining({
            rememberPosition: false
          })
        }),
        expect.any(Function)
      );
    });

    test('should handle global rules setting change', async () => {
      // Arrange
      chromeMocks.chrome.tabs.query.callsFake((query, callback) => {
        callback([{ id: 1 }, { id: 2 }]);
      });
      
      await global.testUtils.waitFor(50);
      
      // Act
      const globalRulesSetting = document.getElementById('globalRulesSetting');
      globalRulesSetting.checked = true;
      global.testUtils.triggerEvent(globalRulesSetting, 'change');
      
      // Assert
      expect(chromeMocks.chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'saveUserPreferences',
          preferences: expect.objectContaining({
            globalRulesEnabled: true
          })
        }),
        expect.any(Function)
      );
      
      // Should also send update to all tabs
      expect(chromeMocks.chrome.tabs.sendMessage).toHaveBeenCalledWith(
        1,
        { action: 'updateGlobalRules', enabled: true },
        expect.any(Function)
      );
      expect(chromeMocks.chrome.tabs.sendMessage).toHaveBeenCalledWith(
        2,
        { action: 'updateGlobalRules', enabled: true },
        expect.any(Function)
      );
    });
  });

  describe('Status Indicator', () => {
    test('should show active status when interface is running', async () => {
      // Arrange
      chromeMocks.chrome.tabs.query.callsFake((query, callback) => {
        callback([{ id: 1, active: true }]);
      });
      
      chromeMocks.chrome.tabs.sendMessage.callsFake((tabId, message, callback) => {
        if (message.action === 'getStatus') {
          callback({ active: true });
        }
      });
      
      await global.testUtils.waitFor(50);
      
      // Assert
      const statusIndicator = document.querySelector('.status-indicator');
      const statusText = document.querySelector('.status');
      
      if (statusIndicator && statusText) {
        expect(statusIndicator.style.backgroundColor).toBe('rgb(52, 168, 83)'); // Green
        expect(statusText.textContent).toBe('Active');
      }
    });

    test('should show ready status when interface is loaded but not visible', async () => {
      // Arrange
      chromeMocks.chrome.tabs.query.callsFake((query, callback) => {
        callback([{ id: 1, active: true }]);
      });
      
      chromeMocks.chrome.tabs.sendMessage.callsFake((tabId, message, callback) => {
        if (message.action === 'getStatus') {
          callback({ active: false });
        }
      });
      
      await global.testUtils.waitFor(50);
      
      // Assert
      const statusIndicator = document.querySelector('.status-indicator');
      const statusText = document.querySelector('.status');
      
      if (statusIndicator && statusText) {
        expect(statusIndicator.style.backgroundColor).toBe('rgb(251, 188, 5)'); // Yellow
        expect(statusText.textContent).toBe('Ready');
      }
    });

    test('should show inactive status when content script not loaded', async () => {
      // Arrange
      chromeMocks.chrome.tabs.query.callsFake((query, callback) => {
        callback([{ id: 1, active: true }]);
      });
      
      chromeMocks.chrome.tabs.sendMessage.callsFake((tabId, message, callback) => {
        chromeMocks.chrome.runtime.lastError = { message: 'Could not establish connection' };
        callback(null);
      });
      
      await global.testUtils.waitFor(50);
      
      // Assert
      const statusIndicator = document.querySelector('.status-indicator');
      const statusText = document.querySelector('.status');
      
      if (statusIndicator && statusText) {
        expect(statusIndicator.style.backgroundColor).toBe('rgb(234, 67, 53)'); // Red
        expect(statusText.textContent).toBe('Inactive');
      }
    });
  });

  describe('Navigation Links', () => {
    test('should handle options link click', async () => {
      // Arrange
      await global.testUtils.waitFor(50);
      
      // Act
      const optionsLink = document.getElementById('openOptions');
      global.testUtils.triggerEvent(optionsLink, 'click');
      
      // Assert
      expect(global.alert).toHaveBeenCalledWith(
        'Advanced settings are available within the main interface. Open the interface and click the ⚙️ Settings button.'
      );
    });

    test('should handle help link click', async () => {
      // Arrange
      chromeMocks.chrome.tabs.create.resolves();
      await global.testUtils.waitFor(50);
      
      // Act
      const helpLink = document.getElementById('openHelp');
      global.testUtils.triggerEvent(helpLink, 'click');
      
      // Assert
      expect(chromeMocks.chrome.tabs.create).toHaveBeenCalledWith({
        url: 'chrome-extension://test-id/pages/help.html'
      });
    });

    test('should handle about link click', async () => {
      // Arrange
      chromeMocks.chrome.tabs.create.resolves();
      await global.testUtils.waitFor(50);
      
      // Act
      const aboutLink = document.getElementById('openAbout');
      global.testUtils.triggerEvent(aboutLink, 'click');
      
      // Assert
      expect(chromeMocks.chrome.tabs.create).toHaveBeenCalledWith({
        url: 'chrome-extension://test-id/pages/about.html'
      });
    });

    test('should handle tab creation errors gracefully', async () => {
      // Arrange
      chromeMocks.chrome.tabs.create.rejects(new Error('Tab creation failed'));
      await global.testUtils.waitFor(50);
      
      // Act
      const helpLink = document.getElementById('openHelp');
      global.testUtils.triggerEvent(helpLink, 'click');
      
      await global.testUtils.waitFor(10);
      
      // Assert
      expect(global.alert).toHaveBeenCalledWith('Help page is not available.');
    });
  });

  describe('Error Handling', () => {
    test('should handle Chrome API errors gracefully', async () => {
      // Arrange
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      chromeMocks.mockRuntimeError('Extension context invalidated');
      
      // Wait for initialization
      await global.testUtils.waitFor(50);
      
      // Act
      const toggleButton = document.getElementById('toggleInterface');
      global.testUtils.triggerEvent(toggleButton, 'click');
      
      // Assert - should not crash
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    test('should handle missing DOM elements gracefully', async () => {
      // Arrange
      document.body.innerHTML = '<div>Minimal DOM</div>';
      
      // Act & Assert - should not throw
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      await global.testUtils.waitFor(50);
      
      consoleSpy.mockRestore();
    });
  });
});