# Privacy Policy for Referral Bro

**Effective Date:** January 2026  
**Last Updated:** January 2026

## Summary

**Referral Bro does NOT collect, transmit, or store any personal data on external servers.** All your data stays on your device.

---

## 1. Data Collection

### What We DON'T Collect
- ❌ Personal information
- ❌ Browsing history
- ❌ Analytics or usage data
- ❌ Cookies or tracking pixels
- ❌ Any data sent to external servers

### What Stays on Your Device
- ✅ Your uploaded contact list (CSV/JSON data)
- ✅ Your overlay mode preference (on/off toggle)
- ✅ Last updated timestamp

All data is stored using Chrome's local storage API (`chrome.storage.local`) and never leaves your browser.

---

## 2. How the Extension Works

1. **Page Scanning**: When you visit a supported job board (LinkedIn, Indeed, Glassdoor, Naukri, Wellfound), the extension scans text on the page to identify company names.

2. **Local Matching**: Company names are matched against your locally stored contact database. This happens entirely within your browser.

3. **Badge Display**: If a match is found, a visual badge is displayed next to the company name.

**No data is transmitted externally during this process.**

---

## 3. Permissions Explained

| Permission | Purpose |
|------------|---------|
| `storage` | Save your contact list and templates locally |
| `content_scripts` | Scan job pages for company names and inject helper buttons |

We request **minimal permissions**. Use of `content_scripts` is limited strictly to the supported job domains (LinkedIn, etc.).

### Messaging Feature Privacy
The "Ask Referral" feature inserts text directly into the message input field on your behalf.
- ❌ We do **not** read your private messages.
- ❌ We do **not** send any message content to our servers.
- ✅ Template text generation happens locally.


---

## 4. Third-Party Services

Referral Bro does **not**:
- Use third-party analytics (no Google Analytics, Mixpanel, etc.)
- Make external API calls
- Load remote scripts
- Share data with any third party

---

## 5. Data Security

- All data is stored locally on your device
- Data is accessible only through the extension
- Uninstalling the extension removes all stored data

---

## 6. Your Rights

You have full control over your data:
- **Export**: Download your data anytime via the Export button
- **Delete**: Clear all data by uninstalling the extension
- **Modify**: Add or remove contacts through the popup

---

## 7. Children's Privacy

Referral Bro does not knowingly collect data from children under 13.

---

## 8. Changes to This Policy

We may update this policy occasionally. The "Last Updated" date at the top will reflect any changes.

---

## 9. Contact

Questions about this privacy policy? Reach out via:
- Chrome Web Store support page
- GitHub Issues: [Repository Link]

---

**TL;DR: Your data stays on your device. We don't collect, track, or sell anything.**
