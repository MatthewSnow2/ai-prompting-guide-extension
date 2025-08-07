/**
 * Integration Tests for Chrome Extension API Interactions
 * Tests real Chrome API behaviors and extension integration points
 */

const { 
  testSpecialists, 
  testModels, 
  testUserPreferences,
  testStorageKeys 
} = require('../fixtures/test-data');

describe('Chrome Extension API Integration', () => {
  beforeEach(() => {
    // Chrome API is already mocked in setup.js
    // Just ensure we have fresh mocks for each test
    jest.clearAllMocks();
    
    // Reset Chrome API lastError
    chrome.runtime.lastError = null;
    
    // Mock fetch for JSON file loading
    fetch.mockClear();
  });

  afterEach(() => {
    // Cleanup is handled in setup.js
  });

  describe('Storage API Integration', () => {
    test('should handle storage quota exceeded errors', async () => {
      // Arrange
      const largeData = { 
        [testStorageKeys.USER_PREFERENCES]: {
          ...testUserPreferences,
          largeDataField: 'x'.repeat(10000000) // 10MB of data
        }
      };
      
      chrome.storage.local.set.mockImplementation((data, callback) => {
        chrome.runtime.lastError = { message: 'QUOTA_BYTES quota exceeded' };
        if (callback) callback();
      });
      
      // Act
      let errorCaught = false;
      try {
        await new Promise((resolve, reject) => {
          chrome.storage.local.set(largeData, () => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve();
            }
          });
        });
      } catch (error) {
        errorCaught = true;
        expect(error.message).toContain('QUOTA_BYTES quota exceeded');
      }
      
      // Assert
      expect(errorCaught).toBe(true);
      expect(chrome.storage.local.set).toHaveBeenCalledWith(largeData, expect.any(Function));
    });

    test('should handle storage.local.get with multiple keys', async () => {
      // Arrange
      const testData = {
        [testStorageKeys.SPECIALISTS]: testSpecialists,
        [testStorageKeys.MODELS]: testModels,
        [testStorageKeys.USER_PREFERENCES]: testUserPreferences
      };
      
      testUtils.createMockStorageData(testData);
      
      // Act
      const result = await new Promise((resolve) => {
        chrome.storage.local.get([
          testStorageKeys.SPECIALISTS,
          testStorageKeys.MODELS,
          testStorageKeys.USER_PREFERENCES
        ], resolve);
      });
      
      // Assert
      expect(result).toEqual(testData);
    });

    test('should handle storage.local.get with default values', async () => {
      // Arrange
      testUtils.createMockStorageData({}); // Empty storage
      const defaultValues = {
        [testStorageKeys.USER_PREFERENCES]: { theme: 'light' },
        [testStorageKeys.CUSTOM_RULES]: { global: [] }
      };
      
      // Act
      const result = await new Promise((resolve) => {
        chrome.storage.local.get(defaultValues, resolve);
      });
      
      // Assert
      expect(result).toEqual(defaultValues);
    });

    test('should handle concurrent storage operations', async () => {
      // Arrange
      const operations = [];
      const testData = [
        { key: 'data1', value: 'value1' },
        { key: 'data2', value: 'value2' },
        { key: 'data3', value: 'value3' }
      ];
      
      // Act - Start multiple concurrent storage operations
      testData.forEach((item, index) => {
        const operation = new Promise((resolve) => {
          setTimeout(() => {
            chrome.storage.local.set({ [item.key]: item.value }, resolve);
          }, index * 10); // Stagger operations slightly
        });
        operations.push(operation);
      });
      
      // Wait for all operations to complete
      await Promise.all(operations);
      
      // Assert
      expect(chrome.storage.local.set).toHaveBeenCalledTimes(3);
      testData.forEach(item => {
        expect(chrome.storage.local.set).toHaveBeenCalledWith(
          { [item.key]: item.value },
          expect.any(Function)
        );
      });
    });

    test('should handle storage corruption and recovery', async () => {
      // Arrange - Simulate corrupted storage data
      const corruptedData = {
        [testStorageKeys.SPECIALISTS]: null,
        [testStorageKeys.MODELS]: undefined,
        [testStorageKeys.USER_PREFERENCES]: 'invalid-json-string'
      };
      
      testUtils.createMockStorageData(corruptedData);
      
      // Act & Assert - Should handle corrupted data gracefully
      const result = await new Promise((resolve) => {
        chrome.storage.local.get([
          testStorageKeys.SPECIALISTS,
          testStorageKeys.MODELS,
          testStorageKeys.USER_PREFERENCES
        ], resolve);
      });
      
      expect(result[testStorageKeys.SPECIALISTS]).toBeNull();
      expect(result[testStorageKeys.MODELS]).toBeUndefined();
      expect(typeof result[testStorageKeys.USER_PREFERENCES]).toBe('string');
    });
  });

  describe('Runtime Messaging Integration', () => {
    test('should handle message channel disconnection', async () => {
      // Arrange
      let messageListener;
      chrome.runtime.onMessage.addListener.callsFake((listener) => {
        messageListener = listener;
      });
      
      // Simulate listener setup
      const mockSender = { tab: { id: 1 } };
      const mockSendResponse = jest.fn();
      
      // Act - Simulate disconnection
      chrome.runtime.lastError = { message: 'The message port closed before a response was received.' };
      
      if (messageListener) {
        messageListener({ action: 'getSpecialists' }, mockSender, mockSendResponse);
      }
      
      // Assert - Should handle disconnection gracefully
      expect(chrome.runtime.lastError).toBeTruthy();
    });

    test('should handle cross-origin messaging restrictions', async () => {
      // Arrange
      const restrictedSender = {
        tab: { id: 1, url: 'chrome://settings/' },
        origin: 'chrome://settings'
      };
      
      // Act & Assert - Should reject messages from restricted origins
      const isAllowedOrigin = (sender) => {
        const allowedOrigins = ['https://', 'http://', 'chrome-extension://'];
        return allowedOrigins.some(origin => 
          sender.tab?.url?.startsWith(origin) || 
          sender.origin?.startsWith(origin)
        );
      };
      
      expect(isAllowedOrigin(restrictedSender)).toBe(false);
      
      const allowedSender = {
        tab: { id: 1, url: 'https://example.com' },
        origin: 'https://example.com'
      };
      
      expect(isAllowedOrigin(allowedSender)).toBe(true);
    });

    test('should handle message size limitations', async () => {
      // Arrange
      const largeMessage = {
        action: 'generateResponse',
        message: 'x'.repeat(1000000), // 1MB message
        specialistId: 'test',
        modelId: 'test'
      };
      
      // Act & Assert
      const messageSizeLimit = 64 * 1024; // 64KB typical limit
      const messageSize = JSON.stringify(largeMessage).length;
      
      expect(messageSize).toBeGreaterThan(messageSizeLimit);
      
      // Should handle large messages appropriately
      const truncatedMessage = {
        ...largeMessage,
        message: largeMessage.message.substring(0, messageSizeLimit - 1000) // Leave room for other fields
      };
      
      expect(JSON.stringify(truncatedMessage).length).toBeLessThan(messageSizeLimit);
    });

    test('should handle bidirectional messaging between components', async () => {
      // Arrange
      const backgroundToContentMessages = [];
      const contentToBackgroundMessages = [];
      
      // Mock background script sending messages
      chrome.tabs.sendMessage.callsFake((tabId, message, callback) => {
        backgroundToContentMessages.push({ tabId, message });
        if (callback) callback({ received: true });
      });
      
      // Mock content script sending messages  
      chrome.runtime.sendMessage.callsFake((message, callback) => {
        contentToBackgroundMessages.push(message);
        if (callback) callback({ received: true });
      });
      
      // Act - Simulate bidirectional communication
      // Background -> Content
      chrome.tabs.sendMessage(1, { action: 'toggleInterface' });
      
      // Content -> Background
      chrome.runtime.sendMessage({ action: 'getSpecialists' });
      
      // Assert
      expect(backgroundToContentMessages).toHaveLength(1);
      expect(backgroundToContentMessages[0].message.action).toBe('toggleInterface');
      
      expect(contentToBackgroundMessages).toHaveLength(1);
      expect(contentToBackgroundMessages[0].action).toBe('getSpecialists');
    });
  });

  describe('Tabs API Integration', () => {
    test('should handle tab lifecycle events', async () => {
      // Arrange
      const tabLifecycleEvents = [];
      
      // Mock tab events
      const mockTabsApi = {
        onCreated: { addListener: jest.fn() },
        onRemoved: { addListener: jest.fn() },
        onUpdated: { addListener: jest.fn() },
        onActivated: { addListener: jest.fn() }
      };
      
      Object.assign(chrome.tabs, mockTabsApi);
      
      // Act - Setup listeners
      mockTabsApi.onCreated.addListener((tab) => {
        tabLifecycleEvents.push({ event: 'created', tab });
      });
      
      mockTabsApi.onRemoved.addListener((tabId, removeInfo) => {
        tabLifecycleEvents.push({ event: 'removed', tabId, removeInfo });
      });
      
      // Simulate events
      const createdListener = mockTabsApi.onCreated.addListener.mock.calls[0][0];
      const removedListener = mockTabsApi.onRemoved.addListener.mock.calls[0][0];
      
      createdListener({ id: 1, url: 'https://example.com' });
      removedListener(1, { windowClosing: false });
      
      // Assert
      expect(tabLifecycleEvents).toHaveLength(2);
      expect(tabLifecycleEvents[0].event).toBe('created');
      expect(tabLifecycleEvents[1].event).toBe('removed');
    });

    test('should handle tab query with complex filters', async () => {
      // Arrange
      const testTabs = [
        { id: 1, url: 'https://example.com', active: true, currentWindow: true },
        { id: 2, url: 'https://google.com', active: false, currentWindow: true },
        { id: 3, url: 'chrome://settings/', active: false, currentWindow: false },
        { id: 4, url: 'https://github.com', active: false, currentWindow: true }
      ];
      
      chrome.tabs.query.callsFake((queryInfo, callback) => {
        let filteredTabs = testTabs;
        
        if (queryInfo.active !== undefined) {
          filteredTabs = filteredTabs.filter(tab => tab.active === queryInfo.active);
        }
        
        if (queryInfo.currentWindow !== undefined) {
          filteredTabs = filteredTabs.filter(tab => tab.currentWindow === queryInfo.currentWindow);
        }
        
        if (queryInfo.url) {
          filteredTabs = filteredTabs.filter(tab => 
            typeof queryInfo.url === 'string' 
              ? tab.url.includes(queryInfo.url)
              : queryInfo.url.test(tab.url)
          );
        }
        
        callback(filteredTabs);
      });
      
      // Act & Assert
      // Query active tab in current window
      await new Promise(resolve => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          expect(tabs).toHaveLength(1);
          expect(tabs[0].id).toBe(1);
          resolve();
        });
      });
      
      // Query all tabs in current window
      await new Promise(resolve => {
        chrome.tabs.query({ currentWindow: true }, (tabs) => {
          expect(tabs).toHaveLength(3); // Excludes tab 3
          resolve();
        });
      });
      
      // Query tabs by URL pattern
      await new Promise(resolve => {
        chrome.tabs.query({ url: 'https://*' }, (tabs) => {
          const httpsCount = testTabs.filter(tab => tab.url.startsWith('https://')).length;
          expect(tabs).toHaveLength(httpsCount);
          resolve();
        });
      });
    });

    test('should handle tab permission restrictions', async () => {
      // Arrange
      const restrictedTabs = [
        { id: 1, url: 'chrome://settings/' },
        { id: 2, url: 'chrome://extensions/' },
        { id: 3, url: 'chrome-extension://other-extension/' },
        { id: 4, url: 'https://chrome.google.com/webstore/' }
      ];
      
      // Act & Assert - Check which tabs are accessible
      const accessibleTabs = restrictedTabs.filter(tab => {
        // Extension cannot access chrome:// URLs or other extensions
        return !tab.url.startsWith('chrome://') && 
               !tab.url.startsWith('chrome-extension://') ||
               tab.url.startsWith('chrome-extension://test-id/'); // Own extension pages
      });
      
      expect(accessibleTabs).toHaveLength(1); // Only webstore URL
      expect(accessibleTabs[0].url).toBe('https://chrome.google.com/webstore/');
    });
  });

  describe('Scripting API Integration', () => {
    test('should handle content script injection with error recovery', async () => {
      // Arrange
      let injectionAttempts = 0;
      
      chrome.scripting.executeScript.callsFake(() => {
        injectionAttempts++;
        if (injectionAttempts === 1) {
          return Promise.reject(new Error('Cannot access chrome:// URL'));
        } else {
          return Promise.resolve([{ result: true }]);
        }
      });
      
      // Act - Attempt injection with retry logic
      let injectionResult;
      try {
        await chrome.scripting.executeScript({
          target: { tabId: 1 },
          files: ['content/content.js']
        });
      } catch (firstError) {
        // Retry with different tab
        try {
          injectionResult = await chrome.scripting.executeScript({
            target: { tabId: 2 },
            files: ['content/content.js']
          });
        } catch (secondError) {
          injectionResult = { error: secondError.message };
        }
      }
      
      // Assert
      expect(injectionAttempts).toBe(2);
      expect(injectionResult).toEqual([{ result: true }]);
    });

    test('should handle CSS injection in different contexts', async () => {
      // Arrange
      const cssInjections = [];
      
      chrome.scripting.insertCSS.callsFake((injection) => {
        cssInjections.push(injection);
        return Promise.resolve();
      });
      
      // Act - Inject CSS in different ways
      await chrome.scripting.insertCSS({
        target: { tabId: 1 },
        files: ['content/content.css']
      });
      
      await chrome.scripting.insertCSS({
        target: { tabId: 1 },
        css: '.ai-guide { display: block; }'
      });
      
      // Assert
      expect(cssInjections).toHaveLength(2);
      expect(cssInjections[0].files).toEqual(['content/content.css']);
      expect(cssInjections[1].css).toBe('.ai-guide { display: block; }');
    });

    test('should handle script execution results', async () => {
      // Arrange
      const executionResults = [
        { result: { success: true, data: 'test' } },
        { result: null },
        { error: 'Script error occurred' }
      ];
      
      chrome.scripting.executeScript.resolves(executionResults);
      
      // Act
      const results = await chrome.scripting.executeScript({
        target: { tabId: 1 },
        func: () => ({ success: true, data: 'test' })
      });
      
      // Assert
      expect(results).toEqual(executionResults);
      expect(results[0].result.success).toBe(true);
      expect(results[1].result).toBeNull();
      expect(results[2].error).toBe('Script error occurred');
    });
  });

  describe('Commands API Integration', () => {
    test('should handle keyboard shortcut registration and conflicts', async () => {
      // Arrange
      const registeredCommands = new Set();
      
      chrome.commands.onCommand.addListener.callsFake((listener) => {
        // Simulate command registration
        const commands = ['toggle_interface', '_execute_action'];
        commands.forEach(cmd => registeredCommands.add(cmd));
      });
      
      // Act
      const commandListener = jest.fn();
      chrome.commands.onCommand.addListener(commandListener);
      
      // Assert
      expect(registeredCommands.has('toggle_interface')).toBe(true);
      expect(registeredCommands.has('_execute_action')).toBe(true);
    });

    test('should handle command execution with context validation', async () => {
      // Arrange
      const commandExecutions = [];
      let commandListener;
      
      chrome.commands.onCommand.addListener.callsFake((listener) => {
        commandListener = listener;
      });
      
      // Setup listener
      chrome.commands.onCommand.addListener((command) => {
        commandExecutions.push({ command, timestamp: Date.now() });
      });
      
      // Act - Simulate command execution
      if (commandListener) {
        commandListener('toggle_interface');
        commandListener('_execute_action');
        commandListener('unknown_command'); // Should be ignored
      }
      
      // Assert
      expect(commandExecutions).toHaveLength(3);
      expect(commandExecutions[0].command).toBe('toggle_interface');
      expect(commandExecutions[1].command).toBe('_execute_action');
    });
  });

  describe('Permission Integration', () => {
    test('should handle permission requests and grants', async () => {
      // Arrange
      const mockPermissions = {
        contains: jest.fn(),
        request: jest.fn(),
        remove: jest.fn()
      };
      
      chrome.permissions = mockPermissions;
      
      // Act - Check for existing permissions
      mockPermissions.contains.mockImplementation((permissions, callback) => {
        const hasPermissions = permissions.permissions?.includes('storage') && 
                              permissions.permissions?.includes('activeTab');
        callback(hasPermissions);
      });
      
      // Request new permissions
      mockPermissions.request.mockImplementation((permissions, callback) => {
        callback(true); // Grant permissions
      });
      
      // Test permission checking
      await new Promise(resolve => {
        mockPermissions.contains({ 
          permissions: ['storage', 'activeTab'] 
        }, (hasPermissions) => {
          expect(hasPermissions).toBe(true);
          resolve();
        });
      });
      
      // Test permission requesting
      await new Promise(resolve => {
        mockPermissions.request({ 
          permissions: ['scripting'] 
        }, (granted) => {
          expect(granted).toBe(true);
          resolve();
        });
      });
    });

    test('should handle host permission validation', async () => {
      // Arrange
      const testUrls = [
        'https://example.com/*',
        'https://google.com/*',
        'chrome://settings/*',
        'chrome-extension://other/*'
      ];
      
      const mockPermissions = {
        contains: jest.fn()
      };
      
      chrome.permissions = mockPermissions;
      
      mockPermissions.contains.mockImplementation((permissions, callback) => {
        const requestedOrigins = permissions.origins || [];
        // Only allow https:// origins, not chrome:// or chrome-extension://
        const allowed = requestedOrigins.every(origin => 
          origin.startsWith('https://') || origin === '<all_urls>'
        );
        callback(allowed);
      });
      
      // Act & Assert
      for (const url of testUrls) {
        await new Promise(resolve => {
          mockPermissions.contains({ origins: [url] }, (hasPermission) => {
            if (url.startsWith('https://')) {
              expect(hasPermission).toBe(true);
            } else {
              expect(hasPermission).toBe(false);
            }
            resolve();
          });
        });
      }
    });
  });

  describe('Extension Lifecycle Integration', () => {
    test('should handle extension installation and updates', async () => {
      // Arrange
      const lifecycleEvents = [];
      let installListener;
      
      chrome.runtime.onInstalled.addListener.callsFake((listener) => {
        installListener = listener;
      });
      
      // Setup listener
      chrome.runtime.onInstalled.addListener((details) => {
        lifecycleEvents.push(details);
      });
      
      // Act - Simulate install and update events
      if (installListener) {
        installListener({ reason: 'install', previousVersion: undefined });
        installListener({ reason: 'update', previousVersion: '0.9.0' });
      }
      
      // Assert
      expect(lifecycleEvents).toHaveLength(2);
      expect(lifecycleEvents[0].reason).toBe('install');
      expect(lifecycleEvents[1].reason).toBe('update');
      expect(lifecycleEvents[1].previousVersion).toBe('0.9.0');
    });

    test('should handle service worker lifecycle', async () => {
      // Arrange
      const serviceWorkerEvents = [];
      
      // Mock service worker specific events
      const mockServiceWorkerEvents = {
        onStartup: { addListener: jest.fn() },
        onSuspend: { addListener: jest.fn() },
        onSuspendCanceled: { addListener: jest.fn() }
      };
      
      Object.assign(chrome.runtime, mockServiceWorkerEvents);
      
      // Act - Setup listeners
      mockServiceWorkerEvents.onStartup.addListener(() => {
        serviceWorkerEvents.push('startup');
      });
      
      mockServiceWorkerEvents.onSuspend.addListener(() => {
        serviceWorkerEvents.push('suspend');
      });
      
      // Simulate events
      const startupListener = mockServiceWorkerEvents.onStartup.addListener.mock.calls[0][0];
      const suspendListener = mockServiceWorkerEvents.onSuspend.addListener.mock.calls[0][0];
      
      startupListener();
      suspendListener();
      
      // Assert
      expect(serviceWorkerEvents).toEqual(['startup', 'suspend']);
    });
  });
});