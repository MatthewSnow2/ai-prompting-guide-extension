/**
 * Jest test setup for Chrome Extension testing
 * Sets up Chrome APIs mocking and global test environment
 */

// Using Jest mocks instead of sinon for better integration

// Create Chrome API mocks using Jest functions where possible, with sinon for complex behaviors
const createChromeMock = () => {
  return {
    runtime: {
      getURL: jest.fn().mockImplementation((path) => `chrome-extension://test-extension-id/${path}`),
      getManifest: jest.fn().mockReturnValue({
        manifest_version: 3,
        name: 'AI Prompting Guide',
        version: '1.0.0'
      }),
      sendMessage: jest.fn().mockImplementation((message, callback) => {
        if (callback) callback({ success: true });
        return Promise.resolve({ success: true });
      }),
      onMessage: {
        addListener: jest.fn(),
        removeListener: jest.fn(),
        hasListener: jest.fn()
      },
      onInstalled: {
        addListener: jest.fn()
      },
      lastError: null
    },
    storage: {
      local: {
        get: jest.fn().mockImplementation((keys, callback) => {
          if (typeof keys === 'function') {
            callback = keys;
            keys = null;
          }
          const result = {};
          if (callback) callback(result);
          return Promise.resolve(result);
        }),
        set: jest.fn().mockImplementation((data, callback) => {
          if (callback) callback();
          return Promise.resolve();
        }),
        remove: jest.fn().mockImplementation((keys, callback) => {
          if (callback) callback();
          return Promise.resolve();
        }),
        clear: jest.fn().mockImplementation((callback) => {
          if (callback) callback();
          return Promise.resolve();
        })
      }
    },
    tabs: {
      query: jest.fn().mockImplementation((queryInfo, callback) => {
        const result = [{
          id: 1,
          url: 'https://example.com',
          active: true,
          currentWindow: true
        }];
        if (callback) callback(result);
        return Promise.resolve(result);
      }),
      sendMessage: jest.fn().mockImplementation((tabId, message, callback) => {
        const result = { success: true };
        if (callback) callback(result);
        return Promise.resolve(result);
      }),
      create: jest.fn().mockImplementation((createProperties, callback) => {
        const tab = { id: 2, url: createProperties.url };
        if (callback) callback(tab);
        return Promise.resolve(tab);
      })
    },
    commands: {
      onCommand: {
        addListener: jest.fn()
      }
    },
    scripting: {
      executeScript: jest.fn().mockResolvedValue([{ result: true }]),
      insertCSS: jest.fn().mockResolvedValue()
    },
    permissions: {
      contains: jest.fn().mockImplementation((permissions, callback) => {
        if (callback) callback(true);
        return Promise.resolve(true);
      }),
      request: jest.fn().mockImplementation((permissions, callback) => {
        if (callback) callback(true);
        return Promise.resolve(true);
      }),
      remove: jest.fn().mockImplementation((permissions, callback) => {
        if (callback) callback(true);
        return Promise.resolve(true);
      })
    },
    // Add flush method for compatibility with sinon-chrome usage in tests
    flush: jest.fn()
  };
};

const chrome = createChromeMock();

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
  jest.clearAllMocks();
  chrome.flush.mockClear();
  
  // Reset Chrome API lastError
  chrome.runtime.lastError = null;
  
  // Setup default implementations (they're already set in createChromeMock)
  // but we can override them per test if needed
  
  // Clear fetch mock
  fetch.mockClear();
});

// Cleanup after each test
afterEach(() => {
  // Clear all mocks
  jest.clearAllMocks();
  
  // Reset Chrome API lastError
  chrome.runtime.lastError = null;
});

// Global test utilities
global.testUtils = {
  // Helper to create mock chrome storage data
  createMockStorageData: (data = {}) => {
    chrome.storage.local.get.mockImplementation((keys, callback) => {
      if (typeof keys === 'function') {
        callback = keys;
        keys = null;
      }
      
      if (!keys) {
        if (callback) callback(data);
        return Promise.resolve(data);
      }
      
      const result = {};
      if (Array.isArray(keys)) {
        keys.forEach(key => {
          if (key in data) {
            result[key] = data[key];
          }
        });
      } else if (typeof keys === 'string') {
        if (keys in data) {
          result[keys] = data[keys];
        }
      } else if (typeof keys === 'object') {
        Object.keys(keys).forEach(key => {
          result[key] = data[key] !== undefined ? data[key] : keys[key];
        });
      }
      
      if (callback) callback(result);
      return Promise.resolve(result);
    });
    return data;
  },
  
  // Helper to simulate chrome.runtime.sendMessage
  mockRuntimeMessage: (response, error = null) => {
    chrome.runtime.sendMessage.mockImplementation((message, callback) => {
      if (error) {
        chrome.runtime.lastError = error;
        if (callback) callback(null);
        return Promise.reject(error);
      } else {
        chrome.runtime.lastError = null;
        if (callback) callback(response);
        return Promise.resolve(response);
      }
    });
  },
  
  // Helper to simulate chrome.tabs.sendMessage
  mockTabMessage: (response, error = null) => {
    chrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
      if (error) {
        chrome.runtime.lastError = error;
        if (callback) callback(null);
        return Promise.reject(error);
      } else {
        chrome.runtime.lastError = null;
        if (callback) callback(response);
        return Promise.resolve(response);
      }
    });
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