/**
 * Referral Bro - Messaging Module
 * Handles the "Ask Referral/Interview" overlay in LinkedIn messages.
 */

// Note: RB_CONSTANTS is loaded from utils/constants.js

const MessagingModule = {
    // State
    observer: null,
    isGloballyHidden: false, // Global visibility state (once closed, all pages show closed)

    init() {
        console.log('[Referral Bro] Messaging Module Initializing...');
        this.loadHiddenState();
        this.startObserver();
        // Listen for storage changes to sync across tabs
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area === 'local' && changes[RB_CONSTANTS.STORAGE.OVERLAY_ENABLED]) {
                this.isGloballyHidden = !changes[RB_CONSTANTS.STORAGE.OVERLAY_ENABLED].newValue;
                this.refreshAllContainers();
            }
        });
    },

    loadHiddenState() {
        chrome.storage.local.get([RB_CONSTANTS.STORAGE.OVERLAY_ENABLED], (result) => {
            // Default to visible (true) if not set
            this.isGloballyHidden = result[RB_CONSTANTS.STORAGE.OVERLAY_ENABLED] === false;
        });
    },

    saveHiddenState() {
        chrome.storage.local.set({
            [RB_CONSTANTS.STORAGE.OVERLAY_ENABLED]: !this.isGloballyHidden
        });
    },

    startObserver() {
        // Observer for Chat Window appearance
        this.observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.addedNodes.length) {
                    this.checkForChatWindow();
                }
            }
        });

        this.observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    },

    checkForChatWindow() {
        const editors = document.querySelectorAll(RB_CONSTANTS.SELECTORS.MESSAGE_EDITOR);

        editors.forEach(editor => {
            const container = editor.closest(RB_CONSTANTS.SELECTORS.MESSAGE_FORM);
            if (!container) return;

            // Generate a unique ID for this conversation (using recipient name if possible)
            const threadId = this.getThreadId(container);

            // Already injected - but check if state changed
            if (container.dataset.rbInjected) {
                // Re-check global state to ensure consistency
                const hasOverlay = container.querySelector(`.${RB_CONSTANTS.UI.OVERLAY_CONTAINER}`);
                const hasRestore = container.querySelector('.rb-restore-btn');

                // State mismatch - fix it
                if (this.isGloballyHidden && hasOverlay) {
                    hasOverlay.remove();
                    this.injectRestoreButton(container, editor, threadId);
                } else if (!this.isGloballyHidden && hasRestore) {
                    hasRestore.remove();
                    this.injectOverlay(container, editor, threadId);
                }
                return;
            }

            container.dataset.rbInjected = 'true';

            // Decide whether to show Overlay or Restore Button (global state)
            if (this.isGloballyHidden) {
                this.injectRestoreButton(container, editor, threadId);
            } else {
                this.injectOverlay(container, editor, threadId);
            }
        });
    },

    getThreadId(container) {
        // Try to get recipient name from header
        // IMPORTANT: Query inside the specific container (popup or main window)
        // to avoid grabbing the wrong header in multiple-chat scenarios.

        // Go up to find the main bubble container if we are deep in the form
        const bubble = container.closest('.msg-overlay-conversation-bubble') ||
            container.closest('.msg-convo-wrapper') ||
            document; // Fallback to document for full page

        const header = bubble.querySelector(RB_CONSTANTS.SELECTORS.HEADER_TITLE);

        // Fallback: If no header found, use a random ID but session-consistent? 
        // No, better to use "unknown" to prevent crashes, handled by fallback logic.
        return header ? header.textContent.trim() : 'unknown_thread_' + Date.now();
    },

    injectOverlay(container, editor, threadId) {
        // Clean up any existing restore button
        const existingRestore = container.querySelector(`.${RB_CONSTANTS.UI.RESTORE_ICON}`);
        if (existingRestore) existingRestore.remove();

        // check if overlay already exists (sanity check)
        if (container.querySelector(`.${RB_CONSTANTS.UI.OVERLAY_CONTAINER}`)) return;

        // 1. Create Overlay
        const overlay = document.createElement('div');
        overlay.className = RB_CONSTANTS.UI.OVERLAY_CONTAINER;

        // 2. Add Buttons with slash separator
        overlay.innerHTML = `
            <button class="rb-overlay-btn" id="rb-btn-referral">
                <span class="icon">📄</span> Ask Referral
            </button>
            <span class="rb-separator">|</span>
            <button class="rb-overlay-btn" id="rb-btn-interview">
                <span class="icon">💼</span> Ask Interview
            </button>
            <button class="rb-close-btn" title="Minimize">×</button>
        `;

        // 3. Insert specific positioning
        // We use absolute positioning relative to the form container
        container.style.position = 'relative';
        container.appendChild(overlay);

        // 4. Bind Events
        overlay.querySelector('#rb-btn-referral').addEventListener('click', (e) => {
            e.preventDefault();
            this.handleAction('REFERRAL', editor, container);
        });

        overlay.querySelector('#rb-btn-interview').addEventListener('click', (e) => {
            e.preventDefault();
            this.handleAction('INTERVIEW', editor, container);
        });

        overlay.querySelector('.rb-close-btn').addEventListener('click', (e) => {
            e.preventDefault();
            this.dismissOverlay(container, overlay, editor, threadId);
        });
    },

    injectRestoreButton(container, editor, threadId) {
        // Clean up any existing overlay
        const existingOverlay = container.querySelector(`.${RB_CONSTANTS.UI.OVERLAY_CONTAINER}`);
        if (existingOverlay) existingOverlay.remove();

        // Prevent dupes
        if (container.querySelector('.rb-restore-btn')) return;

        // Detect if this is a popup bubble or sidebar messaging
        const isPopupBubble = !!container.closest('.msg-overlay-conversation-bubble');

        // Find the footer toolbar to inject
        const footer = container.querySelector('.msg-form__footer') ||
            container.querySelector('.msg-form__left-actions') ||
            container;

        const restoreBtn = document.createElement('button');
        restoreBtn.className = 'rb-restore-btn';
        restoreBtn.innerHTML = '⋮'; // Vertical dots
        restoreBtn.title = 'Show Referral Helper';
        restoreBtn.type = 'button';

        restoreBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.restoreOverlay(container, editor, threadId);
        });

        // Position differently based on context
        if (isPopupBubble) {
            // Popup bubble: insert after smiley (before send area)
            const leftActions = container.querySelector('.msg-form__left-actions');
            if (leftActions) {
                leftActions.appendChild(restoreBtn);
            } else {
                footer.appendChild(restoreBtn);
            }
        } else {
            // Sidebar: insert after the emoji button in footer
            const leftActions = container.querySelector('.msg-form__left-actions');
            if (leftActions) {
                leftActions.appendChild(restoreBtn);
            } else {
                footer.appendChild(restoreBtn);
            }
        }
    },

    refreshAllContainers() {
        // Re-scan all containers and update their UI based on global state
        const editors = document.querySelectorAll(RB_CONSTANTS.SELECTORS.MESSAGE_EDITOR);
        editors.forEach(editor => {
            const container = editor.closest(RB_CONSTANTS.SELECTORS.MESSAGE_FORM);
            if (!container) return;
            const threadId = this.getThreadId(container);

            // Clear existing injection state
            delete container.dataset.rbInjected;
            // Remove existing overlay or restore button
            const overlay = container.querySelector(`.${RB_CONSTANTS.UI.OVERLAY_CONTAINER}`);
            if (overlay) overlay.remove();
            const restoreBtn = container.querySelector('.rb-restore-btn');
            if (restoreBtn) restoreBtn.remove();

            // Re-inject based on current global state
            container.dataset.rbInjected = 'true';
            if (this.isGloballyHidden) {
                this.injectRestoreButton(container, editor, threadId);
            } else {
                this.injectOverlay(container, editor, threadId);
            }
        });
    },

    dismissOverlay(container, overlay, editor, threadId) {
        overlay.remove();
        this.isGloballyHidden = true;
        this.saveHiddenState();
        // Refresh all containers to show minimized state
        this.refreshAllContainers();
        console.log('[Referral Bro] Globally dismissed overlay');
    },

    restoreOverlay(container, editor, threadId) {
        this.isGloballyHidden = false;
        this.saveHiddenState();
        // Refresh all containers to show expanded state
        this.refreshAllContainers();
        console.log('[Referral Bro] Globally restored overlay');
    },

    handleAction(type, editor, container) {
        chrome.storage.local.get([RB_CONSTANTS.STORAGE.TEMPLATES], (result) => {
            const templates = result[RB_CONSTANTS.STORAGE.TEMPLATES] || RB_CONSTANTS.TEMPLATES;
            const templateText = type === 'REFERRAL' ? templates.REFERRAL : templates.INTERVIEW;

            const scrapedData = this.scrapeContext(container);
            const finalText = this.fillTemplate(templateText, scrapedData);
            this.insertText(editor, finalText);
        });
    },

    scrapeContext(container) {
        const data = {
            hrName: "there",
            company: "[Company]",
            position: "[Role]"
        };

        try {
            // Scope search to the specific chat bubble/window
            const bubble = container.closest('.msg-overlay-conversation-bubble') ||
                container.closest('.msg-convo-wrapper') ||
                document;

            // 1. Name
            const header = bubble.querySelector(RB_CONSTANTS.SELECTORS.HEADER_TITLE);
            if (header) {
                const fullName = header.textContent.trim();
                // primitive name extraction
                data.hrName = fullName.split(' ')[0] || fullName;
            }

            // 2. Company & Position
            // In popups, this info is harder to get as it's not usually in the header.
            // We'll try global scrape if local fails, OR look for "Current: Role at Company" in the profile sidebar if open.

            // For now, retaining the existing heuristic but scoped
            const jobCardCompany = document.querySelector('.job-details-jobs-unified-top-card__company-name');
            if (jobCardCompany) {
                data.company = jobCardCompany.textContent.trim();
            }

        } catch (e) {
            console.warn('[Referral Bro] Scraping failed:', e);
        }

        return data;
    },

    fillTemplate(template, data) {
        return template
            .replace(/\[HR Name\]/g, data.hrName)
            .replace(/\[Company Name\]/g, data.company)
            .replace(/\[Position\]/g, data.position);
    },

    insertText(editor, text) {
        editor.focus();

        if (document.queryCommandSupported('insertText')) {
            document.execCommand('insertText', false, text);
        } else {
            // Fallback
            const range = document.getSelection().getRangeAt(0);
            range.deleteContents();
            range.insertNode(document.createTextNode(text));
            // Trigger React change
            editor.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }
};

MessagingModule.init();
