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
    console.log('Sending pending notes:', pendingNotes.length);

    // Send each note individually
    pendingNotes.forEach(note => {
      chrome.scripting.executeScript({
        target: { tabId: appTabId },
        func: (note) => {
          window.postMessage({
            source: 'sticky-notes-extension',
            action: "SAVE_NOTE",
            note: note
          }, "https://capstone-sigma-eight.vercel.app");
        },
        args: [note]
      }, () => {
        // Remove from pending regardless of success
        pendingNotes = pendingNotes.filter(n => n.id !== note.id);
        chrome.storage.local.set({ pendingNotes });
      });
    });
  }
}

// Handle communication
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "saveNoteToApp") {
    const note = request.note;

    if (appTabId) {
      chrome.scripting.executeScript({
        target: { tabId: appTabId },
        func: (note) => {
          window.postMessage({
            source: 'sticky-notes-extension',
            action: "SAVE_NOTE",
            note: note
          }, "https://capstone-sigma-eight.vercel.app");
        },
        args: [note]
      }, () => {
        if (chrome.runtime.lastError) {
          saveAsPending(note);
          sendResponse({ success: false });
        } else {
          sendResponse({ success: true });
        }
      });

      return true; // Keep message channel open
    } else {
      saveAsPending(note);
      sendResponse({ success: false });
      return true;
    }
  }
  return true;
});

function saveAsPending(note) {
  // Remove if already exists
  pendingNotes = pendingNotes.filter(n => n.id !== note.id);
  pendingNotes.push(note);
  chrome.storage.local.set({ pendingNotes });
}
