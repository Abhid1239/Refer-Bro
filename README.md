# Referral Bro (MVP)

A Chrome Extension that bridges the gap between your personal network and job applications. It scans job boards (like LinkedIn) and injects a "Handshake" badge whenever you view a job at a company where you have a known contact.

## 🚀 Features
- **Upload Your Network**: Import your own `.csv` database of contacts (Name | Companies | Notes).
- **Heuristic Detection**: Automatically detects company names on the page without relying on fragile CSS selectors.
- **Privacy First**: All data is stored locally in your browser (`chrome.storage`). No external servers.
- **Visual Cues**: See a "💬 Connections" badge next to company names.
- **Quick Look**: Click the badge to see who you know, their notes, and copy their name.

## 🛠 Installation
1. Clone or download this repository.
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable **Developer Mode** (top right).
4. Click **Load unpacked** and select the project folder.

## 📂 Data Format (CSV)
Your CSV file should have 3 columns (headers optional):
```csv
Name, "Company A, Company B", Notes
Alice, Google, "Ex-colleague"
Bob, "Meta, Instagram", "College friend"
```

## 🏗 Tech Stack
- Manifest V3
- Vanilla JavaScript (No heavy frameworks)
- CSS3 (Scoped styling)

## 🔮 Future Roadmap
See `product_roadmap.md` for upcoming features and product direction.
