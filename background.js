chrome.runtime.onInstalled.addListener(async () => {
    for (const cs of chrome.runtime.getManifest().content_scripts) {
        for (const tab of await chrome.tabs.query({ url: cs.matches })) {
            if (tab.url.match(/(chrome|chrome-extension):\/\//gi)) continue;
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: cs.js,
            });
            chrome.scripting.insertCSS({
                target: { tabId: tab.id },
                files: cs.css,
            });
        }
    }
});
