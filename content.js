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

    // --- Automatic scroll tracking for tracked paths ---
    if (trackedPaths) {
      for (const path in trackedPaths) {
        if (currentUrl.startsWith(path)) {
          const saveScrollPosition = () => {
            const scrollY = window.scrollY;
            
            chrome.storage.local.get(['trackedPaths'], (data) => {
              let paths = data.trackedPaths || {};
              if (paths[path]) {
                paths[path] = { lastUrl: currentUrl, scrollY: scrollY };
                chrome.storage.local.set({ trackedPaths: paths });
              }
            });
          };
          
          window.addEventListener('scroll', debounce(saveScrollPosition, 500));
          break; // only track one path per page
        }
      }
    }

    // --- Resume Logic ---
    if (!isResuming) return;
    
    const resumeUrl = isResuming;
    let scrollY;
    let targetUrl = resumeUrl;

    if (trackedPaths) {
      const trackedPath = Object.keys(trackedPaths).find(p => resumeUrl.startsWith(p));
      if (trackedPath && trackedPaths[trackedPath]) {
        targetUrl = trackedPaths[trackedPath].lastUrl;
        scrollY = trackedPaths[trackedPath].scrollY;
      }
    }
    
    if (!scrollY && bookmarks) {
      const bookmark = bookmarks.find(b => b.url === resumeUrl);
      if (bookmark) {
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