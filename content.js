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
      console.warn('AWS Account Colorizer: No display name provided for tab title update');
      return;
    }
    
    const sanitizedDisplayName = sanitizeInput(displayName);
    const formattedTitle = `${sanitizedDisplayName} - AWS`;
    
    // 既存のタイマーを解除
    if (titleUpdateTimer) {
      clearTimeout(titleUpdateTimer);
    }
    
    // タブタイトルを更新
    setDocumentTitle(formattedTitle);
    
    // AWS ConsoleのSPAでは頻繁にタイトルが変わるため、遅延してもう一度適用
    titleUpdateTimer = setTimeout(() => {
      setDocumentTitle(formattedTitle);
      
      // さらに短い間隔でもう一度確認
      setTimeout(() => {
        if (document.title !== formattedTitle) {
          setDocumentTitle(formattedTitle);
        }
      }, 200);
    }, TITLE_UPDATE_DELAY_MS);
  }
  
  /**
   * セキュアにドキュメントタイトルを設定
   * @param {string} title - 設定するタイトル
   */
  function setDocumentTitle(title) {
    try {
      if (document.title !== title) {
        document.title = title;
      }
    } catch (e) {
      console.error('AWS Account Colorizer: Error setting document title', e);
    }
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
      console.warn('AWS Account Colorizer: Header element not found');
      return;
    }
    
    headerElement.style.backgroundColor = color;
    
    // 既存のタイトル要素があるか確認し、なければ作成
    let titleElement = document.getElementById('aws-colorizer-title');
    if (!titleElement) {
      titleElement = document.createElement('div');
      titleElement.id = 'aws-colorizer-title';
      
      // コントラストを確保するためのテキスト色を決定（背景色に基づく）
      const isLightColor = isColorLight(color);
      titleElement.style.color = isLightColor ? '#232F3E' : '#FFFFFF';
      
      // AWSナビゲーションの内部に追加（複数の可能性のあるセレクタでターゲットを試みる）
      let navElement = null;
      const possibleSelectors = [
        '.globalNav',
        '#awsc-navigation__nav-elemenet-list',
        '#navbar',
        '#nav-menubar',
        '.nav-menu',
        '.awsc-nav'
      ];
      
      for (const selector of possibleSelectors) {
        navElement = headerElement.querySelector(selector);
        if (navElement) break;
      }
      
      // フォールバック：ナビゲーション要素が見つからない場合はヘッダー自体を使用
      const targetElement = navElement || headerElement;
      targetElement.style.position = 'relative'; // 親要素に相対配置を設定
      targetElement.appendChild(titleElement);
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
    
    console.log('AWS Account Colorizer: Applying customizations', {
      accountId: currentAccountId,
      displayName: accountConfig.displayName,
      color: accountConfig.color
    });
    
    // 背景色を適用
    applyHeaderColor(accountConfig.color);
    
    // タブタイトルを更新
    updateTabTitle(accountConfig.displayName, currentAccountId);
    
    // ヘッダーにタイトルを追加
    updateHeaderWithTitle(accountConfig.displayName, accountConfig.color);
  }

  /**
   * Main processing function for AWS console customization
   */
  function processAwsConsole() {
    const detectedAccountId = extractAwsAccountId();
    
    if (!detectedAccountId) {
      if (currentRetryCount < MAX_RETRY_ATTEMPTS) {
        currentRetryCount++;
        setTimeout(processAwsConsole, RETRY_DELAY_MS);
      } else {
        console.warn('AWS Account Colorizer: Failed to detect AWS account ID after multiple attempts');
      }
      return;
    }
    
    // Reset retry counter after successful detection
    currentRetryCount = 0;
    
    // Don't reprocess if account ID hasn't changed
    if (detectedAccountId === currentAccountId) {
      return;
    }
    
    console.log('AWS Account Colorizer: Detected account ID change', {
      previousId: currentAccountId, 
      newId: detectedAccountId
    });
    
    currentAccountId = detectedAccountId;
    
    // Retrieve stored account configurations
    loadAndApplyAccountSettings(detectedAccountId);
  }
  
  /**
   * Load account settings from storage and apply them
   * @param {string} accountId - The AWS account ID to look up
   */
  function loadAndApplyAccountSettings(accountId) {
    if (!accountId) return;
    
    chrome.storage.sync.get('accounts', function(data) {
      if (chrome.runtime.lastError) {
        console.error('AWS Account Colorizer: Error loading configurations', chrome.runtime.lastError);
        return;
      }
      
      const accountConfigs = data.accounts || [];
      const matchingAccount = accountConfigs.find(acc => acc.accountId === accountId);
      
      if (matchingAccount) {
        applyAccountCustomizations(matchingAccount, accountId);
      } else {
        console.log(`AWS Account Colorizer: No custom settings found for account ${accountId}`);
      }
    });
  }

  // Set up a more targeted mutation observer that also watches title changes
  const awsConsoleObserver = new MutationObserver(function(mutations) {
    try {
      // Debounce the processing to avoid excessive calls
      if (mutationDebounceTimer) {
        clearTimeout(mutationDebounceTimer);
      }
      
      mutationDebounceTimer = setTimeout(() => {
        // コンソールの変更に対応
        processAwsConsole();
        
        // タイトル変更の検知
        handleTitleChanges(mutations);
      }, MUTATION_DEBOUNCE_DELAY_MS);
    } catch (error) {
      console.error('AWS Account Colorizer: Error in mutation observer', error);
    }
  });
  
  /**
   * Handle title element changes in the DOM
   * @param {MutationRecord[]} mutations - The observed mutations
   */
  function handleTitleChanges(mutations) {
    const titleChanged = mutations.some(mutation => 
      (mutation.target && mutation.target.tagName === 'TITLE') || 
      (mutation.target === document.head && mutation.addedNodes && 
       Array.from(mutation.addedNodes).some(node => node.tagName === 'TITLE'))
    );
    
    if (titleChanged && currentAccountId) {
      loadAndApplyTitleUpdate(currentAccountId);
    }
  }
  
  /**
   * Load account settings and update the title
   * @param {string} accountId - The current account ID
   */
  function loadAndApplyTitleUpdate(accountId) {
    chrome.storage.sync.get('accounts', function(data) {
      if (chrome.runtime.lastError) {
        console.error('AWS Account Colorizer: Error reading account settings', chrome.runtime.lastError);
        return;
      }
      
      const accountConfigs = data.accounts || [];
      const matchingAccount = accountConfigs.find(acc => acc.accountId === accountId);
      
      if (matchingAccount) {
        updateTabTitle(matchingAccount.displayName, accountId);
      }
    });
  }

  // Start the observer with more focused monitoring
  awsConsoleObserver.observe(document.body, { 
    childList: true,
    subtree: true,
    attributeFilter: ['data-testid', 'title'],
    attributes: true
  });
  
  // タイトル要素も監視対象に追加
  if (document.querySelector('title')) {
    awsConsoleObserver.observe(document.querySelector('title'), {
      characterData: true,
      childList: true,
      subtree: true
    });
  }
  
  // head要素も監視（新しいtitle要素の追加を検知するため）
  awsConsoleObserver.observe(document.head, {
    childList: true
  });

  // Initial processing
  processAwsConsole();
})();
