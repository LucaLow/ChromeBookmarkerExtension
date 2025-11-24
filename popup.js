document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('search');
  const addBookmarkBtn = document.getElementById('add-bookmark');
  const bookmarksList = document.getElementById('bookmarks-list');
  const clearBookmarksBtn = document.getElementById('clear-bookmarks');
  const notification = document.getElementById('notification');

  let state = {
    bookmarks: [],
    searchQuery: '',
    currentTab: null,
  };

  // url: https://x.com/hi returns x.com/
  const fullURLStrip = (url) => {x = url.replace(/^https?:\/\/(www\.)?/, '')
    return x.substring(0, x.lastIndexOf('/') + 1);
  }
  
  // url: https://x.com/hi returns x.com/hi
  const partialURLStrip = (url) => {return url.replace(/^https?:\/\/(www\.)?/, '')}

  const setState = (newState) => {
    state = { ...state, ...newState };
    render();
  };
  
  const showNotification = (message) => {
    notification.textContent = message;
    notification.classList.add('show');
    setTimeout(() => {
      notification.classList.remove('show');
    }, 2000);
  };

  const render = () => {
    const filteredBookmarks = state.bookmarks.filter(b => 
      b.title.toLowerCase().includes(state.searchQuery.toLowerCase())
    );
    renderBookmarks(filteredBookmarks);
    if (state.currentTab) {
      const url = state.currentTab.url;
      const existingBookmark = state.bookmarks.find(b => b.fuzzyURL === fullURLStrip(url));
      if (existingBookmark) {
        addBookmarkBtn.disabled = true;
        addBookmarkBtn.textContent = 'Bookmarked';
      } else {
        addBookmarkBtn.disabled = false;
        addBookmarkBtn.textContent = 'Bookmark This Page';
      }
    }
  };

  const renderBookmarks = (bookmarks) => {
    bookmarksList.innerHTML = '';
    if (bookmarks.length === 0) {
      const emptyMessage = document.createElement('li');
      emptyMessage.className = 'empty-state';
      emptyMessage.innerHTML = `
        <div class="empty-icon">🔖</div>
        <div>No bookmarks yet.</div>
        <div class="empty-subtext">Click "Bookmark this page" to save a page.</div>
      `;
      bookmarksList.appendChild(emptyMessage);
      return;
    }
    
    bookmarks.forEach((bookmark) => {
      const listItem = document.createElement('li');
      listItem.className = 'bookmark-item relative';

      const favIcon = document.createElement('img');
      favIcon.src = bookmark.favIconUrl || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      favIcon.className = 'favicon';
      listItem.appendChild(favIcon);

      const link = document.createElement('a');
      link.href = bookmark.url;
      link.textContent = bookmark.title;
      link.title = bookmark.url;
      link.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.storage.local.set({ 'isResuming': bookmark.url });
        chrome.tabs.create({ url: bookmark.url });
      });

      const editInput = document.createElement('input');
      editInput.type = 'text';
      editInput.className = 'edit-input hidden';
      editInput.value = bookmark.title;

      const actions = document.createElement('div');
      actions.className = 'bookmark-actions';

      const contextMenu = document.createElement('div');
      contextMenu.className = 'context-menu hidden';

      const editButton = document.createElement('button');
      editButton.textContent = 'Edit';
      editButton.addEventListener('click', () => {
        link.classList.add('hidden');
        editInput.classList.remove('hidden');
        editInput.focus();
        contextMenu.classList.add('hidden');
      });

      const deleteButton = document.createElement('button');
      deleteButton.textContent = 'Delete';
      deleteButton.addEventListener('click', () => {
        deleteBookmark(bookmark.url);
      });

      contextMenu.appendChild(editButton);
      contextMenu.appendChild(deleteButton);

      const contextMenuBtn = document.createElement('button');
      contextMenuBtn.textContent = '...';
      contextMenuBtn.className = 'context-menu-btn';
      contextMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllContextMenus();
        contextMenu.classList.toggle('hidden');
      });

      actions.appendChild(contextMenuBtn);
      actions.appendChild(contextMenu);

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
      
      listItem.appendChild(link);
      listItem.appendChild(editInput);
      listItem.appendChild(actions);
      bookmarksList.appendChild(listItem);
    });
  };

  const loadInitialData = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentTab = tabs[0];
      chrome.storage.local.get(['bookmarks'], (result) => {
        setState({
          bookmarks: result.bookmarks || [],
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
        chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => window.scrollY }, (res) => callback(res ? res[0].result : 0));
      } else {
        chrome.tabs.executeScript(tab.id, { code: 'window.scrollY;' }, (res) => callback(res ? res[0] : 0));
      }
    };

    getScrollPosition((scrollY) => {
      const newBookmark = { url: tab.url, title: tab.title, scrollY: scrollY, favIconUrl: tab.favIconUrl, fuzzyURL: fullURLStrip(tab.url) };
      const bookmarks = [...state.bookmarks, newBookmark];
      setState({ bookmarks });
      chrome.storage.local.set({ bookmarks });
      showNotification('Bookmark added!');
    });
  };
  
  const updateBookmark = (url, updates) => {
    const bookmarks = state.bookmarks.map(b => b.url === url ? { ...b, ...updates } : b);
    setState({ bookmarks });
    chrome.storage.local.set({ bookmarks });
    showNotification('Bookmark updated!');
  };

  const deleteBookmark = (url) => {
    const bookmarks = state.bookmarks.filter(b => b.url !== url);
    
    setState({ bookmarks });
    chrome.storage.local.set({ bookmarks });
    showNotification('Bookmark deleted!');
  };

  const clearBookmarks = () => {
    setState({ bookmarks: [] });
    chrome.storage.local.set({ bookmarks: [] });
    showNotification('All bookmarks cleared!');
  };

  searchInput.addEventListener('input', (e) => {
    setState({ searchQuery: e.target.value });
  });

  addBookmarkBtn.addEventListener('click', addBookmark);
  clearBookmarksBtn.addEventListener('click', clearBookmarks);

  const closeAllContextMenus = () => {
    document.querySelectorAll('.context-menu').forEach(menu => {
      menu.classList.add('hidden');
    });
  };

  document.addEventListener('click', closeAllContextMenus);

  loadInitialData();
});
