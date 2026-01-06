/**
 * Referral Bro Content Script
 * ------------------------------
 * Scans page DOM for company names matches and injects referral badges.
 * Features: Heuristic scanning, infinite scroll support, CSS-only tooltip.
 * 
 * Dependencies: shared.js, utils.js (loaded before this file)
 */

// --- State ---
let state = {
    overlayMode: true,
    referralData: {},     // { "GOOGLE": [{name, note}, ...], ... }
    processedNodes: new WeakSet(),
    isScanning: false,
    knownCompanies: new Set()
};

// --- Initialization ---

/**
 * Main Entry Point
 * Loads settings and starts observers.
 */
function init() {
    chrome.storage.local.get(['referralData', 'overlayMode'], (result) => {
        if (result.referralData) {
            state.referralData = result.referralData;
            state.knownCompanies = new Set(Object.keys(result.referralData));
        }

        if (result.overlayMode !== undefined) {
            state.overlayMode = result.overlayMode;
        }

        if (state.overlayMode) {
            startObserving();
            // Initial scan with slight delay to ensure dynamic content load
            setTimeout(scanPage, 1000);
        }
    });
}

// Listen for messages from Popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'UPDATE_MODE') {
        state.overlayMode = request.mode;
        if (state.overlayMode) {
            scanPage();
            startObserving();
        } else {
            stopScanning();
        }
    }
});

// Listen for storage changes to sync data updates
chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.referralData) {
        state.referralData = changes.referralData.newValue || {};
        state.knownCompanies = new Set(Object.keys(state.referralData));
        // Re-scan with updated data
        state.processedNodes = new WeakSet();
        if (state.overlayMode) {
            scanPage();
        }
    }
});

// Start
init();

// --- Logic ---

let observer;
let debounceTimer;

/**
 * Sets up MutationObserver to watch for DOM changes (Infinite scroll, SPA nav)
 */
function startObserving() {
    if (observer) return;

    observer = new MutationObserver((mutations) => {
        if (!state.overlayMode) return;

        // Debounce scan calls
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(scanPage, RB_CONFIG.DEBOUNCE_MS);
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: false
    });
}

/**
 * Removes all injected elements and stops scanning.
 * Properly cleans up observer and timers to prevent memory leaks.
 */
function stopScanning() {
    // Disconnect observer to stop watching for changes
    if (observer) {
        observer.disconnect();
        observer = null;
    }

    // Clear any pending debounce timer
    clearTimeout(debounceTimer);

    // Remove all injected elements
    document.querySelectorAll(`.${RB_CONFIG.BADGE_CLASS}`).forEach(el => el.remove());
    document.querySelectorAll(`.${RB_CONFIG.TOOLTIP_CLASS}`).forEach(el => el.remove());

    // Clear cache so we can re-inject if enabled
    state.processedNodes = new WeakSet();
}

/**
 * Scans the page for company names using heuristics.
 */
function scanPage() {
    if (state.isScanning || !state.overlayMode) return;
    state.isScanning = true;

    try {
        // Select potential elements that might contain company names.
        // Site-specific selectors for better detection
        const candidates = document.querySelectorAll(RB_CONFIG.COMPANY_SELECTORS.join(', '));

        candidates.forEach(node => {
            // 1. Skip if already processed or invalid
            if (state.processedNodes.has(node)) return;
            if (node.hasAttribute(RB_CONFIG.INJECTED_ATTR)) return;
            if (RB_CONFIG.IGNORE_TAGS.includes(node.tagName)) return;

            const rawText = node.textContent.trim();

            // 2. Quick filters (Length check)
            if (!rawText || rawText.length < 2 || rawText.length > 50) return;

            // 3. Normalize Text
            const cleanText = rawText.replace(RB_CONFIG.CLEAN_REGEX, '').trim().toUpperCase();

            // 4. Checking Matches
            // Strategy A: Exact Match (High Confidence)
            if (state.knownCompanies.has(cleanText)) {
                injectBadge(node, cleanText);
            }
            // Strategy B: Substring Match (Lower Confidence, requires length > 3 to avoid noise)
            else {
                for (const company of state.knownCompanies) {
                    if (company.length > 3 && cleanText.includes(company)) {
                        // Regex for word boundary check, e.g. "Google" matches "Google Cloud" but "Go" doesn't match "Google"
                        // Escape special regex characters to prevent ReDoS attacks
                        const escapedCompany = RB_UTILS.escapeRegex(company);
                        const regex = new RegExp(`\\b${escapedCompany}\\b`, 'i');
                        if (regex.test(cleanText)) {
                            injectBadge(node, company);
                            break; // Stop after first match
                        }
                    }
                }
            }

            // Mark as processed regardless of match to avoid re-scanning
            state.processedNodes.add(node);
        });

    } catch (err) {
        console.error('[Referral Radar] Scan error:', err);
    } finally {
        state.isScanning = false;
    }
}

/**
 * Injects the referral badge next to the target element.
 * @param {HTMLElement} targetNode 
 * @param {string} companyName 
 */
function injectBadge(targetNode, companyName) {
    // Double-check prevention
    if (targetNode.dataset.rrInjected === 'true') return;

    // Check sibling to avoid visual duplicates
    if (targetNode.nextElementSibling && targetNode.nextElementSibling.classList.contains(RB_CONFIG.BADGE_CLASS)) {
        targetNode.dataset.rrInjected = 'true';
        return;
    }

    const referrers = state.referralData[companyName];
    if (!referrers || referrers.length === 0) return;

    // Mark Injected
    targetNode.dataset.rrInjected = 'true';
    targetNode.setAttribute(RB_CONFIG.INJECTED_ATTR, 'true');

    // Create Badge
    const badge = document.createElement('span');
    badge.className = RB_CONFIG.BADGE_CLASS;
    // UI: Chat icon + Count
    const countLabel = referrers.length === 1 ? '1 Refer Bro' : `${referrers.length} Refer Bros`;
    badge.innerHTML = `<span class="rr-icon">💬</span> <span class="rr-text">${countLabel}</span>`;
    badge.title = `Click to see who looks at ${companyName}`;

    // Interaction
    badge.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleTooltip(e, companyName, referrers);
    });

    // Insertion Logic
    // Insert AFTER the element to avoid breaking its internal layout (e.g. inside an <a>)
    try {
        const parent = targetNode.parentNode;
        if (targetNode.tagName === 'A' || (parent && parent.style && parent.style.display === 'flex')) {
            targetNode.insertAdjacentElement('afterend', badge);
        } else {
            targetNode.appendChild(badge);
        }
    } catch (insertError) {
        console.warn('[Referral Bro] Badge insertion failed:', insertError.message);
    }
}

// --- Tooltip & UI Logic ---

let activeTooltip = null;

function toggleTooltip(event, companyName, referrers) {
    // If clicking open tooltip, close it
    if (activeTooltip) {
        activeTooltip.remove();
        activeTooltip = null;
        // If we just clicked the SAME badge, return (toggle off)
        // We assume mostly user wants to close or open another.
        // For simplicity, we just rebuild.
    }

    const tooltip = document.createElement('div');
    tooltip.className = RB_CONFIG.TOOLTIP_CLASS;

    // Build Content
    const listItems = referrers.map(ref => `
    <div class="referral-radar-referrer">
      <div class="rr-name-row">
        <span class="rr-name">${RB_UTILS.escapeHtml(ref.name)}</span>
      </div>
      <div class="rr-note">${RB_UTILS.escapeHtml(ref.note)}</div>
      <button class="referral-radar-copy-btn" data-name="${RB_UTILS.escapeHtml(ref.name)}">Copy Name</button>
    </div>
  `).join('');

    tooltip.innerHTML = `
    <div class="rr-tooltip-header">
      <h4>${companyName}</h4>
      <span class="rr-close-btn" id="rr-close">×</span>
    </div>
    <div class="rr-tooltip-content">
      ${listItems}
    </div>
  `;

    document.body.appendChild(tooltip);

    // Smart Positioning
    const tooltipWidth = 300; // Defined in CSS
    const tooltipHeight = 200; // Approximate max height (or calculate dynamic)

    // Viewport dimensions
    const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    let left = event.pageX + 10;
    let top = event.pageY + 10;

    // Prevent Horizontal Overflow (Right edge)
    if ((left - scrollX) + tooltipWidth > vw) {
        // Shift to the left of the cursor
        left = event.pageX - tooltipWidth - 10;
    }

    // Prevent Vertical Overflow (Bottom edge)
    // We don't verify exact height here but assume a safe buffer. 
    // If too low, flip up.
    if ((top - scrollY) + tooltipHeight > vh) {
        top = event.pageY - tooltipHeight - 10;
    }

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;

    activeTooltip = tooltip;

    // Bind Events
    tooltip.querySelector('#rr-close').addEventListener('click', closeTooltip);

    tooltip.querySelectorAll('.referral-radar-copy-btn').forEach(btn => {
        btn.addEventListener('click', handleCopy);
    });

    // Delay outside click listener to prevent immediate closing
    setTimeout(() => {
        document.addEventListener('click', closeOutside);
    }, 50);
}

function handleCopy(e) {
    const name = e.target.getAttribute('data-name');
    if (!name) return;

    navigator.clipboard.writeText(name).then(() => {
        e.target.textContent = 'Copied!';
        e.target.classList.add('copied');
        setTimeout(() => {
            e.target.textContent = 'Copy Name';
            e.target.classList.remove('copied');
        }, 2000);
    }).catch((err) => {
        console.warn('[Referral Bro] Copy failed:', err.message);
        e.target.textContent = 'Failed';
        setTimeout(() => {
            e.target.textContent = 'Copy Name';
        }, 1500);
    });
}

function closeTooltip() {
    if (activeTooltip) {
        activeTooltip.remove();
        activeTooltip = null;
    }
    document.removeEventListener('click', closeOutside);
}

function closeOutside(e) {
    if (activeTooltip && !activeTooltip.contains(e.target) && !e.target.classList.contains(RB_CONFIG.BADGE_CLASS)) {
        closeTooltip();
    }
}
