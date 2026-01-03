# Referral Bro - Data Format Guide

This guide explains how to prepare your contact data for Referral Bro. The extension supports **CSV**, **JSON**, and **Excel (XLS/XLSX)** formats.

---

## 📊 Supported Formats

| Format | Extension | Best For |
|--------|-----------|----------|
| CSV | `.csv` | Spreadsheet exports, simple lists |
| JSON | `.json` | Developers, API exports |
| Excel | `.xls`, `.xlsx` | Direct from Excel/Sheets |

---

## 📝 CSV Format

### Structure
```
Name, Companies, Notes
```

### Rules
- **3 columns**: Name, Companies, Notes
- **Multiple companies**: Wrap in quotes with commas: `"Google, Meta"`
- **Header row**: Optional (auto-detected)

### Example
```csv
Name,Companies,Notes
Alice Chen,"Google, Waymo",Ex-colleague from DeepMind
Bob Smith,Microsoft,College friend
Charlie Davis,"Amazon, AWS",Met at a conference
Diana Evans,"Apple, Google, AWS",Former manager
```

### Minimal (No Headers)
```csv
Alice Chen,"Google, Waymo",Ex-colleague
Bob Smith,Microsoft,College friend
```

---

## 📋 JSON Format

### Structure
```json
[
  {
    "name": "Contact Name",
    "companies": ["Company1", "Company2"],
    "notes": "How you know them"
  }
]
```

### Rules
- Must be an **array** of contact objects
- `companies` can be array or comma-separated string
- Field names are case-insensitive (`name`, `Name`, `NAME` all work)

### Example
```json
[
  {
    "name": "Alice Chen",
    "companies": ["Google", "Waymo"],
    "notes": "Ex-colleague from DeepMind"
  },
  {
    "name": "Bob Smith",
    "companies": ["Microsoft"],
    "notes": "College friend"
  },
  {
    "name": "Charlie Davis",
    "companies": "Amazon, AWS",
    "notes": "Met at a conference"
  }
]
```

---

## 📗 Excel Format (XLS/XLSX)

### Structure
| Column A | Column B | Column C |
|----------|----------|----------|
| Name | Companies | Notes |
| Alice Chen | Google, Waymo | Ex-colleague |
| Bob Smith | Microsoft | College friend |

### Rules
- First row can be headers (auto-detected)
- Multiple companies: separate with commas in the same cell
- Only first sheet is read

---

## 🤖 AI Prompts to Convert Your Data

Use these prompts with ChatGPT, Claude, or any AI to convert your existing data:

### From LinkedIn Connections Export

```
I have a LinkedIn connections CSV export. Convert it to this format for a Chrome extension:

CSV format needed:
Name,Companies,Notes
"Full Name","Company1, Company2","Any notes"

Rules:
- Combine current and past companies in the Companies column
- Leave Notes empty if no info
- Multiple companies should be comma-separated in quotes

Here's my LinkedIn export data:
[PASTE YOUR DATA HERE]
```

### From Google Contacts Export

```
Convert my Google Contacts export to this CSV format:

Name,Companies,Notes
"Full Name","Company1, Company2","Notes"

Extract company info from job titles or organization fields.
Combine if person has multiple companies listed.

Here's my Google Contacts data:
[PASTE YOUR DATA HERE]
```

### From a List of Names and Companies

```
I have a list of people and where they work. Convert to this format:

CSV format:
Name,Companies,Notes
"Full Name","Company1, Company2","Relationship/Notes"

Here's my list:
[PASTE YOUR LIST HERE]
```

### Convert Any Format to JSON

```
Convert this data into a JSON array with this exact structure:

[
  {
    "name": "Full Name",
    "companies": ["Company1", "Company2"],
    "notes": "How I know them"
  }
]

Here's my data:
[PASTE YOUR DATA HERE]
```

### Clean Up Messy Data

```
I have messy contact data. Clean it up into this CSV format:

Name,Companies,Notes

Rules:
1. Standardize company names (e.g., "MSFT" → "Microsoft")
2. Remove special characters
3. Split multiple companies properly
4. Combine duplicates

Here's my messy data:
[PASTE YOUR DATA HERE]
```

---

## 💡 Pro Tips

1. **Start small**: Test with 5-10 contacts first
2. **Company names matter**: Use official names (e.g., "Meta" not "Facebook")
3. **Notes help**: Add context like "college friend" or "ex-manager"
4. **Update regularly**: Re-upload as your network grows
5. **Backup**: Keep a copy of your data file

---

## 🔧 Troubleshooting

| Issue | Solution |
|-------|----------|
| "No valid data found" | Check column order: Name, Companies, Notes |
| Companies not matching | Use official company names, check capitalization |
| JSON parse error | Validate JSON at jsonlint.com |
| Excel not loading | Try saving as .xlsx instead of .xls |

---

## 📁 Sample Files

Download sample files from the `/samples` folder:
- `referrals.json` - JSON format example
- `referrals_with_header.csv` - CSV with headers
- `referrals_minimal.csv` - Minimal CSV without headers

---

Need help? Open an issue on GitHub!
