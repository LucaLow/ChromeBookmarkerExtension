document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('search');
  const addBookmarkBtn = document.getElementById('add-bookmark');
  const bookmarksList = document.getElementById('bookmarks-list');
  const clearBookmarksBtn = document.getElementById('clear-bookmarks');
  const trackDomainCheckbox = document.getElementById('track-domain');

  let state = {
    bookmarks: [],
    trackedDomains: [],
    searchQuery: '',
    currentTab: null,
  };

  const setState = (newState) => {
    state = { ...state, ...newState };
    render();
  };

  const render = () => {
    const filteredBookmarks = state.bookmarks.filter(b => 
      b.title.toLowerCase().includes(state.searchQuery.toLowerCase())
    );
    renderBookmarks(filteredBookmarks);
    if (state.currentTab) {
      const domain = new URL(state.currentTab.url).hostname;
      trackDomainCheckbox.checked = state.trackedDomains.includes(domain);
    }
  };

  const renderBookmarks = (bookmarks) => {
    bookmarksList.innerHTML = '';
    if (bookmarks.length === 0) {
      const emptyMessage = document.createElement('li');
      emptyMessage.textContent = state.searchQuery ? 'No bookmarks match your search.' : 'No bookmarks yet!';
      emptyMessage.style.textAlign = 'center';
      emptyMessage.style.color = '#888';
      bookmarksList.appendChild(emptyMessage);
      return;
    }
    bookmarks.forEach((bookmark) => {
      const listItem = document.createElement('li');
      listItem.className = 'bookmark-item';

      const link = document.createElement('a');
      link.href = bookmark.url;
      link.textContent = bookmark.title;
      link.title = bookmark.url;
      link.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.storage.local.set({ 'isResuming': bookmark.url }, () => {
          chrome.tabs.create({ url: bookmark.url });
        });
      });

      const editInput = document.createElement('input');
      editInput.type = 'text';
      editInput.className = 'edit-input hidden';
      editInput.value = bookmark.title;

      const actions = document.createElement('div');
      actions.className = 'bookmark-actions';

      const editBtn = document.createElement('button');
      editBtn.textContent = '✏️';
      editBtn.addEventListener('click', () => {
        link.classList.toggle('hidden');
        editInput.classList.toggle('hidden');
        editInput.focus();
      });

      const saveEdit = () => {
        const newTitle = editInput.value;
        if (newTitle && newTitle !== bookmark.title) {
          updateBookmark(bookmark.url, { title: newTitle });
        }
        link.classList.remove('hidden');
        editInput.classList.add('hidden');
      };

      editInput.addEventListener('blur', saveEdit);
      editInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          saveEdit();
        }
      });
      
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = '🗑️';
      deleteBtn.addEventListener('click', () => {
        deleteBookmark(bookmark.url);
      });

      listItem.appendChild(link);
      listItem.appendChild(editInput);
      actions.appendChild(editBtn);
      actions.appendChild(deleteBtn);
      listItem.appendChild(actions);
      bookmarksList.appendChild(listItem);
    });
  };

  const loadInitialData = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentTab = tabs[0];
      chrome.storage.local.get(['bookmarks', 'trackedDomains'], (result) => {
        setState({
          bookmarks: result.bookmarks || [],
          trackedDomains: result.trackedDomains || [],
          currentTab: currentTab,
        });
      });
    });
  };

  const addBookmark = () => {
    const tab = state.currentTab;
    if (!tab) return;

    const getScrollPosition = (callback) => {
      if (chrome.scripting) {
        chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => window.scrollY }, (res) => callback(res[0].result));
      } else {
        chrome.tabs.executeScript(tab.id, { code: 'window.scrollY;' }, (res) => callback(res[0]));
      }
    };

    getScrollPosition((scrollY) => {
      const newBookmark = { url: tab.url, title: tab.title, scrollY: scrollY };
      const bookmarks = state.bookmarks;
      const existingIndex = bookmarks.findIndex(b => b.url === newBookmark.url);
      if (existingIndex > -1) {
        bookmarks[existingIndex] = newBookmark;
      } else {
        bookmarks.push(newBookmark);
      }

      const domain = new URL(tab.url).hostname;
      const trackedDomains = state.trackedDomains;
      if (trackDomainCheckbox.checked && !trackedDomains.includes(domain)) {
        trackedDomains.push(domain);
      }
      
      chrome.storage.local.set({ bookmarks: bookmarks, trackedDomains: trackedDomains }, loadInitialData);
    });
  };

  const updateBookmark = (url, updates) => {
    const bookmarks = state.bookmarks.map(b => b.url === url ? { ...b, ...updates } : b);
    chrome.storage.local.set({ bookmarks: bookmarks }, loadInitialData);
  };

  const deleteBookmark = (url) => {
    let bookmarks = state.bookmarks.filter(b => b.url !== url);
    let trackedDomains = state.trackedDomains;
    
    const domain = new URL(url).hostname;
    const remainingBookmarksForDomain = bookmarks.some(b => new URL(b.url).hostname === domain);
    if (!remainingBookmarksForDomain) {
      trackedDomains = trackedDomains.filter(d => d !== domain);
    }
    
    chrome.storage.local.set({ bookmarks: bookmarks, trackedDomains: trackedDomains }, loadInitialData);
  };

  const clearBookmarks = () => {
    chrome.storage.local.set({ bookmarks: [], trackedDomains: [] }, loadInitialData);
  };

  const handleTrackDomainChange = () => {
    const domain = new URL(state.currentTab.url).hostname;
    let trackedDomains = state.trackedDomains;
    if (trackDomainCheckbox.checked) {
      if (!trackedDomains.includes(domain)) {
        trackedDomains.push(domain);
      }
    } else {
      trackedDomains = trackedDomains.filter(d => d !== domain);
    }
    chrome.storage.local.set({ trackedDomains: trackedDomains }, loadInitialData);
  };

  searchInput.addEventListener('input', (e) => {
    setState({ searchQuery: e.target.value });
  });

  addBookmarkBtn.addEventListener('click', addBookmark);
  clearBookmarksBtn.addEventListener('click', clearBookmarks);
  trackDomainCheckbox.addEventListener('change', handleTrackDomainChange);

  loadInitialData();
});