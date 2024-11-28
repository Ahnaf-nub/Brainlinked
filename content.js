// content.js
class BrainRotDetector {
    constructor() {
        this.stats = {
            timeSaved: 0,
            siteStats: {},
            slangUsed: 0,
            brainRotLevel: 0
        };
        this.startTime = Date.now();
        this.memeVocab = [
            'fr fr', 'no cap', 'bussin', 'skibidi', 'rizz',
            'gyatt', 'based', 'sheesh', 'sigma'
        ];
        this.socialMediaDomains = {
            'linkedin.com': 'LinkedIn',
            'www.linkedin.com': 'LinkedIn',
            'facebook.com': 'Facebook',
            'www.facebook.com': 'Facebook',
            'instagram.com': 'Instagram',
            'www.instagram.com': 'Instagram'
        };
        this.slangSuggestions = {
            'fr': ['fr fr', 'frfr'],
            'no': ['no cap', 'no shot'],
            'bu': ['bussin'],
            'sk': ['skibidi'],
            'ri': ['rizz', 'rizzy'],
            'gy': ['gyatt'],
            'ba': ['based'],
            'sh': ['sheesh'],
            'ba': ['balkan rage'],
            'si': ['sigma'],
            'gri': ['grimace shake'],
            'oh': ['ohio'],
            'fa': ['fanum tax'],
            'th': ['those who know'],
            'st': ['still water'],
        };
        this.isScanning = false;
        this.initialized = false;

        this.rizzWeights = {
            'rizz': 2.0,
            'based': 1.5,
            'fr fr': 1.2,
            'no cap': 1.2,
            'gyatt': 1.8,
            'sigma': 1.5,
            'W': 1.3,
            'lowkey': 1.1
        };
        
        this.rizzCategories = [
            { threshold: 0, label: 'No rizz' },
            { threshold: 30, label: 'Lowkey rizz' },
            { threshold: 50, label: 'Mid rizz' },
            { threshold: 70, label: 'W rizz' },
            { threshold: 90, label: 'Maximum rizz' }
        ];

        // Handle overlay close messages
        window.addEventListener('message', (event) => {
            if (event.data === 'closeMeme') {
                this.removeOverlay('meme-overlay.html');
            }
            if (event.data === 'closeGrass') {
                this.removeOverlay('touch-grass.html');
            }
        });

        // Setup input monitoring
        this.setupInputMonitoring();
    }

    async initialize() {
        if (this.initialized) return;
        
        await this.loadSettings();
        this.setupMessageListener();
        
        // Special handling for LinkedIn
        if (window.location.hostname.includes('linkedin.com')) {
            await new Promise(resolve => {
                const checkFeed = () => {
                    if (document.querySelector('.core-rail, .feed-shared-update-v2')) {
                        resolve();
                    } else {
                        setTimeout(checkFeed, 500);
                    }
                };
                checkFeed();
            });
        }
        
        try {
            this.setupObserver();
            this.trackTimeSpent();
            this.initialized = true;
        } catch (error) {
            console.warn('BrainRotDetector: Initialization failed', error);
            this.initialized = false;
        }
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'scanForMemes') {
                this.scanContent();
                sendResponse({success: true});
            }
            if (request.action === 'getStats') {
                sendResponse({stats: this.stats});
            }
            return true;
        });
    }

    setupObserver() {
        if (this.observer) return;
        
        this.observer = new MutationObserver((mutations) => {
            if (!this.isScanning && !this.debounceTimer) {
                this.debounceTimer = setTimeout(() => {
                    this.scanContent();
                    this.debounceTimer = null;
                }, 2000);
            }
        });

        try {
            this.observer.observe(document.body, {
                childList: true,
                subtree: true,
                characterData: true
            });
        } catch (error) {
            console.warn('BrainRotDetector: Observer setup failed', error);
        }
    }

    scanContent() {
        if (this.isScanning) return;
        this.isScanning = true;

        try {
            const visibleText = document.visibleText || document.body.innerText;
            let memeCount = 0;
            const slangTypes = this.stats.slangTypes || {};

            this.memeVocab.forEach(word => {
                const regex = new RegExp(word, 'gi');
                const matches = (visibleText.match(regex) || []).length;
                if (matches > 0) {
                    memeCount += matches;
                    slangTypes[word] = (slangTypes[word] || 0) + matches;
                }
            });

            if (memeCount > 0) {
                this.stats.slangUsed += memeCount;
                this.stats.slangTypes = slangTypes;
                this.stats.brainRotLevel = Math.min(100, this.stats.slangUsed * 5);
                
                // Calculate rizz
                const rizzResult = this.calculateRizzLevel();
                this.stats.rizzScore = rizzResult.score;
                this.stats.rizzLabel = rizzResult.label;
                
                this.updateStats();
            }
        } catch (error) {
            console.warn('BrainRotDetector: Non-critical scan error', error);
        } finally {
            this.isScanning = false;
        }
    }

    calculateRizzLevel() {
        let rizzScore = 0;
        
        // Base score from slang usage
        rizzScore += Math.min(50, this.stats.slangUsed * 2);
        
        // Weighted score based on specific slang types
        Object.entries(this.stats.slangTypes || {}).forEach(([word, count]) => {
            if (this.rizzWeights[word]) {
                rizzScore += count * this.rizzWeights[word];
            }
        });
        
        // Penalty for excessive social media time
        const totalSocialTime = Object.values(this.stats.siteStats)
            .reduce((sum, site) => sum + (site.timeSpent || 0), 0);
        const timePenalty = Math.max(0, (totalSocialTime - 30) * 0.5); // Penalty after 30 mins
        rizzScore = Math.max(0, rizzScore - timePenalty);
        
        // Cap at 100
        rizzScore = Math.min(100, rizzScore);
        
        // Get rizz category
        const rizzCategory = this.rizzCategories
            .slice()
            .reverse()
            .find(cat => rizzScore >= cat.threshold);
            
        return {
            score: rizzScore,
            label: rizzCategory.label
        };
    }

    trackTimeSpent() {
        setInterval(() => {
            const domain = window.location.hostname;
            if (this.socialMediaDomains[domain]) {
                const timeSpent = Math.floor((Date.now() - this.startTime) / 1000 / 60);
                
                if (!this.stats.siteStats[domain]) {
                    this.stats.siteStats[domain] = { timeSpent: 0 };
                }
                this.stats.siteStats[domain].timeSpent = timeSpent;

                if (timeSpent >= 5) {
                    if (domain.includes('linkedin.com')) {
                        this.showOverlay('meme-overlay.html');
                    } else if (domain.includes('facebook.com') || domain.includes('instagram.com')) {
                        this.showOverlay('touch-grass.html');
                    }
                }
                this.updateStats();
            }
        }, 60000);
    }

    showOverlay(page) {
        chrome.storage.local.get(['lastOverlayShow'], (result) => {
            const lastShow = result.lastOverlayShow || 0;
            const now = Date.now();
            
            if (now - lastShow >= 30 * 60 * 1000) {
                const overlay = document.createElement('iframe');
                overlay.src = chrome.runtime.getURL(page);
                overlay.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    border: none;
                    z-index: 99999;
                    background: transparent;
                `;
                
                document.body.appendChild(overlay);
                chrome.storage.local.set({ lastOverlayShow: now });
            }
        });
    }

    removeOverlay(page) {
        const overlay = document.querySelector(`iframe[src*="${page}"]`);
        if (overlay) overlay.remove();
    }

    setupInputMonitoring() {
        document.addEventListener('input', (e) => {
            if (e.target.matches && e.target.matches('input[type="text"], textarea, [contenteditable="true"]')) {
                this.handleInputChange(e.target);
            }
        }, true);
    }

    handleInputChange(element) {
        const text = element.value || element.textContent;
        if (!text) return;

        const words = text.split(' ');
        const lastWord = words[words.length - 1].toLowerCase();

        Object.entries(this.slangSuggestions).forEach(([prefix, suggestions]) => {
            if (lastWord.startsWith(prefix) && lastWord.length >= 2) {
                this.showSlangSuggestions(element, suggestions);
            }
        });
    }

    showSlangSuggestions(element, suggestions) {
        this.removeSlangSuggestions();

        const suggestionBox = document.createElement('div');
        suggestionBox.className = 'brainrot-suggestions';
        suggestionBox.style.cssText = `
            position: absolute;
            background: #1f1f1f;
            border: 1px solid #7C3AED;
            border-radius: 8px;
            padding: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            z-index: 99999;
            max-height: 200px;
            overflow-y: auto;
        `;

        const rect = element.getBoundingClientRect();
        suggestionBox.style.top = `${rect.bottom + 5}px`;
        suggestionBox.style.left = `${rect.left}px`;
        suggestionBox.style.minWidth = `${rect.width}px`;

        suggestions.forEach(suggestion => {
            const item = document.createElement('div');
            item.className = 'brainrot-suggestion-item';
            item.textContent = suggestion;
            item.style.cssText = `
                padding: 8px 12px;
                color: #fff;
                border-radius: 4px;
            `;
            suggestionBox.appendChild(item);
        });

        document.body.appendChild(suggestionBox);
        setTimeout(() => this.removeSlangSuggestions(), 3000);
    }

    removeSlangSuggestions() {
        const existing = document.querySelector('.brainrot-suggestions');
        if (existing) existing.remove();
    }

    updateStats() {
        chrome.storage.local.set({ stats: this.stats }, () => {
            chrome.runtime.sendMessage({
                action: 'statsUpdated',
                stats: this.stats
            });
        });
    }

    loadSettings() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['stats'], (result) => {
                if (result.stats) {
                    this.stats = {...this.stats, ...result.stats};
                }
                resolve();
            });
        });
    }

    cleanup() {
        if (this.observer) {
            this.observer.disconnect();
        }
        this.removeOverlay('meme-overlay.html');
        this.removeOverlay('touch-grass.html');
    }
}

// Initialize detector
const detector = new BrainRotDetector();
detector.initialize().catch(console.error);

// Ensure initialization on page load
window.addEventListener('load', () => {
    detector.initialize().catch(console.error);
});

// Update background.js initial stats
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.get(['stats'], (result) => {
        if (!result.stats) {
            chrome.storage.local.set({
                stats: {
                    timeSaved: 0,
                    siteStats: {},
                    slangUsed: 0,
                    slangTypes: {},
                    brainRotLevel: 0,
                    rizzScore: 0,
                    rizzLabel: 'No rizz'
                }
            });
        }
    });
});

// Update popup.js stats display
function updateStatsDisplay(stats) {
    if (!stats) return;
    
    const elements = {
        'rot-meter': `${stats.brainRotLevel || 0}%`,
        'slang-counter': `${stats.slangUsed || 0} fr fr`,
        'rizz-score': stats.rizzLabel || 'No rizz'
    };

    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
            // Add color coding for rizz level
            if (id === 'rizz-score') {
                const rizzColor = stats.rizzScore >= 90 ? '#7C3AED' :
                                stats.rizzScore >= 70 ? '#3B82F6' :
                                stats.rizzScore >= 50 ? '#10B981' :
                                stats.rizzScore >= 30 ? '#F59E0B' : '#6B7280';
                element.style.color = rizzColor;
            }
        }
    });
}