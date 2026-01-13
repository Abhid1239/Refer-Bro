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
    isScanning: false,
    knownCompanies: new Set(),
    lastUrl: window.location.href,  // Track URL for SPA navigation detection
    scanCount: 0,  // Track scan waves for rehydration handling
    badgeMap: new Map()  // Map<element, badgeElement> to track injected badges
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
            // Initial scan immediately
            scanPage();
            // Multiple scan waves to handle React rehydration
            // React typically rehydrates within 500-2000ms
            scheduleRehydrationScans();
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
        // Clear badge tracking and re-scan with updated data
        state.badgeMap.clear();
        if (state.overlayMode) {
            scanPage();
        }
    }
});

// Start
init();

// --- SPA Navigation Detection ---
// LinkedIn and other job boards use client-side routing (History API)
// We need to detect URL changes that don't trigger full page reloads

/**
 * Handles SPA navigation by detecting URL changes
 * and re-scanning the page with fresh state
 */
function handleNavigation() {
    const currentUrl = window.location.href;
    if (currentUrl !== state.lastUrl) {
        console.log('[Referral Bro] SPA navigation detected:', currentUrl);
        state.lastUrl = currentUrl;
        state.scanCount = 0;

        // Clear badge tracking for fresh start
        state.badgeMap.clear();

        // Remove any existing badges (page content has changed)
        document.querySelectorAll(`.${RB_CONFIG.BADGE_CLASS}`).forEach(el => el.remove());
        document.querySelectorAll(`.${RB_CONFIG.TOOLTIP_CLASS}`).forEach(el => el.remove());

        // Close active tooltip if any
        if (activeTooltip) {
            activeTooltip.remove();
            activeTooltip = null;
        }

        // Schedule rehydration-safe scans
        if (state.overlayMode) {
            scheduleRehydrationScans();
        }
    }
}

// Intercept History API methods (pushState and replaceState)
const originalPushState = history.pushState;
const originalReplaceState = history.replaceState;

history.pushState = function (...args) {
    originalPushState.apply(this, args);
    handleNavigation();
};

history.replaceState = function (...args) {
    originalReplaceState.apply(this, args);
    handleNavigation();
};

// Listen for browser back/forward navigation
window.addEventListener('popstate', handleNavigation);

// Also check periodically for URL changes (fallback for edge cases)
let urlCheckInterval;
function startUrlMonitoring() {
    if (urlCheckInterval) return;
    urlCheckInterval = setInterval(() => {
        if (window.location.href !== state.lastUrl) {
            handleNavigation();
        }
    }, 1000);
}

startUrlMonitoring();

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

    // Clear badge tracking
    state.badgeMap.clear();
}

/**
 * Schedules multiple scan waves to handle React rehydration.
 * React typically rehydrates within 100-2000ms, so we scan at key intervals.
 */
let rehydrationTimers = [];
function scheduleRehydrationScans() {
    // Clear any existing timers
    rehydrationTimers.forEach(t => clearTimeout(t));
    rehydrationTimers = [];

    // Scan at strategic intervals:
    // - 100ms: Quick initial scan
    // - 500ms: After initial React render
    // - 1500ms: After most async data loads
    // - 3000ms: Final catch-all for slow content
    const intervals = [100, 500, 1500, 3000];

    intervals.forEach(delay => {
        const timer = setTimeout(() => {
            state.scanCount++;
            console.log(`[Referral Bro] Rehydration scan wave ${state.scanCount}`);
            scanPage();
        }, delay);
        rehydrationTimers.push(timer);
    });
}

/**
 * Generates a stable identifier for an element based on its text content and position.
 * Used to track which elements we've already processed.
 */
function getElementId(node) {
    const text = node.textContent.trim().toUpperCase().slice(0, 50);
    const tagName = node.tagName;
    // Include parent info for more uniqueness
    const parentTag = node.parentElement?.tagName || '';
    return `${tagName}::${parentTag}::${text}`;
}

/**
 * Scans the page for company names using heuristics.
 * Handles React rehydration by checking if badges still exist.
 */
function scanPage() {
    if (state.isScanning || !state.overlayMode) return;
    state.isScanning = true;

    try {
        // First: Check if any previously injected badges were removed by React
        // and re-inject them if their target elements still exist
        checkAndRestoreBadges();

        // Select potential elements that might contain company names.
        // Site-specific selectors for better detection
        const candidates = document.querySelectorAll(RB_CONFIG.COMPANY_SELECTORS.join(', '));

        // Track containers that already have a badge to prevent duplicates
        const badgedContainers = new Set();

        candidates.forEach(node => {
            // 1. Skip if already has a valid badge
            if (hasValidBadge(node)) return;
            if (RB_CONFIG.IGNORE_TAGS.includes(node.tagName)) return;

            // 2. Skip visually hidden elements (accessibility text)
            if (isHiddenElement(node)) return;

            const rawText = node.textContent.trim();

            // 3. Quick filters (Length check)
            if (!rawText || rawText.length < 2 || rawText.length > 50) return;

            // 4. Skip hashtags and accessibility patterns
            if (rawText.startsWith('#')) return;  // Skip hashtags like #Atlassian
            if (rawText.startsWith('View page for')) return;  // LinkedIn accessibility text
            if (rawText.startsWith('See more about')) return;

            // 5. Container deduplication - only one badge per result card/container
            const container = findResultContainer(node);
            if (container && badgedContainers.has(container)) return;

            // 6. Normalize Text
            const cleanText = rawText.replace(RB_CONFIG.CLEAN_REGEX, '').trim().toUpperCase();

            // 7. Checking Matches
            // Strategy A: Exact Match (High Confidence)
            if (state.knownCompanies.has(cleanText)) {
                // Skip if a more specific inner element has the same company
                if (!hasMoreSpecificDescendant(node, cleanText)) {
                    if (injectBadge(node, cleanText)) {
                        // Mark container as badged to prevent duplicates
                        if (container) badgedContainers.add(container);
                    }
                }
            }
            // Strategy B: Word Boundary Match (requires length > 3 to avoid noise)
            else {
                for (const company of state.knownCompanies) {
                    // Quick check first - skip if company not in text at all
                    if (company.length > 3 && cleanText.includes(company)) {
                        // Word boundary check - "Amazon" matches "Amazon Web Services" 
                        // but NOT "Amazonabc" or "MyAmazon"
                        const beforeOk = cleanText.indexOf(company) === 0 ||
                            !/[A-Z0-9]/.test(cleanText.charAt(cleanText.indexOf(company) - 1));
                        const afterIndex = cleanText.indexOf(company) + company.length;
                        const afterOk = afterIndex >= cleanText.length ||
                            !/[A-Z0-9]/.test(cleanText.charAt(afterIndex));

                        if (beforeOk && afterOk) {
                            // Skip if a more specific inner element has the same company
                            if (!hasMoreSpecificDescendant(node, company)) {
                                if (injectBadge(node, company)) {
                                    // Mark container as badged to prevent duplicates
                                    if (container) badgedContainers.add(container);
                                }
                            }
                            break; // Stop after first match
                        }
                    }
                }
            }
        });

    } catch (err) {
        console.error('[Referral Bro] Scan error:', err);
    } finally {
        state.isScanning = false;
    }
}

/**
 * Checks if an element already has a valid (not removed) badge.
 */
function hasValidBadge(node) {
    // Check via data attribute
    if (node.dataset.rrInjected !== 'true') return false;

    // Verify the badge still exists in DOM
    const badge = state.badgeMap.get(node);
    if (badge && document.body.contains(badge)) {
        return true;
    }

    // Badge was removed (React rehydration), clear the marker
    delete node.dataset.rrInjected;
    node.removeAttribute(RB_CONFIG.INJECTED_ATTR);
    state.badgeMap.delete(node);
    return false;
}

/**
 * Checks if an element is visually hidden (accessibility text).
 * These should not get badges as they're not visible to users.
 */
function isHiddenElement(node) {
    // Check for common hidden class patterns
    const hiddenClasses = ['visually-hidden', 'sr-only', 'a11y-text', 'screen-reader'];
    const className = node.className || '';

    if (typeof className === 'string') {
        for (const hiddenClass of hiddenClasses) {
            if (className.includes(hiddenClass)) return true;
        }
    }

    // Check aria-hidden
    if (node.getAttribute('aria-hidden') === 'true') return true;

    // Check if any ancestor is hidden
    let parent = node.parentElement;
    let depth = 0;
    while (parent && depth < 5) {
        const parentClass = parent.className || '';
        if (typeof parentClass === 'string') {
            for (const hiddenClass of hiddenClasses) {
                if (parentClass.includes(hiddenClass)) return true;
            }
        }
        if (parent.getAttribute('aria-hidden') === 'true') return true;
        parent = parent.parentElement;
        depth++;
    }

    return false;
}

/**
 * Finds the result container (card) that an element belongs to.
 * Used for one-badge-per-card deduplication.
 */
function findResultContainer(node) {
    // LinkedIn search result container selectors
    const containerSelectors = [
        '[data-view-name="search-entity-result-item"]',
        '.search-result__wrapper',
        '.entity-result',
        '.job-card-container',
        '[data-chameleon-result-urn]',
        'li[class*="result"]'
    ];

    // Walk up the DOM to find the container
    let current = node.parentElement;
    let depth = 0;
    const maxDepth = 15;

    while (current && depth < maxDepth) {
        for (const selector of containerSelectors) {
            try {
                if (current.matches && current.matches(selector)) {
                    return current;
                }
            } catch (e) {
                // matches() might throw on invalid selectors
            }
        }
        current = current.parentElement;
        depth++;
    }

    return null;
}

/**
 * Checks all tracked badges and re-injects any that were removed.
 */
function checkAndRestoreBadges() {
    // Iterate through badgeMap and check if badges still exist
    for (const [targetNode, badge] of state.badgeMap.entries()) {
        // If the target node is no longer in DOM, remove it from tracking
        if (!document.body.contains(targetNode)) {
            state.badgeMap.delete(targetNode);
            continue;
        }

        // If badge was removed by React, re-inject it
        if (!document.body.contains(badge)) {
            console.log('[Referral Bro] Badge removed by React, re-injecting...');
            const companyName = targetNode.dataset.rrCompany;
            if (companyName) {
                // Clear markers and re-inject
                delete targetNode.dataset.rrInjected;
                targetNode.removeAttribute(RB_CONFIG.INJECTED_ATTR);
                state.badgeMap.delete(targetNode);
                injectBadge(targetNode, companyName);
            }
        }
    }
}

/**
 * Checks if any descendant (up to maxLevels deep) contains the same company name.
 * If so, we should skip injecting badge on this element and let the more specific
 * inner element handle it (prevents badges on large <a> blocks).
 */
function hasMoreSpecificDescendant(node, companyName, maxLevels = 3) {
    const selectors = RB_CONFIG.COMPANY_SELECTORS.join(', ');

    try {
        // Find all potential company-containing descendants
        const descendants = node.querySelectorAll(selectors);

        for (const desc of descendants) {
            // Skip the node itself
            if (desc === node) continue;

            // Check nesting level
            let level = 0;
            let parent = desc.parentElement;
            while (parent && parent !== node && level < maxLevels) {
                parent = parent.parentElement;
                level++;
            }
            if (level >= maxLevels) continue;

            // Check if this descendant contains the same company
            const descText = desc.textContent.trim().toUpperCase()
                .replace(RB_CONFIG.CLEAN_REGEX, '').trim();

            if (descText.length >= 2 && descText.length <= 50) {
                if (descText === companyName || descText.includes(companyName)) {
                    return true; // Found a more specific descendant
                }
            }
        }
    } catch (e) {
        // querySelectorAll might fail on some nodes
    }

    return false;
}

/**
 * Injects the referral badge next to the target element.
 * @param {HTMLElement} targetNode 
 * @param {string} companyName 
 * @returns {boolean} true if badge was successfully injected
 */
function injectBadge(targetNode, companyName) {
    // Double-check prevention
    if (targetNode.dataset.rrInjected === 'true') {
        // Verify badge still exists
        const existingBadge = state.badgeMap.get(targetNode);
        if (existingBadge && document.body.contains(existingBadge)) {
            return false; // Badge exists, nothing to do
        }
        // Badge was removed, allow re-injection
    }

    // Check sibling to avoid visual duplicates
    if (targetNode.nextElementSibling && targetNode.nextElementSibling.classList.contains(RB_CONFIG.BADGE_CLASS)) {
        targetNode.dataset.rrInjected = 'true';
        targetNode.dataset.rrCompany = companyName;
        return false;
    }

    const referrers = state.referralData[companyName];
    if (!referrers || referrers.length === 0) return false;

    // Mark Injected with company name for re-injection after rehydration
    targetNode.dataset.rrInjected = 'true';
    targetNode.dataset.rrCompany = companyName;
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

        // Track the badge in our Map for rehydration detection
        state.badgeMap.set(targetNode, badge);

        return true; // Successfully injected

    } catch (insertError) {
        console.warn('[Referral Bro] Badge insertion failed:', insertError.message);
        return false;
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
