/**
 * Jest test setup for Chrome Extension testing
 * Sets up Chrome APIs mocking and global test environment
 */

const { chrome } = require('sinon-chrome/extensions');

// Mock Chrome APIs globally
global.chrome = chrome;
global.browser = chrome;

// Mock fetch for tests
global.fetch = jest.fn();

// Mock DOM APIs that might be used in extension
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock MutationObserver
global.MutationObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
}));

// Setup default Chrome API responses
beforeEach(() => {
  // Reset all Chrome API mocks
  chrome.flush();
  
  // Setup default responses for common APIs
  chrome.runtime.getURL.returns('chrome-extension://test-extension-id/');
  chrome.runtime.getManifest.returns({
    manifest_version: 3,
    name: 'AI Prompting Guide',
    version: '1.0.0'
  });
  
  // Setup storage API defaults
  chrome.storage.local.get.yields({});
  chrome.storage.local.set.yields();
  chrome.storage.local.remove.yields();
  chrome.storage.local.clear.yields();
  
  // Setup tabs API defaults
  chrome.tabs.query.yields([]);
  chrome.tabs.sendMessage.yields({});
  
  // Setup runtime messaging defaults
  chrome.runtime.sendMessage.yields({});
  chrome.runtime.onMessage.addListener.returns(true);
  
  // Setup commands API defaults
  chrome.commands.onCommand.addListener.returns(true);
  
  // Clear fetch mock
  fetch.mockClear();
});

// Cleanup after each test
afterEach(() => {
  // Clear all mocks
  jest.clearAllMocks();
  chrome.flush();
});

// Global test utilities
global.testUtils = {
  // Helper to create mock chrome storage data
  createMockStorageData: (data = {}) => {
    chrome.storage.local.get.withArgs(sinon.match.any).yields(data);
    return data;
  },
  
  // Helper to simulate chrome.runtime.sendMessage
  mockRuntimeMessage: (response, error = null) => {
    if (error) {
      chrome.runtime.sendMessage.yields(null);
      chrome.runtime.lastError = error;
    } else {
      chrome.runtime.sendMessage.yields(response);
      delete chrome.runtime.lastError;
    }
  },
  
  // Helper to simulate chrome.tabs.sendMessage
  mockTabMessage: (response, error = null) => {
    if (error) {
      chrome.tabs.sendMessage.yields(null);
      chrome.runtime.lastError = error;
    } else {
      chrome.tabs.sendMessage.yields(response);
      delete chrome.runtime.lastError;
    }
  },
  
  // Helper to create DOM element for popup testing
  createPopupDOM: () => {
    document.body.innerHTML = `
      <div class="container">
        <div class="status">
          <span class="status-indicator"></span>
          <span class="status"></span>
        </div>
        <button id="toggleInterface">Toggle Interface</button>
        <select id="specialistSelect"></select>
        <button id="applySpecialist">Apply Specialist</button>
        <input type="checkbox" id="autoOpenSetting">
        <input type="checkbox" id="rememberPositionSetting">
        <input type="checkbox" id="globalRulesSetting">
        <a href="#" id="openOptions">Options</a>
        <a href="#" id="openHelp">Help</a>
        <a href="#" id="openAbout">About</a>
      </div>
    `;
  },
  
  // Helper to wait for async operations
  waitFor: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Helper to trigger DOM events
  triggerEvent: (element, eventType, eventInit = {}) => {
    const event = new Event(eventType, { bubbles: true, cancelable: true, ...eventInit });
    element.dispatchEvent(event);
  }
};

// Console error filtering for cleaner test output
const originalError = console.error;
console.error = (...args) => {
  // Filter out expected Chrome extension errors during testing
  const message = args[0];
  if (typeof message === 'string') {
    if (message.includes('Extension context invalidated') ||
        message.includes('chrome.runtime.lastError') ||
        message.includes('Could not establish connection')) {
      return; // Suppress expected extension errors
    }
  }
  originalError.apply(console, args);
};