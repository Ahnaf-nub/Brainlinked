// content.js
class BrainRotDetector {
    constructor() {
        this.stats = {
            timeSaved: 0,
            siteStats: {},
            slangUsed: 0,
            slangTypes: {},
            brainRotLevel: 0,
            auraScore: 0,
            auraLabel: 'L Aura'
        };
        this.startTime = Date.now();
        this.memeVocab = [
            'fr fr', 'no cap', 'bussin', 'skibidi', 'aura',
            'gyatt', 'based', 'sheesh', 'sigma', 'rizz', 'grimace shake',
            'still water', 'fanum tax', 'those who know', 'ohio'
        ];
        this.socialMediaDomains = {
            'linkedin.com': 'LinkedIn',
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
            'au': ['aura', 'aura master'],
            'gy': ['gyatt'],
            'ba': ['based'],
            'sh': ['sheesh'],
            'si': ['sigma'],
            'gr': ['grimace shake'],
            'oh': ['ohio'],
            'fa': ['fanum tax'],
            'th': ['those who know'],
            'st': ['still water']
        };
        this.auraWeights = {
            'Aura': 2.0,
            'based': 1.5,
            'fr fr': 1.2,
            'no cap': 1.2,
            'gyatt': 1.8,
            'sigma': 1.5,
            'W': 1.3,
            'lowkey': 1.1
        };
        this.auraCategories = [
            { threshold: 90, label: 'Infinite Aura' },
            { threshold: 70, label: 'W Aura' },
            { threshold: 50, label: 'Mid Aura' },
            { threshold: 30, label: 'Lowkey Aura' },
            { threshold: 0, label: 'L Aura' }
        ];
        this.isScanning = false;
        this.initialized = false;
        this.customSlang = [];
        this.timeLimit = 5; // Default time limit

        this.setupInputMonitoring();
    }

    async initialize() {
        if (this.initialized) return;

        await this.loadSettings();
        await this.loadCustomSlang();
        this.setupMessageListener();

        if (window.location.hostname.includes('linkedin.com')) {
            await new Promise(resolve => {
                const checkFeed = () => {
                    if (document.querySelector('.scaffold-finite-scroll, .core-rail, .feed-shared-update-v2')) {
                        resolve();
                    } else {
                        setTimeout(checkFeed, 500);
                    }
                };
                checkFeed();
            });
        } else if (window.location.hostname.includes('instagram.com')|| window.location.hostname.includes('facebook.com')) {
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for dynamic content
        }

        try {
            this.setupObserver();
            this.trackTimeSpent();
            this.initialized = true;
        } catch (error) {
            this.initialized = false;
        }
    }

    loadCustomSlang() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['customSlang'], (result) => {
                this.customSlang = result.customSlang || [];
                this.updateMemeVocab();
                resolve();
            });
        });
    }

    updateMemeVocab() {
        this.memeVocab = [
            'fr fr', 'no cap', 'bussin', 'skibidi', 'aura',
            'gyatt', 'based', 'sheesh', 'sigma', 'rizz',
            'grimace shake', 'still water', 'fanum tax', 'those who know', 'ohio',
            ...this.customSlang
        ];

        this.slangSuggestions = {
            'fr': ['fr fr', 'frfr'],
            'no': ['no cap', 'no shot'],
            'bu': ['bussin'],
        };

        // Add custom slangs to suggestions based on their prefixes
        this.customSlang.forEach(term => {
            const prefix = term.substring(0, 2).toLowerCase();
            if (!this.slangSuggestions[prefix]) {
                this.slangSuggestions[prefix] = [];
            }
            if (!this.slangSuggestions[prefix].includes(term)) {
                this.slangSuggestions[prefix].push(term);
            }
        });
    }

    setupMessageListener() {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
            chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
                if (request.action === 'scanForMemes') {
                    this.scanContent();
                    sendResponse({ success: true });
                }
                if (request.action === 'getStats') {
                    sendResponse({ stats: this.stats });
                }
                if (request.action === 'updateSlang') {
                    this.loadCustomSlang();
                }
                return true;
            });
        } else {
            console.warn('BrainRotDetector: chrome.runtime.onMessage is undefined');
        }
    }

    setupObserver() {
        if (this.observer) return;

        this.observer = new MutationObserver(() => {
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
            const visibleText = document.body.innerText || '';
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
                this.stats.brainRotLevel = Math.min(100, this.stats.slangUsed * 2);

                // Calculate aura
                const auraResult = this.calculateAuraLevel();
                this.stats.auraScore = auraResult.score;
                this.stats.auraLabel = auraResult.label;

                this.updateStats();
            }
        } catch (error) {
            console.warn('BrainRotDetector: Non-critical scan error', error);
        } finally {
            this.isScanning = false;
        }
    }

    calculateAuraLevel() {
        let auraScore = 0;

        // Base score from slang usage
        auraScore += Math.min(50, this.stats.slangUsed * 0.8);

        // Weighted score based on specific slang types
        Object.entries(this.stats.slangTypes || {}).forEach(([word, count]) => {
            if (this.auraWeights[word]) {
                auraScore += count * this.auraWeights[word];
            }
        });

        // Penalty for excessive social media time
        const totalSocialTime = Object.values(this.stats.siteStats)
            .reduce((sum, site) => sum + (site.timeSpent || 0), 0);
        const timePenalty = Math.max(0, (totalSocialTime - 30) * 0.5); // Penalty after 30 mins
        auraScore = Math.max(0, auraScore - timePenalty);

        // Cap at 100
        auraScore = Math.min(100, auraScore);

        // Get aura category
        const auraCategory = this.auraCategories
            .find(cat => auraScore >= cat.threshold);

        return {
            score: auraScore,
            label: auraCategory ? auraCategory.label : 'L Aura'
        };
    }

    trackTimeSpent() {
        setInterval(() => {
            const domain = window.location.hostname;
            const baseDomain = domain.replace('www.', '');
            
            if (this.socialMediaDomains[domain] || this.socialMediaDomains[baseDomain]) {
                const timeSpent = Math.floor((Date.now() - this.startTime) / 1000 / 60);

                if (!this.stats.siteStats[baseDomain]) {
                    this.stats.siteStats[baseDomain] = { timeSpent: 0 };
                }
                this.stats.siteStats[baseDomain].timeSpent = timeSpent;

                if (timeSpent >= this.timeLimit) {
                    if (baseDomain === 'linkedin.com') {
                        this.showMemeOverlay();
                    } else if (baseDomain === 'facebook.com' || baseDomain === 'instagram.com') {
                        this.showTouchGrassOverlay();
                    }
                }
                this.updateStats();
            }
        }, 60000);
    }

    showMemeOverlay() {
        // Remove existing overlay if any
        const existingOverlay = document.getElementById('meme-overlay');
        if (existingOverlay) existingOverlay.remove();

        // Create overlay elements
        const overlay = document.createElement('div');
        overlay.id = 'meme-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.95);
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: fadeIn 0.3s ease-in-out;
        `;

        const container = document.createElement('div');
        container.style.cssText = `
            background: #2a2a2a;
            padding: 30px;
            border-radius: 20px;
            text-align: center;
            max-width: 500px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
            transform: scale(0.9);
            animation: popIn 0.4s ease-out forwards;
        `;

        const title = document.createElement('h2');
        title.textContent = 'Why So Serious? Just Be a Lowkey Chill Guy';
        title.style.cssText = `
            color: #fff;
            margin: 20px 0;
            font-size: 24px;
        `;

        const image = document.createElement('img');
        image.src = chrome.runtime.getURL('chill.png');
        image.alt = 'meme';
        image.style.cssText = `
            width: 100%;
            max-width: 360px;
            border-radius: 12px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
            transition: transform 0.3s ease;
        `;
        image.addEventListener('mouseover', () => {
            image.style.transform = 'scale(1.02)';
        });
        image.addEventListener('mouseout', () => {
            image.style.transform = 'scale(1)';
        });

        const messages = [
            "There's no rush, dude. You're not behind. Time's not working against you; it's working with you. Slow down, feel the pace of your life. Everything will happen right on time. Life moves in cycles, bro. Good days, bad days—they all cycle through. Winter doesn't mean the sun's gone forever. Just means spring's around the corner. The sun always comes back, bro. Keep acing!",
            "Life's not a competition, dude. Don't beat yourself up. Be kind to yourself. You're doing the best you can. Take it easy, you're good. Just chill.",
            "Remember, bro, it's not about the destination, it's about the journey. Enjoy every step you take, even the small ones. They all lead to something great.",
            "Hey, it's okay to take a break. Rest is just as important as hustle. Recharge, refocus, and come back stronger. You've got this!",
            "Don't sweat the small stuff, dude. Focus on what really matters and let go of the rest. Life's too short to stress over things you can't control."
        ];

        const message = document.createElement('p');
        message.textContent = messages[Math.floor(Math.random() * messages.length)];
        message.style.cssText = `
            color: #d8d6d6;
            line-height: 1.5;
            margin-top: 20px;
            font-size: 17px;
        `;

        // Append elements
        container.appendChild(title);
        container.appendChild(image);
        container.appendChild(message);
        overlay.appendChild(container);
        document.body.appendChild(overlay);

        // Add animations
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes popIn {
                from { opacity: 0; transform: scale(0.8); }
                to { opacity: 1; transform: scale(1); }
            }
        `;
        document.head.appendChild(style);
    }

    showTouchGrassOverlay() {
        // Remove existing overlay if any
        const existingOverlay = document.getElementById('touch-grass-overlay');
        if (existingOverlay) existingOverlay.remove();

        // Create overlay elements
        const overlay = document.createElement('div');
        overlay.id = 'touch-grass-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.95);
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: fadeIn 0.3s ease-in-out;
        `;

        const container = document.createElement('div');
        container.style.cssText = `
            background: #2a2a2a;
            padding: 30px;
            border-radius: 20px;
            text-align: center;
            max-width: 500px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
            transform: scale(0.9);
            animation: popIn 0.4s ease-out forwards;
        `;

        const title = document.createElement('h2');
        title.textContent = 'Time to Touch Grass!';
        title.style.cssText = `
            color: #fff;
            margin: 20px 0;
            font-size: 24px;
        `;

        const image = document.createElement('img');
        image.src = chrome.runtime.getURL('grass.png');
        image.alt = 'Touch Grass';
        image.style.cssText = `
            width: 100%;
            max-width: 360px;
            border-radius: 12px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
            transition: transform 0.3s ease;
        `;
        image.addEventListener('mouseover', () => {
            image.style.transform = 'scale(1.02)';
        });
        image.addEventListener('mouseout', () => {
            image.style.transform = 'scale(1)';
        });

        // Append elements
        container.appendChild(title);
        container.appendChild(image);
        overlay.appendChild(container);
        document.body.appendChild(overlay);

        // Add animations
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes popIn {
                from { opacity: 0; transform: scale(0.8); }
                to { opacity: 1; transform: scale(1); }
            }
        `;
        document.head.appendChild(style);
    }

    setupInputMonitoring() {
        document.addEventListener('input', (e) => {
            if (e.target.matches('input[type="text"], textarea, [contenteditable="true"]')) {
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
        suggestionBox.style.top = `${rect.bottom + window.scrollY + 5}px`;
        suggestionBox.style.left = `${rect.left + window.scrollX}px`;
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
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.set({ stats: this.stats }, () => {
                if (chrome.runtime && chrome.runtime.sendMessage) {
                    chrome.runtime.sendMessage({
                        action: 'statsUpdated',
                        stats: this.stats
                    });
                }
            });
        }
    }

    loadSettings() {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            return new Promise((resolve) => {
                chrome.storage.local.get(['stats', 'timeLimit'], (result) => {
                    if (result.stats) {
                        this.stats = { ...this.stats, ...result.stats };
                    }
                    if (result.timeLimit) {
                        this.timeLimit = result.timeLimit;
                    }
                    resolve();
                });
            });
        } else {
            return Promise.resolve();
        }
    }

    cleanup() {
        if (this.observer) {
            this.observer.disconnect();
        }
        const memeOverlay = document.getElementById('meme-overlay');
        if (memeOverlay) memeOverlay.remove();

        const grassOverlay = document.getElementById('touch-grass-overlay');
        if (grassOverlay) grassOverlay.remove();
    }
}

// Initialize detector
const detector = new BrainRotDetector();
detector.initialize().catch(console.error);

// Ensure initialization on page load
window.addEventListener('load', () => {
    detector.initialize().catch(console.error);
});