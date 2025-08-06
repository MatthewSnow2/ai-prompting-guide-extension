/**
 * Chrome APIs Mock Helpers
 * Provides detailed mocking utilities for Chrome extension APIs
 */

const sinon = require('sinon');

class ChromeApiMocks {
  constructor() {
    this.chrome = {
      runtime: {
        getURL: sinon.stub(),
        getManifest: sinon.stub(),
        sendMessage: sinon.stub(),
        onMessage: {
          addListener: sinon.stub(),
          removeListener: sinon.stub(),
          hasListener: sinon.stub()
        },
        onInstalled: {
          addListener: sinon.stub()
        },
        lastError: null
      },
      storage: {
        local: {
          get: sinon.stub(),
          set: sinon.stub(),
          remove: sinon.stub(),
          clear: sinon.stub()
        }
      },
      tabs: {
        query: sinon.stub(),
        sendMessage: sinon.stub(),
        create: sinon.stub()
      },
      commands: {
        onCommand: {
          addListener: sinon.stub()
        }
      },
      scripting: {
        executeScript: sinon.stub(),
        insertCSS: sinon.stub()
      }
    };
  }

  setupDefaultBehaviors() {
    // Runtime API defaults
    this.chrome.runtime.getURL.callsFake((path) => `chrome-extension://test-id/${path}`);
    this.chrome.runtime.getManifest.returns({
      manifest_version: 3,
      name: 'AI Prompting Guide',
      version: '1.0.0'
    });
    
    // Storage API defaults - successful operations
    this.chrome.storage.local.get.callsFake((keys, callback) => {
      if (typeof keys === 'function') {
        callback = keys;
        keys = null;
      }
      callback && callback({});
    });
    
    this.chrome.storage.local.set.callsFake((data, callback) => {
      callback && callback();
    });
    
    // Tabs API defaults
    this.chrome.tabs.query.callsFake((query, callback) => {
      callback && callback([{
        id: 1,
        url: 'https://example.com',
        active: true,
        currentWindow: true
      }]);
    });
    
    this.chrome.tabs.sendMessage.callsFake((tabId, message, callback) => {
      callback && callback({ success: true });
    });
    
    // Runtime messaging defaults
    this.chrome.runtime.sendMessage.callsFake((message, callback) => {
      callback && callback({ success: true });
    });
    
    // Scripting API defaults
    this.chrome.scripting.executeScript.resolves([{ result: true }]);
    this.chrome.scripting.insertCSS.resolves();
  }

  mockStorageWithData(data) {
    this.chrome.storage.local.get.callsFake((keys, callback) => {
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
  }

  mockStorageError(errorMessage = 'Storage error') {
    this.chrome.runtime.lastError = { message: errorMessage };
    
    this.chrome.storage.local.get.callsFake((keys, callback) => {
      callback && callback(null);
    });
    
    this.chrome.storage.local.set.callsFake((data, callback) => {
      callback && callback();
    });
  }

  mockTabsError(errorMessage = 'Tab error') {
    this.chrome.runtime.lastError = { message: errorMessage };
    
    this.chrome.tabs.query.callsFake((query, callback) => {
      callback && callback(null);
    });
    
    this.chrome.tabs.sendMessage.callsFake((tabId, message, callback) => {
      callback && callback(null);
    });
  }

  mockRuntimeError(errorMessage = 'Runtime error') {
    this.chrome.runtime.lastError = { message: errorMessage };
    
    this.chrome.runtime.sendMessage.callsFake((message, callback) => {
      callback && callback(null);
    });
  }

  simulateMessageListener(action, response) {
    // Helper to simulate message listener responses
    const listeners = this.chrome.runtime.onMessage.addListener.getCalls()
      .map(call => call.args[0]);
    
    listeners.forEach(listener => {
      const mockSender = { tab: { id: 1 } };
      const mockSendResponse = sinon.stub().callsFake((resp) => {
        return resp;
      });
      
      listener({ action }, mockSender, mockSendResponse);
    });
  }

  reset() {
    // Reset all stubs
    Object.values(this.chrome.runtime).forEach(stub => {
      if (stub && typeof stub.reset === 'function') stub.reset();
    });
    Object.values(this.chrome.storage.local).forEach(stub => {
      if (stub && typeof stub.reset === 'function') stub.reset();
    });
    Object.values(this.chrome.tabs).forEach(stub => {
      if (stub && typeof stub.reset === 'function') stub.reset();
    });
    
    // Clear last error
    this.chrome.runtime.lastError = null;
    
    // Re-setup defaults
    this.setupDefaultBehaviors();
  }
}

module.exports = { ChromeApiMocks };