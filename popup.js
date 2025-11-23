document.addEventListener('DOMContentLoaded', () => {
  const siteLabel = document.getElementById('last-site');
  const resumeBtn = document.getElementById('resume-btn');
  
  let savedUrl = '';

  // 1. Load the last saved state from storage
  chrome.storage.local.get(['bookmark'], (result) => {
    if (result.bookmark) {
      savedUrl = result.bookmark.url;
      const title = result.bookmark.title || savedUrl;
      
      siteLabel.textContent = title;
      siteLabel.title = savedUrl; // Tooltip for full URL
      resumeBtn.disabled = false;
    }
  });

  // 2. Handle the Resume button click
  resumeBtn.addEventListener('click', () => {
    if (!savedUrl) return;

    // Set a flag so content.js knows to scroll immediately upon loading
    chrome.storage.local.set({ 'isResuming': true }, () => {
      // Create a new tab with the saved URL
      chrome.tabs.create({ url: savedUrl });
    });
  });
});
