/**
 * Referral Bro - Background Service Worker
 * Injects content scripts into existing matching tabs on install/update.
 */

chrome.runtime.onInstalled.addListener(async (details) => {
    // Run on both install and update
    if (details.reason !== 'install' && details.reason !== 'update') return;

    const manifest = chrome.runtime.getManifest();

    for (const cs of manifest.content_scripts) {
        try {
            const tabs = await chrome.tabs.query({ url: cs.matches });

            for (const tab of tabs) {
                // Skip invalid tabs
                if (!tab.id || !tab.url) continue;

                // Skip chrome:// and extension pages
                if (tab.url.match(/(chrome|chrome-extension|about|edge):\/\//gi)) continue;

                try {
                    // Inject JS
                    if (cs.js && cs.js.length > 0) {
                        await chrome.scripting.executeScript({
                            target: { tabId: tab.id },
                            files: cs.js,
                        });
                    }

                    // Inject CSS
                    if (cs.css && cs.css.length > 0) {
                        await chrome.scripting.insertCSS({
                            target: { tabId: tab.id },
                            files: cs.css,
                        });
                    }

                    console.log(`[Referral Bro] Injected into tab ${tab.id}: ${tab.url}`);
                } catch (tabError) {
                    // This tab couldn't be injected (e.g., protected page, discarded tab)
                    console.warn(`[Referral Bro] Could not inject into tab ${tab.id}:`, tabError.message);
                }
            }
        } catch (error) {
            console.error('[Referral Bro] Error querying tabs:', error.message);
        }
    }
});
