{
  "manifest_version": 3,
  "name": "AWS Account Colorizer",
  "version": "1.0",
  "description": "AWS Consoleのアカウント ID に基づいてヘッダーの色とタブのタイトルを変更します",
  "permissions": ["storage"],
  "host_permissions": ["*://*.console.aws.amazon.com/*"],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "images/icon16.png",
      "48": "images/icon48.png",
      "128": "images/icon128.png"
    }
  },
  "content_scripts": [
    {
      "matches": ["*://*.console.aws.amazon.com/*"],
      "js": ["content.js"]
    }
  ],
  "icons": {
    "16": "images/icon16.png",
    "48": "images/icon48.png",
    "128": "images/icon128.png"
  }
}
