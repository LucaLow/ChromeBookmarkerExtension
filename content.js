// --- Debounce function ---
const debounce = (func, delay) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
};

// --- Automatic scroll tracking for tracked domains ---
chrome.storage.local.get(['trackedDomains', 'domainScrollPositions'], (data) => {
  const trackedDomains = data.trackedDomains || [];
  const domain = window.location.hostname;

  if (trackedDomains.includes(domain)) {
    const saveScrollPosition = () => {
      const scrollY = window.scrollY;
      const url = window.location.href;
      
      let positions = data.domainScrollPositions || {};
      positions[domain] = { scrollY, url };
      
      chrome.storage.local.set({ domainScrollPositions: positions });
    };
    
    window.addEventListener('scroll', debounce(saveScrollPosition, 500));
  }
});


// --- Resume Logic ---
window.addEventListener('load', () => {
  chrome.storage.local.get(['bookmarks', 'trackedDomains', 'domainScrollPositions', 'isResuming'], (data) => {
    const { bookmarks, trackedDomains, domainScrollPositions, isResuming } = data;

    if (!isResuming) return;
    
    const resumeUrl = isResuming;
    const domain = new URL(resumeUrl).hostname;

    let scrollY;

    if (trackedDomains && trackedDomains.includes(domain) && domainScrollPositions && domainScrollPositions[domain]) {
      // If domain is tracked, use the last saved position for the domain
      scrollY = domainScrollPositions[domain].scrollY;
    } else if (bookmarks) {
      // Otherwise, fall back to the bookmark's saved position
      const bookmark = bookmarks.find(b => b.url === resumeUrl);
      if (bookmark) {
        scrollY = bookmark.scrollY;
      }
    }

    if (scrollY !== undefined) {
      window.scrollTo({
        top: scrollY,
        behavior: 'smooth'
      });
    }

    // Turn off the resume flag
    chrome.storage.local.set({ 'isResuming': false });
  });
});