# BookMarker – Resume Reading Exactly Where You Left Off

BookMarker is a Chrome extension that upgrades your bookmarks so they remember **exactly where you stopped reading on a page**, not just the page itself. It tracks your scroll position on long articles, documentation, tutorials, and any other web content, then brings you straight back to that spot when you return.

---

## Features

- **Scroll-aware bookmarks**  
  - Save both the page URL and your exact vertical scroll position.  
  - Perfect for long-form articles, docs, tutorials, and forums.

- **Automatic progress tracking**  
  - After you bookmark a page, BookMarker quietly updates your stored scroll position as you keep reading.  
  - You don’t have to manually re-save anything; your progress is kept in sync in the background.

- **Instant resume**  
  - When you reopen a bookmark through the extension, the page is opened and automatically scrolled back to where you left off.  
  - No more skimming, searching, or re-reading to find your place.

- **Clean, modern popup UI**  
  - Compact 500px-wide popup with a modern, neutral theme.  
  - Search bar to quickly find a saved page by title.  
  - “Bookmark This Page” and “Clear All” buttons with clear primary/danger styling.  
  - Scrollable list of saved bookmarks with:
    - Page title
    - Favicon
    - Click-to-resume behavior
    - Per-bookmark context menu (Edit title / Delete)

- **Inline notifications**  
  - Toast-style notification at the bottom of the popup for actions like:
    - Bookmark added
    - Bookmark updated
    - Bookmark deleted
    - All bookmarks cleared

- **Works on any site**  
  - Uses host permissions for `<all_urls>` so it can track reading position across the entire web.  
  - Designed to work with typical article layouts and scroll-based pages.

---

## How It Works (High-Level)

BookMarker consists of three main parts:

1. **Popup UI (popup.html, popup.js, style.css)**  
   - The popup shows your saved bookmarks and lets you:
     - Add a bookmark for the current tab.
     - Search bookmarks by title.
     - Edit bookmark titles in place.
     - Delete individual bookmarks.
     - Clear all bookmarks at once.
   - When you click a bookmark in the popup, it:
     - Creates a new tab with that bookmark’s URL.
     - Marks in extension storage that a “resume” action is happening (with that URL).

2. **Content script (content.js)**  
   - Injected on all pages via the Manifest V3 content script configuration.
   - On page load, it:
     - Checks if there’s a bookmark associated with the current page (using a “fuzzy” URL representation for matching the base path).
     - If the page has a bookmark, it attaches a debounced scroll listener that:
       - Periodically saves the latest `window.scrollY` back into the corresponding bookmark entry.
     - Checks if the page is being opened as part of a “resume” action:
       - If so, it reads the saved `scrollY` for that bookmark.
       - Once the URL matches and the page is ready, it scrolls smoothly back to the stored position.
       - It then clears the “isResuming” flag from storage.

3. **Chrome storage & permissions**  
   - Uses `chrome.storage.local` to store:
     - An array of bookmark objects with:
       - `url` – full page URL
       - `title` – page title
       - `scrollY` – last known vertical scroll position
       - `favIconUrl` – icon for the page
       - `fuzzyURL` – stripped/base version of the URL for grouping/matching
     - An `isResuming` value for handling resume events.
   - Uses:
     - `storage` permission to persist data.
     - `tabs` to read active tab info and open new tabs.
     - `scripting` (MV3) to inject scripts and read the current scroll position of the active tab.

---

## Project Structure

```text
bookmarker/
├── LICENSE
├── PrivacyPolicy.md         # Privacy policy for the Chrome Web Store
├── GoogleUpload.crx         # Packaged extension (exported .crx)
└── GoogleUpload/
    ├── content.js           # Content script: scroll tracking & resume logic
    ├── manifest.json        # Manifest V3 configuration
    ├── popup.html           # Popup UI layout
    ├── popup.js             # Popup logic, bookmark management
    └── style.css            # Popup styling
```

### Key Files

- **manifest.json**
  - Manifest V3.
  - Name: `BookMarker`
  - Description: “Tracks your read position and lets you resume exactly where you left off.”
  - Declares:
    - Permissions: `storage`, `tabs`, `scripting`
    - Host permissions: `<all_urls>`
    - Action (default popup, title, and icons)
    - Content script (content.js) on `<all_urls>`

- **popup.html / style.css**
  - A compact, modern popup optimized for quick interactions:
    - Search field for bookmarks.
    - “Bookmark This Page” primary button.
    - “Clear All” destructive button.
    - Scrollable list of bookmarks (cards with titles, favicons, and context menus).
    - Notification area at the bottom for feedback.

- **popup.js**
  - Maintains in-memory popup state:
    - Current bookmarks list
    - Current search query
    - Current active tab
  - Functions:
    - `addBookmark` – reads the current tab’s URL, title, favicon, and live scroll position; creates a bookmark; saves it to storage.
    - `updateBookmark` – used to rename a bookmark.
    - `deleteBookmark` – removes a specific bookmark.
    - `clearBookmarks` – clears all bookmarks.
    - `render` – updates the bookmark list and button state (e.g., disables “Bookmark This Page” if the page is already bookmarked).
  - When you click a bookmark:
    - It stores `isResuming` with the bookmark’s URL in `chrome.storage.local`.
    - Opens a new tab pointed at that URL.

- **content.js**
  - Loaded on every page.
  - On `window.load`:
    - Defines helper functions for debouncing and for stripping URLs:
      - `fullURLStrip` – strips protocol and `www` and truncates to the base path.
      - `partialURLStrip` – strips protocol and `www` but keeps the full path.
    - Reads bookmarks and `isResuming` from local storage.
    - If a bookmark for the current page exists:
      - Attaches a debounced scroll listener that:
        - Reads `window.scrollY`.
        - Updates the corresponding bookmark’s `scrollY` and ensures `url` is up-to-date.
    - If `isResuming` is set:
      - Finds the bookmark for that URL.
      - If necessary, navigates to the target URL.
      - Once on the right page, scrolls smoothly to the stored `scrollY`.
      - Clears `isResuming` from storage.
  - Also listens for storage changes:
    - If bookmarks change and the current page has a bookmark, it (re)attaches the scroll listener.

---

## Installation (From Source)

1. **Clone or download the repository**

   ```bash
   git clone https://github.com/LucaLow/ChromeBookmarkerExtension.git
   cd ChromeBookmarkerExtension/GoogleUpload
   ```

2. **Open Chrome’s Extensions page**

   - Go to `chrome://extensions/` in the address bar.
   - Enable **Developer mode** (top-right toggle).

3. **Load the unpacked extension**

   - Click **“Load unpacked”**.
   - Select the GoogleUpload folder (the one containing manifest.json).

4. **Verify installation**

   - You should see “BookMarker” appear in the list of installed extensions.
   - Pin it to your toolbar if desired.

---

## Usage

1. **Bookmark a page with scroll position**
   - Navigate to any page you want to read.
   - Scroll to where you want to “mark” your place, or just start reading normally.
   - Click the BookMarker extension icon to open the popup.
   - Click **“Bookmark This Page”**.
   - The extension saves:
     - URL
     - Title
     - Favicon
     - Current scroll position

2. **Keep reading normally**
   - As you scroll further down the page, BookMarker’s content script:
     - Tracks `window.scrollY`.
     - Periodically updates the bookmark’s stored scroll position in the background.

3. **Resume later**
   - When you want to resume, open the popup.
   - Use the **Search** bar if you have many bookmarks.
   - Click the bookmark you want to resume.
   - The extension:
     - Opens the page in a new tab.
     - Automatically scrolls to your last saved position.
   - You jump straight back into context, exactly where you stopped.

4. **Manage bookmarks**
   - **Search** – Type in the search field at the top of the popup to filter bookmarks by title.
   - **Edit title** – Click the `...` button on a bookmark, select **Edit**, modify the title, and press Enter or blur the input.
   - **Delete** – Use the bookmark’s context menu and select **Delete**.
   - **Clear all** – Click **“Clear All”** to wipe all bookmarks.

---

## Privacy & Data Handling

BookMarker is intentionally minimal and privacy-focused:

- **Data collected:**
  - Page URL
  - Page title
  - Favicon URL
  - Scroll position (`window.scrollY`) for bookmarked pages
- **Storage location:**
  - All data is stored **locally** using Chrome’s `storage.local` API.
- **No external communication:**
  - The extension does **not** send any data to external servers, third parties, or analytics services.
  - It operates entirely within your browser.
- For a more formal statement, see PrivacyPolicy.md.

---

## Permissions Explained

- **`storage`**  
  Used to store your bookmarks (URLs, titles, icons, scroll positions) and the resume state.

- **`tabs`**  
  Used to:
  - Query the current active tab when adding a bookmark.
  - Open new tabs when resuming a bookmark.

- **`scripting`**  
  Used (in MV3) to:
  - Execute small snippets of code in the context of the current tab (e.g., to read `window.scrollY` when you click “Bookmark This Page”).

- **`<all_urls>` (host permissions)**  
  Required so the content script can:
  - Run on any page you might bookmark.
  - Monitor scroll position and restore your reading progress.

---

## Development

If you want to modify or extend BookMarker:

1. **Edit popup UI/logic**
   - Update popup.html, popup.js, and style.css inside GoogleUpload.
   - For example:
     - Add new buttons or filtering options.
     - Change the styling or layout.
     - Extend the data displayed per bookmark.

2. **Edit scroll tracking / resume behavior**
   - Modify content.js inside GoogleUpload.
   - Potential customizations:
     - Change how often scroll position is saved (debounce delay).
     - Add special handling for certain sites or page structures.
     - Extend matching logic for URLs.

3. **Update manifest / permissions**
   - Adjust manifest.json as needed:
     - Change name, description, icons.
     - Add/remove permissions or host permissions.
     - Update version as you ship new releases.

4. **Reload the extension**
   - After making changes:
     - Go to `chrome://extensions/`.
     - Click **“Reload”** on the BookMarker extension.
     - Test changes in a new or existing tab.

---

## Roadmap / Ideas

Possible future improvements you might consider:

- Sync support via `chrome.storage.sync` so bookmarks travel with your Google account.
- Tagging or grouping bookmarks by domain/topic.
- Optional keyboard shortcuts for quick bookmarking/resume actions.
- Export/import of saved bookmarks and positions.
- Support for multiple scroll positions per page (e.g., chapters in long docs).

---

## License
PolyForm Noncommercial License 1.0.0
