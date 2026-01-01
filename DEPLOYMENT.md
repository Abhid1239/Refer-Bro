# Deployment Guide: Referral Bro

This guide covers the steps to publish "Referral Bro" to the official Chrome Web Store.

## 1. Prerequisites
- **Google Account**: You need a Google account.
- **Developer Account**: Register at the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/dev/dashboard).
  - *Note:* There is a one-time registration fee (approx. $5 USD).
- **Privacy Policy**: A hosted privacy policy URL (see `PRIVACY_POLICY.md` for a template).
- **Screenshots**:
  - 1x Icon (128x128px) - *Included in `icons/` folder*
  - 1x Screenshot (1280x800px) showing the extension in action.
  - 1x Small Tile (440x280px) for the store listing.

## 2. Prepare the Package
1. **Zip the Folder**:
   - Go to the project root directory.
   - Select all files (manifest.json, *.js, *.html, *.css, icons folder).
   - Right-click -> "Compress" (Mac) or "Send to -> Compressed (zipped) folder" (Windows).
   - Name it `referral-bro-v1.0.zip`.

   > **Important**: Do NOT include `.git`, `.DS_Store`, or `sample_referrals.csv` in the zip.

## 3. Upload to Store
1. Go to the [Developer Dashboard](https://chrome.google.com/webstore/dev/dashboard).
2. Click **+ New Item**.
3. Upload your `referral-bro-v1.0.zip` file.
4. Fill in the **Store Listing**:
   - **Title**: Referral Bro
   - **Description**: Bridges the gap between your personal network and job applications.
   - **Category**: Productivity / Social & Communication
   - **Language**: English
5. Upload your **Assets** (Icon, Screenshots, Tile).

## 4. Privacy
1. Under the **Privacy** tab:
   - **Single Purpose**: "Help users find job referrals from their personal network on job boards."
   - **Permission Justification**:
     - `storage`: "To save the user's uploaded contact list locally."
     - `scripting` & `host permissions` (ActiveTab/Host): "To scan the current job board page for company names and inject the referral badge."
   - **Data Usage**:
     - Does this extension collect user data? **No** (It is purely local).
     - Check "No" for all data collection unless you add analytics later.

## 5. Submit
1. Validating... check for any warnings.
2. Click **Submit for Review**.
3. Reviews usually take 24-48 hours.

## 6. Updates
To update the extension later:
1. Increment `"version": "1.1"` in `manifest.json`.
2. Zip the files again.
3. Go to Dashboard -> Select Item -> **Upload New Package**.
