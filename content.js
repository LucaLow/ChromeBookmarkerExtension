window.addEventListener('load', () => {
  // --- Debounce function ---
  const debounce = (func, delay) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), delay);
    };
  };

  chrome.storage.local.get(['bookmarks', 'trackedPaths', 'isResuming'], (data) => {
    const { bookmarks, trackedPaths, isResuming } = data;
    const currentUrl = window.location.href;
    const currentUrlWithoutProtocol = currentUrl.replace(/^https?:\/\/(www\.)?/, '');

    let scrollListenerAdded = false;

    // --- Auto-update scroll position for specific bookmarks ---
    if (bookmarks) {
      const bookmark = bookmarks.find(b => b.url === currentUrl);
      if (bookmark) {
        const saveBookmarkScroll = () => {
          const scrollY = window.scrollY;
          chrome.storage.local.get(['bookmarks'], (data) => {
            const updatedBookmarks = data.bookmarks.map(b => {
              if (b.url === currentUrl) {
                return { ...b, scrollY: scrollY };
              }
              return b;
            });
            chrome.storage.local.set({ bookmarks: updatedBookmarks });
          });
        };
        window.addEventListener('scroll', debounce(saveBookmarkScroll, 500));
        scrollListenerAdded = true;
      }
    }

    // --- Automatic scroll tracking for tracked paths (if no bookmark on this page) ---
    if (!scrollListenerAdded && trackedPaths) {
      const trackedPath = Object.keys(trackedPaths).find(path => currentUrlWithoutProtocol.startsWith(path));
      if (trackedPath) {
        const savePathScroll = () => {
          const scrollY = window.scrollY;
          chrome.storage.local.get(['trackedPaths'], (data) => {
            let paths = data.trackedPaths || {};
            if (paths[trackedPath]) {
              paths[trackedPath] = { lastUrl: currentUrl, scrollY: scrollY };
              chrome.storage.local.set({ trackedPaths: paths });
            }
          });
        };
        window.addEventListener('scroll', debounce(savePathScroll, 500));
      }
    }

    // --- Resume Logic ---
    if (!isResuming) return;
    
    const resumeUrl = isResuming;
    let scrollY;
    let targetUrl = resumeUrl;

    if (trackedPaths) {
      const trackedPath = Object.keys(trackedPaths).find(p => resumeUrl.replace(/^https?:\/\/(www\.)?/, '').startsWith(p));
      if (trackedPath && trackedPaths[trackedPath]) {
        targetUrl = trackedPaths[trackedPath].lastUrl;
        scrollY = trackedPaths[trackedPath].scrollY;
      }
    }
    
    if (bookmarks) {
      const bookmark = bookmarks.find(b => b.url === resumeUrl);
      if (bookmark && (!trackedPath || trackedPath && targetUrl === resumeUrl)) {
        scrollY = bookmark.scrollY;
      }
    }

    if (window.location.href !== targetUrl) {
      window.location.href = targetUrl;
    } else {
      if (scrollY !== undefined) {
        window.scrollTo({
          top: scrollY,
          behavior: 'smooth'
        });
      }
    }

    // Turn off the resume flag
    chrome.storage.local.remove('isResuming');
  });
});