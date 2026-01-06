# Referral Bro 🤝

A Chrome Extension that bridges the gap between your personal network and job applications. See **who you know** at every company—right when you need it.

## 🚀 Features

- **📂 Import Your Network** — CSV or JSON file with contacts and their companies
- **➕ Quick Add** — Add contacts directly from the popup
- **📤 Export** — Download your database as CSV anytime
- **🔍 Smart Detection** — Automatically detects company names on job boards
- **💬 Visual Badges** — See "1 Refer Bro" badges next to matched companies
- **📋 One-Click Copy** — Copy contact names instantly
- **🔒 Privacy First** — All data stored locally. No servers, no tracking.
- **🤖 AI Helper** — Built-in prompt to convert any contact list format

## 🌐 Supported Job Boards

- LinkedIn
- Indeed
- Glassdoor
- Naukri
- Wellfound (AngelList)

## 🛠 Installation

### From Chrome Web Store
1. Visit the [Chrome Web Store listing](#)
2. Click **Add to Chrome**
3. Import your contacts and start browsing jobs!

### For Developers
1. Clone this repository
2. Open Chrome → `chrome://extensions`
3. Enable **Developer Mode** (top right)
4. Click **Load unpacked** → select project folder
5. Reload any open job board tabs

## 📂 Data Format

### CSV Format (Recommended)

```csv
Name,Companies,Notes
Alice Chen,"Google, Meta",Ex-colleague from DeepMind
Bob Smith,Microsoft,College friend
Charlie Davis,"Amazon, AWS",Met at a conference
```

**Rules:**
- 3 columns: `Name`, `Companies`, `Notes` (Notes optional)
- Multiple companies? Wrap in quotes: `"Google, Meta"`
- Header row is auto-detected

### JSON Format

```json
[
  {
    "name": "Alice Chen",
    "companies": ["Google", "Waymo"],
    "notes": "Ex-colleague"
  }
]
```

### 🤖 Don't have formatted data?

Use the built-in AI prompt in the extension! Click **"🤖 Don't have CSV/JSON?"** to get a prompt that converts any format.

> 📁 See the `/samples` folder for complete examples!

## 🔐 Permissions

Referral Bro requests **minimal permissions**:

| Permission | Why |
|------------|-----|
| `storage` | Save your contacts locally in your browser |

That's it! No scary permissions. Your data never leaves your browser.

## 🏗 Tech Stack

- Manifest V3
- Vanilla JavaScript (no dependencies)
- CSS3 (Scoped styling)

## 📋 Project Structure

```
├── manifest.json       # Extension config
├── shared.js           # Centralized constants
├── utils.js            # Helper functions
├── content.js          # Page scanner & badge injection
├── popup.html/js/css   # Extension popup UI
├── injection.css       # Injected badge/tooltip styles
├── samples/            # Example data files
└── icons/              # Extension icons
```

## 🔮 Roadmap

See `ROADMAP.md` for upcoming features:
- v1.1: Import mode selection (Replace vs Merge)
- v1.2: Custom DM templates with copy button
- v2.0: LinkedIn profile detection, auto-import

## 🤝 Contributing

Contributions welcome! Please open an issue first to discuss changes.

## 📄 License

MIT

---

**Built with ❤️ for job seekers everywhere.**
