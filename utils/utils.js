/**
 * Referral Bro - Utility Functions
 * Shared helper functions used across the extension
 */

const RB_UTILS = {
    /**
     * Escapes HTML to prevent XSS attacks
     */
    escapeHtml(text) {
        if (!text) return '';
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    },

    /**
     * Escapes special regex characters to prevent ReDoS attacks
     */
    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    },

    /**
     * Escapes a field for CSV format
     */
    escapeCSVField(field) {
        if (!field) return '';
        if (field.includes(',') || field.includes('"') || field.includes('\n')) {
            return `"${field.replace(/"/g, '""')}"`;
        }
        return field;
    },

    /**
     * Checks if URL is a supported job board
     */
    isSupportedUrl(url) {
        return RB_CONSTANTS.CONFIG.SUPPORTED_SITES.some(pattern => url.startsWith(pattern));
    },

    /**
     * Simple debounce function
     */
    debounce(fn, delay) {
        let timer;
        return function (...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    }
};

Object.freeze(RB_UTILS);
