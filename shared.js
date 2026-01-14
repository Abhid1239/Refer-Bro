/**
 * Referral Bro - Shared Constants
 * Central configuration used across popup.js and content.js
 */

const RB_CONFIG = {
    // Storage keys
    STORAGE_KEYS: {
        REFERRAL_DATA: 'referralData',
        LAST_UPDATED: 'lastUpdated',
        OVERLAY_MODE: 'overlayMode'
    },

    // Content script config
    BADGE_CLASS: 'referral-radar-badge',
    TOOLTIP_CLASS: 'referral-radar-tooltip',
    INJECTED_ATTR: 'data-rr-injected',

    // Performance
    DEBOUNCE_MS: 300,  // Reduced for faster SPA detection
    SEARCH_DEBOUNCE_MS: 300,
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB

    // Parsing
    IGNORE_TAGS: ['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME'],
    CLEAN_REGEX: /(Inc\.|Ltd\.|Pvt\.|LLC|Corporation|Corp\.|Group|Technology|Technologies|Solutions)/gi,

    // Supported job boards (for URL matching)
    SUPPORTED_SITES: [
        'https://www.linkedin.com/',
        'https://www.naukri.com/',
        'https://www.indeed.com/',
        'https://www.glassdoor.com/',
        'https://www.glassdoor.co.in/',
        'https://wellfound.com/',
        'https://angel.co/'
    ],

    // Site-specific selectors for company name detection
    // NOTE: LinkedIn uses atomic CSS with obfuscated class names now
    // We rely on generic tags + text length filtering (2-50 chars) to detect company names
    COMPANY_SELECTORS: [
        // Generic tags that commonly contain company names
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'a', 'strong', 'b', 'span', 'p',
        '.company-name', '[class*="company"]',

        // LinkedIn (new atomic CSS UI + legacy selectors)
        '.job-card-container__company-name',
        '.jobs-unified-top-card__company-name',
        '.job-details-jobs-unified-top-card__company-name',
        '.jobs-company-name',
        '[data-view-name="job-card"] p',
        '[data-view-name="jobs-unified-top-card"] p',

        // Naukri  
        '.comp-name', '.companyInfo', '.cname',

        // Indeed
        '[data-testid="company-name"]', '.companyName', '.company',
        '.jobsearch-CompanyInfoContainer', '.companyOverviewLink',

        // Glassdoor
        '[data-test="employer-short-name"]', '.EmployerProfile__employerName',
        '.job-search-key-l2rwgq', '.css-l2wkq4',

        // Wellfound
        '.company-link', '[class*="CompanyName"]'
    ]
};

// Freeze to prevent accidental modification
Object.freeze(RB_CONFIG);
Object.freeze(RB_CONFIG.STORAGE_KEYS);
Object.freeze(RB_CONFIG.IGNORE_TAGS);
Object.freeze(RB_CONFIG.SUPPORTED_SITES);
Object.freeze(RB_CONFIG.COMPANY_SELECTORS);
