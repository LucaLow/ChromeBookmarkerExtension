// --- Part 1: Tracking Logic ---

let scrollTimeout;

// Listen for scroll events
window.addEventListener('scroll', () => {
  // Clear the timeout if we scroll again quickly (Debouncing)
  // This prevents saving to storage 100 times a second
  clearTimeout(scrollTimeout);

  scrollTimeout = setTimeout(() => {
    const scrollY = window.scrollY;
    const url = window.location.href;
    const title = document.title;

    // Only save if we have scrolled at least a little bit
    if (scrollY > 0) {
      chrome.storage.local.set({
        bookmark: {
          url: url,
          title: title,
          scrollY: scrollY
        }
      });
    }
  }, 500); // Save 500ms after you stop scrolling
});


// --- Part 2: Resume Logic ---

// When the page loads, check if we are supposed to resume
window.addEventListener('load', () => {
  chrome.storage.local.get(['bookmark', 'isResuming'], (data) => {
    
    // Check if the "Resume" flag is on AND if we are on the correct URL
    if (data.isResuming && data.bookmark && window.location.href === data.bookmark.url) {
      
      // Scroll to the saved position
      window.scrollTo({
        top: data.bookmark.scrollY,
        behavior: 'smooth'
      });

      // Turn off the resume flag so normal refreshes don't auto-scroll you
      chrome.storage.local.set({ 'isResuming': false });
    }
  });
});
