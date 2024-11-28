// background.js
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.get(['stats'], (result) => {
        if (!result.stats) {
            chrome.storage.local.set({
                stats: {
                    timeSaved: 0,
                    siteStats: {},
                    slangUsed: 0,
                    brainRotLevel: 0,
                    brainCells: 3
                }
            });
        }
    });
});