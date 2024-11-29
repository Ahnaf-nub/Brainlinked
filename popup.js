let retryCount = 0;
const MAX_RETRIES = 3;

document.addEventListener('DOMContentLoaded', () => {
    initializePopup();
    loadStatsWithRetry();
    setupEventListeners();
    loadCustomSlang();
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
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]?.id) return;

        chrome.tabs.sendMessage(tabs[0].id, { action: 'getStats' }, (response) => {
            if (chrome.runtime.lastError || !response) {
                // Content script not available in this tab
                console.warn('Content script not found in the current tab.');
                // Optionally load stats from storage
                chrome.storage.local.get(['stats'], (result) => {
                    if (result.stats) {
                        updateStatsDisplay(result.stats);
                    }
                });
                return;
            }
            if (response.stats) {
                updateStatsDisplay(response.stats);
            }
        });
    });
}

function updateStatsDisplay(stats) {
    if (!stats) return;
    
    const elements = {
        'rot-meter': `${stats.brainRotLevel || 0}%`,
        'slang-counter': `${stats.slangUsed || 0} fr fr`,
        'aura-score': stats.auraLabel || 'L Aura'
    };

    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    });
}

function setupEventListeners() {
    document.getElementById('add-slang-btn').addEventListener('click', addSlangTerm);
}

function loadCustomSlang() {
    chrome.storage.local.get(['customSlang'], (result) => {
        const slangList = result.customSlang || [];
        updateSlangListDisplay(slangList);
    });
}

function updateSlangListDisplay(slangList) {
    const slangListContainer = document.getElementById('slang-list');
    slangListContainer.innerHTML = '';
    slangList.forEach(term => {
        const termEl = document.createElement('div');
        termEl.className = 'slang-term';
        termEl.textContent = term;

        const removeBtn = document.createElement('button');
        removeBtn.textContent = '×';
        removeBtn.addEventListener('click', () => removeSlangTerm(term));

        termEl.appendChild(removeBtn);
        slangListContainer.appendChild(termEl);
    });
}

function addSlangTerm() {
    const slangInput = document.getElementById('slang-input');
    const term = slangInput.value.trim();
    if (!term) return;
    chrome.storage.local.get(['customSlang'], (result) => {
        let slangList = result.customSlang || [];
        if (!slangList.includes(term)) {
            slangList.push(term);
            chrome.storage.local.set({ customSlang: slangList }, () => {
                updateSlangListDisplay(slangList);
                slangInput.value = '';
                notifyContentScript();
            });
        }
    });
}

function removeSlangTerm(term) {
    chrome.storage.local.get(['customSlang'], (result) => {
        let slangList = result.customSlang || [];
        slangList = slangList.filter(t => t !== term);
        chrome.storage.local.set({ customSlang: slangList }, () => {
            updateSlangListDisplay(slangList);
            notifyContentScript();
        });
    });
}

function notifyContentScript() {
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
            if (tab.id) {
                chrome.tabs.sendMessage(tab.id, { action: 'updateSlang' });
            }
        });
    });
}

// Listen for stats updates
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'statsUpdated' && request.stats) {
        updateStatsDisplay(request.stats);
    }
});