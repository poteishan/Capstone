// Drag functionality - fixed version
// function makeDraggable(element, note) {
//     let isDragging = false;
//     let startX, startY, initialX, initialY;

//     const header = element.querySelector('.note-header');
//     header.addEventListener('mousedown', startDrag);

    // function startDrag(e) {
    //     // Only respond to left mouse button
    //     if (e.button !== 0) return;

    //     isDragging = true;
    //     startX = e.clientX;
    //     startY = e.clientY;
    //     initialX = parseFloat(element.style.left) || 0;
    //     initialY = parseFloat(element.style.top) || 0;

    //     // Add dragging class for visual feedback
    //     element.classList.add('dragging');

    //     document.addEventListener('mousemove', drag);
    //     document.addEventListener('mouseup', stopDrag);
    // }

    // function drag(e) {
    //     if (!isDragging) return;
    //     e.preventDefault();

    //     const dx = e.clientX - startX;
    //     const dy = e.clientY - startY;

    //     element.style.left = `${initialX + dx}px`;
    //     element.style.top = `${initialY + dy}px`;
    // }

    // function stopDrag() {
    //     if (!isDragging) return;
    //     isDragging = false;
    //     element.classList.remove('dragging');

    //     // Update note position
    //     note.x = parseFloat(element.style.left);
    //     note.y = parseFloat(element.style.top);
    //     saveNote(note);

    //     document.removeEventListener('mousemove', drag);
    //     document.removeEventListener('mouseup', stopDrag);
    // }
// }

// Create floating note with editable title
function createFloatingNote(note) {
    const noteEl = document.createElement('div');
    noteEl.className = 'floating-note';
    noteEl.style.left = `${note.x}px`;
    noteEl.style.top = `${note.y}px`;
    noteEl.style.width = '230px';
    noteEl.style.minHeight = '230px';

    noteEl.innerHTML = `
        <div class="note-header">
            <input type="text" 
                   class="note-title" 
                   value="${note.title || 'New Note'}" 
                   maxlength="50"
                   aria-label="Note title">
             <button class="close-btn" aria-label="Close note">×</button>
        </div>
        <div class="note-content" 
             contenteditable="true" 
             aria-label="Note content">${note.content}</div>
    `;

    // In createFloatingNote function, update the drag implementation:
    // ... existing code ...

    // Drag implementation - fixed version
    let isDragging = false;
    let startX, startY;

    const header = noteEl.querySelector('.note-header');
    header.addEventListener('mousedown', startDrag);

    function startDrag(e) {
        if (e.button !== 0) return;

        isDragging = true;
        startX = e.clientX - noteEl.getBoundingClientRect().left;
        startY = e.clientY - noteEl.getBoundingClientRect().top;

        noteEl.classList.add('dragging');
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', stopDrag);
    }

    function drag(e) {
        if (!isDragging) return;

        const newX = e.clientX - startX;
        const newY = e.clientY - startY;

        // Apply boundaries
        const maxX = window.innerWidth - noteEl.offsetWidth;
        const maxY = window.innerHeight - noteEl.offsetHeight;

        noteEl.style.left = `${Math.max(0, Math.min(maxX, newX))}px`;
        noteEl.style.top = `${Math.max(0, Math.min(maxY, newY))}px`;
    }

    function stopDrag() {
        if (!isDragging) return;
        isDragging = false;
        noteEl.classList.remove('dragging');

        note.x = parseFloat(noteEl.style.left);
        note.y = parseFloat(noteEl.style.top);
        saveNote(note);

        document.removeEventListener('mousemove', drag);
        document.removeEventListener('mouseup', stopDrag);
    }

    // Title handling
    const titleInput = noteEl.querySelector('.note-title');
    titleInput.addEventListener('input', () => {
        note.title = titleInput.value.trim() || 'New Note';
        saveNote(note);
    });

    // Content handling
    const contentEl = noteEl.querySelector('.note-content');
    contentEl.addEventListener('input', () => {
        note.content = contentEl.innerHTML;
        saveNote(note);
    });

    // Close button
    noteEl.querySelector('.close-btn').addEventListener('click', () => {
        noteEl.remove();
        chrome.storage.local.get(['notes'], ({ notes = [] }) => {
            const filteredNotes = notes.filter(n => n.id !== note.id);
            chrome.storage.local.set({ notes: filteredNotes });
        });
    });

    // Make draggable
    makeDraggable(noteEl, note);

    // Focus title on new notes
    if (!note.title) {
        setTimeout(() => titleInput.focus(), 50);
    }

    return noteEl;
}

// Save note function
function saveNote(note) {
    chrome.storage.local.get(['notes'], (result) => {
        const notes = result.notes || [];
        const existingIndex = notes.findIndex(n => n.id === note.id);

        if (existingIndex >= 0) {
            notes[existingIndex] = note;
        } else {
            notes.push(note);
        }

        chrome.storage.local.set({ notes });
    });
}

function loadNotes() {
    chrome.storage.local.get(['notes'], (result) => {
        (result.notes || []).forEach(note => {
            const noteEl = createFloatingNote(note);
            document.body.appendChild(noteEl);
        });
    });
}

// Load existing notes on init
document.addEventListener('DOMContentLoaded', loadNotes);

// New note creation handler
document.getElementById('newNote').addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        // Check if valid tab exists
        if (chrome.runtime.lastError || !tabs[0]?.id) {
            console.error("No active tab found");
            return;
        }

        const noteId = Date.now().toString();
        const newNote = {
            id: noteId,
            title: '',
            content: '',
            x: 100,
            y: 100,
            date: new Date().toLocaleString()
        };

        // Save and inject note into webpage
        chrome.storage.local.get({ notes: [] }, ({ notes }) => {
            const updatedNotes = [...notes, newNote];
            chrome.storage.local.set({ notes: updatedNotes }, () => {
                chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    func: (note) => {
                        // Ensure createFloatingNote exists in content script
                        if (window.createFloatingNote) {
                            const noteEl = createFloatingNote(note);
                            document.body.appendChild(noteEl);
                        }
                    },
                    args: [newNote]
                });
            });
        });
    });
});
