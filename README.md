# MK Bookmark Manager

**MK Bookmark Manager** is a clean, powerful, and easy-to-use **Google Chrome Extension** that lets you:

- 📂 Organize bookmarks into custom **categories**
- 🌐 Automatically fetch **website favicons**
- ✏️ Edit or delete saved websites and categories
- 🧭 Access a fully styled, toggleable **Manage Panel**
- 🔄 Save everything locally using `chrome.storage.local`

---

## 🚀 Features

- ✅ Add categories to group your bookmarks
- ✅ Save websites under any category
- ✅ Auto-fetch favicons like Chrome's native bookmarks
- ✅ Toggle between **Main Panel** and **Manage Panel**
- ✅ Edit or delete any bookmark or category
- ✅ Clean, minimal, responsive UI

---

## 📸 Screenshots

> _Coming soon..._  
> _(You can paste your extension screenshots here)_

---

## 🛠 Installation (for Development)

1. Clone or download this repository.
2. Open **Google Chrome**.
3. Go to `chrome://extensions/`.
4. Enable **Developer mode** (top right).
5. Click **"Load unpacked"**.
6. Select the folder containing this project.

---

## 📁 Project Structure

```text
mk-bookmark-manager/
├── manifest.json        # Chrome Extension configuration (Manifest V3)
├── popup.html           # Main popup layout (HTML UI)
├── popup.js             # Extension logic (add/edit/delete bookmarks, categories)
├── style.css            # Full styles for main & manage panels
├── icon.png             # Toolbar icon (suggested size: 128x128)
└── README.md            # Project documentation (you’re reading it!)
```

---

## 🧠 How It Works

- Uses `chrome.storage.local` to persist all data
- Uses `https://www.google.com/s2/favicons` to fetch each website's favicon
- Bookmark panel shows categorized websites with icons and edit buttons
- Manage panel allows full control over your data

---

## 🔒 Permissions Used

- `storage`: to store categories and bookmarks
- `tabs`: to open bookmarks in new tabs when clicked

---

## 📌 Coming Soon

- Export/import to JSON
- Drag-and-drop bookmark sorting
- Search/filter bar
- Dark mode toggle

---

## 🤝 Credits

Built by [Mohamed KADI](https://mohamedkadi.com)
Icons by Google Favicon API

---

## 📄 License

MIT License – feel free to fork and enhance!

```

```
