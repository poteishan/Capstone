const FLOATING_NOTES_FOLDER_NAME = "Floating Notes";
const MAIN_FOLDER_NAME = "Main";

// Initialize data structure
let data = [];

// Currently selected folder id
let selectedFolderId = null;

// Generate unique id for new folders and notes
function generateId(prefix = 'id') {
    return prefix + '-' + Math.random().toString(36).substr(2, 9);
}

// Format datetime nicely
function formatDateTime(dateStr) {
    const date = new Date(dateStr);
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return date.toLocaleString(undefined, options);
}

// Save and Load data from localStorage for persistence
function saveData() {
    try {
        localStorage.setItem('stickyNotesData', JSON.stringify(data));
    } catch (error) {
        console.error('Error saving data:', error);
    }
}

function loadData() {
    try {
        const stored = localStorage.getItem('stickyNotesData');
        if (stored) {
            data = JSON.parse(stored);
        }
    } catch (error) {
        console.error('Error loading data:', error);
        data = [];
    }
}

// DOM Elements cache
const folderListDiv = document.getElementById('folder-list');
const folderTitleEl = document.getElementById('folder-title');
const notesContainer = document.getElementById('notes-container');
const addNoteBtn = document.getElementById('add-note-btn');
const newFolderBtn = document.getElementById('new-folder-btn');
const searchInput = document.getElementById('search-input');
const hamburger = document.getElementById('hamburger');
const sidebar = document.getElementById('sidebar');
const overlay = document.createElement('div');

// Setup overlay
overlay.className = 'overlay';
document.body.appendChild(overlay);

// Hamburger menu functionality
hamburger.addEventListener('click', () => {
    sidebar.classList.toggle('sidebar-visible');
    overlay.classList.toggle('sidebar-visible');
    hamburger.classList.toggle('active');
});

overlay.addEventListener('click', () => {
    sidebar.classList.remove('sidebar-visible');
    overlay.classList.remove('sidebar-visible');
    hamburger.classList.remove('active');
});

// Render folders list
function renderFolders() {
    folderListDiv.innerHTML = '';

    data.forEach(folder => {
        const div = document.createElement('div');
        let className = 'folder-item';
        if (folder.id === selectedFolderId) className += ' active';
        if (folder.isExtensionFolder) className += ' floating-notes';
        if (folder.isMainFolder) className += ' main-folder';
        div.className = className;

        const folderNameSpan = document.createElement('span');
        folderNameSpan.className = 'folder-name';
        folderNameSpan.textContent = folder.name;
        folderNameSpan.tabIndex = 0;
        folderNameSpan.setAttribute('role', 'listitem');
        folderNameSpan.setAttribute('aria-selected', folder.id === selectedFolderId ? 'true' : 'false');

        div.onclick = () => {
            selectedFolderId = folder.id;
            renderFolders();
            renderNotes();
            // Close sidebar on mobile after selection
            if (window.innerWidth <= 700) {
                sidebar.classList.remove('sidebar-visible');
                overlay.classList.remove('sidebar-visible');
                hamburger.classList.remove('active');
            }
        };

        folderNameSpan.onkeydown = (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                div.click();
            }
        };

        div.appendChild(folderNameSpan);

        // Delete button for folder (only if more than 1 folder and not Main folder)
        const canDelete = data.length > 1 && !folder.isMainFolder && !folder.isExtensionFolder;
        if (canDelete) {
            const delBtn = document.createElement('button');
            delBtn.className = 'folder-delete-btn';
            delBtn.title = 'Delete folder';
            delBtn.setAttribute('aria-label', 'Delete folder ' + folder.name);
            delBtn.textContent = '×';
            delBtn.onclick = (e) => {
                e.stopPropagation();
                if (confirm(`Are you sure you want to delete the folder "${folder.name}" and all its notes?`)) {
                    data = data.filter(f => f.id !== folder.id);
                    if (selectedFolderId === folder.id) {
                        selectedFolderId = data.length ? data[0].id : null;
                    }
                    renderFolders();
                    renderNotes();
                    saveData();
                }
            };
            div.appendChild(delBtn);
        }

        folderListDiv.appendChild(div);
    });
}

// Render notes for selected folder
function renderNotes() {
    if (!selectedFolderId) {
        folderTitleEl.textContent = 'Select a folder';
        notesContainer.innerHTML = '<div class="empty-state"><i class="fas fa-folder-open"></i><p>Select a folder to view notes</p></div>';
        addNoteBtn.disabled = true;
        return;
    }

    const folder = data.find(f => f.id === selectedFolderId);
    if (!folder) {
        folderTitleEl.textContent = 'Folder not found';
        notesContainer.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Folder not found</p></div>';
        addNoteBtn.disabled = true;
        return;
    }

    // Handle Main folder view
    if (folder.isMainFolder) {
        folderTitleEl.textContent = folder.name;
        addNoteBtn.disabled = true;

        // Collect all notes from all non-Main folders
        let allNotes = [];
        data.forEach(f => {
            if (!f.isMainFolder && f.notes) {
                allNotes = allNotes.concat(f.notes.map(note => ({ ...note, folderName: f.name })));
            }
        });

        // Filter notes based on search query
        const query = searchInput.value.toLowerCase();
        const filteredNotes = allNotes.filter(note => {
            return note.title.toLowerCase().includes(query) ||
                note.content.toLowerCase().includes(query);
        });

        notesContainer.innerHTML = '';

        if (filteredNotes.length === 0) {
            notesContainer.innerHTML = '<div class="empty-state"><i class="fas fa-sticky-note"></i><p>No notes found</p></div>';
            return;
        }

        filteredNotes.forEach(note => {
            const parentFolder = data.find(f => f.notes && f.notes.some(n => n.id === note.id));
            notesContainer.appendChild(createNoteElement(note, parentFolder));
        });
        return;
    }

    // Handle regular folder view
    folderTitleEl.textContent = folder.name;
    addNoteBtn.disabled = false;

    // Initialize notes array if it doesn't exist
    if (!folder.notes) {
        folder.notes = [];
    }

    // Filter notes based on search query
    const query = searchInput.value.toLowerCase();
    const filteredNotes = folder.notes.filter(note => {
        const safeTodos = Array.isArray(note.todos) ? note.todos : [];
        const safeBulletPoints = Array.isArray(note.bulletPoints) ? note.bulletPoints : [];

        return note.title.toLowerCase().includes(query) ||
            note.content.toLowerCase().includes(query) ||
            safeBulletPoints.some(bp => bp.toLowerCase().includes(query)) ||
            safeTodos.some(todo => todo.text && todo.text.toLowerCase().includes(query));
    });

    notesContainer.innerHTML = '';

    if (filteredNotes.length === 0) {
        if (folder.notes.length === 0) {
            notesContainer.innerHTML = '<div class="empty-state"><i class="fas fa-plus-circle"></i><p>No notes yet. Click "Add Note" to create your first note!</p></div>';
        } else {
            notesContainer.innerHTML = '<div class="empty-state"><i class="fas fa-search"></i><p>No notes match your search</p></div>';
        }
        return;
    }

    filteredNotes.forEach(note => {
        notesContainer.appendChild(createNoteElement(note, folder));
    });
}

// Create sticky note element with improved error handling
function createNoteElement(note, folder) {
    // Safely handle todos and bulletPoints with proper defaults
    const safeTodos = Array.isArray(note.todos) ? note.todos : [];
    const safeBulletPoints = Array.isArray(note.bulletPoints) ? note.bulletPoints : [];

    // Build content parts safely
    const contentParts = [
        note.content || '',
        ...safeTodos.map(t => `☐ ${t.text || ''}`),
        ...safeBulletPoints.map(b => `• ${b}`)
    ].filter(part => part.trim() !== '');

    const noteEl = document.createElement('article');
    noteEl.className = 'sticky-note';
    noteEl.style.backgroundColor = note.color || '#fffb82';
    noteEl.setAttribute('aria-label', `Note titled ${note.title}`);

    if (note.isExtensionNote) {
        noteEl.classList.add('floating-note-saved');
        const ribbon = document.createElement('div');
        ribbon.className = 'floating-note-ribbon';
        ribbon.innerHTML = '<i class="fas fa-cloud"></i> From Extension';
        noteEl.appendChild(ribbon);
    }

    // Create main header container
    const header = document.createElement('div');
    header.className = 'header';

    // Note title
    const titleEl = document.createElement('div');
    titleEl.className = 'note-title';
    titleEl.textContent = note.title || 'Untitled Note';
    titleEl.tabIndex = 0;
    titleEl.setAttribute('role', 'textbox');
    titleEl.setAttribute('aria-multiline', 'false');
    titleEl.setAttribute('aria-label', 'Note title, click to edit');
    titleEl.onclick = () => enableEditTitle(titleEl, note, folder);
    titleEl.onkeydown = e => {
        if (e.key === "Enter") {
            e.preventDefault();
            titleEl.blur();
        }
    };

    // Create secondary header (flex container)
    const header2 = document.createElement('div');
    header2.className = 'header2';

    // Date created
    const createdEl = document.createElement('div');
    createdEl.className = 'date created';
    createdEl.innerHTML = `<i class="far fa-clock"></i> ${formatDateTime(note.created)}`;

    // Like button container
    const likeBtnContainer = document.createElement('div');
    likeBtnContainer.className = 'likebtn';
    
    // Like button
    const likeBtn = document.createElement('button');
    likeBtn.className = 'like-btn';
    likeBtn.innerHTML = note.liked ? '<i class="fas fa-heart"></i>' : '<i class="far fa-heart"></i>';
    likeBtn.title = note.liked ? 'Unlike note' : 'Like note';
    likeBtn.setAttribute('aria-pressed', note.liked);
    likeBtn.onclick = () => {
        note.liked = !note.liked;
        likeBtn.innerHTML = note.liked ? '<i class="fas fa-heart"></i>' : '<i class="far fa-heart"></i>';
        likeBtn.setAttribute('aria-pressed', note.liked);
        likeBtn.title = note.liked ? 'Unlike note' : 'Like note';
        saveData();
    };
    likeBtnContainer.appendChild(likeBtn);

    // Options container
    const optionsContainer = document.createElement('div');
    optionsContainer.className = 'options';
    
    // Dropdown menu
    const dropdownContainer = document.createElement('div');
    dropdownContainer.className = 'note-dropdown';

    const dropBtn = document.createElement('button');
    dropBtn.className = 'note-dropbtn';
    dropBtn.innerHTML = '<i class="fas fa-ellipsis-v"></i>';
    dropBtn.setAttribute('aria-label', 'Note options');

    const dropdownContent = document.createElement('div');
    dropdownContent.className = 'note-dropdown-content';

    // Delete button for note
    const noteDelBtn = document.createElement('button');
    noteDelBtn.onclick = (e) => {
        e.stopPropagation();
        if (confirm(`Are you sure you want to delete the note "${note.title}"?`)) {
            folder.notes = folder.notes.filter(n => n.id !== note.id);
            renderNotes();
            saveData();
        }
    };

    // Color picker
    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.className = 'color-picker';
    colorInput.title = 'Change note color';
    colorInput.value = rgbToHex(note.color || '#fffb82');

    colorInput.oninput = (e) => {
        // Preserve existing transparency level
        const currentAlpha = note.color.includes('rgba') ?
            note.color.split(',')[3].replace(/[^0-9.]/g, '') || '0.15' :
            '0.15'; // Default glass alpha

        // Convert hex to RGBA for glass effect
        const hex = e.target.value;
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);

        note.color = `rgba(${r}, ${g}, ${b}, ${currentAlpha})`;
        noteEl.style.backgroundColor = note.color || 'rgba(255, 251, 130, 0.15)';
        noteEl.style.backdropFilter = 'blur(10px)';
        noteEl.style.border = '1px solid rgba(255, 255, 255, 0.2)';
        noteEl.style.borderRadius = '12px';
        noteEl.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.1)';
        saveData();
    };

    // Dropdown items
    const menuItems = [
        {
            text: '<i class="fas fa-expand-alt"></i> Expand',
            action: () => showExpandedNote(note, folder)
        },
        {
            text: '<i class="fas fa-share-alt"></i> Share',
            action: () => shareNote(note)
        },
        {
            text: '<i class="fas fa-palette"></i> Change color',
            action: () => colorInput.click()
        },
        {
            text: '<i class="fas fa-copy"></i> Duplicate',
            action: () => duplicateNote(note, folder)
        },
        {
            text: '<i class="fas fa-trash"></i> Delete',
            action: () => noteDelBtn.click(),
            className: 'delete-item'
        }
    ];

    menuItems.forEach(item => {
        const button = document.createElement('button');
        button.innerHTML = item.text;
        if (item.className) button.className = item.className;
        button.onclick = (e) => {
            e.stopPropagation();
            item.action();
            dropdownContent.classList.remove('show');
        };
        dropdownContent.appendChild(button);
    });

    // Toggle dropdown
    dropBtn.onclick = (e) => {
        e.stopPropagation();
        // Close other dropdowns first
        document.querySelectorAll('.note-dropdown-content.show').forEach(dropdown => {
            if (dropdown !== dropdownContent) {
                dropdown.classList.remove('show');
            }
        });
        dropdownContent.classList.toggle('show');
    };

    dropdownContainer.appendChild(dropBtn);
    dropdownContainer.appendChild(dropdownContent);
    optionsContainer.appendChild(dropdownContainer);

    // Build header structure
    header.appendChild(titleEl);
    header2.appendChild(createdEl);
    header2.appendChild(likeBtnContainer);
    header.appendChild(optionsContainer);
    noteEl.appendChild(header);
    noteEl.appendChild(header2);

    // Content area (editable)
    const contentEl = document.createElement('div');
    contentEl.className = 'note-content';
    contentEl.textContent = contentParts.join('\n');
    contentEl.tabIndex = 0;
    contentEl.setAttribute('role', 'textbox');
    contentEl.setAttribute('aria-multiline', 'true');
    contentEl.setAttribute('aria-label', 'Note content, click to edit');
    contentEl.onclick = () => enableEditContent(contentEl, note, folder);
    contentEl.oninput = () => {
        note.content = contentEl.textContent;
        saveData();
    };
    contentEl.onkeydown = (e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            document.execCommand('insertText', false, '  ');
        }
    };

    noteEl.appendChild(contentEl);

    // Editing functions
    function enableEditTitle(titleElement, note, folder) {
        titleElement.contentEditable = 'true';
        titleElement.focus();
        noteEl.classList.add('editing');

        const onBlur = () => {
            titleElement.contentEditable = 'false';
            const newTitle = titleElement.textContent.trim() || 'Untitled Note';
            titleElement.textContent = newTitle;
            note.title = newTitle;
            noteEl.classList.remove('editing');
            saveData();
            titleElement.removeEventListener('blur', onBlur);
        };
        titleElement.addEventListener('blur', onBlur);
    }

    function enableEditContent(contentElement, note, folder) {
        contentElement.contentEditable = 'true';
        contentElement.focus();
        noteEl.classList.add('editing');

        const onBlur = () => {
            contentElement.contentEditable = 'false';
            note.content = contentElement.textContent;
            noteEl.classList.remove('editing');
            saveData();
            contentElement.removeEventListener('blur', onBlur);
        };
        contentElement.addEventListener('blur', onBlur);
    }

    return noteEl;
}
// Utility functions
function shareNote(note) {
    const formattedText = noteToText(note);

    if (navigator.share) {
        navigator.share({
            title: `Note: ${note.title}`,
            text: formattedText
        }).catch(error => {
            console.log('Sharing failed:', error);
            copyToClipboardFallback(formattedText);
        });
    } else {
        copyToClipboardFallback(formattedText);
    }
}

function noteToText(note) {
    const sections = [];
    const safeTodos = Array.isArray(note.todos) ? note.todos : [];
    const safeBulletPoints = Array.isArray(note.bulletPoints) ? note.bulletPoints : [];

    sections.push(`📝 ${note.title}`);
    sections.push('━'.repeat(note.title.length + 2));

    if (note.content) sections.push(`\n${note.content}\n`);

    if (safeTodos.length > 0) {
        sections.push('\n✅ To-Dos:');
        safeTodos.forEach(todo => {
            sections.push(`▢ ${todo.done ? '✓' : ' '} ${todo.text || ''}`);
        });
    }

    if (safeBulletPoints.length > 0) {
        sections.push('\n🔹 Key Points:');
        sections.push(...safeBulletPoints.map(bp => `• ${bp}`));
    }

    sections.push('\n―――――――――――――――――――');
    sections.push(`🕒 Created: ${formatDateTime(note.created)}`);

    return sections.join('\n');
}

function copyToClipboardFallback(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('📋 Note copied to clipboard!');
    }).catch(() => {
        // Fallback for browsers that don't support clipboard API
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            showToast('📋 Note copied to clipboard!');
        } catch (err) {
            showToast('❌ Could not copy to clipboard');
        }
        document.body.removeChild(textArea);
    });
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 3000);
}

function duplicateNote(note, folder) {
    const newNote = JSON.parse(JSON.stringify(note));
    newNote.id = generateId('note');
    newNote.title = note.title + ' (Copy)';
    newNote.created = new Date().toISOString();
    // Ensure all required properties exist
    newNote.todos = Array.isArray(newNote.todos) ? newNote.todos : [];
    newNote.bulletPoints = Array.isArray(newNote.bulletPoints) ? newNote.bulletPoints : [];
    newNote.liked = false;

    folder.notes.push(newNote);
    renderNotes();
    saveData();
    showToast('📄 Note duplicated!');
}

function rgbToHex(color) {
    if (color.startsWith('#')) return color;

    // Improved regex to handle all CSS color formats
    const rgbaMatch = color.match(/(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(\s*,\s*[\d.]+)?/);
    if (!rgbaMatch) return '#fffb82'; // Glass-friendly default

    // Convert to hex with proper zero-padding
    return '#' + rgbaMatch.slice(1, 4).map(x => {
        const val = Math.min(255, Math.max(0, parseInt(x)));
        return val.toString(16).padStart(2, '0');
    }).join('');
}

function showExpandedNote(note, folder) {
    const overlay = document.createElement('div');
    overlay.className = 'expanded-overlay';

    const content = document.createElement('div');
    content.className = 'expanded-content';
    content.innerHTML = `
        <div class="expanded-header">
            <textarea class="editable-title" placeholder="Note title">${note.title || ''}</textarea>
            <button class="close-btn"><i class="fas fa-times"></i></button>
        </div>
        <div class="expanded-body">
            <textarea class="auto-expand-content" placeholder="Start typing...">${formatContentForEditing(note)}</textarea>
        </div>
        <div class="formatting-tools">
            <button class="format-btn bullet" title="Add bullet point"><i class="fas fa-list-ul"></i> Bullet</button>
            <button class="format-btn todo" title="Add todo item"><i class="fas fa-check-square"></i> Todo</button>
            <button class="format-btn bold" title="Bold text"><i class="fas fa-bold"></i> Bold</button>
        </div>
    `;

    const titleInput = content.querySelector('.editable-title');
    const contentInput = content.querySelector('.auto-expand-content');
    const saveBtn = document.createElement('button');
    saveBtn.className = 'save-btn';
    saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';

    // Auto-expanding textareas
    function autoExpand(field) {
        field.style.height = 'auto';
        field.style.height = field.scrollHeight + 'px';
    }

    [titleInput, contentInput].forEach(input => {
        input.addEventListener('input', () => autoExpand(input));
        autoExpand(input);
    });

    // Formatting handlers
    content.querySelector('.bullet').onclick = () => {
        insertAtCursor(contentInput, '\n• ');
    };
    content.querySelector('.todo').onclick = () => {
        insertAtCursor(contentInput, '\n☐ ');
    };
    content.querySelector('.bold').onclick = () => {
        wrapSelection(contentInput, '**', '**');
    };

    // Save handler
    saveBtn.onclick = () => {
        note.title = titleInput.value.trim() || 'Untitled Note';
        note.content = contentInput.value;
        note.bulletPoints = parseBulletPoints(contentInput.value);
        note.todos = parseTodos(contentInput.value);

        saveData();
        renderNotes();
        overlay.remove();
        showToast('💾 Note saved!');
    };

    // Close handlers
    content.querySelector('.close-btn').onclick = () => {
        if (confirm('Discard changes?')) overlay.remove();
    };
    overlay.onclick = (e) => {
        if (e.target === overlay && confirm('Discard changes?')) overlay.remove();
    };

    content.appendChild(saveBtn);
    overlay.appendChild(content);
    document.body.appendChild(overlay);
}

function insertAtCursor(textarea, text) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    textarea.value = textarea.value.substring(0, start) + text +
        textarea.value.substring(end);
    textarea.focus();
    textarea.selectionStart = textarea.selectionEnd = start + text.length;
}

function wrapSelection(textarea, prefix, suffix) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.substring(start, end);
    textarea.value = textarea.value.substring(0, start) +
        prefix + selected + suffix +
        textarea.value.substring(end);
    textarea.focus();
    textarea.selectionStart = start + prefix.length;
    textarea.selectionEnd = end + prefix.length;
}

function parseBulletPoints(content) {
    return content.split('\n')
        .filter(line => line.match(/^[•-]\s/))
        .map(line => line.replace(/^[•-]\s/, '').trim());
}

function parseTodos(content) {
    return content.split('\n')
        .filter(line => line.startsWith('☐ '))
        .map(line => ({
            text: line.replace('☐ ', '').trim(),
            done: false
        }));
}

function formatContentForEditing(note) {
    const safeTodos = Array.isArray(note.todos) ? note.todos : [];
    const safeBulletPoints = Array.isArray(note.bulletPoints) ? note.bulletPoints : [];

    return [
        note.content || '',
        ...safeTodos.map(t => `☐ ${t.text || ''}`),
        ...safeBulletPoints.map(b => `• ${b}`)
    ].filter(part => part.trim() !== '').join('\n');
}

// Folder management functions
function ensureMainFolder() {
    let folder = data.find(f => f.name === MAIN_FOLDER_NAME);
    if (!folder) {
        folder = {
            id: 'folder-main',
            name: MAIN_FOLDER_NAME,
            notes: [],
            isMainFolder: true
        };
        data.unshift(folder);
        saveData();
    }
    return folder;
}

function ensureFloatingNotesFolder() {
    let folder = data.find(f => f.name === FLOATING_NOTES_FOLDER_NAME);
    if (!folder) {
        folder = {
            id: 'folder-floating',
            name: FLOATING_NOTES_FOLDER_NAME,
            notes: [],
            isExtensionFolder: true
        };
        data.push(folder);
        saveData();
        renderFolders();
    }
    return folder;
}

function handleExtensionNote(noteData) {
    const folder = ensureFloatingNotesFolder();

    const existingIndex = folder.notes.findIndex(n => n.id === noteData.id);
    const noteToSave = {
        id: noteData.id,
        title: noteData.title || 'Floating Note',
        content: noteData.content || '',
        color: noteData.color || '#fff9c4',
        created: noteData.date || new Date().toISOString(),
        isExtensionNote: true,
        todos: [],
        bulletPoints: [],
        liked: false
    };

    if (existingIndex >= 0) {
        folder.notes[existingIndex] = noteToSave;
    } else {
        folder.notes.push(noteToSave);
    }

    saveData();

    if (selectedFolderId === folder.id) {
        renderNotes();
    }

    showToast(`💾 Saved floating note: "${noteData.title}"!`);
}

// Extension message handling
window.addEventListener('message', (event) => {
    try {
        if (!event.data || event.data.source !== 'sticky-notes-extension') return;

        if (event.data.action === 'SAVE_NOTE') {
            handleExtensionNote(event.data.note);
        }
    } catch (error) {
        console.error('Error processing extension message:', error);
    }
});

// Event handlers
newFolderBtn.onclick = () => {
    const folderName = prompt('Enter new folder name:');
    if (folderName && folderName.trim()) {
        const newFolder = {
            id: generateId('folder'),
            name: folderName.trim(),
            notes: []
        };
        data.push(newFolder);
        selectedFolderId = newFolder.id;
        renderFolders();
        renderNotes();
        saveData();
        showToast(`📁 Created folder: "${folderName.trim()}"!`);
    }
};

addNoteBtn.onclick = () => {
    if (!selectedFolderId) return;

    searchInput.value = '';

    const folder = data.find(f => f.id === selectedFolderId);
    const newNote = {
        id: generateId('note'),
        title: 'Untitled Note',
        content: '',
        color: '#fffb82',
        created: new Date().toISOString(),
        liked: false,
        todos: [],
        bulletPoints: [],
        timer: null,
        featuresCollapsed: false
    };
    folder.notes.push(newNote);
    renderNotes();
    saveData();
    showToast('📝 New note created!');
};

searchInput.oninput = () => {
    renderNotes();
};

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.note-dropdown')) {
        document.querySelectorAll('.note-dropdown-content.show').forEach(dropdown => {
            dropdown.classList.remove('show');
        });
    }
});

// Initialize app
function init() {
    loadData();
    ensureMainFolder();
    ensureFloatingNotesFolder();

    if (data.length > 0) {
        selectedFolderId = data[0].id;
    }

    renderFolders();
    renderNotes();

    console.log('Sticky Notes app initialized');
}

// Start the app when page loads
window.addEventListener('load', init);
