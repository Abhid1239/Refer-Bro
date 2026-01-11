/**
 * Referral Bro - Constants
 * Centralized configuration and stable selectors.
 * Unifies previous 'shared.js' and new 'messaging' constants.
 */

const RB_CONSTANTS = {
    // Storage Keys
    STORAGE: {
        // Core Data
        REFERRAL_DATA: 'referralData',
        LAST_UPDATED: 'lastUpdated',
        OVERLAY_MODE: 'overlayMode',

        // Messaging Feature
        TEMPLATES: 'rb_templates',
        HIDDEN_THREADS: 'rb_hidden_threads',
        OVERLAY_ENABLED: 'rb_overlay_enabled'
    },

    // Configuration & Performance
    CONFIG: {
        DEBOUNCE_MS: 800,
        SEARCH_DEBOUNCE_MS: 300,
        MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
        SUPPORTED_SITES: [
            'https://www.linkedin.com/',
            'https://www.naukri.com/',
            'https://www.indeed.com/',
            'https://www.glassdoor.com/',
            'https://www.glassdoor.co.in/',
            'https://wellfound.com/',
            'https://angel.co/'
        ]
    },

    // Parsing & Regex
    PARSING: {
        IGNORE_TAGS: ['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME'],
        CLEAN_REGEX: /(Inc\.|Ltd\.|Pvt\.|LLC|Corporation|Corp\.|Group|Technology|Technologies|Solutions)/gi,
    },

    // Default Templates
    TEMPLATES: {
        REFERRAL: "Hi [HR Name], I saw the [Position] role at [Company Name] and would love a referral. My background aligns well with the requirements. Would you be open to reviewing my profile?",
        INTERVIEW: "Hi [HR Name], I'm interested in the [Position] role at [Company Name]. I have experience in this domain and would love to chat about how I can contribute."
    },

    // DOM Selectors
    SELECTORS: {
        // --- Messaging Feature ---
        CHAT_WINDOW: 'div[role="dialog"][aria-label*="Messaging"], .msg-overlay-conversation-bubble, .msg-overlay-list-bubble',
        MESSAGE_EDITOR: 'div[role="textbox"][contenteditable="true"]',
        MESSAGE_FORM: 'form.msg-form',
        HEADER_TITLE: '.msg-overlay-bubble-header__title, h2[id*="thread-detail"], .msg-overlay-bubble-header__title .truncate',
        INPUT_CONTAINER: '.msg-form__contenteditable, .msg-form__footer',

        // --- Scraping (Company Name Detection) ---
        COMPANY: [
            // Generic
            'h1', 'h2', 'h3', 'h4', 'h5', 'a', 'strong',
            '.company-name', '[class*="company"]',
            // LinkedIn
            '.job-card-container__company-name',
            '.jobs-unified-top-card__company-name',
            // Sidebar/Context for Messaging
            '.job-details-jobs-unified-top-card__company-name',
            // Naukri  
            '.comp-name', '.companyInfo',
            // Indeed
            '[data-testid="company-name"]', '.companyName', '.company',
            '.jobsearch-CompanyInfoContainer', '.companyOverviewLink',
            // Glassdoor
            '[data-test="employer-short-name"]', '.EmployerProfile__employerName',
            '.job-search-key-l2rwgq', '.css-l2wkq4',
            // Wellfound
            '.company-link', '[class*="CompanyName"]'
        ]
    },

    // UI Class Names & Attributes
    UI: {
        // Badge Feature
        BADGE_CLASS: 'referral-radar-badge',
        TOOLTIP_CLASS: 'referral-radar-tooltip',
        INJECTED_ATTR: 'data-rr-injected',

        // Messaging Overlay
        OVERLAY_CONTAINER: 'rb-overlay-container',
        BUTTON_PRIMARY: 'rb-btn-primary',
        BUTTON_SECONDARY: 'rb-btn-secondary',
        CLOSE_ICON: 'rb-close-icon',
        RESTORE_ICON: 'rb-restore-icon'
    }
};

// Prevent modification
Object.freeze(RB_CONSTANTS);
