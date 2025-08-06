/**
 * Unit Tests for Background Service Worker
 * Tests background script functionality, storage operations, and message handling
 */

const { ChromeApiMocks } = require('../mocks/chrome-apis');
const { 
  testSpecialists, 
  testModels, 
  testUserPreferences,
  testStorageKeys,
  testMessages 
} = require('../fixtures/test-data');

describe('Background Service Worker', () => {
  let chromeMocks;
  let backgroundScript;
  
  beforeEach(() => {
    // Setup Chrome API mocks
    chromeMocks = new ChromeApiMocks();
    global.chrome = chromeMocks.chrome;
    chromeMocks.setupDefaultBehaviors();
    
    // Mock fetch for loading JSON files
    global.fetch = jest.fn();
    
    // Clear any previous modules
    jest.clearAllMocks();
    
    // Load background script fresh for each test
    backgroundScript = require('../../background/background.js');
  });

  afterEach(() => {
    jest.resetModules();
    chromeMocks.reset();
  });

  describe('Data Loading', () => {
    test('should load specialists from storage when available', async () => {
      // Arrange
      const storedSpecialists = { [testStorageKeys.SPECIALISTS]: testSpecialists };
      chromeMocks.mockStorageWithData(storedSpecialists);
      
      // Act
      const result = await backgroundScript.loadSpecialistsData();
      
      // Assert
      expect(chromeMocks.chrome.storage.local.get).toHaveBeenCalledWith(testStorageKeys.SPECIALISTS);
      expect(backgroundScript.specialists).toEqual(testSpecialists);
    });

    test('should load specialists from default file when storage is empty', async () => {
      // Arrange
      chromeMocks.mockStorageWithData({});
      fetch.mockResolvedValueOnce({
        json: async () => ({ specialists: testSpecialists })
      });
      
      // Act
      await backgroundScript.loadSpecialistsData();
      
      // Assert
      expect(fetch).toHaveBeenCalledWith('chrome-extension://test-id/data/specialists.json');
      expect(chromeMocks.chrome.storage.local.set).toHaveBeenCalledWith({
        [testStorageKeys.SPECIALISTS]: testSpecialists
      });
      expect(backgroundScript.specialists).toEqual(testSpecialists);
    });

    test('should use fallback specialists on load failure', async () => {
      // Arrange
      chromeMocks.mockStorageError('Storage unavailable');
      fetch.mockRejectedValueOnce(new Error('Network error'));
      
      // Act
      await backgroundScript.loadSpecialistsData();
      
      // Assert
      expect(backgroundScript.specialists).toHaveLength(1);
      expect(backgroundScript.specialists[0].id).toBe('generic');
      expect(backgroundScript.specialists[0].name).toBe('General Specialist');
    });

    test('should load models from storage when available', async () => {
      // Arrange
      const storedModels = { [testStorageKeys.MODELS]: testModels };
      chromeMocks.mockStorageWithData(storedModels);
      
      // Act
      await backgroundScript.loadModelsData();
      
      // Assert
      expect(chromeMocks.chrome.storage.local.get).toHaveBeenCalledWith(testStorageKeys.MODELS);
      expect(backgroundScript.models).toEqual(testModels);
    });

    test('should load models from default file when storage is empty', async () => {
      // Arrange
      chromeMocks.mockStorageWithData({});
      fetch.mockResolvedValueOnce({
        json: async () => ({ models: testModels })
      });
      
      // Act
      await backgroundScript.loadModelsData();
      
      // Assert
      expect(fetch).toHaveBeenCalledWith('chrome-extension://test-id/data/models.json');
      expect(chromeMocks.chrome.storage.local.set).toHaveBeenCalledWith({
        [testStorageKeys.MODELS]: testModels
      });
      expect(backgroundScript.models).toEqual(testModels);
    });
  });

  describe('User Data Management', () => {
    test('should load user preferences from storage', async () => {
      // Arrange
      const storedPrefs = { [testStorageKeys.USER_PREFERENCES]: testUserPreferences };
      chromeMocks.mockStorageWithData(storedPrefs);
      
      // Act
      await backgroundScript.loadUserData();
      
      // Assert
      expect(chromeMocks.chrome.storage.local.get).toHaveBeenCalledWith([
        testStorageKeys.USER_PREFERENCES,
        testStorageKeys.USER_NOTES,
        testStorageKeys.CUSTOM_RULES
      ]);
      expect(backgroundScript.userPreferences).toEqual(testUserPreferences);
    });

    test('should save user preferences to storage', async () => {
      // Arrange
      const newPrefs = { theme: 'dark', position: { x: 200, y: 100 } };
      
      // Act
      await backgroundScript.saveUserPreferences(newPrefs);
      
      // Assert
      expect(chromeMocks.chrome.storage.local.set).toHaveBeenCalledWith({
        [testStorageKeys.USER_PREFERENCES]: expect.objectContaining(newPrefs)
      });
    });

    test('should handle user preferences save errors gracefully', async () => {
      // Arrange
      chromeMocks.mockStorageError('Storage quota exceeded');
      const newPrefs = { theme: 'dark' };
      
      // Act & Assert - should not throw
      await expect(backgroundScript.saveUserPreferences(newPrefs)).resolves.toBeUndefined();
    });

    test('should save user notes for specific specialist', async () => {
      // Arrange
      const specialistId = 'software-engineer';
      const notes = 'Focus on React best practices';
      
      // Act
      await backgroundScript.saveUserNotes(specialistId, notes);
      
      // Assert
      expect(chromeMocks.chrome.storage.local.set).toHaveBeenCalledWith({
        [testStorageKeys.USER_NOTES]: { [specialistId]: notes }
      });
    });

    test('should save custom rules for global or specialist scope', async () => {
      // Arrange
      const globalRules = ['Always include error handling'];
      const specialistRules = ['Use TypeScript interfaces'];
      const specialistId = 'software-engineer';
      
      // Act
      await backgroundScript.saveCustomRules(globalRules, true);
      await backgroundScript.saveCustomRules(specialistRules, false, specialistId);
      
      // Assert
      expect(chromeMocks.chrome.storage.local.set).toHaveBeenCalledWith({
        [testStorageKeys.CUSTOM_RULES]: expect.objectContaining({
          global: globalRules
        })
      });
      expect(chromeMocks.chrome.storage.local.set).toHaveBeenCalledWith({
        [testStorageKeys.CUSTOM_RULES]: expect.objectContaining({
          specialist: { [specialistId]: specialistRules }
        })
      });
    });
  });

  describe('Message Handling', () => {
    test('should respond to getSpecialists message', async () => {
      // Arrange
      backgroundScript.specialists = testSpecialists;
      const mockSendResponse = jest.fn();
      
      // Act
      const listeners = chromeMocks.chrome.runtime.onMessage.addListener.getCall(0).args[0];
      listeners({ action: 'getSpecialists' }, {}, mockSendResponse);
      
      // Assert
      expect(mockSendResponse).toHaveBeenCalledWith({ specialists: testSpecialists });
    });

    test('should respond to getModels message', async () => {
      // Arrange
      backgroundScript.models = testModels;
      const mockSendResponse = jest.fn();
      
      // Act
      const listeners = chromeMocks.chrome.runtime.onMessage.addListener.getCall(0).args[0];
      listeners({ action: 'getModels' }, {}, mockSendResponse);
      
      // Assert
      expect(mockSendResponse).toHaveBeenCalledWith({ models: testModels });
    });

    test('should respond to ping message for health check', async () => {
      // Arrange
      const mockSendResponse = jest.fn();
      
      // Act
      const listeners = chromeMocks.chrome.runtime.onMessage.addListener.getCall(0).args[0];
      listeners({ action: 'ping' }, {}, mockSendResponse);
      
      // Assert
      expect(mockSendResponse).toHaveBeenCalledWith({ status: 'ok' });
    });

    test('should respond to getUserPreferences message', async () => {
      // Arrange
      backgroundScript.userPreferences = testUserPreferences;
      const mockSendResponse = jest.fn();
      
      // Act
      const listeners = chromeMocks.chrome.runtime.onMessage.addListener.getCall(0).args[0];
      listeners({ action: 'getUserPreferences' }, {}, mockSendResponse);
      
      // Assert
      expect(mockSendResponse).toHaveBeenCalledWith({ preferences: testUserPreferences });
    });

    test('should respond to getSpecialistDetails message', async () => {
      // Arrange
      backgroundScript.specialists = testSpecialists;
      const mockSendResponse = jest.fn();
      
      // Act
      const listeners = chromeMocks.chrome.runtime.onMessage.addListener.getCall(0).args[0];
      listeners({ action: 'getSpecialistDetails', specialistId: 'software-engineer' }, {}, mockSendResponse);
      
      // Assert
      expect(mockSendResponse).toHaveBeenCalledWith({ specialist: testSpecialists[0] });
    });

    test('should handle getSpecialistDetails for non-existent specialist', async () => {
      // Arrange
      backgroundScript.specialists = testSpecialists;
      const mockSendResponse = jest.fn();
      
      // Act
      const listeners = chromeMocks.chrome.runtime.onMessage.addListener.getCall(0).args[0];
      listeners({ action: 'getSpecialistDetails', specialistId: 'non-existent' }, {}, mockSendResponse);
      
      // Assert
      expect(mockSendResponse).toHaveBeenCalledWith({ error: 'Specialist not found' });
    });

    test('should handle unknown action gracefully', async () => {
      // Arrange
      const mockSendResponse = jest.fn();
      
      // Act
      const listeners = chromeMocks.chrome.runtime.onMessage.addListener.getCall(0).args[0];
      listeners({ action: 'unknown_action' }, {}, mockSendResponse);
      
      // Assert
      expect(mockSendResponse).toHaveBeenCalledWith({ error: 'Unknown action' });
    });
  });

  describe('Advice Generation', () => {
    test('should generate advice response for valid specialist and model', async () => {
      // Arrange
      backgroundScript.specialists = testSpecialists;
      backgroundScript.models = testModels;
      backgroundScript.customRules = { global: [], specialist: {} };
      
      // Act
      const result = await backgroundScript.generateAdvice(
        'software-engineer',
        'gpt-4',
        'How do I implement error handling?'
      );
      
      // Assert
      expect(result).toContain('Software Engineer');
      expect(result).toContain('GPT-4');
      expect(result).toContain('error handling');
    });

    test('should throw error for invalid specialist ID', async () => {
      // Arrange
      backgroundScript.specialists = testSpecialists;
      backgroundScript.models = testModels;
      
      // Act & Assert
      await expect(backgroundScript.generateAdvice(
        'invalid-specialist',
        'gpt-4',
        'Test message'
      )).rejects.toThrow('Specialist or model not found');
    });

    test('should throw error for invalid model ID', async () => {
      // Arrange
      backgroundScript.specialists = testSpecialists;
      backgroundScript.models = testModels;
      
      // Act & Assert
      await expect(backgroundScript.generateAdvice(
        'software-engineer',
        'invalid-model',
        'Test message'
      )).rejects.toThrow('Specialist or model not found');
    });
  });

  describe('Keyword Extraction', () => {
    test('should extract meaningful keywords from user message', () => {
      // Arrange
      const message = 'How do I implement error handling in React components with proper logging?';
      
      // Act
      const keywords = backgroundScript.extractKeywords(message);
      
      // Assert
      expect(keywords).toContain('implement');
      expect(keywords).toContain('error');
      expect(keywords).toContain('handling');
      expect(keywords).toContain('react');
      expect(keywords).toContain('components');
      expect(keywords).not.toContain('the');
      expect(keywords).not.toContain('in');
    });

    test('should handle empty or short messages', () => {
      // Act & Assert
      expect(backgroundScript.extractKeywords('')).toEqual([]);
      expect(backgroundScript.extractKeywords('hi')).toEqual([]);
      expect(backgroundScript.extractKeywords('how')).toEqual([]);
    });

    test('should filter common words correctly', () => {
      // Arrange
      const message = 'The quick brown fox jumps over the lazy dog with great speed';
      
      // Act
      const keywords = backgroundScript.extractKeywords(message);
      
      // Assert
      expect(keywords).not.toContain('the');
      expect(keywords).not.toContain('with');
      expect(keywords).not.toContain('over');
      expect(keywords).toContain('quick');
      expect(keywords).toContain('brown');
    });
  });

  describe('Command Handling', () => {
    test('should handle toggle_interface command', () => {
      // Arrange
      const commandListener = chromeMocks.chrome.commands.onCommand.addListener.getCall(0).args[0];
      
      // Act
      commandListener('toggle_interface');
      
      // Assert
      expect(chromeMocks.chrome.tabs.query).toHaveBeenCalled();
    });

    test('should send toggle message to all tabs', () => {
      // Arrange
      const testTabs = [{ id: 1 }, { id: 2 }, { id: 3 }];
      chromeMocks.chrome.tabs.query.callsFake((query, callback) => {
        callback(testTabs);
      });
      const commandListener = chromeMocks.chrome.commands.onCommand.addListener.getCall(0).args[0];
      
      // Act
      commandListener('toggle_interface');
      
      // Assert
      expect(chromeMocks.chrome.tabs.sendMessage).toHaveBeenCalledTimes(3);
      testTabs.forEach(tab => {
        expect(chromeMocks.chrome.tabs.sendMessage).toHaveBeenCalledWith(
          tab.id,
          { action: 'toggleInterface' }
        );
      });
    });
  });

  describe('Extension Installation', () => {
    test('should set default preferences on installation', async () => {
      // Arrange
      const installListener = chromeMocks.chrome.runtime.onInstalled.addListener.getCall(0).args[0];
      
      // Act
      await installListener({ reason: 'install' });
      
      // Assert
      expect(chromeMocks.chrome.storage.local.set).toHaveBeenCalledWith({
        [testStorageKeys.USER_PREFERENCES]: expect.objectContaining({
          position: { x: 20, y: 20 },
          size: { width: 400, height: 600 },
          isVisible: false
        })
      });
    });

    test('should reload data on extension update', async () => {
      // Arrange
      const installListener = chromeMocks.chrome.runtime.onInstalled.addListener.getCall(0).args[0];
      fetch.mockResolvedValue({
        json: async () => ({ specialists: testSpecialists, models: testModels })
      });
      
      // Act
      await installListener({ reason: 'update' });
      
      // Assert
      expect(fetch).toHaveBeenCalledTimes(2); // For specialists and models
    });
  });

  describe('Error Handling', () => {
    test('should handle storage errors gracefully during data loading', async () => {
      // Arrange
      chromeMocks.mockStorageError('Quota exceeded');
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Act & Assert - should not throw
      await expect(backgroundScript.loadUserData()).resolves.toBeUndefined();
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    test('should handle network errors during file loading', async () => {
      // Arrange
      chromeMocks.mockStorageWithData({});
      fetch.mockRejectedValueOnce(new Error('Network error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Act & Assert - should not throw
      await expect(backgroundScript.loadSpecialistsData()).resolves.toBeUndefined();
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });
});