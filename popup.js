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
    searchResults: document.getElementById('search-results'),
    // Quick Add elements
    addName: document.getElementById('add-name'),
    addCompanies: document.getElementById('add-companies'),
    addNotes: document.getElementById('add-notes'),
    addBtn: document.getElementById('add-contact-btn'),
    // Export button
    exportBtn: document.getElementById('export-btn')
  };

  // --- Utilities ---

  let searchDebounceTimer;
  const SEARCH_DEBOUNCE_MS = 300;
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  /**
   * Shows an in-page notification instead of blocking alerts.
   */
  function showNotification(message, isError = false) {
    // Remove existing notification if any
    const existing = document.querySelector('.rr-notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.className = `rr-notification ${isError ? 'error' : 'success'}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      padding: 10px 16px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 500;
      z-index: 10000;
      animation: slideIn 0.3s ease;
      ${isError ? 'background: #fee2e2; color: #dc2626; border: 1px solid #fecaca;' : 'background: #dcfce7; color: #16a34a; border: 1px solid #bbf7d0;'}
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  }

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

    // Quick Add
    elements.addBtn.addEventListener('click', handleAddContact);

    // Export
    elements.exportBtn.addEventListener('click', handleExport);

    // Allow Enter key to submit Quick Add
    elements.addNotes.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleAddContact();
    });
  }

  // --- Handlers ---

  function handleToggle() {
    const isChecked = elements.toggle.checked;
    chrome.storage.local.set({ overlayMode: isChecked }, () => {
      // Broadcast to ALL tabs on supported sites, not just active tab
      // This ensures all open LinkedIn/Naukri tabs update simultaneously
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          // Only send to tabs with supported URLs and valid IDs
          if (tab?.id && tab.url && isSupportedUrl(tab.url)) {
            chrome.tabs.sendMessage(tab.id, {
              action: 'UPDATE_MODE',
              mode: isChecked
            }).catch((error) => {
              // Content script not loaded yet - this is expected on page reload
              console.log(`[Referral Bro] Tab ${tab.id} not ready:`, error.message);
            });
          }
        });
      });
    });
  }

  /**
   * Checks if the URL is a supported job board where content script runs.
   */
  function isSupportedUrl(url) {
    const supportedPatterns = [
      'https://www.linkedin.com/',
      'https://www.naukri.com/',
      'https://www.indeed.com/',
      'https://www.glassdoor.com/',
      'https://www.glassdoor.co.in/',
      'https://wellfound.com/',
      'https://angel.co/'
    ];
    return supportedPatterns.some(pattern => url.startsWith(pattern));
  }

  /**
   * Handles adding a new contact directly from the Quick Add form.
   */
  function handleAddContact() {
    const name = elements.addName.value.trim();
    const companiesStr = elements.addCompanies.value.trim();
    const notes = elements.addNotes.value.trim();

    // Validation
    if (!name) {
      showNotification('Please enter a name', true);
      elements.addName.focus();
      return;
    }
    if (!companiesStr) {
      showNotification('Please enter at least one company', true);
      elements.addCompanies.focus();
      return;
    }

    // Parse companies
    const companies = companiesStr.split(',').map(c => c.trim().toUpperCase()).filter(c => c);

    if (companies.length === 0) {
      showNotification('Please enter valid company names', true);
      return;
    }

    // Get existing data and merge
    chrome.storage.local.get(['referralData'], (result) => {
      const database = result.referralData || {};

      // Add contact to each company
      companies.forEach(company => {
        const cleanCompany = company.replace(/[\"']/g, '');
        if (!database[cleanCompany]) {
          database[cleanCompany] = [];
        }

        // Check for duplicates
        const exists = database[cleanCompany].some(
          c => c.name.toLowerCase() === name.toLowerCase()
        );

        if (!exists) {
          database[cleanCompany].push({ name, note: notes });
        }
      });

      // Save and update UI
      const timestamp = new Date().toLocaleString();
      chrome.storage.local.set({
        referralData: database,
        lastUpdated: timestamp
      }, () => {
        updateStatusUI(database);
        elements.lastUpdatedDiv.textContent = `Last updated: ${timestamp}`;
        showNotification(`Added ${name} to ${companies.length} company(s)!`);

        // Clear form
        elements.addName.value = '';
        elements.addCompanies.value = '';
        elements.addNotes.value = '';
        elements.addName.focus();
      });
    });
  }

  /**
   * Exports the current database as a CSV file download.
   */
  function handleExport() {
    chrome.storage.local.get(['referralData'], (result) => {
      const data = result.referralData;

      if (!data || Object.keys(data).length === 0) {
        showNotification('No data to export', true);
        return;
      }

      // Convert to flat list for CSV
      // Format: Name, Companies, Notes
      const contactMap = new Map();

      // Group by contact name to combine companies
      Object.entries(data).forEach(([company, contacts]) => {
        contacts.forEach(contact => {
          const key = `${contact.name}|||${contact.note || ''}`;
          if (!contactMap.has(key)) {
            contactMap.set(key, { name: contact.name, companies: [], note: contact.note || '' });
          }
          contactMap.get(key).companies.push(company);
        });
      });

      // Build CSV content
      let csv = 'Name,Companies,Notes\n';

      contactMap.forEach(contact => {
        const name = escapeCSVField(contact.name);
        const companies = escapeCSVField(contact.companies.join(', '));
        const notes = escapeCSVField(contact.note);
        csv += `${name},${companies},${notes}\n`;
      });

      // Trigger download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `referral-bro-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showNotification(`Exported ${contactMap.size} contacts!`);
    });
  }

  /**
   * Escapes a field for CSV format.
   */
  function escapeCSVField(field) {
    if (!field) return '';
    // If contains comma, quote, or newline, wrap in quotes and escape internal quotes
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  }

  function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const validExtensions = ['.csv', '.json', '.xls', '.xlsx'];
    const extension = validExtensions.find(ext => fileName.endsWith(ext));

    // Validate file type
    if (!extension) {
      showNotification('Please upload a CSV, JSON, or Excel file', true);
      elements.fileInput.value = '';
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > MAX_FILE_SIZE) {
      showNotification('File too large. Maximum size is 5MB.', true);
      elements.fileInput.value = '';
      return;
    }

    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        let database;

        if (extension === '.csv') {
          database = parseCSV(event.target.result);
        } else if (extension === '.json') {
          database = parseJSON(event.target.result);
        } else if (extension === '.xls' || extension === '.xlsx') {
          database = parseExcel(event.target.result);
        }

        if (!database || Object.keys(database).length === 0) {
          showNotification('No valid data found in file', true);
          return;
        }

        saveDatabase(database);
      } catch (err) {
        showNotification('Error parsing file: ' + err.message, true);
        console.error('[Referral Bro] Parse error:', err);
      }
    };

    reader.onerror = () => {
      showNotification('Failed to read file', true);
    };

    // Read as appropriate format
    if (extension === '.xls' || extension === '.xlsx') {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  }

  /**
   * Parses JSON content into database format.
   * Expected: Array of {name, companies: [...], notes}
   */
  function parseJSON(jsonText) {
    const data = JSON.parse(jsonText);
    const database = {};

    if (!Array.isArray(data)) {
      throw new Error('JSON must be an array of contacts');
    }

    data.forEach(contact => {
      const name = contact.name || contact.Name || '';
      const notes = contact.notes || contact.Notes || contact.note || '';
      let companies = contact.companies || contact.Companies || contact.company || [];

      // Handle string or array of companies
      if (typeof companies === 'string') {
        companies = companies.split(',').map(c => c.trim());
      }

      companies.forEach(company => {
        const cleanCompany = String(company).trim().toUpperCase().replace(/[\"']/g, '');
        if (!cleanCompany) return;

        if (!database[cleanCompany]) {
          database[cleanCompany] = [];
        }
        database[cleanCompany].push({ name, note: notes });
      });
    });

    return database;
  }

  /**
   * Parses Excel (XLS/XLSX) content into database format.
   * Uses SheetJS library.
   */
  function parseExcel(arrayBuffer) {
    if (typeof XLSX === 'undefined') {
      throw new Error('Excel parser not loaded. Please refresh and try again.');
    }

    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    // Convert to JSON array
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (rows.length === 0) {
      throw new Error('Excel file is empty');
    }

    const database = {};
    let startIndex = 0;

    // Detect header row
    const firstRow = rows[0];
    if (firstRow && firstRow.length > 0) {
      const firstCell = String(firstRow[0] || '').toLowerCase();
      if (firstCell.includes('name')) {
        startIndex = 1;
      }
    }

    for (let i = startIndex; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 2) continue;

      const name = String(row[0] || '').trim();
      const companiesStr = String(row[1] || '').trim();
      const notes = String(row[2] || '').trim();

      if (!name || !companiesStr) continue;

      const companies = companiesStr.split(',').map(c => c.trim().toUpperCase());

      companies.forEach(company => {
        const cleanCompany = company.replace(/[\"']/g, '');
        if (!cleanCompany) return;

        if (!database[cleanCompany]) {
          database[cleanCompany] = [];
        }
        database[cleanCompany].push({ name, note: notes });
      });
    }

    return database;
  }

  function handleSearch(e) {
    const query = e.target.value.trim().toUpperCase();

    // Clear previous debounce timer
    clearTimeout(searchDebounceTimer);

    if (!query) {
      elements.searchResults.innerHTML = '';
      return;
    }

    // Debounce search to avoid excessive storage queries
    searchDebounceTimer = setTimeout(() => {
      chrome.storage.local.get(['referralData'], (result) => {
        const data = result.referralData || {};
        const matches = Object.keys(data).filter(company =>
          company.includes(query)
        );
        renderSearchResults(matches, data);
      });
    }, SEARCH_DEBOUNCE_MS);
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
    let startIndex = 0;

    // Detect and skip header row
    if (lines.length > 0) {
      const firstLine = lines[0].toLowerCase();
      if (firstLine.includes('name') && (firstLine.includes('company') || firstLine.includes('companies'))) {
        startIndex = 1;
      }
    }

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
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
      showNotification(`Loaded contacts for ${Object.keys(database).length} companies!`);
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
