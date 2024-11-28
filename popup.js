// popup.js
let retryCount = 0;
const MAX_RETRIES = 3;

document.addEventListener('DOMContentLoaded', () => {
    initializePopup();
    loadStatsWithRetry();
    setupEventListeners();
});

function initializePopup() {
    const darkmodeToggle = document.getElementById('darkmode-toggle');
    
    chrome.storage.local.get(['darkMode'], (result) => {
        const isDarkMode = result.darkMode || false;
        darkmodeToggle.checked = isDarkMode;
        document.body.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
    });

    darkmodeToggle.addEventListener('change', () => {
        const isDarkMode = darkmodeToggle.checked;
        document.body.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
        chrome.storage.local.set({ darkMode: isDarkMode });
    });
}

function loadStatsWithRetry() {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (!tabs[0]?.id) return;
        
        chrome.tabs.sendMessage(tabs[0].id, {action: 'getStats'}, (response) => {
            if (chrome.runtime.lastError) {
                if (retryCount < MAX_RETRIES) {
                    retryCount++;
                    setTimeout(loadStatsWithRetry, 1000); // Retry after 1 second
                    return;
                }
                // Load from storage as fallback
                chrome.storage.local.get(['stats'], (result) => {
                    if (result.stats) {
                        updateStatsDisplay(result.stats);
                    }
                });
                return;
            }
            if (response?.stats) {
                updateStatsDisplay(response.stats);
            }
        });
    });
}

function updateStatsDisplay(stats) {
    if (!stats) return;
    
    const elements = {
        'rot-meter': stats.brainRotLevel || 0,
        'slang-counter': `${stats.slangUsed || 0} fr fr`,
        'npc-level': `${stats.npcMode || 0}%`,
        'rizz-score': stats.rizzScore || 'No rizz'
    };

    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = typeof value === 'number' ? `${value}%` : value;
        }
    });
}

function setupEventListeners() {
    document.getElementById('meme-btn')?.addEventListener('click', () => {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (!tabs[0]?.id) return;
            
            chrome.tabs.sendMessage(tabs[0].id, {action: 'scanForMemes'}, (response) => {
                if (chrome.runtime.lastError) {
                    console.warn('Could not connect to content script');
                    return;
                }
                if (response?.success) {
                    loadStatsWithRetry();
                }
            });
        });
    });
}

// Listen for stats updates
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'statsUpdated' && request.stats) {
        updateStatsDisplay(request.stats);
    }
});