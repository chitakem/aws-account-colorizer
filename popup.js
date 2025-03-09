(function() {
  'use strict';
  
  // DOM elements
  let accountsContainerEl;
  let addAccountButtonEl;
  let saveButtonEl;
  
  // Constants
  const AWS_ACCOUNT_ID_PATTERN = /^\d{12}$/;
  const DEFAULT_COLOR = '#FF9900';
  const STATUS_DISPLAY_TIME_MS = 3000;
  
  /**
   * Initialize popup UI and event handlers
   */
  function initializePopup() {
    accountsContainerEl = document.getElementById('accounts-container');
    addAccountButtonEl = document.getElementById('add-account');
    saveButtonEl = document.getElementById('save');
    
    if (!accountsContainerEl || !addAccountButtonEl || !saveButtonEl) {
      showStatusMessage('UI初期化エラー', true);
      return;
    }
    
    // Load existing configurations
    loadAccountConfigurations();
    
    // Set up event handlers
    addAccountButtonEl.addEventListener('click', handleAddAccount);
    saveButtonEl.addEventListener('click', handleSaveConfigurations);
  }
  
  /**
   * Load saved account configurations from storage
   */
  function loadAccountConfigurations() {
    chrome.storage.sync.get('accounts', function(data) {
      if (chrome.runtime.lastError) {
        showStatusMessage('設定の読み込みに失敗しました', true);
        console.error('Failed to load account configurations:', chrome.runtime.lastError);
        return;
      }
      
      const accountConfigs = data.accounts || [];
      renderAccountList(accountConfigs);
    });
  }
  
  /**
   * Handle adding a new account entry
   */
  function handleAddAccount() {
    addAccountEntryToUI();
    setupAccountEntryEventHandlers();
  }
  
  /**
   * Handle saving all account configurations
   */
  function handleSaveConfigurations() {
    const validatedConfigs = collectAndValidateAccountConfigs();
    
    if (validatedConfigs.length === 0) {
      showStatusMessage('保存するデータがありません。少なくとも1つのアカウントを設定してください。', true);
      return;
    }
    
    saveAccountConfigurations(validatedConfigs);
  }
  
  /**
   * Collect and validate account configurations from the UI
   * @returns {Array} Array of validated account configurations
   */
  function collectAndValidateAccountConfigs() {
    const accountEntries = document.querySelectorAll('.account-entry');
    const validConfigs = [];
    let hasInvalidEntries = false;
    
    accountEntries.forEach(entry => {
      const accountIdEl = entry.querySelector('.account-id');
      const displayNameEl = entry.querySelector('.account-name');
      const colorEl = entry.querySelector('.account-color');
      
      if (!accountIdEl || !displayNameEl || !colorEl) {
        return;
      }
      
      const accountId = accountIdEl.value.trim();
      const displayName = displayNameEl.value.trim();
      const color = colorEl.value;
      
      // Validate account ID format
      if (accountId && !AWS_ACCOUNT_ID_PATTERN.test(accountId)) {
        accountIdEl.classList.add('invalid-input');
        hasInvalidEntries = true;
        return;
      } else {
        accountIdEl.classList.remove('invalid-input');
      }
      
      // Skip empty entries
      if (!accountId || !displayName) {
        return;
      }
      
      // Check for duplicate account IDs
      if (validConfigs.some(config => config.accountId === accountId)) {
        accountIdEl.classList.add('invalid-input');
        hasInvalidEntries = true;
        return;
      }
      
      validConfigs.push({
        accountId: accountId,
        displayName: sanitizeInput(displayName),
        color: validateColor(color)
      });
    });
    
    if (hasInvalidEntries) {
      showStatusMessage('入力に誤りがあります。アカウントIDは12桁の数字で、重複はできません。', true);
      return [];
    }
    
    return validConfigs;
  }
  
  /**
   * Sanitize user input to prevent XSS
   * @param {string} input - The input to sanitize
   * @returns {string} Sanitized input
   */
  function sanitizeInput(input) {
    return input.replace(/[<>&"']/g, function(match) {
      switch (match) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '"': return '&quot;';
        case "'": return '&#x27;';
        default: return match;
      }
    });
  }
  
  /**
   * Validate and normalize color input
   * @param {string} color - The color to validate
   * @returns {string} Valid color or default
   */
  function validateColor(color) {
    if (!color || !/^#[0-9A-Fa-f]{6}$/.test(color)) {
      return DEFAULT_COLOR;
    }
    return color;
  }
  
  /**
   * Save account configurations to Chrome storage
   * @param {Array} configurations - The configurations to save
   */
  function saveAccountConfigurations(configurations) {
    chrome.storage.sync.set({accounts: configurations}, function() {
      if (chrome.runtime.lastError) {
        showStatusMessage('設定の保存に失敗しました', true);
        console.error('Failed to save configurations:', chrome.runtime.lastError);
        return;
      }
      
      showStatusMessage('設定を保存しました');
    });
  }
  
  /**
   * Render the list of account configurations in the UI
   * @param {Array} accountConfigs - The account configurations to render
   */
  function renderAccountList(accountConfigs) {
    // Clear existing content
    accountsContainerEl.innerHTML = '';
    
    if (!accountConfigs || accountConfigs.length === 0) {
      addAccountEntryToUI();
      return;
    }
    
    // Add each account configuration to the UI
    accountConfigs.forEach(config => {
      addAccountEntryToUI(
        config.accountId,
        config.displayName,
        config.color
      );
    });
    
    setupAccountEntryEventHandlers();
  }
  
  /**
   * Add an account entry to the UI
   * @param {string} accountId - Optional account ID for existing entries
   * @param {string} displayName - Optional display name for existing entries
   * @param {string} color - Optional color for existing entries
   */
  function addAccountEntryToUI(accountId = '', displayName = '', color = DEFAULT_COLOR) {
    const accountEntryEl = document.createElement('div');
    accountEntryEl.className = 'account-entry';
    
    // Use safer DOM methods instead of innerHTML
    const accountIdInput = document.createElement('input');
    accountIdInput.type = 'text';
    accountIdInput.className = 'account-id';
    accountIdInput.placeholder = 'アカウント ID';
    accountIdInput.value = accountId;
    accountIdInput.maxLength = 12;
    accountIdInput.pattern = '\\d{12}';
    accountIdInput.title = 'アカウントIDは12桁の数字です';
    
    const displayNameInput = document.createElement('input');
    displayNameInput.type = 'text';
    displayNameInput.className = 'account-name';
    displayNameInput.placeholder = '表示名';
    displayNameInput.value = displayName;
    displayNameInput.maxLength = 50;
    
    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.className = 'account-color';
    colorInput.value = color;
    
    const removeButton = document.createElement('button');
    removeButton.className = 'remove-account';
    removeButton.textContent = '削除';
    
    accountEntryEl.appendChild(accountIdInput);
    accountEntryEl.appendChild(displayNameInput);
    accountEntryEl.appendChild(colorInput);
    accountEntryEl.appendChild(removeButton);
    
    accountsContainerEl.appendChild(accountEntryEl);
  }
  
  /**
   * Set up event handlers for account entry elements
   */
  function setupAccountEntryEventHandlers() {
    const removeButtons = document.querySelectorAll('.remove-account');
    removeButtons.forEach(button => {
      // Remove existing event listeners to prevent duplicates
      const newButton = button.cloneNode(true);
      button.parentNode.replaceChild(newButton, button);
      
      newButton.addEventListener('click', function(event) {
        const entryEl = event.target.closest('.account-entry');
        if (entryEl) {
          entryEl.remove();
        }
      });
    });
    
    // Add input validation for account IDs
    const accountIdInputs = document.querySelectorAll('.account-id');
    accountIdInputs.forEach(input => {
      input.addEventListener('input', function() {
        if (this.value && !AWS_ACCOUNT_ID_PATTERN.test(this.value)) {
          this.classList.add('invalid-input');
        } else {
          this.classList.remove('invalid-input');
        }
      });
    });
  }
  
  /**
   * Display a status message to the user
   * @param {string} message - The message to display
   * @param {boolean} isError - Whether this is an error message
   */
  function showStatusMessage(message, isError = false) {
    // Check if status element exists, create if not
    let statusEl = document.getElementById('status-message');
    if (!statusEl) {
      statusEl = document.createElement('div');
      statusEl.id = 'status-message';
      document.body.appendChild(statusEl);
    }
    
    statusEl.textContent = message;
    statusEl.className = isError ? 'error-message' : 'success-message';
    statusEl.style.display = 'block';
    
    // Auto-hide the message after a delay
    setTimeout(() => {
      statusEl.style.display = 'none';
    }, STATUS_DISPLAY_TIME_MS);
  }
  
  // Initialize the popup when the DOM is fully loaded
  document.addEventListener('DOMContentLoaded', initializePopup);
})();