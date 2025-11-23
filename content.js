// When the page loads, check if we are supposed to resume
window.addEventListener('load', () => {
  chrome.storage.local.get(['bookmarks', 'isResuming'], (data) => {
    
    // Check if the "Resume" flag is on AND if we are on the correct URL
    if (data.isResuming && data.bookmarks && window.location.href === data.isResuming) {
      const bookmark = data.bookmarks.find(b => b.url === data.isResuming);
      if (bookmark) {
        // Scroll to the saved position
        window.scrollTo({
          top: bookmark.scrollY,
          behavior: 'smooth'
        });
      }

      // Turn off the resume flag so normal refreshes don't auto-scroll you
      chrome.storage.local.set({ 'isResuming': false });
    }
  });
});
