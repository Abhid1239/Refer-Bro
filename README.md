# Referral Bro 🤝

A Chrome Extension that bridges the gap between your personal network and job applications. It scans job boards and injects a "Handshake" badge whenever you view a job at a company where you have a known contact.

## 🚀 Features

- **Upload Your Network** — Import a simple CSV file with your contacts
- **Smart Detection** — Automatically detects company names on the page
- **Privacy First** — All data stored locally in your browser. No servers, no tracking
- **Visual Cues** — See "💬 Refer Bros" badges next to company names
- **Quick Look** — Click the badge to see contacts & copy names instantly

## 🌐 Supported Job Boards

- LinkedIn
- Indeed
- Glassdoor
- Naukri
- Wellfound (AngelList)

## 🛠 Installation

1. Clone or download this repository
2. Open Chrome → `chrome://extensions`
3. Enable **Developer Mode** (top right)
4. Click **Load unpacked** → select project folder

## 📂 Data Format

### CSV Format (Recommended)

```csv
Name, Companies, Notes
Alice Chen, "Google, Meta", Ex-colleague from DeepMind
Bob Smith, Microsoft, College friend
Charlie Davis, "Amazon, AWS", Met at a conference
```

**Rules:**
- 3 columns: `Name`, `Companies`, `Notes`
- Multiple companies? Wrap in quotes: `"Google, Meta"`
- Header row is optional (auto-detected)

### JSON Format (For Reference)

```json
[
  {
    "name": "Alice Chen",
    "companies": ["Google", "Waymo"],
    "notes": "Ex-colleague"
  }
]
```

> 📁 See the `/samples` folder for complete examples!

## 🏗 Tech Stack

- Manifest V3
- Vanilla JavaScript
- CSS3 (Scoped styling)

## 📋 Files

```
├── manifest.json      # Extension config
├── background.js      # Service worker
├── content.js         # Page scanner
├── popup.html/js/css  # Extension popup
├── injection.css      # Injected styles
├── samples/           # Example data files
│   ├── referrals.json
│   ├── referrals_with_header.csv
│   └── referrals_minimal.csv
└── icons/             # Extension icons
```

## 🔮 Roadmap

See `product_roadmap.md` for upcoming features.

## 📄 License

MIT

