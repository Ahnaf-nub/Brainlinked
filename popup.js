// popup.js
document.addEventListener('DOMContentLoaded', () => {
    initializePopup();
    loadStats();
    setupEventListeners();
});

function initializePopup() {
    const darkmodeToggle = document.getElementById('darkmode-toggle');
    darkmodeToggle.addEventListener('change', () => {
        document.body.setAttribute('data-theme', 
            darkmodeToggle.checked ? 'dark' : 'light');
    });
}

function loadStats() {
    chrome.storage.local.get(['stats'], (result) => {
        if (result.stats) {
            updateStatsDisplay(result.stats);
        }
    });
}

function updateStatsDisplay(stats) {
    document.getElementById('posts-blocked').textContent = stats.postsBlocked;
    document.getElementById('time-saved').textContent = `${stats.timeSaved}min`;
    document.getElementById('productivity').textContent = 
        `+${Math.floor(stats.timeSaved / 60 * 10)}%`;
    updateMentalHealthScore(stats.postsBlocked);
    
    const siteTimesDiv = document.getElementById('site-times');
    siteTimesDiv.innerHTML = '';
    
    Object.entries(stats.siteStats).forEach(([domain, data]) => {
        const siteDiv = document.createElement('div');
        siteDiv.innerHTML = `${domain}: ${data.timeSpent}min`;
        siteTimesDiv.appendChild(siteDiv);
    });
}

function setupEventListeners() {
    document.getElementById('pause-btn').addEventListener('click', togglePause);
    document.getElementById('export-btn').addEventListener('click', exportStats);
    document.getElementById('reset-btn').addEventListener('click', resetData);
    document.getElementById('new-keyword').addEventListener('keypress', addKeyword);
}

// Add other necessary functions here