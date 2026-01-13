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
    exportBtn: document.getElementById('export-btn'),
    // Copy prompt button
    copyPromptBtn: document.getElementById('copy-prompt-btn'),
    aiPrompt: document.getElementById('ai-prompt')
  };

  // --- Utilities ---

  let searchDebounceTimer;

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

    // Copy AI Prompt (null check for element)
    if (elements.copyPromptBtn) {
      elements.copyPromptBtn.addEventListener('click', handleCopyPrompt);
    }

    // Allow Enter key to submit Quick Add from Name or Companies field
    elements.addName.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleAddContact();
    });
    elements.addCompanies.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleAddContact();
    });
    elements.addNotes.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleAddContact();
    });
  }

  // --- Handlers ---

  /**
   * Copies the AI conversion prompt to clipboard.
   */
  function handleCopyPrompt() {
    if (!elements.aiPrompt) return;
    const promptText = elements.aiPrompt.textContent;
    navigator.clipboard.writeText(promptText).then(() => {
      elements.copyPromptBtn.textContent = '✅ Copied!';
      elements.copyPromptBtn.classList.add('copied');
      setTimeout(() => {
        elements.copyPromptBtn.textContent = '📋 Copy Prompt';
        elements.copyPromptBtn.classList.remove('copied');
      }, 2000);
    }).catch((err) => {
      console.error('[Referral Bro] Clipboard error:', err);
      showNotification('Failed to copy to clipboard', true);
    });
  }

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
            }).catch(() => {
              // Silently ignore - content script not loaded yet (expected behavior)
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
    return RB_UTILS.isSupportedUrl(url);
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

        // Show refresh hint on button temporarily
        const originalText = elements.addBtn.textContent;
        elements.addBtn.textContent = '🔄 Refresh page';
        elements.addBtn.style.background = '#057642';  // Green
        elements.addBtn.disabled = true;

        setTimeout(() => {
          elements.addBtn.textContent = originalText;
          elements.addBtn.style.background = '';  // Reset to CSS default
          elements.addBtn.disabled = false;
        }, 2000);

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
    return RB_UTILS.escapeCSVField(field);
  }

  function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const validExtensions = ['.csv', '.json'];
    const extension = validExtensions.find(ext => fileName.endsWith(ext));

    // Validate file type
    if (!extension) {
      showNotification('Please upload a CSV or JSON file', true);
      elements.fileInput.value = '';
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > RB_CONFIG.MAX_FILE_SIZE) {
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

    reader.readAsText(file);

    // Reset file input to allow re-uploading the same file
    elements.fileInput.value = '';
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
    }, RB_CONFIG.SEARCH_DEBOUNCE_MS);
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
                <div class="result-person">👤 ${RB_UTILS.escapeHtml(ref.name)}</div>
                <div class="result-note">${RB_UTILS.escapeHtml(ref.note)}</div>
              `;
      });

      item.innerHTML = html;
      elements.searchResults.appendChild(item);
    });
  }

  // Start
  init();
});
