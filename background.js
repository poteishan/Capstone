// Update this line with your actual domain
const APP_DOMAIN = "https://capstone-sigma-eight.vercel.app/";

let appTabId = null;

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.url.includes(APP_DOMAIN)) {
    if (changeInfo.status === 'complete') {
      appTabId = tabId;
    }
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === appTabId) {
    appTabId = null;
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "saveNoteToApp") {
    if (appTabId !== null) {
      chrome.tabs.sendMessage(appTabId, {
        action: "SAVE_NOTE_FROM_EXTENSION",
        note: request.note
      });
    }
  }
  return true;
});
