const APP_DOMAIN = "https://capstone-sigma-eight.vercel.app/";
let appTabId = null;

// Track when the website is opened
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.url && tab.url.includes(APP_DOMAIN)) {
    if (changeInfo.status === 'complete') {
      appTabId = tabId;
    }
  }
});

// Clear reference when website is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === appTabId) {
    appTabId = null;
  }
});

// Handle communication between extension and website
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "checkAppOpen") {
    sendResponse({isOpen: appTabId !== null});
  } 
  else if (request.action === "saveNoteToApp" && appTabId) {
    // Forward note to website tab
    chrome.tabs.sendMessage(appTabId, {
      source: 'sticky-notes-extension', // Add source identifier
      action: "SAVE_NOTE",
      note: request.note
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
        sendResponse({ success: false });
      } else {
        sendResponse({ success: true });
      }
    });
    return true; // Keep the message channel open
  }
  return true;
});
