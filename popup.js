document.addEventListener('DOMContentLoaded', () => {
  const addBookmarkBtn = document.getElementById('add-bookmark');
  const bookmarksList = document.getElementById('bookmarks-list');
  const clearBookmarksBtn = document.getElementById('clear-bookmarks');

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('about:') || tab.url.startsWith('https://chrome.google.com/webstore')) {
      addBookmarkBtn.disabled = true;
      addBookmarkBtn.textContent = 'Cannot bookmark this page';
    }
  });

  const loadBookmarks = () => {
    chrome.storage.local.get(['bookmarks'], (result) => {
      const bookmarks = result.bookmarks || [];
      renderBookmarks(bookmarks);
    });
  };

  const renderBookmarks = (bookmarks) => {
    bookmarksList.innerHTML = '';
    if (bookmarks.length === 0) {
      const emptyMessage = document.createElement('li');
      emptyMessage.textContent = 'No bookmarks yet!';
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

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-btn';
      deleteBtn.textContent = '🗑️';
      deleteBtn.addEventListener('click', () => {
        deleteBookmark(bookmark.url);
      });

      listItem.appendChild(link);
      listItem.appendChild(deleteBtn);
      bookmarksList.appendChild(listItem);
    });
  };

  const addBookmark = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];

      const getScrollPosition = (callback) => {
        if (chrome.scripting) {
          chrome.scripting.executeScript(
            {
              target: { tabId: tab.id },
              func: () => window.scrollY,
            },
            (injectionResults) => {
              if (chrome.runtime.lastError || !injectionResults || !injectionResults.length) {
                console.error('Failed to get scroll position with chrome.scripting:', chrome.runtime.lastError);
                callback(null);
                return;
              }
              callback(injectionResults[0].result);
            }
          );
        } else {
          chrome.tabs.executeScript(
            tab.id,
            { code: 'window.scrollY;' },
            (results) => {
              if (chrome.runtime.lastError || !results || results.length === 0) {
                console.error('Failed to get scroll position with chrome.tabs:', chrome.runtime.lastError);
                callback(null);
                return;
              }
              callback(results[0]);
            }
          );
        }
      };

      getScrollPosition((scrollY) => {
        if (scrollY === null) {
          // an error occurred
          return;
        }

        const newBookmark = {
          url: tab.url,
          title: tab.title,
          scrollY: scrollY
        };

        chrome.storage.local.get(['bookmarks'], (result) => {
          const bookmarks = result.bookmarks || [];
          const existingBookmarkIndex = bookmarks.findIndex(b => b.url === newBookmark.url);
          if (existingBookmarkIndex > -1) {
            bookmarks[existingBookmarkIndex] = newBookmark;
          } else {
            bookmarks.push(newBookmark);
          }
          chrome.storage.local.set({ bookmarks: bookmarks }, () => {
            loadBookmarks();
          });
        });
      });
    });
  };

  const deleteBookmark = (url) => {
    chrome.storage.local.get(['bookmarks'], (result) => {
      const bookmarks = result.bookmarks || [];
      const updatedBookmarks = bookmarks.filter(b => b.url !== url);
      chrome.storage.local.set({ bookmarks: updatedBookmarks }, () => {
        loadBookmarks();
      });
    });
  };

  const clearBookmarks = () => {
    chrome.storage.local.set({ bookmarks: [] }, () => {
      loadBookmarks();
    });
  };

  addBookmarkBtn.addEventListener('click', addBookmark);
  clearBookmarksBtn.addEventListener('click', clearBookmarks);

  loadBookmarks();
});