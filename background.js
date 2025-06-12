const APP_DOMAIN = "https://capstone-sigma-eight.vercel.app/";
let appTabId = null;
let pendingNotes = [];

// Load pending notes on startup
chrome.storage.local.get(['pendingNotes'], (result) => {
  pendingNotes = result.pendingNotes || [];
});

// Track when website is opened
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.url && tab.url.includes(APP_DOMAIN)) {
    if (changeInfo.status === 'complete') {
      appTabId = tabId;
      console.log('App tab detected:', tabId);
      sendPendingNotes();
    }
  }
});

// Clear reference when website is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === appTabId) {
    appTabId = null;
    console.log('App tab closed');
  }
});

// Send pending notes to app
function sendPendingNotes() {
  if (pendingNotes.length > 0 && appTabId) {
    chrome.tabs.sendMessage(
      appTabId,
      {
        action: "processPendingNotes",
        pendingNotes: pendingNotes
      },
      () => {
        pendingNotes = [];
        chrome.storage.local.set({ pendingNotes });
      }
    );
  }
}
// Handle communication
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "saveNoteToApp") {
    const note = request.note;

    if (appTabId) {
      chrome.tabs.sendMessage(
        appTabId,
        {
          action: "SAVE_NOTE_RELAY",
          note: note
        },
        (response) => {
          if (chrome.runtime.lastError) {
            saveAsPending(note);
            sendResponse({ success: false });
          } else {
            sendResponse({ success: true });
          }
        }
      );
    } else {
      saveAsPending(note);
      sendResponse({ success: false });
    }
    return true; // Keep message channel open
  }
});

function saveAsPending(note) {
  // Remove if already exists
  pendingNotes = pendingNotes.filter(n => n.id !== note.id);
  pendingNotes.push(note);
  chrome.storage.local.set({ pendingNotes });
}
