/**
 * Chrome APIs Mock Helpers
 * Provides detailed mocking utilities for Chrome extension APIs
 */

class ChromeApiMocks {
  constructor() {
    this.chrome = {
      runtime: {
        getURL: jest.fn(),
        getManifest: jest.fn(),
        sendMessage: jest.fn(),
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
          get: jest.fn(),
          set: jest.fn(),
          remove: jest.fn(),
          clear: jest.fn()
        }
      },
      tabs: {
        query: jest.fn(),
        sendMessage: jest.fn(),
        create: jest.fn()
      },
      commands: {
        onCommand: {
          addListener: jest.fn()
        }
      },
      scripting: {
        executeScript: jest.fn(),
        insertCSS: jest.fn()
      }
    };
  }

  setupDefaultBehaviors() {
    // Runtime API defaults
    this.chrome.runtime.getURL.mockImplementation((path) => `chrome-extension://test-id/${path}`);
    this.chrome.runtime.getManifest.mockReturnValue({
      manifest_version: 3,
      name: 'AI Prompting Guide',
      version: '1.0.0'
    });
    
    // Storage API defaults - successful operations
    this.chrome.storage.local.get.mockImplementation((keys, callback) => {
      if (typeof keys === 'function') {
        callback = keys;
        keys = null;
      }
      callback && callback({});
    });
    
    this.chrome.storage.local.set.mockImplementation((data, callback) => {
      callback && callback();
    });
    
    // Tabs API defaults
    this.chrome.tabs.query.mockImplementation((query, callback) => {
      const allTabs = [
        { id: 1, url: 'https://example.com', active: true, currentWindow: true },
        { id: 2, url: 'https://test.com', active: false, currentWindow: true },
        { id: 3, url: 'http://localhost:3000', active: false, currentWindow: false }
      ];
      
      let filteredTabs = allTabs;
      
      if (query.url) {
        const pattern = query.url.replace('*', '.*');
        filteredTabs = filteredTabs.filter(tab => new RegExp(pattern).test(tab.url));
      }
      
      callback && callback(filteredTabs);
    });
    
    this.chrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
      callback && callback({ success: true });
    });
    
    // Runtime messaging defaults
    this.chrome.runtime.sendMessage.mockImplementation((message, callback) => {
      callback && callback({ success: true });
    });
    
    // Scripting API defaults
    this.chrome.scripting.executeScript.mockResolvedValue([{ result: true }]);
    this.chrome.scripting.insertCSS.mockResolvedValue();
    
    return this;
  }

  mockStorageWithData(data) {
    this.chrome.storage.local.get.mockImplementation((keys, callback) => {
      if (typeof keys === 'function') {
        callback = keys;
        keys = null;
      }
      
      if (!keys) {
        callback && callback(data);
        return;
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
      
      callback && callback(result);
    });
    
    return this;
  }

  mockStorageError(errorMessage = 'Storage error') {
    this.chrome.runtime.lastError = { message: errorMessage };
    
    this.chrome.storage.local.get.mockImplementation((keys, callback) => {
      callback && callback(null);
    });
    
    this.chrome.storage.local.set.mockImplementation((data, callback) => {
      callback && callback();
    });
    
    return this;
  }

  mockTabsError(errorMessage = 'Tab error') {
    this.chrome.runtime.lastError = { message: errorMessage };
    
    this.chrome.tabs.query.mockImplementation((query, callback) => {
      callback && callback(null);
    });
    
    return this;
  }

  mockStorageQuotaError() {
    this.chrome.runtime.lastError = { message: 'QUOTA_EXCEEDED_ERR' };
    
    this.chrome.storage.local.set.mockImplementation((data, callback) => {
      const dataSize = JSON.stringify(data).length;
      if (dataSize > 1000) { // Simulate quota exceeded for large data
        callback && callback();
      } else {
        callback && callback();
      }
    });
    
    return this;
  }

  clearAllMocks() {
    // Clear all Jest mocks
    Object.values(this.chrome.runtime).forEach(mock => {
      if (typeof mock === 'function' && mock.mockClear) {
        mock.mockClear();
      }
    });
    
    Object.values(this.chrome.storage.local).forEach(mock => {
      if (typeof mock === 'function' && mock.mockClear) {
        mock.mockClear();
      }
    });
    
    Object.values(this.chrome.tabs).forEach(mock => {
      if (typeof mock === 'function' && mock.mockClear) {
        mock.mockClear();
      }
    });
    
    this.chrome.runtime.lastError = null;
    
    return this;
  }

  resetToDefaults() {
    this.clearAllMocks();
    this.setupDefaultBehaviors();
    return this;
  }
}

// Export for both CommonJS and ES modules
module.exports = { ChromeApiMocks };