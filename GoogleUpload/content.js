window.addEventListener('load', () => {
  // --- Utility helpers ---
  const debounce = (func, delay) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), delay);
    };
  };


  // url: https://x.com/hi returns x.com/
  const fullURLStrip = (url) => {x = url.replace(/^https?:\/\/(www\.)?/, '')
    return x.substring(0, x.lastIndexOf('/') + 1);
  }
  
  // url: https://x.com/hi returns x.com/hi
  const partialURLStrip = (url) => {return url.replace(/^https?:\/\/(www\.)?/, '')}
  
  const stripProtocol = (url) => url.replace(/^https?:\/\/(www\.)?/, '');


  const currentUrl = window.location.href;
  const currentUrlWithoutProtocol = partialURLStrip(currentUrl);

  let bookmarkScrollListenerAttached = false;
  let bookmarkScrollHandler = null;

  const attachBookmarkScrollListener = () => {
    if (bookmarkScrollListenerAttached) return;

    const saveBookmarkScroll = () => {
      const scrollY = window.scrollY;
      chrome.storage.local.get(['bookmarks'], (data) => {
        const storedBookmarks = data.bookmarks || [];
        const updatedBookmarks = storedBookmarks.map(b => (b.fuzzyURL === fullURLStrip(currentUrl) ? { ...b, scrollY: scrollY, url: currentUrl } : b));
        chrome.storage.local.set({ bookmarks: updatedBookmarks });
      });
    };

    bookmarkScrollHandler = debounce(saveBookmarkScroll, 500);
    window.addEventListener('scroll', bookmarkScrollHandler);
    bookmarkScrollListenerAttached = true;
  };

  chrome.storage.local.get(['bookmarks', 'isResuming'], (data) => {
    const { bookmarks = [], isResuming } = data;

    if (bookmarks.some(b => b.fuzzyURL === fullURLStrip(currentUrl))) {
      attachBookmarkScrollListener();
    }

    // --- Resume Logic ---
    if (!isResuming) return;

    const resumeUrl = isResuming;
    let scrollY;
    let targetUrl = resumeUrl;
    const resumeWithoutProtocol = stripProtocol(resumeUrl);

    if (bookmarks.length) {
      const bookmark = bookmarks.find(b => b.url === resumeUrl);
      if (bookmark && targetUrl === resumeUrl) {
        scrollY = bookmark.scrollY;
      }
    }

    if (window.location.href !== targetUrl) {
      window.location.href = targetUrl;
    } else if (scrollY !== undefined) {
      window.scrollTo({
        top: scrollY,
        behavior: 'smooth'
      });
    }

    chrome.storage.local.remove('isResuming');
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    // On device compared with google account...
    if (areaName !== 'local') return;

    if (changes.bookmarks) {
      const bookmarks = changes.bookmarks.newValue || [];
      const hasBookmarkForPage = bookmarks.some(b => b.url === currentUrl);
      if (hasBookmarkForPage) {
        attachBookmarkScrollListener();
      }
    }
  });
});