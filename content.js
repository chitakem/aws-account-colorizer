(function() {
  'use strict';
  
  // Constants for AWS Console selectors and patterns
  const AWS_ACCOUNT_SELECTOR = '[data-testid="awsc-nav-account-menu-button"]';
  const AWS_HEADER_SELECTOR = '#awsc-navigation-container';
  const AWS_HEADER_NAV_SELECTOR = '.globalNav';
  const AWS_ACCOUNT_ID_PATTERN = /(\d{12})/;
  const MAX_RETRY_ATTEMPTS = 5;
  const RETRY_DELAY_MS = 1000;

  
  let retryCount = 0;
  let currentAccountId = null;
  
  /**
   * Extract AWS account ID from the navigation menu
   * @returns {string|null} The account ID or null if not found
   */
  function extractAwsAccountId() {
    const navElement = document.querySelector(AWS_ACCOUNT_SELECTOR);
    if (!navElement) {
      return null;
    }
    
    const navText = navElement.textContent || '';
    const accountMatch = navText.match(AWS_ACCOUNT_ID_PATTERN);
    
    return accountMatch ? accountMatch[1] : null;
  }

  /**
   * Safely apply a background color to the AWS console header
   * @param {string} colorHexCode - The color to apply in hex format
   * @returns {boolean} Whether the operation was successful
   */
  function applyHeaderColor(colorHexCode) {
    if (!colorHexCode || typeof colorHexCode !== 'string' || !colorHexCode.match(/^#[0-9A-Fa-f]{6}$/)) {
      console.warn('AWS Account Colorizer: Invalid color format', colorHexCode);
      return false;
    }
    
    const headerElement = document.querySelector(AWS_HEADER_SELECTOR);
    if (!headerElement) {
      return false;
    }
    
    // ヘッダーの背景色を変更
    headerElement.style.backgroundColor = colorHexCode;
    return true;
  }

  /**
   * Update the browser tab title with account information
   * @param {string} displayName - The friendly name for the account
   * @param {string} accountId - The AWS account ID
   */
  function updateTabTitle(displayName, accountId) {
    if (!displayName) {
      return;
    }
    
    const sanitizedDisplayName = displayName.replace(/[<>]/g, '');
    // アカウントIDを表示せず、表示名のみシンプルに表示
    document.title = `${sanitizedDisplayName} - AWS`;
  }

  /**
   * Update the AWS console header to include account name
   * @param {string} displayName - The friendly name for the account
   * @param {string} color - The background color for the header
   */
  function updateHeaderWithTitle(displayName, color) {
    if (!displayName) {
      return;
    }
    
    // ヘッダーの色を変更
    const headerElement = document.querySelector(AWS_HEADER_SELECTOR);
    if (!headerElement) {
      return;
    }
    
    headerElement.style.backgroundColor = color;
    
    // 既存のタイトル要素があるか確認し、なければ作成
    let titleElement = document.getElementById('aws-colorizer-title');
    if (!titleElement) {
      titleElement = document.createElement('div');
      titleElement.id = 'aws-colorizer-title';
      
      // スタイルを設定
      titleElement.style.position = 'absolute';
      titleElement.style.left = '50%';
      titleElement.style.top = '50%';
      titleElement.style.transform = 'translate(-50%, -50%)';
      titleElement.style.fontWeight = 'bold';
      titleElement.style.fontSize = '18px';
      titleElement.style.zIndex = '1000';
      
      // コントラストを確保するためのテキスト色を決定（背景色に基づく）
      const isLightColor = isColorLight(color);
      titleElement.style.color = isLightColor ? '#232F3E' : '#FFFFFF';
      
      // AWSナビゲーションの内部に追加
      const navElement = headerElement.querySelector(AWS_HEADER_NAV_SELECTOR) || headerElement;
      navElement.style.position = 'relative'; // 親要素に相対配置を設定
      navElement.appendChild(titleElement);
    } else {
      // 既存要素の場合は色だけ更新
      const isLightColor = isColorLight(color);
      titleElement.style.color = isLightColor ? '#232F3E' : '#FFFFFF';
    }
    
    // タイトルを設定
    titleElement.textContent = displayName;
  }
  
  /**
   * 色の明るさを判定し、明るい色かどうかを返す
   * @param {string} color - 16進数カラーコード (#RRGGBB)
   * @returns {boolean} 明るい色の場合はtrue
   */
  function isColorLight(color) {
    // カラーコードからRGB値を抽出
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // 輝度を計算 (YIQ式)
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    
    // 輝度が128以上なら明るい色とみなす
    return brightness >= 128;
  }

  /**
   * Process account information and apply visual changes
   * @param {Object} accountConfig - The account configuration
   * @param {string} currentAccountId - The detected AWS account ID
   */
  function applyAccountCustomizations(accountConfig, currentAccountId) {
    if (!accountConfig || !currentAccountId) {
      return;
    }
    
    // 背景色を適用
    applyHeaderColor(accountConfig.color);
    
    // タブタイトルを更新
    updateTabTitle(accountConfig.displayName, currentAccountId);
    
    // ヘッダーにタイトルを追加
    updateHeaderWithTitle(accountConfig.displayName, accountConfig.color);
  }

  /**
   * Main processing function
   */
  function processAwsConsole() {
    const detectedAccountId = extractAwsAccountId();
    
    if (!detectedAccountId) {
      if (retryCount < MAX_RETRY_ATTEMPTS) {
        retryCount++;
        setTimeout(processAwsConsole, RETRY_DELAY_MS);
      }
      return;
    }
    
    // Reset retry counter after successful detection
    retryCount = 0;
    
    // Don't reprocess if account ID hasn't changed
    if (detectedAccountId === currentAccountId) {
      return;
    }
    
    currentAccountId = detectedAccountId;
    
    // Retrieve stored account configurations
    chrome.storage.sync.get('accounts', function(data) {
      if (chrome.runtime.lastError) {
        console.error('AWS Account Colorizer: Error loading configurations', chrome.runtime.lastError);
        return;
      }
      
      const accountConfigs = data.accounts || [];
      const matchingAccount = accountConfigs.find(acc => acc.accountId === detectedAccountId);
      
      if (matchingAccount) {
        applyAccountCustomizations(matchingAccount, detectedAccountId);
      }
    });
  }

  // Set up a more targeted mutation observer that only triggers on relevant changes
  const awsConsoleObserver = new MutationObserver(function(mutations) {
    // Debounce the processing to avoid excessive calls
    if (window.awsColorizerTimeout) {
      clearTimeout(window.awsColorizerTimeout);
    }
    
    window.awsColorizerTimeout = setTimeout(processAwsConsole, 250);
  });

  // Start the observer with more focused monitoring
  awsConsoleObserver.observe(document.body, { 
    childList: true,
    subtree: true,
    attributeFilter: ['data-testid'],  // Only watch for attribute changes that might indicate account changes
    attributes: true
  });

  // Initial processing
  processAwsConsole();
})();