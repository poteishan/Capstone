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
      chrome.tabs.sendMessage(appTabId, {
        source: 'sticky-notes-extension',
        action: "SAVE_NOTE",
        note: note
      }, (response) => {
        if (response && response.success) {
          console.log('Pending note saved:', note.id);
          // Remove from pending
          pendingNotes = pendingNotes.filter(n => n.id !== note.id);
          chrome.storage.local.set({ pendingNotes });
        }
      });
    });
  }
}

// Handle communication
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "saveNoteToApp") {
    const note = request.note;
    
    if (appTabId) {
      console.log('App is open, sending note immediately:', note.id);
      
      chrome.tabs.sendMessage(appTabId, {
        source: 'sticky-notes-extension',
        action: "SAVE_NOTE",
        note: note
      }, (response) => {
        if (response && response.success) {
          console.log('Note saved successfully:', note.id);
          sendResponse({ success: true });
        } else {
          console.warn('App did not respond, saving as pending');
          saveAsPending(note);
          sendResponse({ success: false });
        }
      });
      
      return true; // Keep message channel open
    } else {
      console.log('App not open, saving as pending:', note.id);
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
