/**
 * Referral Radar Popup Logic
 * Handles UI interactions, CSV parsing, and storage management.
 */

document.addEventListener('DOMContentLoaded', () => {
  // UI Elements
  const elements = {
    fileInput: document.getElementById('csv-upload'),
    statusDiv: document.getElementById('status'),
    lastUpdatedDiv: document.getElementById('last-updated'),
    toggle: document.getElementById('overlay-toggle'),
    searchInput: document.getElementById('search-input'),
    searchResults: document.getElementById('search-results')
  };

  // --- Initialization ---

  function init() {
    loadState();
    attachListeners();
  }

  function loadState() {
    chrome.storage.local.get(['referralData', 'lastUpdated', 'overlayMode'], (result) => {
      if (result.referralData) {
        updateStatusUI(result.referralData);
      }
      if (result.lastUpdated) {
        elements.lastUpdatedDiv.textContent = `Last updated: ${result.lastUpdated}`;
      }

      // Default to TRUE if undefined
      if (result.overlayMode !== undefined) {
        elements.toggle.checked = result.overlayMode;
      } else {
        elements.toggle.checked = true;
        chrome.storage.local.set({ overlayMode: true });
      }
    });
  }

  function attachListeners() {
    // Toggle Switch
    elements.toggle.addEventListener('change', handleToggle);

    // File Upload
    elements.fileInput.addEventListener('change', handleFileUpload);

    // Manual Search
    elements.searchInput.addEventListener('input', handleSearch);
  }

  // --- Handlers ---

  function handleToggle() {
    const isChecked = elements.toggle.checked;
    chrome.storage.local.set({ overlayMode: isChecked }, () => {
      // Notify all active tabs to update state immediately
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'UPDATE_MODE',
            mode: isChecked
          });
        }
      });
    });
  }

  function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csvText = event.target.result;
        const database = parseCSV(csvText);
        saveDatabase(database);
      } catch (err) {
        alert('Error parsing CSV: ' + err.message);
      }
    };
    reader.readAsText(file);
  }

  function handleSearch(e) {
    const query = e.target.value.trim().toUpperCase();
    if (!query) {
      elements.searchResults.innerHTML = '';
      return;
    }

    chrome.storage.local.get(['referralData'], (result) => {
      const data = result.referralData || {};
      const matches = Object.keys(data).filter(company =>
        company.includes(query)
      );
      renderSearchResults(matches, data);
    });
  }

  // --- Logic ---

  /**
   * Parses CSV content into a structured object.
   * Expected Format: Name, "Company1, Company2", Notes
   */
  function parseCSV(csvText) {
    const lines = csvText.split(/\r\n|\n/);
    const database = {};
    let count = 0;

    for (let line of lines) {
      if (!line.trim()) continue;

      const row = parseCSVLine(line); // Robust parse handling quotes
      if (row.length < 2) continue;

      const contactName = row[0];
      const companiesStr = row[1];
      const note = row[2] || "";

      // Split companies by comma and clean up
      const companies = companiesStr.split(',').map(c => c.trim().toUpperCase());

      companies.forEach(company => {
        if (!company) return;
        const cleanCompany = company.replace(/["']/g, ''); // Remove stray quotes

        if (!database[cleanCompany]) {
          database[cleanCompany] = [];
        }
        database[cleanCompany].push({
          name: contactName,
          note: note
        });
      });
      count++;
    }
    return database;
  }

  // Simple CSV Line Parser handling quoted fields
  function parseCSVLine(text) {
    const result = [];
    let cell = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(cell.trim().replace(/^"|"$/g, ''));
        cell = '';
      } else {
        cell += char;
      }
    }
    result.push(cell.trim().replace(/^"|"$/g, ''));
    return result;
  }

  function saveDatabase(database) {
    const timestamp = new Date().toLocaleString();
    chrome.storage.local.set({
      referralData: database,
      lastUpdated: timestamp
    }, () => {
      updateStatusUI(database);
      elements.lastUpdatedDiv.textContent = `Last updated: ${timestamp}`;
      alert(`Success! Loaded contacts for ${Object.keys(database).length} companies.`);
    });
  }

  function updateStatusUI(data) {
    const companyCount = Object.keys(data).length;
    let totalReferrers = 0;
    // Simple approximation of total contacts
    Object.values(data).forEach(list => totalReferrers += list.length);

    elements.statusDiv.innerHTML = `
        <span>✅</span>
        <span>${totalReferrers} Refer Bros (${companyCount} Companies)</span>
      `;
  }

  function renderSearchResults(matches, data) {
    elements.searchResults.innerHTML = '';

    if (matches.length === 0) {
      elements.searchResults.innerHTML = `
            <div class="result-item" style="color:#666; text-align:center;">
                No matches found
            </div>`;
      return;
    }

    matches.forEach(company => {
      const referrers = data[company];
      const item = document.createElement('div');
      item.className = 'result-item';

      let html = `<div class="result-company">${company}</div>`;
      referrers.forEach(ref => {
        html += `
                <div class="result-person">👤 ${escapeHtml(ref.name)}</div>
                <div class="result-note">${escapeHtml(ref.note)}</div>
              `;
      });

      item.innerHTML = html;
      elements.searchResults.appendChild(item);
    });
  }

  // Security Utility
  function escapeHtml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Start
  init();
});
